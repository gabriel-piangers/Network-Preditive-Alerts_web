// Middleware global de tratamento de erros.
// Deve ser o último middleware registrado no app.
// Formata todos os erros no padrão da seção 6.6 e nunca vaza stack trace na resposta.

import { HttpError } from '../utils/httpErrors.js';

export function errorHandler(err, req, res, _next) {
  // Erro de JSON malformado no body-parser
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { code: 'INVALID_JSON', message: 'JSON malformado.' },
    });
  }

  // Erros esperados (lançados com HttpError)
  if (err instanceof HttpError) {
    const body = { error: { code: err.code, message: err.message } };
    if (err.details) body.error.details = err.details;
    return res.status(err.status).json(body);
  }

  // Erro inesperado: loga no console mas não vaza stack trace na resposta
  console.error('[ERROR]', err);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' },
  });
}
