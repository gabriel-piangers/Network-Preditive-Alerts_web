import Header from './Header.jsx';
import './AppLayout.css';

/**
 * Layout principal da aplicação.
 * Cabeçalho fixo + conteúdo centralizado com largura máxima.
 * Conforme seção 7.5 do SPEC.
 */
export default function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Header />
      <main className="app-layout__main">
        <div className="app-layout__content">{children}</div>
      </main>
    </div>
  );
}
