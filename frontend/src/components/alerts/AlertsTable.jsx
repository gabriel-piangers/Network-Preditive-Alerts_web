import { useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown } from 'lucide-react';
import RiskBadge from './RiskBadge.jsx';
import StatusBadge from './StatusBadge.jsx';
import AccuracyBar from './AccuracyBar.jsx';
import { SkeletonRow } from '../feedback/Skeleton.jsx';
import { formatAbsolute, formatRelative, isPast } from '../../utils/dates.js';
import { ALERT_TYPE_LABELS } from '../../constants/alerts.js';
import './AlertsTable.css';

/**
 * Tabela de alertas com cabeçalhos clicáveis para ordenação e paginação.
 * Conforme seção 7.6 do SPEC.
 *
 * @param {{
 *   alerts: object[],
 *   meta: { page: number, limit: number, total: number, total_pages: number },
 *   isLoading: boolean,
 *   filters: object,
 *   onFilterChange: (partial: object) => void,
 * }} props
 */
export default function AlertsTable({ alerts, meta, isLoading, filters, onFilterChange }) {
  const navigate = useNavigate();

  const sortBy = filters?.sort_by ?? 'risk';
  const sortDir = filters?.sort_dir ?? 'desc';

  function handleSort(field) {
    if (sortBy === field) {
      onFilterChange({ sort_dir: sortDir === 'asc' ? 'desc' : 'asc', page: 1 });
    } else {
      onFilterChange({ sort_by: field, sort_dir: 'desc', page: 1 });
    }
  }

  function SortIcon({ field }) {
    if (sortBy !== field) return null;
    return sortDir === 'asc' ? (
      <ChevronUp size={14} aria-hidden="true" className="sort-icon" />
    ) : (
      <ChevronDown size={14} aria-hidden="true" className="sort-icon" />
    );
  }

  function ThSortable({ field, children }) {
    return (
      <th
        className={`alerts-table__th alerts-table__th--sortable${sortBy === field ? ' alerts-table__th--sorted' : ''}`}
        onClick={() => handleSort(field)}
        aria-sort={sortBy === field ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleSort(field)}
      >
        {children}
        <SortIcon field={field} />
      </th>
    );
  }

  const page = meta?.page ?? 1;
  const totalPages = meta?.total_pages ?? 1;
  const total = meta?.total ?? 0;

  // Linhas de esqueleto durante o carregamento inicial
  const skeletonRows = isLoading && (!alerts || alerts.length === 0)
    ? Array.from({ length: 8 })
    : [];

  return (
    <div className="alerts-table-wrapper">
      <table className="alerts-table" aria-label="Lista de alertas">
        <thead>
          <tr>
            <ThSortable field="risk">Risco</ThSortable>
            <th className="alerts-table__th">Alerta</th>
            <ThSortable field="area">Área</ThSortable>
            <th className="alerts-table__th">Equipamentos</th>
            <ThSortable field="predicted_for">Previsão</ThSortable>
            <ThSortable field="accuracy">Certeza</ThSortable>
            <ThSortable field="status">Situação</ThSortable>
          </tr>
        </thead>
        <tbody>
          {skeletonRows.map((_, i) => (
            <SkeletonRow key={i} />
          ))}
          {!isLoading && alerts && alerts.length === 0 && (
            <tr>
              <td colSpan={7} className="alerts-table__empty">
                Nenhum alerta encontrado.
              </td>
            </tr>
          )}
          {(alerts ?? []).map((alert) => (
            <tr
              key={alert.id}
              className="alerts-table__row"
              onClick={() => navigate(`/alerts/${alert.id}`)}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/alerts/${alert.id}`)}
              aria-label={`Ver detalhes do alerta: ${alert.title}`}
            >
              <td className="alerts-table__td">
                <RiskBadge risk={alert.risk} />
              </td>
              <td className="alerts-table__td">
                <span className="alerts-table__title">{alert.title}</span>
                <span className="alerts-table__type">
                  {ALERT_TYPE_LABELS[alert.type] ?? alert.type}
                </span>
              </td>
              <td className="alerts-table__td">{alert.area}</td>
              <td className="alerts-table__td">
                <EquipmentsList equipments={alert.equipments ?? []} />
              </td>
              <td className="alerts-table__td">
                <PredictionCell predictedFor={alert.predicted_for} />
              </td>
              <td className="alerts-table__td">
                <AccuracyBar accuracy={alert.accuracy} />
              </td>
              <td className="alerts-table__td">
                <StatusBadge status={alert.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Paginação */}
      {total > 0 && (
        <div className="alerts-table__pagination">
          <span className="alerts-table__pagination-info">
            {total} resultado{total !== 1 ? 's' : ''}
          </span>
          <div className="alerts-table__pagination-controls">
            <button
              type="button"
              className="pagination-btn"
              disabled={page <= 1}
              onClick={() => onFilterChange({ page: page - 1 })}
              aria-label="Página anterior"
            >
              ← Anterior
            </button>
            <span className="pagination-page">
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              className="pagination-btn"
              disabled={page >= totalPages}
              onClick={() => onFilterChange({ page: page + 1 })}
              aria-label="Próxima página"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Exibe os 2 primeiros equipamentos + "+N" se houver mais. */
function EquipmentsList({ equipments }) {
  if (!equipments || equipments.length === 0) return <span className="muted">—</span>;
  const visible = equipments.slice(0, 2);
  const rest = equipments.length - 2;
  const title = equipments.join(', ');
  return (
    <span title={title}>
      {visible.join(', ')}
      {rest > 0 && <span className="muted"> +{rest}</span>}
    </span>
  );
}

/** Exibe o tempo relativo com data completa no title; destaque quando já passou. */
function PredictionCell({ predictedFor }) {
  if (!predictedFor) return <span className="muted">—</span>;
  const past = isPast(predictedFor);
  return (
    <span
      title={formatAbsolute(predictedFor)}
      className={past ? 'prediction--past' : ''}
    >
      {formatRelative(predictedFor)}
    </span>
  );
}
