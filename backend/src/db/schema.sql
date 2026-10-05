-- Schema do banco de dados SQLite.
-- Executado na inicialização via connection.js com CREATE TABLE IF NOT EXISTS.
-- Para recriar o banco do zero: apague o arquivo .db e rode npm run seed.

CREATE TABLE IF NOT EXISTS alerts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  type          TEXT    NOT NULL CHECK (type IN ('bandwidth_exceeded','congestion','equipment_failure','packet_loss','latency','other')),
  title         TEXT    NOT NULL,
  area          TEXT    NOT NULL,
  equipments    TEXT    NOT NULL DEFAULT '[]',      -- JSON (array de strings)
  risk          TEXT    NOT NULL CHECK (risk IN ('high','medium','low')),
  accuracy      REAL    NOT NULL CHECK (accuracy >= 0 AND accuracy <= 100),
  predicted_for TEXT    NOT NULL,                   -- ISO 8601 UTC
  status        TEXT    NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_analysis','monitoring','resolved','false_positive','expired')),
  context       TEXT    NOT NULL DEFAULT '',
  causes        TEXT    NOT NULL DEFAULT '[]',      -- JSON (array de strings)
  actions       TEXT    NOT NULL DEFAULT '[]',      -- JSON (array de {text, done})
  confirmed     INTEGER CHECK (confirmed IN (0,1)), -- NULL | 0 | 1
  created_at    TEXT    NOT NULL,
  updated_at    TEXT    NOT NULL,
  deleted_at    TEXT                                -- soft delete (NULL = ativo)
);

CREATE INDEX IF NOT EXISTS idx_alerts_status        ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_risk          ON alerts(risk);
CREATE INDEX IF NOT EXISTS idx_alerts_predicted_for ON alerts(predicted_for);
CREATE INDEX IF NOT EXISTS idx_alerts_deleted_at    ON alerts(deleted_at);
