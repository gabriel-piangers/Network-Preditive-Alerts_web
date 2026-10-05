// Middleware de log das requisições do agente.
// Considera-se "requisição do agente" qualquer requisição que traga o header X-API-Key.
// Registra uma linha por requisição, ao final da resposta, em LOG_DIR/agent-YYYY-MM-DD.txt.
// Falha ao escrever o log não derruba a requisição.

import fs from 'node:fs';
import path from 'node:path';
import { LOG_DIR } from '../config.js';

const MAX_BODY_LENGTH = 2000;

/**
 * Retorna o caminho do arquivo de log para o dia de hoje.
 * Cria a pasta LOG_DIR se ainda não existir.
 */
function getLogFilePath() {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  fs.mkdirSync(LOG_DIR, { recursive: true });
  return path.join(LOG_DIR, `agent-${date}.txt`);
}

/**
 * Serializa o body para string, truncando em MAX_BODY_LENGTH caracteres,
 * e nunca inclui o valor da X-API-Key.
 */
function serializeBody(body) {
  if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
    return '';
  }
  // Remove a chave de API caso venha no body por engano
  const safe = { ...body };
  delete safe['x-api-key'];
  delete safe['X-Api-Key'];
  const str = JSON.stringify(safe);
  return str.length > MAX_BODY_LENGTH ? str.slice(0, MAX_BODY_LENGTH) + '…' : str;
}

/**
 * agentRequestLogger — registra requisições que contenham o header X-API-Key.
 * O valor da chave nunca é registrado.
 */
export function agentRequestLogger(req, res, next) {
  // Só registra se vier o header X-API-Key (independente de ser válida ou não)
  if (!req.headers['x-api-key']) {
    return next();
  }

  const startedAt = Date.now();

  res.on('finish', () => {
    try {
      const duration = Date.now() - startedAt;
      const timestamp = new Date().toISOString();
      const bodyStr = serializeBody(req.body);
      const bodySuffix = bodyStr ? ` body=${bodyStr}` : '';
      const line = `[${timestamp}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)${bodySuffix}\n`;

      fs.appendFile(getLogFilePath(), line, (err) => {
        if (err) {
          console.error('[agentRequestLogger] Erro ao escrever log:', err.message);
        }
      });
    } catch (err) {
      console.error('[agentRequestLogger] Erro inesperado:', err.message);
    }
  });

  next();
}
