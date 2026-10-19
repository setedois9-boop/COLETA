import React, { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Copy,
  Check,
  MessageCircle,
  Home,
  ShieldAlert,
  Calendar,
  Store,
  Hash,
  AlertTriangle,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { useConfig } from '../context/ConfigContext';

export const CadastroConcluido: React.FC = () => {
  const { config } = useConfig();
  const location = useLocation();
  const navigate = useNavigate();

  const state = (location.state as {
    protocolo?: string;
    nome_fantasia?: string;
    criado_em?: string;
  }) || {};

  const protocolo = state.protocolo || 'PDC-2026-REGISTRO';
  const nomeFantasia = state.nome_fantasia || 'Seu Estabelecimento';
  const dataEnvio = state.criado_em
    ? new Date(state.criado_em).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('pt-BR');

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Disparar confetti de celebração
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#EE4D2D', '#F97316', '#FBBF24', '#10B981'],
      });
    } catch {}
  }, []);

  const handleCopyProtocolo = () => {
    navigator.clipboard.writeText(protocolo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Montar link do WhatsApp com dados dinâmicos configurados no painel
  let rawNumber = config?.whatsapp_numero?.replace(/\D/g, '') || '';
  if (rawNumber.length === 10 || rawNumber.length === 11) {
    rawNumber = '55' + rawNumber;
  }
  const templateMsg =
    config?.whatsapp_mensagem ||
    'Olá! Acabei de enviar uma solicitação para cadastrar meu estabelecimento como ponto de coleta.\n\nProtocolo: [PROTOCOLO]\nEstabelecimento: [NOME FANTASIA]\n\nGostaria de receber orientações sobre as próximas etapas.';

  const finalMsg = templateMsg
    .replace(/\[PROTOCOLO\]/g, protocolo)
    .replace(/\{PROTOCOLO\}/g, protocolo)
    .replace(/\[NOME FANTASIA\]/g, nomeFantasia)
    .replace(/\{NOME_FANTASIA\}/g, nomeFantasia);

  const whatsappLink = rawNumber ? `https://wa.me/${rawNumber}?text=${encodeURIComponent(finalMsg)}` : '';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="grow max-w-3xl w-full mx-auto px-3 sm:px-6 py-8 sm:py-12 flex flex-col items-center justify-center overflow-x-hidden">
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-soft p-4 sm:p-8 md:p-12 text-center w-full relative overflow-hidden max-w-full">
          {/* Faixa decorativa superior */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-orange-500 to-amber-500" />

          {/* Ícone de Sucesso */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-5 sm:mb-6 ring-4 sm:ring-8 ring-emerald-50 shadow-inner">
            <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 stroke-[2.5]" />
          </div>

          <span className="inline-block px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-2">
            Solicitação Registrada
          </span>

          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
            Solicitação enviada com sucesso!
          </h1>

          <p className="text-slate-600 text-xs sm:text-base max-w-lg mx-auto leading-relaxed mb-6 sm:mb-8">
            Recebemos os dados do seu estabelecimento. Para obter orientações sobre o atendimento e as próximas etapas, entre em contato com nossa equipe pelo WhatsApp.
          </p>

          {/* Card com Detalhes do Protocolo */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 text-left space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div className="min-w-0">
                <span className="text-xs text-slate-500 font-medium block">Número do Protocolo:</span>
                <span className="text-lg sm:text-xl font-mono font-extrabold text-slate-900 tracking-wider break-all block">
                  {protocolo}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyProtocolo}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copiar Protocolo</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Store className="w-4 h-4 text-orange-600 shrink-0" />
                <span className="truncate">
                  <strong className="text-slate-900">Loja:</strong> {nomeFantasia}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Calendar className="w-4 h-4 text-orange-600 shrink-0" />
                <span>
                  <strong className="text-slate-900">Data de Envio:</strong> {dataEnvio}
                </span>
              </div>
            </div>
          </div>

          {/* Card de Notificação Rápida */}
          <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 mb-6 text-left flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <MessageCircle className="w-5 h-5 fill-white" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs sm:text-sm font-extrabold text-emerald-950 flex items-center gap-2">
                Notificação Rápida de Atendimento
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
                  Prioritário
                </span>
              </h4>
              <p className="text-[11px] sm:text-xs text-emerald-800 leading-relaxed">
                Nossa central de triagem já foi notificada do seu cadastro! Para agilizar sua avaliação geográfica e receber o checklist de requisitos, confirme seu protocolo pelo WhatsApp abaixo:
              </p>
            </div>
          </div>

          {/* Aviso Legal de Não Aprovação Automática */}
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 mb-6 sm:mb-8 text-left flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Importante:</strong> O envio desta solicitação é uma manifestação formal de interesse e <strong>não representa aprovação automática ou vínculo comercial imediato</strong>. Todos os cadastros passam por triagem técnica, geográfica e de capacidade de espaço.
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            {whatsappLink ? (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 sm:py-4 bg-[#25D366] hover:bg-[#20BD5A] text-white font-extrabold rounded-2xl shadow-xl shadow-emerald-600/25 hover:shadow-emerald-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all text-xs sm:text-base cursor-pointer text-center"
              >
                <MessageCircle className="w-5 h-5 fill-white shrink-0" />
                <span>CONTINUAR PELO WHATSAPP</span>
              </a>
            ) : (
              <div className="w-full sm:w-auto p-4 rounded-xl bg-slate-100 text-slate-600 text-xs flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                Número de WhatsApp em configuração pelo suporte.
              </div>
            )}

            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:py-4 border border-slate-300 hover:border-slate-400 text-slate-700 font-bold rounded-2xl text-xs sm:text-sm transition-colors cursor-pointer text-center"
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>Voltar ao início</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
