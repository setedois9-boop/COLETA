import React, { useState } from 'react';
import { Map, CheckCircle2, Navigation } from 'lucide-react';
import { FormDataCadastro } from '../../types';
import { MapPicker } from '../../components/MapPicker';

interface Step4Props {
  data: FormDataCadastro;
  updateData: (fields: Partial<FormDataCadastro>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const Step4Mapa: React.FC<Step4Props> = ({
  data,
  updateData,
  onNext,
  onPrev,
}) => {
  const [confirmed, setConfirmed] = useState(data.localizacao_confirmada || false);

  const addressSummary = [
    data.rua,
    data.numero ? `nº ${data.numero}` : '',
    data.bairro,
    data.cidade ? `${data.cidade} - ${data.estado}` : '',
    data.cep ? `CEP: ${data.cep}` : '',
  ]
    .filter(Boolean)
    .join(', ');

  const handleCoordinatesChange = (lat: number, lng: number) => {
    updateData({
      latitude: lat,
      longitude: lng,
    });
  };

  const handleConfirmAndContinue = () => {
    updateData({ localizacao_confirmada: true });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <Map className="w-5 h-5 text-orange-600" />
          Confirme a localização da sua loja no mapa
        </h3>
        <p className="text-slate-500 text-sm mt-1">
          Posicione com precisão o ponto de coleta para que os motoristas e transportadores parceiros encontrem seu comércio sem dificuldades.
        </p>
      </div>

      <MapPicker
        latitude={data.latitude || -23.55052}
        longitude={data.longitude || -46.633308}
        addressSummary={addressSummary}
        onChange={handleCoordinatesChange}
      />

      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
        <input
          id="confirmLocation"
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-1 h-5 w-5 rounded-md border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
        />
        <label htmlFor="confirmLocation" className="text-sm text-slate-700 cursor-pointer select-none">
          <span className="font-bold text-slate-900 block mb-0.5">
            Confirmo que o marcador representa a entrada correta do estabelecimento comercial.
          </span>
          Ao confirmar, salvamos a latitude e longitude exatas da sua loja para rotas logísticas.
        </label>
      </div>

      <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrev}
          className="order-2 sm:order-1 px-6 py-3 border border-slate-300 hover:border-slate-400 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer text-center"
        >
          Voltar
        </button>

        <button
          type="button"
          disabled={!confirmed}
          onClick={handleConfirmAndContinue}
          className={`order-1 sm:order-2 px-6 sm:px-8 py-3.5 font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
            confirmed
              ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/20 hover:shadow-orange-600/35 hover:-translate-y-0.5 cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Confirmar localização e continuar</span>
        </button>
      </div>
    </div>
  );
};
