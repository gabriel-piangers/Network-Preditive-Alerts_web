/**
 * Hook de mutação para atualizar um alerta via PATCH.
 * Usado pela página de detalhe para status, checklist e feedback de previsão.
 * Suporta atualização otimista para o checklist de ações.
 * Conforme seção 7.7 do SPEC.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateAlert } from '../api/alerts.js';

/**
 * @param {string|number} id  ID do alerta a ser atualizado
 * @returns {import('@tanstack/react-query').UseMutationResult}
 */
export function useUpdateAlert(id) {
  const queryClient = useQueryClient();
  const queryKey = ['alert', String(id)];

  return useMutation({
    mutationKey: ['alert', String(id)],
    mutationFn: (payload) => updateAlert(id, payload),

    // Atualização otimista: aplica o payload na cache antes da requisição
    onMutate: async (payload) => {
      // Cancela refetches em andamento para evitar sobrescrever o otimismo
      await queryClient.cancelQueries({ queryKey });

      // Salva o snapshot anterior para rollback
      const previous = queryClient.getQueryData(queryKey);

      // Aplica a atualização otimista
      queryClient.setQueryData(queryKey, (old) => {
        if (!old?.data) return old;
        return { ...old, data: { ...old.data, ...payload } };
      });

      return { previous };
    },

    // Em erro: reverte para o snapshot anterior
    onError: (_err, _payload, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },

    // Após sucesso ou erro: sincroniza com o servidor
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
