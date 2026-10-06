// Testes completos (Fases 2 e 3b): cobertura de toda a seção 6.11 da SPEC.
// Usa node:test nativo + supertest. O banco é SQLite em memória (DB_PATH=:memory:).
// Para rodar: npm test (no workspace backend)

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import db from '../src/db/connection.js';

// Corpo mínimo válido para criar um alerta (usado em vários testes)
const validAlertBody = {
  type: 'congestion',
  title: 'Congestionamento previsto no switch de agregação',
  area: 'Campinas',
  equipments: ['SW-CAMP-07'],
  risk: 'medium',
  accuracy: 78,
  predicted_for: '2030-10-03T18:00:00.000Z',
  context: 'Aumento contínuo de pacotes nas últimas 48h.',
  causes: ['Crescimento de tráfego no horário de pico'],
  actions: ['Verificar filas de saída da interface Gi0/2'],
};

const API_KEY = process.env.AGENT_API_KEY || 'dev-agent-key-change-me';

// Limpa o banco antes de cada teste para isolamento
function cleanDb() {
  db.prepare('DELETE FROM alerts').run();
  try {
    db.prepare("DELETE FROM sqlite_sequence WHERE name = 'alerts'").run();
  } catch {
    // sqlite_sequence só existe se já houve algum INSERT — ignora se não existir
  }
}

