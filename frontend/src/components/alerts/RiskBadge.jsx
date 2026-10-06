import { ChevronsUp, Minus, ChevronDown } from 'lucide-react';
import { ALERT_RISK_LABELS } from '../../constants/alerts.js';
import './RiskBadge.css';

/**
 * Badge de risco com ícone + texto.
 * Risco nunca é comunicado apenas por cor — há ícone distinto por nível.
 * Conforme seção 7.10 do SPEC (acessibilidade).
 *
 * @param {{ risk: 'high'|'medium'|'low' }} props
 */
export default function RiskBadge({ risk }) {
  const label = ALERT_RISK_LABELS[risk] ?? risk;

  const Icon =
    risk === 'high' ? ChevronsUp : risk === 'medium' ? Minus : ChevronDown;

  return (
    <span className={`risk-badge risk-badge--${risk}`} aria-label={`Risco ${label}`}>
      <Icon size={14} aria-hidden="true" />
      {label}
    </span>
  );
}
