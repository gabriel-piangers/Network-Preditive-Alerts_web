// Middleware de rota não encontrada (404).
// Deve ser registrado após todas as rotas válidas.
// TODO (Fase 2): implementar conforme seção 6.6

export function notFound(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Rota não encontrada.',
    },
  });
}
