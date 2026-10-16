// Simula o agente enviando incidentes via HTTP para a API.
//
// Uso:
//   npm run simulate                        (envia indefinidamente a cada 20s)
//   npm run simulate -- --interval 10       (a cada 10s)
//   npm run simulate -- --count 5           (para após 5 envios)
//   npm run simulate -- --interval 5 --count 3
//
// As variáveis API_URL e AGENT_API_KEY devem estar no .env.

import '../src/config.js'; // carrega .env antes de tudo

const API_URL = process.env.API_URL || 'http://localhost:3001';
const AGENT_API_KEY = process.env.AGENT_API_KEY || 'dev-agent-key-change-me';

// --- Parsing de argumentos CLI ---
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}
const intervalSec = Number(getArg('--interval') ?? 20);
const maxCount = getArg('--count') ? Number(getArg('--count')) : null;

// --- Templates para geração aleatória ---
const CATEGORIAS = [
  'Perda de pacotes',
  'LOS (Loss of Signal)',
  'Latência elevada',
  'Falha de equipamento',
  'Degradação óptica',
  'Congestionamento',
  'Falha de autenticação',
  'Interferência externa',
  'Queda de energia',
  'Banda excedida',
];

const RISCOS = ['Crítico', 'Alto', 'Médio', 'Baixo'];
const STATUS_VALUES = ['Aberto', 'Em Andamento'];

const LOCALIZACOES = [
  'Porto Alegre, RS - Centro',
  'Porto Alegre, RS - Zona Norte',
  'Porto Alegre, RS - Moinhos de Vento',
  'Canoas, RS - Centro',
  'São Leopoldo, RS - Centro',
  'Novo Hamburgo, RS - Centro',
  'Gravataí, RS - Morada dos Campos',
  'Cachoeirinha, RS - Industrial',
  'Alvorada, RS - Centro',
  'Viamão, RS - Centro',
];

const TIPOS_CONEXAO = ['Fibra FTTH', 'Cabo Coaxial', 'Rádio', 'xDSL'];

const DISPOSITIVOS_BY_CAT = {
  'Perda de pacotes':      ['ONU Huawei EG8141A5', 'ONT Fiberhome AN5506', 'ONU ZTE F660'],
  'LOS (Loss of Signal)':  ['ONU Huawei EG8141A5', 'OLT ZTE C320', 'OLT Huawei MA5800'],
  'Latência elevada':      ['Router MikroTik RB4011', 'Modem Motorola SB6190', 'Switch Cisco SG350'],
  'Falha de equipamento':  ['OLT ZTE C320', 'OLT Huawei MA5800', 'Switch Cisco SG350'],
  'Degradação óptica':     ['ONU Huawei EG8141A5', 'ONT Huawei HG8245H', 'Splitter óptico 1x16'],
  'Congestionamento':      ['Switch Cisco SG350', 'Router MikroTik RB4011', 'Switch Huawei S5735'],
  'Falha de autenticação': ['Router TP-Link Archer C6', 'Router MikroTik RB4011', 'Modem Arris SB8200'],
  'Interferência externa': ['Rádio Ubiquiti AirMax', 'Rádio Cambium PMP450', 'Antena Mikrotik LHG'],
  'Queda de energia':      ['ONU Intelbras 1200R', 'Nobreak APC Smart-UPS', 'Gerador 15kVA'],
  'Banda excedida':        ['Modem Sagemcom F@ST 3890', 'Router TP-Link Archer C6', 'ONU ZTE F660'],
};

const DESCRICOES_BY_CAT = {
  'Perda de pacotes':      'Perda de pacote intermitente detectada pelo agente',
  'LOS (Loss of Signal)':  'Queda total de sinal óptico detectada',
  'Latência elevada':      'Latência acima do threshold aceitável',
  'Falha de equipamento':  'Reinicializações frequentes e comportamento anômalo',
  'Degradação óptica':     'Degradação progressiva da potência óptica recebida',
  'Congestionamento':      'Utilização de uplink acima de 90%',
  'Falha de autenticação': 'Múltiplas falhas de autenticação PPPoE detectadas',
  'Interferência externa': 'Queda de SNR por interferência de RF detectada',
  'Queda de energia':      'Queda de energia no nó de distribuição',
  'Banda excedida':        'Consumo de banda acima de 95% do plano contratado',
};