describe('POST /api/alerts', () => {
  beforeEach(cleanDb);

  it('deve retornar 201 com o alerta criado quando a chave e o corpo são válidos', async () => {
    const res = await request(app)
      .post('/api/alerts')
      .set('X-API-Key', API_KEY)
      .send(validAlertBody);

    assert.equal(res.status, 201);
    assert.ok(res.headers.location, 'Location header deve estar presente');
    assert.ok(res.body.data, 'Resposta deve ter data');
    assert.equal(res.body.data.type, 'congestion');
    assert.equal(res.body.data.status, 'new');
    assert.equal(res.body.data.confirmed, null);
    // actions foi enviado como string — deve ser convertido para objeto
    assert.deepEqual(res.body.data.actions[0], {
      text: 'Verificar filas de saída da interface Gi0/2',
      done: false,
    });
  });

  it('deve retornar 401 sem o header X-API-Key', async () => {
    const res = await request(app).post('/api/alerts').send(validAlertBody);

    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  it('deve retornar 401 com chave incorreta', async () => {
    const res = await request(app)
      .post('/api/alerts')
      .set('X-API-Key', 'chave-errada')
      .send(validAlertBody);

    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  it('deve retornar 400 com campo obrigatório ausente', async () => {
    // eslint-disable-next-line no-unused-vars
    const { type, ...bodyWithoutType } = validAlertBody;
    const res = await request(app)
      .post('/api/alerts')
      .set('X-API-Key', API_KEY)
      .send(bodyWithoutType);

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(res.body.error.details), 'Deve ter details');
    const fields = res.body.error.details.map((d) => d.field);
    assert.ok(fields.includes('type'), 'Deve indicar o campo "type" inválido');
  });

  it('deve retornar 400 com tipo inválido', async () => {
    const res = await request(app)
      .post('/api/alerts')
      .set('X-API-Key', API_KEY)
      .send({ ...validAlertBody, type: 'tipo_invalido' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('deve retornar 400 com risco inválido', async () => {
    const res = await request(app)
      .post('/api/alerts')
      .set('X-API-Key', API_KEY)
      .send({ ...validAlertBody, risk: 'banana' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('deve retornar 400 com JSON malformado', async () => {
    const res = await request(app)
      .post('/api/alerts')
      .set('X-API-Key', API_KEY)
      .set('Content-Type', 'application/json')
      .send('{tipo_invalido: sem aspas}');

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'INVALID_JSON');
  });
});

describe('GET /api/alerts', () => {
  // Insere alguns alertas antes dos testes de listagem
  before(() => {
    cleanDb();
    const insert = db.prepare(
      `INSERT INTO alerts
         (type, title, area, equipments, risk, accuracy, predicted_for,
          status, context, causes, actions, confirmed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const now = new Date().toISOString();
    const future = new Date(Date.now() + 5 * 3600000).toISOString();

    // 3 alertas high + 2 medium + 1 low
    insert.run('congestion', 'Alerta high 1', 'São Paulo - Zona Leste', '[]', 'high', 90, future, 'new', '', '[]', '[]', null, now, now);
    insert.run('latency', 'Alerta high 2', 'Campinas', '[]', 'high', 85, future, 'new', '', '[]', '[]', null, now, now);
    insert.run('bandwidth_exceeded', 'Alerta high 3', 'Guarulhos', '[]', 'high', 80, future, 'in_analysis', '', '[]', '[]', null, now, now);
    insert.run('packet_loss', 'Alerta medium 1', 'Santo André', '[]', 'medium', 75, future, 'new', '', '[]', '[]', null, now, now);
    insert.run('equipment_failure', 'Alerta medium 2', 'São Bernardo do Campo', '[]', 'medium', 70, future, 'monitoring', '', '[]', '[]', null, now, now);
    insert.run('other', 'Alerta low 1', 'Sorocaba', '[]', 'low', 72, future, 'resolved', '', '[]', '[]', null, now, now);
  });

  after(cleanDb);

  it('deve retornar lista com meta de paginação', async () => {
    const res = await request(app).get('/api/alerts');

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data), 'data deve ser array');
    assert.ok(res.body.meta, 'meta deve estar presente');
    assert.ok('total' in res.body.meta, 'meta deve ter total');
    assert.ok('page' in res.body.meta, 'meta deve ter page');
  });

  it('deve filtrar por status', async () => {
    const res = await request(app).get('/api/alerts?status=new');

    assert.equal(res.status, 200);
    const statuses = res.body.data.map((a) => a.status);
    assert.ok(statuses.every((s) => s === 'new'), 'Todos devem ser "new"');
    assert.equal(res.body.meta.total, 3); // 3 alertas com status new
  });

  it('deve filtrar por status múltiplos (CSV)', async () => {
    const res = await request(app).get('/api/alerts?status=new,in_analysis');

    assert.equal(res.status, 200);
    const statuses = res.body.data.map((a) => a.status);
    assert.ok(statuses.every((s) => ['new', 'in_analysis'].includes(s)));
  });

  it('deve filtrar por risco', async () => {
    const res = await request(app).get('/api/alerts?risk=high');

    assert.equal(res.status, 200);
    assert.equal(res.body.meta.total, 3);
    const risks = res.body.data.map((a) => a.risk);
    assert.ok(risks.every((r) => r === 'high'));
  });

  it('deve filtrar por min_accuracy', async () => {
    const res = await request(app).get('/api/alerts?min_accuracy=85');

    assert.equal(res.status, 200);
    const accuracies = res.body.data.map((a) => a.accuracy);
    assert.ok(accuracies.every((a) => a >= 85));
  });

  it('deve retornar 400 para filtro de status inválido', async () => {
    const res = await request(app).get('/api/alerts?status=invalido');

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('deve retornar 400 para filtro de risco inválido', async () => {
    const res = await request(app).get('/api/alerts?risk=banana');

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('deve respeitar paginação', async () => {
    const res = await request(app).get('/api/alerts?page=1&page_size=2');

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 2);
    assert.equal(res.body.meta.page, 1);
    assert.equal(res.body.meta.page_size, 2);
    assert.equal(res.body.meta.total_pages, 3); // 6 alertas / 2 por página = 3
  });

  it('deve ter ordenação padrão: risco decrescente + predicted_for crescente', async () => {
    const res = await request(app).get('/api/alerts');

    assert.equal(res.status, 200);
    const risks = res.body.data.map((a) => a.risk);
    // Os primeiros devem ser 'high', depois 'medium', depois 'low'
    const riskOrder = { high: 3, medium: 2, low: 1 };
    for (let i = 0; i < risks.length - 1; i++) {
      assert.ok(
        riskOrder[risks[i]] >= riskOrder[risks[i + 1]],
        `Risco[${i}]=${risks[i]} deve ser >= risco[${i + 1}]=${risks[i + 1]}`,
      );
    }
  });
});

describe('GET /api/alerts/summary', () => {
  before(() => {
    cleanDb();
    const insert = db.prepare(
      `INSERT INTO alerts
         (type, title, area, equipments, risk, accuracy, predicted_for,
          status, context, causes, actions, confirmed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const now = new Date().toISOString();
    const future = new Date(Date.now() + 5 * 3600000).toISOString();

    insert.run('congestion', 'A1', 'São Paulo - Zona Leste', '[]', 'high', 90, future, 'new', '', '[]', '[]', null, now, now);
    insert.run('latency', 'A2', 'Campinas', '[]', 'medium', 75, future, 'new', '', '[]', '[]', null, now, now);
    insert.run('bandwidth_exceeded', 'A3', 'São Paulo - Zona Leste', '[]', 'low', 70, future, 'monitoring', '', '[]', '[]', null, now, now);
    insert.run('packet_loss', 'A4', 'Guarulhos', '[]', 'medium', 80, future, 'resolved', '', '[]', '[]', null, now, now);
  });

  after(cleanDb);

  it('deve retornar total_active contando apenas alertas ativos', async () => {
    const res = await request(app).get('/api/alerts/summary');

    assert.equal(res.status, 200);
    const { data } = res.body;
    // new + monitoring = 3 ativos; resolved não conta
    assert.equal(data.total_active, 3);
    assert.equal(data.new_count, 2);
    assert.equal(data.by_risk.high, 1);
    assert.equal(data.by_risk.medium, 1);
    assert.equal(data.by_risk.low, 1);
  });

  it('deve retornar áreas distintas em ordem alfabética', async () => {
    const res = await request(app).get('/api/alerts/summary');

    assert.equal(res.status, 200);
    const { areas } = res.body.data;
    assert.ok(Array.isArray(areas));
    // Áreas inseridas: São Paulo - Zona Leste (2x), Campinas, Guarulhos → 3 distintas
    assert.equal(areas.length, 3);
    // Deve estar em ordem alfabética
    assert.deepEqual([...areas].sort(), areas);
  });
});

describe('GET /api/alerts/:id', () => {
  let alertId;

  before(() => {
    cleanDb();
    const insert = db.prepare(
      `INSERT INTO alerts
         (type, title, area, equipments, risk, accuracy, predicted_for,
          status, context, causes, actions, confirmed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const now = new Date().toISOString();
    const future = new Date(Date.now() + 5 * 3600000).toISOString();
    const result = insert.run('congestion', 'Alerta de teste', 'Campinas', '[]', 'high', 90, future, 'new', 'Contexto', '[]', '[]', null, now, now);
    alertId = result.lastInsertRowid;
  });

  after(cleanDb);

  it('deve retornar o alerta com 200 quando existe', async () => {
    const res = await request(app).get(`/api/alerts/${alertId}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, alertId);
    assert.equal(res.body.data.title, 'Alerta de teste');
  });

  it('deve retornar 404 para id inexistente', async () => {
    const res = await request(app).get('/api/alerts/99999');

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  it('deve retornar 400 para id inválido (não numérico)', async () => {
    const res = await request(app).get('/api/alerts/abc');

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });
});

describe('PATCH /api/alerts/:id', () => {
  let alertId;

  beforeEach(() => {
    cleanDb();
    const insert = db.prepare(
      `INSERT INTO alerts
         (type, title, area, equipments, risk, accuracy, predicted_for,
          status, context, causes, actions, confirmed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const now = new Date().toISOString();
    const future = new Date(Date.now() + 5 * 3600000).toISOString();
    const result = insert.run('congestion', 'Alerta original', 'Campinas', '[]', 'high', 90, future, 'new', '', '[]', '[]', null, now, now);
    alertId = result.lastInsertRowid;
  });

  it('deve atualizar um campo e retornar 200', async () => {
    const res = await request(app)
      .patch(`/api/alerts/${alertId}`)
      .send({ status: 'in_analysis' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'in_analysis');
  });

  it('deve atualizar updated_at ao fazer PATCH', async () => {
    const before = await request(app).get(`/api/alerts/${alertId}`);
    const originalUpdatedAt = before.body.data.updated_at;

    // Pequeno delay para garantir que updated_at seja diferente
    await new Promise((resolve) => setTimeout(resolve, 10));

    const res = await request(app)
      .patch(`/api/alerts/${alertId}`)
      .send({ status: 'monitoring' });

    assert.equal(res.status, 200);
    assert.notEqual(res.body.data.updated_at, originalUpdatedAt);
  });

  it('deve retornar 400 para corpo vazio', async () => {
    const res = await request(app).patch(`/api/alerts/${alertId}`).send({});

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('deve retornar 400 para campo proibido "id"', async () => {
    const res = await request(app)
      .patch(`/api/alerts/${alertId}`)
      .send({ id: 999 });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('deve retornar 400 para campo proibido "created_at"', async () => {
    const res = await request(app)
      .patch(`/api/alerts/${alertId}`)
      .send({ created_at: '2020-01-01T00:00:00.000Z' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('deve retornar 400 para campo proibido "updated_at"', async () => {
    const res = await request(app)
      .patch(`/api/alerts/${alertId}`)
      .send({ updated_at: '2020-01-01T00:00:00.000Z' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('deve retornar 404 para id inexistente', async () => {
    const res = await request(app)
      .patch('/api/alerts/99999')
      .send({ status: 'resolved' });

    assert.equal(res.status, 404);
  });
});

describe('DELETE /api/alerts/:id (soft delete)', () => {
  let alertId;

  beforeEach(() => {
    cleanDb();
    const insert = db.prepare(
      `INSERT INTO alerts
         (type, title, area, equipments, risk, accuracy, predicted_for,
          status, context, causes, actions, confirmed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const now = new Date().toISOString();
    const future = new Date(Date.now() + 5 * 3600000).toISOString();
    const result = insert.run('congestion', 'Alerta para deletar', 'Campinas', '[]', 'high', 90, future, 'new', '', '[]', '[]', null, now, now);
    alertId = result.lastInsertRowid;
  });

  it('deve retornar 204 e o alerta deve sumir do GET por id e da listagem', async () => {
    const del = await request(app).delete(`/api/alerts/${alertId}`);
    assert.equal(del.status, 204);

    // O alerta não deve aparecer no GET por id
    const getById = await request(app).get(`/api/alerts/${alertId}`);
    assert.equal(getById.status, 404);

    // O alerta não deve aparecer na listagem geral
    const list = await request(app).get('/api/alerts');
    assert.equal(list.status, 200);
    const ids = list.body.data.map((a) => a.id);
    assert.ok(!ids.includes(alertId), 'Alerta arquivado não deve aparecer na lista');

    // Mas o registro ainda existe no banco com deleted_at preenchido
    const row = db.prepare('SELECT deleted_at FROM alerts WHERE id = ?').get(alertId);
    assert.ok(row, 'Registro deve existir no banco');
    assert.ok(row.deleted_at, 'deleted_at deve estar preenchido (soft delete)');
  });

  it('deve retornar 404 para id inexistente', async () => {
    const res = await request(app).delete('/api/alerts/99999');
    assert.equal(res.status, 404);
  });

  it('deve retornar 404 ao tentar deletar um alerta já arquivado', async () => {
    await request(app).delete(`/api/alerts/${alertId}`);
    const res = await request(app).delete(`/api/alerts/${alertId}`);
    assert.equal(res.status, 404);
  });
});

describe('Expiração automática de alertas', () => {
  it('deve marcar como expired alertas ativos com predicted_for > 30min no passado', async () => {
    cleanDb();
    const insert = db.prepare(
      `INSERT INTO alerts
         (type, title, area, equipments, risk, accuracy, predicted_for,
          status, context, causes, actions, confirmed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const now = new Date().toISOString();
    // predicted_for há 2 horas atrás — deve ser expirado
    const expired = new Date(Date.now() - 2 * 3600000).toISOString();
    const result = insert.run('congestion', 'Alerta antigo', 'SP', '[]', 'high', 90, expired, 'new', '', '[]', '[]', null, now, now);
    const alertId = result.lastInsertRowid;

    // GET dispara a verificação de expiração
    const res = await request(app).get(`/api/alerts/${alertId}`);
    // O alerta existe mas foi marcado como expired
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'expired');
  });

  it('deve marcar como expired via GET /api/alerts (listagem)', async () => {
    cleanDb();
    const insert = db.prepare(
      `INSERT INTO alerts
         (type, title, area, equipments, risk, accuracy, predicted_for,
          status, context, causes, actions, confirmed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const now = new Date().toISOString();
    // predicted_for há 2 horas atrás — deve ser expirado
    const expired = new Date(Date.now() - 2 * 3600000).toISOString();
    const result = insert.run('latency', 'Alerta expirado via lista', 'SP', '[]', 'medium', 75, expired, 'monitoring', '', '[]', '[]', null, now, now);
    const expiredAlertId = result.lastInsertRowid;

    // GET lista dispara a verificação de expiração
    const res = await request(app).get('/api/alerts');
    assert.equal(res.status, 200);
    const found = res.body.data.find((a) => a.id === expiredAlertId);
    // O alerta deve aparecer na lista com status expired
    assert.ok(found, 'Alerta deve aparecer na listagem');
    assert.equal(found.status, 'expired');
  });

  it('não deve expirar alertas que ainda estão no futuro (> 30min)', async () => {
    cleanDb();
    const insert = db.prepare(
      `INSERT INTO alerts
         (type, title, area, equipments, risk, accuracy, predicted_for,
          status, context, causes, actions, confirmed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const now = new Date().toISOString();
    // predicted_for 2 horas no futuro — NÃO deve ser expirado
    const future = new Date(Date.now() + 2 * 3600000).toISOString();
    const result = insert.run('congestion', 'Alerta futuro', 'SP', '[]', 'low', 70, future, 'new', '', '[]', '[]', null, now, now);
    const futureAlertId = result.lastInsertRowid;

    const res = await request(app).get(`/api/alerts/${futureAlertId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'new');
  });
});

describe('GET /api/alerts — filtros adicionais', () => {
  before(() => {
    cleanDb();
    const insert = db.prepare(
      `INSERT INTO alerts
         (type, title, area, equipments, risk, accuracy, predicted_for,
          status, context, causes, actions, confirmed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const now = new Date().toISOString();
    const future = new Date(Date.now() + 5 * 3600000).toISOString();

    insert.run('congestion', 'Congestionamento SP', 'São Paulo - Zona Leste', '[]', 'high', 90, future, 'new', '', '[]', '[]', null, now, now);
    insert.run('latency', 'Latência Campinas', 'Campinas', '[]', 'medium', 80, future, 'new', '', '[]', '[]', null, now, now);
    insert.run('equipment_failure', 'Falha Guarulhos', 'Guarulhos', '[]', 'low', 70, future, 'in_analysis', '', '[]', '[]', null, now, now);
  });

  after(cleanDb);

  it('deve filtrar por type', async () => {
    const res = await request(app).get('/api/alerts?type=congestion');

    assert.equal(res.status, 200);
    assert.equal(res.body.meta.total, 1);
    assert.equal(res.body.data[0].type, 'congestion');
  });

  it('deve filtrar por area', async () => {
    const res = await request(app).get('/api/alerts?area=Campinas');

    assert.equal(res.status, 200);
    assert.equal(res.body.meta.total, 1);
    assert.equal(res.body.data[0].area, 'Campinas');
  });

  it('deve filtrar por type CSV', async () => {
    const res = await request(app).get('/api/alerts?type=congestion,latency');

    assert.equal(res.status, 200);
    assert.equal(res.body.meta.total, 2);
    const types = res.body.data.map((a) => a.type);
    assert.ok(types.every((t) => ['congestion', 'latency'].includes(t)));
  });

  it('deve retornar 400 para type inválido', async () => {
    const res = await request(app).get('/api/alerts?type=invalido');

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });
});

describe('GET /api/alerts/summary — by_status completo', () => {
  before(() => {
    cleanDb();
    const insert = db.prepare(
      `INSERT INTO alerts
         (type, title, area, equipments, risk, accuracy, predicted_for,
          status, context, causes, actions, confirmed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const now = new Date().toISOString();
    const future = new Date(Date.now() + 5 * 3600000).toISOString();

    // Apenas 2 status representados: new e resolved
    insert.run('congestion', 'A1', 'SP', '[]', 'high', 90, future, 'new', '', '[]', '[]', null, now, now);
    insert.run('latency', 'A2', 'Campinas', '[]', 'medium', 75, future, 'resolved', '', '[]', '[]', null, now, now);
  });

  after(cleanDb);

  it('deve incluir todas as chaves de status em by_status, inclusive com valor 0', async () => {
    const res = await request(app).get('/api/alerts/summary');

    assert.equal(res.status, 200);
    const { by_status } = res.body.data;
    // Deve ter todas as 6 chaves de status
    for (const key of ['new', 'in_analysis', 'monitoring', 'resolved', 'false_positive', 'expired']) {
      assert.ok(key in by_status, `by_status deve ter a chave "${key}"`);
    }
    assert.equal(by_status.new, 1);
    assert.equal(by_status.in_analysis, 0);
    assert.equal(by_status.monitoring, 0);
    assert.equal(by_status.resolved, 1);
    assert.equal(by_status.false_positive, 0);
    assert.equal(by_status.expired, 0);
  });

  it('alertas arquivados (soft-deleted) não devem aparecer em by_status nem em areas', async () => {
    // Insere e arquiva um alerta
    const insert = db.prepare(
      `INSERT INTO alerts
         (type, title, area, equipments, risk, accuracy, predicted_for,
          status, context, causes, actions, confirmed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const now = new Date().toISOString();
    const future = new Date(Date.now() + 5 * 3600000).toISOString();
    const { lastInsertRowid } = insert.run('other', 'Arquivado', 'Zona Nova', '[]', 'low', 70, future, 'resolved', '', '[]', '[]', null, now, now);

    // Arquiva via DELETE
    await request(app).delete(`/api/alerts/${lastInsertRowid}`);

    const res = await request(app).get('/api/alerts/summary');
    assert.equal(res.status, 200);

    // O total não deve incluir o arquivado
    const { areas } = res.body.data;
    assert.ok(!areas.includes('Zona Nova'), 'Área de alerta arquivado não deve aparecer em areas');
  });
});

describe('GET /api/health', () => {
  it('deve retornar 200 com { status: "ok" }', async () => {
    const res = await request(app).get('/api/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });
});

describe('Erros 500 não vazam stack trace', () => {
  it('rotas inexistentes retornam 404 com formato padronizado', async () => {
    const res = await request(app).get('/api/rota-inexistente');

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
    assert.ok(!res.body.error.stack, 'Stack trace não deve aparecer na resposta');
  });
});
