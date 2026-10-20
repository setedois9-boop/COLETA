import React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Settings,
  ExternalLink,
  LogOut,
  Package,
  Shield,
  Menu,
  X,
  Volume2,
  VolumeX,
  Bell,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useLiveUpdates } from '../../context/LiveUpdatesContext';
import { AdminErrorBoundary } from '../../components/Admin/AdminErrorBoundary';

export const AdminLayout: React.FC = () => {
  const { admin, isAuthenticated, loading, logout } = useAuth();
  const { config } = useConfig();
  const { soundEnabled, toggleSound, desktopPermission, requestNotificationPermission } = useLiveUpdates();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/admin/login');
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm">
        Carregando painel de administração...
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const navItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Solicitações', path: '/admin/solicitacoes', icon: ClipboardList },
    { label: 'Configurações', path: '/admin/configuracoes', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível confirmar o encerramento da sessão no servidor.');
    } finally {
      navigate('/admin/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white shrink-0 border-r border-slate-800">
        {/* Header da Sidebar */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center font-bold text-white shadow-md shadow-orange-600/30">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-sm block tracking-tight">
              {config?.nome_site || 'Ponto de Coleta'}
            </span>
            <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">
              Painel de Gestão
            </span>
          </div>
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-4 mt-4 border-t border-slate-800 space-y-3">
            {/* Widget de Monitoramento em Tempo Real */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Ao Vivo (5s)
                </span>

                <button
                  type="button"
                  onClick={toggleSound}
                  className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                  title={soundEnabled ? 'Silenciar som de novo cadastro' : 'Ativar som de novo cadastro'}
                >
                  {soundEnabled ? (
                    <Volume2 className="w-3.5 h-3.5 text-orange-400" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </button>
              </div>

              {desktopPermission === 'default' && (
                <button
                  type="button"
                  onClick={requestNotificationPermission}
                  className="w-full py-1.5 px-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 hover:text-orange-200 border border-orange-500/30 rounded-lg text-[10px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Bell className="w-3 h-3" />
                  Ativar alertas do Windows
                </button>
              )}
            </div>

            <Link
              to="/"
              target="_blank"
              className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-slate-500" />
                Ver Site Público
              </span>
            </Link>
          </div>
        </nav>

        {/* Rodapé da Sidebar: Administrador & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-orange-400 shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{admin?.nome || 'Admin'}</p>
                <p className="text-[10px] text-slate-400 truncate">{admin?.email}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Sair do painel"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Header Mobile */}
      <header className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center font-bold">
            <Package className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm">{config?.nome_site || 'Admin'}</span>
        </div>

        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-slate-300 hover:text-white"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Drawer Mobile */}
      {sidebarOpen && (
        <div className="md:hidden bg-slate-900 text-white px-4 py-4 space-y-2 border-b border-slate-800">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-800"
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          ))}
          <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
            <Link to="/" target="_blank" className="text-slate-400 hover:text-white">
              Ver Site Público
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="text-red-400 font-bold"
            >
              Sair
            </button>
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto min-w-0 max-w-full overflow-x-hidden">
        <AdminErrorBoundary>
          <Outlet />
        </AdminErrorBoundary>
      </main>
    </div>
  );
};
