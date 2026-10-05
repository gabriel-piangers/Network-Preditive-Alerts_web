// Simula o agente Python enviando alertas via HTTP para a API.
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
const TYPES = ['bandwidth_exceeded', 'congestion', 'equipment_failure', 'packet_loss', 'latency', 'other'];
const RISKS = ['high', 'medium', 'low'];
const AREAS = [
  'São Paulo - Zona Leste',
  'São Paulo - Zona Norte',
  'São Paulo - Zona Sul',
  'São Paulo - Centro',
  'Campinas',
  'Ribeirão Preto',
  'Santo André',
  'São Bernardo do Campo',
  'Guarulhos',
  'Sorocaba',
  'Bauru',
  'São José dos Campos',
  'Osasco',
];
const EQUIPMENT_PREFIXES = ['RTR', 'SW', 'OLT', 'DSLAM'];
const EQUIPMENT_LOCATIONS = ['SP-ZL', 'SP-ZN', 'SP-ZS', 'SP-CT', 'CAMP', 'RP', 'SA', 'SBC', 'GRU', 'SOR', 'BAU', 'SJC'];

const TITLES_BY_TYPE = {
  bandwidth_exceeded: [
    'Saturação prevista no link de backbone',
    'Risco de saturação no link de interconexão',
    'Uplink próximo à capacidade máxima',
  ],
  congestion: [
    'Congestionamento previsto no switch de agregação',
    'Previsão de congestionamento na rede PON',
    'Pico de tráfego esperado no horário de pico',
  ],
  equipment_failure: [
    'Falha iminente detectada no equipamento de borda',
    'Degradação de hardware detectada por SNMP',
    'Sinais de falha em fonte de alimentação',
  ],
  packet_loss: [
    'Perda de pacotes prevista na rede de acesso',
    'Descarte excessivo de pacotes no switch',
    'Taxa de perda acima do limiar aceitável',
  ],
  latency: [
    'Latência elevada prevista no enlace de longa distância',
    'Aumento de RTT detectado no backbone',
    'Degradação de latência no link de peering',
  ],
  other: [
    'Anomalia de tráfego detectada',
    'Padrão irregular identificado pelo modelo preditivo',
    'Comportamento anômalo no segmento de rede',
  ],
};

const CAUSES_BY_TYPE = {
  bandwidth_exceeded: ['Crescimento orgânico de assinantes', 'Evento de grande porte na região', 'Rota alternativa desativada para manutenção'],
  congestion: ['Falta de QoS configurado', 'Crescimento de tráfego no horário de pico', 'Alta densidade de dispositivos móveis'],
  equipment_failure: ['Equipamento com vida útil expirada', 'Superaquecimento por falha no sistema de refrigeração', 'Firmware desatualizado'],
  packet_loss: ['Interferência eletromagnética no armário', 'Cabos com mau contato', 'Bug em versão de firmware'],
  latency: ['Possível microfissura na fibra óptica', 'BGP flapping detectado', 'Sobrecarga no roteador de borda'],
  other: ['Padrão anômalo de tráfego no período de madrugada', 'Variação não esperada no fluxo de dados'],
};

const ACTIONS_BY_TYPE = {
  bandwidth_exceeded: ['Verificar utilização de banda nas interfaces', 'Solicitar upgrade de link', 'Avaliar redirecionamento de tráfego'],
  congestion: ['Aplicar políticas de QoS', 'Verificar filas de saída', 'Acionar equipe de campo'],
  equipment_failure: ['Verificar temperatura e ventilação do rack', 'Agendar atualização de firmware', 'Providenciar equipamento reserva'],
  packet_loss: ['Inspecionar fisicamente o armário', 'Verificar erros de interface nos logs', 'Isolar segmento afetado'],
  latency: ['Executar traceroute entre os roteadores', 'Solicitar análise de OTDR', 'Verificar tabelas de roteamento BGP'],
  other: ['Analisar logs do período identificado', 'Monitorar métricas por 2h', 'Acionar equipe de análise de capacidade'],
};

