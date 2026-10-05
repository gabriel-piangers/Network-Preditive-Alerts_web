// Middleware de rota não encontrada (404).
// Deve ser registrado após todas as rotas válidas.

import { HttpError } from '../utils/httpErrors.js';

export function notFound(req, _res, next) {
  next(new HttpError(404, 'NOT_FOUND', `Rota não encontrada: ${req.method} ${req.path}`));
}
