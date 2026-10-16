import { lazy, Suspense } from 'react';
import { Trash2, RefreshCw, BarChart2 } from 'lucide-react';
import { regenerateChart } from '../../api/analytics.js';
import './ChartDashboard.css';

// react-plotly.js é grande — carrega só quando necessário
const Plot = lazy(() => import('react-plotly.js'));

const PLOTLY_CONFIG = {
  displaylogo: false,
  responsive: true,
  modeBarButtonsToRemove: ['sendDataToCloud', 'lasso2d', 'select2d'],
};

/**
 * Dashboard de exibição dos gráficos gerados pelo Gemini.
 *
 * Props:
 *  charts — Array de { id, chart: {data, layout}, spec, title }
 *  onRemove(id)  — Remove um gráfico pelo id
 *  onUpdate(id, newChart) — Atualiza os dados de um gráfico
 */
export default function ChartDashboard({ charts, onRemove, onUpdate }) {
  if (!charts || charts.length === 0) {
    return (
      <div className="chart-dashboard chart-dashboard--empty">
        <BarChart2 size={40} className="chart-dashboard__empty-icon" aria-hidden="true" />
        <p className="chart-dashboard__empty-text">
          Nenhum gráfico gerado ainda.
        </p>
        <p className="chart-dashboard__empty-hint">
          Use o chat ao lado para solicitar análises dos dados de rede.
        </p>
      </div>
    );
  }

  const handleRegenerate = async (entry) => {
    if (!entry.spec) return;
    try {
      const newChart = await regenerateChart(entry.spec);
      onUpdate(entry.id, newChart);
    } catch (err) {
      console.error('Erro ao regenerar gráfico:', err);
    }
  };

  return (
    <div className="chart-dashboard">
      {charts.map((entry) => (
        <div key={entry.id} className="chart-card">
          <div className="chart-card__header">
            <span className="chart-card__title">{entry.title}</span>
            <div className="chart-card__actions">
              {entry.spec && (
                <button
                  type="button"
                  className="chart-card__btn"
                  onClick={() => handleRegenerate(entry)}
                  title="Atualizar gráfico com dados atuais"
                  aria-label={`Atualizar gráfico: ${entry.title}`}
                >
                  <RefreshCw size={14} aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                className="chart-card__btn chart-card__btn--danger"
                onClick={() => onRemove(entry.id)}
                title="Remover gráfico"
                aria-label={`Remover gráfico: ${entry.title}`}
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="chart-card__body">
            <Suspense fallback={<div className="chart-card__loading">Carregando gráfico…</div>}>
              <Plot
                data={entry.chart.data}
                layout={{
                  ...entry.chart.layout,
                  autosize: true,
                  height: 320,
                }}
                config={PLOTLY_CONFIG}
                style={{ width: '100%' }}
                useResizeHandler
              />
            </Suspense>
          </div>
        </div>
      ))}
    </div>
  );
}
