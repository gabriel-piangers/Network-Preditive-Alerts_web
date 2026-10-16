import { useState, useEffect, useCallback } from 'react';
import { Activity, AlertTriangle, TrendingUp, BarChart2 } from 'lucide-react';
import ChatPanel from '../components/analytics/ChatPanel.jsx';
import ChartDashboard from '../components/analytics/ChartDashboard.jsx';
import { checkAnalyticsHealth } from '../api/analytics.js';
import { useAlertsSummary } from '../hooks/useAlertsSummary.js';
import './AnalyticsPage.css';

/**
 * Página de Analytics (/analytics).
 * Layout split: chat (Gemini) à esquerda, dashboard de gráficos Plotly à direita.
 */
export default function AnalyticsPage() {
  const [charts, setCharts] = useState([]);
  const [serviceOnline, setServiceOnline] = useState(null); // null = checando
  const summaryQuery = useAlertsSummary();
  const summary = summaryQuery.data?.data ?? null;

  // Verifica se o microserviço Python está no ar
  useEffect(() => {
    checkAnalyticsHealth().then((ok) => setServiceOnline(ok));
  }, []);

  const handleChartGenerated = useCallback((chart, spec, title) => {
    const id = `chart-${Date.now()}`;
    setCharts((prev) => [...prev, { id, chart, spec, title }]);
  }, []);

  const handleRemoveChart = useCallback((id) => {
    setCharts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleUpdateChart = useCallback((id, newChart) => {
    setCharts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, chart: newChart } : c)),
    );
  }, []);

  // Cards de métricas vindos do summary existente
  const totalAtivos = summary?.total_active ?? '—';
  const criticos = summary?.by_risco?.Crítico ?? '—';
  const resolvidos = summary?.by_status?.Resolvido ?? '—';
  const emAndamento = summary?.by_status?.['Em Andamento'] ?? '—';
  const totalGeral =
    summary
      ? (summary.by_status?.Aberto ?? 0) +
        (summary.by_status?.['Em Andamento'] ?? 0) +
        (summary.by_status?.Resolvido ?? 0)
      : '—';
  const taxaResolucao =
    summary && typeof totalGeral === 'number' && totalGeral > 0
      ? `${Math.round((summary.by_status.Resolvido / totalGeral) * 100)}%`
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
          <ChatPanel
            onChartGenerated={handleChartGenerated}
            disabled={serviceOnline === false}
          />
        </aside>

        <section className="analytics-page__dashboard-col" aria-label="Dashboard de gráficos">
          <ChartDashboard
            charts={charts}
            onRemove={handleRemoveChart}
            onUpdate={handleUpdateChart}
          />
        </section>
      </div>
    </div>
  );
}
