// Repositório de alertas: TODO o SQL fica aqui.
// Usa prepared statements do better-sqlite3 — nunca interpola valores do usuário nas queries.
// Funções de mapeamento convertem linha do banco <-> objeto da API.

import db from '../db/connection.js';

// Statuses considerados "ativos" — usados na expiração automática e no summary
const ACTIVE_STATUSES = ['new', 'in_analysis', 'monitoring'];

// Mapeamento de chaves permitidas para ordenação (lista branca contra SQL injection)
const SORT_COLUMN_MAP = {
  risk: "CASE risk WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END",
  predicted_for: 'predicted_for',
  accuracy: 'accuracy',
  status: 'status',
  title: 'title',
  area: 'area',
  created_at: 'created_at',
  updated_at: 'updated_at',
};

// Converte uma linha do banco para o formato esperado pela API.
// Remove deleted_at e converte os campos JSON e confirmed.
function rowToAlert(row) {
  if (!row) return null;
  // deleted_at não deve ser exposto na API — removido da resposta
  // eslint-disable-next-line no-unused-vars
  const { deleted_at, ...rest } = row;
  return {
    ...rest,
    equipments: JSON.parse(row.equipments),
    causes: JSON.parse(row.causes),
    actions: JSON.parse(row.actions),
    // SQLite armazena confirmed como 0, 1 ou NULL; API usa false, true ou null
    confirmed: row.confirmed === null ? null : Boolean(row.confirmed),
  };
}

