import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';
import SummaryCards from '../components/alerts/SummaryCards.jsx';
import FiltersBar from '../components/alerts/FiltersBar.jsx';
import AlertsTable from '../components/alerts/AlertsTable.jsx';
import { useAlerts } from '../hooks/useAlerts.js';
import { useAlertsSummary } from '../hooks/useAlertsSummary.js';
import { filtersFromSearch, filtersToSearch, DEFAULT_FILTERS, hasCustomFilters } from '../utils/filters.js';
import { formatAbsolute } from '../utils/dates.js';
import './AlertsListPage.css';

/**
 * Página de lista de alertas (/alerts).
 * Estado dos filtros mantido na URL (query string).
 * Conforme seção 7.6 do SPEC.
 */
export default function AlertsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = filtersFromSearch(searchParams);

  // Atualiza apenas os campos passados, preservando o restante
  const handleFilterChange = useCallback(
    (partial) => {
      const next = { ...filters, ...partial };
      setSearchParams(filtersToSearch(next), { replace: true });
    },
    [filters, setSearchParams],
  );

  const alertsQuery = useAlerts(filters);
  const summaryQuery = useAlertsSummary();

  const alerts = alertsQuery.data?.data ?? null;
  const meta = alertsQuery.data?.meta ?? null;
  const summary = summaryQuery.data ?? null;
  const areas = summary?.data?.areas ?? [];

  // Horário da última atualização (quando há dados)
  const lastUpdated = alertsQuery.dataUpdatedAt
    ? formatAbsolute(new Date(alertsQuery.dataUpdatedAt))
    : null;

  const isFirstLoad = alertsQuery.isLoading && !alertsQuery.data;
  const isError = alertsQuery.isError;

  const noResults = !isFirstLoad && !isError && alerts !== null && alerts.length === 0;
  const customFiltersActive = hasCustomFilters(filters);

  return (
    <div className="alerts-list-page">
      {/* Visão geral */}
      <SummaryCards
        summary={summary}
        isLoading={summaryQuery.isLoading && !summaryQuery.data}
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* Barra de filtros */}
      <FiltersBar filters={filters} areas={areas} onFilterChange={handleFilterChange} />

      {/* Linha de status: atualizado às + indicador de carregamento em segundo plano */}
      <div className="alerts-list-page__status-bar" aria-live="polite" aria-atomic="true">
        {alertsQuery.isFetching && !isFirstLoad && (
          <span className="status-bar__refreshing" aria-label="Atualizando alertas">
            Atualizando…
          </span>
        )}
        {lastUpdated && !alertsQuery.isFetching && (
          <span className="status-bar__updated">Atualizado às {lastUpdated}</span>
        )}
      </div>

      {/* Estado de erro */}
      {isError && (
        <div className="alerts-list-page__error" role="alert">
          <p>
            {alertsQuery.error?.message?.includes('conectar')
              ? 'Não foi possível conectar ao servidor. Verifique se o backend está em execução.'
              : `Erro ao carregar alertas: ${alertsQuery.error?.message ?? 'Tente novamente.'}`}
          </p>
          <button
            type="button"
            className="retry-btn"
            onClick={() => alertsQuery.refetch()}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Estado vazio */}
      {noResults && !isError && (
        <div className="alerts-list-page__empty" role="status">
          {customFiltersActive ? (
            <>
              <p>Nenhum alerta encontrado com estes filtros.</p>
              <button
                type="button"
                className="retry-btn"
                onClick={() =>
                  handleFilterChange({
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
            </>
          ) : (
            <p>
              Nenhum alerta por enquanto. Quando o agente identificar um risco, ele aparecerá aqui.
            </p>
          )}
        </div>
      )}

      {/* Tabela (mostra mesmo durante refetch para não piscar) */}
      {!isError && (isFirstLoad || (alerts && alerts.length > 0)) && (
        <AlertsTable
          alerts={isFirstLoad ? null : alerts}
          meta={meta}
          isLoading={isFirstLoad}
          filters={filters}
          onFilterChange={handleFilterChange}
        />
      )}
    </div>
  );
}
