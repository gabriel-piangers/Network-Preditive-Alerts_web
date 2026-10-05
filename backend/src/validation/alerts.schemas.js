// Schemas Zod para validação de entrada dos endpoints de alertas.
// Cada schema corresponde a uma fonte de dados diferente (body, query, params).

import { z } from 'zod';

// Valores válidos para os enums (centralizados aqui para evitar duplicação)
const ALERT_TYPES = ['bandwidth_exceeded', 'congestion', 'equipment_failure', 'packet_loss', 'latency', 'other'];
const RISK_VALUES = ['high', 'medium', 'low'];
const STATUS_VALUES = ['new', 'in_analysis', 'monitoring', 'resolved', 'false_positive', 'expired'];

// Schema de um item do checklist completo (usado no PATCH e na resposta)
const ActionSchema = z.object({
  text: z.string().min(1).max(500),
  done: z.boolean(),
});

// Schema de item do checklist na entrada do POST: aceita string ou objeto completo
const ActionInputSchema = z.union([
  // String simples é normalizada para { text, done: false }
  z.string().min(1).max(500).transform((text) => ({ text, done: false })),
  ActionSchema,
]);

// Schema para o corpo do POST /api/alerts
export const createAlertSchema = z.object({
  type: z.enum(ALERT_TYPES),
  title: z.string().min(1).max(200),
  area: z.string().min(1).max(120),
  equipments: z.array(z.string()).max(50),
  risk: z.enum(RISK_VALUES),
  accuracy: z.number().min(0).max(100),
  predicted_for: z
    .string()
    .datetime({ message: 'predicted_for deve ser uma data ISO 8601 válida.' })
    .transform((v) => new Date(v).toISOString()), // normaliza para UTC
  context: z.string().max(10000).default(''),
  causes: z.array(z.string()).max(20).default([]),
  actions: z.array(ActionInputSchema).max(30).default([]),
  // status e confirmed são opcionais no POST (backend aplica os padrões)
  status: z.enum(STATUS_VALUES).optional(),
  confirmed: z.boolean().nullable().optional(),
});

// Schema para o corpo do PATCH /api/alerts/:id
// .strict() rejeita campos desconhecidos; todos os campos são opcionais
export const updateAlertSchema = z
  .object({
    type: z.enum(ALERT_TYPES),
    title: z.string().min(1).max(200),
    area: z.string().min(1).max(120),
    equipments: z.array(z.string()).max(50),
    risk: z.enum(RISK_VALUES),
    accuracy: z.number().min(0).max(100),
    predicted_for: z
      .string()
      .datetime({ message: 'predicted_for deve ser uma data ISO 8601 válida.' })
      .transform((v) => new Date(v).toISOString()),
    status: z.enum(STATUS_VALUES),
    context: z.string().max(10000),
    causes: z.array(z.string()).max(20),
    // No PATCH, actions deve ser um array de objetos completos (não aceita strings)
    actions: z.array(ActionSchema).max(30),
    confirmed: z.boolean().nullable(),
  })
  .partial()
  .strict();

// Schema para os parâmetros de query do GET /api/alerts
// CSV é transformado em array para facilitar o uso no repositório
function csvEnum(values) {
  return z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',') : undefined))
    .pipe(z.array(z.enum(values)).optional());
}

export const listQuerySchema = z.object({
  status: csvEnum(STATUS_VALUES),
  risk: csvEnum(RISK_VALUES),
  type: csvEnum(ALERT_TYPES),
  // area aceita CSV de strings livres
  area: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',') : undefined)),
  min_accuracy: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? Number(v) : undefined))
    .pipe(z.number().min(0).max(100).optional()),
  sort: z
    .enum(['risk', 'predicted_for', 'accuracy', 'status', 'title', 'area', 'created_at', 'updated_at'])
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

// Schema para o parâmetro :id nas rotas (deve ser inteiro positivo)
export const idParamSchema = z.object({
  id: z
    .string()
    .transform((v) => Number(v))
    .pipe(z.number().int().positive()),
});
