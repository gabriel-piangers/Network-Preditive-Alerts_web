import './Skeleton.css';

/**
 * Esqueleto de card para o estado de carregamento dos SummaryCards.
 * Conforme seção 7.8 do SPEC.
 */
export function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton--text skeleton--short" />
      <div className="skeleton skeleton--text skeleton--wide" />
    </div>
  );
}

/**
 * Esqueleto de linha de tabela para o estado de carregamento da AlertsTable.
 * Conforme seção 7.8 do SPEC.
 */
export function SkeletonRow() {
  return (
    <tr className="skeleton-row" aria-hidden="true">
      <td><div className="skeleton skeleton--text skeleton--short" /></td>
      <td>
        <div className="skeleton skeleton--text skeleton--wide" />
        <div className="skeleton skeleton--text skeleton--medium" style={{ marginTop: '4px' }} />
      </td>
      <td><div className="skeleton skeleton--text skeleton--medium" /></td>
      <td><div className="skeleton skeleton--text skeleton--medium" /></td>
      <td><div className="skeleton skeleton--text skeleton--short" /></td>
      <td><div className="skeleton skeleton--text skeleton--short" /></td>
      <td><div className="skeleton skeleton--text skeleton--short" /></td>
    </tr>
  );
}
