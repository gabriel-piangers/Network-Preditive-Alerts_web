import { SkeletonCard } from '../feedback/Skeleton.jsx';
import './SummaryCards.css';

/**
 * Cards de visão geral com contagens da API /api/alerts/summary.
 * Clicar em um card aplica o filtro correspondente na lista.
 * Conforme seção 7.6 do SPEC.
 *
 * @param {{
 *   summary: object,
 *   isLoading: boolean,
 *   filters: object,
 *   onFilterChange: (partial: object) => void,
 * }} props
 */
export default function SummaryCards({ summary, isLoading, filters, onFilterChange }) {
  if (isLoading && !summary) {
    return (
      <div className="summary-cards" aria-label="Visão geral de alertas">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  const data = summary?.data ?? {};
  const byRisk = data.by_risk ?? {};

  // Verifica qual card está ativo para destacá-lo
  function isActiveCard(cardStatus, cardRisk) {
    const statusArr = filters?.status ?? [];
    const riskArr = filters?.risk ?? [];

    if (cardStatus === 'active') {
      // "Alertas ativos": status contém exatamente os 3 ativos e sem filtro de risco
      return (
        statusArr.includes('new') &&
        statusArr.includes('in_analysis') &&
        statusArr.includes('monitoring') &&
        riskArr.length === 0
      );
    }
    if (cardStatus === 'new') {
      return statusArr.length === 1 && statusArr[0] === 'new' && riskArr.length === 0;
    }
    if (cardRisk) {
      return (
        statusArr.includes('new') &&
        statusArr.includes('in_analysis') &&
        statusArr.includes('monitoring') &&
        riskArr.length === 1 &&
        riskArr[0] === cardRisk
      );
    }
    return false;
  }

  const cards = [
    {
      id: 'active',
      label: 'Alertas ativos',
      value: data.total_active ?? 0,
      onClick: () =>
        onFilterChange({ status: ['new', 'in_analysis', 'monitoring'], risk: [], page: 1 }),
      active: isActiveCard('active'),
    },
    {
      id: 'new',
      label: 'Novos',
      value: data.new_count ?? 0,
      onClick: () => onFilterChange({ status: ['new'], risk: [], page: 1 }),
      active: isActiveCard('new'),
    },
    {
      id: 'high',
      label: 'Risco alto',
      value: byRisk.high ?? 0,
      onClick: () =>
        onFilterChange({ status: ['new', 'in_analysis', 'monitoring'], risk: ['high'], page: 1 }),
      active: isActiveCard(null, 'high'),
      modifier: 'high',
    },
    {
      id: 'medium',
      label: 'Risco médio',
      value: byRisk.medium ?? 0,
      onClick: () =>
        onFilterChange({ status: ['new', 'in_analysis', 'monitoring'], risk: ['medium'], page: 1 }),
      active: isActiveCard(null, 'medium'),
      modifier: 'medium',
    },
    {
      id: 'low',
      label: 'Risco baixo',
      value: byRisk.low ?? 0,
      onClick: () =>
        onFilterChange({ status: ['new', 'in_analysis', 'monitoring'], risk: ['low'], page: 1 }),
      active: isActiveCard(null, 'low'),
      modifier: 'low',
    },
  ];

  return (
    <div className="summary-cards" aria-label="Visão geral de alertas">
      {cards.map((card) => (
        <button
          key={card.id}
          type="button"
          className={[
            'summary-card',
            card.modifier ? `summary-card--${card.modifier}` : '',
            card.active ? 'summary-card--active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={card.onClick}
          aria-pressed={card.active}
        >
          <span className="summary-card__value">{card.value}</span>
          <span className="summary-card__label">{card.label}</span>
        </button>
      ))}
    </div>
  );
}
