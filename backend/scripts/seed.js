// Script de seed: popula o banco com incidentes realistas para demonstração e testes.
// Uso: npm run seed           (apaga incidentes existentes e reinicia)
//      npm run seed -- --keep (mantém incidentes existentes e adiciona)
//
// Os dados simulam um cenário real de uma operadora de telecomunicações.

import '../src/config.js'; // carrega .env antes de tudo
import db from '../src/db/connection.js';

const keepExisting = process.argv.includes('--keep');

const now = new Date().toISOString();

// Incidentes realistas com variedade de categorias, riscos, status e localizações
const seedIncidents = [
  {
    id_falha: 'INC-2026001',
    cliente_id: 'CLI-1000',
    cliente_nome: 'Ana Souza',
    cliente_banda: '500 Mbps',
    dispositivo_id: 'DEV-500',
    dispositivo_nome: 'ONU Huawei EG8141A5',
    dispositivo_tipo_conexao: 'Fibra FTTH',
    dispositivo_no_pai: 'OLT-CENTRAL-01',
    falha_categoria: 'Perda de pacotes',
    falha_descricao: 'Perda de pacote intermitente',
    falha_localizacao: 'Porto Alegre, RS - Moinhos de Vento',
    perda_pacotes_pct: 12.5,
    latencia_ms: 85.2,
    falha_risco: 'Alto',
    falha_inicio: '2026-10-01 08:30:00',
    falha_resolucao: '2026-10-01 09:12:00',
    solucao_aplicada: 'Reset remoto de porta OLT',
    incidente_status: 'Resolvido',
    acao_automatizada: 'TRUE',
    contexto: 'Perda de pacote intermitente detectada na porta 4 do OLT-CENTRAL-01. Padrão sugere degradação do conector óptico. Ação automática de reset de porta aplicada com sucesso.',
    causas: JSON.stringify(['Degradação do conector óptico na porta OLT', 'Flutuação de potência óptica abaixo do threshold']),
    acoes: JSON.stringify([
      { text: 'Monitorar potência óptica na porta afetada por 24h', done: true },
      { text: 'Agendar substituição preventiva do conector se recorrente', done: false },
    ]),
  },
  {
    id_falha: 'INC-2026002',
    cliente_id: 'CLI-1001',
    cliente_nome: 'Carlos Silva',
    cliente_banda: '1 Gbps',
    dispositivo_id: 'DEV-501',
    dispositivo_nome: 'Router TP-Link Archer C6',
    dispositivo_tipo_conexao: 'Rádio',
    dispositivo_no_pai: 'OLT-NORTE-03',
    falha_categoria: 'LOS (Loss of Signal)',
    falha_descricao: 'Queda total de sinal (Loss of Signal)',
    falha_localizacao: 'Porto Alegre, RS - Cidade Baixa',
    perda_pacotes_pct: 100,
    latencia_ms: 999,
    falha_risco: 'Crítico',
    falha_inicio: '2026-10-01 11:15:00',
    falha_resolucao: '2026-10-01 13:45:00',
    solucao_aplicada: 'Substituição física de conector óptico',
    incidente_status: 'Resolvido',
    acao_automatizada: 'FALSE',
    contexto: 'Perda total de sinal óptico no OLT-NORTE-03. Equipe de campo identificou conector danificado fisicamente. Substituição realizada com restabelecimento completo do serviço.',
    causas: JSON.stringify(['Conector óptico danificado fisicamente', 'Possível tração mecânica no cabo de acesso']),
    acoes: JSON.stringify([
      { text: 'Despachar equipe de campo para inspeção física', done: true },
      { text: 'Substituir conector óptico', done: true },
      { text: 'Validar potência óptica após substituição', done: true },
    ]),
  },
  {
    id_falha: 'INC-2026003',
    cliente_id: 'CLI-1002',
    cliente_nome: 'Beatriz Lima',
    cliente_banda: '300 Mbps',
    dispositivo_id: 'DEV-502',
    dispositivo_nome: 'Modem Motorola SB6190',
    dispositivo_tipo_conexao: 'Cabo Coaxial',
    dispositivo_no_pai: 'CGNAT-SUL-02',
    falha_categoria: 'Latência elevada',
    falha_descricao: 'Latência elevada em horário de pico',
    falha_localizacao: 'Canoas, RS - Centro',
    perda_pacotes_pct: 2.1,
    latencia_ms: 145,
    falha_risco: 'Médio',
    falha_inicio: '2026-10-01 14:00:00',
    falha_resolucao: '2026-10-01 14:45:00',
    solucao_aplicada: 'Ajuste de banda no profile do assinante',
    incidente_status: 'Resolvido',
    acao_automatizada: 'TRUE',
    contexto: 'Latência elevada detectada no segmento coaxial de Canoas. Análise aponta sobrecarga no CGNAT-SUL-02 em horário de pico. Ajuste de QoS resolveu o problema.',
    causas: JSON.stringify(['Congestionamento no nó CGNAT em horário de pico', 'Profile de banda desatualizado para o perfil de uso do assinante']),
    acoes: JSON.stringify([
      { text: 'Aplicar ajuste de QoS no CGNAT-SUL-02', done: true },
      { text: 'Revisar profiles de banda dos assinantes do nó', done: false },
    ]),
  },
  {
    id_falha: 'INC-2026004',
    cliente_id: 'CLI-1003',
    cliente_nome: 'Diego Ferreira',
    cliente_banda: '600 Mbps',
    dispositivo_id: 'DEV-503',
    dispositivo_nome: 'OLT ZTE C320',
    dispositivo_tipo_conexao: 'Fibra FTTH',
    dispositivo_no_pai: 'BACKBONE-LESTE-01',
    falha_categoria: 'Falha de equipamento',
    falha_descricao: 'OLT com reinicializações frequentes',
    falha_localizacao: 'Novo Hamburgo, RS - Centro',
    perda_pacotes_pct: 45.0,
    latencia_ms: 320,
    falha_risco: 'Crítico',
    falha_inicio: '2026-10-05 09:00:00',
    falha_resolucao: null,
    solucao_aplicada: null,
    incidente_status: 'Em Andamento',
    acao_automatizada: 'FALSE',
    contexto: 'OLT ZTE C320 apresentando 5 reinicializações nas últimas 3 horas. Temperatura interna em 81°C (limite: 70°C). Impacta 240 assinantes ativos. Equipe de NOC acionada.',
    causas: JSON.stringify(['Superaquecimento por falha no sistema de ventilação', 'Firmware v3.1.2 com bug de gerenciamento de memória confirmado pelo fabricante']),
    acoes: JSON.stringify([
      { text: 'Verificar temperatura e ventilação do rack', done: true },
      { text: 'Acionar equipe de campo para inspeção presencial', done: true },
      { text: 'Atualizar firmware para v3.2.0', done: false },
      { text: 'Ativar rota de contingência para os 240 assinantes afetados', done: false },
    ]),
  },
  {
    id_falha: 'INC-2026005',
    cliente_id: 'CLI-1004',
    cliente_nome: 'Fernanda Oliveira',
    cliente_banda: '200 Mbps',
    dispositivo_id: 'DEV-504',
    dispositivo_nome: 'ONT Huawei HG8245H',
    dispositivo_tipo_conexao: 'Fibra FTTH',
    dispositivo_no_pai: 'OLT-NORTE-03',
    falha_categoria: 'Degradação óptica',
    falha_descricao: 'Degradação progressiva do sinal óptico',
    falha_localizacao: 'Porto Alegre, RS - Bom Fim',
    perda_pacotes_pct: 8.3,
    latencia_ms: 62,
    falha_risco: 'Médio',
    falha_inicio: '2026-10-03 16:20:00',
    falha_resolucao: '2026-10-03 18:05:00',
    solucao_aplicada: 'Limpeza de conectores e re-fusão do splitter',
    incidente_status: 'Resolvido',
    acao_automatizada: 'FALSE',
    contexto: 'Sinal óptico com degradação progressiva detectada por monitoramento SNMP. Potência recebida caindo de -18 dBm para -26 dBm ao longo de 6 horas. Equipe de campo identificou splitter com contaminação.',
    causas: JSON.stringify(['Contaminação por poeira no splitter óptico', 'Umidade na caixa de emenda em via pública']),
    acoes: JSON.stringify([
      { text: 'Inspecionar e limpar conectores no splitter', done: true },
      { text: 'Re-fusionar fibra no ponto de emenda', done: true },
    ]),
  },
  {
    id_falha: 'INC-2026006',
    cliente_id: 'CLI-1005',
    cliente_nome: 'Gabriel Martins',
    cliente_banda: '500 Mbps',
    dispositivo_id: 'DEV-505',
    dispositivo_nome: 'Switch Cisco SG350',
    dispositivo_tipo_conexao: 'Fibra FTTH',
    dispositivo_no_pai: 'AGGREG-CENTRO-01',
    falha_categoria: 'Congestionamento',
    falha_descricao: 'Congestionamento no switch de agregação',
    falha_localizacao: 'São Leopoldo, RS - Centro',
    perda_pacotes_pct: 3.8,
    latencia_ms: 95,
    falha_risco: 'Baixo',
    falha_inicio: '2026-10-04 19:00:00',
    falha_resolucao: '2026-10-04 20:30:00',
    solucao_aplicada: 'Redistribuição de carga entre uplinks',
    incidente_status: 'Resolvido',
    acao_automatizada: 'TRUE',
    contexto: 'Congestionamento detectado no switch AGGREG-CENTRO-01 durante horário de pico noturno. Utilização de uplink chegou a 94%. Redistribuição automática de carga entre uplinks redundantes aliviou o problema.',
    causas: JSON.stringify(['Crescimento orgânico de tráfego sem expansão de uplink', 'Ausência de políticas de QoS para priorização']),
    acoes: JSON.stringify([
      { text: 'Ativar redistribuição de carga automática', done: true },
      { text: 'Solicitar upgrade de uplink para 10 Gbps', done: false },
    ]),
  },
  {
    id_falha: 'INC-2026007',
    cliente_id: 'CLI-1006',
    cliente_nome: 'Helena Costa',
    cliente_banda: '1 Gbps',
    dispositivo_id: 'DEV-506',
    dispositivo_nome: 'Router MikroTik RB4011',
    dispositivo_tipo_conexao: 'Fibra FTTH',
    dispositivo_no_pai: 'OLT-CENTRAL-01',
    falha_categoria: 'Falha de autenticação',
    falha_descricao: 'Falha de autenticação PPPoE repetida',
    falha_localizacao: 'Porto Alegre, RS - Moinhos de Vento',
    perda_pacotes_pct: null,
    latencia_ms: null,
    falha_risco: 'Alto',
    falha_inicio: '2026-10-02 07:45:00',
    falha_resolucao: '2026-10-02 08:30:00',
    solucao_aplicada: 'Reset de sessão PPPoE e atualização de credenciais',
    incidente_status: 'Resolvido',
    acao_automatizada: 'FALSE',
    contexto: 'Falhas de autenticação PPPoE detectadas no concentrador de acesso. 12 tentativas falhas em 10 minutos para o CLI-1006. Logs indicam senha expirada no RADIUS. Credenciais atualizadas manualmente.',
    causas: JSON.stringify(['Senha PPPoE expirada no servidor RADIUS', 'Ausência de notificação automática de expiração de credenciais']),
    acoes: JSON.stringify([
      { text: 'Atualizar credenciais PPPoE no RADIUS', done: true },
      { text: 'Implementar alerta de expiração de senha com 7 dias de antecedência', done: false },
    ]),
  },
  {
    id_falha: 'INC-2026008',
    cliente_id: 'CLI-1007',
    cliente_nome: 'Igor Nascimento',
    cliente_banda: '300 Mbps',
    dispositivo_id: 'DEV-507',
    dispositivo_nome: 'Rádio Ubiquiti AirMax',
    dispositivo_tipo_conexao: 'Rádio',
    dispositivo_no_pai: 'TOWER-NORTE-02',
    falha_categoria: 'Interferência externa',
    falha_descricao: 'Interferência de RF no link de rádio',
    falha_localizacao: 'Cachoeirinha, RS - Industrial',
    perda_pacotes_pct: 22.4,
    latencia_ms: 210,
    falha_risco: 'Alto',
    falha_inicio: '2026-10-06 13:00:00',
    falha_resolucao: null,
    solucao_aplicada: null,
    incidente_status: 'Aberto',
    acao_automatizada: 'FALSE',
    contexto: 'Interferência de RF detectada no link Ubiquiti AirMax operando em 5.8 GHz. SNR caiu de 28 dB para 11 dB. Possível fonte de interferência identificada em obra próxima com equipamentos elétricos de alta potência.',
    causas: JSON.stringify(['Fonte de interferência eletromagnética em obra industrial próxima', 'Canal de rádio sem mudança adaptativa de frequência']),
    acoes: JSON.stringify([
      { text: 'Mudar canal de operação para frequência menos congestionada', done: false },
      { text: 'Instalar filtro de RF no equipamento', done: false },
      { text: 'Acionar fiscalização da ANATEL sobre interferência', done: false },
    ]),
  },
  {
    id_falha: 'INC-2026009',
    cliente_id: 'CLI-1008',
    cliente_nome: 'Juliana Pereira',
    cliente_banda: '500 Mbps',
    dispositivo_id: 'DEV-508',
    dispositivo_nome: 'ONU Intelbras 1200R',
    dispositivo_tipo_conexao: 'Fibra FTTH',
    dispositivo_no_pai: 'OLT-SUL-04',
    falha_categoria: 'Queda de energia',
    falha_descricao: 'Queda de energia no nó de distribuição',
    falha_localizacao: 'Gravataí, RS - Morada dos Campos',
    perda_pacotes_pct: 100,
    latencia_ms: null,
    falha_risco: 'Crítico',
    falha_inicio: '2026-10-07 03:20:00',
    falha_resolucao: '2026-10-07 04:50:00',
    solucao_aplicada: 'Acionamento de gerador e restabelecimento de energia pela concessionária',
    incidente_status: 'Resolvido',
    acao_automatizada: 'FALSE',
    contexto: 'Queda de energia detectada no nó OLT-SUL-04 às 03:20. Nobreak entrou em operação por 48 minutos. Gerador acionado às 03:40. Energia da concessionária restabelecida às 04:50. 180 assinantes afetados.',
    causas: JSON.stringify(['Queda de energia da concessionária por temporal', 'Bateria do nobreak com capacidade reduzida (72% da carga nominal)']),
    acoes: JSON.stringify([
      { text: 'Acionar gerador de emergência', done: true },
      { text: 'Notificar NOC e equipe de campo', done: true },
      { text: 'Agendar revisão das baterias do nobreak', done: false },
    ]),
  },
  {
    id_falha: 'INC-2026010',
    cliente_id: 'CLI-1009',
    cliente_nome: 'Klaus Weber',
    cliente_banda: '200 Mbps',
    dispositivo_id: 'DEV-509',
    dispositivo_nome: 'Modem Sagemcom F@ST 3890',
    dispositivo_tipo_conexao: 'Cabo Coaxial',
    dispositivo_no_pai: 'CMTS-NORTE-01',
    falha_categoria: 'Banda excedida',
    falha_descricao: 'Utilização de banda acima de 95% do contratado',
    falha_localizacao: 'Alvorada, RS - Centro',
    perda_pacotes_pct: 0.8,
    latencia_ms: 55,
    falha_risco: 'Médio',
    falha_inicio: '2026-10-07 20:00:00',
    falha_resolucao: null,
    solucao_aplicada: null,
    incidente_status: 'Aberto',
    acao_automatizada: 'TRUE',
    contexto: 'Monitoramento automático detectou uso de banda acima de 95% no contrato de 200 Mbps. Padrão de consumo sugere streaming 4K simultâneo em múltiplos dispositivos. Agente notificou o cliente via portal e sugeriu upgrade de plano.',
    causas: JSON.stringify(['Múltiplos dispositivos com streaming simultâneo em 4K', 'Plano contratado insuficiente para o perfil atual de uso']),
    acoes: JSON.stringify([
      { text: 'Notificar cliente sobre consumo elevado', done: true },
      { text: 'Oferecer upgrade para plano de 500 Mbps', done: false },
    ]),
  },
];

