// Testes de integração: cobertura dos endpoints de incidentes.
// Usa node:test nativo + supertest. O banco é SQLite em memória (DB_PATH=:memory:).
// Para rodar: npm test (no diretório backend)

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import db from '../src/db/connection.js';

// Corpo mínimo válido para criar um incidente (usado em vários testes)
const validIncidentBody = {
  id_falha: 'INC-TEST-001',
  cliente_id: 'CLI-TEST-001',
  cliente_nome: 'João da Silva',
  falha_categoria: 'Latência elevada',
  falha_localizacao: 'Porto Alegre, RS - Centro',
  falha_risco: 'Alto',
  falha_inicio: '2026-10-10 10:00:00',
  incidente_status: 'Aberto',
  acao_automatizada: false,
  contexto: 'Latência acima do threshold detectada pelo agente.',
  causas: ['Congestionamento no nó de agregação'],
  acoes: ['Executar traceroute para identificar salto lento'],
};

const API_KEY = process.env.AGENT_API_KEY || 'dev-agent-key-change-me';

// Limpa a tabela antes de cada teste para isolamento
function cleanDb() {
  db.prepare('DELETE FROM logs_informativos').run();
}

// Insere um incidente diretamente no banco (helper para testes de leitura)
function insertIncident(overrides = {}) {
  const now = new Date().toISOString();
  const inc = {
    id_falha: 'INC-HELPER-001',
    cliente_id: 'CLI-001',
    cliente_nome: 'Teste',
    cliente_banda: '500 Mbps',
    dispositivo_id: 'DEV-001',
    dispositivo_nome: 'ONU Huawei',
    dispositivo_tipo_conexao: 'Fibra FTTH',
    dispositivo_no_pai: 'OLT-01',
    falha_categoria: 'Perda de pacotes',
    falha_descricao: 'Perda intermitente',
    falha_localizacao: 'Porto Alegre, RS - Centro',
    perda_pacotes_pct: 10.0,
    latencia_ms: 80.0,
    falha_risco: 'Alto',
    falha_inicio: '2026-10-01 08:00:00',
    falha_resolucao: null,
    solucao_aplicada: null,
    incidente_status: 'Aberto',
    acao_automatizada: 'FALSE',
    contexto: 'Contexto de teste.',
    causas: '[]',
    acoes: '[]',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
  db.prepare(`
    INSERT INTO logs_informativos
      (id_falha, cliente_id, cliente_nome, cliente_banda,
       dispositivo_id, dispositivo_nome, dispositivo_tipo_conexao, dispositivo_no_pai,
       falha_categoria, falha_descricao, falha_localizacao,
       perda_pacotes_pct, latencia_ms, falha_risco,
       falha_inicio, falha_resolucao, solucao_aplicada,
       incidente_status, acao_automatizada,
       contexto, causas, acoes, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    inc.id_falha, inc.cliente_id, inc.cliente_nome, inc.cliente_banda,
    inc.dispositivo_id, inc.dispositivo_nome, inc.dispositivo_tipo_conexao, inc.dispositivo_no_pai,
    inc.falha_categoria, inc.falha_descricao, inc.falha_localizacao,
    inc.perda_pacotes_pct, inc.latencia_ms, inc.falha_risco,
    inc.falha_inicio, inc.falha_resolucao, inc.solucao_aplicada,
    inc.incidente_status, inc.acao_automatizada,
    inc.contexto, inc.causas, inc.acoes, inc.created_at, inc.updated_at,
  );
  return inc.id_falha;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/alerts
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/alerts', () => {
  beforeEach(cleanDb);

  it('deve retornar 201 com o incidente criado quando chave e corpo são válidos', async () => {
    const res = await request(app)
      .post('/api/alerts')
      .set('X-API-Key', API_KEY)
      .send(validIncidentBody);

    assert.equal(res.status, 201);
    assert.ok(res.headers.location, 'Location header deve estar presente');
    assert.ok(res.body.data, 'Resposta deve ter data');
    assert.equal(res.body.data.id_falha, 'INC-TEST-001');
    assert.equal(res.body.data.incidente_status, 'Aberto');
    assert.equal(res.body.data.falha_risco, 'Alto');
    // acoes foi enviado como string — deve ser convertido para objeto
    assert.deepEqual(res.body.data.acoes[0], {
      text: 'Executar traceroute para identificar salto lento',
      done: false,
    });
  });

  it('deve retornar 401 sem o header X-API-Key', async () => {
    const res = await request(app).post('/api/alerts').send(validIncidentBody);

    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  it('deve retornar 401 com chave incorreta', async () => {
    const res = await request(app)
      .post('/api/alerts')
      .set('X-API-Key', 'chave-errada')
      .send(validIncidentBody);

    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  it('deve retornar 400 com campo obrigatório ausente (id_falha)', async () => {
    // eslint-disable-next-line no-unused-vars
    const { id_falha, ...bodyWithout } = validIncidentBody;
    const res = await request(app)
      .post('/api/alerts')
      .set('X-API-Key', API_KEY)
      .send(bodyWithout);

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(res.body.error.details), 'Deve ter details');
    const fields = res.body.error.details.map((d) => d.field);
    assert.ok(fields.includes('id_falha'), 'Deve indicar o campo "id_falha" inválido');
  });

  it('deve retornar 400 com falha_categoria inválida', async () => {
    const res = await request(app)
      .post('/api/alerts')
      .set('X-API-Key', API_KEY)
      .send({ ...validIncidentBody, id_falha: 'INC-TEST-002', falha_categoria: 'categoria_invalida' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('deve retornar 400 com falha_risco inválido', async () => {
    const res = await request(app)
      .post('/api/alerts')
      .set('X-API-Key', API_KEY)
      .send({ ...validIncidentBody, id_falha: 'INC-TEST-003', falha_risco: 'banana' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('deve retornar 400 com incidente_status inválido', async () => {
    const res = await request(app)
      .post('/api/alerts')
      .set('X-API-Key', API_KEY)
      .send({ ...validIncidentBody, id_falha: 'INC-TEST-004', incidente_status: 'status_invalido' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('deve retornar 400 com JSON malformado', async () => {
    const res = await request(app)
      .post('/api/alerts')
      .set('X-API-Key', API_KEY)
      .set('Content-Type', 'application/json')
      .send('{campo_invalido: sem aspas}');

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'INVALID_JSON');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/alerts
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/alerts', () => {
  before(() => {
    cleanDb();
    const now = new Date().toISOString();
    // 2 Abertos (Crítico + Médio) + 1 Em Andamento (Alto) + 2 Resolvidos (Médio + Baixo)
    insertIncident({ id_falha: 'INC-A', falha_risco: 'Crítico', incidente_status: 'Aberto', falha_localizacao: 'Porto Alegre, RS - Centro', falha_categoria: 'LOS (Loss of Signal)', created_at: now, updated_at: now });
    insertIncident({ id_falha: 'INC-B', falha_risco: 'Alto',    incidente_status: 'Em Andamento', falha_localizacao: 'Canoas, RS - Centro', falha_categoria: 'Falha de equipamento', created_at: now, updated_at: now });
    insertIncident({ id_falha: 'INC-C', falha_risco: 'Médio',   incidente_status: 'Aberto', falha_localizacao: 'São Leopoldo, RS - Centro', falha_categoria: 'Latência elevada', created_at: now, updated_at: now });
    insertIncident({ id_falha: 'INC-D', falha_risco: 'Médio',   incidente_status: 'Resolvido', falha_localizacao: 'Canoas, RS - Centro', falha_categoria: 'Perda de pacotes', created_at: now, updated_at: now });
    insertIncident({ id_falha: 'INC-E', falha_risco: 'Baixo',   incidente_status: 'Resolvido', falha_localizacao: 'Porto Alegre, RS - Centro', falha_categoria: 'Congestionamento', created_at: now, updated_at: now });
  });

  after(cleanDb);

  it('deve retornar lista com meta de paginação', async () => {
    const res = await request(app).get('/api/alerts');

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data), 'data deve ser array');
    assert.ok(res.body.meta, 'meta deve estar presente');
    assert.ok('total' in res.body.meta, 'meta deve ter total');
    assert.ok('page' in res.body.meta, 'meta deve ter page');
    assert.ok('page_size' in res.body.meta, 'meta deve ter page_size');
    assert.ok('total_pages' in res.body.meta, 'meta deve ter total_pages');
  });

  it('deve filtrar por incidente_status', async () => {
    const res = await request(app).get('/api/alerts?incidente_status=Aberto');

    assert.equal(res.status, 200);
    assert.equal(res.body.meta.total, 2);
    const statuses = res.body.data.map((a) => a.incidente_status);
    assert.ok(statuses.every((s) => s === 'Aberto'), 'Todos devem ser "Aberto"');
  });

  it('deve filtrar por incidente_status múltiplos (CSV)', async () => {
    const res = await request(app).get('/api/alerts?incidente_status=Aberto%2CEm%20Andamento');

    assert.equal(res.status, 200);
    assert.equal(res.body.meta.total, 3);
    const statuses = res.body.data.map((a) => a.incidente_status);
    assert.ok(statuses.every((s) => ['Aberto', 'Em Andamento'].includes(s)));
  });

  it('deve filtrar por falha_risco', async () => {
    const res = await request(app).get('/api/alerts?falha_risco=Cr%C3%ADtico');

    assert.equal(res.status, 200);
    assert.equal(res.body.meta.total, 1);
    assert.equal(res.body.data[0].falha_risco, 'Crítico');
  });

  it('deve filtrar por falha_risco múltiplos (CSV)', async () => {
    const res = await request(app).get('/api/alerts?falha_risco=M%C3%A9dio%2CBaixo');

    assert.equal(res.status, 200);
    assert.equal(res.body.meta.total, 2);
    const riscos = res.body.data.map((a) => a.falha_risco);
    assert.ok(riscos.every((r) => ['Médio', 'Baixo'].includes(r)));
  });

  it('deve filtrar por falha_localizacao (substring)', async () => {
    const res = await request(app).get('/api/alerts?falha_localizacao=Canoas');

    assert.equal(res.status, 200);
    assert.equal(res.body.meta.total, 2);
  });

  it('deve retornar 400 para incidente_status inválido', async () => {
    const res = await request(app).get('/api/alerts?incidente_status=invalido');

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('deve retornar 400 para falha_risco inválido', async () => {
    const res = await request(app).get('/api/alerts?falha_risco=banana');

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('deve respeitar paginação', async () => {
    const res = await request(app).get('/api/alerts?page=1&page_size=2');

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 2);
    assert.equal(res.body.meta.page, 1);
    assert.equal(res.body.meta.page_size, 2);
    assert.equal(res.body.meta.total_pages, 3); // 5 incidentes / 2 por página = 3
  });

  it('deve ter ordenação padrão: risco decrescente', async () => {
    const res = await request(app).get('/api/alerts');

    assert.equal(res.status, 200);
    const riscos = res.body.data.map((a) => a.falha_risco);
    const peso = { 'Crítico': 4, 'Alto': 3, 'Médio': 2, 'Baixo': 1 };
    for (let i = 0; i < riscos.length - 1; i++) {
      assert.ok(
        peso[riscos[i]] >= peso[riscos[i + 1]],
        `Risco[${i}]=${riscos[i]} deve ser >= risco[${i + 1}]=${riscos[i + 1]}`,
      );
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/alerts/summary
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/alerts/summary', () => {
  before(() => {
    cleanDb();
    const now = new Date().toISOString();
    insertIncident({ id_falha: 'INC-S1', falha_risco: 'Crítico', incidente_status: 'Aberto',       falha_localizacao: 'Porto Alegre, RS - Centro', created_at: now, updated_at: now });
    insertIncident({ id_falha: 'INC-S2', falha_risco: 'Médio',   incidente_status: 'Em Andamento', falha_localizacao: 'Canoas, RS - Centro',         created_at: now, updated_at: now });
    insertIncident({ id_falha: 'INC-S3', falha_risco: 'Baixo',   incidente_status: 'Resolvido',    falha_localizacao: 'Porto Alegre, RS - Centro',  created_at: now, updated_at: now });
    insertIncident({ id_falha: 'INC-S4', falha_risco: 'Médio',   incidente_status: 'Resolvido',    falha_localizacao: 'Novo Hamburgo, RS - Centro',  created_at: now, updated_at: now });
  });

  after(cleanDb);

  it('deve retornar total_active contando apenas Aberto + Em Andamento', async () => {
    const res = await request(app).get('/api/alerts/summary');

    assert.equal(res.status, 200);
    const { data } = res.body;
    assert.equal(data.total_active, 2);
    assert.equal(data.abertos, 1);
    assert.equal(data.by_risco['Crítico'], 1);
    assert.equal(data.by_risco['Médio'], 1);
    assert.equal(data.by_risco['Alto'], 0);
    assert.equal(data.by_risco['Baixo'], 0);
  });

  it('deve retornar by_status com todas as chaves e valores corretos', async () => {
    const res = await request(app).get('/api/alerts/summary');

    assert.equal(res.status, 200);
    const { by_status } = res.body.data;
    for (const key of ['Aberto', 'Em Andamento', 'Resolvido']) {
      assert.ok(key in by_status, `by_status deve ter a chave "${key}"`);
    }
    assert.equal(by_status['Aberto'], 1);
    assert.equal(by_status['Em Andamento'], 1);
    assert.equal(by_status['Resolvido'], 2);
  });

  it('deve retornar localizacoes distintas em ordem alfabética', async () => {
    const res = await request(app).get('/api/alerts/summary');

    assert.equal(res.status, 200);
    const { localizacoes } = res.body.data;
    assert.ok(Array.isArray(localizacoes));
    // Localizações inseridas: Porto Alegre (2x), Canoas, Novo Hamburgo → 3 distintas
    assert.equal(localizacoes.length, 3);
    assert.deepEqual([...localizacoes].sort(), localizacoes);
  });

  it('deve retornar categorias distintas', async () => {
    const res = await request(app).get('/api/alerts/summary');

    assert.equal(res.status, 200);
    const { categorias } = res.body.data;
    assert.ok(Array.isArray(categorias));
  });

  it('incidentes arquivados (soft-delete) não devem aparecer no summary', async () => {
    // Insere e arquiva um incidente
    insertIncident({ id_falha: 'INC-ARCH', falha_risco: 'Alto', incidente_status: 'Aberto', falha_localizacao: 'Localização Nova', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    await request(app).delete('/api/alerts/INC-ARCH');

    const res = await request(app).get('/api/alerts/summary');
    assert.equal(res.status, 200);
    const { localizacoes } = res.body.data;
    assert.ok(!localizacoes.includes('Localização Nova'), 'Localização de incidente arquivado não deve aparecer');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/alerts/:id
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/alerts/:id', () => {
  before(() => {
    cleanDb();
    insertIncident({ id_falha: 'INC-DET-001' });
  });

  after(cleanDb);

  it('deve retornar o incidente com 200 quando existe', async () => {
    const res = await request(app).get('/api/alerts/INC-DET-001');

    assert.equal(res.status, 200);
    assert.equal(res.body.data.id_falha, 'INC-DET-001');
    assert.ok('causas' in res.body.data, 'causas deve estar presente');
    assert.ok('acoes' in res.body.data, 'acoes deve estar presente');
    assert.ok('contexto' in res.body.data, 'contexto deve estar presente');
  });

  it('deve retornar 404 para id inexistente', async () => {
    const res = await request(app).get('/api/alerts/INC-INEXISTENTE');

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/alerts/:id
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/alerts/:id', () => {
  beforeEach(() => {
    cleanDb();
    insertIncident({ id_falha: 'INC-PATCH-001' });
  });

  it('deve atualizar incidente_status e retornar 200', async () => {
    const res = await request(app)
      .patch('/api/alerts/INC-PATCH-001')
      .send({ incidente_status: 'Em Andamento' });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.incidente_status, 'Em Andamento');
  });

  it('deve atualizar contexto e causas', async () => {
    const res = await request(app)
      .patch('/api/alerts/INC-PATCH-001')
      .send({ contexto: 'Novo contexto.', causas: ['Causa A', 'Causa B'] });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.contexto, 'Novo contexto.');
    assert.deepEqual(res.body.data.causas, ['Causa A', 'Causa B']);
  });

  it('deve atualizar acoes com toggle de done', async () => {
    const res = await request(app)
      .patch('/api/alerts/INC-PATCH-001')
      .send({ acoes: [{ text: 'Ação 1', done: true }, { text: 'Ação 2', done: false }] });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.acoes[0].done, true);
    assert.equal(res.body.data.acoes[1].done, false);
  });

  it('deve atualizar updated_at ao fazer PATCH', async () => {
    const before = await request(app).get('/api/alerts/INC-PATCH-001');
    const originalUpdatedAt = before.body.data.updated_at;

    await new Promise((resolve) => setTimeout(resolve, 10));

    const res = await request(app)
      .patch('/api/alerts/INC-PATCH-001')
      .send({ incidente_status: 'Resolvido' });

    assert.equal(res.status, 200);
    assert.notEqual(res.body.data.updated_at, originalUpdatedAt);
  });

  it('deve retornar 400 para corpo vazio', async () => {
    const res = await request(app).patch('/api/alerts/INC-PATCH-001').send({});

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('deve retornar 400 para campo proibido "id_falha"', async () => {
    const res = await request(app)
      .patch('/api/alerts/INC-PATCH-001')
      .send({ id_falha: 'INC-OUTRO' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('deve retornar 400 para campo proibido "created_at"', async () => {
    const res = await request(app)
      .patch('/api/alerts/INC-PATCH-001')
      .send({ created_at: '2020-01-01T00:00:00.000Z' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('deve retornar 400 para incidente_status inválido no PATCH', async () => {
    const res = await request(app)
      .patch('/api/alerts/INC-PATCH-001')
      .send({ incidente_status: 'status_invalido' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('deve retornar 404 para id inexistente', async () => {
    const res = await request(app)
      .patch('/api/alerts/INC-INEXISTENTE')
      .send({ incidente_status: 'Resolvido' });

    assert.equal(res.status, 404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/alerts/:id (soft delete)
// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/alerts/:id (soft delete)', () => {
  beforeEach(() => {
    cleanDb();
    insertIncident({ id_falha: 'INC-DEL-001' });
  });

  it('deve retornar 204 e o incidente deve sumir do GET', async () => {
    const del = await request(app).delete('/api/alerts/INC-DEL-001');
    assert.equal(del.status, 204);

    // O incidente não deve aparecer no GET por id
    const getById = await request(app).get('/api/alerts/INC-DEL-001');
    assert.equal(getById.status, 404);

    // O incidente não deve aparecer na listagem
    const list = await request(app).get('/api/alerts');
    assert.equal(list.status, 200);
    const ids = list.body.data.map((a) => a.id_falha);
    assert.ok(!ids.includes('INC-DEL-001'), 'Incidente arquivado não deve aparecer na lista');

    // Mas o registro ainda existe no banco com deleted_at preenchido
    const row = db.prepare('SELECT deleted_at FROM logs_informativos WHERE id_falha = ?').get('INC-DEL-001');
    assert.ok(row, 'Registro deve existir no banco');
    assert.ok(row.deleted_at, 'deleted_at deve estar preenchido (soft delete)');
  });

  it('deve retornar 404 para id inexistente', async () => {
    const res = await request(app).delete('/api/alerts/INC-INEXISTENTE');
    assert.equal(res.status, 404);
  });

  it('deve retornar 404 ao tentar deletar um incidente já arquivado', async () => {
    await request(app).delete('/api/alerts/INC-DEL-001');
    const res = await request(app).delete('/api/alerts/INC-DEL-001');
    assert.equal(res.status, 404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/alerts — filtros adicionais
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/alerts — filtros adicionais', () => {
  before(() => {
    cleanDb();
    const now = new Date().toISOString();
    insertIncident({ id_falha: 'INC-F1', falha_categoria: 'LOS (Loss of Signal)', incidente_status: 'Aberto',    falha_risco: 'Crítico', falha_localizacao: 'Porto Alegre, RS - Centro',   created_at: now, updated_at: now });
    insertIncident({ id_falha: 'INC-F2', falha_categoria: 'Latência elevada',      incidente_status: 'Resolvido', falha_risco: 'Médio',   falha_localizacao: 'Canoas, RS - Centro',         created_at: now, updated_at: now });
    insertIncident({ id_falha: 'INC-F3', falha_categoria: 'Falha de equipamento',  incidente_status: 'Aberto',    falha_risco: 'Alto',    falha_localizacao: 'Porto Alegre, RS - Centro',   created_at: now, updated_at: now });
  });

  after(cleanDb);

  it('deve filtrar por falha_categoria', async () => {
    const res = await request(app).get('/api/alerts?falha_categoria=Lat%C3%AAncia%20elevada');

    assert.equal(res.status, 200);
    assert.equal(res.body.meta.total, 1);
    assert.equal(res.body.data[0].falha_categoria, 'Latência elevada');
  });

  it('deve filtrar por falha_categoria CSV', async () => {
    const res = await request(app).get('/api/alerts?falha_categoria=Lat%C3%AAncia%20elevada%2CFalha%20de%20equipamento');

    assert.equal(res.status, 200);
    assert.equal(res.body.meta.total, 2);
    const cats = res.body.data.map((a) => a.falha_categoria);
    assert.ok(cats.every((c) => ['Latência elevada', 'Falha de equipamento'].includes(c)));
  });

  it('deve retornar 400 para falha_categoria inválida', async () => {
    const res = await request(app).get('/api/alerts?falha_categoria=invalida');

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/health
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/health', () => {
  it('deve retornar 200 com { status: "ok" }', async () => {
    const res = await request(app).get('/api/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Erros não vazam stack trace
// ─────────────────────────────────────────────────────────────────────────────

describe('Erros não vazam stack trace', () => {
  it('rotas inexistentes retornam 404 com formato padronizado', async () => {
    const res = await request(app).get('/api/rota-inexistente');

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
    assert.ok(!res.body.error.stack, 'Stack trace não deve aparecer na resposta');
  });
});
