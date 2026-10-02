// Enums e rótulos em PT-BR para tipos, riscos e situações de alertas.
// Centralizar aqui evita textos espalhados nos componentes.
// Baseado nas tabelas das seções 5.2, 5.3 e 5.4 do SPEC.md.
// TODO (Fase 4): preencher os valores conforme o SPEC

export const ALERT_TYPE_LABELS = {
  bandwidth_exceeded: 'Banda excedida',
  congestion: 'Congestionamento',
  equipment_failure: 'Falha de equipamento',
  packet_loss: 'Perda de pacotes',
  latency: 'Latência elevada',
  other: 'Outro',
};

export const ALERT_RISK_LABELS = {
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
};

// Peso numérico para ordenação (maior = mais urgente)
export const ALERT_RISK_WEIGHT = {
  high: 3,
  medium: 2,
  low: 1,
};

export const ALERT_STATUS_LABELS = {
  new: 'Novo',
  in_analysis: 'Em análise',
  monitoring: 'Monitorando',
  resolved: 'Resolvido',
  false_positive: 'Falso positivo',
  expired: 'Expirado',
};

// Status considerados "ativos" (usados no filtro padrão da lista)
export const ACTIVE_STATUSES = ['new', 'in_analysis', 'monitoring'];
