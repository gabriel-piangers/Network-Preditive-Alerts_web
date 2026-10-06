/**
 * Hook para buscar o detalhe de um alerta pelo id.
 * Usa TanStack Query com polling automático a cada POLL_INTERVAL_MS.
 * O polling é pausado enquanto há uma mutação em andamento (isMutating > 0).
 * Conforme seção 7.7 do SPEC.
 */

import { useQuery, useIsMutating } from '@tanstack/react-query';
import { getAlert } from '../api/alerts.js';
import { POLL_INTERVAL_MS } from './useAlerts.js';

/**
 * @param {string|number} id  ID do alerta
 * @returns {import('@tanstack/react-query').UseQueryResult}
 */
export function useAlert(id) {
  const isMutating = useIsMutating({ mutationKey: ['alert', String(id)] });

  return useQuery({
    queryKey: ['alert', String(id)],
    queryFn: () => getAlert(id),
    // Pausa o polling enquanto uma mutação está em andamento para não
    // sobrescrever atualizações otimistas antes de o servidor responder.
    refetchInterval: isMutating > 0 ? false : POLL_INTERVAL_MS,
    refetchOnWindowFocus: isMutating === 0,
    retry: (failureCount, error) => {
      // Não tentar novamente em 404 (alerta não existe)
      if (error?.status === 404) return false;
      return failureCount < 2;
    },
  });
}
