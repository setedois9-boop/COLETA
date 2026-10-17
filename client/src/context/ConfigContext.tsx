import React, { createContext, useContext, useEffect, useState } from 'react';
import { SiteConfig } from '../types';
import { fetchSiteConfig } from '../services/api';

interface ConfigContextType {
  config: SiteConfig | null;
  loading: boolean;
  refreshConfig: () => Promise<void>;
  updateLocalConfig: (newConfig: Partial<SiteConfig>) => void;
}

const ConfigContext = createContext<ConfigContextType>({
  config: null,
  loading: true,
  refreshConfig: async () => {},
  updateLocalConfig: () => {},
});

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const loadConfig = async () => {
    try {
      const data = await fetchSiteConfig();
      setConfig(data);
      applyTheme(data.cor_primaria, data.cor_secundaria);
    } catch (err) {
      console.warn('Usando configurações padrão temporárias:', err);
      // Fallback padrão seguro
      const fallback: SiteConfig = {
        nome_site: 'Rede Logística Parceira',
        titulo_hero: 'Transforme seu estabelecimento em um ponto de coleta',
        subtitulo_hero: 'Cadastre os dados da sua loja e envie uma solicitação de interesse para participar de operações de coleta e entrega de encomendas.',
        cor_primaria: '#EE4D2D',
        cor_secundaria: '#0F172A',
        whatsapp_numero: '5511999998888',
        whatsapp_mensagem: 'Olá! Acabei de enviar uma solicitação para cadastrar meu estabelecimento como ponto de coleta.\n\nProtocolo: [PROTOCOLO]\nEstabelecimento: [NOME FANTASIA]\n\nGostaria de receber orientações sobre as próximas etapas.',
        coleta_bancaria_obrigatoria: true,
        coleta_bancaria_ativa: true,
        limite_upload_mb: 10,
        retencao_dias: 365,
        aviso_independencia: 'Aviso importante: Este portal é uma plataforma independente de captação de interesse de estabelecimentos comerciais para potenciais pontos de coleta e logística parceira. Não afirmamos representação oficial direta ou credenciamento antecipado pela Shopee. Todas as solicitações passam por análise prévia e estão sujeitas à disponibilidade regional.',
        beneficios: [],
        como_funciona: [],
        requisitos: [],
        perguntas_frequentes: [],
        tipos_comercio: [
          'Mercearia ou minimercado',
          'Loja de conveniência',
          'Papelaria',
          'Loja de roupas',
          'Loja de eletrônicos',
          'Assistência técnica',
          'Outros'
        ],
        servicos_disponiveis: [
          'Receber pacotes de vendedores da Shopee',
          'Entregar pacotes a compradores da Shopee',
          'Realizar entregas a domicílio de pacotes da Shopee em áreas próximas da loja'
        ]
      };
      setConfig(fallback);
      applyTheme(fallback.cor_primaria, fallback.cor_secundaria);
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (primaria?: string, secundaria?: string) => {
    if (primaria) {
      document.documentElement.style.setProperty('--primary', primaria);
      // Ajustar tom do hover
      document.documentElement.style.setProperty('--primary-hover', primaria);
    }
    if (secundaria) {
      document.documentElement.style.setProperty('--secondary', secundaria);
    }
  };

  const updateLocalConfig = (newConfig: Partial<SiteConfig>) => {
    setConfig(prev => (prev ? { ...prev, ...newConfig } : (newConfig as SiteConfig)));
    if (newConfig.cor_primaria || newConfig.cor_secundaria) {
      applyTheme(newConfig.cor_primaria, newConfig.cor_secundaria);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loading, refreshConfig: loadConfig, updateLocalConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => useContext(ConfigContext);