// Marca como "expired" os alertas ativos cujo predicted_for passou há mais de 30 minutos.
// Chamado antes de qualquer leitura para manter os status atualizados.
export function expireStaleAlerts() {
  const threshold = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const placeholders = ACTIVE_STATUSES.map(() => '?').join(', ');
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE alerts
     SET status = 'expired', updated_at = ?
     WHERE status IN (${placeholders})
       AND predicted_for < ?
       AND deleted_at IS NULL`,
  ).run(now, ...ACTIVE_STATUSES, threshold);
}

// Retorna um único alerta pelo id (apenas não-arquivados).
export function findById(id) {
  expireStaleAlerts();
  const row = db
    .prepare('SELECT * FROM alerts WHERE id = ? AND deleted_at IS NULL')
    .get(id);
  return rowToAlert(row);
}

// Lista alertas com filtros, ordenação e paginação.
// Retorna { data: Alert[], meta: { page, page_size, total, total_pages } }.
export function findAll(filters = {}) {
  expireStaleAlerts();

  const {
    status,
    risk,
    type,
    area,
    min_accuracy,
    sort,
    order,
    page = 1,
    page_size = 20,
  } = filters;

  const conditions = ['deleted_at IS NULL'];
  const params = [];

  if (status && status.length > 0) {
    conditions.push(`status IN (${status.map(() => '?').join(', ')})`);
    params.push(...status);
  }
  if (risk && risk.length > 0) {
    conditions.push(`risk IN (${risk.map(() => '?').join(', ')})`);
    params.push(...risk);
  }
  if (type && type.length > 0) {
    conditions.push(`type IN (${type.map(() => '?').join(', ')})`);
    params.push(...type);
  }
  if (area && area.length > 0) {
    conditions.push(`area IN (${area.map(() => '?').join(', ')})`);
    params.push(...area);
  }
  if (min_accuracy !== undefined) {
    conditions.push('accuracy >= ?');
    params.push(min_accuracy);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  // Determina ordenação: se sort foi fornecido, usa coluna + desempate por id DESC;
  // se não, usa risco ↓ + predicted_for ↑ (ordenação padrão)
  let orderClause;
  if (sort) {
    const col = SORT_COLUMN_MAP[sort];
    // Direção padrão por campo (seção 6.4)
    const defaultDesc = ['risk', 'accuracy', 'created_at', 'updated_at'];
    const dir = order || (defaultDesc.includes(sort) ? 'DESC' : 'ASC');
    orderClause = `ORDER BY ${col} ${dir}, id DESC`;
  } else {
    orderClause = `ORDER BY ${SORT_COLUMN_MAP.risk} DESC, predicted_for ASC`;
  }

  // Contagem total para paginação
  const total = db
    .prepare(`SELECT COUNT(*) as count FROM alerts ${where}`)
    .get(...params).count;

  const offset = (page - 1) * page_size;
  const rows = db
    .prepare(`SELECT * FROM alerts ${where} ${orderClause} LIMIT ? OFFSET ?`)
    .all(...params, page_size, offset);

  return {
    data: rows.map(rowToAlert),
    meta: {
      page,
      page_size,
      total,
      total_pages: Math.ceil(total / page_size),
    },
  };
}

// Retorna contagens para a visão geral (summary).
export function getSummary() {
  expireStaleAlerts();

  const activePlaceholders = ACTIVE_STATUSES.map(() => '?').join(', ');

  // Contagem de alertas ativos totais
  const { total_active } = db
    .prepare(
      `SELECT COUNT(*) as total_active FROM alerts
       WHERE status IN (${activePlaceholders}) AND deleted_at IS NULL`,
    )
    .get(...ACTIVE_STATUSES);

  // Contagem de alertas novos
  const { new_count } = db
    .prepare(
      `SELECT COUNT(*) as new_count FROM alerts
       WHERE status = 'new' AND deleted_at IS NULL`,
    )
    .get();

  // Contagem por risco (apenas ativos)
  const riskRows = db
    .prepare(
      `SELECT risk, COUNT(*) as count FROM alerts
       WHERE status IN (${activePlaceholders}) AND deleted_at IS NULL
       GROUP BY risk`,
    )
    .all(...ACTIVE_STATUSES);
  const by_risk = { high: 0, medium: 0, low: 0 };
  riskRows.forEach((r) => (by_risk[r.risk] = r.count));

  // Contagem por status (todos não-arquivados)
  const statusRows = db
    .prepare(
      `SELECT status, COUNT(*) as count FROM alerts
       WHERE deleted_at IS NULL
       GROUP BY status`,
    )
    .all();
  const by_status = {
    new: 0,
    in_analysis: 0,
    monitoring: 0,
    resolved: 0,
    false_positive: 0,
    expired: 0,
  };
  statusRows.forEach((r) => (by_status[r.status] = r.count));

  // Áreas distintas (não-arquivadas, ordem alfabética)
  const areaRows = db
    .prepare(
      `SELECT DISTINCT area FROM alerts
       WHERE deleted_at IS NULL
       ORDER BY area ASC`,
    )
    .all();
  const areas = areaRows.map((r) => r.area);

  return { total_active, new_count, by_risk, by_status, areas };
}

// Insere um novo alerta e retorna o objeto criado.
export function create(data) {
  const now = new Date().toISOString();
  const stmt = db.prepare(
    `INSERT INTO alerts
       (type, title, area, equipments, risk, accuracy, predicted_for,
        status, context, causes, actions, confirmed, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const result = stmt.run(
    data.type,
    data.title,
    data.area,
    JSON.stringify(data.equipments),
    data.risk,
    data.accuracy,
    data.predicted_for,
    data.status || 'new',
    data.context,
    JSON.stringify(data.causes),
    JSON.stringify(data.actions),
    data.confirmed === undefined ? null : data.confirmed === true ? 1 : 0,
    now,
    now,
  );
  return findById(result.lastInsertRowid);
}

// Atualiza campos parciais de um alerta e retorna o objeto atualizado.
// Apenas campos presentes em `data` são alterados.
export function update(id, data) {
  const now = new Date().toISOString();
  const setClauses = [];
  const params = [];

  // Campos escalares simples
  const scalarFields = ['type', 'title', 'area', 'risk', 'accuracy', 'predicted_for', 'status', 'context'];
  scalarFields.forEach((field) => {
    if (data[field] !== undefined) {
      setClauses.push(`${field} = ?`);
      params.push(data[field]);
    }
  });

  // Campos JSON
  if (data.equipments !== undefined) {
    setClauses.push('equipments = ?');
    params.push(JSON.stringify(data.equipments));
  }
  if (data.causes !== undefined) {
    setClauses.push('causes = ?');
    params.push(JSON.stringify(data.causes));
  }
  if (data.actions !== undefined) {
    setClauses.push('actions = ?');
    params.push(JSON.stringify(data.actions));
  }

  // confirmed: true -> 1, false -> 0, null -> NULL
  if (data.confirmed !== undefined) {
    setClauses.push('confirmed = ?');
    params.push(data.confirmed === null ? null : data.confirmed ? 1 : 0);
  }

  // updated_at sempre atualizado
  setClauses.push('updated_at = ?');
  params.push(now);

  // id vai ao final como parâmetro do WHERE
  params.push(id);

  db.prepare(
    `UPDATE alerts SET ${setClauses.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
  ).run(...params);

  return findById(id);
}

// Soft delete: preenche deleted_at. Retorna true se encontrou e arquivou, false se não existe.
export function softDelete(id) {
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `UPDATE alerts SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL`,
    )
    .run(now, id);
  return result.changes > 0;
}
