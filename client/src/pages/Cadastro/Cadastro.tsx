import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { StepIndicator } from './StepIndicator';
import { Step1DadosLoja } from './Step1DadosLoja';
import { Step2Imagens } from './Step2Imagens';
import { Step3Endereco } from './Step3Endereco';
import { Step5Horarios } from './Step5Horarios';
import { Step6InfoAdicional } from './Step6InfoAdicional';
import { Step7ContatoFinanceiro } from './Step7ContatoFinanceiro';
import { Step8OrigemRevisao } from './Step8OrigemRevisao';
import { FormDataCadastro } from '../../types';
import { submitCadastro } from '../../services/api';
import { useConfig } from '../../context/ConfigContext';

const STEP_TITLES = [
  'Dados do Estabelecimento',
  'Imagens da Loja',
  'Endereço da Loja',
  'Dias e Horários',
  'Informações Adicionais',
  'Contato e Recebimento',
  'Origem e Revisão',
];

const INITIAL_FORM_DATA: FormDataCadastro = {
  cnpj: '',
  razao_social: '',
  nome_fantasia: '',
  tipo_comercio: '',
  tipo_comercio_outro: '',
  foto_fachada: null,
  foto_interior: null,
  cep: '',
  estado: '',
  cidade: '',
  bairro: '',
  rua: '',
  numero: '',
  complemento: '',
  latitude: -23.55052,
  longitude: -46.633308,
  localizacao_confirmada: true,
  dias_funcionamento: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'],
  horarios_funcionamento: {
    SEG: { aberto: true, abertura: '08:00', fechamento: '18:00' },
    TER: { aberto: true, abertura: '08:00', fechamento: '18:00' },
    QUA: { aberto: true, abertura: '08:00', fechamento: '18:00' },
    QUI: { aberto: true, abertura: '08:00', fechamento: '18:00' },
    SEX: { aberto: true, abertura: '08:00', fechamento: '18:00' },
    SAB: { aberto: false, abertura: '09:00', fechamento: '13:00' },
    DOM: { aberto: false, abertura: '09:00', fechamento: '13:00' },
  },
  fecha_almoco: false,
  horario_almoco_inicio: '12:00',
  horario_almoco_fim: '13:00',
  estacionamento: '',
  quantidade_colaboradores: '',
  experiencia_logistica: '',
  servicos_desejados: [],
  nome_responsavel: '',
  telefone: '',
  email: '',
  banco_1: '',
  agencia_1: '',
  conta_1: '',
  tipo_conta_1: 'Corrente Pessoa Jurídica',
  pix_1: '',
  banco_2: '',
  agencia_2: '',
  conta_2: '',
  tipo_conta_2: 'Corrente Pessoa Jurídica',
  pix_2: '',
  origem_cadastro: '',
  origem_outro: '',
  aceitou_termos: false,
};

export const Cadastro: React.FC = () => {
  const { config } = useConfig();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState<FormDataCadastro>(() => {
    // Restaurar rascunho anterior de textos se existir
    try {
      localStorage.removeItem('rascunho_cadastro');
      const saved = localStorage.getItem('rascunho_cadastro_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...INITIAL_FORM_DATA, ...parsed, foto_fachada: null, foto_interior: null };
      }
    } catch {
      // Ignorar dados corrompidos antigos para evitar bloqueio do formulário.
    }
    return INITIAL_FORM_DATA;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

  // Sempre rolar para o topo ao trocar de etapa
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [currentStep]);

  // Salvar rascunho no localStorage (exceto arquivos binários)
  useEffect(() => {
    const { foto_fachada: _foto_fachada, foto_interior: _foto_interior, ...draft } = formData;

    try {
      localStorage.setItem('rascunho_cadastro_v2', JSON.stringify(draft));
    } catch {
      // Ignorar falhas de armazenamento em navegadores restritivos.
    }
  }, [formData]);

  const updateFormData = (fields: Partial<FormDataCadastro>) => {
    setFormData((prev) => ({ ...prev, ...fields }));
  };

  const handleNext = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentStep((prev) => Math.min(prev + 1, 7));
  };

  const handlePrev = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleJumpToStep = (step: number) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentStep(step);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const response = await submitCadastro(formData);
      // Limpar rascunho após sucesso e evitar reenvio de formulário.
      localStorage.removeItem('rascunho_cadastro');
      localStorage.removeItem('rascunho_cadastro_v2');

      // Navegar para a página de conclusão com os dados da solicitação
      navigate('/cadastro/concluido', {
        state: {
          protocolo: response.protocolo,
          nome_fantasia: response.nome_fantasia,
          criado_em: response.criado_em,
        },
      });
    } catch (err: any) {
      console.error('Erro no envio:', err);
      setSubmitError(err.message || 'Erro ao submeter cadastro. Verifique os dados e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <StepIndicator
        currentStep={currentStep}
        totalSteps={7}
        stepTitles={STEP_TITLES}
        onSelectStep={handleJumpToStep}
      />

      <main className="grow max-w-4xl w-full mx-auto px-3 sm:px-6 py-5 sm:py-12 overflow-x-hidden">
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-soft p-4 sm:p-8 lg:p-10 transition-all max-w-full">
          {currentStep === 1 && (
            <Step1DadosLoja
              data={formData}
              updateData={updateFormData}
              onNext={handleNext}
              tiposComercio={config?.tipos_comercio || []}
            />
          )}

          {currentStep === 2 && (
            <Step2Imagens
              data={formData}
              updateData={updateFormData}
              onNext={handleNext}
              onPrev={handlePrev}
              maxMb={config?.limite_upload_mb || 15}
            />
          )}

          {currentStep === 3 && (
            <Step3Endereco
              data={formData}
              updateData={updateFormData}
              onNext={handleNext}
              onPrev={handlePrev}
            />
          )}

          {currentStep === 4 && (
            <Step5Horarios
              data={formData}
              updateData={updateFormData}
              onNext={handleNext}
              onPrev={handlePrev}
            />
          )}

          {currentStep === 5 && (
            <Step6InfoAdicional
              data={formData}
              updateData={updateFormData}
              onNext={handleNext}
              onPrev={handlePrev}
              servicosDisponiveis={config?.servicos_disponiveis}
            />
          )}

          {currentStep === 6 && (
            <Step7ContatoFinanceiro
              data={formData}
              updateData={updateFormData}
              onNext={handleNext}
              onPrev={handlePrev}
              coletaBancariaAtiva={config?.coleta_bancaria_ativa}
              coletaBancariaObrigatoria={config?.coleta_bancaria_obrigatoria}
            />
          )}

          {currentStep === 7 && (
            <Step8OrigemRevisao
              data={formData}
              updateData={updateFormData}
              onSubmit={handleSubmit}
              onPrev={handlePrev}
              onJumpToStep={handleJumpToStep}
              isSubmitting={isSubmitting}
              submitError={submitError}
            />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};
