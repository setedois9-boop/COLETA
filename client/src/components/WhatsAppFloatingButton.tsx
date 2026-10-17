import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useConfig } from '../context/ConfigContext';

export const WhatsAppFloatingButton: React.FC = () => {
  const { config } = useConfig();
  const rawNumber = config?.whatsapp_numero?.replace(/\D/g, '') || '';

  if (!rawNumber) return null;

  const defaultMsg = encodeURIComponent(
    'Olá! Tenho interesse em cadastrar meu estabelecimento como ponto de coleta e gostaria de tirar algumas dúvidas.'
  );
  const whatsappUrl = `https://wa.me/${rawNumber}?text=${defaultMsg}`;

  return (
    <div className="fixed bottom-6 right-6 z-40 group">
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Fale conosco pelo WhatsApp"
        className="flex items-center gap-2.5 px-4 py-3 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-full shadow-xl shadow-emerald-600/30 hover:scale-105 active:scale-95 transition-all duration-200"
      >
        <MessageCircle className="w-6 h-6 fill-white" />
        <span className="font-bold text-sm hidden sm:inline-block pr-1">Dúvidas? Fale Conosco</span>
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
        </span>
      </a>
    </div>
  );
};