const CAUSAS_BY_CAT = {
  'Perda de pacotes':      ['Degradação do conector óptico', 'Flutuação de potência óptica', 'Cabo com mau contato'],
  'LOS (Loss of Signal)':  ['Conector óptico danificado', 'Fibra cortada ou dobrada', 'Falha no transceptor da OLT'],
  'Latência elevada':      ['Congestionamento no nó de agregação', 'BGP flapping', 'Sobrecarga no roteador de borda'],
  'Falha de equipamento':  ['Superaquecimento', 'Firmware desatualizado com bug conhecido', 'Hardware com vida útil expirada'],
  'Degradação óptica':     ['Contaminação por poeira no conector', 'Umidade na caixa de emenda', 'Microcurvatura na fibra'],
  'Congestionamento':      ['Crescimento orgânico sem expansão de uplink', 'Ausência de políticas de QoS', 'Pico de tráfego por evento local'],
  'Falha de autenticação': ['Senha PPPoE expirada no RADIUS', 'Conflito de credenciais no concentrador', 'Bug no firmware do roteador cliente'],
  'Interferência externa': ['Fonte de RF em obra próxima', 'Equipamento de terceiros no mesmo canal', 'Obstáculo físico no enlace'],
  'Queda de energia':      ['Temporal com queda da concessionária', 'Bateria do nobreak com capacidade reduzida', 'Falha no gerador de emergência'],
  'Banda excedida':        ['Múltiplos dispositivos com streaming simultâneo', 'Plano insuficiente para o perfil de uso', 'Download de backup em horário comercial'],
};

const ACOES_BY_CAT = {
  'Perda de pacotes':      ['Verificar potência óptica na porta OLT', 'Inspecionar cabo de acesso fisicamente', 'Realizar OTDR no trecho afetado'],
  'LOS (Loss of Signal)':  ['Despachar equipe de campo', 'Verificar continuidade da fibra', 'Substituir transceptor da OLT'],
  'Latência elevada':      ['Executar traceroute para identificar salto lento', 'Verificar tabela BGP no roteador de borda', 'Aplicar políticas de QoS'],
  'Falha de equipamento':  ['Verificar temperatura e ventilação do rack', 'Atualizar firmware para versão corrigida', 'Acionar equipe de campo para substituição'],
  'Degradação óptica':     ['Limpar conectores com kit de limpeza óptica', 'Verificar caixa de emenda em campo', 'Re-fundir emenda se necessário'],
  'Congestionamento':      ['Ativar redistribuição de carga entre uplinks', 'Aplicar políticas de QoS', 'Solicitar upgrade de uplink'],
  'Falha de autenticação': ['Resetar credenciais PPPoE no RADIUS', 'Reiniciar sessão PPPoE no concentrador', 'Atualizar firmware do roteador cliente'],
  'Interferência externa': ['Mudar canal de operação RF', 'Instalar filtro de RF', 'Acionar fiscalização da ANATEL'],
  'Queda de energia':      ['Acionar gerador de emergência', 'Notificar NOC e equipe de campo', 'Verificar capacidade das baterias do nobreak'],
  'Banda excedida':        ['Notificar cliente sobre consumo elevado', 'Oferecer upgrade de plano', 'Aplicar QoS temporário para limitar impacto'],
};

// --- Funções utilitárias ---
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function newIncidentId() {
  return `INC-SIM-${Date.now()}-${randInt(1000, 9999)}`;
}

function newClientId() {
  return `CLI-SIM-${randInt(2000, 9999)}`;
}

