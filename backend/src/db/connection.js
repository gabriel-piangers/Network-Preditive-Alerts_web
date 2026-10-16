// Abre a conexão com o banco SQLite banco_dados_ibm.
// Na inicialização, adiciona as colunas de enriquecimento do agente caso ainda
// não existam — isso garante compatibilidade com um banco já populado.

import Database from 'better-sqlite3';
import { DB_PATH } from '../config.js';

// Abre (ou cria) o arquivo de banco de dados
const db = new Database(DB_PATH);

// WAL melhora a performance de leitura concorrente
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Garante que a tabela principal existe (para bancos criados do zero)
db.exec(`
  CREATE TABLE IF NOT EXISTS "logs_informativos" (
    "id_falha"                TEXT NOT NULL,
    "cliente_id"              TEXT NOT NULL,
    "cliente_nome"            TEXT,
    "cliente_banda"           TEXT,
    "dispositivo_id"          TEXT,
    "dispositivo_nome"        TEXT,
    "dispositivo_tipo_conexao" TEXT,
    "dispositivo_no_pai"      TEXT,
    "falha_categoria"         TEXT,
    "falha_descricao"         TEXT,
    "falha_localizacao"       TEXT,
    "perda_pacotes_pct"       REAL,
    "latencia_ms"             REAL,
    "falha_risco"             TEXT,
    "falha_inicio"            TEXT,
    "falha_resolucao"         TEXT,
    "solucao_aplicada"        TEXT,
    "incidente_status"        TEXT NOT NULL DEFAULT 'Aberto',
    "acao_automatizada"       TEXT NOT NULL DEFAULT 'FALSE',
    "contexto"                TEXT NOT NULL DEFAULT '',
    "causas"                  TEXT NOT NULL DEFAULT '[]',
    "acoes"                   TEXT NOT NULL DEFAULT '[]',
    "created_at"              TEXT NOT NULL DEFAULT '',
    "updated_at"              TEXT NOT NULL DEFAULT '',
    "deleted_at"              TEXT,
    PRIMARY KEY("id_falha")
  );
  CREATE INDEX IF NOT EXISTS idx_logs_incidente_status ON logs_informativos(incidente_status);
  CREATE INDEX IF NOT EXISTS idx_logs_falha_risco      ON logs_informativos(falha_risco);
  CREATE INDEX IF NOT EXISTS idx_logs_falha_inicio     ON logs_informativos(falha_inicio);
`);

// Adiciona colunas de enriquecimento caso o banco já exista sem elas.
// SQLite não suporta ADD COLUMN IF NOT EXISTS — usamos try/catch por coluna.
// O índice em deleted_at só pode ser criado após garantir que a coluna existe.
const enrichmentColumns = [
  `ALTER TABLE logs_informativos ADD COLUMN "contexto"    TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE logs_informativos ADD COLUMN "causas"      TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE logs_informativos ADD COLUMN "acoes"       TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE logs_informativos ADD COLUMN "created_at"  TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE logs_informativos ADD COLUMN "updated_at"  TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE logs_informativos ADD COLUMN "deleted_at"  TEXT`,
];

for (const sql of enrichmentColumns) {
  try {
    db.exec(sql);
  } catch {
    // Coluna já existe — "duplicate column name" é esperado e pode ser ignorado
  }
}

// Cria o índice em deleted_at agora que a coluna existe
try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_logs_deleted_at ON logs_informativos(deleted_at)`);
} catch { /* ignorar se já existe */ }

// Preenche created_at/updated_at nas linhas que ainda não têm (banco pré-existente)
const now = new Date().toISOString();
db.prepare(
  `UPDATE logs_informativos SET created_at = ?, updated_at = ? WHERE created_at = '' OR created_at IS NULL`,
).run(now, now);

export default db;
