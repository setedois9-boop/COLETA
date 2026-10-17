import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Package, Menu, X, ArrowRight, ShieldCheck, Lock } from 'lucide-react';
import { useConfig } from '../context/ConfigContext';

export const Navbar: React.FC = () => {
  const { config } = useConfig();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isCadastro = location.pathname.startsWith('/cadastro');

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Marca */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight block">
                {config?.nome_site || 'Ponto de Coleta'}
              </span>
              <span className="text-xs font-semibold text-orange-600 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Logística Parceira
              </span>
            </div>
          </Link>

          {/* Menus Desktop (apenas na home ou quando não estiver em processo de cadastro restrito) */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm font-semibold text-slate-700 hover:text-orange-600 transition-colors">
              Início
            </Link>
            <a href="/#como-funciona" className="text-sm font-semibold text-slate-700 hover:text-orange-600 transition-colors">
              Como funciona
            </a>
            <a href="/#beneficios" className="text-sm font-semibold text-slate-700 hover:text-orange-600 transition-colors">
              Benefícios
            </a>
            <a href="/#requisitos" className="text-sm font-semibold text-slate-700 hover:text-orange-600 transition-colors">
              Requisitos
            </a>
            <a href="/#faq" className="text-sm font-semibold text-slate-700 hover:text-orange-600 transition-colors">
              Dúvidas
            </a>
          </nav>

          {/* Botões da Direita */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/admin/login"
              className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              title="Acesso Administrativo"
            >
              <Lock className="w-3.5 h-3.5" />
              Painel
            </Link>

            {!isCadastro && (
              <Link
                to="/cadastro"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all duration-200"
              >
                <span>Iniciar cadastro</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-3">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-semibold text-slate-800 hover:bg-orange-50 hover:text-orange-600"
          >
            Início
          </Link>
          <a
            href="/#como-funciona"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-semibold text-slate-800 hover:bg-orange-50 hover:text-orange-600"
          >
            Como funciona
          </a>
          <a
            href="/#beneficios"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-semibold text-slate-800 hover:bg-orange-50 hover:text-orange-600"
          >
            Benefícios
          </a>
          <a
            href="/#requisitos"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-semibold text-slate-800 hover:bg-orange-50 hover:text-orange-600"
          >
            Requisitos
          </a>
          <a
            href="/#faq"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-semibold text-slate-800 hover:bg-orange-50 hover:text-orange-600"
          >
            Perguntas Frequentes
          </a>

          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            <Link
              to="/cadastro"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md"
            >
              Iniciar cadastro
            </Link>
            <Link
              to="/admin/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2 text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1"
            >
              <Lock className="w-3.5 h-3.5" />
              Área Administrativa
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
