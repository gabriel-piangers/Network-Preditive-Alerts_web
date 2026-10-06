import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import AlertsListPage from './pages/AlertsListPage.jsx';
import AlertDetailPage from './pages/AlertDetailPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

/**
 * Raiz das rotas da aplicação.
 * Conforme seção 7.4 do SPEC.
 */
export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/alerts" replace />} />
        <Route path="/alerts" element={<AlertsListPage />} />
        <Route path="/alerts/:id" element={<AlertDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  );
}
