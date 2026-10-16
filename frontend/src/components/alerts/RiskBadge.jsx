import { ChevronsUp, ChevronUp, Minus, ChevronDown } from 'lucide-react';
import { FALHA_RISCO_LABELS } from '../../constants/alerts.js';
import './RiskBadge.css';

/**
 * Badge de risco com ícone + texto.
 * Risco nunca é comunicado apenas por cor — há ícone distinto por nível.
 *
 * @param {{ risk: 'Crítico'|'Alto'|'Médio'|'Baixo' }} props
 */
export default function RiskBadge({ risk }) {
  const label = FALHA_RISCO_LABELS[risk] ?? risk;

  const Icon =
    risk === 'Crítico' ? ChevronsUp
    : risk === 'Alto' ? ChevronUp
    : risk === 'Médio' ? Minus
    : ChevronDown;

  // Converte "Crítico" → "critico", "Em Andamento" → "em-andamento" etc.
  const cls = risk?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-') ?? '';

  return (
    <span className={`risk-badge risk-badge--${cls}`} aria-label={`Risco ${label}`}>
      <Icon size={14} aria-hidden="true" />
      {label}
    </span>
  );
}
