import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Info } from 'lucide-react';

interface MapPickerProps {
  latitude: number;
  longitude: number;
  addressSummary: string;
  onChange: (lat: number, lng: number) => void;
}

export const MapPicker: React.FC<MapPickerProps> = ({
  latitude,
  longitude,
  addressSummary,
  onChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Se o mapa já existe, não recriar
    if (!mapInstanceRef.current) {
      // Custom Pin Icon
      const customIcon = L.divIcon({
        className: 'custom-pin-marker',
        html: `
          <div style="
            background: #EE4D2D;
            width: 38px;
            height: 38px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(238, 77, 45, 0.45);
            border: 3px solid white;
          ">
            <div style="
              width: 12px;
              height: 12px;
              background: white;
              border-radius: 50%;
              transform: rotate(45deg);
            "></div>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
        popupAnchor: [0, -38],
      });

      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 16,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> colaboradores',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([latitude, longitude], {
        draggable: true,
        icon: customIcon,
      }).addTo(map);

      marker.bindPopup('<b>Sua Loja Aqui</b><br>Arraste para ajustar a posição exata').openPopup();

      marker.on('dragend', () => {
        const position = marker.getLatLng();
        onChange(position.lat, position.lng);
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        onChange(e.latlng.lat, e.latlng.lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    } else {
      // Atualizar posição do mapa e marcador se as coordenadas mudarem externamente
      const currentPos = markerRef.current?.getLatLng();
      if (
        currentPos &&
        (Math.abs(currentPos.lat - latitude) > 0.0001 || Math.abs(currentPos.lng - longitude) > 0.0001)
      ) {
        markerRef.current?.setLatLng([latitude, longitude]);
        mapInstanceRef.current?.setView([latitude, longitude], 16);
      }
    }

    return () => {
      // Map cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Centralizar na localização atual do usuário
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          onChange(lat, lng);
          if (mapInstanceRef.current && markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
            mapInstanceRef.current.flyTo([lat, lng], 17);
          }
        },
        (err) => {
          alert('Não foi possível obter sua localização atual: ' + err.message);
        }
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de resumo do endereço */}
      <div className="bg-orange-50/70 border border-orange-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center shrink-0 mt-0.5">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Endereço de referência:</p>
            <p className="text-slate-600">{addressSummary || 'Endereço ainda não preenchido'}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-orange-400 text-slate-700 hover:text-orange-600 rounded-lg text-xs font-medium shadow-xs transition-colors shrink-0"
        >
          <Navigation className="w-3.5 h-3.5 text-orange-500" />
          Minha Localização Atual
        </button>
      </div>

      {/* Instruções */}
      <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>Arraste o pin laranja ou clique diretamente no mapa no local exato da entrada da sua loja.</span>
      </div>

      {/* Container do Mapa */}
      <div className="relative w-full h-[380px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* Feedback de coordenadas */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200/80 rounded-lg px-3 sm:px-4 py-2.5 text-xs text-slate-600">
        <div>
          <span className="font-semibold text-slate-700">Latitude:</span> {latitude.toFixed(6)}
        </div>
        <div>
          <span className="font-semibold text-slate-700">Longitude:</span> {longitude.toFixed(6)}
        </div>
        <div className="text-emerald-700 font-medium flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
          Posição selecionada
        </div>
      </div>
    </div>
  );
};
