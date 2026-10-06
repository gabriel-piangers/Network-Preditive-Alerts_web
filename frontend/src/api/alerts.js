/**
 * Funções de acesso à API de alertas.
 * Todas usam o client.js como base.
 * Conforme seção 6.4 do SPEC.
 */

import { request } from './client.js';

/**
 * Lista alertas com filtros, ordenação e paginação.
 *
 * @param {URLSearchParams|Record<string, string>} params
 * @returns {Promise<{ data: object[], meta: object }>}
 */
export function listAlerts(params) {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  return request(`/api/alerts${qs}`);
}

/**
 * Busca o detalhe de um alerta pelo id.
 *
 * @param {number|string} id
 * @returns {Promise<{ data: object }>}
 */
export function getAlert(id) {
  return request(`/api/alerts/${id}`);
}

/**
 * Atualização parcial de um alerta (PATCH).
 *
 * @param {number|string} id
 * @param {object} payload Subconjunto de campos editáveis
 * @returns {Promise<{ data: object }>}
 */
export function updateAlert(id, payload) {
  return request(`/api/alerts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * Arquiva um alerta (soft delete).
 *
 * @param {number|string} id
 * @returns {Promise<undefined>}
 */
export function deleteAlert(id) {
  return request(`/api/alerts/${id}`, { method: 'DELETE' });
}

/**
 * Busca o resumo de contagens para os SummaryCards.
 *
 * @returns {Promise<{ data: object }>}
 */
export function getAlertsSummary() {
  return request('/api/alerts/summary');
}
