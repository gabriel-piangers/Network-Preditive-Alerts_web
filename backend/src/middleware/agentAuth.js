// Middleware de autenticação do agente.
// Verifica o header X-API-Key nas rotas que exigem identificação do agente (POST /api/alerts).
// Rotas sem este middleware (PATCH, DELETE) não exigem chave — limitação conhecida do MVP.

import { AGENT_API_KEY } from '../config.js';
import { HttpError } from '../utils/httpErrors.js';

export function agentAuth(req, _res, next) {
  const key = req.headers['x-api-key'];
  if (!key || key !== AGENT_API_KEY) {
    return next(new HttpError(401, 'UNAUTHORIZED', 'X-API-Key ausente ou inválida.'));
  }
  next();
}
