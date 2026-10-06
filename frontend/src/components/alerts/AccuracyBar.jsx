import './AccuracyBar.css';

/**
 * Barra fina de certeza + número percentual.
 * Exemplo: [████████░░] 87%
 *
 * @param {{ accuracy: number }} props  Valor de 0 a 100
 */
export default function AccuracyBar({ accuracy }) {
  const pct = Math.min(100, Math.max(0, accuracy ?? 0));

  return (
    <span className="accuracy-bar" aria-label={`Certeza: ${pct}%`}>
      <span className="accuracy-bar__track" aria-hidden="true">
        <span
          className="accuracy-bar__fill"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="accuracy-bar__label">{pct}%</span>
    </span>
  );
}
