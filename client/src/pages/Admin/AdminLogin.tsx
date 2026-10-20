import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Mail,
  KeyRound,
  Loader2,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  Eye,
  EyeOff,
  Smartphone,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminLogin: React.FC = () => {
  const { login, verify2FA } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [preAuthToken, setPreAuthToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handlePreFillDemo = () => {
    setEmail('admin@pontodecoleta.com.br');
    setSenha('Admin@2026');
    setErrorMsg('');
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await login(email, senha);
      if (res.require_2fa) {
        setPreAuthToken(res.pre_auth_token || '');
        setStep('2fa');
        setErrorMsg('');
        return;
      }
      navigate('/admin');
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao autenticar. Verifique e-mail e senha.');
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      if (!preAuthToken) {
        setErrorMsg('A etapa de autenticação expirou. Informe novamente seu e-mail e senha.');
        setStep('credentials');
        return;
      }
      const res = await verify2FA(preAuthToken, twoFactorCode);
      if (res.token) {
        navigate('/admin');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Código do Google Authenticator inválido ou expirado. Tente novamente.');
      setTwoFactorCode('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-6 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar ao site público
        </button>

        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-600/30">
            {step === '2fa' ? <Smartphone className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
        </div>

        <h2 className="text-center text-2xl sm:text-3xl font-black text-white tracking-tight">
          {step === '2fa' ? 'Verificação em Duas Etapas' : 'Painel Administrativo'}
        </h2>
        <p className="mt-2 text-center text-xs text-slate-400 max-w-sm mx-auto">
          {step === '2fa'
            ? 'Digite o código de 6 dígitos gerado pelo Google Authenticator no seu celular.'
            : 'Acesso restrito para gestão de solicitações e configurações da rede'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-3 sm:px-0">
        <div className="bg-slate-800/90 backdrop-blur-xl py-6 sm:py-8 px-4 sm:px-10 shadow-2xl rounded-2xl sm:rounded-3xl border border-slate-700/80">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-xs font-medium animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'credentials' ? (
            <form className="space-y-5" onSubmit={handleCredentialsSubmit}>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  E-mail Administrativo
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@pontodecoleta.com.br"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 text-base sm:text-sm focus:outline-hidden focus:border-orange-500 transition-colors"
                  />
                  <Mail className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-10 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 text-base sm:text-sm focus:outline-hidden focus:border-orange-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-600/30 hover:shadow-orange-600/40 text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Acessar Painel</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Formulário do 2FA do Google Authenticator */
            <form className="space-y-6 animate-fadeIn" onSubmit={handle2FASubmit}>
              <div className="p-3.5 bg-orange-500/10 border border-orange-500/30 rounded-xl flex items-center gap-3 text-orange-300 text-xs">
                <ShieldCheck className="w-5 h-5 text-orange-400 shrink-0" />
                <span>
                  Proteção 2FA ativa para <strong className="text-white">{email}</strong>.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 text-center">
                  Código de 6 dígitos do Google Authenticator
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-4 py-3.5 rounded-xl bg-slate-900 border-2 border-orange-500 text-white font-mono text-center text-2xl tracking-[0.4em] placeholder-slate-600 focus:outline-hidden focus:ring-4 focus:ring-orange-500/20 transition-all"
                />
              </div>

              <div className="space-y-2.5">
                <button
                  type="submit"
                  disabled={isLoading || twoFactorCode.length < 6}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-600/30 text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Validando código...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Confirmar e Entrar</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('credentials');
                    setTwoFactorCode('');
                    setPreAuthToken('');
                    setErrorMsg('');
                  }}
                  className="w-full py-2.5 px-4 bg-transparent hover:bg-slate-700/50 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center"
                >
                  Voltar e digitar outra senha
                </button>
              </div>
            </form>
          )}

          {/* Atalho de Demonstração para testes rápidos */}
          <div className="mt-6 pt-6 border-t border-slate-700/60 text-center space-y-2">
            <button
              type="button"
              onClick={handlePreFillDemo}
              className="inline-flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 font-medium py-1.5 px-3 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Preencher credenciais padrão
            </button>
            <p className="text-[11px] text-slate-500 font-mono">
              admin@pontodecoleta.com.br / Admin@2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
