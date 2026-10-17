import React from 'react';
import { Link } from 'react-router-dom';
import { Package, ShieldAlert, FileText, Lock } from 'lucide-react';
import { useConfig } from '../context/ConfigContext';

export const Footer: React.FC = () => {
  const { config } = useConfig();
  const ano = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-400 text-sm mt-20 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        {/* Banner de Aviso de Independência e LGPD */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 mb-12 text-slate-300">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-white text-base">Aviso Importante e Termos de Uso</h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {config?.aviso_independencia || 
                  'Este portal é uma plataforma independente de captação e análise de interesse de estabelecimentos comerciais para potenciais pontos de coleta e logística parceira de e-commerce. Todas as solicitações passam por análise prévia e estão sujeitas à disponibilidade regional.'
                }
              </p>
              <p className="text-xs text-slate-400">
                Os dados enviados por meio deste formulário são protegidos pela Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e utilizados estritamente para a finalidade de contato e avaliação de viabilidade logística.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Coluna 1: Sobre */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold">
                <Package className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                {config?.nome_site || 'Rede Logística Parceira'}
              </span>
            </div>
            <p className="text-slate-400 text-sm max-w-md leading-relaxed">
              Conectando lojistas e estabelecimentos comerciais às melhores oportunidades de operação logística e pontos de recebimento de encomendas.
            </p>
          </div>

          {/* Coluna 2: Navegação */}
          <div>
            <h5 className="font-bold text-white mb-4 text-xs uppercase tracking-wider">Navegação</h5>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:text-white transition-colors">Página Inicial</Link>
              </li>
              <li>
                <Link to="/cadastro" className="hover:text-white transition-colors">Formulário de Cadastro</Link>
              </li>
              <li>
                <a href="/#como-funciona" className="hover:text-white transition-colors">Como Funciona</a>
              </li>
              <li>
                <a href="/#beneficios" className="hover:text-white transition-colors">Benefícios</a>
              </li>
              <li>
                <a href="/#faq" className="hover:text-white transition-colors">Perguntas Frequentes</a>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Institucional e Admin */}
          <div>
            <h5 className="font-bold text-white mb-4 text-xs uppercase tracking-wider">Segurança & Gestão</h5>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Política de Privacidade</span>
              </li>
              <li className="flex items-center gap-2">
                <Link to="/admin/login" className="hover:text-white transition-colors flex items-center gap-1.5 text-xs text-slate-400">
                  <Lock className="w-3.5 h-3.5 text-orange-500" />
                  Painel de Controle
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {ano} {config?.nome_site || 'Rede Logística Parceira'}. Todos os direitos reservados.</p>
          <p>Plataforma Independente de Candidatura a Pontos de Coleta</p>
        </div>
      </div>
    </footer>
  );
};
