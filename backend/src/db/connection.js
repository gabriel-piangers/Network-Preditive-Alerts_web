// Abre a conexão com o banco SQLite e executa o schema na inicialização.
// WAL (Write-Ahead Logging) melhora a performance de leitura concorrente.
// O schema é executado com CREATE TABLE IF NOT EXISTS, então é seguro chamar múltiplas vezes.

import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DB_PATH } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Abre (ou cria) o arquivo de banco de dados
const db = new Database(DB_PATH);

// WAL melhora a performance; foreign_keys garante integridade referencial
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Executa o schema na inicialização — cria tabelas e índices se não existirem
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

export default db;
