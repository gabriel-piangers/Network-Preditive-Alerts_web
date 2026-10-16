/**
 * AnalyticsContext.jsx
 *
 * Mantém o estado global do módulo Analytics durante toda a sessão:
 *  - charts   : gráficos gerados pelo Gemini (persistem ao trocar de página)
 *  - messages : histórico completo do chat
 *
 * Usa sessionStorage para sobreviver a reloads leves, mas não entre abas.
 */

import { createContext, useContext, useState, useCallback } from 'react';

const STORAGE_KEY_CHARTS   = 'analytics_charts';
const STORAGE_KEY_MESSAGES = 'analytics_messages';

const WELCOME_MESSAGE = {
  role: 'model',
  content:
    'Olá! Sou o assistente de Analytics. Peça-me para criar gráficos comparativos dos dados de incidentes de rede.\n\nExemplos:\n• "Mostre um gráfico de barras com incidentes por nível de risco"\n• "Quero um pizza com a distribuição por status"\n• "Compare latência média por categoria de falha"\n• "Mostre a correlação entre perda de pacotes e latência"',
};

function loadFromSession(key, fallback) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToSession(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sessionStorage pode falhar em modo privado com quota esgotada — ignora silenciosamente
  }
}

const AnalyticsContext = createContext(null);

export function AnalyticsProvider({ children }) {
  const [charts, setCharts] = useState(() =>
    loadFromSession(STORAGE_KEY_CHARTS, []),
  );
  const [messages, setMessages] = useState(() =>
    loadFromSession(STORAGE_KEY_MESSAGES, [WELCOME_MESSAGE]),
  );

  // ── Charts ────────────────────────────────────────────────────────────────

  const addChart = useCallback((chart, spec, title) => {
    setCharts((prev) => {
      const next = [...prev, { id: `chart-${Date.now()}`, chart, spec, title }];
      saveToSession(STORAGE_KEY_CHARTS, next);
      return next;
    });
  }, []);

  const removeChart = useCallback((id) => {
    setCharts((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveToSession(STORAGE_KEY_CHARTS, next);
      return next;
    });
  }, []);

  const updateChart = useCallback((id, newChart) => {
    setCharts((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, chart: newChart } : c));
      saveToSession(STORAGE_KEY_CHARTS, next);
      return next;
    });
  }, []);

  const clearCharts = useCallback(() => {
    setCharts([]);
    saveToSession(STORAGE_KEY_CHARTS, []);
  }, []);

  // ── Messages ──────────────────────────────────────────────────────────────

  const addMessage = useCallback((message) => {
    setMessages((prev) => {
      const next = [...prev, message];
      saveToSession(STORAGE_KEY_MESSAGES, next);
      return next;
    });
  }, []);

  const clearMessages = useCallback(() => {
    const reset = [WELCOME_MESSAGE];
    setMessages(reset);
    saveToSession(STORAGE_KEY_MESSAGES, reset);
  }, []);

  return (
    <AnalyticsContext.Provider
      value={{
        charts,
        addChart,
        removeChart,
        updateChart,
        clearCharts,
        messages,
        addMessage,
        clearMessages,
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) throw new Error('useAnalytics deve ser usado dentro de <AnalyticsProvider>');
  return ctx;
}
