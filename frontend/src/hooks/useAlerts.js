/**
 * Hook para listar alertas com filtros, ordenação e paginação.
 * Usa TanStack Query com polling automático a cada POLL_INTERVAL_MS.
 * Conforme seção 7.6 do SPEC.
 */

import { useQuery } from '@tanstack/react-query';
import { listAlerts } from '../api/alerts.js';
import { filtersToApiParams } from '../utils/filters.js';

/** Intervalo de polling em milissegundos (15 segundos, configurável). */
export const POLL_INTERVAL_MS = 15_000;

/**
 * @param {object} filters  Estado de filtros (veja utils/filters.js)
 * @returns {import('@tanstack/react-query').UseQueryResult}
 */
export function useAlerts(filters) {
  const params = filtersToApiParams(filters);

  return useQuery({
    queryKey: ['alerts', params.toString()],
    queryFn: () => listAlerts(params),
    // Mantém os dados anteriores enquanto recarrega (sem piscar o loading)
    placeholderData: (prev) => prev,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
}
