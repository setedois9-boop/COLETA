import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
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
  ShieldAlert,
  Save,
  AlertCircle,
  Loader2,
  Trash2,
  Eye,
  EyeOff,
  History,
} from 'lucide-react';
import {
  fetchSolicitacaoDetalhes,
  updateSolicitacaoStatus,
  updateObservacoesInternas,
  deleteSolicitacao,
} from '../../services/api';
import { Solicitacao } from '../../types';

export const AdminSolicitacaoDetalhes: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [solicitacao, setSolicitacao] = useState<Solicitacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Status Change State
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusObservacao, setStatusObservacao] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Observações Internas
  const [observacoesInternas, setObservacoesInternas] = useState('');
  const [isSavingObs, setIsSavingObs] = useState(false);
  const [obsSavedMsg, setObsSavedMsg] = useState(false);

  // Revelar dados bancários restritos
  const [revealFinancial, setRevealFinancial] = useState(false);

  // Modal de imagem ampliada
  const [activeImageZoom, setActiveImageZoom] = useState<string | null>(null);

  // Copiar feedback
  const [copiedProtocolo, setCopiedProtocolo] = useState(false);
  const [copiedContato, setCopiedContato] = useState(false);

  const loadData = async (financial = false) => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchSolicitacaoDetalhes(id, financial);
      setSolicitacao(data);
      setNewStatus(data.status);
      setObservacoesInternas(data.observacoes_internas || '');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao carregar detalhes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(revealFinancial);
  }, [id, revealFinancial]);

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newStatus) return;
    setIsUpdatingStatus(true);
    try {
      await updateSolicitacaoStatus(id, newStatus, statusObservacao);
      setStatusObservacao('');
      await loadData(revealFinancial);
      alert('Status alterado com sucesso!');
    } catch (err: any) {
      alert('Erro ao alterar status: ' + err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveObs = async () => {
    if (!id) return;
    setIsSavingObs(true);
    try {
      await updateObservacoesInternas(id, observacoesInternas);
      setObsSavedMsg(true);
      setTimeout(() => setObsSavedMsg(false), 2500);
    } catch (err: any) {
      alert('Erro ao salvar anotação: ' + err.message);
    } finally {
      setIsSavingObs(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (
      window.confirm(
        'Tem certeza que deseja excluir esta solicitação e todos os seus arquivos? Esta ação é irreversível (LGPD).'
      )
    ) {
      try {
        await deleteSolicitacao(id);
        alert('Registro excluído com sucesso.');
        navigate('/admin/solicitacoes');
      } catch (err: any) {
        alert('Erro ao excluir: ' + err.message);
      }
    }
  };

  const copyToClipboard = (text: string, type: 'protocolo' | 'contato') => {
    navigator.clipboard.writeText(text);
    if (type === 'protocolo') {
      setCopiedProtocolo(true);
      setTimeout(() => setCopiedProtocolo(false), 2000);
    } else {
      setCopiedContato(true);
      setTimeout(() => setCopiedContato(false), 2000);
    }
  };

  if (loading && !solicitacao) {
    return (
      <div className="p-12 flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (errorMsg || !solicitacao) {
    return (
      <div className="p-10 space-y-4">
        <Link to="/admin/solicitacoes" className="text-xs text-slate-500 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <div className="p-4 bg-red-50 text-red-700 rounded-xl">
          {errorMsg || 'Solicitação não encontrada.'}
        </div>
      </div>
    );
  }

  const telLimpo = solicitacao.telefone.replace(/\D/g, '');
  const fachadaFile = solicitacao.arquivos?.find((a) => a.tipo_imagem === 'fachada');
  const interiorFile = solicitacao.arquivos?.find((a) => a.tipo_imagem === 'interior');

  const diasList = Array.isArray(solicitacao.dias_funcionamento)
    ? solicitacao.dias_funcionamento
    : [];

  const horariosObj = (typeof solicitacao.horarios_funcionamento === 'object'
    ? solicitacao.horarios_funcionamento
    : {}) as Record<string, { aberto: boolean; abertura: string; fechamento: string }>;

  const servicosList = Array.isArray(solicitacao.servicos_desejados)
    ? solicitacao.servicos_desejados
    : [];

  return (
    <div className="p-4 sm:p-8 lg:p-10 space-y-6 sm:space-y-8 max-w-full overflow-x-hidden">
      {/* Barra Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/solicitacoes')}
            className="p-2 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black text-slate-900">
                {solicitacao.nome_fantasia}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
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
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Protocolo: {solicitacao.protocolo} • Enviado em{' '}
              {new Date(solicitacao.criado_em).toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => copyToClipboard(solicitacao.protocolo, 'protocolo')}
            className="px-3 py-2 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            {copiedProtocolo ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copiar Protocolo</span>
          </button>

          {telLimpo && (
            <a
              href={`https://wa.me/55${telLimpo}?text=Ol%C3%A1%2C%20falo%20sobre%20sua%20solicita%C3%A7%C3%A3o%20de%20ponto%20de%20coleta%20(Protocolo%20${solicitacao.protocolo})`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#25D366] hover:bg-[#20BD5A] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-white" />
              <span>Chamar no WhatsApp</span>
            </a>
          )}

          <button
            type="button"
            onClick={handleDelete}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
            title="Excluir cadastro (LGPD)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Coluna da Esquerda: As 8 Etapas Detalhadas */}
        <div className="lg:col-span-8 space-y-6">
          {/* Seção 1: Estabelecimento */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
              <Store className="w-4 h-4 text-orange-600" />
              1. Dados do Estabelecimento
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Razão Social:</span>
                <span className="font-bold text-slate-900 text-sm">{solicitacao.razao_social}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Nome Fantasia:</span>
                <span className="font-bold text-slate-900 text-sm">{solicitacao.nome_fantasia}</span>
              </div>
              <div>
                <span className="text-slate-500 block">CNPJ:</span>
                <span className="font-mono font-bold text-slate-800">{solicitacao.cnpj}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Ramo de Atividade:</span>
                <span className="font-medium text-slate-800">
                  {solicitacao.tipo_comercio === 'Outros'
                    ? `${solicitacao.tipo_comercio} (${solicitacao.tipo_comercio_outro})`
                    : solicitacao.tipo_comercio}
                </span>
              </div>
            </div>
          </div>

          {/* Seção 2: Fotos */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
              <Camera className="w-4 h-4 text-orange-600" />
              2. Fotos Enviadas (Fachada e Interior)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Fachada */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Fachada do Comércio</span>
                {fachadaFile ? (
                  <div
                    onClick={() => setActiveImageZoom(fachadaFile.caminho_arquivo)}
                    className="aspect-4/3 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 relative cursor-pointer group"
                  >
                    <img
                      src={fachadaFile.caminho_arquivo}
                      alt="Fachada da loja"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                      <Eye className="w-4 h-4" /> Clique para ampliar
                    </div>
                  </div>
                ) : (
                  <div className="aspect-4/3 rounded-2xl bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                    Foto não disponível
                  </div>
                )}
              </div>

              {/* Interior */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Área Interna (Pacotes)</span>
                {interiorFile ? (
                  <div
                    onClick={() => setActiveImageZoom(interiorFile.caminho_arquivo)}
                    className="aspect-4/3 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 relative cursor-pointer group"
                  >
                    <img
                      src={interiorFile.caminho_arquivo}
                      alt="Interior da loja"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                      <Eye className="w-4 h-4" /> Clique para ampliar
                    </div>
                  </div>
                ) : (
                  <div className="aspect-4/3 rounded-2xl bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                    Foto não disponível
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Seção 3 & 4: Endereço & Mapa */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-600" />
                3 & 4. Endereço e Localização Geográfica
              </h3>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${solicitacao.latitude},${solicitacao.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Abrir no Google Maps
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Logradouro e Número:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {solicitacao.rua}, nº {solicitacao.numero}
                </span>
                {solicitacao.complemento && (
                  <span className="text-slate-500 block mt-0.5">Compl: {solicitacao.complemento}</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block">Bairro / Cidade / UF:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {solicitacao.bairro} — {solicitacao.cidade}/{solicitacao.estado}
                </span>
                <span className="text-slate-500 font-mono block mt-0.5">CEP: {solicitacao.cep}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-600 font-mono">
              <span>Coordenadas salvas:</span>
              <span className="font-bold text-slate-800">
                Lat: {solicitacao.latitude?.toFixed(6)} • Lng: {solicitacao.longitude?.toFixed(6)}
              </span>
            </div>
          </div>

          {/* Seção 5: Horários */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock className="w-4 h-4 text-orange-600" />
              5. Horários de Funcionamento
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'].map((dia) => {
                const isAberto = diasList.includes(dia);
                const h = horariosObj[dia];
                return (
                  <div
                    key={dia}
                    className={`p-2.5 rounded-xl border ${
                      isAberto ? 'bg-orange-50/40 border-orange-200' : 'bg-slate-50 border-slate-200 opacity-50'
                    }`}
                  >
                    <span className="font-bold text-slate-800 block mb-0.5">{dia}</span>
                    {isAberto ? (
                      <span className="font-mono text-slate-600 text-[11px]">
                        {h?.abertura || '08:00'} às {h?.fechamento || '18:00'}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Fechado</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="text-xs text-slate-600 pt-2 border-t border-slate-100">
              <span className="font-semibold text-slate-800">Intervalo de Almoço: </span>
              {solicitacao.fecha_almoco
                ? `Sim, fecha entre ${solicitacao.horario_almoco_inicio} e ${solicitacao.horario_almoco_fim}`
                : 'Não fecha para almoço (atendimento ininterrupto)'}
            </div>
          </div>

          {/* Seção 6: Operação e Serviços */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
              <Car className="w-4 h-4 text-orange-600" />
              6. Estrutura Operacional e Serviços
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block">Estacionamento:</span>
                <span className="font-medium text-slate-900">{solicitacao.estacionamento}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Colaboradores:</span>
                <span className="font-medium text-slate-900">{solicitacao.quantidade_colaboradores}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Experiência com Pacotes/Entregas:</span>
                <span className="font-medium text-slate-900">{solicitacao.experiencia_logistica}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">Serviços Desejados:</span>
                <div className="flex flex-wrap gap-1.5">
                  {servicosList.map((serv, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-[11px] font-medium"
                    >
                      {serv}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Seção 7: Contato e Financeiro */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-orange-600" />
                7. Contato do Responsável & Dados Financeiros
              </h3>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `${solicitacao.nome_responsavel} - ${solicitacao.telefone} - ${solicitacao.email}`,
                    'contato'
                  )
                }
                className="text-xs text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                {copiedContato ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                Copiar Contato
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Nome do Responsável:</span>
                <span className="font-bold text-slate-900 text-sm">{solicitacao.nome_responsavel}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Telefone:</span>
                <span className="font-bold font-mono text-slate-900">{solicitacao.telefone}</span>
              </div>
              <div>
                <span className="text-slate-500 block">E-mail:</span>
                <span className="font-medium text-slate-900">{solicitacao.email}</span>
              </div>
            </div>

            {/* Proteção dos Dados Bancários */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-slate-600" /> Contas para Recebimento
                </span>
                <button
                  type="button"
                  onClick={() => setRevealFinancial(!revealFinancial)}
                  className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-semibold px-2.5 py-1 rounded-lg bg-slate-100 cursor-pointer"
                >
                  {revealFinancial ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" /> Ocultar Dados
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" /> Revelar Dados Bancários
                    </>
                  )}
                </button>
              </div>

              {solicitacao.banco_1 || solicitacao.banco_2 ? (
                <div className="space-y-3">
                  {/* Banco 1 */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                    <span className="font-bold text-orange-600 block text-xs">Banco 1 (Principal):</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Banco:</span>
                        <span className="font-semibold text-slate-800">{solicitacao.banco_1 || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Agência:</span>
                        <span className="font-semibold text-slate-800">{solicitacao.agencia_1 || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Conta:</span>
                        <span className="font-semibold text-slate-800">{solicitacao.conta_1 || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Chave Pix:</span>
                        <span className="font-semibold text-slate-800">{solicitacao.pix_1 || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Banco 2 */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                    <span className="font-bold text-slate-800 block text-xs">Banco 2 (Secundário):</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Banco:</span>
                        <span className="font-semibold text-slate-800">{solicitacao.banco_2 || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Agência:</span>
                        <span className="font-semibold text-slate-800">{solicitacao.agencia_2 || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Conta:</span>
                        <span className="font-semibold text-slate-800">{solicitacao.conta_2 || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Chave Pix:</span>
                        <span className="font-semibold text-slate-800">{solicitacao.pix_2 || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Nenhum dado bancário cadastrado nesta candidatura inicial.
                </p>
              )}
            </div>
          </div>

          {/* Seção 8: Origem */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft text-xs space-y-2">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="w-4 h-4 text-orange-600" />
              8. Origem da Descoberta
            </h3>
            <p className="text-slate-800 font-medium">
              Origem informada:{' '}
              <strong className="text-slate-900">
                {solicitacao.origem_cadastro}
                {solicitacao.origem_outro ? ` (${solicitacao.origem_outro})` : ''}
              </strong>
            </p>
          </div>
        </div>

        {/* Coluna da Direita: Alteração de Status, Notas Internas & Histórico */}
        <div className="lg:col-span-4 space-y-6">
          {/* Caixa de Alteração de Status */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm">Gerenciar Status</h3>

            <form onSubmit={handleStatusUpdate} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mudar status para:
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-orange-500"
                >
                  <option value="Recebido">Recebido</option>
                  <option value="Em análise">Em análise</option>
                  <option value="Aguardando contato">Aguardando contato</option>
                  <option value="Documentação pendente">Documentação pendente</option>
                  <option value="Aprovado">Aprovado</option>
                  <option value="Rejeitado">Rejeitado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observação da mudança (opcional):
                </label>
                <input
                  type="text"
                  value={statusObservacao}
                  onChange={(e) => setStatusObservacao(e.target.value)}
                  placeholder="Ex: Contatado via WhatsApp, aguardando fotos"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdatingStatus || newStatus === solicitacao.status}
                className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-40"
              >
                {isUpdatingStatus ? 'Atualizando...' : 'Salvar Novo Status'}
              </button>
            </form>
          </div>

          {/* Anotações Internas */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm">Anotações Internas</h3>
              {obsSavedMsg && (
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Salvo
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Visíveis exclusivamente para os administradores.
            </p>
            <textarea
              rows={4}
              value={observacoesInternas}
              onChange={(e) => setObservacoesInternas(e.target.value)}
              placeholder="Digite anotações ou histórico de atendimento com o lojista..."
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-orange-500 leading-relaxed"
            />
            <button
              type="button"
              onClick={handleSaveObs}
              disabled={isSavingObs}
              className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {isSavingObs ? 'Salvando...' : 'Salvar Anotação'}
            </button>
          </div>

          {/* Histórico de Alterações de Status (Auditoria) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-3">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-orange-600" />
              Histórico de Status
            </h3>

            <div className="space-y-3 pt-2">
              {solicitacao.historico && solicitacao.historico.length > 0 ? (
                solicitacao.historico.map((h, i) => (
                  <div key={h.id || i} className="border-l-2 border-orange-500 pl-3 py-1 space-y-0.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{h.status_novo}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(h.criado_em).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    {h.observacao && <p className="text-xs text-slate-600">{h.observacao}</p>}
                    <span className="text-[10px] text-slate-400 block">
                      Por: {h.administrador_id || 'Sistema'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">Nenhum histórico registrado.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Lightbox de Zoom da Imagem */}
      {activeImageZoom && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActiveImageZoom(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl bg-black">
            <img
              src={activeImageZoom}
              alt="Ampliada"
              className="max-w-full max-h-[85vh] object-contain mx-auto"
            />
            <button
              type="button"
              onClick={() => setActiveImageZoom(null)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black text-white p-2 rounded-full cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
