import { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Archive } from 'lucide-react';
import RiskBadge from '../components/alerts/RiskBadge.jsx';
import StatusBadge from '../components/alerts/StatusBadge.jsx';
import ConfirmDialog from '../components/feedback/ConfirmDialog.jsx';
import { SkeletonDetail } from '../components/feedback/Skeleton.jsx';
import { useAlert } from '../hooks/useAlert.js';
import { useUpdateAlert } from '../hooks/useUpdateAlert.js';
import { useDeleteAlert } from '../hooks/useDeleteAlert.js';
import { INCIDENTE_STATUS_LABELS, FALHA_CATEGORIA_LABELS } from '../constants/alerts.js';
import './AlertDetailPage.css';

/**
 * Página de detalhe do incidente (/alerts/:id).
 */
export default function AlertDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const alertQuery = useAlert(id);
  const updateMutation = useUpdateAlert(id);
  const deleteMutation = useDeleteAlert(id);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [archiveSuccess, setArchiveSuccess] = useState(false);

  const [statusError, setStatusError] = useState(null);
  const [actionsError, setActionsError] = useState(null);

  const alert = alertQuery.data?.data ?? null;

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleStatusChange = useCallback(
    async (e) => {
      setStatusError(null);
      try {
        await updateMutation.mutateAsync({ incidente_status: e.target.value });
      } catch (err) {
        setStatusError(err?.message ?? 'Erro ao alterar situação.');
      }
    },
    [updateMutation],
  );

  const handleActionToggle = useCallback(
    async (index) => {
      if (!alert?.acoes) return;
      setActionsError(null);

      const updatedAcoes = alert.acoes.map((acao, i) =>
        i === index ? { ...acao, done: !acao.done } : acao,
      );

      try {
        await updateMutation.mutateAsync({ acoes: updatedAcoes });
      } catch (err) {
        setActionsError(err?.message ?? 'Erro ao atualizar ação.');
      }
    },
    [alert, updateMutation],
  );

  const handleArchive = useCallback(async () => {
    try {
      await deleteMutation.mutateAsync();
      setArchiveSuccess(true);
      setShowConfirmDialog(false);
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
              <p className="alert-detail-page__error-title">Incidente não encontrado.</p>
              <p className="alert-detail-page__error-desc">
                O incidente que você está procurando não existe ou foi removido.
              </p>
            </>
          ) : (
            <>
              <p className="alert-detail-page__error-title">
                {alertQuery.error?.message?.includes('conectar')
                  ? 'Não foi possível conectar ao servidor.'
                  : 'Erro ao carregar o incidente.'}
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

  const doneCount = (alert.acoes ?? []).filter((a) => a.done).length;
  const totalCount = (alert.acoes ?? []).length;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="alert-detail-page">
      {/* Confirmação de arquivamento */}
      {archiveSuccess && (
        <div className="alert-detail-page__archive-toast" role="status" aria-live="polite">
          Incidente arquivado com sucesso.
        </div>
      )}

      {/* 1. Cabeçalho */}
      <header className="alert-detail-page__header">
        <button
          type="button"
          className="alert-detail-page__back-btn"
          onClick={() => navigate(-1)}
          aria-label="Voltar para incidentes"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar para incidentes
        </button>

        <div className="alert-detail-page__title-row">
          <h1 className="alert-detail-page__title">
            {alert.falha_descricao ?? alert.id_falha}
          </h1>
          <div className="alert-detail-page__badges">
            <RiskBadge risk={alert.falha_risco} />
            <StatusBadge status={alert.incidente_status} />
          </div>
        </div>
      </header>

      {/* 2. Grade de informações do incidente */}
      <section className="alert-detail-page__info-grid" aria-label="Resumo do incidente">
        <div className="info-grid__item">
          <span className="info-grid__label">ID do incidente</span>
          <span className="info-grid__value">{alert.id_falha}</span>
        </div>

        <div className="info-grid__item">
          <span className="info-grid__label">Categoria</span>
          <span className="info-grid__value">
            {FALHA_CATEGORIA_LABELS[alert.falha_categoria] ?? alert.falha_categoria ?? '—'}
          </span>
        </div>

        <div className="info-grid__item">
          <span className="info-grid__label">Localização</span>
          <span className="info-grid__value">{alert.falha_localizacao ?? '—'}</span>
        </div>

        <div className="info-grid__item">
          <span className="info-grid__label">Cliente</span>
          <span className="info-grid__value">
            {alert.cliente_nome ?? alert.cliente_id}
            {alert.cliente_banda && (
              <span className="info-grid__sub"> · {alert.cliente_banda}</span>
            )}
          </span>
        </div>

        <div className="info-grid__item">
          <span className="info-grid__label">Dispositivo</span>
          <span className="info-grid__value">
            {alert.dispositivo_nome ?? alert.dispositivo_id ?? '—'}
            {alert.dispositivo_tipo_conexao && (
              <span className="info-grid__sub"> · {alert.dispositivo_tipo_conexao}</span>
            )}
          </span>
        </div>

        {alert.dispositivo_no_pai && (
          <div className="info-grid__item">
            <span className="info-grid__label">Nó pai</span>
            <span className="info-grid__value">{alert.dispositivo_no_pai}</span>
          </div>
        )}

        {alert.perda_pacotes_pct !== null && alert.perda_pacotes_pct !== undefined && (
          <div className="info-grid__item">
            <span className="info-grid__label">Perda de pacotes</span>
            <span className="info-grid__value">{alert.perda_pacotes_pct}%</span>
          </div>
        )}

        {alert.latencia_ms !== null && alert.latencia_ms !== undefined && (
          <div className="info-grid__item">
            <span className="info-grid__label">Latência</span>
            <span className="info-grid__value">{alert.latencia_ms} ms</span>
          </div>
        )}

        <div className="info-grid__item">
          <span className="info-grid__label">Início da falha</span>
          <span className="info-grid__value">{alert.falha_inicio ?? '—'}</span>
        </div>

        {alert.falha_resolucao && (
          <div className="info-grid__item">
            <span className="info-grid__label">Resolução</span>
            <span className="info-grid__value">{alert.falha_resolucao}</span>
          </div>
        )}

        <div className="info-grid__item">
          <span className="info-grid__label">Ação automatizada</span>
          <span className="info-grid__value">
            {alert.acao_automatizada ? 'Sim' : 'Não'}
          </span>
        </div>

        <div className="info-grid__item">
          <span className="info-grid__label">Registrado em</span>
          <span className="info-grid__value">{alert.created_at}</span>
        </div>

        <div className="info-grid__item">
          <span className="info-grid__label">Atualizado em</span>
          <span className="info-grid__value">{alert.updated_at}</span>
        </div>
      </section>

      {/* 3. Situação */}
      <section className="alert-detail-page__section" aria-label="Situação do incidente">
        <h2 className="section__title">Situação</h2>
        <div className="section__status-row">
          <label htmlFor="alert-status" className="section__label">
            Alterar situação:
          </label>
          <select
            id="alert-status"
            className="section__select"
            value={alert.incidente_status}
            onChange={handleStatusChange}
            disabled={updateMutation.isPending}
            aria-describedby={statusError ? 'status-error' : undefined}
          >
            {Object.entries(INCIDENTE_STATUS_LABELS).map(([value, label]) => (
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
      <section className="alert-detail-page__section" aria-label="Contexto do incidente">
        <h2 className="section__title">Contexto</h2>
        {alert.contexto ? (
          <p className="section__context">{alert.contexto}</p>
        ) : (
          <p className="section__empty">Sem contextualização disponível.</p>
        )}
      </section>

      {/* 5. Solução aplicada (quando houver) */}
      {alert.solucao_aplicada && (
        <section className="alert-detail-page__section" aria-label="Solução aplicada">
          <h2 className="section__title">Solução aplicada</h2>
          <p className="section__context">{alert.solucao_aplicada}</p>
        </section>
      )}

      {/* 6. Causas prováveis */}
      <section className="alert-detail-page__section" aria-label="Causas prováveis">
        <h2 className="section__title">Causas prováveis</h2>
        {alert.causas?.length > 0 ? (
          <ul className="section__causes-list">
            {alert.causas.map((causa, i) => (
              <li key={i}>{causa}</li>
            ))}
          </ul>
        ) : (
          <p className="section__empty">Nenhuma causa informada.</p>
        )}
      </section>

      {/* 7. Ações recomendadas (checklist) */}
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
            {alert.acoes.map((acao, index) => (
              <li key={index} className={`checklist__item ${acao.done ? 'checklist__item--done' : ''}`}>
                <label className="checklist__label">
                  <input
                    type="checkbox"
                    className="checklist__checkbox"
                    checked={acao.done}
                    onChange={() => handleActionToggle(index)}
                    disabled={updateMutation.isPending}
                    aria-label={acao.text}
                  />
                  <span className={`checklist__text ${acao.done ? 'checklist__text--done' : ''}`}>
                    {acao.text}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="section__empty">Nenhuma ação recomendada.</p>
        )}
      </section>

      {/* 8. Arquivar incidente */}
      <section className="alert-detail-page__section alert-detail-page__section--archive" aria-label="Arquivar incidente">
        <div className="archive__row">
          <div className="archive__info">
            <h2 className="section__title">Arquivar incidente</h2>
            <p className="section__help-text">
              O incidente sairá da lista, mas será mantido no sistema.
            </p>
          </div>
          <button
            type="button"
            className="btn btn--secondary archive__btn"
            onClick={() => setShowConfirmDialog(true)}
            disabled={deleteMutation.isPending || archiveSuccess}
            aria-label="Arquivar incidente"
          >
            <Archive size={15} aria-hidden="true" />
            Arquivar
          </button>
        </div>
        {deleteMutation.isError && (
          <p className="section__error" role="alert">
            {deleteMutation.error?.message ?? 'Erro ao arquivar o incidente.'}
          </p>
        )}
      </section>

      {/* Dialog de confirmação */}
      <ConfirmDialog
        open={showConfirmDialog}
        title="Arquivar incidente"
        message="O incidente sairá da lista, mas será mantido no sistema."
        confirmLabel="Arquivar"
        cancelLabel="Cancelar"
        isLoading={deleteMutation.isPending}
        onConfirm={handleArchive}
        onCancel={() => setShowConfirmDialog(false)}
      />
    </div>
  );
}
