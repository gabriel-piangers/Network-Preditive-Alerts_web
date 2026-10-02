// Lê as variáveis de ambiente e exporta com valores padrão.
// Centralizar aqui evita que o resto do código acesse process.env diretamente.

import 'dotenv/config';

export const PORT = process.env.PORT || '3001';
export const DB_PATH = process.env.DB_PATH || './data/alerts.db';
export const AGENT_API_KEY = process.env.AGENT_API_KEY || 'dev-agent-key-change-me';
export const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
export const LOG_DIR = process.env.LOG_DIR || './logs';
export const API_URL = process.env.API_URL || 'http://localhost:3001';
