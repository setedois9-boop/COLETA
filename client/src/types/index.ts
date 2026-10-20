export interface HorarioDia {
  aberto: boolean;
  abertura: string;
  fechamento: string;
}

export interface HorariosFuncionamento {
  [dia: string]: HorarioDia;
}

export interface FormDataCadastro {
  // Etapa 1: Dados do estabelecimento
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  tipo_comercio: string;
  tipo_comercio_outro: string;

  // Etapa 2: Fotos
  foto_fachada: File | null;
  foto_fachada_url?: string;
  foto_interior: File | null;
  foto_interior_url?: string;

  // Etapa 3: Endereço
  cep: string;
  estado: string;
  cidade: string;
  bairro: string;
  rua: string;
  numero: string;
  complemento: string;

  // Etapa 4: Localização
  latitude: number;
  longitude: number;
  localizacao_confirmada: boolean;

  // Etapa 5: Horários
  dias_funcionamento: string[];
  horarios_funcionamento: HorariosFuncionamento;
  fecha_almoco: boolean;
  horario_almoco_inicio: string;
  horario_almoco_fim: string;

  // Etapa 6: Informações adicionais
  estacionamento: string;
  quantidade_colaboradores: string;
  experiencia_logistica: string;
  servicos_desejados: string[];

  // Etapa 7: Contato e Financeiro
  nome_responsavel: string;
  telefone: string;
  email: string;

  banco_1: string;
  agencia_1: string;
  conta_1: string;
  tipo_conta_1: string;
  pix_1: string;

  banco_2: string;
  agencia_2: string;
  conta_2: string;
  tipo_conta_2: string;
  pix_2: string;

  // Etapa 8: Origem e Termos
  origem_cadastro: string;
  origem_outro: string;
  aceitou_termos: boolean;
}

export interface Solicitacao {
  id: number;
  protocolo: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  tipo_comercio: string;
  tipo_comercio_outro?: string;
  cep: string;
  estado: string;
  cidade: string;
  bairro: string;
  rua: string;
  numero: string;
  complemento?: string;
  latitude: number;
  longitude: number;
  dias_funcionamento: string[] | string;
  horarios_funcionamento: HorariosFuncionamento | string;
  fecha_almoco: boolean | number;
  horario_almoco_inicio?: string;
  horario_almoco_fim?: string;
  estacionamento: string;
  quantidade_colaboradores: string;
  experiencia_logistica: string;
  servicos_desejados: string[] | string;
  nome_responsavel: string;
  telefone: string;
  email: string;
  banco_1?: string;
  agencia_1?: string;
  conta_1?: string;
  tipo_conta_1?: string;
  pix_1?: string;
  banco_2?: string;
  agencia_2?: string;
  conta_2?: string;
  tipo_conta_2?: string;
  pix_2?: string;
  origem_cadastro: string;
  origem_outro?: string;
  status: 'Recebido' | 'Em análise' | 'Aguardando contato' | 'Documentação pendente' | 'Aprovado' | 'Rejeitado';
  observacoes_internas?: string;
  criado_em: string;
  atualizado_em: string;
  arquivos?: ArquivoSolicitacao[];
  historico?: HistoricoStatus[];
}

export interface ArquivoSolicitacao {
  id: number;
  solicitacao_id: number;
  tipo_imagem: 'fachada' | 'interior';
  caminho_arquivo: string;
  nome_original: string;
  tamanho_bytes?: number;
  mime_type?: string;
  criado_em: string;
}

export interface HistoricoStatus {
  id: number;
  solicitacao_id: number;
  status_anterior?: string;
  status_novo: string;
  administrador_id?: string;
  observacao?: string;
  criado_em: string;
}

export interface FAQItem {
  pergunta: string;
  resposta: string;
}

export interface BeneficioItem {
  id: string;
  titulo: string;
  descricao: string;
  icone: string;
  destaque?: string;
}

export interface EtapaComoFunciona {
  etapa: number;
  titulo: string;
  descricao: string;
}

export interface SiteConfig {
  nome_site: string;
  titulo_hero: string;
  subtitulo_hero: string;
  cor_primaria: string;
  cor_secundaria: string;
  whatsapp_numero: string;
  whatsapp_mensagem: string;
  coleta_bancaria_obrigatoria: boolean;
  coleta_bancaria_ativa: boolean;
  limite_upload_mb: number;
  retencao_dias: number;
  aviso_independencia: string;
  beneficios: BeneficioItem[];
  como_funciona: EtapaComoFunciona[];
  requisitos: string[];
  perguntas_frequentes: FAQItem[];
  tipos_comercio: string[];
  servicos_disponiveis: string[];
}

export interface AdminUser {
  id: number;
  nome: string;
  email: string;
  permissao: string;
  two_factor_enabled?: boolean;
}

export interface LoginResponse {
  success?: boolean;
  token?: string;
  admin?: AdminUser;
  require_2fa?: boolean;
  pre_auth_token?: string;
  email?: string;
  message?: string;
}
