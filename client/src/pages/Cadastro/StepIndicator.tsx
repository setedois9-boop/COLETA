import React from 'react';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
  onSelectStep?: (step: number) => void;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  totalSteps,
  stepTitles,
  onSelectStep,
}) => {
  const progressPercent = Math.round(((currentStep - 1) / (totalSteps - 1)) * 100);

  return (
    <div className="bg-white border-b border-slate-200/80 sticky top-20 z-30 shadow-xs">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
        {/* Cabeçalho do progresso */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-bold text-orange-600 uppercase tracking-wider block">
              Criação de solicitação
            </span>
            <h2 className="text-xs sm:text-lg font-extrabold text-slate-900 truncate">
              Etapa {currentStep} de {totalSteps}:{' '}
              <span className="text-slate-600 font-semibold">{stepTitles[currentStep - 1]}</span>
            </h2>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500">{progressPercent}% Concluído</span>
          </div>
        </div>

        {/* Barra de progresso contínua */}
        <div className="w-full h-1.5 sm:h-2 bg-slate-100 rounded-full overflow-hidden mb-3 sm:mb-4">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Círculos das etapas (1 a 8) */}
        <div className="flex items-center justify-between relative px-0.5">
          {Array.from({ length: totalSteps }).map((_, index) => {
            const stepNum = index + 1;
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;

            return (
              <button
                key={stepNum}
                type="button"
                disabled={stepNum > currentStep}
                onClick={() => onSelectStep && onSelectStep(stepNum)}
                className={`flex flex-col items-center group transition-all shrink-0 ${
                  stepNum <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'
                }`}
              >
                <div
                  className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : isCurrent
                      ? 'bg-orange-600 text-white ring-2 sm:ring-4 ring-orange-100 shadow-md scale-105 sm:scale-110'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" /> : stepNum}
                </div>
                <span className="hidden sm:block text-[10px] font-medium text-slate-500 mt-1 max-w-[60px] truncate text-center">
                  Etapa {stepNum}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
