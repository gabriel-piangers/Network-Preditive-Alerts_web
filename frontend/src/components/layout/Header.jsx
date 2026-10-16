import { Link, useLocation } from 'react-router-dom';
import { Network } from 'lucide-react';
import './Header.css';

/**
 * Cabeçalho fixo da aplicação.
 * Exibe o nome do sistema e links de navegação.
 * Conforme seção 7.5 do SPEC.
 */
export default function Header() {
  const { pathname } = useLocation();

  return (
    <header className="header">
      <div className="header__inner">
        <Link to="/alerts" className="header__brand" aria-label="Ir para lista de alertas">
          <Network size={20} aria-hidden="true" />
          <span className="header__title">Agente de Monitoramento da Rede</span>
        </Link>
        <nav className="header__nav" aria-label="Navegação principal">
          <Link
            to="/alerts"
            className={`header__nav-link${pathname.startsWith('/alerts') ? ' header__nav-link--active' : ''}`}
          >
            Alertas
          </Link>
          <Link
            to="/analytics"
            className={`header__nav-link${pathname.startsWith('/analytics') ? ' header__nav-link--active' : ''}`}
          >
            Analytics
          </Link>
        </nav>
      </div>
    </header>
  );
}
