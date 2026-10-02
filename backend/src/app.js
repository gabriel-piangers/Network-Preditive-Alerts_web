// Cria e exporta o app Express sem chamar listen.
// Separado de server.js para que os testes possam importar o app diretamente
// e usar um banco SQLite em memória (DB_PATH=:memory:).

import express from 'express';
import cors from 'cors';
import { CORS_ORIGIN } from './config.js';

const app = express();

// Permite requisições do frontend (origem configurada via CORS_ORIGIN)
app.use(cors({ origin: CORS_ORIGIN }));

// Interpreta o corpo das requisições como JSON
app.use(express.json());

// Rota de verificação de saúde — usada para confirmar que o servidor está no ar
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// TODO (Fase 2): registrar rotas de alertas

export default app;
