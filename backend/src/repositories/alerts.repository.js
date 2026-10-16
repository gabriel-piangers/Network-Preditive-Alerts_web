// Repositório de incidentes: TODO o SQL fica aqui.
// Usa prepared statements do better-sqlite3 — nunca interpola valores do usuário nas queries.
// Funções de mapeamento convertem linha do banco <-> objeto da API.

import db from '../db/connection.js';

// Status considerados "ativos" — usados no summary
const ACTIVE_STATUSES = ['Aberto', 'Em Andamento'];

// Mapeamento de chaves permitidas para ordenação (lista branca contra SQL injection)
const SORT_COLUMN_MAP = {
  falha_risco: `CASE falha_risco WHEN 'Crítico' THEN 4 WHEN 'Alto' THEN 3 WHEN 'Médio' THEN 2 ELSE 1 END`,
  falha_inicio: 'falha_inicio',
  incidente_status: 'incidente_status',
  falha_categoria: 'falha_categoria',
  falha_localizacao: 'falha_localizacao',
  cliente_nome: 'cliente_nome',
  created_at: 'created_at',
  updated_at: 'updated_at',
};

// Converte uma linha do banco para o formato esperado pela API.
function rowToIncident(row) {
  if (!row) return null;
  // deleted_at não deve ser exposto na API
  // eslint-disable-next-line no-unused-vars
  const { deleted_at, ...rest } = row;
  return {
    ...rest,
    causas: JSON.parse(row.causas || '[]'),
    acoes: JSON.parse(row.acoes || '[]'),
    acao_automatizada: row.acao_automatizada === 'TRUE' || row.acao_automatizada === true,
    perda_pacotes_pct: row.perda_pacotes_pct ?? null,
    latencia_ms: row.latencia_ms ?? null,
  };
}

// Retorna um único incidente pelo id_falha (apenas não-arquivados).
export function findById(id) {
  const row = db
    .prepare('SELECT * FROM logs_informativos WHERE id_falha = ? AND deleted_at IS NULL')
    .get(id);
  return rowToIncident(row);
}

