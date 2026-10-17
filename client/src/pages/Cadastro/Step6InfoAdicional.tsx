import React, { useState } from 'react';
import { HelpCircle, Car, Users, Truck, PackageCheck, AlertCircle } from 'lucide-react';
import { FormDataCadastro } from '../../types';

interface Step6Props {
  data: FormDataCadastro;
  updateData: (fields: Partial<FormDataCadastro>) => void;
  onNext: () => void;
  onPrev: () => void;
  servicosDisponiveis?: string[];
}

export const Step6InfoAdicional: React.FC<Step6Props> = ({
  data,
  updateData,
  onNext,
  onPrev,
  servicosDisponiveis = [
    'Receber pacotes de vendedores parceiros',
    'Entregar pacotes a compradores locais',
    'Realizar entregas de pacotes em áreas próximas da loja',
  ],
}) => {
  const [errorMsg, setErrorMsg] = useState('');

  const ESTACIONAMENTO_OPCOES = [
    'Sim, tem um estacionamento.',
    'Sim, há um lugar próximo onde os transportadores podem deixar e retirar pacotes.',
    'Não tem estacionamento, mas os transportadores podem parar na rua.',
  ];

  const COLABORADORES_OPCOES = [
    'Não tem colaboradores.',
    'Sim, tem 1 colaborador.',
    'Sim, tem de 2 a 5 colaboradores.',
    'Sim, tem mais de 5 colaboradores.',
  ];

  const EXPERIENCIA_OPCOES = [
    'Sim, já trabalhou com recebimento ou entrega de pacotes.',
    'Sim, já fez entregas a domicílio.',
    'Sim, já trabalhou com recebimento ou entrega de pacotes e também fez entregas a domicílio.',
    'Não, ainda não trabalhou com nenhuma dessas opções, mas queremos ter essa experiência.',
  ];

  const toggleServico = (servico: string) => {
    let list = [...(data.servicos_desejados || [])];
    if (list.includes(servico)) {
      list = list.filter((s) => s !== servico);
    } else {
      list.push(servico);
    }
    updateData({ servicos_desejados: list });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!data.estacionamento) {
      setErrorMsg('Selecione uma opção sobre estacionamento.');
      return;
    }
    if (!data.quantidade_colaboradores) {
      setErrorMsg('Selecione uma opção sobre o número de colaboradores.');
      return;
    }
    if (!data.experiencia_logistica) {
      setErrorMsg('Informe se possui experiência prévia com entregas ou recebimento.');
      return;
    }
    if (!data.servicos_desejados || data.servicos_desejados.length === 0) {
      setErrorMsg('Selecione ao menos um serviço que gostaria de oferecer.');
      return;
    }

    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="border-b border-slate-100 pb-4">
        <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-orange-600" />
          Responda a estas perguntas adicionais sobre a loja
        </h3>
        <p className="text-slate-500 text-sm mt-1">
          Essas respostas nos ajudam a classificar a capacidade do seu comércio na malha logística da região.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm font-medium">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Pergunta 1: Estacionamento */}
      <div className="space-y-3">
        <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Car className="w-4 h-4 text-orange-600" />
          1. A loja tem estacionamento ou lugar próximo para estacionar? <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 gap-2.5">
          {ESTACIONAMENTO_OPCOES.map((opcao) => (
            <label
              key={opcao}
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                data.estacionamento === opcao
                  ? 'border-orange-500 bg-orange-50/30 ring-1 ring-orange-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="estacionamento"
                checked={data.estacionamento === opcao}
                onChange={() => updateData({ estacionamento: opcao })}
                className="mt-0.5 h-4 w-4 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-slate-800 font-medium">{opcao}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Pergunta 2: Colaboradores */}
      <div className="space-y-3">
        <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-orange-600" />
          2. A loja tem colaboradores? Se sim, quantos? <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {COLABORADORES_OPCOES.map((opcao) => (
            <label
              key={opcao}
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                data.quantidade_colaboradores === opcao
                  ? 'border-orange-500 bg-orange-50/30 ring-1 ring-orange-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="colaboradores"
                checked={data.quantidade_colaboradores === opcao}
                onChange={() => updateData({ quantidade_colaboradores: opcao })}
                className="mt-0.5 h-4 w-4 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-slate-800 font-medium">{opcao}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Pergunta 3: Histórico de logística */}
      <div className="space-y-3">
        <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Truck className="w-4 h-4 text-orange-600" />
          3. A loja já trabalhou com recebimento ou entrega de pacotes, ou fez entregas a domicílio? <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 gap-2.5">
          {EXPERIENCIA_OPCOES.map((opcao) => (
            <label
              key={opcao}
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                data.experiencia_logistica === opcao
                  ? 'border-orange-500 bg-orange-50/30 ring-1 ring-orange-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="experiencia"
                checked={data.experiencia_logistica === opcao}
                onChange={() => updateData({ experiencia_logistica: opcao })}
                className="mt-0.5 h-4 w-4 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-slate-800 font-medium">{opcao}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Pergunta 4: Serviços Desejados (Multi-seleção) */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-orange-600" />
            4. Qual serviço você gostaria de oferecer na loja? <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-slate-500 mt-1">Você pode escolher mais de uma opção.</p>
        </div>
        <div className="grid grid-cols-1 gap-2.5">
          {servicosDisponiveis.map((servico) => {
            const isChecked = (data.servicos_desejados || []).includes(servico);
            return (
              <label
                key={servico}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  isChecked
                    ? 'border-orange-500 bg-orange-50/30 ring-1 ring-orange-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleServico(servico)}
                  className="mt-0.5 h-4 w-4 rounded-sm border-slate-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm text-slate-800 font-medium">{servico}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrev}
          className="flex-1 sm:flex-none px-4 sm:px-6 py-3 border border-slate-300 hover:border-slate-400 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer text-center"
        >
          Voltar
        </button>

        <button
          type="submit"
          className="flex-1 sm:flex-none px-5 sm:px-8 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-600/20 hover:shadow-orange-600/35 hover:-translate-y-0.5 transition-all text-xs sm:text-sm cursor-pointer text-center"
        >
          Continuar
        </button>
      </div>
    </form>
  );
};
