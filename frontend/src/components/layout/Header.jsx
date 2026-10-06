import { Link } from 'react-router-dom';
import { Network } from 'lucide-react';
import './Header.css';

/**
 * Cabeçalho fixo da aplicação.
 * Exibe o nome do sistema e link para a lista de alertas.
 * Conforme seção 7.5 do SPEC.
 */
export default function Header() {
  return (
    <header className="header">
      <div className="header__inner">
        <Link to="/alerts" className="header__brand" aria-label="Ir para lista de alertas">
          <Network size={20} aria-hidden="true" />
          <span className="header__title">Alertas Preditivos de Rede</span>
        </Link>
        <nav className="header__nav" aria-label="Navegação principal">
          <Link to="/alerts" className="header__nav-link">
            Alertas
          </Link>
        </nav>
      </div>
    </header>
  );
}
