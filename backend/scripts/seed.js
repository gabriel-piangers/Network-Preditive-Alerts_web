// Script de seed: popula o banco com alertas realistas para demonstração e testes.
// Uso: npm run seed           (apaga alertas existentes e reinicia)
//      npm run seed -- --keep (mantém alertas existentes e adiciona)
//
// Os dados simulam um cenário real de uma operadora de telecomunicações.

import '../src/config.js'; // carrega .env antes de tudo
import db from '../src/db/connection.js';

const keepExisting = process.argv.includes('--keep');

// Referência de tempo fixa na inicialização: garante consistência entre todos os registros
// do mesmo seed (não usar Date.now() inline para evitar datas ligeiramente diferentes).
const _seedNow = new Date();
const hoursFromNow = (h) => new Date(_seedNow.getTime() + h * 3_600_000).toISOString();
const hoursAgo = (h) => hoursFromNow(-h);

// Alertas realistas com variedade de tipos, riscos, status e áreas
// Garante ao menos 4 com status 'new' e 3 de risco alto ativos (critério da SPEC)
const seedAlerts = [
  // --- Alertas ATIVOS (new) ---
  {
    type: 'bandwidth_exceeded',
    title: 'Saturação prevista no link do backbone Zona Leste',
    area: 'São Paulo - Zona Leste',
    equipments: JSON.stringify(['RTR-SP-ZL-01', 'SW-SP-ZL-04']),
    risk: 'high',
    accuracy: 87,
    predicted_for: hoursFromNow(3),
    status: 'new',
    context:
      'O tráfego no link principal vem crescendo de forma contínua há 5 dias e deve ultrapassar 95% da capacidade nas próximas horas.\nO mesmo padrão foi visto em 12/09 antes de uma queda de serviço.',
    causes: JSON.stringify(['Aumento sazonal de tráfego de streaming', 'Rota alternativa desativada para manutenção']),
    actions: JSON.stringify([
      { text: 'Verificar utilização de banda na interface Gi0/1', done: false },
      { text: 'Avaliar redirecionamento parcial do tráfego para a rota alternativa', done: false },
    ]),
    confirmed: null,
  },
  {
    type: 'congestion',
    title: 'Congestionamento previsto no switch de agregação de Campinas',
    area: 'Campinas',
    equipments: JSON.stringify(['SW-CAMP-07', 'SW-CAMP-08']),
    risk: 'high',
    accuracy: 92,
    predicted_for: hoursFromNow(6),
    status: 'new',
    context:
      'Padrão de crescimento de pacotes nas últimas 48h indica sobrecarga iminente no horário de pico.\nEquipamentos SW-CAMP-07 e SW-CAMP-08 operam acima de 80% da capacidade.',
    causes: JSON.stringify([
      'Crescimento de tráfego no horário de pico',
      'Falta de QoS configurado para priorização de tráfego crítico',
    ]),
    actions: JSON.stringify([
      { text: 'Verificar filas de saída da interface Gi0/2', done: false },
      { text: 'Aplicar políticas de QoS para priorizar tráfego VoIP', done: false },
      { text: 'Acionar equipe de campo para inspeção presencial', done: false },
    ]),
    confirmed: null,
  },
  {
    type: 'equipment_failure',
    title: 'Falha iminente detectada no OLT da Zona Norte',
    area: 'São Paulo - Zona Norte',
    equipments: JSON.stringify(['OLT-SP-ZN-03']),
    risk: 'high',
    accuracy: 79,
    predicted_for: hoursFromNow(12),
    status: 'new',
    context:
      'O OLT-SP-ZN-03 apresentou 3 reinicializações inesperadas nas últimas 24h.\nTemperatura interna acima do limite de operação normal (78°C vs. limite de 70°C).',
    causes: JSON.stringify([
      'Superaquecimento por falha no sistema de refrigeração',
      'Firmware desatualizado — versão atual é 3.1.2; versão recomendada é 3.2.0',
    ]),
    actions: JSON.stringify([
      { text: 'Verificar temperatura e ventilação do rack no datacenter da ZN', done: false },
      { text: 'Agendar atualização de firmware para janela de manutenção', done: false },
      { text: 'Ativar rota de contingência para os clientes do OLT-SP-ZN-03', done: false },
    ]),
    confirmed: null,
  },
  {
    type: 'latency',
    title: 'Latência elevada prevista no enlace SP → Rio de Janeiro',
    area: 'São Paulo - Centro',
    equipments: JSON.stringify(['RTR-SP-CT-02', 'RTR-RJ-CT-01']),
    risk: 'medium',
    accuracy: 74,
    predicted_for: hoursFromNow(8),
    status: 'new',
    context:
      'Latência no enlace SP-RJ subiu de 4ms para 18ms ao longo do dia, indicando possível degradação de fibra ou sobrecarga no roteador de borda.',
    causes: JSON.stringify([
      'Possível microfissura na fibra óptica no trecho de Guaratinguetá',
      'BGP flapping detectado nas últimas 6h',
    ]),
    actions: JSON.stringify([
      { text: 'Executar traceroute entre RTR-SP-CT-02 e RTR-RJ-CT-01', done: false },
      { text: 'Solicitar análise de OTDR no trecho Guaratinguetá', done: false },
    ]),
    confirmed: null,
  },

  // --- Alertas EM ANÁLISE ---
  {
    type: 'packet_loss',
    title: 'Perda de pacotes prevista na rede de acesso de Ribeirão Preto',
    area: 'Ribeirão Preto',
    equipments: JSON.stringify(['SW-RP-AC-11', 'SW-RP-AC-12', 'RTR-RP-BD-01']),
    risk: 'medium',
    accuracy: 83,
    predicted_for: hoursFromNow(5),
    status: 'in_analysis',
    context:
      'Taxa de perda de pacotes no segmento de acesso subiu para 2,3% (limite aceitável: 0,5%).\nAfeta principalmente clientes residenciais nos bairros Jardim Paulista e Nova Ribeirânia.',
    causes: JSON.stringify([
      'Interferência eletromagnética próxima ao armário SW-RP-AC-11',
      'Cabos desconectados parcialmente reportados por técnico de campo',
    ]),
    actions: JSON.stringify([
      { text: 'Inspecionar fisicamente o armário SW-RP-AC-11', done: true },
      { text: 'Verificar erros de interface nos logs do SW-RP-AC-12', done: false },
      { text: 'Isolar segmento afetado e redirecionar tráfego para rota alternativa', done: false },
    ]),
    confirmed: null,
  },
  {
    type: 'bandwidth_exceeded',
    title: 'Saturação de uplink no DSLAM de Santo André',
    area: 'Santo André',
    equipments: JSON.stringify(['DSLAM-SA-01', 'RTR-SA-BD-02']),
    risk: 'medium',
    accuracy: 71,
    predicted_for: hoursFromNow(10),
    status: 'in_analysis',
    context:
      'Uplink do DSLAM-SA-01 atingiu 88% de utilização durante o horário de pico de ontem.\nTendência de crescimento de 5% ao mês nos últimos 3 meses.',
    causes: JSON.stringify([
      'Crescimento orgânico de assinantes na região sem expansão de infraestrutura',
    ]),
    actions: JSON.stringify([
      { text: 'Solicitar aprovação de orçamento para upgrade do uplink', done: true },
      { text: 'Implementar limitação temporária de banda para serviços P2P', done: false },
    ]),
    confirmed: null,
  },

  // --- Alertas MONITORANDO ---
  {
    type: 'congestion',
    title: 'Congestionamento em recovery no nó de São Bernardo',
    area: 'São Bernardo do Campo',
    equipments: JSON.stringify(['RTR-SBC-01', 'SW-SBC-AGG-03']),
    risk: 'low',
    accuracy: 88,
    predicted_for: hoursAgo(2),
    status: 'monitoring',
    context:
      'Congestionamento foi detectado e ação preventiva foi executada com sucesso.\nTráfego redistribuído para rota alternativa. Monitoramento ativo por 24h.',
    causes: JSON.stringify([
      'Evento esportivo na Arena MorumBIS aumentou o tráfego 40% acima do normal',
    ]),
    actions: JSON.stringify([
      { text: 'Redirecionar 30% do tráfego para o link secundário', done: true },
      { text: 'Notificar NOC sobre a redistribuição', done: true },
      { text: 'Monitorar por 24h e reverter se o tráfego normalizar', done: false },
    ]),
    confirmed: null,
  },

  // --- Alertas RESOLVIDOS ---
  {
    type: 'equipment_failure',
    title: 'Falha prevista no switch de distribuição de Guarulhos',
    area: 'Guarulhos',
    equipments: JSON.stringify(['SW-GRU-DIST-05']),
    risk: 'high',
    accuracy: 95,
    predicted_for: hoursAgo(8),
    status: 'resolved',
    context:
      'Modelo de ML identificou padrão de falha no SW-GRU-DIST-05 com alta confiança.\nEquipe substituiu o equipamento durante janela de manutenção antes da falha ocorrer.',
    causes: JSON.stringify([
      'Equipamento com mais de 7 anos de operação (vida útil recomendada: 5 anos)',
      'Falhas intermitentes de memória registradas nos logs de SNMP',
    ]),
    actions: JSON.stringify([
      { text: 'Agendar substituição do SW-GRU-DIST-05 na janela de manutenção', done: true },
      { text: 'Instalar novo equipamento e migrar configuração', done: true },
      { text: 'Validar conectividade após substituição', done: true },
    ]),
    confirmed: true,
  },
  {
    type: 'packet_loss',
    title: 'Perda de pacotes no backbone Norte-Sul resolvida',
    area: 'São Paulo - Centro',
    equipments: JSON.stringify(['RTR-SP-BB-01', 'RTR-SP-BB-02']),
    risk: 'medium',
    accuracy: 76,
    predicted_for: hoursAgo(24),
    status: 'resolved',
    context:
      'Taxa de perda de pacotes foi corrigida após atualização de firmware e ajuste de configuração de fila.',
    causes: JSON.stringify([
      'Bug no firmware versão 4.2.1 causava descarte incorreto de pacotes em horário de pico',
    ]),
    actions: JSON.stringify([
      { text: 'Atualizar firmware para versão 4.2.2 em ambos os roteadores', done: true },
      { text: 'Ajustar tamanho do buffer de saída para 512KB', done: true },
    ]),
    confirmed: true,
  },

  // --- Alertas FALSO POSITIVO ---
  {
    type: 'latency',
    title: 'Latência elevada prevista no link de Sorocaba',
    area: 'Sorocaba',
    equipments: JSON.stringify(['RTR-SOR-01']),
    risk: 'low',
    accuracy: 70,
    predicted_for: hoursAgo(6),
    status: 'false_positive',
    context:
      'Modelo previu latência elevada, mas análise manual indicou que o aumento era esperado — manutenção programada no roteador de peering upstream foi executada no período.',
    causes: JSON.stringify(['Manutenção programada de peering upstream (não uma anomalia)']),
    actions: JSON.stringify([
      { text: 'Verificar janela de manutenção dos peers upstream', done: true },
    ]),
    confirmed: false,
  },

  // --- Alertas EXPIRADOS ---
  {
    type: 'other',
    title: 'Anomalia de tráfego detectada na rede de acesso de Osasco',
    area: 'Osasco',
    equipments: JSON.stringify(['OLT-OSC-02', 'SW-OSC-AC-07']),
    risk: 'low',
    accuracy: 72,
    predicted_for: hoursAgo(5),
    status: 'expired',
    context:
      'Anomalia de tráfego detectada, mas o horário previsto passou sem ocorrência confirmada.\nAlerta expirado automaticamente pelo sistema.',
    causes: JSON.stringify(['Padrão anômalo de tráfego no horário de madrugada']),
    actions: JSON.stringify([
      { text: 'Verificar logs do OLT-OSC-02 no período previsto', done: false },
    ]),
    confirmed: null,
  },

  // --- Mais alertas para variedade ---
  {
    type: 'bandwidth_exceeded',
    title: 'Risco de saturação no link de interconexão de Bauru',
    area: 'Bauru',
    equipments: JSON.stringify(['RTR-BAU-01', 'RTR-BAU-02']),
    risk: 'medium',
    accuracy: 80,
    predicted_for: hoursFromNow(18),
    status: 'new',
    context:
      'Crescimento de 15% no tráfego de dados nos últimos 7 dias.\nLink de interconexão de 1Gbps deve atingir 90% no fim de semana.',
    causes: JSON.stringify([
      'Aumento de assinantes de banda larga na região',
      'Lançamento de serviço de streaming local sem preparação de infraestrutura',
    ]),
    actions: JSON.stringify([
      { text: 'Analisar perfil de tráfego para identificar top talkers', done: false },
      { text: 'Solicitar upgrade de link para 10Gbps', done: false },
      { text: 'Considerar cache local para reduzir tráfego de CDN', done: false },
    ]),
    confirmed: null,
  },
  {
    type: 'congestion',
    title: 'Previsão de congestionamento no PON de São José dos Campos',
    area: 'São José dos Campos',
    equipments: JSON.stringify(['OLT-SJC-01', 'OLT-SJC-02']),
    risk: 'low',
    accuracy: 70,
    predicted_for: hoursFromNow(36),
    status: 'new',
    context:
      'Análise histórica indica que eventos no Parque Tecnológico de SJC causam picos de tráfego.\nEvento de 3 dias iniciará na próxima semana com expectativa de 5.000 participantes.',
    causes: JSON.stringify([
      'Evento de grande porte previsto para a região',
      'Alta densidade de dispositivos móveis concentrados no mesmo setor',
    ]),
    actions: JSON.stringify([
      { text: 'Alocar capacidade adicional nos OLTs de SJC', done: false },
      { text: 'Coordenar com equipe de eventos para estimar pico de tráfego', done: false },
    ]),
    confirmed: null,
  },
  {
    type: 'equipment_failure',
    title: 'Degradação detectada em fonte de alimentação — RTR-SP-ZS-04',
    area: 'São Paulo - Zona Sul',
    equipments: JSON.stringify(['RTR-SP-ZS-04']),
    risk: 'medium',
    accuracy: 84,
    predicted_for: hoursFromNow(48),
    status: 'monitoring',
    context:
      'Sensores de SNMP indicam tensão de saída variando fora dos limites (±5% vs. tolerância de ±2%).\nComportamento típico de capacitores envelhecidos na fonte de alimentação.',
    causes: JSON.stringify([
      'Fonte de alimentação com sinais de desgaste após 4 anos de operação contínua',
      'Histórico de quedas de energia na região que aceleram desgaste de componentes',
    ]),
    actions: JSON.stringify([
      { text: 'Adquirir fonte de alimentação reserva (modelo compatível)', done: true },
      { text: 'Agendar substituição na próxima janela de manutenção', done: false },
      { text: 'Monitorar logs de SNMP a cada 6h até a substituição', done: false },
    ]),
    confirmed: null,
  },
];

