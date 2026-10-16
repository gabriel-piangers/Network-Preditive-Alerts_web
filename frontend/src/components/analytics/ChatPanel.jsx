import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, BarChart2, Loader } from 'lucide-react';
import { sendChatMessage } from '../../api/analytics.js';
import { useAnalytics } from '../../context/AnalyticsContext.jsx';
import './ChatPanel.css';

/**
 * Painel de chat com o Gemini para solicitar geração de gráficos.
 * O histórico de mensagens é persistido no AnalyticsContext — sobrevive
 * à navegação entre páginas.
 *
 * Props:
 *  disabled — desabilita o input quando o serviço está indisponível
 */
export default function ChatPanel({ disabled = false }) {
  const { messages, addMessage, addChart } = useAnalytics();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll automático para a última mensagem
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    addMessage({ role: 'user', content: text });
    setInput('');
    setLoading(true);

    // Histórico para a API: exclui a mensagem de boas-vindas (índice 0)
    // e exclui a mensagem que acabamos de adicionar (última) — ela é o "user_message"
    const historyForApi = [...messages, { role: 'user', content: text }]
      .slice(1)          // remove boas-vindas
      .slice(0, -1)      // remove a mensagem atual (já é o parâmetro message)
      .map(({ role, content }) => ({ role, content }));

    try {
      const result = await sendChatMessage(text, historyForApi);

      addMessage({ role: 'model', content: result.text });

      if (result.chart && result.chart_spec) {
        addChart(result.chart, result.chart_spec, result.chart_spec.title ?? text);
      }
    } catch (err) {
      addMessage({
        role: 'model',
        content: `❌ Erro ao processar sua solicitação: ${err.message}`,
        isError: true,
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, messages, addMessage, addChart]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-panel__header">
        <Bot size={18} aria-hidden="true" />
        <span>Assistente de Gráficos</span>
        <span className="chat-panel__header-badge">Gemini</span>
      </div>

      <div className="chat-panel__messages" role="log" aria-live="polite" aria-label="Chat">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`chat-msg chat-msg--${msg.role}${msg.isError ? ' chat-msg--error' : ''}`}
          >
            <div className="chat-msg__avatar" aria-hidden="true">
              {msg.role === 'model' ? <Bot size={14} /> : <User size={14} />}
            </div>
            <div className="chat-msg__bubble">
              {msg.content.split('\n').map((line, j) => (
                <span key={j}>
                  {line}
                  {j < msg.content.split('\n').length - 1 && <br />}
                </span>
              ))}
              {msg.chart_spec && (
                <span className="chat-msg__chart-badge">
                  <BarChart2 size={12} aria-hidden="true" />
                  Gráfico gerado
                </span>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-msg chat-msg--model chat-msg--loading">
            <div className="chat-msg__avatar" aria-hidden="true">
              <Bot size={14} />
            </div>
            <div className="chat-msg__bubble">
              <Loader size={14} className="chat-loading-spinner" aria-hidden="true" />
              <span>Gerando...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="chat-panel__input-area">
        <textarea
          ref={inputRef}
          className="chat-panel__textarea"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Serviço indisponível' : 'Descreva o gráfico que deseja…'}
          disabled={disabled || loading}
          rows={2}
          aria-label="Mensagem para o assistente de gráficos"
        />
        <button
          type="button"
          className="chat-panel__send-btn"
          onClick={handleSend}
          disabled={disabled || loading || !input.trim()}
          aria-label="Enviar mensagem"
        >
          <Send size={16} aria-hidden="true" />
        </button>
      </div>

      {disabled && (
        <p className="chat-panel__offline-notice" role="alert">
          Serviço de analytics offline. Inicie o servidor Python para usar o chat.
        </p>
      )}
    </div>
  );
}
