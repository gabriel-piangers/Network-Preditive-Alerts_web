import { SkeletonCard } from '../feedback/Skeleton.jsx';
import './SummaryCards.css';

/**
 * Cards de visão geral com contagens da API /api/alerts/summary.
 * Clicar em um card aplica o filtro correspondente na lista.
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
      <div className="summary-cards" aria-label="Visão geral de incidentes">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  const data = summary?.data ?? {};
  const byRisco = data.by_risco ?? {};

  // Verifica qual card está ativo para destacá-lo
  function isActiveCard(cardStatus, cardRisco) {
    const statusArr = filters?.incidente_status ?? [];
    const riscoArr = filters?.falha_risco ?? [];

    if (cardStatus === 'active') {
      return (
        statusArr.includes('Aberto') &&
        statusArr.includes('Em Andamento') &&
        riscoArr.length === 0
      );
    }
    if (cardStatus === 'Aberto') {
      return statusArr.length === 1 && statusArr[0] === 'Aberto' && riscoArr.length === 0;
    }
    if (cardRisco) {
      return (
        statusArr.includes('Aberto') &&
        statusArr.includes('Em Andamento') &&
        riscoArr.length === 1 &&
        riscoArr[0] === cardRisco
      );
    }
    return false;
  }

  const cards = [
    {
      id: 'active',
      label: 'Incidentes ativos',
      value: data.total_active ?? 0,
      onClick: () =>
        onFilterChange({ incidente_status: ['Aberto', 'Em Andamento'], falha_risco: [], page: 1 }),
      active: isActiveCard('active'),
    },
    {
      id: 'aberto',
      label: 'Abertos',
      value: data.abertos ?? 0,
      onClick: () => onFilterChange({ incidente_status: ['Aberto'], falha_risco: [], page: 1 }),
      active: isActiveCard('Aberto'),
    },
    {
      id: 'critico',
      label: 'Risco crítico',
      value: byRisco['Crítico'] ?? 0,
      onClick: () =>
        onFilterChange({ incidente_status: ['Aberto', 'Em Andamento'], falha_risco: ['Crítico'], page: 1 }),
      active: isActiveCard(null, 'Crítico'),
      modifier: 'critico',
    },
    {
      id: 'alto',
      label: 'Risco alto',
      value: byRisco['Alto'] ?? 0,
      onClick: () =>
        onFilterChange({ incidente_status: ['Aberto', 'Em Andamento'], falha_risco: ['Alto'], page: 1 }),
      active: isActiveCard(null, 'Alto'),
      modifier: 'alto',
    },
    {
      id: 'medio',
      label: 'Risco médio',
      value: byRisco['Médio'] ?? 0,
      onClick: () =>
        onFilterChange({ incidente_status: ['Aberto', 'Em Andamento'], falha_risco: ['Médio'], page: 1 }),
      active: isActiveCard(null, 'Médio'),
      modifier: 'medio',
    },
  ];

  return (
    <div className="summary-cards" aria-label="Visão geral de incidentes">
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
