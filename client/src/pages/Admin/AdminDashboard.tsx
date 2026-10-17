import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Inbox,
  Clock,
  PhoneCall,
  FileQuestion,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Calendar,
  Store,
  ChevronRight,
  Loader2,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { fetchDashboardData } from '../../services/api';
import { Solicitacao } from '../../types';
import { useLiveUpdates } from '../../context/LiveUpdatesContext';
import { SolicitacaoOverlayModal } from '../../components/Admin/SolicitacaoOverlayModal';

export const AdminDashboard: React.FC = () => {
  const { refreshCount } = useLiveUpdates();
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [overlaySolicitacaoId, setOverlaySolicitacaoId] = useState<number | null>(null);
  const [data, setData] = useState<{
    stats: {
      total: number;
      recebido: number;
      em_analise: number;
      aguardando_contato: number;
      documentacao_pendente: number;
      aprovado: number;
      rejeitado: number;
      ultimos_7_dias: number;
      mes_atual: number;
    };
    timeline: Array<{ data: string; label: string; quantidade: number }>;
    tipos_comercio: Array<{ tipo_comercio: string; count: number }>;
    recentes: Solicitacao[];
  } | null>(null);

  const loadData = async (showFullLoading = true) => {
    if (showFullLoading) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const res = await fetchDashboardData();
      setData(res);
      setLastSync(new Date());
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      if (showFullLoading) setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Carregar dados no mount e re-executar a cada 5s
  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => {
      loadData(false);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Quando o LiveUpdatesContext disparar atualização de novo registro, recarregar imediatamente
  useEffect(() => {
    if (refreshCount > 0) {
      loadData(false);
    }
  }, [refreshCount]);

  if (loading && !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  const stats = data?.stats || {
    total: 0,
    recebido: 0,
    em_analise: 0,
    aguardando_contato: 0,
    documentacao_pendente: 0,
    aprovado: 0,
    rejeitado: 0,
    ultimos_7_dias: 0,
    mes_atual: 0,
  };

  const maxTimelineCount = Math.max(1, ...(data?.timeline.map((t) => t.quantidade) || [1]));

  return (
    <div className="p-4 sm:p-8 lg:p-10 space-y-6 sm:space-y-8 max-w-full overflow-x-hidden">
      {/* Cabeçalho do Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Dashboard Operacional
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Ao vivo • Atualiza a cada 5s
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Visão consolidada em tempo real • Última sincronização: {lastSync.toLocaleTimeString('pt-BR')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadData(false)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-600' : ''}`} />
          {isRefreshing ? 'Atualizando...' : 'Atualizar Dados'}
        </button>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Total Geral */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 block">{stats.total}</span>
          <span className="text-[11px] text-slate-400 font-medium">Solicitações cadastradas</span>
        </div>

        {/* Recebido (Novas) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Novas</span>
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-orange-600 block">{stats.recebido}</span>
          <span className="text-[11px] text-slate-400 font-medium">Aguardando triagem inicial</span>
        </div>

        {/* Em Análise */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Em Análise</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 block">{stats.em_analise}</span>
          <span className="text-[11px] text-slate-400 font-medium">Verificação geográfica</span>
        </div>

        {/* Aguardando Contato */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Aguardando Contato</span>
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-purple-600 block">{stats.aguardando_contato}</span>
          <span className="text-[11px] text-slate-400 font-medium">Em contato via WhatsApp</span>
        </div>

        {/* Documentação Pendente */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Doc Pendente</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <FileQuestion className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 block">{stats.documentacao_pendente}</span>
          <span className="text-[11px] text-slate-400 font-medium">Fotos ou dados pendentes</span>
        </div>

        {/* Aprovadas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Aprovadas</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 block">{stats.aprovado}</span>
          <span className="text-[11px] text-slate-400 font-medium">Habilitadas para operação</span>
        </div>

        {/* Rejeitadas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Rejeitadas</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 block">{stats.rejeitado}</span>
          <span className="text-[11px] text-slate-400 font-medium">Incompatíveis com a rota</span>
        </div>

        {/* Período recente (7 dias e Mês) */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Cadastros</span>
            <Calendar className="w-4 h-4 text-orange-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold">{stats.ultimos_7_dias}</span>
            <span className="text-xs text-slate-300">últimos 7 dias</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 pt-2 border-t border-slate-700">
            Total no mês atual: <strong className="text-white">{stats.mes_atual}</strong>
          </div>
        </div>
      </div>

      {/* Gráfico de Solicitações por Período & Distribuição por Ramo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico dos Últimos 14 Dias */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Volume de Solicitações (Últimos 14 Dias)
              </h3>
              <p className="text-xs text-slate-500">Distribuição diária de novos cadastros recebidos</p>
            </div>
            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg">
              Tempo Real
            </span>
          </div>

          <div className="overflow-x-auto max-w-full pb-2">
            <div className="min-w-[400px] sm:min-w-0 h-56 flex items-end justify-between gap-2 pt-6 pb-2 px-2">
              {data?.timeline.map((item, i) => {
                const heightPercent = Math.max(8, Math.round((item.quantidade / maxTimelineCount) * 100));
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <span className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.quantidade}
                    </span>
                    <div
                      className="w-full max-w-[28px] rounded-t-lg bg-orange-500/80 group-hover:bg-orange-600 transition-all cursor-pointer relative"
                      style={{ height: `${heightPercent}%` }}
                      title={`${item.label}: ${item.quantidade} solicitações`}
                    />
                    <span className="text-[10px] font-medium text-slate-400 rotate-0">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tipos de Comércio mais Frequentes */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-base">
              Ramos de Atividade
            </h3>
            <p className="text-xs text-slate-500">Tipos de comércios mais cadastrados</p>
          </div>

          <div className="space-y-3 pt-1">
            {data?.tipos_comercio && data.tipos_comercio.length > 0 ? (
              data.tipos_comercio.map((tc, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 truncate">{tc.tipo_comercio}</span>
                    <span className="text-slate-500 font-bold">{tc.count}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full"
                      style={{
                        width: `${Math.round((tc.count / (stats.total || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">Nenhum dado registrado ainda.</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabela de Solicitações Mais Recentes */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">
              Candidaturas Recentes
            </h3>
            <p className="text-xs text-slate-500">Últimos estabelecimentos inscritos no portal</p>
          </div>

          <Link
            to="/admin/solicitacoes"
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            Ver Todas ({stats.total})
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="py-3.5 px-6">Protocolo</th>
                <th className="py-3.5 px-4">Estabelecimento</th>
                <th className="py-3.5 px-4">Cidade / UF</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Data</th>
                <th className="py-3.5 px-6 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {data?.recentes && data.recentes.length > 0 ? (
                data.recentes.map((sol) => (
                  <tr key={sol.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">
                      <button
                        type="button"
                        onClick={() => setOverlaySolicitacaoId(sol.id)}
                        className="hover:text-orange-600 hover:underline cursor-pointer"
                        title="Abrir aba sobreposta"
                      >
                        {sol.protocolo}
                      </button>
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-800">
                      <button
                        type="button"
                        onClick={() => setOverlaySolicitacaoId(sol.id)}
                        className="text-left hover:text-orange-600 transition-colors cursor-pointer"
                        title="Abrir aba sobreposta"
                      >
                        {sol.nome_fantasia}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      {sol.cidade}/{sol.estado}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          sol.status === 'Recebido'
                            ? 'bg-orange-50 text-orange-700 border border-orange-200'
                            : sol.status === 'Em análise'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : sol.status === 'Aprovado'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : sol.status === 'Rejeitado'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {sol.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-mono">
                      {new Date(sol.criado_em).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => setOverlaySolicitacaoId(sol.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                        title="Abrir aba sobreposta com todos os dados"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Aba Sobreposta</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Nenhuma solicitação recebida ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Sobreposto / Aba Sobreposta com todos os dados */}
      {overlaySolicitacaoId !== null && (
        <SolicitacaoOverlayModal
          solicitacaoId={overlaySolicitacaoId}
          onClose={() => setOverlaySolicitacaoId(null)}
          onStatusUpdated={() => loadData(false)}
        />
      )}
    </div>
  );
};
