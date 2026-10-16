import { INCIDENTE_STATUS_LABELS } from '../../constants/alerts.js';
import './StatusBadge.css';

/**
 * Badge de situação (status) do incidente.
 * Exibe o rótulo em PT-BR; cor definida via tokens semânticos.
 *
 * @param {{ status: string }} props
 */
export default function StatusBadge({ status }) {
  const label = INCIDENTE_STATUS_LABELS[status] ?? status;
  // Converte "Em Andamento" → "em-andamento", "Aberto" → "aberto"
  const cls = status?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-') ?? '';

  return (
    <span className={`status-badge status-badge--${cls}`}>
      {label}
    </span>
  );
}
