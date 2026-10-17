import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Componente que garante que qualquer navegação entre rotas / páginas
 * sempre reposicione a visualização no topo (top: 0).
 */
export const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname, search]);

  return null;
};
