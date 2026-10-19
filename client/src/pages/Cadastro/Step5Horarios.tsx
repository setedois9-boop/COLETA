import React, { useState } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { FormDataCadastro, HorariosFuncionamento } from '../../types';
import { compararHorarios } from '../../utils/validators';

interface Step5Props {
  data: FormDataCadastro;
  updateData: (fields: Partial<FormDataCadastro>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const DIAS_SEMANA = [
  { key: 'SEG', nome: 'Segunda-feira' },
  { key: 'TER', nome: 'Terça-feira' },
  { key: 'QUA', nome: 'Quarta-feira' },
  { key: 'QUI', nome: 'Quinta-feira' },
  { key: 'SEX', nome: 'Sexta-feira' },
  { key: 'SAB', nome: 'Sábado' },
  { key: 'DOM', nome: 'Domingo' },
];

export const Step5Horarios: React.FC<Step5Props> = ({
  data,
  updateData,
  onNext,
  onPrev,
}) => {
  const [errorMsg, setErrorMsg] = useState('');

  // Garantir que horarios_funcionamento esteja devidamente estruturado
  const currentHorarios: HorariosFuncionamento = { ...data.horarios_funcionamento };
  DIAS_SEMANA.forEach(({ key }) => {
    if (!currentHorarios[key]) {
      currentHorarios[key] = {
        aberto: data.dias_funcionamento.includes(key),
        abertura: '08:00',
        fechamento: '18:00',
      };
    }
  });

  const toggleDia = (key: string) => {
    const isCurrentlyActive = data.dias_funcionamento.includes(key);
    let newDias: string[];
    if (isCurrentlyActive) {
      newDias = data.dias_funcionamento.filter((d) => d !== key);
    } else {
      newDias = [...data.dias_funcionamento, key];
    }

    const updatedHorarios = {
      ...currentHorarios,
      [key]: {
        ...currentHorarios[key],
        aberto: !isCurrentlyActive,
      },
    };

    updateData({
      dias_funcionamento: newDias,
      horarios_funcionamento: updatedHorarios,
    });
  };

  const handleHorarioChange = (
    diaKey: string,
    tipo: 'abertura' | 'fechamento',
    valor: string
  ) => {
    const updatedHorarios = {
      ...currentHorarios,
      [diaKey]: {
        ...currentHorarios[diaKey],
        [tipo]: valor,
      },
    };
    updateData({ horarios_funcionamento: updatedHorarios });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (data.dias_funcionamento.length === 0) {
      setErrorMsg('Selecione ao menos um dia de funcionamento para o estabelecimento.');
      return;
    }

    // Validar coerência dos horários para cada dia aberto
    for (const diaKey of data.dias_funcionamento) {
      const h = currentHorarios[diaKey];
      if (!h.abertura || !h.fechamento) {
        setErrorMsg(`Preencha o horário de abertura e fechamento para ${diaKey}.`);
        return;
      }
      if (!compararHorarios(h.abertura, h.fechamento)) {
        setErrorMsg(`O horário de fechamento em ${diaKey} deve ser posterior ao de abertura.`);
        return;
      }
    }

    // Validar almoço se ativo
    if (data.fecha_almoco) {
      if (!data.horario_almoco_inicio || !data.horario_almoco_fim) {
        setErrorMsg('Informe os horários de início e término do intervalo de almoço.');
        return;
      }
      if (!compararHorarios(data.horario_almoco_inicio, data.horario_almoco_fim)) {
        setErrorMsg('O horário de retorno do almoço deve ser posterior ao início do intervalo.');
        return;
      }
    }

    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-600" />
          Indique os dias e horários em que a loja está aberta ao público
        </h3>
        <p className="text-slate-500 text-sm mt-1">
          Os horários precisam estar alinhados com a rotina de coletas e retiradas de pacotes por compradores e motoristas.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm font-medium">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grade de dias da semana */}
      <div className="space-y-3">
        <label className="block text-sm font-bold text-slate-800">
          Dias da Semana de Funcionamento <span className="text-red-500">*</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DIAS_SEMANA.map(({ key, nome }) => {
            const isSelected = data.dias_funcionamento.includes(key);
            const horario = currentHorarios[key] || { abertura: '08:00', fechamento: '18:00' };

            return (
              <div
                key={key}
                className={`p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50/20 shadow-xs ring-1 ring-orange-500/30'
                    : 'border-slate-200 bg-slate-50/50 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2.5 cursor-pointer font-bold text-sm text-slate-800">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleDia(key)}
                      className="h-4 w-4 rounded-sm border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    <span>{key} — {nome}</span>
                  </label>
                  {!isSelected && (
                    <span className="text-xs text-slate-400 font-medium">Fechado</span>
                  )}
                </div>

                {isSelected && (
                  <div className="grid grid-cols-2 gap-2 text-xs animate-fadeIn">
                    <div>
                      <span className="text-slate-500 block mb-1">Abertura:</span>
                      <input
                        type="time"
                        value={horario.abertura}
                        onChange={(e) => handleHorarioChange(key, 'abertura', e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-base sm:text-xs focus:outline-hidden focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Fechamento:</span>
                      <input
                        type="time"
                        value={horario.fechamento}
                        onChange={(e) => handleHorarioChange(key, 'fechamento', e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-base sm:text-xs focus:outline-hidden focus:border-orange-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pergunta Almoço */}
      <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-5 space-y-4">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-2">
            Você fecha a loja para o almoço? <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-800 font-medium cursor-pointer">
              <input
                type="radio"
                name="fecha_almoco"
                checked={data.fecha_almoco === true}
                onChange={() => updateData({ fecha_almoco: true })}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500"
              />
              Sim, fechamos para o almoço
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-800 font-medium cursor-pointer">
              <input
                type="radio"
                name="fecha_almoco"
                checked={data.fecha_almoco === false}
                onChange={() => updateData({ fecha_almoco: false })}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500"
              />
              Não, horário ininterrupto
            </label>
          </div>
        </div>

        {data.fecha_almoco && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200 animate-fadeIn">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Início do Intervalo (Fechamento)
              </label>
              <input
                type="time"
                value={data.horario_almoco_inicio || '12:00'}
                onChange={(e) => updateData({ horario_almoco_inicio: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-mono text-base sm:text-sm focus:outline-hidden focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Término do Intervalo (Retorno)
              </label>
              <input
                type="time"
                value={data.horario_almoco_fim || '13:00'}
                onChange={(e) => updateData({ horario_almoco_fim: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-mono text-base sm:text-sm focus:outline-hidden focus:border-orange-500"
              />
            </div>
          </div>
        )}
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
