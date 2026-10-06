/**
 * Hook para buscar o resumo de contagens e áreas (SummaryCards).
 * Usa TanStack Query com polling automático a cada POLL_INTERVAL_MS.
 * Conforme seção 7.6 do SPEC.
 */

import { useQuery } from '@tanstack/react-query';
import { getAlertsSummary } from '../api/alerts.js';
import { POLL_INTERVAL_MS } from './useAlerts.js';

/**
 * @returns {import('@tanstack/react-query').UseQueryResult}
 */
export function useAlertsSummary() {
  return useQuery({
    queryKey: ['alerts-summary'],
    queryFn: getAlertsSummary,
    placeholderData: (prev) => prev,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
}
