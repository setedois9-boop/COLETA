import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ConfigProvider } from './context/ConfigContext';
import { AuthProvider } from './context/AuthContext';
import { LiveUpdatesProvider } from './context/LiveUpdatesContext';
import { ScrollToTop } from './components/ScrollToTop';
import { WhatsAppFloatingButton } from './components/WhatsAppFloatingButton';
import { Home } from './pages/Home';
import { Cadastro } from './pages/Cadastro/Cadastro';
import { CadastroConcluido } from './pages/CadastroConcluido';
import { AdminLogin } from './pages/Admin/AdminLogin';
import { AdminLayout } from './pages/Admin/AdminLayout';
import { AdminDashboard } from './pages/Admin/AdminDashboard';
import { AdminSolicitacoes } from './pages/Admin/AdminSolicitacoes';
import { AdminSolicitacaoDetalhes } from './pages/Admin/AdminSolicitacaoDetalhes';
import { AdminConfiguracoes } from './pages/Admin/AdminConfiguracoes';

const PublicWhatsAppButton: React.FC = () => {
  const location = useLocation();
  if (location.pathname.startsWith('/admin')) return null;
  return <WhatsAppFloatingButton />;
};

export const App: React.FC = () => {
  return (
    <ConfigProvider>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <LiveUpdatesProvider>
            <Routes>
              {/* Rotas Públicas */}
              <Route path="/" element={<Home />} />
              <Route path="/cadastro" element={<Cadastro />} />
              <Route path="/cadastro/concluido" element={<CadastroConcluido />} />

              {/* Rotas Administrativas */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="solicitacoes" element={<AdminSolicitacoes />} />
                <Route path="solicitacoes/:id" element={<AdminSolicitacaoDetalhes />} />
                <Route path="configuracoes" element={<AdminConfiguracoes />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <PublicWhatsAppButton />
          </LiveUpdatesProvider>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
};

export default App;
