/**
 * Converte entre o estado interno de filtros, a query string da URL e os
 * parâmetros enviados para a API.
 * Conforme seção 7.6 do SPEC.
 *
 * Nota: o backend usa os nomes `sort`, `order` e `page_size` (não sort_by/sort_dir/limit).
 * O estado interno e a URL usam `sort_by`/`sort_dir`/`limit` — a conversão acontece
 * apenas em filtersToApiParams, ao chamar a API.
 */

import { ACTIVE_STATUSES } from '../constants/alerts.js';

/** Filtros padrão ao abrir a página (apenas alertas ativos). */
export const DEFAULT_FILTERS = {
  status: [...ACTIVE_STATUSES],
  risk: [],
  type: [],
  area: '',
  min_accuracy: 50,
  sort_by: 'risk',
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
  const status = params.getAll('status');
  const risk = params.getAll('risk');
  const type = params.getAll('type');
  const area = params.get('area') || '';
  const minAccuracy = params.get('min_accuracy');
  const sortBy = params.get('sort_by') || DEFAULT_FILTERS.sort_by;
  const sortDir = params.get('sort_dir') || DEFAULT_FILTERS.sort_dir;
  const page = parseInt(params.get('page') || '1', 10);

  return {
    status: status.length > 0 ? status : [...ACTIVE_STATUSES],
    risk: risk.length > 0 ? risk : [],
    type: type.length > 0 ? type : [],
    area,
    min_accuracy: minAccuracy !== null ? parseInt(minAccuracy, 10) : DEFAULT_FILTERS.min_accuracy,
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

  (filters.status || []).forEach((s) => params.append('status', s));
  (filters.risk || []).forEach((r) => params.append('risk', r));
  (filters.type || []).forEach((t) => params.append('type', t));

  if (filters.area) params.set('area', filters.area);
  if (filters.min_accuracy !== DEFAULT_FILTERS.min_accuracy) {
    params.set('min_accuracy', String(filters.min_accuracy));
  }
  if (filters.sort_by !== DEFAULT_FILTERS.sort_by) params.set('sort_by', filters.sort_by);
  if (filters.sort_dir !== DEFAULT_FILTERS.sort_dir) params.set('sort_dir', filters.sort_dir);
  if (filters.page > 1) params.set('page', String(filters.page));

  return params;
}

/**
 * Converte os filtros para os parâmetros que a API espera.
 * O backend usa CSV para arrays (status=new,in_analysis) e os nomes
 * `sort`, `order` e `page_size`.
 *
 * @param {object} filters
 * @param {number} [pageSize=20]
 * @returns {URLSearchParams}
 */
export function filtersToApiParams(filters, pageSize = 20) {
  const params = new URLSearchParams();

  // Arrays são enviados como CSV (formato que o backend aceita)
  const status = filters.status || [];
  const risk = filters.risk || [];
  const type = filters.type || [];

  if (status.length > 0) params.set('status', status.join(','));
  if (risk.length > 0) params.set('risk', risk.join(','));
  if (type.length > 0) params.set('type', type.join(','));

  if (filters.area) params.set('area', filters.area);
  if (filters.min_accuracy != null) {
    params.set('min_accuracy', String(filters.min_accuracy));
  }

  // O backend usa `sort` e `order` (não sort_by/sort_dir)
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
  const currentStatus = [...(filters.status || [])].sort().join(',');
  return (
    currentStatus !== defaultStatus ||
    (filters.risk || []).length > 0 ||
    (filters.type || []).length > 0 ||
    !!filters.area ||
    filters.min_accuracy !== DEFAULT_FILTERS.min_accuracy
  );
}
