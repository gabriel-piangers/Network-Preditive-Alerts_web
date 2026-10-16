// Enums e rótulos em PT-BR para categorias, riscos e situações de incidentes.
// Centralizar aqui evita textos espalhados nos componentes.

export const FALHA_CATEGORIA_LABELS = {
  'Perda de pacotes': 'Perda de pacotes',
  'LOS (Loss of Signal)': 'LOS (Perda de sinal)',
  'Latência elevada': 'Latência elevada',
  'Falha de equipamento': 'Falha de equipamento',
  'Degradação óptica': 'Degradação óptica',
  'Congestionamento': 'Congestionamento',
  'Falha de autenticação': 'Falha de autenticação',
  'Interferência externa': 'Interferência externa',
  'Queda de energia': 'Queda de energia',
  'Banda excedida': 'Banda excedida',
  'Outro': 'Outro',
};

export const FALHA_RISCO_LABELS = {
  'Crítico': 'Crítico',
  'Alto': 'Alto',
  'Médio': 'Médio',
  'Baixo': 'Baixo',
};

// Peso numérico para ordenação (maior = mais urgente)
export const FALHA_RISCO_WEIGHT = {
  'Crítico': 4,
  'Alto': 3,
  'Médio': 2,
  'Baixo': 1,
};

export const INCIDENTE_STATUS_LABELS = {
  'Aberto': 'Aberto',
  'Em Andamento': 'Em Andamento',
  'Resolvido': 'Resolvido',
};

// Status considerados "ativos" (usados no filtro padrão da lista)
export const ACTIVE_STATUSES = ['Aberto', 'Em Andamento'];
