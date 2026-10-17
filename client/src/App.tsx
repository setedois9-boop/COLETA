import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from './context/ConfigContext';
import { AuthProvider } from './context/AuthContext';
import { LiveUpdatesProvider } from './context/LiveUpdatesContext';
import { ScrollToTop } from './components/ScrollToTop';
import { Home } from './pages/Home';
import { Cadastro } from './pages/Cadastro/Cadastro';
import { CadastroConcluido } from './pages/CadastroConcluido';
import { AdminLogin } from './pages/Admin/AdminLogin';
import { AdminLayout } from './pages/Admin/AdminLayout';
import { AdminDashboard } from './pages/Admin/AdminDashboard';
import { AdminSolicitacoes } from './pages/Admin/AdminSolicitacoes';
import { AdminSolicitacaoDetalhes } from './pages/Admin/AdminSolicitacaoDetalhes';
import { AdminConfiguracoes } from './pages/Admin/AdminConfiguracoes';

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
          </LiveUpdatesProvider>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
};

export default App;
