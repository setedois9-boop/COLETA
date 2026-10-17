import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Volume2, VolumeX, X, ArrowRight, Store, MapPin, Sparkles, CheckCircle2 } from 'lucide-react';
import { checkLiveUpdates } from '../services/api';
import { Solicitacao } from '../types';
import { useAuth } from './AuthContext';

interface LiveNotification {
  id: number;
  protocolo: string;
  nome_fantasia: string;
  razao_social?: string;
  cidade: string;
  estado: string;
  criado_em: string;
  timestamp: number;
}

interface LiveUpdatesContextType {
  lastUpdated: Date;
  refreshCount: number;
  notifications: LiveNotification[];
  soundEnabled: boolean;
  toggleSound: () => void;
  requestNotificationPermission: () => Promise<void>;
  desktopPermission: NotificationPermission | 'unsupported';
  dismissNotification: (id: number) => void;
  clearAllNotifications: () => void;
  openSolicitacao: (id: number) => void;
}

const LiveUpdatesContext = createContext<LiveUpdatesContextType>({
  lastUpdated: new Date(),
  refreshCount: 0,
  notifications: [],
  soundEnabled: true,
  toggleSound: () => {},
  requestNotificationPermission: async () => {},
  desktopPermission: 'default',
  dismissNotification: () => {},
  clearAllNotifications: () => {},
  openSolicitacao: () => {},
});

function playChimeSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Tom 1 - E5 (659.25Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    // Tom 2 - B5 (987.77Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.12);
    gain2.gain.setValueAtTime(0.24, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.75);
  } catch (err) {
    console.warn('AudioContext prevented or not supported:', err);
  }
}

export const LiveUpdatesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // As notificações, som e checagens automáticas devem operar EXCLUSIVAMENTE dentro do painel de admin
  const isInAdminPanel =
    Boolean(isAuthenticated) &&
    location.pathname.startsWith('/admin') &&
    location.pathname !== '/admin/login';

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshCount, setRefreshCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('admin_sound_enabled') !== 'false';
  });

  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission | 'unsupported'>('default');

  const highestIdRef = useRef<number>(0);
  const initialSyncRef = useRef<boolean>(false);

  useEffect(() => {
    if ('Notification' in window) {
      setDesktopPermission(Notification.permission);
    } else {
      setDesktopPermission('unsupported');
    }
  }, []);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('admin_sound_enabled', String(next));
      if (next && isInAdminPanel) playChimeSound();
      return next;
    });
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setDesktopPermission(perm);
      } catch {}
    }
  };

  const dismissNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const openSolicitacao = useCallback(
    (id: number) => {
      dismissNotification(id);
      navigate(`/admin/solicitacoes/${id}`);
    },
    [dismissNotification, navigate]
  );

  // Polling a cada 5 segundos SOMENTE quando o usuário estiver no painel de administração autenticado
  useEffect(() => {
    if (!isInAdminPanel) {
      initialSyncRef.current = false;
      highestIdRef.current = 0;
      setNotifications([]);
      return;
    }

    let isMounted = true;

    const poll = async () => {
      try {
        const res = await checkLiveUpdates(highestIdRef.current);
        if (!isMounted) return;

        setLastUpdated(new Date());
        setRefreshCount((c) => c + 1);

        if (!initialSyncRef.current) {
          // Na primeira sincronização, definir highestIdRef com base nos registros existentes sem disparar alerta
          if (res.novos && res.novos.length > 0) {
            const maxId = Math.max(...res.novos.map((n) => n.id));
            highestIdRef.current = Math.max(highestIdRef.current, maxId);
          }
          initialSyncRef.current = true;
          return;
        }

        // Se houver novos registros após a inicialização dentro do painel de admin:
        if (res.novos && res.novos.length > 0) {
          const maxId = Math.max(...res.novos.map((n) => n.id));
          highestIdRef.current = Math.max(highestIdRef.current, maxId);

          // Tocar som de notificação apenas no painel admin
          if (soundEnabled) {
            playChimeSound();
          }

          // Adicionar às notificações ativas
          const newNotifs: LiveNotification[] = res.novos.map((item) => ({
            id: item.id,
            protocolo: item.protocolo,
            nome_fantasia: item.nome_fantasia,
            razao_social: item.razao_social,
            cidade: item.cidade,
            estado: item.estado,
            criado_em: item.criado_em,
            timestamp: Date.now(),
          }));

          setNotifications((prev) => [...newNotifs, ...prev].slice(0, 5));

          // Notificação de desktop nativa (Windows)
          res.novos.forEach((novo) => {
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                const n = new Notification(`🔔 Novo Cadastro: ${novo.nome_fantasia}`, {
                  body: `Protocolo ${novo.protocolo} • ${novo.cidade}/${novo.estado}\nClique para ver todos os dados informados.`,
                  icon: '/favicon.ico',
                  tag: `solicitacao-${novo.id}`,
                });
                n.onclick = () => {
                  window.focus();
                  navigate(`/admin/solicitacoes/${novo.id}`);
                  n.close();
                };
              } catch {}
            }
          });
        }
      } catch (err) {
        console.warn('Erro silencioso no polling ao vivo:', err);
      }
    };

    // Executar imediatamente e depois a cada 5 segundos
    poll();
    const interval = setInterval(poll, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isInAdminPanel, soundEnabled, navigate]);

  return (
    <LiveUpdatesContext.Provider
      value={{
        lastUpdated,
        refreshCount,
        notifications,
        soundEnabled,
        toggleSound,
        requestNotificationPermission,
        desktopPermission,
        dismissNotification,
        clearAllNotifications,
        openSolicitacao,
      }}
    >
      {children}

      {/* Container de Notificações Flutuantes (Toast) exibido EXCLUSIVAMENTE dentro do painel admin */}
      {notifications.length > 0 && isInAdminPanel && (
        <aside
          aria-label="Notificações em tempo real"
          className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm sm:max-w-md w-[calc(100vw-2.5rem)] pointer-events-none animate-fadeIn"
        >
          {notifications.map((notif) => (
            <div
              key={notif.id}
              role="status"
              className="pointer-events-auto bg-slate-900/95 backdrop-blur-xl text-white rounded-2xl p-4 sm:p-5 shadow-2xl border-2 border-orange-500/80 shadow-orange-500/20 transition-all hover:scale-[1.02] cursor-pointer group"
              onClick={() => openSolicitacao(notif.id)}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                  </span>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-orange-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Novo Cadastro Finalizado!
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissNotification(notif.id);
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Dispensar notificação"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1 mb-3">
                <h4 className="font-extrabold text-base text-white tracking-tight flex items-center gap-1.5 group-hover:text-orange-300 transition-colors">
                  <Store className="w-4 h-4 text-orange-500 shrink-0" />
                  {notif.nome_fantasia}
                </h4>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className="font-mono bg-slate-800/80 px-2 py-0.5 rounded-md text-orange-300 border border-slate-700">
                    {notif.protocolo}
                  </span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {notif.cidade}/{notif.estado}
                  </span>
                </div>
              </div>

              {/* Botão de Ação Direta para abrir todos os dados */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Clique para abrir</span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-400 group-hover:translate-x-1 transition-transform">
                  Ver todos os dados informados
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </aside>
      )}
    </LiveUpdatesContext.Provider>
  );
};

export const useLiveUpdates = () => useContext(LiveUpdatesContext);
