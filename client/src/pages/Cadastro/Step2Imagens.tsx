import React, { useState } from 'react';
import { Camera, UploadCloud, X, AlertCircle, Image as ImageIcon, CheckCircle2, Sparkles } from 'lucide-react';
import { FormDataCadastro } from '../../types';

interface Step2Props {
  data: FormDataCadastro;
  updateData: (fields: Partial<FormDataCadastro>) => void;
  onNext: () => void;
  onPrev: () => void;
  maxMb?: number;
}

export const Step2Imagens: React.FC<Step2Props> = ({
  data,
  updateData,
  onNext,
  onPrev,
  maxMb = 15,
}) => {
  const [fachadaPreview, setFachadaPreview] = useState<string | null>(data.foto_fachada_url || null);
  const [interiorPreview, setInteriorPreview] = useState<string | null>(data.foto_interior_url || null);
  const [fachadaError, setFachadaError] = useState<string>('');
  const [interiorError, setInteriorError] = useState<string>('');

  const createSampleFile = (name: string, title: string, subtitle: string): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const grad = ctx.createLinearGradient(0, 0, 800, 600);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#ea580c');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 600);

      ctx.strokeStyle = '#ffffff44';
      ctx.lineWidth = 6;
      ctx.strokeRect(20, 20, 760, 560);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, 400, 280);

      ctx.fillStyle = '#fed7aa';
      ctx.font = '20px sans-serif';
      ctx.fillText(subtitle, 400, 330);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px sans-serif';
      ctx.fillText('Foto de Teste / Demonstração', 400, 380);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], name, { type: 'image/jpeg' });
          resolve(file);
        }
      }, 'image/jpeg', 0.9);
    });
  };

  const handleUseSampleImages = async () => {
    const fachadaFile = await createSampleFile(
      'fachada_exemplo.jpg',
      'FACHADA COMERCIAL',
      'Ponto de Coleta e Entrega'
    );
    const interiorFile = await createSampleFile(
      'interior_exemplo.jpg',
      'ÁREA INTERNA DE PACOTES',
      'Espaço Seguro de Armazenamento'
    );

    const fUrl = URL.createObjectURL(fachadaFile);
    const iUrl = URL.createObjectURL(interiorFile);

    setFachadaPreview(fUrl);
    setInteriorPreview(iUrl);
    setFachadaError('');
    setInteriorError('');

    updateData({
      foto_fachada: fachadaFile,
      foto_fachada_url: fUrl,
      foto_interior: interiorFile,
      foto_interior_url: iUrl,
    });
  };

  const handleFileChange = (
    tipo: 'fachada' | 'interior',
    file: File | undefined
  ) => {
    if (!file) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxBytes = maxMb * 1024 * 1024;

    if (!allowed.includes(file.type.toLowerCase())) {
      const msg = 'Formato não suportado. Utilize apenas JPG, JPEG, PNG ou WEBP.';
      tipo === 'fachada' ? setFachadaError(msg) : setInteriorError(msg);
      return;
    }

    if (file.size > maxBytes) {
      const msg = `O arquivo ultrapassa o tamanho máximo permitido de ${maxMb}MB.`;
      tipo === 'fachada' ? setFachadaError(msg) : setInteriorError(msg);
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    if (tipo === 'fachada') {
      setFachadaError('');
      setFachadaPreview(previewUrl);
      updateData({ foto_fachada: file, foto_fachada_url: previewUrl });
    } else {
      setInteriorError('');
      setInteriorPreview(previewUrl);
      updateData({ foto_interior: file, foto_interior_url: previewUrl });
    }
  };

  const handleRemove = (tipo: 'fachada' | 'interior') => {
    if (tipo === 'fachada') {
      setFachadaPreview(null);
      setFachadaError('');
      updateData({ foto_fachada: null, foto_fachada_url: undefined });
    } else {
      setInteriorPreview(null);
      setInteriorError('');
      updateData({ foto_interior: null, foto_interior_url: undefined });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let hasError = false;
    if (!data.foto_fachada && !fachadaPreview) {
      setFachadaError('A foto da fachada é obrigatória.');
      hasError = true;
    }
    if (!data.foto_interior && !interiorPreview) {
      setInteriorError('A foto do interior da loja é obrigatória.');
      hasError = true;
    }

    if (!hasError) {
      onNext();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Camera className="w-5 h-5 text-orange-600" />
            Envie imagens da loja
          </h3>
          <p className="text-slate-500 text-sm mt-1">
            As fotos são fundamentais para a análise visual da identificação da fachada e capacidade de armazenamento.
          </p>
        </div>
        <button
          type="button"
          onClick={handleUseSampleImages}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Usar fotos de exemplo para teste
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload 1: Fachada */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-sm">
                1. Imagem da Fachada <span className="text-red-500">*</span>
              </span>
              {(fachadaPreview || data.foto_fachada) && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Anexada
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              As fotos devem ser tiradas na <strong>horizontal</strong>. Não utilize filtros, textos ou figurinhas. De preferência, não devem aparecer pessoas na imagem. Caso apareçam, elas não podem cobrir a fachada.
            </p>
          </div>

          {fachadaPreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-md group aspect-4/3 flex items-center justify-center">
              <img
                src={fachadaPreview}
                alt="Prévia da fachada"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRemove('fachada')}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Remover
                </button>
              </div>
            </div>
          ) : (
            <label className="border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-2xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center aspect-4/3 bg-slate-50/50 hover:bg-orange-50/30 group">
              <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-slate-800 group-hover:text-orange-600">
                Clique para selecionar a foto da Fachada
              </span>
              <span className="text-xs text-slate-400 mt-1">
                ou arraste e solte o arquivo aqui (JPG, PNG ou WEBP até {maxMb}MB)
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleFileChange('fachada', e.target.files?.[0])}
              />
            </label>
          )}

          {fachadaError && (
            <p className="text-xs text-red-600 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {fachadaError}
            </p>
          )}
        </div>

        {/* Upload 2: Interior */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-sm">
                2. Imagem do Interior <span className="text-red-500">*</span>
              </span>
              {(interiorPreview || data.foto_interior) && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Anexada
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Mostre a <strong>área onde os pacotes poderão ser armazenados</strong>. As fotos devem ser tiradas na horizontal e não podem conter filtros, textos ou figurinhas.
            </p>
          </div>

          {interiorPreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-md group aspect-4/3 flex items-center justify-center">
              <img
                src={interiorPreview}
                alt="Prévia do interior"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRemove('interior')}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Remover
                </button>
              </div>
            </div>
          ) : (
            <label className="border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-2xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center aspect-4/3 bg-slate-50/50 hover:bg-orange-50/30 group">
              <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ImageIcon className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-slate-800 group-hover:text-orange-600">
                Clique para selecionar a foto do Interior
              </span>
              <span className="text-xs text-slate-400 mt-1">
                Área reservada para pacotes (JPG, PNG ou WEBP até {maxMb}MB)
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleFileChange('interior', e.target.files?.[0])}
              />
            </label>
          )}

          {interiorError && (
            <p className="text-xs text-red-600 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {interiorError}
            </p>
          )}
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
          className="flex-1 sm:flex-none px-5 sm:px-8 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-600/20 hover:shadow-orange-600/35 hover:-translate-y-0.5 transition-all text-xs sm:text-sm cursor-pointer text-center"
        >
          Continuar
        </button>
      </div>
    </form>
  );
};