// Função principal de seed
function seed() {
  console.log(`\n🌱 Iniciando seed do banco de dados...`);

  if (!keepExisting) {
    const deleted = db.prepare('DELETE FROM logs_informativos').run();
    console.log(`  ✓ ${deleted.changes} incidentes removidos.`);
  } else {
    console.log(`  ℹ️ Flag --keep ativa: incidentes existentes mantidos.`);
  }

  const insert = db.prepare(
    `INSERT OR REPLACE INTO logs_informativos
       (id_falha, cliente_id, cliente_nome, cliente_banda,
        dispositivo_id, dispositivo_nome, dispositivo_tipo_conexao, dispositivo_no_pai,
        falha_categoria, falha_descricao, falha_localizacao,
        perda_pacotes_pct, latencia_ms, falha_risco,
        falha_inicio, falha_resolucao, solucao_aplicada,
        incidente_status, acao_automatizada,
        contexto, causas, acoes,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const insertAll = db.transaction((incidents) => {
    for (const inc of incidents) {
      insert.run(
        inc.id_falha,
        inc.cliente_id,
        inc.cliente_nome ?? null,
        inc.cliente_banda ?? null,
        inc.dispositivo_id ?? null,
        inc.dispositivo_nome ?? null,
        inc.dispositivo_tipo_conexao ?? null,
        inc.dispositivo_no_pai ?? null,
        inc.falha_categoria ?? null,
        inc.falha_descricao ?? null,
        inc.falha_localizacao ?? null,
        inc.perda_pacotes_pct ?? null,
        inc.latencia_ms ?? null,
        inc.falha_risco ?? null,
        inc.falha_inicio ?? null,
        inc.falha_resolucao ?? null,
        inc.solucao_aplicada ?? null,
        inc.incidente_status,
        inc.acao_automatizada,
        inc.contexto,
        inc.causas,
        inc.acoes,
        now,
        now,
      );
    }
  });

  insertAll(seedIncidents);
  console.log(`  ✓ ${seedIncidents.length} incidentes inseridos com sucesso.`);

  const summary = db
    .prepare(
      `SELECT incidente_status, COUNT(*) as count FROM logs_informativos
       WHERE deleted_at IS NULL GROUP BY incidente_status ORDER BY incidente_status`,
    )
    .all();
  console.log('\n  Resumo por status:');
  summary.forEach((r) => console.log(`    ${r.incidente_status}: ${r.count}`));

  const riskSummary = db
    .prepare(
      `SELECT falha_risco, COUNT(*) as count FROM logs_informativos
       WHERE deleted_at IS NULL GROUP BY falha_risco ORDER BY falha_risco`,
    )
    .all();
  console.log('\n  Resumo por risco:');
  riskSummary.forEach((r) => console.log(`    ${r.falha_risco}: ${r.count}`));

  console.log('\n✅ Seed concluído!\n');
}

seed();
