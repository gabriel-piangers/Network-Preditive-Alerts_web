-- Schema do banco de dados SQLite.
-- A tabela principal é logs_informativos, que registra incidentes de rede
-- recebidos em tempo real pelo agente, que enriquece cada entrada com
-- investigação inicial, causas, ações e contexto.
-- Este arquivo só é executado quando o DB é criado do zero (npm run seed).

CREATE TABLE IF NOT EXISTS "logs_informativos" (
  "id_falha"                TEXT    NOT NULL,
  "cliente_id"              TEXT    NOT NULL,
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
  "incidente_status"        TEXT    NOT NULL DEFAULT 'Aberto',
  "acao_automatizada"       TEXT    NOT NULL DEFAULT 'FALSE',
  -- Campos enriquecidos pelo agente após investigação inicial
  "contexto"                TEXT    NOT NULL DEFAULT '',
  "causas"                  TEXT    NOT NULL DEFAULT '[]',  -- JSON array de strings
  "acoes"                   TEXT    NOT NULL DEFAULT '[]',  -- JSON array de {text, done}
  "created_at"              TEXT    NOT NULL,
  "updated_at"              TEXT    NOT NULL,
  "deleted_at"              TEXT,                           -- soft delete (NULL = ativo)
  PRIMARY KEY("id_falha")
);

CREATE INDEX IF NOT EXISTS idx_logs_incidente_status ON logs_informativos(incidente_status);
CREATE INDEX IF NOT EXISTS idx_logs_falha_risco      ON logs_informativos(falha_risco);
CREATE INDEX IF NOT EXISTS idx_logs_falha_inicio     ON logs_informativos(falha_inicio);
CREATE INDEX IF NOT EXISTS idx_logs_deleted_at       ON logs_informativos(deleted_at);
