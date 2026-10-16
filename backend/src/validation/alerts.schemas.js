// Schemas Zod para validação de entrada dos endpoints de incidentes.
// Cada schema corresponde a uma fonte de dados diferente (body, query, params).

import { z } from 'zod';

// Valores válidos para os enums (centralizados aqui para evitar duplicação)
const FALHA_CATEGORIAS = [
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
  'Outro',
];

const FALHA_RISCOS = ['Crítico', 'Alto', 'Médio', 'Baixo'];
const INCIDENTE_STATUS_VALUES = ['Aberto', 'Em Andamento', 'Resolvido'];

// Schema de um item do checklist completo (usado no PATCH e na resposta)
const AcaoSchema = z.object({
  text: z.string().min(1).max(500),
  done: z.boolean(),
});

// Schema de item do checklist na entrada do POST: aceita string ou objeto completo
const AcaoInputSchema = z.union([
  z.string().min(1).max(500).transform((text) => ({ text, done: false })),
  AcaoSchema,
]);

// Schema para o corpo do POST /api/alerts (criação de incidente pelo agente)
export const createAlertSchema = z.object({
  id_falha: z.string().min(1).max(50),
  cliente_id: z.string().min(1).max(50),
  cliente_nome: z.string().max(200).optional().nullable(),
  cliente_banda: z.string().max(50).optional().nullable(),
  dispositivo_id: z.string().max(50).optional().nullable(),
  dispositivo_nome: z.string().max(200).optional().nullable(),
  dispositivo_tipo_conexao: z.string().max(100).optional().nullable(),
  dispositivo_no_pai: z.string().max(100).optional().nullable(),
  falha_categoria: z.enum(FALHA_CATEGORIAS).optional().nullable(),
  falha_descricao: z.string().max(1000).optional().nullable(),
  falha_localizacao: z.string().max(200).optional().nullable(),
  perda_pacotes_pct: z.number().min(0).max(100).optional().nullable(),
  latencia_ms: z.number().min(0).optional().nullable(),
  falha_risco: z.enum(FALHA_RISCOS).optional().nullable(),
  falha_inicio: z.string().max(50).optional().nullable(),
  falha_resolucao: z.string().max(50).optional().nullable(),
  solucao_aplicada: z.string().max(500).optional().nullable(),
  incidente_status: z.enum(INCIDENTE_STATUS_VALUES).default('Aberto'),
  acao_automatizada: z.boolean().default(false),
  contexto: z.string().max(10000).default(''),
  causas: z.array(z.string()).max(20).default([]),
  acoes: z.array(AcaoInputSchema).max(30).default([]),
});

// Schema para o corpo do PATCH /api/alerts/:id
// .strict() rejeita campos desconhecidos; todos os campos são opcionais
export const updateAlertSchema = z
  .object({
    cliente_nome: z.string().max(200).nullable(),
    cliente_banda: z.string().max(50).nullable(),
    dispositivo_id: z.string().max(50).nullable(),
    dispositivo_nome: z.string().max(200).nullable(),
    dispositivo_tipo_conexao: z.string().max(100).nullable(),
    dispositivo_no_pai: z.string().max(100).nullable(),
    falha_categoria: z.enum(FALHA_CATEGORIAS).nullable(),
    falha_descricao: z.string().max(1000).nullable(),
    falha_localizacao: z.string().max(200).nullable(),
    perda_pacotes_pct: z.number().min(0).max(100).nullable(),
    latencia_ms: z.number().min(0).nullable(),
    falha_risco: z.enum(FALHA_RISCOS).nullable(),
    falha_inicio: z.string().max(50).nullable(),
    falha_resolucao: z.string().max(50).nullable(),
    solucao_aplicada: z.string().max(500).nullable(),
    incidente_status: z.enum(INCIDENTE_STATUS_VALUES),
    acao_automatizada: z.boolean(),
    contexto: z.string().max(10000),
    causas: z.array(z.string()).max(20),
    acoes: z.array(AcaoSchema).max(30),
  })
  .partial()
  .strict();

// Schema para os parâmetros de query do GET /api/alerts
// CSV é transformado em array para facilitar o uso no repositório
function csvOf(values) {
  return z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',') : undefined))
    .pipe(z.array(z.enum(values)).optional());
}

export const listQuerySchema = z.object({
  incidente_status: csvOf(INCIDENTE_STATUS_VALUES),
  falha_risco: csvOf(FALHA_RISCOS),
  falha_categoria: csvOf(FALHA_CATEGORIAS),
  falha_localizacao: z.string().max(200).optional(),
  sort: z
    .enum(['falha_risco', 'falha_inicio', 'incidente_status', 'falha_categoria', 'falha_localizacao', 'cliente_nome', 'created_at', 'updated_at'])
    .optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? Number(v) : 1))
    .pipe(z.number().int().min(1).default(1)),
  page_size: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? Number(v) : 20))
    .pipe(z.number().int().min(1).max(100).default(20)),
});

// Schema para o parâmetro :id nas rotas (id_falha é uma string como "INC-2026001")
export const idParamSchema = z.object({
  id: z.string().min(1).max(50),
});
