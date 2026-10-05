// Cria e exporta o app Express sem chamar listen.
// Separado de server.js para que os testes possam importar o app diretamente
// e usar um banco SQLite em memória (DB_PATH=:memory:).

import express from 'express';
import cors from 'cors';
import { CORS_ORIGIN } from './config.js';
import alertsRouter from './routes/alerts.routes.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Permite requisições do frontend (origem configurada via CORS_ORIGIN)
app.use(cors({ origin: CORS_ORIGIN }));

// Interpreta o corpo das requisições como JSON
app.use(express.json());

// Rota de verificação de saúde — usada para confirmar que o servidor está no ar
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Rotas de alertas sob o prefixo /api/alerts
app.use('/api/alerts', alertsRouter);

// 404 para rotas não registradas (deve vir após todas as rotas)
app.use(notFound);

// Tratamento global de erros (deve ser o último middleware)
app.use(errorHandler);

export default app;
