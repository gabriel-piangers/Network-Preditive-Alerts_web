import { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Archive } from 'lucide-react';
import RiskBadge from '../components/alerts/RiskBadge.jsx';
import StatusBadge from '../components/alerts/StatusBadge.jsx';
import AccuracyBar from '../components/alerts/AccuracyBar.jsx';
import ConfirmDialog from '../components/feedback/ConfirmDialog.jsx';
import { SkeletonDetail } from '../components/feedback/Skeleton.jsx';
import { useAlert } from '../hooks/useAlert.js';
import { useUpdateAlert } from '../hooks/useUpdateAlert.js';
import { useDeleteAlert } from '../hooks/useDeleteAlert.js';
import { ALERT_STATUS_LABELS, ALERT_TYPE_LABELS } from '../constants/alerts.js';
import { formatAbsolute, formatRelative, isPast } from '../utils/dates.js';
import './AlertDetailPage.css';

/**
 * Página de detalhe do alerta (/alerts/:id).
 * Conforme seção 7.7 do SPEC.
 */
export default function AlertDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const alertQuery = useAlert(id);
  const updateMutation = useUpdateAlert(id);
  const deleteMutation = useDeleteAlert(id);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [archiveSuccess, setArchiveSuccess] = useState(false);

  // Erros locais por seção
  const [statusError, setStatusError] = useState(null);
  const [actionsError, setActionsError] = useState(null);
  const [confirmedError, setConfirmedError] = useState(null);

  const alert = alertQuery.data?.data ?? null;

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleStatusChange = useCallback(
    async (e) => {
      setStatusError(null);
      try {
        await updateMutation.mutateAsync({ status: e.target.value });
      } catch (err) {
        setStatusError(err?.message ?? 'Erro ao alterar situação.');
      }
    },
    [updateMutation],
  );

  const handleActionToggle = useCallback(
    async (index) => {
      if (!alert?.actions) return;
      setActionsError(null);

      const updatedActions = alert.actions.map((action, i) =>
        i === index ? { ...action, done: !action.done } : action,
      );

      try {
        await updateMutation.mutateAsync({ actions: updatedActions });
      } catch (err) {
        setActionsError(err?.message ?? 'Erro ao atualizar ação.');
      }
    },
    [alert, updateMutation],
  );

  const handleConfirmedChange = useCallback(
    async (value) => {
      setConfirmedError(null);
      // value: 'true' | 'false' | 'null'
      const parsed = value === 'true' ? true : value === 'false' ? false : null;
      try {
        await updateMutation.mutateAsync({ confirmed: parsed });
      } catch (err) {
        setConfirmedError(err?.message ?? 'Erro ao salvar feedback.');
      }
    },
    [updateMutation],
  );

  const handleArchive = useCallback(async () => {
    try {
      await deleteMutation.mutateAsync();
      setArchiveSuccess(true);
      setShowConfirmDialog(false);
      // Pequena pausa para mostrar a confirmação antes de navegar
      setTimeout(() => navigate('/alerts'), 1200);
    } catch {
      setShowConfirmDialog(false);
    }
  }, [deleteMutation, navigate]);

  // ─── Estados de carregamento / erro ──────────────────────────────────────

  if (alertQuery.isLoading) {
    return (
      <div className="alert-detail-page">
        <SkeletonDetail />
      </div>
    );
  }

  if (alertQuery.isError) {
    const is404 = alertQuery.error?.status === 404;
    return (
      <div className="alert-detail-page">
        <div className="alert-detail-page__error" role="alert">
          {is404 ? (
            <>
              <p className="alert-detail-page__error-title">Alerta não encontrado.</p>
              <p className="alert-detail-page__error-desc">
                O alerta que você está procurando não existe ou foi removido.
              </p>
            </>
          ) : (
            <>
              <p className="alert-detail-page__error-title">
                {alertQuery.error?.message?.includes('conectar')
                  ? 'Não foi possível conectar ao servidor.'
                  : 'Erro ao carregar o alerta.'}
              </p>
              <p className="alert-detail-page__error-desc">
                {alertQuery.error?.message ?? 'Tente novamente.'}
              </p>
              <button
                type="button"
                className="retry-btn"
                onClick={() => alertQuery.refetch()}
              >
                Tentar novamente
              </button>
            </>
          )}
          <Link to="/alerts" className="alert-detail-page__back-link">
            ← Voltar para a lista
          </Link>
        </div>
      </div>
    );
  }

  if (!alert) return null;

  // ─── Dados derivados ──────────────────────────────────────────────────────

  const doneCount = (alert.actions ?? []).filter((a) => a.done).length;
  const totalCount = (alert.actions ?? []).length;

  const confirmedValue =
    alert.confirmed === true ? 'true' : alert.confirmed === false ? 'false' : 'null';

  const predictedPast = isPast(alert.predicted_for);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="alert-detail-page">
      {/* Confirmação de arquivamento */}
      {archiveSuccess && (
        <div className="alert-detail-page__archive-toast" role="status" aria-live="polite">
          Alerta arquivado com sucesso.
        </div>
      )}

      {/* 1. Cabeçalho */}
      <header className="alert-detail-page__header">
        <button
          type="button"
          className="alert-detail-page__back-btn"
          onClick={() => navigate(-1)}
          aria-label="Voltar para alertas"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar para alertas
        </button>

        <div className="alert-detail-page__title-row">
          <h1 className="alert-detail-page__title">{alert.title}</h1>
          <div className="alert-detail-page__badges">
            <RiskBadge risk={alert.risk} />
            <StatusBadge status={alert.status} />
          </div>
        </div>
      </header>

      {/* 2. Grade de informações */}
      <section className="alert-detail-page__info-grid" aria-label="Resumo do alerta">
        <div className="info-grid__item">
          <span className="info-grid__label">Tipo</span>
          <span className="info-grid__value">{ALERT_TYPE_LABELS[alert.type] ?? alert.type}</span>
        </div>

        <div className="info-grid__item">
          <span className="info-grid__label">Área</span>
          <span className="info-grid__value">{alert.area}</span>
        </div>

        <div className="info-grid__item">
          <span className="info-grid__label">Equipamentos</span>
          <span className="info-grid__value">
            {alert.equipments?.length > 0 ? (
              <ul className="info-grid__equipment-list">
                {alert.equipments.map((eq) => (
                  <li key={eq}>{eq}</li>
                ))}
              </ul>
            ) : (
              <span className="info-grid__empty">Nenhum equipamento</span>
            )}
          </span>
        </div>

        <div className="info-grid__item">
          <span className="info-grid__label">Previsão de ocorrência</span>
          <span
            className={`info-grid__value ${predictedPast ? 'info-grid__value--past' : ''}`}
            title={formatAbsolute(alert.predicted_for)}
          >
            {formatAbsolute(alert.predicted_for)}
            <span className="info-grid__relative">({formatRelative(alert.predicted_for)})</span>
          </span>
        </div>

        <div className="info-grid__item">
          <span className="info-grid__label">Certeza</span>
          <span className="info-grid__value">
            <AccuracyBar accuracy={alert.accuracy} />
          </span>
        </div>

        <div className="info-grid__item">
          <span className="info-grid__label">Criado em</span>
          <span className="info-grid__value">{formatAbsolute(alert.created_at)}</span>
        </div>

        <div className="info-grid__item">
          <span className="info-grid__label">Atualizado em</span>
          <span className="info-grid__value">{formatAbsolute(alert.updated_at)}</span>
        </div>
      </section>

      {/* 3. Situação */}
      <section className="alert-detail-page__section" aria-label="Situação do alerta">
        <h2 className="section__title">Situação</h2>
        <div className="section__status-row">
          <label htmlFor="alert-status" className="section__label">
            Alterar situação:
          </label>
          <select
            id="alert-status"
            className="section__select"
            value={alert.status}
            onChange={handleStatusChange}
            disabled={updateMutation.isPending}
            aria-describedby={statusError ? 'status-error' : undefined}
          >
            {Object.entries(ALERT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {updateMutation.isPending && (
            <span className="section__saving" aria-live="polite">Salvando…</span>
          )}
        </div>
        {statusError && (
          <p id="status-error" className="section__error" role="alert">
            {statusError}
          </p>
        )}
      </section>

      {/* 4. Contexto */}
      <section className="alert-detail-page__section" aria-label="Contexto do alerta">
        <h2 className="section__title">Contexto</h2>
        {alert.context ? (
          <p className="section__context">{alert.context}</p>
        ) : (
          <p className="section__empty">Sem contextualização disponível.</p>
        )}
      </section>

      {/* 5. Causas prováveis */}
      <section className="alert-detail-page__section" aria-label="Causas prováveis">
        <h2 className="section__title">Causas prováveis</h2>
        {alert.causes?.length > 0 ? (
          <ul className="section__causes-list">
            {alert.causes.map((cause, i) => (
              <li key={i}>{cause}</li>
            ))}
          </ul>
        ) : (
          <p className="section__empty">Nenhuma causa informada.</p>
        )}
      </section>

      {/* 6. Ações recomendadas (checklist) */}
      <section className="alert-detail-page__section" aria-label="Ações recomendadas">
        <h2 className="section__title">
          Ações recomendadas
          {totalCount > 0 && (
            <span className="section__progress" aria-label={`${doneCount} de ${totalCount} concluídas`}>
              {doneCount} de {totalCount} concluídas
            </span>
          )}
        </h2>

        {actionsError && (
          <p className="section__error" role="alert">
            {actionsError}
          </p>
        )}

        {totalCount > 0 ? (
          <ul className="section__checklist" role="list">
            {alert.actions.map((action, index) => (
              <li key={index} className={`checklist__item ${action.done ? 'checklist__item--done' : ''}`}>
                <label className="checklist__label">
                  <input
                    type="checkbox"
                    className="checklist__checkbox"
                    checked={action.done}
                    onChange={() => handleActionToggle(index)}
                    disabled={updateMutation.isPending}
                    aria-label={action.text}
                  />
                  <span className={`checklist__text ${action.done ? 'checklist__text--done' : ''}`}>
                    {action.text}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="section__empty">Nenhuma ação recomendada.</p>
        )}
      </section>

      {/* 7. Feedback da previsão */}
      <section className="alert-detail-page__section" aria-label="Feedback da previsão">
        <h2 className="section__title">Feedback da previsão</h2>
        <p className="section__help-text">
          Essa informação ajuda a medir a precisão do modelo.
        </p>

        <div className="section__confirmed-row" role="group" aria-label="A previsão se confirmou?">
          <span className="section__label">A previsão se confirmou?</span>
          <div className="section__confirmed-options">
            {[
              { value: 'true', label: 'Sim' },
              { value: 'false', label: 'Não' },
              { value: 'null', label: 'Ainda não avaliado' },
            ].map(({ value, label }) => (
              <label key={value} className="confirmed-option">
                <input
                  type="radio"
                  name="alert-confirmed"
                  className="confirmed-option__input"
                  value={value}
                  checked={confirmedValue === value}
                  onChange={() => handleConfirmedChange(value)}
                  disabled={updateMutation.isPending}
                />
                <span className="confirmed-option__label">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {confirmedError && (
          <p className="section__error" role="alert">
            {confirmedError}
          </p>
        )}
      </section>

      {/* 8. Arquivar alerta */}
      <section className="alert-detail-page__section alert-detail-page__section--archive" aria-label="Arquivar alerta">
        <div className="archive__row">
          <div className="archive__info">
            <h2 className="section__title">Arquivar alerta</h2>
            <p className="section__help-text">
              O alerta sairá da lista, mas será mantido no sistema.
            </p>
          </div>
          <button
            type="button"
            className="btn btn--secondary archive__btn"
            onClick={() => setShowConfirmDialog(true)}
            disabled={deleteMutation.isPending || archiveSuccess}
            aria-label="Arquivar alerta"
          >
            <Archive size={15} aria-hidden="true" />
            Arquivar
          </button>
        </div>
        {deleteMutation.isError && (
          <p className="section__error" role="alert">
            {deleteMutation.error?.message ?? 'Erro ao arquivar o alerta.'}
          </p>
        )}
      </section>

      {/* Dialog de confirmação */}
      <ConfirmDialog
        open={showConfirmDialog}
        title="Arquivar alerta"
        message="O alerta sairá da lista, mas será mantido no sistema."
        confirmLabel="Arquivar"
        cancelLabel="Cancelar"
        isLoading={deleteMutation.isPending}
        onConfirm={handleArchive}
        onCancel={() => setShowConfirmDialog(false)}
      />
    </div>
  );
}
