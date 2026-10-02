// Middleware global de tratamento de erros.
// Deve ser o último middleware registrado no app.
// Formata todos os erros no padrão da seção 6.6 e nunca vaza stack trace na resposta.
// TODO (Fase 2): implementar conforme seção 6.6

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  console.error(err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Erro interno do servidor.',
    },
  });
}