// Função principal de seed
function seed() {
  console.log(`\n🌱 Iniciando seed do banco de dados...`);

  if (!keepExisting) {
    // Apaga alertas existentes para reiniciar com dados limpos
    const deleted = db.prepare('DELETE FROM alerts').run();
    // Reseta o auto-increment para que os IDs comecem do 1
    db.prepare("DELETE FROM sqlite_sequence WHERE name = 'alerts'").run();
    console.log(`  ✓ ${deleted.changes} alertas removidos.`);
  } else {
    console.log(`  ℹ️ Flag --keep ativa: alertas existentes mantidos.`);
  }

  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO alerts
       (type, title, area, equipments, risk, accuracy, predicted_for,
        status, context, causes, actions, confirmed, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  // Insere todos os alertas em uma transação (mais rápido e atômico)
  const insertAll = db.transaction((alerts) => {
    for (const a of alerts) {
      // SQLite não aceita boolean — converte confirmed para 0/1/null
      const confirmedDb = a.confirmed === null ? null : a.confirmed ? 1 : 0;
      insert.run(
        a.type,
        a.title,
        a.area,
        a.equipments,
        a.risk,
        a.accuracy,
        a.predicted_for,
        a.status,
        a.context,
        a.causes,
        a.actions,
        confirmedDb,
        now,
        now,
      );
    }
  });

  insertAll(seedAlerts);

  console.log(`  ✓ ${seedAlerts.length} alertas inseridos com sucesso.`);

  // Exibe resumo dos dados inseridos
  const summary = db
    .prepare(
      `SELECT status, COUNT(*) as count FROM alerts
       WHERE deleted_at IS NULL GROUP BY status ORDER BY status`,
    )
    .all();
  console.log('\n  Resumo por status:');
  summary.forEach((r) => console.log(`    ${r.status}: ${r.count}`));

  const riskSummary = db
    .prepare(
      `SELECT risk, COUNT(*) as count FROM alerts
       WHERE deleted_at IS NULL GROUP BY risk ORDER BY risk`,
    )
    .all();
  console.log('\n  Resumo por risco:');
  riskSummary.forEach((r) => console.log(`    ${r.risk}: ${r.count}`));

  console.log('\n✅ Seed concluído!\n');
}

seed();
