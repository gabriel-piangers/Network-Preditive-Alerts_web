// Rotas do recurso alerts. Registra os handlers de cada endpoint.
// ATENÇÃO: /summary deve ser registrado ANTES de /:id (Express faz match por ordem).

import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { agentAuth } from '../middleware/agentAuth.js';
import {
  createAlertSchema,
  updateAlertSchema,
  listQuerySchema,
  idParamSchema,
} from '../validation/alerts.schemas.js';
import {
  listAlerts,
  getAlertsSummary,
  getAlert,
  createAlert,
  updateAlert,
  deleteAlert,
} from '../controllers/alerts.controller.js';

const router = Router();

// GET /api/alerts — lista com filtros, ordenação e paginação
router.get('/', validate(listQuerySchema, 'query'), listAlerts);

// GET /api/alerts/summary — contagens para a visão geral (antes de /:id!)
router.get('/summary', getAlertsSummary);

// GET /api/alerts/:id — detalhe de um alerta
router.get('/:id', validate(idParamSchema, 'params'), getAlert);

// POST /api/alerts — criação (exige X-API-Key)
router.post('/', agentAuth, validate(createAlertSchema, 'body'), createAlert);

// PATCH /api/alerts/:id — atualização parcial
router.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateAlertSchema, 'body'),
  updateAlert,
);

// DELETE /api/alerts/:id — soft delete
router.delete('/:id', validate(idParamSchema, 'params'), deleteAlert);

export default router;
