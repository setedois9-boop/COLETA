import React, { useState, useEffect } from 'react';
import {
  Palette,
  MessageCircle,
  FileText,
  Sliders,
  Shield,
  Save,
  Check,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  Sparkles,
  KeyRound,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  Copy,
  CheckCircle2,
  Lock,
  AlertTriangle,
  QrCode,
  X,
} from 'lucide-react';
import { useConfig } from '../../context/ConfigContext';
import { useAuth } from '../../context/AuthContext';
import {
  saveSiteConfig,
  fetch2FAStatus,
  setup2FA,
  directEnable2FA,
  verifyAndEnable2FA,
  changeAdminPassword,
} from '../../services/api';
import { FAQItem, BeneficioItem } from '../../types';

export const AdminConfiguracoes: React.FC = () => {
  const { config, refreshConfig, updateLocalConfig, loading: configLoading } = useConfig();
  const { admin, refreshAdmin } = useAuth();

  // Preservar aba ativa no localStorage para que ao atualizar a página (F5) permaneça na mesma aba
  const [activeTab, setActiveTab] = useState<'visual' | 'whatsapp' | 'conteudo' | 'formulario' | 'privacidade' | 'seguranca'>(() => {
    const saved = localStorage.getItem('admin_config_tab');
    if (saved && ['visual', 'whatsapp', 'conteudo', 'formulario', 'privacidade', 'seguranca'].includes(saved)) {
      return saved as any;
    }
    return 'visual';
  });

  const handleTabChange = (tab: 'visual' | 'whatsapp' | 'conteudo' | 'formulario' | 'privacidade' | 'seguranca') => {
    setActiveTab(tab);
    localStorage.setItem('admin_config_tab', tab);
  };

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(Boolean(admin?.two_factor_enabled));
  const [twoFactorLoading, setTwoFactorLoading] = useState<boolean>(true);
  const [setupData, setSetupData] = useState<{ secret: string; qr_code: string; otpauth_url: string } | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [verifyToken, setVerifyToken] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [twoFactorSuccess, setTwoFactorSuccess] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Password Change Form State (Blindado com 2FA se ativo)
  const [passwordCurrent, setPasswordCurrent] = useState('');
  const [passwordNew, setPasswordNew] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [password2FACode, setPassword2FACode] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // 2FA Save Confirmation Modal State
  const [show2FASaveModal, setShow2FASaveModal] = useState(false);
  const [save2FACode, setSave2FACode] = useState('');
  const [save2FAError, setSave2FAError] = useState('');
  const [isSavingWith2FA, setIsSavingWith2FA] = useState(false);
  const [showNo2FAWarningModal, setShowNo2FAWarningModal] = useState(false);

  // Consultar status real do 2FA diretamente do backend na montagem e troca de aba
  const check2FAStatus = async () => {
    setTwoFactorLoading(true);
    try {
      const res = await fetch2FAStatus();
      const isEnabled = Boolean(res.enabled);
      setTwoFactorEnabled(isEnabled);
      if (isEnabled) {
        setSetupData(null);
      }
    } catch {
      if (admin) {
        setTwoFactorEnabled(Boolean(admin.two_factor_enabled));
      }
    } finally {
      setTwoFactorLoading(false);
    }
  };

  useEffect(() => {
    check2FAStatus();
  }, [activeTab]);

  useEffect(() => {
    if (admin) {
      setTwoFactorEnabled(Boolean(admin.two_factor_enabled));
    }
  }, [admin]);

  const handleStartSetup2FA = async () => {
    setSetupLoading(true);
    setVerifyError('');
    try {
      const data = await setup2FA();
      setSetupData(data);
      setVerifyToken('');
    } catch (err: any) {
      alert(err.message || 'Erro ao iniciar configuração do 2FA');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleVerifyAndEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    const tokenClean = verifyToken.replace(/\D/g, '');
    if (tokenClean.length !== 6) {
      setVerifyError('Digite o código de 6 dígitos gerado pelo Google Authenticator.');
      return;
    }
    setVerifyLoading(true);
    setVerifyError('');
    try {
      await verifyAndEnable2FA(tokenClean);
      await refreshAdmin();
      await check2FAStatus();
      setTwoFactorEnabled(true);
      setSetupData(null);
      setVerifyToken('');
      setTwoFactorSuccess('Autenticação de 2 Fatores (Google Authenticator) ativada e salva com sucesso!');
      setTimeout(() => setTwoFactorSuccess(''), 5000);
    } catch (err: any) {
      setVerifyError(err.message || 'Código incorreto ou expirado. Tente novamente.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordCurrent) {
      setPasswordError('Informe sua senha atual de administrador.');
      return;
    }
    if (passwordNew.length < 8) {
      setPasswordError('A nova senha deve possuir no mínimo 8 caracteres.');
      return;
    }
    if (passwordNew !== passwordConfirm) {
      setPasswordError('A confirmação da nova senha não confere.');
      return;
    }
    if (twoFactorEnabled && password2FACode.replace(/\D/g, '').length !== 6) {
      setPasswordError('Digite o código de 6 dígitos gerado pelo Google Authenticator.');
      return;
    }

    setPasswordLoading(true);
    try {
      await changeAdminPassword(passwordCurrent, passwordNew, password2FACode);
      setPasswordSuccess('Senha administrativa atualizada com sucesso!');
      setPasswordCurrent('');
      setPasswordNew('');
      setPasswordConfirm('');
      setPassword2FACode('');
      setTimeout(() => setPasswordSuccess(''), 5000);
    } catch (err: any) {
      setPasswordError(err.message || 'Falha ao alterar senha.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2500);
    }
  };

  // Form State
  const [nomeSite, setNomeSite] = useState(config?.nome_site || 'Rede Logística Parceira');
  const [corPrimaria, setCorPrimaria] = useState(config?.cor_primaria || '#EE4D2D');
  const [corSecundaria, setCorSecundaria] = useState(config?.cor_secundaria || '#0F172A');
  const [avisoIndependencia, setAvisoIndependencia] = useState(
    config?.aviso_independencia || ''
  );

  // WhatsApp
  const [whatsappNumero, setWhatsappNumero] = useState(config?.whatsapp_numero || '');
  const [whatsappMensagem, setWhatsappMensagem] = useState(
    config?.whatsapp_mensagem ||
      'Olá! Acabei de enviar uma solicitação para cadastrar meu estabelecimento como ponto de coleta.\n\nProtocolo: [PROTOCOLO]\nEstabelecimento: [NOME FANTASIA]\n\nGostaria de receber orientações sobre as próximas etapas.'
  );

  // Conteúdo
  const [tituloHero, setTituloHero] = useState(config?.titulo_hero || '');
  const [subtituloHero, setSubtituloHero] = useState(config?.subtitulo_hero || '');
  const [faqs, setFaqs] = useState<FAQItem[]>(config?.perguntas_frequentes || []);
  const [beneficios, setBeneficios] = useState<BeneficioItem[]>(config?.beneficios || []);

  // Formulário
  const [coletaBancariaAtiva, setColetaBancariaAtiva] = useState(
    config?.coleta_bancaria_ativa ?? true
  );
  const [coletaBancariaObrigatoria, setColetaBancariaObrigatoria] = useState(
    config?.coleta_bancaria_obrigatoria ?? true
  );
  const [limiteUploadMb, setLimiteUploadMb] = useState(config?.limite_upload_mb || 10);
  const [retencaoDias, setRetencaoDias] = useState(config?.retencao_dias || 365);

  // Sincronizar todos os campos com o config carregado da API (evita formulário em branco ao recarregar a página)
  useEffect(() => {
    if (config) {
      if (config.nome_site !== undefined) setNomeSite(config.nome_site);
      if (config.cor_primaria !== undefined) setCorPrimaria(config.cor_primaria);
      if (config.cor_secundaria !== undefined) setCorSecundaria(config.cor_secundaria);
      if (config.aviso_independencia !== undefined) setAvisoIndependencia(config.aviso_independencia);
      if (config.whatsapp_numero !== undefined) setWhatsappNumero(config.whatsapp_numero);
      if (config.whatsapp_mensagem !== undefined) setWhatsappMensagem(config.whatsapp_mensagem);
      if (config.titulo_hero !== undefined) setTituloHero(config.titulo_hero);
      if (config.subtitulo_hero !== undefined) setSubtituloHero(config.subtitulo_hero);
      if (Array.isArray(config.perguntas_frequentes) && config.perguntas_frequentes.length > 0) {
        setFaqs(config.perguntas_frequentes);
      }
      if (Array.isArray(config.beneficios) && config.beneficios.length > 0) {
        setBeneficios(config.beneficios);
      }
      if (config.coleta_bancaria_ativa !== undefined) setColetaBancariaAtiva(config.coleta_bancaria_ativa);
      if (config.coleta_bancaria_obrigatoria !== undefined) setColetaBancariaObrigatoria(config.coleta_bancaria_obrigatoria);
      if (config.limite_upload_mb !== undefined) setLimiteUploadMb(config.limite_upload_mb);
      if (config.retencao_dias !== undefined) setRetencaoDias(config.retencao_dias);
    }
  }, [config]);

  // Monta o payload unificado das configurações da plataforma
  const buildConfigPayload = () => {
    let cleanNum = whatsappNumero.replace(/\D/g, '');
    if (cleanNum.length === 10 || cleanNum.length === 11) {
      cleanNum = '55' + cleanNum;
      setWhatsappNumero(cleanNum);
    }

    return {
      ...(config || {}),
      nome_site: nomeSite,
      cor_primaria: corPrimaria,
      cor_secundaria: corSecundaria,
      aviso_independencia: avisoIndependencia,
      whatsapp_numero: cleanNum,
      whatsapp_mensagem: whatsappMensagem,
      titulo_hero: tituloHero,
      subtitulo_hero: subtituloHero,
      perguntas_frequentes: faqs,
      beneficios,
      coleta_bancaria_ativa: coletaBancariaAtiva,
      coleta_bancaria_obrigatoria: coletaBancariaObrigatoria,
      limite_upload_mb: limiteUploadMb,
      retencao_dias: retencaoDias,
    };
  };

  // Disparo ao clicar em qualquer botão de salvar configurações
  const handleSave = () => {
    setSave2FAError('');
    setSave2FACode('');
    if (twoFactorEnabled) {
      setShow2FASaveModal(true);
    } else {
      setShowNo2FAWarningModal(true);
    }
  };

  // Confirmação obrigatória com código de 6 dígitos do Google Authenticator
  const handleConfirmSaveWith2FA = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = save2FACode.replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setSave2FAError('Digite o código de 6 dígitos gerado pelo Google Authenticator.');
      return;
    }

    setIsSavingWith2FA(true);
    setSave2FAError('');
    try {
      const payload = buildConfigPayload();
      await saveSiteConfig(payload, cleanCode);
      updateLocalConfig(payload);
      await refreshConfig();

      setShow2FASaveModal(false);
      setSave2FACode('');
      setSave2FAError('');

      setSuccessMsg('Configurações salvas e aplicadas com sucesso mediante validação 2FA!');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      if (err.require_2fa_setup) {
        setShow2FASaveModal(false);
        setShowNo2FAWarningModal(true);
      } else {
        setSave2FAError(err.message || 'Código 2FA incorreto ou expirado. Verifique no aplicativo Google Authenticator.');
      }
    } finally {
      setIsSavingWith2FA(false);
    }
  };

  // Funções de manipulação do FAQ
  const handleAddFaq = () => {
    setFaqs([...faqs, { pergunta: 'Nova pergunta aqui', resposta: 'Nova resposta explicativa aqui' }]);
  };

  const handleUpdateFaq = (index: number, key: 'pergunta' | 'resposta', val: string) => {
    const updated = [...faqs];
    updated[index][key] = val;
    setFaqs(updated);
  };

  const handleRemoveFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  // Normalização e link de teste do WhatsApp
  let rawNum = whatsappNumero.replace(/\D/g, '');
  if (rawNum.length === 10 || rawNum.length === 11) {
    rawNum = '55' + rawNum;
  }
  const previewText = whatsappMensagem
    .replace(/\[PROTOCOLO\]/g, 'PDC-2026-X8K92')
    .replace(/\{PROTOCOLO\}/g, 'PDC-2026-X8K92')
    .replace(/\[NOME FANTASIA\]/g, 'Mercearia Central')
    .replace(/\{NOME_FANTASIA\}/g, 'Mercearia Central');
  const testWhatsappUrl = rawNum ? `https://wa.me/${rawNum}?text=${encodeURIComponent(previewText)}` : '';

  return (
    <div className="p-4 sm:p-8 lg:p-10 space-y-6 sm:space-y-8 max-w-5xl overflow-x-hidden">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Configurações da Plataforma
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Personalize a identidade visual, mensagens do WhatsApp e regras do formulário em tempo real
          </p>
        </div>

        {activeTab !== 'seguranca' ? (
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-orange-600/25 transition-all cursor-pointer self-start sm:self-auto disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Alterações</span>
              </>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold hidden sm:inline-block">Status de Segurança:</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${twoFactorEnabled ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
              {twoFactorEnabled ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> : <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />}
              <span>{twoFactorEnabled ? '2FA Ativo' : '2FA Desativado'}</span>
            </span>
          </div>
        )}
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-bold animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {twoFactorSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-bold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{twoFactorSuccess}</span>
        </div>
      )}

      {/* Abas */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { key: 'visual', label: 'Identidade Visual', icon: Palette },
          { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
          { key: 'conteudo', label: 'Textos & FAQ', icon: FileText },
          { key: 'formulario', label: 'Regras do Formulário', icon: Sliders },
          { key: 'privacidade', label: 'Privacidade & LGPD', icon: Shield },
          { key: 'seguranca', label: 'Segurança & 2FA', icon: KeyRound },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Conteúdo da Aba 1: Identidade Visual */}
      {activeTab === 'visual' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-soft space-y-6">
          <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-3">
            Identidade Visual e Cores da Plataforma
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nome da Plataforma / Projeto
              </label>
              <input
                type="text"
                value={nomeSite}
                onChange={(e) => setNomeSite(e.target.value)}
                placeholder="Ex: Rede Logística Parceira"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-hidden focus:border-orange-500"
              />
            </div>

            {/* Cor Primária */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Cor Primária de Destaque (Hexadecimal)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={corPrimaria}
                  onChange={(e) => setCorPrimaria(e.target.value)}
                  className="w-12 h-12 rounded-xl border border-slate-300 cursor-pointer p-1"
                />
                <input
                  type="text"
                  value={corPrimaria}
                  onChange={(e) => setCorPrimaria(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-300 font-mono text-sm focus:outline-hidden focus:border-orange-500"
                />
              </div>
              <div className="flex gap-2 mt-2">
                {['#EE4D2D', '#2563EB', '#0D9488', '#7C3AED', '#EA580C'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCorPrimaria(c)}
                    className="w-6 h-6 rounded-full border border-white shadow-xs cursor-pointer"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Cor Secundária */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Cor Secundária (Fundo / Textos)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={corSecundaria}
                  onChange={(e) => setCorSecundaria(e.target.value)}
                  className="w-12 h-12 rounded-xl border border-slate-300 cursor-pointer p-1"
                />
                <input
                  type="text"
                  value={corSecundaria}
                  onChange={(e) => setCorSecundaria(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-300 font-mono text-sm focus:outline-hidden focus:border-orange-500"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Texto de Aviso Legal de Independência (Exibido no rodapé e avisos)
              </label>
              <textarea
                rows={3}
                value={avisoIndependencia}
                onChange={(e) => setAvisoIndependencia(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-800 text-xs focus:outline-hidden focus:border-orange-500 leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba 2: WhatsApp */}
      {activeTab === 'whatsapp' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-soft space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                <span>Integração com WhatsApp de Atendimento</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure o número e as mensagens automáticas aplicadas em todo o site e formulário.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer self-start sm:self-auto disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando WhatsApp...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar WhatsApp</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Número do WhatsApp de Atendimento
                </label>
                {rawNum.length === 10 || rawNum.length === 11 ? (
                  <button
                    type="button"
                    onClick={() => setWhatsappNumero('55' + rawNum)}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
                  >
                    + Adicionar DDI 55 (Brasil) automaticamente
                  </button>
                ) : null}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                  type="text"
                  value={whatsappNumero}
                  onChange={(e) => setWhatsappNumero(e.target.value)}
                  placeholder="Ex: 5511999998888 ou 11999998888"
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-300 font-mono text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
                {rawNum && (
                  <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Normalizado:</span>
                    <strong className="text-emerald-700">+{rawNum}</strong>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Pode digitar com ou sem pontuação (ex: <strong>5511999998888</strong> ou <strong>(11) 99999-8888</strong>). Se omitir o 55, o sistema adicionará o DDI Brasil automaticamente ao salvar.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Modelo da Mensagem Automática (Tags: [PROTOCOLO] e [NOME FANTASIA])
              </label>
              <textarea
                rows={4}
                value={whatsappMensagem}
                onChange={(e) => setWhatsappMensagem(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-800 text-xs font-mono focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 leading-relaxed"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Utilize as tags <code>[PROTOCOLO]</code> e <code>[NOME FANTASIA]</code> para que o link gerado após o envio do cadastro preencha os dados do comerciante automaticamente.
              </p>
            </div>

            {/* Onde esse WhatsApp é exibido no site */}
            <div className="md:col-span-2 p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 text-xs text-emerald-900 space-y-2">
              <span className="font-extrabold flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Onde este número é utilizado na plataforma:
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-emerald-800 text-[11px]">
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <strong>Botão Flutuante do WhatsApp</strong> em todas as páginas públicas
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <strong>Botão de Atendimento</strong> no cabeçalho (Navbar)
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <strong>Card Oficial de Suporte</strong> no rodapé de todas as páginas
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <strong>Botão Concluir pelo WhatsApp</strong> na tela final com protocolo
                </li>
              </ul>
            </div>

            {/* Pré-visualização da Mensagem */}
            <div className="md:col-span-2 bg-[#EFEAE2] p-6 rounded-2xl border border-emerald-200/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 block">
                  Pré-visualização da Conversa no WhatsApp:
                </span>
                {rawNum && (
                  <span className="text-[11px] font-mono text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 font-bold">
                    Destino: +{rawNum}
                  </span>
                )}
              </div>
              <div className="max-w-md bg-white p-4 rounded-2xl rounded-tl-xs shadow-md text-xs text-slate-800 whitespace-pre-line leading-relaxed border border-slate-100">
                {previewText}
              </div>

              {testWhatsappUrl && (
                <div className="pt-2 flex flex-wrap gap-3 items-center">
                  <a
                    href={testWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#25D366] hover:bg-[#20BD5A] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Testar abertura no WhatsApp Web / App
                  </a>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Salvar Alterações Agora
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba 3: Textos & FAQ */}
      {activeTab === 'conteudo' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-soft space-y-6">
          <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-3">
            Textos Principais da Página Inicial
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Título da Seção Principal (Hero)
              </label>
              <input
                type="text"
                value={tituloHero}
                onChange={(e) => setTituloHero(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-hidden focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Subtítulo da Seção Principal
              </label>
              <textarea
                rows={2}
                value={subtituloHero}
                onChange={(e) => setSubtituloHero(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-800 text-xs focus:outline-hidden focus:border-orange-500"
              />
            </div>
          </div>

          {/* Gerenciador de FAQ */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm">
                Perguntas Frequentes (FAQ) — {faqs.length} perguntas
              </h4>
              <button
                type="button"
                onClick={handleAddFaq}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Pergunta
              </button>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <div key={index} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="text"
                      value={faq.pergunta}
                      onChange={(e) => handleUpdateFaq(index, 'pergunta', e.target.value)}
                      placeholder="Pergunta"
                      className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFaq(index)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg"
                      title="Excluir pergunta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={faq.resposta}
                    onChange={(e) => handleUpdateFaq(index, 'resposta', e.target.value)}
                    placeholder="Resposta"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba 4: Regras do Formulário */}
      {activeTab === 'formulario' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-soft space-y-6">
          <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-3">
            Regras de Preenchimento e Uploads
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Habilitar Coleta de Dados Bancários?
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="coleta_ativa"
                    checked={coletaBancariaAtiva === true}
                    onChange={() => setColetaBancariaAtiva(true)}
                    className="h-4 w-4 text-orange-600"
                  />
                  Sim, exibir etapa bancária
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="coleta_ativa"
                    checked={coletaBancariaAtiva === false}
                    onChange={() => setColetaBancariaAtiva(false)}
                    className="h-4 w-4 text-orange-600"
                  />
                  Ocultar campos bancários
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Dados Bancários Obrigatórios?
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="coleta_obrigatoria"
                    checked={coletaBancariaObrigatoria === true}
                    onChange={() => setColetaBancariaObrigatoria(true)}
                    className="h-4 w-4 text-orange-600"
                  />
                  Obrigatório (Mínimo 2 bancos exigidos)
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="coleta_obrigatoria"
                    checked={coletaBancariaObrigatoria === false}
                    onChange={() => setColetaBancariaObrigatoria(false)}
                    className="h-4 w-4 text-orange-600"
                  />
                  Opcional
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Limite de Upload por Foto (MB)
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={limiteUploadMb}
                onChange={(e) => setLimiteUploadMb(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-mono text-sm focus:outline-hidden focus:border-orange-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba 5: Privacidade & LGPD */}
      {activeTab === 'privacidade' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-soft space-y-6">
          <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-3">
            Diretrizes de Privacidade e LGPD
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Prazo de Retenção de Dados das Solicitações (Dias)
              </label>
              <input
                type="number"
                min={30}
                max={1825}
                value={retencaoDias}
                onChange={(e) => setRetencaoDias(Number(e.target.value))}
                className="w-full max-w-xs px-4 py-2.5 rounded-xl border border-slate-300 font-mono text-sm focus:outline-hidden focus:border-orange-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Período em que os dados de candidatos não contratados são retidos para novos contatos de expansão logística.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2">
              <span className="font-bold text-slate-900 block">Medidas de Proteção Ativas:</span>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>Acesso aos dados bancários mascarado por padrão no painel de administração.</li>
                <li>Impedimento de consultas públicas aos registros de candidaturas.</li>
                <li>Mecanismo de exclusão imediata sob solicitação do titular (botão de lixeira na solicitação).</li>
                <li>Registro cronológico de histórico e auditoria de cada alteração de status.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba 6: Segurança & 2FA */}
      {activeTab === 'seguranca' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-soft space-y-6 animate-fadeIn">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-orange-600" />
              <span>Autenticação de Dois Fatores (Google Authenticator)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Adicione uma camada de blindagem à sua conta de administrador exigindo um código de 6 dígitos gerado no aplicativo do seu celular para fazer login.
            </p>
          </div>

          {/* Status Geral */}
          {twoFactorLoading ? (
            <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
              <span className="text-xs font-semibold text-slate-600">Verificando status de segurança do 2FA no servidor...</span>
            </div>
          ) : twoFactorEnabled ? (
            <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-2xl border border-emerald-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-base">Google Authenticator Ativo</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Ativado & Seguro
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Sua conta de administrador está protegida por verificação em 2 etapas (TOTP RFC 6238).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs font-bold shadow-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Proteção Mandatória Ativa</span>
                </div>
              </div>

              <div className="p-4 bg-white/80 backdrop-blur-xs rounded-xl border border-emerald-100 text-xs text-slate-700 space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Como funciona o acesso:</span>
                </div>
                <p className="text-slate-600">
                  Ao informar e-mail e senha na tela de login, o sistema solicitará o código de 6 dígitos gerado em tempo real no aplicativo Google Authenticator do seu smartphone.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Card de Aviso / Status Desativado */}
              <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50/40 rounded-2xl border border-amber-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-base">Google Authenticator Desativado</span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                          Proteção Básica
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        O login atual requer apenas e-mail e senha. Recomendamos ativar o 2FA para blindar o acesso ao painel.
                      </p>
                    </div>
                  </div>

                  {!setupData && (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleStartSetup2FA}
                        disabled={setupLoading}
                        className="px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-600/20 transition-all cursor-pointer flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
                      >
                        {setupLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Gerando QR Code...</span>
                          </>
                        ) : (
                          <>
                            <QrCode className="w-4 h-4" />
                            <span>Configurar com QR Code</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-white/80 rounded-xl border border-amber-100 text-xs">
                    <span className="font-bold text-slate-900 block mb-1">Proteção contra invasões</span>
                    <span className="text-slate-600 text-[11px]">Mesmo que alguém descubra sua senha, não poderá entrar sem o token do celular.</span>
                  </div>
                  <div className="p-3 bg-white/80 rounded-xl border border-amber-100 text-xs">
                    <span className="font-bold text-slate-900 block mb-1">App Gratuito</span>
                    <span className="text-slate-600 text-[11px]">Funciona com Google Authenticator, Microsoft Authenticator ou Authy.</span>
                  </div>
                  <div className="p-3 bg-white/80 rounded-xl border border-amber-100 text-xs">
                    <span className="font-bold text-slate-900 block mb-1">Ativação Rápida</span>
                    <span className="text-slate-600 text-[11px]">Basta escanear o QR Code ou clicar em ativar diretamente com 1 clique.</span>
                  </div>
                </div>
              </div>

              {/* Wizard de Configuração Ativa */}
              {setupData && (
                <div className="p-6 bg-slate-50 rounded-2xl border-2 border-orange-200/80 space-y-6 animate-fadeIn">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-orange-600" />
                      <span>Passo a Passo de Vinculação</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setSetupData(null);
                        setVerifyToken('');
                        setVerifyError('');
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>

                  {/* Passo 1 */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-orange-600 text-white text-[11px] font-bold flex items-center justify-center">1</span>
                      <span className="font-bold text-slate-900 text-xs">Baixe o Google Authenticator no seu celular</span>
                    </div>
                    <p className="text-slate-600 text-xs pl-7">
                      Abra a <strong>Google Play Store</strong> (Android) ou <strong>App Store</strong> (iPhone) e instale o aplicativo gratuito <em>Google Authenticator</em>.
                    </p>
                  </div>

                  {/* Passo 2 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-orange-600 text-white text-[11px] font-bold flex items-center justify-center">2</span>
                      <span className="font-bold text-slate-900 text-xs">Escaneie o QR Code abaixo com o aplicativo</span>
                    </div>

                    <div className="pl-7 flex flex-col sm:flex-row items-center gap-6 p-4 bg-white rounded-2xl border border-slate-200">
                      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs shrink-0">
                        <img
                          src={setupData.qr_code}
                          alt="QR Code do Google Authenticator"
                          className="w-44 h-44 block"
                        />
                      </div>
                      <div className="space-y-3 text-xs text-slate-600 max-w-md">
                        <p className="font-medium text-slate-800">
                          Abra o app no celular, clique no ícone <strong>+</strong> e selecione <strong>"Ler código QR"</strong>.
                        </p>
                        <div>
                          <span className="block text-[11px] font-bold text-slate-700 mb-1">
                            Não consegue escanear? Adicione manualmente com a chave:
                          </span>
                          <div className="flex items-center gap-2">
                            <code className="px-3 py-2 bg-slate-100 rounded-lg border border-slate-300 font-mono text-xs font-bold text-slate-900 select-all tracking-wider">
                              {setupData.secret}
                            </code>
                            <button
                              type="button"
                              onClick={handleCopySecret}
                              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs shrink-0"
                            >
                              {copiedSecret ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Copiado</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copiar</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Passo 3 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-orange-600 text-white text-[11px] font-bold flex items-center justify-center">3</span>
                      <span className="font-bold text-slate-900 text-xs">Confirme com o código de 6 dígitos gerado pelo aplicativo</span>
                    </div>

                    <form onSubmit={handleVerifyAndEnable} className="pl-7 space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={verifyToken}
                          onChange={(e) => setVerifyToken(e.target.value.replace(/\D/g, ''))}
                          placeholder="000000"
                          autoFocus
                          className="w-44 text-center font-mono text-2xl tracking-[0.3em] font-extrabold px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="submit"
                            disabled={verifyLoading || verifyToken.replace(/\D/g, '').length !== 6}
                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                          >
                            {verifyLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Validando...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Confirmar e Ativar 2FA</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSetupData(null);
                              setVerifyToken('');
                              setVerifyError('');
                            }}
                            className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>

                      {verifyError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2 max-w-md">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>{verifyError}</span>
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Card de Alteração de Senha Administrativa Blindada com 2FA */}
          <div className="pt-6 border-t border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-slate-700" />
              <h4 className="font-extrabold text-slate-900 text-sm">Alterar Senha de Acesso Administrativo</h4>
            </div>
            <p className="text-xs text-slate-500">
              {twoFactorEnabled
                ? 'Como o 2FA está ativo, a alteração de senha exige a senha atual e a confirmação em 2 etapas com o código do celular.'
                : 'Mantenha sua senha forte com no mínimo 8 caracteres para proteção do painel.'}
            </p>

            <form onSubmit={handleChangePassword} className="max-w-md space-y-3.5 bg-slate-50/70 p-5 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Senha Atual <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={passwordCurrent}
                  onChange={(e) => setPasswordCurrent(e.target.value)}
                  placeholder="Digite sua senha atual"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-base sm:text-sm focus:outline-hidden focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nova Senha (mínimo 8 caracteres) <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={passwordNew}
                  onChange={(e) => setPasswordNew(e.target.value)}
                  placeholder="Nova senha segura"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-base sm:text-sm focus:outline-hidden focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirmar Nova Senha <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-base sm:text-sm focus:outline-hidden focus:border-orange-500"
                  required
                />
              </div>

              {twoFactorEnabled && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Código de 6 Dígitos do Google Authenticator <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={password2FACode}
                    onChange={(e) => setPassword2FACode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full text-center text-lg tracking-[0.25em] font-mono font-bold px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:border-orange-500"
                    required
                  />
                </div>
              )}

              {passwordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={passwordLoading || !passwordCurrent || passwordNew.length < 8 || passwordNew !== passwordConfirm || (twoFactorEnabled && password2FACode.length !== 6)}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {passwordLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Atualizando senha...</span>
                  </>
                ) : (
                  <span>Atualizar Senha Administrativa</span>
                )}
              </button>
            </form>
          </div>
          </div>
        )}

      {/* Modal de Confirmação 2FA ao Salvar Configurações */}
      {show2FASaveModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-2fa-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-orange-600 font-extrabold text-base">
                <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-orange-600" />
                </div>
                <span id="modal-2fa-title">Confirmar identidade</span>
              </div>
              <button
                type="button"
                disabled={isSavingWith2FA}
                onClick={() => {
                  setShow2FASaveModal(false);
                  setSave2FACode('');
                  setSave2FAError('');
                }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Por segurança, informe seu código de autenticação de dois fatores para salvar as alterações.
            </p>

            <form onSubmit={handleConfirmSaveWith2FA} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 text-center">
                  Código de Autenticação (6 dígitos)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={save2FACode}
                  onChange={(e) => setSave2FACode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center text-2xl tracking-[0.35em] font-mono font-black py-3 px-4 rounded-2xl bg-slate-50 border-2 border-slate-300 focus:outline-hidden focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 text-slate-800 placeholder:text-slate-300"
                  required
                  autoFocus
                  disabled={isSavingWith2FA}
                />
                <p className="text-[11px] text-slate-400 text-center mt-1.5">
                  Abra o aplicativo Google Authenticator no seu celular para consultar o código.
                </p>
              </div>

              {save2FAError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{save2FAError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSavingWith2FA}
                  onClick={() => {
                    setShow2FASaveModal(false);
                    setSave2FACode('');
                    setSave2FAError('');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingWith2FA || save2FACode.length !== 6}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {isSavingWith2FA ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Validando e Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Confirmar e salvar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Informativo quando 2FA não está ativado */}
      {showNo2FAWarningModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-no-2fa-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-amber-600 font-extrabold text-base">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                </div>
                <span id="modal-no-2fa-title">Autenticação em Duas Etapas Obrigatória</span>
              </div>
              <button
                type="button"
                onClick={() => setShowNo2FAWarningModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Para salvar alterações nas <strong className="text-slate-800">Configurações da Plataforma</strong>, é obrigatório possuir a autenticação de dois fatores (2FA) configurada na sua conta de administrador.
            </p>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNo2FAWarningModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNo2FAWarningModal(false);
                  handleTabChange('seguranca');
                }}
                className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Configurar 2FA agora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