// --- Geração de incidente aleatório ---
function generateIncident() {
  const categoria = pick(CATEGORIAS);
  const localizacao = pick(LOCALIZACOES);
  const risco = pick(RISCOS);
  const incidente_status = pick(STATUS_VALUES);
  const dispositivo_nome = pick(DISPOSITIVOS_BY_CAT[categoria]);
  const tipo_conexao = pick(TIPOS_CONEXAO);

  const causePool = CAUSAS_BY_CAT[categoria];
  const causas = [pick(causePool), pick(causePool)].filter((v, i, a) => a.indexOf(v) === i);

  const acaoPool = ACOES_BY_CAT[categoria];
  const acoes = [pick(acaoPool), pick(acaoPool), pick(acaoPool)]
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((text) => ({ text, done: false }));

  const perda_pacotes_pct = ['Perda de pacotes', 'LOS (Loss of Signal)', 'Congestionamento'].includes(categoria)
    ? parseFloat((Math.random() * 50).toFixed(1))
    : null;

  const latencia_ms = ['Latência elevada', 'Congestionamento', 'Banda excedida'].includes(categoria)
    ? parseFloat((50 + Math.random() * 400).toFixed(1))
    : null;

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const contexto =
    `Incidente detectado em tempo real pelo agente de monitoramento. ` +
    `Categoria: ${categoria}. Risco classificado como ${risco}. ` +
    `Dispositivo: ${dispositivo_nome} em ${localizacao}. ` +
    `Investigação inicial concluída — causas e ações recomendadas geradas automaticamente.`;

  return {
    id_falha: newIncidentId(),
    cliente_id: newClientId(),
    cliente_nome: null,
    cliente_banda: pick(['100 Mbps', '200 Mbps', '300 Mbps', '500 Mbps', '1 Gbps']),
    dispositivo_id: `DEV-SIM-${randInt(1000, 9999)}`,
    dispositivo_nome,
    dispositivo_tipo_conexao: tipo_conexao,
    dispositivo_no_pai: `OLT-SIM-${String(randInt(1, 20)).padStart(2, '0')}`,
    falha_categoria: categoria,
    falha_descricao: DESCRICOES_BY_CAT[categoria],
    falha_localizacao: localizacao,
    perda_pacotes_pct,
    latencia_ms,
    falha_risco: risco,
    falha_inicio: now,
    falha_resolucao: null,
    solucao_aplicada: null,
    incidente_status,
    acao_automatizada: Math.random() < 0.4,
    contexto,
    causas,
    acoes,
  };
}

// --- Comunicação com a API ---
async function postIncident(incident) {
  const res = await fetch(`${API_URL}/api/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': AGENT_API_KEY },
    body: JSON.stringify(incident),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function patchIncident(id, patch) {
  const res = await fetch(`${API_URL}/api/alerts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': AGENT_API_KEY },
    body: JSON.stringify(patch),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function getActiveIncidents() {
  const res = await fetch(`${API_URL}/api/alerts?incidente_status=Aberto,Em%20Andamento&page_size=20`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.data ?? [];
}

// --- Ciclo principal ---
let count = 0;

async function runCycle() {
  count++;
  console.log(`\n[Ciclo ${count}] ${new Date().toISOString()}`);

  // ~25% dos ciclos: enriquecer um incidente ativo existente via PATCH
  if (Math.random() < 0.25) {
    const active = await getActiveIncidents();
    if (active.length > 0) {
      const target = pick(active);
      const patch = {
        incidente_status: 'Em Andamento',
        contexto: (target.contexto ?? '') + ' [Atualizado pelo agente: investigação em andamento.]',
      };
      const { status, data } = await patchIncident(target.id_falha, patch);
      console.log(`  PATCH /api/alerts/${target.id_falha} -> ${status}`);
      if (status === 200) {
        console.log(`    status: Aberto → Em Andamento, incidente: "${target.falha_descricao}"`);
      } else {
        console.log(`    Resposta:`, JSON.stringify(data));
      }
      return;
    }
  }

  // Restante dos ciclos (ou quando não há incidentes ativos): criar novo incidente
  const incident = generateIncident();
  console.log(`  POST /api/alerts — categoria: ${incident.falha_categoria}, risco: ${incident.falha_risco}`);
  console.log(`    Descrição: "${incident.falha_descricao}" em ${incident.falha_localizacao}`);

  const { status, data } = await postIncident(incident);
  console.log(`    -> ${status}${status === 201 ? ` | id: ${data.data?.id_falha}` : ''}`);
  if (status !== 201) {
    console.log(`    Resposta:`, JSON.stringify(data));
  }
}

// --- Bootstrap ---
async function main() {
  console.log(`\n🤖 Simulador de incidentes iniciado`);
  console.log(`   API_URL    : ${API_URL}`);
  console.log(`   Intervalo  : ${intervalSec}s`);
  console.log(`   Limite     : ${maxCount ?? '∞'} ciclos`);
  console.log(`   (X-API-Key não exibida por segurança)\n`);

  await runCycle();

  if (maxCount !== null && count >= maxCount) {
    console.log('\n✅ Limite de ciclos atingido. Encerrando.\n');
    return;
  }

  const timer = setInterval(async () => {
    await runCycle();
    if (maxCount !== null && count >= maxCount) {
      clearInterval(timer);
      console.log('\n✅ Limite de ciclos atingido. Encerrando.\n');
    }
  }, intervalSec * 1000);
}

main().catch((err) => {
  console.error('Erro fatal no simulador:', err);
  process.exit(1);
});