// --- Funções utilitárias ---
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Usa Date.now() dinâmico (não um instante fixo) porque cada alerta
// gerado pelo simulador deve ter predicted_for relativo ao momento do envio.
function hoursFromNow(h) {
  return new Date(Date.now() + h * 3_600_000).toISOString();
}

function generateEquipments() {
  const count = randInt(1, 3);
  const loc = pick(EQUIPMENT_LOCATIONS);
  return Array.from({ length: count }, (_, i) => `${pick(EQUIPMENT_PREFIXES)}-${loc}-${String(randInt(1, 9)).padStart(2, '0')}${i > 0 ? i : ''}`);
}

// --- Geração de alerta aleatório ---
function generateAlert() {
  const type = pick(TYPES);
  const area = pick(AREAS);
  const risk = pick(RISKS);
  const accuracy = randInt(70, 99);
  const predicted_for = hoursFromNow(randInt(1, 48));
  const title = `${pick(TITLES_BY_TYPE[type])} — ${area}`;
  const equipments = generateEquipments();

  const causePool = CAUSES_BY_TYPE[type];
  const causes = [pick(causePool), pick(causePool)].filter((v, i, a) => a.indexOf(v) === i);

  const actionPool = ACTIONS_BY_TYPE[type];
  const actions = [pick(actionPool), pick(actionPool), pick(actionPool)]
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((text) => ({ text, done: false }));

  const context =
    `Análise preditiva identificou risco de ${risk === 'high' ? 'alto' : risk === 'medium' ? 'médio' : 'baixo'} impacto ` +
    `na área de ${area}.\nModelo retornou ${accuracy}% de certeza para ocorrência prevista em ` +
    `${new Date(predicted_for).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.`;

  return { type, title, area, equipments, risk, accuracy, predicted_for, context, causes, actions };
}

// --- Comunicação com a API ---
async function postAlert(alert) {
  const res = await fetch(`${API_URL}/api/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': AGENT_API_KEY },
    body: JSON.stringify(alert),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function patchAlert(id, patch) {
  const res = await fetch(`${API_URL}/api/alerts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': AGENT_API_KEY },
    body: JSON.stringify(patch),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function getActiveAlerts() {
  const res = await fetch(`${API_URL}/api/alerts?status=new&limit=20`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.data ?? [];
}

// --- Ciclo principal ---
let count = 0;

async function runCycle() {
  count++;
  console.log(`\n[Ciclo ${count}] ${new Date().toISOString()}`);

  // ~25% dos ciclos: enriquecer um alerta ativo existente via PATCH
  if (Math.random() < 0.25) {
    const active = await getActiveAlerts();
    if (active.length > 0) {
      const target = pick(active);
      const accuracyDelta = randInt(-3, 5);
      const newAccuracy = Math.min(99, Math.max(70, (target.accuracy ?? 80) + accuracyDelta));
      const extraContext = ` Atualização do modelo: certeza ajustada para ${newAccuracy}%.`;
      const patch = {
        accuracy: newAccuracy,
        context: (target.context ?? '') + extraContext,
      };
      const { status, data } = await patchAlert(target.id, patch);
      console.log(`  PATCH /api/alerts/${target.id} -> ${status}`);
      if (status === 200) {
        console.log(`    accuracy: ${target.accuracy} → ${newAccuracy}, alerta: "${target.title}"`);
      } else {
        console.log(`    Resposta:`, JSON.stringify(data));
      }
      return;
    }
  }

  // Restante dos ciclos (ou quando não há alertas ativos): criar novo alerta
  const alert = generateAlert();
  console.log(`  POST /api/alerts — tipo: ${alert.type}, risco: ${alert.risk}, certeza: ${alert.accuracy}%`);
  console.log(`    Título: "${alert.title}"`);

  const { status, data } = await postAlert(alert);
  console.log(`    -> ${status}${status === 201 ? ` | id: ${data.data?.id}` : ''}`);
  if (status !== 201) {
    console.log(`    Resposta:`, JSON.stringify(data));
  }
}

// --- Bootstrap ---
async function main() {
  console.log(`\n🤖 Simulador iniciado`);
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
