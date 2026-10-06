import { ALERT_RISK_LABELS, ALERT_STATUS_LABELS, ALERT_TYPE_LABELS } from '../../constants/alerts.js';
import { DEFAULT_FILTERS, hasCustomFilters } from '../../utils/filters.js';
import './FiltersBar.css';

/**
 * Barra de filtros da lista de alertas.
 * Filtros ficam na URL — este componente apenas exibe o estado atual e
 * chama onFilterChange para atualizar.
 * Conforme seção 7.6 do SPEC.
 *
 * @param {{
 *   filters: object,
 *   areas: string[],
 *   onFilterChange: (partial: object) => void,
 * }} props
 */
export default function FiltersBar({ filters, areas = [], onFilterChange }) {
  const hasCustom = hasCustomFilters(filters);

  function toggleMulti(field, value) {
    const current = filters[field] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFilterChange({ [field]: next, page: 1 });
  }

  return (
    <div className="filters-bar" role="search" aria-label="Filtros de alertas">
      {/* Risco — multisseleção */}
      <fieldset className="filters-bar__group">
        <legend className="filters-bar__label">Risco</legend>
        <div className="filters-bar__options">
          {Object.entries(ALERT_RISK_LABELS).map(([value, label]) => {
            const checked = (filters.risk ?? []).includes(value);
            return (
              <label key={value} className={`filter-chip filter-chip--risk-${value}${checked ? ' filter-chip--active' : ''}`}>
                <input
                  type="checkbox"
                  className="filter-chip__input"
                  checked={checked}
                  onChange={() => toggleMulti('risk', value)}
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
          {Object.entries(ALERT_STATUS_LABELS).map(([value, label]) => {
            const checked = (filters.status ?? []).includes(value);
            return (
              <label key={value} className={`filter-chip${checked ? ' filter-chip--active' : ''}`}>
                <input
                  type="checkbox"
                  className="filter-chip__input"
                  checked={checked}
                  onChange={() => toggleMulti('status', value)}
                />
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Tipo — multisseleção */}
      <fieldset className="filters-bar__group">
        <legend className="filters-bar__label">Tipo</legend>
        <div className="filters-bar__options">
          {Object.entries(ALERT_TYPE_LABELS).map(([value, label]) => {
            const checked = (filters.type ?? []).includes(value);
            return (
              <label key={value} className={`filter-chip${checked ? ' filter-chip--active' : ''}`}>
                <input
                  type="checkbox"
                  className="filter-chip__input"
                  checked={checked}
                  onChange={() => toggleMulti('type', value)}
                />
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Área — seleção única */}
      <div className="filters-bar__group">
        <label className="filters-bar__label" htmlFor="filter-area">
          Área
        </label>
        <select
          id="filter-area"
          className="filters-bar__select"
          value={filters.area ?? ''}
          onChange={(e) => onFilterChange({ area: e.target.value, page: 1 })}
        >
          <option value="">Todas as áreas</option>
          {areas.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
      </div>

      {/* Certeza mínima — slider */}
      <div className="filters-bar__group">
        <label className="filters-bar__label" htmlFor="filter-accuracy">
          Certeza mínima:{' '}
          <strong>{filters.min_accuracy ?? DEFAULT_FILTERS.min_accuracy}%</strong>
        </label>
        <input
          id="filter-accuracy"
          type="range"
          min={50}
          max={100}
          step={5}
          value={filters.min_accuracy ?? DEFAULT_FILTERS.min_accuracy}
          className="filters-bar__slider"
          onChange={(e) =>
            onFilterChange({ min_accuracy: parseInt(e.target.value, 10), page: 1 })
          }
        />
      </div>

      {/* Limpar filtros */}
      {hasCustom && (
        <div className="filters-bar__group filters-bar__group--clear">
          <button
            type="button"
            className="filters-bar__clear-btn"
            onClick={() =>
              onFilterChange({
                status: [...DEFAULT_FILTERS.status],
                risk: [],
                type: [],
                area: '',
                min_accuracy: DEFAULT_FILTERS.min_accuracy,
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
