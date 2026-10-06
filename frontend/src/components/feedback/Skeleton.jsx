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

/**
 * Esqueleto da página de detalhe do alerta.
 * Conforme seção 7.8 do SPEC.
 */
export function SkeletonDetail() {
  return (
    <div className="skeleton-detail" aria-hidden="true">
      {/* Cabeçalho */}
      <div className="skeleton-detail__header">
        <div className="skeleton skeleton--text skeleton--medium" />
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--text skeleton--short" />
      </div>

      {/* Grade de informações */}
      <div className="skeleton-detail__grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton-detail__grid-item">
            <div className="skeleton skeleton--text skeleton--short" />
            <div className="skeleton skeleton--text skeleton--wide" />
          </div>
        ))}
      </div>

      {/* Seções de texto */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="skeleton-detail__section">
          <div className="skeleton skeleton--text skeleton--medium" />
          <div className="skeleton skeleton--text skeleton--full" />
          <div className="skeleton skeleton--text skeleton--full" />
          <div className="skeleton skeleton--text skeleton--wide" />
        </div>
      ))}
    </div>
  );
}
