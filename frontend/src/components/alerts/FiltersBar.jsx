import { FALHA_RISCO_LABELS, INCIDENTE_STATUS_LABELS, FALHA_CATEGORIA_LABELS } from '../../constants/alerts.js';
import { DEFAULT_FILTERS, hasCustomFilters } from '../../utils/filters.js';
import './FiltersBar.css';

/**
 * Barra de filtros da lista de incidentes.
 * Filtros ficam na URL — este componente apenas exibe o estado atual e
 * chama onFilterChange para atualizar.
 *
 * @param {{
 *   filters: object,
 *   localizacoes: string[],
 *   onFilterChange: (partial: object) => void,
 * }} props
 */
export default function FiltersBar({ filters, localizacoes = [], onFilterChange }) {
  const hasCustom = hasCustomFilters(filters);

  function toggleMulti(field, value) {
    const current = filters[field] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFilterChange({ [field]: next, page: 1 });
  }

  return (
    <div className="filters-bar" role="search" aria-label="Filtros de incidentes">
      {/* Risco — multisseleção */}
      <fieldset className="filters-bar__group">
        <legend className="filters-bar__label">Risco</legend>
        <div className="filters-bar__options">
          {Object.entries(FALHA_RISCO_LABELS).map(([value, label]) => {
            const checked = (filters.falha_risco ?? []).includes(value);
            const cls = value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
            return (
              <label key={value} className={`filter-chip filter-chip--risk-${cls}${checked ? ' filter-chip--active' : ''}`}>
                <input
                  type="checkbox"
                  className="filter-chip__input"
                  checked={checked}
                  onChange={() => toggleMulti('falha_risco', value)}
                />
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Situação — multisseleção */}
      <fieldset className="filters-bar__group">
        <legend className="filters-bar__label">Situação</legend>
        <div className="filters-bar__options">
          {Object.entries(INCIDENTE_STATUS_LABELS).map(([value, label]) => {
            const checked = (filters.incidente_status ?? []).includes(value);
            return (
              <label key={value} className={`filter-chip${checked ? ' filter-chip--active' : ''}`}>
                <input
                  type="checkbox"
                  className="filter-chip__input"
                  checked={checked}
                  onChange={() => toggleMulti('incidente_status', value)}
                />
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Categoria — multisseleção */}
      <fieldset className="filters-bar__group">
        <legend className="filters-bar__label">Categoria</legend>
        <div className="filters-bar__options">
          {Object.entries(FALHA_CATEGORIA_LABELS).map(([value, label]) => {
            const checked = (filters.falha_categoria ?? []).includes(value);
            return (
              <label key={value} className={`filter-chip${checked ? ' filter-chip--active' : ''}`}>
                <input
                  type="checkbox"
                  className="filter-chip__input"
                  checked={checked}
                  onChange={() => toggleMulti('falha_categoria', value)}
                />
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Localização — seleção única */}
      <div className="filters-bar__group">
        <label className="filters-bar__label" htmlFor="filter-localizacao">
          Localização
        </label>
        <select
          id="filter-localizacao"
          className="filters-bar__select"
          value={filters.falha_localizacao ?? ''}
          onChange={(e) => onFilterChange({ falha_localizacao: e.target.value, page: 1 })}
        >
          <option value="">Todas as localizações</option>
          {localizacoes.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
      </div>

      {/* Limpar filtros */}
      {hasCustom && (
        <div className="filters-bar__group filters-bar__group--clear">
          <button
            type="button"
            className="filters-bar__clear-btn"
            onClick={() =>
              onFilterChange({
                incidente_status: [...DEFAULT_FILTERS.incidente_status],
                falha_risco: [],
                falha_categoria: [],
                falha_localizacao: '',
                page: 1,
              })
            }
          >
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  );
}
