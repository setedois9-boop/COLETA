import React, { useState } from 'react';
import { User, Phone, Mail, CreditCard, ShieldCheck, AlertCircle, Sparkles, Building2 } from 'lucide-react';
import { FormDataCadastro } from '../../types';
import { mascaraTelefone, validarEmail } from '../../utils/validators';

interface Step7Props {
  data: FormDataCadastro;
  updateData: (fields: Partial<FormDataCadastro>) => void;
  onNext: () => void;
  onPrev: () => void;
  coletaBancariaAtiva?: boolean;
  coletaBancariaObrigatoria?: boolean;
}

export const Step7ContatoFinanceiro: React.FC<Step7Props> = ({
  data,
  updateData,
  onNext,
  onPrev,
}) => {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errorMsg, setErrorMsg] = useState('');

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatado = mascaraTelefone(e.target.value);
    updateData({ telefone: formatado });
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handlePreFillBanks = () => {
    updateData({
      banco_1: '260 - Nubank',
      agencia_1: '0001',
      conta_1: '1234567-8',
      tipo_conta_1: 'Corrente Pessoa Jurídica',
      pix_1: data.cnpj || '11.222.333/0001-81',
      banco_2: '341 - Itaú Unibanco',
      agencia_2: '1234',
      conta_2: '98765-4',
      tipo_conta_2: 'Corrente Pessoa Jurídica',
      pix_2: data.email || 'financeiro@lojaparceira.com.br',
    });
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    setTouched({
      nome_responsavel: true,
      telefone: true,
      email: true,
      banco_1: true,
      agencia_1: true,
      conta_1: true,
      pix_1: true,
      banco_2: true,
      agencia_2: true,
      conta_2: true,
      pix_2: true,
    });

    if (data.nome_responsavel.trim().length < 3) {
      setErrorMsg('Informe o nome completo do responsável.');
      return;
    }

    const telLimpo = data.telefone.replace(/\D/g, '');
    if (telLimpo.length < 10) {
      setErrorMsg('Informe um número de telefone celular ou fixo válido com DDD.');
      return;
    }

    if (!validarEmail(data.email)) {
      setErrorMsg('Informe um endereço de e-mail corporativo ou pessoal válido.');
      return;
    }

    // Validação obrigatória da Conta 1
    if (!data.banco_1 || !data.agencia_1?.trim() || !data.conta_1?.trim() || !data.pix_1?.trim()) {
      setErrorMsg('É obrigatório preencher todos os dados da Conta Bancária 1 (Banco, Agência, Conta e Chave Pix).');
      return;
    }

    // Validação obrigatória da Conta 2 (Mínimo dois bancos)
    if (!data.banco_2 || !data.agencia_2?.trim() || !data.conta_2?.trim() || !data.pix_2?.trim()) {
      setErrorMsg('É obrigatório cadastrar no mínimo dois bancos. Por favor, preencha todos os dados da Conta Bancária 2 (Banco, Agência, Conta e Chave Pix).');
      return;
    }

    if (data.banco_1 === data.banco_2 && data.conta_1.trim() === data.conta_2.trim()) {
      setErrorMsg('As contas bancárias informadas não podem ser idênticas. Por favor, informe no mínimo dois bancos ou contas diferentes.');
      return;
    }

    onNext();
  };

  const bancosPrincipais = [
    '001 - Banco do Brasil',
    '237 - Bradesco',
    '341 - Itaú Unibanco',
    '104 - Caixa Econômica Federal',
    '033 - Santander Brasil',
    '260 - Nubank',
    '077 - Banco Inter',
    '336 - C6 Bank',
    '212 - Banco Original',
    '380 - PicPay',
    'Outro Banco / Instituição Financeira',
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Seção 1: Dados do Responsável */}
      <div>
        <div className="border-b border-slate-100 pb-4 mb-5">
          <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5 text-orange-600" />
            Informe os dados da pessoa para entrarmos em contato
          </h3>
          <p className="text-slate-500 text-sm mt-1">
            Esses dados serão utilizados para confirmação do cadastro e orientações no WhatsApp.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm font-medium animate-fadeIn">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Nome */}
          <div className="md:col-span-3">
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Nome Completo do Responsável <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.nome_responsavel}
              onChange={(e) => updateData({ nome_responsavel: e.target.value })}
              onBlur={() => handleBlur('nome_responsavel')}
              placeholder="Ex: Carlos Eduardo de Oliveira"
              className={`w-full px-4 py-3 rounded-xl border text-slate-900 text-base sm:text-sm transition-colors focus:outline-hidden ${
                touched.nome_responsavel && data.nome_responsavel.trim().length < 3
                  ? 'border-red-500 bg-red-50/30'
                  : 'border-slate-300 focus:border-orange-500'
              }`}
            />
          </div>

          {/* Telefone */}
          <div className="md:col-span-1">
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Número de Telefone (WhatsApp) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={data.telefone}
                onChange={handlePhoneChange}
                onBlur={() => handleBlur('telefone')}
                placeholder="(11) 98765-4321"
                maxLength={15}
                className={`w-full px-4 py-3 rounded-xl border text-slate-900 text-base sm:text-sm font-mono transition-colors focus:outline-hidden ${
                  touched.telefone && data.telefone.replace(/\D/g, '').length < 10
                    ? 'border-red-500 bg-red-50/30'
                    : 'border-slate-300 focus:border-orange-500'
                }`}
              />
              <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
            </div>
          </div>

          {/* E-mail */}
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              E-mail para Notificações <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={data.email}
                onChange={(e) => updateData({ email: e.target.value })}
                onBlur={() => handleBlur('email')}
                placeholder="contato@sualoja.com.br"
                className={`w-full px-4 py-3 rounded-xl border text-slate-900 text-base sm:text-sm transition-colors focus:outline-hidden ${
                  touched.email && !validarEmail(data.email)
                    ? 'border-red-500 bg-red-50/30'
                    : 'border-slate-300 focus:border-orange-500'
                }`}
              />
              <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Seção 2: Dados de Recebimento Bancário (OBRIGATÓRIO COM NO MÍNIMO DOIS BANCOS) */}
      <div className="pt-6 border-t border-slate-200">
        <div className="bg-orange-50/40 border border-orange-200 rounded-2xl p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-600/20">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex flex-wrap items-center gap-2">
                  <span>Dados Bancários para Recebimento de Repasses</span>
                  <span className="text-xs bg-orange-600 text-white px-2.5 py-0.5 rounded-full font-bold">
                    Obrigatório (Mínimo 2 Bancos)
                  </span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Para garantir a continuidade operacional dos repasses e evitar atrasos por indisponibilidade bancária, é <strong>obrigatório informar no mínimo duas contas em instituições financeiras diferentes</strong>.
                </p>
                <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 pt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Ambiente com criptografia segura. Nunca solicitamos senha, token ou código de cartão.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePreFillBanks}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-700 hover:text-orange-800 bg-white hover:bg-orange-100 border border-orange-300 rounded-lg shadow-xs transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              Preencher bancos de teste
            </button>
          </div>
        </div>

        {/* Conta 1 Obrigatória */}
        <div className="bg-white border-2 border-slate-200 hover:border-orange-300 rounded-2xl p-5 sm:p-6 space-y-4 mb-6 shadow-xs transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h5 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-orange-600" />
              1ª Conta Bancária Principal <span className="text-red-500">*</span>
            </h5>
            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
              Obrigatória
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Banco 1 <span className="text-red-500">*</span>
              </label>
              <select
                value={data.banco_1}
                onChange={(e) => updateData({ banco_1: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-base sm:text-xs bg-white focus:outline-hidden focus:border-orange-500 font-medium"
              >
                <option value="">Selecione o 1º banco</option>
                {bancosPrincipais.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Agência 1 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={data.agencia_1}
                onChange={(e) => updateData({ agencia_1: e.target.value })}
                placeholder="Ex: 0001"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-base sm:text-xs focus:outline-hidden focus:border-orange-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Conta 1 com Dígito <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={data.conta_1}
                onChange={(e) => updateData({ conta_1: e.target.value })}
                placeholder="Ex: 12345-6"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-base sm:text-xs focus:outline-hidden focus:border-orange-500 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tipo de Conta 1 <span className="text-red-500">*</span>
              </label>
              <select
                value={data.tipo_conta_1}
                onChange={(e) => updateData({ tipo_conta_1: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-base sm:text-xs bg-white focus:outline-hidden focus:border-orange-500"
              >
                <option value="Corrente Pessoa Jurídica">Conta Corrente (Pessoa Jurídica - CNPJ)</option>
                <option value="Corrente Pessoa Física">Conta Corrente (Pessoa Física)</option>
                <option value="Poupança">Conta Poupança</option>
                <option value="Pagamento">Conta de Pagamento</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Chave Pix 1 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={data.pix_1}
                onChange={(e) => updateData({ pix_1: e.target.value })}
                placeholder="CNPJ, E-mail, Celular ou Chave Aleatória"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-base sm:text-xs focus:outline-hidden focus:border-orange-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Conta 2 Obrigatória (Mínimo dois bancos) */}
        <div className="bg-white border-2 border-slate-200 hover:border-orange-300 rounded-2xl p-5 sm:p-6 space-y-4 mb-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h5 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-orange-600" />
              2ª Conta Bancária Secundária <span className="text-red-500">*</span>
            </h5>
            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
              Obrigatória (2º Banco)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Banco 2 <span className="text-red-500">*</span>
              </label>
              <select
                value={data.banco_2}
                onChange={(e) => updateData({ banco_2: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-base sm:text-xs bg-white focus:outline-hidden focus:border-orange-500 font-medium"
              >
                <option value="">Selecione o 2º banco</option>
                {bancosPrincipais.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Agência 2 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={data.agencia_2}
                onChange={(e) => updateData({ agencia_2: e.target.value })}
                placeholder="Ex: 0001"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-base sm:text-xs focus:outline-hidden focus:border-orange-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Conta 2 com Dígito <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={data.conta_2}
                onChange={(e) => updateData({ conta_2: e.target.value })}
                placeholder="Ex: 54321-0"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-base sm:text-xs focus:outline-hidden focus:border-orange-500 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tipo de Conta 2 <span className="text-red-500">*</span>
              </label>
              <select
                value={data.tipo_conta_2 || 'Corrente Pessoa Jurídica'}
                onChange={(e) => updateData({ tipo_conta_2: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-base sm:text-xs bg-white focus:outline-hidden focus:border-orange-500"
              >
                <option value="Corrente Pessoa Jurídica">Conta Corrente (Pessoa Jurídica - CNPJ)</option>
                <option value="Corrente Pessoa Física">Conta Corrente (Pessoa Física)</option>
                <option value="Poupança">Conta Poupança</option>
                <option value="Pagamento">Conta de Pagamento</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Chave Pix 2 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={data.pix_2}
                onChange={(e) => updateData({ pix_2: e.target.value })}
                placeholder="Chave Pix alternativa (E-mail, celular, aleatória)"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-base sm:text-xs focus:outline-hidden focus:border-orange-500 font-mono"
              />
            </div>
          </div>
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
          className="flex-1 sm:flex-none px-4 sm:px-8 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-600/20 hover:shadow-orange-600/35 hover:-translate-y-0.5 transition-all text-xs sm:text-sm cursor-pointer text-center"
        >
          Continuar para Revisão
        </button>
      </div>
    </form>
  );
};
