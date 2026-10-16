import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, BarChart2, Loader } from 'lucide-react';
import { sendChatMessage } from '../../api/analytics.js';
import './ChatPanel.css';

/**
 * Painel de chat com o Gemini para solicitar geração de gráficos.
 *
 * Props:
 *  onChartGenerated(chart, spec, title) — chamado sempre que um gráfico novo chegar
 *  disabled — desabilita o input quando o serviço está indisponível
 */
export default function ChatPanel({ onChartGenerated, disabled = false }) {
  const [messages, setMessages] = useState([
    {
      role: 'model',
      content:
        'Olá! Sou o assistente de Analytics. Peça-me para criar gráficos comparativos dos dados de incidentes de rede.\n\nExemplos:\n• "Mostre um gráfico de barras com incidentes por nível de risco"\n• "Quero um pizza com a distribuição por status"\n• "Compare latência média por categoria de falha"\n• "Mostre a correlação entre perda de pacotes e latência"',
    },
  ]);
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

    const userMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    // Histórico para o backend (exclui a mensagem de boas-vindas)
    const historyForApi = updatedMessages.slice(1).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const result = await sendChatMessage(text, historyForApi.slice(0, -1));

      setMessages((prev) => [
        ...prev,
        { role: 'model', content: result.text },
      ]);

      if (result.chart && result.chart_spec) {
        onChartGenerated(result.chart, result.chart_spec, result.chart_spec.title ?? text);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content: `❌ Erro ao processar sua solicitação: ${err.message}`,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, messages, onChartGenerated]);

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
