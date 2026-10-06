/**
 * Hook de mutação para arquivar (soft-delete) um alerta via DELETE.
 * Após o sucesso, invalida a lista de alertas para que o alerta desapareça.
 * Conforme seção 7.7 do SPEC (item "Arquivar alerta").
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteAlert } from '../api/alerts.js';

/**
 * @param {string|number} id  ID do alerta a ser arquivado
 * @returns {import('@tanstack/react-query').UseMutationResult}
 */
export function useDeleteAlert(id) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteAlert(id),
    onSuccess: () => {
      // Remove o detalhe do cache
      queryClient.removeQueries({ queryKey: ['alert', String(id)] });
      // Invalida a lista para que o alerta desapareça
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alerts-summary'] });
    },
  });
}