// Lista incidentes com filtros, ordenação e paginação.
// Retorna { data: Incident[], meta: { page, page_size, total, total_pages } }.
export function findAll(filters = {}) {
  const {
    incidente_status,
    falha_risco,
    falha_categoria,
    falha_localizacao,
    sort,
    order,
    page = 1,
    page_size = 20,
  } = filters;

  const conditions = ['deleted_at IS NULL'];
  const params = [];

  if (incidente_status && incidente_status.length > 0) {
    conditions.push(`incidente_status IN (${incidente_status.map(() => '?').join(', ')})`);
    params.push(...incidente_status);
  }
  if (falha_risco && falha_risco.length > 0) {
    conditions.push(`falha_risco IN (${falha_risco.map(() => '?').join(', ')})`);
    params.push(...falha_risco);
  }
  if (falha_categoria && falha_categoria.length > 0) {
    conditions.push(`falha_categoria IN (${falha_categoria.map(() => '?').join(', ')})`);
    params.push(...falha_categoria);
  }
  if (falha_localizacao) {
    conditions.push('falha_localizacao LIKE ?');
    params.push(`%${falha_localizacao}%`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  // Determina ordenação
  let orderClause;
  if (sort && SORT_COLUMN_MAP[sort]) {
    const col = SORT_COLUMN_MAP[sort];
    const defaultDesc = ['falha_risco', 'created_at', 'updated_at'];
    const dir = order?.toUpperCase() === 'ASC' ? 'ASC' : (order?.toUpperCase() === 'DESC' ? 'DESC' : (defaultDesc.includes(sort) ? 'DESC' : 'ASC'));
    orderClause = `ORDER BY ${col} ${dir}, id_falha DESC`;
  } else {
    orderClause = `ORDER BY ${SORT_COLUMN_MAP.falha_risco} DESC, falha_inicio ASC`;
  }

  // Contagem total para paginação
  const total = db
    .prepare(`SELECT COUNT(*) as count FROM logs_informativos ${where}`)
    .get(...params).count;

  const offset = (page - 1) * page_size;
  const rows = db
    .prepare(`SELECT * FROM logs_informativos ${where} ${orderClause} LIMIT ? OFFSET ?`)
    .all(...params, page_size, offset);

  return {
    data: rows.map(rowToIncident),
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
  const activePlaceholders = ACTIVE_STATUSES.map(() => '?').join(', ');

  // Contagem de incidentes ativos totais
  const { total_active } = db
    .prepare(
      `SELECT COUNT(*) as total_active FROM logs_informativos
       WHERE incidente_status IN (${activePlaceholders}) AND deleted_at IS NULL`,
    )
    .get(...ACTIVE_STATUSES);

  // Contagem de incidentes novos (Aberto)
  const { abertos } = db
    .prepare(
      `SELECT COUNT(*) as abertos FROM logs_informativos
       WHERE incidente_status = 'Aberto' AND deleted_at IS NULL`,
    )
    .get();

  // Contagem por risco (apenas ativos)
  const riskRows = db
    .prepare(
      `SELECT falha_risco, COUNT(*) as count FROM logs_informativos
       WHERE incidente_status IN (${activePlaceholders}) AND deleted_at IS NULL
       GROUP BY falha_risco`,
    )
    .all(...ACTIVE_STATUSES);
  const by_risco = { Crítico: 0, Alto: 0, Médio: 0, Baixo: 0 };
  riskRows.forEach((r) => {
    if (r.falha_risco in by_risco) by_risco[r.falha_risco] = r.count;
  });

  // Contagem por status (todos não-arquivados)
  const statusRows = db
    .prepare(
      `SELECT incidente_status, COUNT(*) as count FROM logs_informativos
       WHERE deleted_at IS NULL
       GROUP BY incidente_status`,
    )
    .all();
  const by_status = { Aberto: 0, 'Em Andamento': 0, Resolvido: 0 };
  statusRows.forEach((r) => {
    if (r.incidente_status in by_status) by_status[r.incidente_status] = r.count;
  });

  // Localizações distintas (não-arquivadas, ordem alfabética)
  const locRows = db
    .prepare(
      `SELECT DISTINCT falha_localizacao FROM logs_informativos
       WHERE deleted_at IS NULL AND falha_localizacao IS NOT NULL
       ORDER BY falha_localizacao ASC`,
    )
    .all();
  const localizacoes = locRows.map((r) => r.falha_localizacao);

  // Categorias distintas
  const catRows = db
    .prepare(
      `SELECT DISTINCT falha_categoria FROM logs_informativos
       WHERE deleted_at IS NULL AND falha_categoria IS NOT NULL
       ORDER BY falha_categoria ASC`,
    )
    .all();
  const categorias = catRows.map((r) => r.falha_categoria);

  return { total_active, abertos, by_risco, by_status, localizacoes, categorias };
}

// Insere um novo incidente e retorna o objeto criado.
export function create(data) {
  const now = new Date().toISOString();
  const stmt = db.prepare(
    `INSERT INTO logs_informativos
       (id_falha, cliente_id, cliente_nome, cliente_banda,
        dispositivo_id, dispositivo_nome, dispositivo_tipo_conexao, dispositivo_no_pai,
        falha_categoria, falha_descricao, falha_localizacao,
        perda_pacotes_pct, latencia_ms, falha_risco,
        falha_inicio, falha_resolucao, solucao_aplicada,
        incidente_status, acao_automatizada,
        contexto, causas, acoes,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  stmt.run(
    data.id_falha,
    data.cliente_id,
    data.cliente_nome ?? null,
    data.cliente_banda ?? null,
    data.dispositivo_id ?? null,
    data.dispositivo_nome ?? null,
    data.dispositivo_tipo_conexao ?? null,
    data.dispositivo_no_pai ?? null,
    data.falha_categoria ?? null,
    data.falha_descricao ?? null,
    data.falha_localizacao ?? null,
    data.perda_pacotes_pct ?? null,
    data.latencia_ms ?? null,
    data.falha_risco ?? null,
    data.falha_inicio ?? null,
    data.falha_resolucao ?? null,
    data.solucao_aplicada ?? null,
    data.incidente_status ?? 'Aberto',
    data.acao_automatizada ? 'TRUE' : 'FALSE',
    data.contexto ?? '',
    JSON.stringify(data.causas ?? []),
    JSON.stringify(data.acoes ?? []),
    now,
    now,
  );
  return findById(data.id_falha);
}

// Atualiza campos parciais de um incidente e retorna o objeto atualizado.
export function update(id, data) {
  const now = new Date().toISOString();
  const setClauses = [];
  const params = [];

  // Campos escalares
  const scalarFields = [
    'cliente_nome', 'cliente_banda',
    'dispositivo_id', 'dispositivo_nome', 'dispositivo_tipo_conexao', 'dispositivo_no_pai',
    'falha_categoria', 'falha_descricao', 'falha_localizacao',
    'perda_pacotes_pct', 'latencia_ms', 'falha_risco',
    'falha_inicio', 'falha_resolucao', 'solucao_aplicada',
    'incidente_status', 'contexto',
  ];
  scalarFields.forEach((field) => {
    if (data[field] !== undefined) {
      setClauses.push(`${field} = ?`);
      params.push(data[field]);
    }
  });

  if (data.acao_automatizada !== undefined) {
    setClauses.push('acao_automatizada = ?');
    params.push(data.acao_automatizada ? 'TRUE' : 'FALSE');
  }

  // Campos JSON
  if (data.causas !== undefined) {
    setClauses.push('causas = ?');
    params.push(JSON.stringify(data.causas));
  }
  if (data.acoes !== undefined) {
    setClauses.push('acoes = ?');
    params.push(JSON.stringify(data.acoes));
  }

  // updated_at sempre atualizado
  setClauses.push('updated_at = ?');
  params.push(now);

  // id vai ao final como parâmetro do WHERE
  params.push(id);

  db.prepare(
    `UPDATE logs_informativos SET ${setClauses.join(', ')} WHERE id_falha = ? AND deleted_at IS NULL`,
  ).run(...params);

  return findById(id);
}

// Soft delete: preenche deleted_at. Retorna true se encontrou e arquivou, false se não existe.
export function softDelete(id) {
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `UPDATE logs_informativos SET deleted_at = ? WHERE id_falha = ? AND deleted_at IS NULL`,
    )
    .run(now, id);
  return result.changes > 0;
}
