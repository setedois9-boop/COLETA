import React, { useEffect, useState } from 'react';
import {
  X,
  Store,
  Camera,
  MapPin,
  Clock,
  Car,
  User,
  CreditCard,
  FileText,
  Copy,
  Check,
  MessageCircle,
  ExternalLink,
  Save,
  Loader2,
  Eye,
  EyeOff,
  History,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  fetchSolicitacaoDetalhes,
  updateSolicitacaoStatus,
  updateObservacoesInternas,
  getMediaUrl,
} from '../../services/api';
import { Solicitacao } from '../../types';

interface SolicitacaoOverlayModalProps {
  solicitacaoId: number | null;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

export const SolicitacaoOverlayModal: React.FC<SolicitacaoOverlayModalProps> = ({
  solicitacaoId,
  onClose,
  onStatusUpdated,
}) => {
  const [solicitacao, setSolicitacao] = useState<Solicitacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Status Change State
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusObservacao, setStatusObservacao] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusSuccessMsg, setStatusSuccessMsg] = useState(false);

  // Observações Internas
  const [observacoesInternas, setObservacoesInternas] = useState('');
  const [isSavingObs, setIsSavingObs] = useState(false);
  const [obsSavedMsg, setObsSavedMsg] = useState(false);

  // Revelar dados bancários restritos
  const [revealFinancial, setRevealFinancial] = useState(false);

  // Lightbox Zoom de foto
  const [activeImageZoom, setActiveImageZoom] = useState<string | null>(null);

  // Copiar feedback
  const [copiedProtocolo, setCopiedProtocolo] = useState(false);
  const [copiedContato, setCopiedContato] = useState(false);
  const [copiedBancos, setCopiedBancos] = useState(false);

  const loadData = async (financial = false) => {
    if (!solicitacaoId) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await fetchSolicitacaoDetalhes(solicitacaoId, financial);
      setSolicitacao(data);
      setNewStatus(data.status);
      setObservacoesInternas(data.observacoes_internas || '');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao carregar detalhes da solicitação');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (solicitacaoId) {
      loadData(revealFinancial);
    }
  }, [solicitacaoId, revealFinancial]);

  // Fechar com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeImageZoom) {
          setActiveImageZoom(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeImageZoom, onClose]);

  // Evita scroll da página de fundo quando modal estiver aberto
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!solicitacaoId || !newStatus) return;
    setIsUpdatingStatus(true);
    try {
      await updateSolicitacaoStatus(solicitacaoId, newStatus, statusObservacao);
      setStatusObservacao('');
      setStatusSuccessMsg(true);
      setTimeout(() => setStatusSuccessMsg(false), 3000);
      await loadData(revealFinancial);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      alert('Erro ao alterar status: ' + err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveObs = async () => {
    if (!solicitacaoId) return;
    setIsSavingObs(true);
    try {
      await updateObservacoesInternas(solicitacaoId, observacoesInternas);
      setObsSavedMsg(true);
      setTimeout(() => setObsSavedMsg(false), 2500);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      alert('Erro ao salvar anotação: ' + err.message);
    } finally {
      setIsSavingObs(false);
    }
  };

  const copyToClipboard = (text: string, type: 'protocolo' | 'contato' | 'bancos') => {
    navigator.clipboard.writeText(text);
    if (type === 'protocolo') {
      setCopiedProtocolo(true);
      setTimeout(() => setCopiedProtocolo(false), 2000);
    } else if (type === 'contato') {
      setCopiedContato(true);
      setTimeout(() => setCopiedContato(false), 2000);
    } else {
      setCopiedBancos(true);
      setTimeout(() => setCopiedBancos(false), 2000);
    }
  };

  if (!solicitacaoId) return null;

  const telLimpo = solicitacao?.telefone?.replace(/\D/g, '') || '';
  const fachadaFile = solicitacao?.arquivos?.find((a) => a.tipo_imagem === 'fachada');
  const interiorFile = solicitacao?.arquivos?.find((a) => a.tipo_imagem === 'interior');

  const diasList = Array.isArray(solicitacao?.dias_funcionamento)
    ? solicitacao.dias_funcionamento
    : [];

  const horariosObj = (typeof solicitacao?.horarios_funcionamento === 'object'
    ? solicitacao.horarios_funcionamento
    : {}) as Record<string, { aberto: boolean; abertura: string; fechamento: string }>;

  const servicosList = Array.isArray(solicitacao?.servicos_desejados)
    ? solicitacao.servicos_desejados
    : [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-slate-900/70 backdrop-blur-xs flex justify-center items-center p-1 sm:p-4 md:p-6 animate-fadeIn">
      {/* Container Principal do Modal Sobreposto */}
      <div
        className="relative w-full max-w-5xl bg-slate-50 rounded-xl sm:rounded-3xl shadow-2xl border border-slate-300 flex flex-col max-h-[96vh] sm:max-h-[92vh] overflow-hidden mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Barra Fixa */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 bg-white border-b border-slate-200/90 flex items-center justify-between gap-2 sm:gap-4 shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <span className="p-1.5 sm:p-2 bg-orange-100 text-orange-600 rounded-xl shrink-0">
              <Store className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-black text-slate-900 truncate max-w-[200px] sm:max-w-none">
                  {solicitacao?.nome_fantasia || 'Ficha da Solicitação'}
                </h2>
                {solicitacao && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold ${
                      solicitacao.status === 'Recebido'
                        ? 'bg-orange-50 text-orange-700 border border-orange-200'
                        : solicitacao.status === 'Em análise'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : solicitacao.status === 'Aprovado'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : solicitacao.status === 'Rejeitado'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-purple-50 text-purple-700 border border-purple-200'
                    }`}
                  >
                    {solicitacao.status}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] sm:text-xs text-slate-500 mt-0.5">
                <span className="font-mono font-bold text-slate-700">
                  Protocolo: {solicitacao?.protocolo}
                </span>
                {solicitacao?.protocolo && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(solicitacao.protocolo, 'protocolo')}
                    className="hover:text-orange-600 flex items-center gap-1 cursor-pointer font-medium"
                    title="Copiar protocolo"
                  >
                    {copiedProtocolo ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedProtocolo ? 'Copiado!' : 'Copiar'}
                  </button>
                )}
                {solicitacao?.criado_em && (
                  <span className="hidden sm:inline">• Enviado em {new Date(solicitacao.criado_em).toLocaleString('pt-BR')}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {telLimpo && (
              <a
                href={`https://wa.me/55${telLimpo}?text=Ol%C3%A1%20${encodeURIComponent(
                  solicitacao?.nome_responsavel || ''
                )}%2C%20falo%20da%20equipe%20de%20Pontos%20de%20Coleta%20sobre%20sua%20solicita%C3%A7%C3%A3o%20(Protocolo%20${
                  solicitacao?.protocolo
                }).`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Fechar aba sobreposta (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-6 space-y-5 sm:space-y-6">
          {loading && !solicitacao ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
              <p className="text-sm font-medium text-slate-500">Carregando todos os dados da solicitação...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-semibold">{errorMsg}</p>
            </div>
          ) : solicitacao ? (
            <div className="space-y-6">
              {/* Box de Ação Rápida de Status */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-orange-200 bg-orange-50/20 shadow-xs">
                <form onSubmit={handleStatusUpdate} className="flex flex-col md:flex-row items-center gap-3">
                  <div className="w-full md:w-auto shrink-0">
                    <span className="text-xs font-bold text-slate-700 block mb-1">
                      Mudar Status Rapidamente:
                    </span>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full md:w-48 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-orange-500 shadow-xs"
                    >
                      <option value="Recebido">Recebido</option>
                      <option value="Em análise">Em análise</option>
                      <option value="Aguardando contato">Aguardando contato</option>
                      <option value="Documentação pendente">Documentação pendente</option>
                      <option value="Aprovado">Aprovado</option>
                      <option value="Rejeitado">Rejeitado</option>
                    </select>
                  </div>

                  <div className="w-full flex-1">
                    <span className="text-xs font-bold text-slate-700 block mb-1">
                      Observação do Histórico (Opcional):
                    </span>
                    <input
                      type="text"
                      value={statusObservacao}
                      onChange={(e) => setStatusObservacao(e.target.value)}
                      placeholder="Ex: Contato telefônico realizado com sucesso..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-orange-500 shadow-xs"
                    />
                  </div>

                  <div className="w-full md:w-auto shrink-0 md:pt-5">
                    <button
                      type="submit"
                      disabled={isUpdatingStatus || newStatus === solicitacao.status}
                      className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      {isUpdatingStatus ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      Salvar Status
                    </button>
                  </div>
                </form>
                {statusSuccessMsg && (
                  <p className="text-xs text-emerald-700 font-bold mt-2 flex items-center gap-1 animate-fadeIn">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Status atualizado com sucesso!
                  </p>
                )}
              </div>

              {/* Seção 1 & 2: Fotos Anexadas */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-soft space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <Camera className="w-4 h-4 text-orange-600" />
                    Fotos Anexadas pelo Candidato (Clique para ampliar)
                  </h3>
                  <span className="text-xs text-slate-400">2 Fotos Obrigatórias</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Fachada */}
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">1. Foto da Fachada:</span>
                      {fachadaFile ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-md">
                          Anexada
                        </span>
                      ) : (
                        <span className="text-[10px] bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded-md">
                          Não enviada
                        </span>
                      )}
                    </div>
                    {fachadaFile ? (
                      <div
                        onClick={() => setActiveImageZoom(getMediaUrl(fachadaFile.caminho_arquivo))}
                        className="relative h-44 rounded-lg overflow-hidden bg-slate-200 cursor-zoom-in group"
                      >
                        <img
                          src={getMediaUrl(fachadaFile.caminho_arquivo)}
                          alt="Fachada do estabelecimento"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                          <Eye className="w-4 h-4" /> Ampliar Fachada
                        </div>
                      </div>
                    ) : (
                      <div className="h-44 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
                        Foto da fachada indisponível
                      </div>
                    )}
                  </div>

                  {/* Interior */}
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">2. Foto da Área Interna / Pacotes:</span>
                      {interiorFile ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-md">
                          Anexada
                        </span>
                      ) : (
                        <span className="text-[10px] bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded-md">
                          Não enviada
                        </span>
                      )}
                    </div>
                    {interiorFile ? (
                      <div
                        onClick={() => setActiveImageZoom(getMediaUrl(interiorFile.caminho_arquivo))}
                        className="relative h-44 rounded-lg overflow-hidden bg-slate-200 cursor-zoom-in group"
                      >
                        <img
                          src={getMediaUrl(interiorFile.caminho_arquivo)}
                          alt="Área interna do estabelecimento"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                          <Eye className="w-4 h-4" /> Ampliar Interior
                        </div>
                      </div>
                    ) : (
                      <div className="h-44 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
                        Foto interna indisponível
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Grid de 2 Colunas: Dados da Empresa & Endereço */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dados da Empresa */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-soft space-y-3">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
                    <Store className="w-4 h-4 text-orange-600" />
                    1. Dados do Estabelecimento
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Nome Fantasia:</span>
                      <span className="font-bold text-slate-900 text-sm">{solicitacao.nome_fantasia}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Razão Social:</span>
                      <span className="font-medium text-slate-800">{solicitacao.razao_social}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 block text-[11px]">CNPJ:</span>
                        <span className="font-mono font-bold text-slate-800">{solicitacao.cnpj}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Segmento / Ramo:</span>
                        <span className="font-medium text-slate-800">
                          {solicitacao.tipo_comercio === 'Outros'
                            ? solicitacao.tipo_comercio_outro
                            : solicitacao.tipo_comercio}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Endereço & Localização */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-soft space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-orange-600" />
                      3. Endereço do Estabelecimento
                    </h3>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${solicitacao.rua}, ${solicitacao.numero}, ${solicitacao.bairro}, ${solicitacao.cidade} - ${solicitacao.estado}, ${solicitacao.cep}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Abrir Maps
                    </a>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Logradouro:</span>
                      <span className="font-bold text-slate-900">
                        {solicitacao.rua}, nº {solicitacao.numero}
                        {solicitacao.complemento && ` (${solicitacao.complemento})`}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Bairro:</span>
                        <span className="font-medium text-slate-800">{solicitacao.bairro}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Cidade/UF & CEP:</span>
                        <span className="font-medium text-slate-800">
                          {solicitacao.cidade}/{solicitacao.estado} • {solicitacao.cep}
                        </span>
                      </div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-600">
                      Coordenadas: Lat {solicitacao.latitude?.toFixed(5)} • Lng {solicitacao.longitude?.toFixed(5)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid de Horários e Operação */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Horários de Funcionamento */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-soft space-y-3">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
                    <Clock className="w-4 h-4 text-orange-600" />
                    4. Horários de Atendimento
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 text-center">
                    {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'].map((dia) => {
                      const aberto = diasList.includes(dia);
                      const h = horariosObj[dia];
                      return (
                        <div
                          key={dia}
                          className={`p-1.5 rounded-lg border text-[11px] ${
                            aberto ? 'bg-orange-50/60 border-orange-200' : 'bg-slate-50 border-slate-200 opacity-40'
                          }`}
                        >
                          <span className="font-bold text-slate-800 block">{dia}</span>
                          {aberto ? (
                            <span className="font-mono text-slate-600 text-[10px] block">
                              {h?.abertura || '08:00'}-{h?.fechamento || '18:00'}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px] block">Fechado</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <strong className="text-slate-800">Almoço: </strong>
                    {solicitacao.fecha_almoco
                      ? `Fecha entre ${solicitacao.horario_almoco_inicio} e ${solicitacao.horario_almoco_fim}`
                      : 'Atendimento contínuo (não fecha no almoço)'}
                  </p>
                </div>

                {/* Estrutura Operacional */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-soft space-y-3">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
                    <Car className="w-4 h-4 text-orange-600" />
                    5. Estrutura e Serviços
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Estacionamento:</span>
                        <span className="font-medium text-slate-800">{solicitacao.estacionamento}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Colaboradores:</span>
                        <span className="font-medium text-slate-800">{solicitacao.quantidade_colaboradores}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Experiência Logística:</span>
                      <span className="font-medium text-slate-800">{solicitacao.experiencia_logistica}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px] mb-1">Serviços Selecionados:</span>
                      <div className="flex flex-wrap gap-1">
                        {servicosList.map((serv, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-medium"
                          >
                            {serv}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SEÇÃO PRINCIPAL: CONTATO E DADOS BANCÁRIOS OBRIGATÓRIOS (DOIS BANCOS) */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-soft space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <User className="w-4 h-4 text-orange-600" />
                    <span>6. Contato do Responsável & Dados Bancários</span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `${solicitacao.nome_responsavel} - Tel: ${solicitacao.telefone} - Email: ${solicitacao.email}`,
                          'contato'
                        )
                      }
                      className="text-xs text-slate-600 hover:text-orange-600 font-bold flex items-center gap-1 cursor-pointer bg-slate-100 hover:bg-orange-50 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      {copiedContato ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      Copiar Contato
                    </button>

                    <button
                      type="button"
                      onClick={() => setRevealFinancial(!revealFinancial)}
                      className="text-xs text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 cursor-pointer bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      {revealFinancial ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" /> Ocultar Bancos
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" /> Revelar Dados Bancários
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Contato Geral */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Nome do Responsável:</span>
                    <span className="font-bold text-slate-900">{solicitacao.nome_responsavel}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Telefone / WhatsApp:</span>
                    <span className="font-bold font-mono text-slate-900">{solicitacao.telefone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">E-mail:</span>
                    <span className="font-medium text-slate-900">{solicitacao.email}</span>
                  </div>
                </div>

                {/* Blocos dos 2 Bancos Obrigatórios */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-orange-600" />
                      Contas Bancárias de Recebimento Cadastradas:
                    </span>
                    {(solicitacao.banco_1 || solicitacao.banco_2) && (
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            `BANCO 1:\nBanco: ${solicitacao.banco_1}\nAgência: ${solicitacao.agencia_1}\nConta: ${solicitacao.conta_1} (${solicitacao.tipo_conta_1 || 'Corrente'})\nPIX: ${solicitacao.pix_1}\n\nBANCO 2:\nBanco: ${solicitacao.banco_2}\nAgência: ${solicitacao.agencia_2}\nConta: ${solicitacao.conta_2} (${solicitacao.tipo_conta_2 || 'Corrente'})\nPIX: ${solicitacao.pix_2}`,
                            'bancos'
                          )
                        }
                        className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer font-medium"
                      >
                        {copiedBancos ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        Copiar Dados dos 2 Bancos
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Banco 1 - Titular Principal */}
                    <div className="bg-orange-50/40 p-4 rounded-xl border border-orange-200 text-xs space-y-2">
                      <div className="flex items-center justify-between border-b border-orange-200/60 pb-2">
                        <span className="font-bold text-orange-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />
                          Banco 1 (Titular Principal)
                        </span>
                        <span className="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-bold">
                          {solicitacao.tipo_conta_1 || 'Conta Corrente'}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Instituição Financeira:</span>
                          <span className="font-bold text-slate-900 text-sm">
                            {solicitacao.banco_1 || <span className="text-red-500">Não informado</span>}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-slate-400 block text-[11px]">Agência:</span>
                            <span className="font-mono font-bold text-slate-800">
                              {solicitacao.agencia_1 || '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px]">Conta com Dígito:</span>
                            <span className="font-mono font-bold text-slate-800">
                              {solicitacao.conta_1 || '—'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Chave Pix Vinculada:</span>
                          <span className="font-mono font-bold text-slate-900 bg-white px-2 py-1 rounded-md border border-orange-200 inline-block">
                            {solicitacao.pix_1 || '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Banco 2 - Secundário */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Banco 2 (Banco Secundário)
                        </span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                          {solicitacao.tipo_conta_2 || 'Conta Corrente'}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Instituição Financeira:</span>
                          <span className="font-bold text-slate-900 text-sm">
                            {solicitacao.banco_2 || <span className="text-red-500">Não informado</span>}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-slate-400 block text-[11px]">Agência:</span>
                            <span className="font-mono font-bold text-slate-800">
                              {solicitacao.agencia_2 || '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px]">Conta com Dígito:</span>
                            <span className="font-mono font-bold text-slate-800">
                              {solicitacao.conta_2 || '—'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Chave Pix Vinculada:</span>
                          <span className="font-mono font-bold text-slate-900 bg-white px-2 py-1 rounded-md border border-slate-200 inline-block">
                            {solicitacao.pix_2 || '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Origem & Anotações Internas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Origem */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-soft space-y-3">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
                    <FileText className="w-4 h-4 text-orange-600" />
                    7. Origem da Descoberta
                  </h3>
                  <p className="text-xs text-slate-800">
                    Fonte informada:{' '}
                    <strong className="text-slate-900">
                      {solicitacao.origem_cadastro}
                      {solicitacao.origem_outro ? ` (${solicitacao.origem_outro})` : ''}
                    </strong>
                  </p>
                </div>

                {/* Anotações Internas */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-soft space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <Save className="w-4 h-4 text-orange-600" />
                      Observações Internas da Equipe
                    </h3>
                    {obsSavedMsg && (
                      <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 animate-fadeIn">
                        <Check className="w-3.5 h-3.5" /> Salvo!
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    value={observacoesInternas}
                    onChange={(e) => setObservacoesInternas(e.target.value)}
                    placeholder="Adicione anotações internas visíveis apenas para os administradores..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-orange-500 shadow-xs"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveObs}
                      disabled={isSavingObs}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingObs ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Salvar Anotação
                    </button>
                  </div>
                </div>
              </div>

              {/* Histórico de Alterações de Status */}
              {solicitacao.historico && solicitacao.historico.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-soft space-y-3">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
                    <History className="w-4 h-4 text-orange-600" />
                    Histórico de Alterações de Status
                  </h3>
                  <div className="space-y-2.5">
                    {solicitacao.historico.map((h, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">
                              {h.status_anterior ? `${h.status_anterior} ➔ ` : ''}
                              <span className="text-orange-600">{h.status_novo}</span>
                            </span>
                          </div>
                          {h.observacao && (
                            <p className="text-slate-600 mt-1 italic text-[11px]">"{h.observacao}"</p>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 shrink-0">
                          {new Date(h.criado_em).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Rodapé Fixo */}
        <div className="px-4 sm:px-6 py-3 bg-slate-100 border-t border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <span className="text-xs text-slate-500 order-2 sm:order-1">
            Pressione <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono shadow-xs">ESC</kbd> para fechar
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer order-1 sm:order-2"
          >
            Fechar Aba Sobreposta
          </button>
        </div>
      </div>

      {/* Lightbox / Zoom Modal de Foto Ampliada */}
      {activeImageZoom && (
        <div
          className="fixed inset-0 z-60 bg-black/90 flex flex-col items-center justify-center p-4 animate-fadeIn"
          onClick={() => setActiveImageZoom(null)}
        >
          <button
            type="button"
            onClick={() => setActiveImageZoom(null)}
            className="absolute top-5 right-5 p-3 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors cursor-pointer"
            title="Fechar ampliação"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={activeImageZoom}
            alt="Imagem ampliada em alta resolução"
            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
