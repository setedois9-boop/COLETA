import React, { useState } from 'react';
import { Store, Building2, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { FormDataCadastro } from '../../types';
import { mascaraCNPJ, validarCNPJ } from '../../utils/validators';

interface Step1Props {
  data: FormDataCadastro;
  updateData: (fields: Partial<FormDataCadastro>) => void;
  onNext: () => void;
  tiposComercio: string[];
}

export const Step1DadosLoja: React.FC<Step1Props> = ({
  data,
  updateData,
  onNext,
  tiposComercio,
}) => {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [cnpjError, setCnpjError] = useState<string>('');

  const handlePreFillExample = () => {
    updateData({
      cnpj: '11.222.333/0001-81',
      razao_social: 'Comercial Silva & Filhos LTDA',
      nome_fantasia: 'Mercearia do Bairro Silva',
      tipo_comercio: tiposComercio[0] || 'Mercearia ou minimercado',
    });
    setCnpjError('');
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatado = mascaraCNPJ(raw);
    updateData({ cnpj: formatado });

    const digitsOnly = formatado.replace(/\D/g, '');
    if (digitsOnly.length === 14) {
      if (!validarCNPJ(formatado)) {
        setCnpjError('CNPJ inválido. Verifique os dígitos digitados.');
      } else {
        setCnpjError('');
      }
    } else {
      setCnpjError('');
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'cnpj') {
      const digitsOnly = data.cnpj.replace(/\D/g, '');
      if (digitsOnly.length < 14) {
        setCnpjError('O CNPJ deve conter 14 dígitos.');
      } else if (!validarCNPJ(data.cnpj)) {
        setCnpjError('CNPJ com dígitos verificadores inválidos.');
      } else {
        setCnpjError('');
      }
    }
  };

  const isValid =
    validarCNPJ(data.cnpj) &&
    data.razao_social.trim().length >= 3 &&
    data.nome_fantasia.trim().length >= 2 &&
    data.tipo_comercio &&
    (data.tipo_comercio !== 'Outros' || data.tipo_comercio_outro.trim().length > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      cnpj: true,
      razao_social: true,
      nome_fantasia: true,
      tipo_comercio: true,
      tipo_comercio_outro: true,
    });

    if (!validarCNPJ(data.cnpj)) {
      setCnpjError('Por favor, informe um CNPJ válido para continuar.');
      return;
    }

    if (isValid) {
      onNext();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Store className="w-5 h-5 text-orange-600" />
            Preencha os dados do estabelecimento
          </h3>
          <p className="text-slate-500 text-sm mt-1">
            Informe os dados cadastrais da pessoa jurídica do seu comércio.
          </p>
        </div>
        <button
          type="button"
          onClick={handlePreFillExample}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Preencher dados de exemplo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* CNPJ */}
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-slate-700 mb-1.5">
            CNPJ do Estabelecimento <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={data.cnpj}
              onChange={handleCnpjChange}
              onBlur={() => handleBlur('cnpj')}
              placeholder="00.000.000/0000-00"
              maxLength={18}
              className={`w-full px-4 py-3 rounded-xl border text-slate-900 font-mono text-base transition-colors focus:outline-hidden ${
                cnpjError
                  ? 'border-red-500 bg-red-50/30 focus:border-red-600'
                  : data.cnpj && validarCNPJ(data.cnpj)
                  ? 'border-emerald-500 bg-emerald-50/20 focus:border-emerald-600'
                  : 'border-slate-300 focus:border-orange-500'
              }`}
            />
            {data.cnpj && validarCNPJ(data.cnpj) && (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 absolute right-3.5 top-3.5" />
            )}
          </div>
          {cnpjError && (
            <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {cnpjError}
            </p>
          )}
        </div>

        {/* Razão Social */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">
            Razão Social (Nome Jurídico) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={data.razao_social}
              onChange={(e) => updateData({ razao_social: e.target.value })}
              onBlur={() => handleBlur('razao_social')}
              placeholder="Ex: Comercial Silva & Filhos LTDA"
              className={`w-full px-4 py-3 rounded-xl border text-slate-900 text-base sm:text-sm transition-colors focus:outline-hidden ${
                touched.razao_social && data.razao_social.trim().length < 3
                  ? 'border-red-500 bg-red-50/30'
                  : 'border-slate-300 focus:border-orange-500'
              }`}
            />
          </div>
          {touched.razao_social && data.razao_social.trim().length < 3 && (
            <p className="mt-1.5 text-xs text-red-600 font-medium">Informe a razão social completa.</p>
          )}
        </div>

        {/* Nome Fantasia */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">
            Nome Fantasia (Como aparece na fachada) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.nome_fantasia}
            onChange={(e) => updateData({ nome_fantasia: e.target.value })}
            onBlur={() => handleBlur('nome_fantasia')}
            placeholder="Ex: Mercearia do Bairro"
            className={`w-full px-4 py-3 rounded-xl border text-slate-900 text-base sm:text-sm transition-colors focus:outline-hidden ${
              touched.nome_fantasia && data.nome_fantasia.trim().length < 2
                ? 'border-red-500 bg-red-50/30'
                : 'border-slate-300 focus:border-orange-500'
            }`}
          />
          {touched.nome_fantasia && data.nome_fantasia.trim().length < 2 && (
            <p className="mt-1.5 text-xs text-red-600 font-medium">Informe o nome visível do estabelecimento.</p>
          )}
        </div>

        {/* Tipo de Comércio */}
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-slate-700 mb-1.5">
            Tipo de Comércio <span className="text-red-500">*</span>
          </label>
          <select
            value={data.tipo_comercio}
            onChange={(e) => updateData({ tipo_comercio: e.target.value })}
            onBlur={() => handleBlur('tipo_comercio')}
            className={`w-full px-4 py-3 rounded-xl border text-slate-900 text-base sm:text-sm bg-white transition-colors focus:outline-hidden ${
              touched.tipo_comercio && !data.tipo_comercio
                ? 'border-red-500 bg-red-50/30'
                : 'border-slate-300 focus:border-orange-500'
            }`}
          >
            <option value="">Selecione o ramo de atividade</option>
            {tiposComercio.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
        </div>

        {/* Campo condicional 'Outros' */}
        {data.tipo_comercio === 'Outros' && (
          <div className="md:col-span-2 animate-fadeIn">
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Especifique o tipo de comércio <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.tipo_comercio_outro}
              onChange={(e) => updateData({ tipo_comercio_outro: e.target.value })}
              onBlur={() => handleBlur('tipo_comercio_outro')}
              placeholder="Ex: Loja de presentes e utilidades"
              className={`w-full px-4 py-3 rounded-xl border text-slate-900 text-base sm:text-sm transition-colors focus:outline-hidden ${
                touched.tipo_comercio_outro && !data.tipo_comercio_outro.trim()
                  ? 'border-red-500 bg-red-50/30'
                  : 'border-slate-300 focus:border-orange-500'
              }`}
            />
          </div>
        )}
      </div>

      <div className="pt-6 border-t border-slate-100 flex justify-end">
        <button
          type="submit"
          className="w-full sm:w-auto px-8 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-600/20 hover:shadow-orange-600/35 hover:-translate-y-0.5 transition-all text-sm cursor-pointer text-center"
        >
          Continuar
        </button>
      </div>
    </form>
  );
};
