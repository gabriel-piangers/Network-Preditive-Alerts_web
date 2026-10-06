import { ALERT_STATUS_LABELS } from '../../constants/alerts.js';
import './StatusBadge.css';

/**
 * Badge de situação (status) do alerta.
 * Exibe o rótulo em PT-BR; cor definida via tokens semânticos.
 *
 * @param {{ status: string }} props
 */
export default function StatusBadge({ status }) {
  const label = ALERT_STATUS_LABELS[status] ?? status;
  // Converte "in_analysis" → "in-analysis" para usar como classe CSS
  const cls = status.replace(/_/g, '-');

  return (
    <span className={`status-badge status-badge--${cls}`}>
      {label}
    </span>
  );
}
