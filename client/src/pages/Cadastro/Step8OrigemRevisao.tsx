import React, { useState } from 'react';
import {
  Send,
  Edit2,
  CheckCircle,
  FileCheck2,
  AlertCircle,
  Loader2,
  Store,
  MapPin,
  Clock,
  Car,
  User,
  Camera,
} from 'lucide-react';
import { FormDataCadastro } from '../../types';

interface Step8Props {
  data: FormDataCadastro;
  updateData: (fields: Partial<FormDataCadastro>) => void;
  onSubmit: () => void;
  onPrev: () => void;
  onJumpToStep: (step: number) => void;
  isSubmitting: boolean;
  submitError?: string;
}

const ORIGENS = [
  'Anúncio em redes sociais.',
  'Recebi uma ligação e me orientaram a preencher o formulário.',
  'Fui indicado por outra agência ou por um colaborador da Shopee.',
  'Em um evento.',
  'Outro.',
];

export const Step8OrigemRevisao: React.FC<Step8Props> = ({
  data,
  updateData,
  onSubmit,
  onPrev,
  onJumpToStep,
  isSubmitting,
  submitError,
}) => {
  const [errorLocal, setErrorLocal] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal('');

    if (!data.origem_cadastro) {
      setErrorLocal('Por favor, informe como você descobriu essa oportunidade.');
      return;
    }

    if (data.origem_cadastro === 'Outro.' && !data.origem_outro?.trim()) {
      setErrorLocal('Por favor, especifique como conheceu a oportunidade no campo "Outro".');
      return;
    }

    if (!data.foto_fachada || !data.foto_interior) {
      setErrorLocal('As 2 fotos obrigatórias (fachada e área interna de pacotes) precisam ser anexadas antes de finalizar o envio. Por favor, clique em "Editar" no card 2 (Imagens Anexadas) acima.');
      return;
    }

    if (!data.banco_1?.trim() || !data.agencia_1?.trim() || !data.conta_1?.trim() || !data.pix_1?.trim()) {
      setErrorLocal('Os dados do Banco 1 (Principal) são obrigatórios. Por favor, clique em "Editar" no card de Responsável & Bancos.');
      return;
    }

    if (!data.banco_2?.trim() || !data.agencia_2?.trim() || !data.conta_2?.trim() || !data.pix_2?.trim()) {
      setErrorLocal('É obrigatório cadastrar no mínimo 2 bancos. Os dados do Banco 2 (Secundário) estão incompletos. Por favor, clique em "Editar" no card de Responsável & Bancos.');
      return;
    }

    if (!data.aceitou_termos) {
      setErrorLocal('É obrigatório confirmar a leitura e concordância com os Termos de Privacidade e Proteção de Dados.');
      return;
    }

    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Origem da Descoberta */}
      <div>
        <div className="border-b border-slate-100 pb-4 mb-5">
          <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-orange-600" />
            Como você descobriu que sua loja poderia ser um ponto de coleta?
          </h3>
          <p className="text-slate-500 text-sm mt-1">
            Selecione a fonte do seu primeiro contato com este programa.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2.5 mb-4">
          {ORIGENS.map((origem) => (
            <label
              key={origem}
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                data.origem_cadastro === origem
                  ? 'border-orange-500 bg-orange-50/30 ring-1 ring-orange-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="origem_cadastro"
                checked={data.origem_cadastro === origem}
                onChange={() => updateData({ origem_cadastro: origem })}
                className="mt-0.5 h-4 w-4 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-slate-800 font-medium">{origem}</span>
            </label>
          ))}
        </div>

        {data.origem_cadastro === 'Outro.' && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl animate-fadeIn">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Como você descobriu essa oportunidade? <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.origem_outro}
              onChange={(e) => updateData({ origem_outro: e.target.value })}
              placeholder="Ex: Grupo de comerciantes locais no WhatsApp"
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:border-orange-500"
            />
          </div>
        )}
      </div>

      {/* Resumo Completo das Etapas Preenchidas */}
      <div className="pt-6 border-t border-slate-200">
        <div className="mb-4">
          <h4 className="text-base font-extrabold text-slate-900 flex items-center justify-between">
            <span>Resumo da Candidatura</span>
            <span className="text-xs font-normal text-slate-500">
              Revise os dados antes de finalizar o envio
            </span>
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Estabelecimento */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600 flex items-center gap-1">
                  <Store className="w-3.5 h-3.5" /> 1. Estabelecimento
                </span>
                <button
                  type="button"
                  onClick={() => onJumpToStep(1)}
                  className="text-xs text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" /> Editar
                </button>
              </div>
              <p className="font-bold text-slate-900 text-sm">{data.nome_fantasia || '—'}</p>
              <p className="text-xs text-slate-600">{data.razao_social}</p>
              <p className="text-xs text-slate-500 font-mono mt-1">CNPJ: {data.cnpj}</p>
              <p className="text-xs text-slate-600 mt-1">
                Tipo: <span className="font-medium">{data.tipo_comercio === 'Outros' ? data.tipo_comercio_outro : data.tipo_comercio}</span>
              </p>
            </div>
          </div>

          {/* Card 2: Fotos */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5" /> 2. Imagens Anexadas
                </span>
                <button
                  type="button"
                  onClick={() => onJumpToStep(2)}
                  className="text-xs text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" /> Editar
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                {data.foto_fachada ? (
                  <div className="flex items-center gap-1 text-emerald-700 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Fachada anexada
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Fachada pendente
                  </div>
                )}

                {data.foto_interior ? (
                  <div className="flex items-center gap-1 text-emerald-700 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Interior anexado
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Interior pendente
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Endereço & Mapa */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> 3 & 4. Endereço e Mapa
                </span>
                <button
                  type="button"
                  onClick={() => onJumpToStep(3)}
                  className="text-xs text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" /> Editar
                </button>
              </div>
              <p className="text-xs text-slate-800 font-medium">
                {data.rua}, {data.numero} {data.complemento && `(${data.complemento})`}
              </p>
              <p className="text-xs text-slate-600">
                {data.bairro} — {data.cidade}/{data.estado}
              </p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">CEP: {data.cep}</p>
              <p className="text-[11px] text-emerald-700 mt-1 font-medium">
                Localização no mapa confirmada ({data.latitude?.toFixed(4)}, {data.longitude?.toFixed(4)})
              </p>
            </div>
          </div>

          {/* Card 4: Horários */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> 5. Horários de Atendimento
                </span>
                <button
                  type="button"
                  onClick={() => onJumpToStep(5)}
                  className="text-xs text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" /> Editar
                </button>
              </div>
              <p className="text-xs text-slate-700">
                <span className="font-semibold">Dias:</span> {data.dias_funcionamento.join(', ') || 'Nenhum'}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                {data.fecha_almoco
                  ? `Fecha para almoço (${data.horario_almoco_inicio} às ${data.horario_almoco_fim})`
                  : 'Horário contínuo (sem intervalo de almoço)'}
              </p>
            </div>
          </div>

          {/* Card 5: Informações Operacionais */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600 flex items-center gap-1">
                  <Car className="w-3.5 h-3.5" /> 6. Operação da Loja
                </span>
                <button
                  type="button"
                  onClick={() => onJumpToStep(6)}
                  className="text-xs text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" /> Editar
                </button>
              </div>
              <p className="text-xs text-slate-700"><span className="font-semibold">Estacionamento:</span> {data.estacionamento}</p>
              <p className="text-xs text-slate-700 mt-0.5"><span className="font-semibold">Equipe:</span> {data.quantidade_colaboradores}</p>
              <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                <span className="font-semibold">Serviços:</span> {data.servicos_desejados.join('; ')}
              </p>
            </div>
          </div>

          {/* Card 6: Contato e Bancos */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600 flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> 7. Responsável & Bancos
                </span>
                <button
                  type="button"
                  onClick={() => onJumpToStep(7)}
                  className="text-xs text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" /> Editar
                </button>
              </div>
              <p className="text-xs text-slate-900 font-bold">{data.nome_responsavel}</p>
              <p className="text-xs text-slate-600 font-mono">{data.telefone}</p>
              <p className="text-xs text-slate-600">{data.email}</p>

              <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 space-y-1.5">
                <div className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-200 break-words">
                  <span className="font-bold text-orange-600 block">Banco 1 (Principal):</span>
                  {data.banco_1 ? (
                    <span className="break-all">{data.banco_1} • Ag {data.agencia_1} • Conta {data.conta_1} • PIX: {data.pix_1}</span>
                  ) : (
                    <span className="text-red-600 font-semibold">Pendente de preenchimento</span>
                  )}
                </div>

                <div className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-200 break-words">
                  <span className="font-bold text-slate-800 block">Banco 2 (Secundário):</span>
                  {data.banco_2 ? (
                    <span className="break-all">{data.banco_2} • Ag {data.agencia_2} • Conta {data.conta_2} • PIX: {data.pix_2}</span>
                  ) : (
                    <span className="text-red-600 font-semibold">Pendente de preenchimento</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LGPD & Política de Privacidade */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={data.aceitou_termos}
            onChange={(e) => updateData({ aceitou_termos: e.target.checked })}
            className="mt-1 h-5 w-5 rounded-md border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer shrink-0"
          />
          <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            <span className="font-bold text-slate-900 block mb-0.5">
              Declaro que li e concordo com o Aviso de Privacidade e Tratamento de Dados (LGPD). <span className="text-red-500">*</span>
            </span>
            Autorizo o uso das informações e imagens enviadas unicamente para a finalidade de avaliação técnica, contato telefônico/WhatsApp e verificação da viabilidade de credenciamento do meu estabelecimento como ponto de coleta. Estou ciente de que esta solicitação não garante aprovação automática.
          </div>
        </label>
      </div>

      {(errorLocal || submitError) && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm font-medium">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorLocal || submitError}</span>
        </div>
      )}

      {/* Botões de Ação */}
      <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrev}
          disabled={isSubmitting}
          className="order-2 sm:order-1 px-6 py-3 border border-slate-300 hover:border-slate-400 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer text-center"
        >
          Voltar
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="order-1 sm:order-2 px-6 sm:px-10 py-3.5 sm:py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-extrabold rounded-xl shadow-xl shadow-orange-600/30 hover:shadow-orange-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-center"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Enviando solicitação...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>ENVIAR SOLICITAÇÃO</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
