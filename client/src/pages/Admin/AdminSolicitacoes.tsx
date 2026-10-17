import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageCircle,
  Loader2,
  RefreshCw,
  Building,
  ExternalLink,
} from 'lucide-react';
import { fetchSolicitacoes, getAuthToken, API_BASE } from '../../services/api';
import { Solicitacao } from '../../types';
import { useLiveUpdates } from '../../context/LiveUpdatesContext';
import { SolicitacaoOverlayModal } from '../../components/Admin/SolicitacaoOverlayModal';

export const AdminSolicitacoes: React.FC = () => {
  const { refreshCount } = useLiveUpdates();
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [overlaySolicitacaoId, setOverlaySolicitacaoId] = useState<number | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('');

  const loadSolicitacoes = async (showFullLoading = true) => {
    if (showFullLoading) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const res = await fetchSolicitacoes({
        q: search,
        status: selectedStatus,
        estado: selectedEstado,
        page,
        limit,
      });
      setSolicitacoes(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Erro ao buscar lista de solicitações:', err);
    } finally {
      if (showFullLoading) setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadSolicitacoes(true);
  }, [page, limit, selectedStatus, selectedEstado]);

  // Atualização automática a cada 5s
  useEffect(() => {
    const interval = setInterval(() => {
      loadSolicitacoes(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [page, limit, selectedStatus, selectedEstado, search]);

  // Quando o live-check detectar novos registros
  useEffect(() => {
    if (refreshCount > 0) {
      loadSolicitacoes(false);
    }
  }, [refreshCount]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadSolicitacoes(true);
  };

  const handleExportCsv = () => {
    const token = getAuthToken();
    const url = `${API_BASE}/admin/export/csv${token ? `?token=${token}` : ''}`;
    // Fetch directly to download with Authorization header
    fetch(`${API_BASE}/admin/export/csv`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `solicitacoes_pontos_coleta_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err) => alert('Erro na exportação CSV: ' + err.message));
  };

  const statusOptions = [
    'Recebido',
    'Em análise',
    'Aguardando contato',
    'Documentação pendente',
    'Aprovado',
    'Rejeitado',
  ];

  const ufs = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
  ];

  return (
    <div className="p-4 sm:p-8 lg:p-10 space-y-6 max-w-full overflow-x-hidden">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Gestão de Solicitações
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Ao vivo • 5s
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Total de {total} candidaturas registradas • Atualização automática em tempo real
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>

          <button
            type="button"
            onClick={() => loadSolicitacoes(false)}
            disabled={isRefreshing}
            className="p-2.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Atualizar tabela agora"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-orange-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Pesquisa */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-soft space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Campo de Busca Texto */}
          <div className="md:col-span-5 relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por protocolo, nome, CNPJ, telefone..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:border-orange-500 transition-colors"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </div>

          {/* Filtro por Status */}
          <div className="md:col-span-3">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-orange-500"
            >
              <option value="">Todos os Status</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Estado (UF) */}
          <div className="md:col-span-2">
            <select
              value={selectedEstado}
              onChange={(e) => {
                setSelectedEstado(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-orange-500"
            >
              <option value="">Todos os Estados</option>
              {ufs.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </div>

          {/* Botão Buscar */}
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              Filtrar
            </button>
          </div>
        </form>
      </div>

      {/* Tabela de Resultados */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/80">
                <tr>
                  <th className="py-4 px-6">Protocolo</th>
                  <th className="py-4 px-4">Estabelecimento / Razão</th>
                  <th className="py-4 px-4">CNPJ</th>
                  <th className="py-4 px-4">Cidade / UF</th>
                  <th className="py-4 px-4">Responsável</th>
                  <th className="py-4 px-4">Contato</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Data</th>
                  <th className="py-4 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {solicitacoes.length > 0 ? (
                  solicitacoes.map((s) => {
                    const telLimpo = s.telefone.replace(/\D/g, '');
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6 font-mono font-bold text-slate-900 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setOverlaySolicitacaoId(s.id)}
                            className="hover:text-orange-600 hover:underline cursor-pointer text-left"
                            title="Clique para abrir aba sobreposta"
                          >
                            {s.protocolo}
                          </button>
                        </td>
                        <td className="py-4 px-4">
                          <button
                            type="button"
                            onClick={() => setOverlaySolicitacaoId(s.id)}
                            className="text-left cursor-pointer group"
                            title="Clique para abrir aba sobreposta"
                          >
                            <p className="font-bold text-slate-900 text-xs group-hover:text-orange-600 transition-colors">{s.nome_fantasia}</p>
                            <p className="text-[11px] text-slate-500 truncate max-w-[180px]">{s.razao_social}</p>
                          </button>
                        </td>
                        <td className="py-4 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {s.cnpj}
                        </td>
                        <td className="py-4 px-4 text-slate-700 whitespace-nowrap">
                          {s.cidade}/{s.estado}
                        </td>
                        <td className="py-4 px-4 font-medium text-slate-800">
                          {s.nome_responsavel}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-600">{s.telefone}</span>
                            {telLimpo && (
                              <a
                                href={`https://wa.me/55${telLimpo}?text=Ol%C3%A1%2C%20falo%20sobre%20a%20sua%20solicita%C3%A7%C3%A3o%20de%20ponto%20de%20coleta%20(Protocolo%20${s.protocolo})`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
                                title="Abrir conversa no WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4 fill-emerald-50" />
                              </a>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{s.email}</p>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              s.status === 'Recebido'
                                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                                : s.status === 'Em análise'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : s.status === 'Aprovado'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : s.status === 'Rejeitado'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(s.criado_em).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setOverlaySolicitacaoId(s.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs shadow-xs hover:shadow-orange-600/30 transition-all cursor-pointer"
                              title="Abrir aba sobreposta com todos os dados informados"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Aba Sobreposta</span>
                            </button>
                            <Link
                              to={`/admin/solicitacoes/${s.id}`}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Abrir em página inteira"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Nenhum registro encontrado com os filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Mostrando página <strong className="text-slate-800">{page}</strong> de{' '}
            <strong className="text-slate-800">{totalPages || 1}</strong> ({total} registros no total)
          </div>

          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-hidden"
            >
              <option value={10}>10 por página</option>
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
            </select>

            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Sobreposto / Aba Sobreposta com todos os dados da candidatura */}
      {overlaySolicitacaoId !== null && (
        <SolicitacaoOverlayModal
          solicitacaoId={overlaySolicitacaoId}
          onClose={() => setOverlaySolicitacaoId(null)}
          onStatusUpdated={() => loadSolicitacoes(false)}
        />
      )}
    </div>
  );
};
