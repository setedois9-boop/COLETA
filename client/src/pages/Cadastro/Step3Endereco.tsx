import React, { useState } from 'react';
import { MapPin, Loader2, AlertCircle, Search } from 'lucide-react';
import { FormDataCadastro } from '../../types';
import { mascaraCEP } from '../../utils/validators';
import { consultarCEP } from '../../services/api';

interface Step3Props {
  data: FormDataCadastro;
  updateData: (fields: Partial<FormDataCadastro>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const Step3Endereco: React.FC<Step3Props> = ({
  data,
  updateData,
  onNext,
  onPrev,
}) => {
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepNotice, setCepNotice] = useState<string>('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatado = mascaraCEP(raw);
    updateData({ cep: formatado });

    const digitsOnly = formatado.replace(/\D/g, '');
    if (digitsOnly.length === 8) {
      setLoadingCep(true);
      setCepNotice('');
      try {
        const resultado = await consultarCEP(digitsOnly);
        if (resultado) {
          updateData({
            estado: resultado.estado || data.estado,
            cidade: resultado.cidade || data.cidade,
            bairro: resultado.bairro || data.bairro,
            rua: resultado.rua || data.rua,
          });
          setCepNotice('Endereço localizado com sucesso! Verifique o número e complemento.');
        } else {
          setCepNotice('CEP não encontrado na base pública. Preencha o endereço manualmente.');
        }
      } catch {
        setCepNotice('Consulta automática indisponível. Por favor, preencha manualmente.');
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const isValid =
    data.cep.replace(/\D/g, '').length === 8 &&
    data.estado.trim().length >= 2 &&
    data.cidade.trim().length >= 2 &&
    data.bairro.trim().length >= 2 &&
    data.rua.trim().length >= 2 &&
    data.numero.trim().length >= 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      cep: true,
      estado: true,
      cidade: true,
      bairro: true,
      rua: true,
      numero: true,
    });

    if (isValid) {
      onNext();
    }
  };

  const ufs = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-orange-600" />
          Indique qual é a localização da loja
        </h3>
        <p className="text-slate-500 text-sm mt-1">
          Informe o endereço comercial onde o ponto de coleta irá funcionar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
        {/* CEP */}
        <div className="md:col-span-3">
          <label className="block text-sm font-bold text-slate-700 mb-1.5">
            CEP <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={data.cep}
              onChange={handleCepChange}
              onBlur={() => handleBlur('cep')}
              placeholder="00000-000"
              maxLength={9}
              className={`w-full px-4 py-3 rounded-xl border text-slate-900 font-mono text-base transition-colors focus:outline-hidden ${
                touched.cep && data.cep.replace(/\D/g, '').length < 8
                  ? 'border-red-500 bg-red-50/30'
                  : 'border-slate-300 focus:border-orange-500'
              }`}
            />
            <div className="absolute right-3.5 top-3.5 text-slate-400">
              {loadingCep ? (
                <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
              ) : (
                <Search className="w-5 h-5" />
              )}
            </div>
          </div>
          {cepNotice && (
            <p className="mt-1 text-xs text-slate-600 flex items-center gap-1 font-medium">
              {cepNotice}
            </p>
          )}
          {touched.cep && data.cep.replace(/\D/g, '').length < 8 && (
            <p className="mt-1 text-xs text-red-600 font-medium">CEP completo com 8 dígitos é obrigatório.</p>
          )}
        </div>

        {/* Estado (UF) */}
        <div className="md:col-span-3">
          <label className="block text-sm font-bold text-slate-700 mb-1.5">
            Estado (UF) <span className="text-red-500">*</span>
          </label>
          <select
            value={data.estado}
            onChange={(e) => updateData({ estado: e.target.value })}
            onBlur={() => handleBlur('estado')}
            className={`w-full px-4 py-3 rounded-xl border text-slate-900 text-sm bg-white transition-colors focus:outline-hidden ${
              touched.estado && !data.estado
                ? 'border-red-500 bg-red-50/30'
                : 'border-slate-300 focus:border-orange-500'
            }`}
          >
            <option value="">Selecione o Estado</option>
            {ufs.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>

        {/* Cidade */}
        <div className="md:col-span-3">
          <label className="block text-sm font-bold text-slate-700 mb-1.5">
            Cidade <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.cidade}
            onChange={(e) => updateData({ cidade: e.target.value })}
            onBlur={() => handleBlur('cidade')}
            placeholder="Ex: São Paulo"
            className={`w-full px-4 py-3 rounded-xl border text-slate-900 text-sm transition-colors focus:outline-hidden ${
              touched.cidade && !data.cidade.trim()
                ? 'border-red-500 bg-red-50/30'
                : 'border-slate-300 focus:border-orange-500'
            }`}
          />
        </div>

        {/* Bairro */}
        <div className="md:col-span-3">
          <label className="block text-sm font-bold text-slate-700 mb-1.5">
            Bairro <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.bairro}
            onChange={(e) => updateData({ bairro: e.target.value })}
            onBlur={() => handleBlur('bairro')}
            placeholder="Ex: Centro / Vila Mariana"
            className={`w-full px-4 py-3 rounded-xl border text-slate-900 text-sm transition-colors focus:outline-hidden ${
              touched.bairro && !data.bairro.trim()
                ? 'border-red-500 bg-red-50/30'
                : 'border-slate-300 focus:border-orange-500'
            }`}
          />
        </div>

        {/* Rua / Logradouro */}
        <div className="md:col-span-4">
          <label className="block text-sm font-bold text-slate-700 mb-1.5">
            Rua / Avenida / Praça <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.rua}
            onChange={(e) => updateData({ rua: e.target.value })}
            onBlur={() => handleBlur('rua')}
            placeholder="Ex: Rua das Flores"
            className={`w-full px-4 py-3 rounded-xl border text-slate-900 text-sm transition-colors focus:outline-hidden ${
              touched.rua && !data.rua.trim()
                ? 'border-red-500 bg-red-50/30'
                : 'border-slate-300 focus:border-orange-500'
            }`}
          />
        </div>

        {/* Número */}
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-slate-700 mb-1.5">
            Número <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.numero}
            onChange={(e) => updateData({ numero: e.target.value })}
            onBlur={() => handleBlur('numero')}
            placeholder="Ex: 120 ou S/N"
            className={`w-full px-4 py-3 rounded-xl border text-slate-900 text-sm transition-colors focus:outline-hidden ${
              touched.numero && !data.numero.trim()
                ? 'border-red-500 bg-red-50/30'
                : 'border-slate-300 focus:border-orange-500'
            }`}
          />
        </div>

        {/* Informação Complementar */}
        <div className="md:col-span-6">
          <label className="block text-sm font-bold text-slate-700 mb-1.5">
            Complemento <span className="text-slate-400 font-normal">(Opcional)</span>
          </label>
          <input
            type="text"
            value={data.complemento}
            onChange={(e) => updateData({ complemento: e.target.value })}
            placeholder="Ex: Sala 2, Loja B, Ao lado da farmácia"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-orange-500 text-slate-900 text-sm transition-colors focus:outline-hidden"
          />
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
