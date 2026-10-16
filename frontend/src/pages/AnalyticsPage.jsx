import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, TrendingUp, BarChart2 } from 'lucide-react';
import ChatPanel from '../components/analytics/ChatPanel.jsx';
import ChartDashboard from '../components/analytics/ChartDashboard.jsx';
import { checkAnalyticsHealth } from '../api/analytics.js';
import { useAlertsSummary } from '../hooks/useAlertsSummary.js';
import { useAnalytics } from '../context/AnalyticsContext.jsx';
import './AnalyticsPage.css';

/**
 * Página de Analytics (/analytics).
 * Layout split: chat (Gemini) à esquerda, dashboard de gráficos Plotly à direita.
 * O estado de charts e messages vive no AnalyticsContext — persiste ao trocar de página.
 */
export default function AnalyticsPage() {
  const { charts, removeChart, updateChart } = useAnalytics();
  const [serviceOnline, setServiceOnline] = useState(null);
  const summaryQuery = useAlertsSummary();
  const summary = summaryQuery.data?.data ?? null;

  useEffect(() => {
    checkAnalyticsHealth().then((ok) => setServiceOnline(ok));
  }, []);

  // Cards de métricas vindos do summary existente
  const totalAtivos = summary?.total_active ?? '—';
  const criticos = summary?.by_risco?.Crítico ?? '—';
  const emAndamento = summary?.by_status?.['Em Andamento'] ?? '—';
  const totalGeral = summary
    ? (summary.by_status?.Aberto ?? 0) +
      (summary.by_status?.['Em Andamento'] ?? 0) +
      (summary.by_status?.Resolvido ?? 0)
    : null;
  const taxaResolucao =
    totalGeral && totalGeral > 0
      ? `${Math.round(((summary.by_status?.Resolvido ?? 0) / totalGeral) * 100)}%`
      : '—';

  return (
    <div className="analytics-page">
      {/* Cabeçalho */}
      <div className="analytics-page__header">
        <div>
          <h1 className="analytics-page__title">Analytics</h1>
          <p className="analytics-page__subtitle">
            Explore os dados de incidentes de rede com gráficos gerados por IA.
          </p>
        </div>
        {serviceOnline !== null && (
          <span
            className={`analytics-page__service-badge analytics-page__service-badge--${serviceOnline ? 'online' : 'offline'}`}
            aria-live="polite"
          >
            <span className="analytics-page__service-dot" aria-hidden="true" />
            {serviceOnline ? 'Serviço online' : 'Serviço offline'}
          </span>
        )}
      </div>

      {/* Cards de métricas */}
      <div className="analytics-page__grid">
        <div className="analytics-card">
          <div className="analytics-card__icon analytics-card__icon--blue">
            <Activity size={22} aria-hidden="true" />
          </div>
          <div className="analytics-card__body">
            <span className="analytics-card__label">Incidentes Ativos</span>
            <span className="analytics-card__value">{totalAtivos}</span>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card__icon analytics-card__icon--red">
            <AlertTriangle size={22} aria-hidden="true" />
          </div>
          <div className="analytics-card__body">
            <span className="analytics-card__label">Risco Crítico</span>
            <span className="analytics-card__value">{criticos}</span>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card__icon analytics-card__icon--green">
            <TrendingUp size={22} aria-hidden="true" />
          </div>
          <div className="analytics-card__body">
            <span className="analytics-card__label">Taxa de Resolução</span>
            <span className="analytics-card__value">{taxaResolucao}</span>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card__icon analytics-card__icon--purple">
            <BarChart2 size={22} aria-hidden="true" />
          </div>
          <div className="analytics-card__body">
            <span className="analytics-card__label">Em Andamento</span>
            <span className="analytics-card__value">{emAndamento}</span>
          </div>
        </div>
      </div>

      {/* Layout principal: chat + dashboard */}
      <div className="analytics-page__workspace">
        <aside className="analytics-page__chat-col" aria-label="Chat com o assistente">
          <ChatPanel disabled={serviceOnline === false} />
        </aside>

        <section className="analytics-page__dashboard-col" aria-label="Dashboard de gráficos">
          <ChartDashboard
            charts={charts}
            onRemove={removeChart}
            onUpdate={updateChart}
          />
        </section>
      </div>
    </div>
  );
}
