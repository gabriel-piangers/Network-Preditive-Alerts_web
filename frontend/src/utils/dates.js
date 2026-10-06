/**
 * Utilitários de formatação de datas para exibição no frontend.
 * Usa Intl.DateTimeFormat e Intl.RelativeTimeFormat — sem biblioteca externa.
 * Conforme seção 7.9 do SPEC (locale pt-BR).
 */

const LOCALE = 'pt-BR';

/**
 * Formata uma data/hora de forma absoluta.
 * Exemplo: "02/10/2026 14:30"
 *
 * @param {string|Date} date
 * @returns {string}
 */
export function formatAbsolute(date) {
  return new Intl.DateTimeFormat(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Formata uma data de forma relativa ao momento atual.
 * Exemplos: "em ~6h", "há 2h", "há 3 dias"
 *
 * @param {string|Date} date
 * @returns {string}
 */
export function formatRelative(date) {
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });
  const diffMs = new Date(date).getTime() - Date.now();
  const diffSeconds = Math.round(diffMs / 1_000);
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds < 60) {
    return rtf.format(diffSeconds, 'second');
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  const absMinutes = Math.abs(diffMinutes);

  if (absMinutes < 60) {
    return rtf.format(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  const absHours = Math.abs(diffHours);

  if (absHours < 24) {
    return rtf.format(diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  const absDays = Math.abs(diffDays);

  if (absDays < 30) {
    return rtf.format(diffDays, 'day');
  }

  const diffMonths = Math.round(diffDays / 30);
  return rtf.format(diffMonths, 'month');
}

/**
 * Retorna true se a data já passou (está no passado).
 *
 * @param {string|Date} date
 * @returns {boolean}
 */
export function isPast(date) {
  return new Date(date).getTime() < Date.now();
}
