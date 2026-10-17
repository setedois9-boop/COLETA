import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Store,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  CheckCircle2,
  DollarSign,
  Users,
  Box,
  Truck,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Sparkles,
  HelpCircle,
  FileText,
  AlertCircle,
  TrendingUp,
  Smartphone,
  Calculator,
  Coins,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { WhatsAppFloatingButton } from '../components/WhatsAppFloatingButton';
import { useConfig } from '../context/ConfigContext';

export const Home: React.FC = () => {
  const { config } = useConfig();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [pacotesPorDia, setPacotesPorDia] = useState<number>(50);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const heroTitle = config?.titulo_hero || 'Transforme seu estabelecimento em um Ponto de Coleta de Encomendas';
  const heroSubtitle =
    config?.subtitulo_hero ||
    'Gere renda extra de R$ 2,50 a R$ 5,00 por pacote entregue, atraia um fluxo diário de novos clientes para o seu comércio e aumente sua visibilidade sem necessidade de estoque.';

  const beneficios = config?.beneficios || [
    {
      id: '1',
      titulo: 'Aumento Real de Receita (R$ 2,50 a R$ 5,00/pacote)',
      descricao: 'Gere uma renda extra expressiva e recorrente. Cada pacote manipulado ou entregue no seu estabelecimento gera de R$ 2,50 a R$ 5,00 de remuneração direta para você.',
      icone: 'DollarSign',
      destaque: 'R$ 2,50 a R$ 5,00 / pacote'
    },
    {
      id: '2',
      titulo: 'Atração Contínua de Novos Clientes',
      descricao: 'Compradores e vendedores de e-commerce visitam sua loja diariamente para retirar ou postar mercadorias, aumentando o fluxo de pessoas e a visibilidade do seu negócio.',
      icone: 'Users',
      destaque: 'Mais visitantes todo dia'
    },
    {
      id: '3',
      titulo: 'Aumento no Giro de Vendas da Sua Loja',
      descricao: 'Ao entrar no seu estabelecimento para retirar uma encomenda, uma parcela significativa dos clientes aproveita para comprar produtos da sua própria loja, gerando vendas casadas.',
      icone: 'TrendingUp',
      destaque: 'Vendas cruzadas no balcão'
    },
    {
      id: '4',
      titulo: 'Monetização de Espaço Ocioso',
      descricao: 'Aproveite áreas livres no seu balcão, prateleiras ou depósito para armazenar pacotes com segurança, gerando receita sem gastar com compra de mercadorias.',
      icone: 'Box',
      destaque: 'Zero custo com estoque'
    },
    {
      id: '5',
      titulo: 'Operação Rápida pelo Aplicativo',
      descricao: 'Bipagem prática e ágil com o leitor de código de barras ou QR code do próprio smartphone. Processo que leva menos de 30 segundos por pacote.',
      icone: 'Smartphone',
      destaque: '100% digital e prático'
    },
    {
      id: '6',
      titulo: 'Reconhecimento e Credibilidade Local',
      descricao: 'Seu comércio passa a ser exibido como ponto de referência logístico no mapa do maior e-commerce da América Latina, atraindo a preferência dos moradores da sua região.',
      icone: 'ShieldCheck',
      destaque: 'Maior visibilidade no bairro'
    }
  ];

  const renderBeneficioIcon = (iconeName: string, idx: number) => {
    switch (iconeName) {
      case 'DollarSign':
      case 'Coins':
        return <DollarSign className="w-6 h-6 text-emerald-600" />;
      case 'Users':
        return <Users className="w-6 h-6 text-blue-600" />;
      case 'TrendingUp':
        return <TrendingUp className="w-6 h-6 text-orange-600" />;
      case 'Box':
        return <Box className="w-6 h-6 text-amber-600" />;
      case 'Smartphone':
        return <Smartphone className="w-6 h-6 text-purple-600" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-6 h-6 text-emerald-600" />;
      case 'Truck':
        return <Truck className="w-6 h-6 text-indigo-600" />;
      default:
        return idx % 2 === 0 ? <DollarSign className="w-6 h-6 text-orange-600" /> : <Users className="w-6 h-6 text-blue-600" />;
    }
  };

  const comoFunciona = config?.como_funciona || [
    {
      etapa: 1,
      titulo: 'Preencha os dados da loja',
      descricao: 'Informe CNPJ, dados cadastrais, endereço e os horários em que a loja está aberta.',
    },
    {
      etapa: 2,
      titulo: 'Envie as fotos e informações',
      descricao: 'Tire duas fotos horizontais simples: da fachada do comércio e do espaço interno disponível.',
    },
    {
      etapa: 3,
      titulo: 'Revise e envie a solicitação',
      descricao: 'Verifique o resumo de todas as informações preenchidas e confirme a submissão.',
    },
    {
      etapa: 4,
      titulo: 'Atendimento pelo WhatsApp',
      descricao: 'Entre em contato com nossa equipe para receber orientações e acompanhar as próximas etapas.',
    },
  ];

  const requisitos = config?.requisitos || [
    'CNPJ ativo e dados cadastrais da empresa regulares',
    'Nome fantasia condizente com a fachada comercial',
    'Fotos horizontais e nítidas da fachada e da área interna',
    'Endereço comercial completo com ponto fixo de atendimento',
    'Horários regulares de funcionamento ao público',
    'Informações sobre colaboradores e área para estacionamento',
    'Dados de contato atualizados do responsável pela loja',
  ];

  const faqs = config?.perguntas_frequentes || [
    {
      pergunta: 'Quem pode solicitar o cadastro?',
      resposta: 'Qualquer estabelecimento comercial com CNPJ ativo, ponto fixo de atendimento ao público e espaço físico disponível para armazenamento temporário e seguro de pacotes.',
    },
    {
      pergunta: 'Preciso ter CNPJ?',
      resposta: 'Sim. É necessário possuir CNPJ regular (pode ser MEI, ME, EPP ou demais modalidades) para emissão de notas ou contratos de prestação de serviços logísticos.',
    },
    {
      pergunta: 'Quais fotos devo enviar?',
      resposta: 'Você deve enviar duas imagens tiradas na horizontal: uma da fachada externa frontal completa da loja e uma da área interna onde os pacotes poderão ficar armazenados com segurança.',
    },
    {
      pergunta: 'Como funciona a análise?',
      resposta: 'Nossa equipe analisa a localização geográfica, demanda regional de encomendas, horários de funcionamento e a viabilidade do espaço para inclusão na rota logística.',
    },
    {
      pergunta: 'O cadastro garante aprovação?',
      resposta: 'Não. O envio do formulário representa uma manifestação formal de interesse. A aprovação final depende da demanda da região, capacidade operacional e conformidade com as diretrizes do programa.',
    },
    {
      pergunta: 'Como entro em contato com o atendimento?',
      resposta: 'Após submeter o formulário com sucesso, você terá acesso imediato ao botão oficial de atendimento via WhatsApp já preenchido com seu número de protocolo para obter informações.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] overflow-x-hidden">
      <Navbar />

      {/* SEÇÃO PRINCIPAL (HERO) */}
      <section className="relative overflow-hidden pt-8 pb-16 lg:pt-16 lg:pb-24 border-b border-slate-200/60 max-w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Badge Informativa de Independência */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200/80 text-orange-700 text-[11px] sm:text-xs font-bold mb-6 max-w-full">
            <Sparkles className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <span className="leading-tight">Cadastramento de Interesse para Rede Logística Parceira</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Texto Hero */}
            <div className="lg:col-span-7 space-y-6">
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                {heroTitle}
              </h1>

              <p className="text-sm sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                {heroSubtitle}
              </p>

              {/* Botão Principal CTA */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <Link
                  to="/cadastro"
                  className="inline-flex items-center justify-center gap-2.5 px-4 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-extrabold rounded-2xl shadow-xl shadow-orange-500/30 hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all text-xs sm:text-base uppercase tracking-wider cursor-pointer text-center"
                >
                  <span>QUERO CADASTRAR MINHA LOJA</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                </Link>

                <a
                  href="#como-funciona"
                  className="inline-flex items-center justify-center px-4 sm:px-6 py-3.5 sm:py-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded-2xl text-xs sm:text-sm transition-colors cursor-pointer text-center"
                >
                  Entenda como funciona
                </a>
              </div>

              {/* Micro-diferenciais rápidos */}
              <div className="pt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-slate-200/80 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Processo 100% Digital</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Sem Custos de Adesão</span>
                </div>
                <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Suporte via WhatsApp</span>
                </div>
              </div>
            </div>

            {/* Imagem Ilustrativa Profissional da Fachada da Loja */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200 bg-white group">
                <img
                  src="/fachada_loja.jpg"
                  alt="Fachada de estabelecimento comercial parceiro com ponto de coleta de encomendas"
                  className="w-full h-[360px] sm:h-[420px] object-cover group-hover:scale-102 transition-transform duration-500"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/25 to-transparent flex flex-col justify-end p-6 text-white">
                  <div className="flex items-center gap-2 bg-orange-600/90 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold w-fit mb-2">
                    <Store className="w-3.5 h-3.5" />
                    Fachada do Comércio Parceiro
                  </div>
                  <h3 className="font-bold text-base sm:text-lg">
                    Seu comércio como Ponto de Coleta
                  </h3>
                  <p className="text-xs text-slate-200 mt-1 max-w-sm">
                    Atraia dezenas de novos clientes todos os dias para a sua loja física e lucre por cada pacote.
                  </p>
                </div>
              </div>

              {/* Card flutuante de métrica visual 1: Ganhos */}
              <div className="absolute -bottom-6 -left-6 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-4 shadow-xl hidden sm:flex items-center gap-3 z-20">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-semibold block">Renda Extra por Pacote</span>
                  <span className="text-sm font-black text-emerald-700">R$ 2,50 a R$ 5,00 / entrega</span>
                </div>
              </div>

              {/* Card flutuante de métrica visual 2: Clientes */}
              <div className="absolute -top-4 -right-4 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-3.5 shadow-xl hidden sm:flex items-center gap-2.5 z-20">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <Users className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block">Novos Clientes</span>
                  <span className="text-xs font-black text-slate-900">+ Fluxo de Pessoas</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO "COMO FUNCIONA" */}
      <section id="como-funciona" className="py-16 sm:py-24 bg-white border-b border-slate-200/60 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider block mb-2">
              Passo a Passo
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Como funciona o processo de candidatura
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              Cadastrar sua loja é simples e leva menos de 5 minutos. Conheça as quatro fases:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {comoFunciona.map((item) => (
              <div
                key={item.etapa}
                className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-6 relative hover:border-orange-300 transition-colors shadow-hover group"
              >
                <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white font-extrabold text-lg flex items-center justify-center mb-5 shadow-md shadow-orange-600/20 group-hover:scale-105 transition-transform">
                  0{item.etapa}
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-2">{item.titulo}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{item.descricao}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/cadastro"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md shadow-orange-600/20 text-sm transition-all"
            >
              <span>Começar preenchimento agora</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* SEÇÃO DE BENEFÍCIOS - PONTO DE COLETA DE ENCOMENDAS */}
      <section id="beneficios" className="py-16 sm:py-24 bg-gradient-to-b from-slate-50 via-white to-slate-50 border-b border-slate-200/60 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          
          {/* Cabeçalho da Seção */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-black tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Vantagens Exclusivas para Lojistas e Comércios</span>
            </div>
            
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Benefícios de ser um <span className="text-orange-600">Ponto de Coleta de Encomendas</span>
            </h2>
            
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
              Transforme o espaço ocioso da sua loja em um polo de atração de novos clientes e gere uma nova fonte de faturamento mensal recorrente com a maior rede de e-commerce do Brasil.
            </p>
          </div>

          {/* OS DOIS GRANDES PILARES DE DESTAQUE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pilar 1: Aumento de Receita */}
            <div className="relative bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 text-white p-8 sm:p-10 rounded-3xl shadow-xl overflow-hidden border border-emerald-500/30 flex flex-col justify-between group">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/30 transition-all"></div>
              
              <div className="space-y-6 relative z-10">
                <div className="flex items-center justify-between gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
                    <DollarSign className="w-7 h-7" />
                  </div>
                  <span className="px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Renda Extra Direta
                  </span>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 block mb-1">
                    Ganhos por Pacote
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-baseline gap-2">
                    <span>R$ 2,50 a R$ 5,00</span>
                    <span className="text-xs sm:text-sm font-semibold text-emerald-300">/ por entrega</span>
                  </div>
                </div>

                <p className="text-slate-300 text-sm leading-relaxed">
                  Os pontos de coleta parceiros geram uma renda extra previsível e contínua. Cada pacote recebido, armazenado ou entregue para os compradores gera uma remuneração atrativa direta para a sua conta bancária.
                </p>

                <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-slate-200">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Lucro sem risco:</strong> Não precisa comprar produtos nem investir capital em mercadorias.</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Pagamentos regulares:</strong> Repasses pontuais calculados diretamente sobre o volume processado.</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Escala de faturamento:</strong> Quanto mais entregas na sua região, maior o seu lucro no fim do mês.</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8 border-t border-slate-700/60 mt-8 relative z-10 flex items-center justify-between">
                <span className="text-xs text-slate-400">Potencial Médio Mensal:</span>
                <span className="text-sm font-black text-emerald-300">R$ 1.500 a R$ 15.000 / mês</span>
              </div>
            </div>

            {/* Pilar 2: Atração de Novos Clientes */}
            <div className="relative bg-gradient-to-br from-blue-950 via-slate-900 to-slate-900 text-white p-8 sm:p-10 rounded-3xl shadow-xl overflow-hidden border border-blue-500/30 flex flex-col justify-between group">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/30 transition-all"></div>

              <div className="space-y-6 relative z-10">
                <div className="flex items-center justify-between gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
                    <Users className="w-7 h-7" />
                  </div>
                  <span className="px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    Tráfego & Visibilidade
                  </span>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-blue-400 block mb-1">
                    Fluxo de Pedestres
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-baseline gap-2">
                    <span>Centenas de Clientes</span>
                    <span className="text-xs sm:text-sm font-semibold text-blue-300">/ no seu balcão</span>
                  </div>
                </div>

                <p className="text-slate-300 text-sm leading-relaxed">
                  A presença de um ponto de coleta transforma seu estabelecimento em um ímã de compradores e vendedores da sua região. Moradores da sua própria vizinhança passam a entrar na sua loja com frequência semanal.
                </p>

                <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-slate-200">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span><strong>Efeito Venda Cruzada:</strong> Mais de 30% dos clientes compram produtos da loja ao retirar pacotes.</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span><strong>Visibilidade Gratuita:</strong> Seu comércio divulgado e recomendado como ponto de retirada para compradores da sua região.</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span><strong>Fidelização Bairro a Bairro:</strong> Pessoas que nunca entraram na sua loja viram clientes fiéis.</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8 border-t border-slate-700/60 mt-8 relative z-10 flex items-center justify-between">
                <span className="text-xs text-slate-400">Impacto Comercial:</span>
                <span className="text-sm font-black text-blue-300">+ Giro de Estoque & + Vendas no Caixa</span>
              </div>
            </div>
          </div>

          {/* SIMULADOR INTERATIVO DE RENDIMENTOS */}
          <div className="bg-white rounded-3xl border-2 border-orange-200/80 p-6 sm:p-10 shadow-soft space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-orange-600 font-extrabold text-xs uppercase tracking-wider">
                  <Calculator className="w-4 h-4" />
                  <span>Simulador Interativo de Ganhos</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  Quanto seu estabelecimento pode faturar por mês?
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  Selecione uma estimativa de pacotes movimentados diariamente para visualizar o potencial financeiro:
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {[20, 40, 60, 80, 100, 150].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setPacotesPorDia(v)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      pacotesPorDia === v
                        ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30 scale-105'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {v} pacotes/dia
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Slider de Volume */}
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                  <span>Volume diário de encomendas:</span>
                  <span className="text-orange-600 text-base font-black font-mono">{pacotesPorDia} pacotes</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={200}
                  step={5}
                  value={pacotesPorDia}
                  onChange={(e) => setPacotesPorDia(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
                  <span>10 pacotes/dia</span>
                  <span>100 pacotes/dia</span>
                  <span>200 pacotes/dia</span>
                </div>
              </div>

              {/* Resultado Renda Extra Estimada */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/60 border border-emerald-200 text-center space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 block">
                  Renda Extra Estimada (Mês)
                </span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono tracking-tight">
                  R$ {(pacotesPorDia * 2.5 * 26).toLocaleString('pt-BR')} a R$ {(pacotesPorDia * 5.0 * 26).toLocaleString('pt-BR')}
                </div>
                <span className="text-[11px] text-emerald-600 font-semibold block">
                  Baseado em R$ 2,50 a R$ 5,00 por pacote (26 dias operacionais)
                </span>
              </div>

              {/* Resultado Novos Clientes / Visitas */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/60 border border-blue-200 text-center space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-800 block">
                  Novos Visitantes na Loja (Mês)
                </span>
                <div className="text-2xl sm:text-3xl font-black text-blue-700 font-mono tracking-tight">
                  ~{(pacotesPorDia * 26).toLocaleString('pt-BR')} visitas
                </div>
                <span className="text-[11px] text-blue-600 font-semibold block">
                  Potenciais consumidores diretos do seu catálogo de produtos
                </span>
              </div>
            </div>
          </div>

          {/* GRID COM OS 6 BENEFÍCIOS ESTRATÉGICOS DETALHADOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {beneficios.map((b, idx) => (
              <div
                key={b.id || idx}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-soft hover:border-orange-300 hover:shadow-hover transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 group-hover:bg-orange-100 flex items-center justify-center transition-colors">
                      {renderBeneficioIcon(b.icone, idx)}
                    </div>
                    {b.destaque && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200/80">
                        {b.destaque}
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-base group-hover:text-orange-600 transition-colors">
                    {b.titulo}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {b.descricao}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Banner de Chamada para Ação (CTA) */}
          <div className="p-8 sm:p-10 rounded-3xl bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
            <div className="space-y-2 text-center md:text-left z-10">
              <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30 inline-block mb-1">
                Sem custos de ativação
              </span>
              <h3 className="text-xl sm:text-2xl font-black">
                Pronto para transformar sua loja em um Ponto Parceiro?
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
                O cadastro leva menos de 5 minutos. Preencha os dados do seu comércio e manifeste interesse para nossa equipe analisar a viabilidade na sua região.
              </p>
            </div>

            <Link
              to="/cadastro"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-2xl shadow-lg shadow-orange-600/30 transition-all text-xs sm:text-sm uppercase tracking-wider cursor-pointer shrink-0 z-10"
            >
              <span>Cadastrar Minha Loja Agora</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Nota de transparência informativa */}
          <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-500 text-center max-w-3xl mx-auto leading-relaxed">
            * Informação sobre remuneração: Os valores de R$ 2,50 a R$ 5,00 por encomenda correspondem às faixas operacionais praticadas na rede logística parceira, podendo variar conforme dimensões, modalidade (retirada, postagem ou devolução) e acordos contratuais. O envio do formulário representa manifestação de interesse e análise cadastral.
          </div>
        </div>
      </section>

      {/* SEÇÃO "REQUISITOS PARA CADASTRO" */}
      <section id="requisitos" className="py-16 sm:py-24 bg-white border-b border-slate-200/60 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-5">
              <span className="text-xs font-bold text-orange-600 uppercase tracking-wider block">
                Critérios Gerais
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                O que você precisa para se candidatar
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                Para garantir a segurança das encomendas e a facilidade de acesso aos clientes e entregadores, solicitamos informações essenciais do seu comércio.
              </p>
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Os requisitos definitivos dependem das condições operacionais e da malha logística do programa para a sua região.
                </span>
              </div>
            </div>

            <div className="lg:col-span-7 bg-slate-50/80 border border-slate-200/90 rounded-3xl p-6 sm:p-8">
              <h3 className="font-extrabold text-slate-900 text-base mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-600" />
                Itens informados no formulário:
              </h3>
              <ul className="space-y-3.5">
                {requisitos.map((req, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs sm:text-sm text-slate-700">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="font-medium">{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO DE PERGUNTAS FREQUENTES (FAQ) */}
      <section id="faq" className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200/60 scroll-mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider block mb-2">
              Dúvidas Frequentes
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Perguntas e Respostas
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              Tudo o que você precisa saber antes de preencher o formulário de interesse.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden transition-all shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full px-6 py-4.5 text-left flex items-center justify-between gap-4 font-bold text-slate-900 text-sm sm:text-base hover:text-orange-600 transition-colors cursor-pointer"
                  >
                    <span>{faq.pergunta}</span>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-orange-600 shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 animate-fadeIn">
                      {faq.resposta}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* BANNER CTA INFERIOR */}
      <section className="py-12 sm:py-16 bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-5 sm:space-y-6">
          <h2 className="text-xl sm:text-4xl font-extrabold tracking-tight">
            Pronto para transformar sua loja em um ponto de coleta?
          </h2>
          <p className="text-slate-300 text-xs sm:text-base max-w-2xl mx-auto leading-relaxed">
            Inicie agora sua candidatura 100% digital e dê o primeiro passo para fazer parte de operações logísticas parceiras.
          </p>
          <div className="pt-2 flex justify-center">
            <Link
              to="/cadastro"
              className="inline-flex items-center justify-center gap-2.5 px-5 sm:px-9 py-3.5 sm:py-4 bg-orange-600 hover:bg-orange-500 text-white font-extrabold rounded-2xl shadow-xl shadow-orange-600/30 hover:scale-105 active:scale-95 transition-all text-xs sm:text-base uppercase tracking-wider cursor-pointer text-center max-w-full"
            >
              <span>QUERO CADASTRAR MINHA LOJA</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppFloatingButton />
    </div>
  );
};
