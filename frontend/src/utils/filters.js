/**
 * Converte entre o estado interno de filtros, a query string da URL e os
 * parâmetros enviados para a API.
 *
 * Nota: os nomes de filtro da API são os mesmos do banco (incidente_status,
 * falha_risco, falha_categoria, falha_localizacao).
 */

import { ACTIVE_STATUSES } from '../constants/alerts.js';

/** Filtros padrão ao abrir a página (apenas incidentes ativos). */
export const DEFAULT_FILTERS = {
  incidente_status: [...ACTIVE_STATUSES],
  falha_risco: [],
  falha_categoria: [],
  falha_localizacao: '',
  sort_by: 'falha_risco',
  sort_dir: 'desc',
  page: 1,
};

/**
 * Lê os filtros atuais da URL (URLSearchParams → objeto de filtros).
 *
 * @param {URLSearchParams} params
 * @returns {object}
 */
export function filtersFromSearch(params) {
  const incidente_status = params.getAll('incidente_status');
  const falha_risco = params.getAll('falha_risco');
  const falha_categoria = params.getAll('falha_categoria');
  const falha_localizacao = params.get('falha_localizacao') || '';
  const sortBy = params.get('sort_by') || DEFAULT_FILTERS.sort_by;
  const sortDir = params.get('sort_dir') || DEFAULT_FILTERS.sort_dir;
  const page = parseInt(params.get('page') || '1', 10);

  return {
    incidente_status: incidente_status.length > 0 ? incidente_status : [...ACTIVE_STATUSES],
    falha_risco: falha_risco.length > 0 ? falha_risco : [],
    falha_categoria: falha_categoria.length > 0 ? falha_categoria : [],
    falha_localizacao,
    sort_by: sortBy,
    sort_dir: sortDir,
    page: isNaN(page) || page < 1 ? 1 : page,
  };
}

/**
 * Converte o estado de filtros para URLSearchParams (para a URL).
 *
 * @param {object} filters
 * @returns {URLSearchParams}
 */
export function filtersToSearch(filters) {
  const params = new URLSearchParams();

  (filters.incidente_status || []).forEach((s) => params.append('incidente_status', s));
  (filters.falha_risco || []).forEach((r) => params.append('falha_risco', r));
  (filters.falha_categoria || []).forEach((c) => params.append('falha_categoria', c));

  if (filters.falha_localizacao) params.set('falha_localizacao', filters.falha_localizacao);
  if (filters.sort_by !== DEFAULT_FILTERS.sort_by) params.set('sort_by', filters.sort_by);
  if (filters.sort_dir !== DEFAULT_FILTERS.sort_dir) params.set('sort_dir', filters.sort_dir);
  if (filters.page > 1) params.set('page', String(filters.page));

  return params;
}

/**
 * Converte os filtros para os parâmetros que a API espera.
 * Arrays são enviados como CSV (formato que o backend aceita).
 *
 * @param {object} filters
 * @param {number} [pageSize=20]
 * @returns {URLSearchParams}
 */
export function filtersToApiParams(filters, pageSize = 20) {
  const params = new URLSearchParams();

  const incidente_status = filters.incidente_status || [];
  const falha_risco = filters.falha_risco || [];
  const falha_categoria = filters.falha_categoria || [];

  if (incidente_status.length > 0) params.set('incidente_status', incidente_status.join(','));
  if (falha_risco.length > 0) params.set('falha_risco', falha_risco.join(','));
  if (falha_categoria.length > 0) params.set('falha_categoria', falha_categoria.join(','));

  if (filters.falha_localizacao) params.set('falha_localizacao', filters.falha_localizacao);

  params.set('sort', filters.sort_by || DEFAULT_FILTERS.sort_by);
  params.set('order', filters.sort_dir || DEFAULT_FILTERS.sort_dir);
  params.set('page', String(filters.page || 1));
  params.set('page_size', String(pageSize));

  return params;
}

/**
 * Verifica se os filtros ativos diferem dos padrão (exceto sort/page).
 *
 * @param {object} filters
 * @returns {boolean}
 */
export function hasCustomFilters(filters) {
  const defaultStatus = [...ACTIVE_STATUSES].sort().join(',');
  const currentStatus = [...(filters.incidente_status || [])].sort().join(',');
  return (
    currentStatus !== defaultStatus ||
    (filters.falha_risco || []).length > 0 ||
    (filters.falha_categoria || []).length > 0 ||
    !!filters.falha_localizacao
  );
}
