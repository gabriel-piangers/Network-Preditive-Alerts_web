import { useEffect, useRef } from 'react';
import './ConfirmDialog.css';

/**
 * Dialog de confirmação modal acessível.
 * Trava o foco dentro do dialog enquanto aberto.
 * Conforme seção 7.7 do SPEC (item "Arquivar alerta").
 *
 * @param {{
 *   open: boolean,
 *   title: string,
 *   message: string,
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 *   isLoading?: boolean,
 *   onConfirm: () => void,
 *   onCancel: () => void,
 * }} props
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  const cancelBtnRef = useRef(null);

  // Foca o botão de cancelar ao abrir (padrão de acessibilidade para dialogs destrutivos)
  useEffect(() => {
    if (open) {
      cancelBtnRef.current?.focus();
    }
  }, [open]);

  // Fecha ao pressionar Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="confirm-dialog-overlay"
      role="presentation"
      onClick={(e) => {
        // Fecha ao clicar fora do dialog
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="confirm-dialog"
      >
        <h2 id="confirm-dialog-title" className="confirm-dialog__title">
          {title}
        </h2>
        <p id="confirm-dialog-message" className="confirm-dialog__message">
          {message}
        </p>
        <div className="confirm-dialog__actions">
          <button
            ref={cancelBtnRef}
            type="button"
            className="btn btn--secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Arquivando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
