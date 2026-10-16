/**
 * Módulo de API para o serviço de Analytics (microserviço Python/FastAPI).
 * Separado do client.js principal pois aponta para uma URL base diferente.
 */

const ANALYTICS_URL = import.meta.env.VITE_ANALYTICS_URL ?? 'http://localhost:8000';

/**
 * Envia uma mensagem ao chat do Gemini e recebe a resposta com (ou sem) gráfico.
 *
 * @param {string} message - Mensagem do usuário
 * @param {Array<{role: string, content: string}>} history - Histórico do chat
 * @returns {Promise<{text: string, chart: object|null, chart_spec: object|null}>}
 */
export async function sendChatMessage(message, history = []) {
  const response = await fetch(`${ANALYTICS_URL}/analytics/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail ?? `Erro ${response.status} ao chamar o serviço de analytics.`);
  }

  return response.json();
}

/**
 * Regenera um gráfico a partir de uma especificação existente.
 *
 * @param {object} spec - Especificação do gráfico (chart_spec retornado pelo chat)
 * @returns {Promise<{data: Array, layout: object}>}
 */
export async function regenerateChart(spec) {
  const response = await fetch(`${ANALYTICS_URL}/analytics/chart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(spec),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail ?? `Erro ${response.status} ao regenerar gráfico.`);
  }

  return response.json();
}

/**
 * Verifica se o serviço de analytics está disponível.
 * @returns {Promise<boolean>}
 */
export async function checkAnalyticsHealth() {
  try {
    const response = await fetch(`${ANALYTICS_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return response.ok;
  } catch {
    return false;
  }
}
