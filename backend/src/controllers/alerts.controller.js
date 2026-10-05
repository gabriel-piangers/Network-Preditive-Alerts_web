// Controllers dos endpoints de alertas.
// Cada função recebe (req, res) e delega a lógica ao repositório.
// Express 5 propaga erros de handlers async automaticamente — sem try/catch manual.

import * as repo from '../repositories/alerts.repository.js';
import { HttpError } from '../utils/httpErrors.js';

// GET /api/alerts
export function listAlerts(req, res) {
  // req.parsed.query contém os filtros já transformados pelo middleware validate
  const result = repo.findAll(req.parsed?.query ?? req.query);
  res.json(result);
}

// GET /api/alerts/summary
export function getAlertsSummary(_req, res) {
  const data = repo.getSummary();
  res.json({ data });
}

// GET /api/alerts/:id
export function getAlert(req, res) {
  const alert = repo.findById(req.params.id);
  if (!alert) throw new HttpError(404, 'NOT_FOUND', 'Alerta não encontrado.');
  res.json({ data: alert });
}

// POST /api/alerts (exige X-API-Key — verificado pelo middleware agentAuth)
export function createAlert(req, res) {
  const alert = repo.create(req.body);
  res.status(201).set('Location', `/api/alerts/${alert.id}`).json({ data: alert });
}

// PATCH /api/alerts/:id
export function updateAlert(req, res) {
  // Corpo vazio não é permitido
  if (Object.keys(req.body).length === 0) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'O corpo da requisição não pode ser vazio.');
  }
  // Campos que não podem ser alterados via PATCH
  const forbidden = ['id', 'created_at', 'updated_at'];
  const found = forbidden.filter((f) => f in req.body);
  if (found.length > 0) {
    const details = found.map((f) => ({ field: f, message: `O campo '${f}' não pode ser alterado.` }));
    throw new HttpError(400, 'VALIDATION_ERROR', 'Dados inválidos.', details);
  }

  const alert = repo.update(req.params.id, req.body);
  if (!alert) throw new HttpError(404, 'NOT_FOUND', 'Alerta não encontrado.');
  res.json({ data: alert });
}

// DELETE /api/alerts/:id (soft delete)
export function deleteAlert(req, res) {
  const deleted = repo.softDelete(req.params.id);
  if (!deleted) throw new HttpError(404, 'NOT_FOUND', 'Alerta não encontrado.');
  res.status(204).end();
}
