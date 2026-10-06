import { Link } from 'react-router-dom';
import './NotFoundPage.css';

/**
 * Página 404 — exibida quando a rota não existe.
 * Conforme seção 7.4 do SPEC.
 */
export default function NotFoundPage() {
  return (
    <div className="not-found">
      <p className="not-found__code">404</p>
      <h1 className="not-found__title">Página não encontrada</h1>
      <p className="not-found__message">O endereço acessado não existe ou foi removido.</p>
      <Link to="/alerts" className="not-found__link">
        ← Voltar para alertas
      </Link>
    </div>
  );
}
