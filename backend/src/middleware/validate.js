// Middleware genérico de validação com Zod.
// validate(schema, source) valida req[source] e substitui pelo valor já convertido.
// source pode ser 'body', 'query' ou 'params'.
// Isso permite que campos como `page` cheguem já convertidos para número nos controllers.

import { HttpError } from '../utils/httpErrors.js';

export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      // Formata os erros do Zod para o padrão de details da API (seção 6.6)
      const details = result.error.errors.map((e) => ({
        field: e.path.join('.') || source,
        message: e.message,
      }));
      return next(new HttpError(400, 'VALIDATION_ERROR', 'Dados inválidos.', details));
    }
    // req.query é read-only (getter) no Express 5 — não pode ser reatribuído.
    // Guardamos os valores processados em req.parsed[source] para uso nos controllers.
    if (!req.parsed) req.parsed = {};
    req.parsed[source] = result.data;
    // Para body e params também sobrescrevemos diretamente (são graváveis)
    if (source !== 'query') {
      req[source] = result.data;
    }
    next();
  };
}
