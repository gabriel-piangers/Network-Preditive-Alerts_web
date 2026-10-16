import { useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown } from 'lucide-react';
import RiskBadge from './RiskBadge.jsx';
import StatusBadge from './StatusBadge.jsx';
import { SkeletonRow } from '../feedback/Skeleton.jsx';
import { FALHA_CATEGORIA_LABELS } from '../../constants/alerts.js';
import './AlertsTable.css';

/**
 * Tabela de incidentes com cabeçalhos clicáveis para ordenação e paginação.
 *
 * @param {{
 *   alerts: object[],
 *   meta: { page: number, page_size: number, total: number, total_pages: number },
 *   isLoading: boolean,
 *   filters: object,
 *   onFilterChange: (partial: object) => void,
 * }} props
 */
export default function AlertsTable({ alerts, meta, isLoading, filters, onFilterChange }) {
  const navigate = useNavigate();

  const sortBy = filters?.sort_by ?? 'falha_risco';
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

  const skeletonRows = isLoading && (!alerts || alerts.length === 0)
    ? Array.from({ length: 8 })
    : [];

  return (
    <div className="alerts-table-wrapper">
      <table className="alerts-table" aria-label="Lista de incidentes">
        <thead>
          <tr>
            <ThSortable field="falha_risco">Risco</ThSortable>
            <th className="alerts-table__th">Incidente</th>
            <ThSortable field="falha_localizacao">Localização</ThSortable>
            <th className="alerts-table__th">Dispositivo</th>
            <ThSortable field="falha_inicio">Início</ThSortable>
            <ThSortable field="incidente_status">Situação</ThSortable>
          </tr>
        </thead>
        <tbody>
          {skeletonRows.map((_, i) => (
            <SkeletonRow key={i} />
          ))}
          {!isLoading && alerts && alerts.length === 0 && (
            <tr>
              <td colSpan={6} className="alerts-table__empty">
                Nenhum incidente encontrado.
              </td>
            </tr>
          )}
          {(alerts ?? []).map((alert) => (
            <tr
              key={alert.id_falha}
              className="alerts-table__row"
              onClick={() => navigate(`/alerts/${encodeURIComponent(alert.id_falha)}`)}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/alerts/${encodeURIComponent(alert.id_falha)}`)}
              aria-label={`Ver detalhes do incidente: ${alert.falha_descricao}`}
            >
              <td className="alerts-table__td">
                <RiskBadge risk={alert.falha_risco} />
              </td>
              <td className="alerts-table__td">
                <span className="alerts-table__title">{alert.falha_descricao}</span>
                <span className="alerts-table__type">
                  {FALHA_CATEGORIA_LABELS[alert.falha_categoria] ?? alert.falha_categoria}
                </span>
              </td>
              <td className="alerts-table__td">{alert.falha_localizacao ?? '—'}</td>
              <td className="alerts-table__td">
                <span>{alert.dispositivo_nome ?? '—'}</span>
                {alert.dispositivo_tipo_conexao && (
                  <span className="muted"> · {alert.dispositivo_tipo_conexao}</span>
                )}
              </td>
              <td className="alerts-table__td">
                <FalhaInicioCell falhaInicio={alert.falha_inicio} />
              </td>
              <td className="alerts-table__td">
                <StatusBadge status={alert.incidente_status} />
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

/** Exibe a data/hora de início da falha formatada. */
function FalhaInicioCell({ falhaInicio }) {
  if (!falhaInicio) return <span className="muted">—</span>;
  return <span title={falhaInicio}>{falhaInicio}</span>;
}
