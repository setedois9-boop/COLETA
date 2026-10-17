import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AdminErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Admin:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-2xl mx-auto my-12 bg-white rounded-2xl border border-rose-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Ocorreu um erro inesperado ao carregar este módulo
          </h2>
          <p className="text-sm text-slate-500">
            {this.state.error?.message || 'Erro interno na renderização da tela.'}
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-orange-700 transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Recarregar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
