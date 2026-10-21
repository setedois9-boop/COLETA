import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Busboy from 'busboy';
import { createClient } from '@supabase/supabase-js';
import { generateSecret, generateURI } from 'otplib';
import QRCode from 'qrcode';
import { getTotpStep } from '../server/src/utils/totp.js';

const JWT_SECRET = process.env.JWT_SECRET?.trim() ||
  (process.env.NODE_ENV === 'production' ? null : '6c48d88a3273c0ea10957e9dbd2c789784f8541dbf2391bed73c8f54760116bf');

function getTotpEncryptionKey() {
  if (process.env.TOTP_ENCRYPTION_KEY && process.env.TOTP_ENCRYPTION_KEY.trim() !== '') {
    const rawKey = process.env.TOTP_ENCRYPTION_KEY.trim();
    if (rawKey.length === 64) {
      return Buffer.from(rawKey, 'hex');
    }
    return crypto.createHash('sha256').update(rawKey).digest();
  }
  return crypto.createHash('sha256').update(`totp-encryption-key-aes-256-gcm-v1:${JWT_SECRET}`).digest();
}

function encryptSecret(plainText) {
  if (!plainText || typeof plainText !== 'string' || plainText.startsWith('enc:gcm:')) return plainText;
  const key = getTotpEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let ciphertext = cipher.update(plainText, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `enc:gcm:${iv.toString('hex')}:${authTag}:${ciphertext}`;
}

function decryptSecret(storedValue) {
  if (!storedValue || typeof storedValue !== 'string' || !storedValue.startsWith('enc:gcm:')) {
    return storedValue;
  }
  const parts = storedValue.split(':');
  if (parts.length !== 5) return storedValue;
  const [, , ivHex, tagHex, cipherHex] = parts;
  try {
    const key = getTotpEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}
const TMP_DATA_FILE = process.platform === 'win32'
  ? path.join(process.env.TEMP || os.tmpdir(), 'coleta_data.json')
  : path.join('/tmp', 'coleta_data.json');

// Supabase helper
function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (url && key && url.trim() !== '' && key.trim() !== '') {
    return createClient(url.trim(), key.trim(), { auth: { persistSession: false } });
  }
  return null;
}

function getAdminStateSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !url.trim() || !key.trim()) return null;
  return createClient(url.trim(), key.trim(), { auth: { persistSession: false } });
}

function hasDurableAdminStateStore() {
  return Boolean(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_URL.trim() &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY.trim()
  );
}

// Configuração padrão do site
const DEFAULT_CONFIG = {
  nome_site: 'Rede Logística Parceira',
  titulo_hero: 'Transforme seu estabelecimento em um Ponto de Coleta de Encomendas',
  subtitulo_hero: 'Gere renda extra de R$ 2,50 a R$ 5,00 por pacote entregue, atraia um fluxo diário de novos clientes para o seu comércio e aumente sua visibilidade sem necessidade de estoque.',
  cor_primaria: '#EE4D2D',
  cor_secundaria: '#0F172A',
  whatsapp_numero: '5511999998888',
  whatsapp_mensagem: 'Olá! Acabei de enviar uma solicitação para cadastrar meu estabelecimento como ponto de coleta.\n\nProtocolo: [PROTOCOLO]\nEstabelecimento: [NOME FANTASIA]\n\nGostaria de receber orientações sobre as próximas etapas.',
  coleta_bancaria_obrigatoria: true,
  coleta_bancaria_ativa: true,
  limite_upload_mb: 15,
  retencao_dias: 365,
  aviso_independencia: 'Aviso importante: Este portal é uma plataforma independente de captação e análise de interesse de estabelecimentos comerciais para potenciais pontos de coleta e logística parceira de e-commerce.',
  beneficios: [
    {
      id: '1',
      titulo: 'Aumento Real de Receita (R$ 2,50 a R$ 5,00/pacote)',
      descricao: 'Gere uma renda extra expressiva e recorrente. Cada pacote manipulado ou entregue no seu estabelecimento gera remuneração direta para você.',
      icone: 'DollarSign',
      destaque: 'R$ 2,50 a R$ 5,00 / pacote'
    },
    {
      id: '2',
      titulo: 'Atração Contínua de Novos Clientes',
      descricao: 'Compradores e vendedores de e-commerce visitam sua loja diariamente para retirar ou postar mercadorias.',
      icone: 'Users',
      destaque: 'Mais visitantes todo dia'
    },
    {
      id: '3',
      titulo: 'Aumento no Giro de Vendas da Sua Loja',
      descricao: 'Ao entrar no seu estabelecimento para retirar uma encomenda, clientes aproveitam para comprar produtos da sua própria loja.',
      icone: 'TrendingUp',
      destaque: 'Vendas cruzadas no balcão'
    },
    {
      id: '4',
      titulo: 'Monetização de Espaço Ocioso',
      descricao: 'Aproveite áreas livres no seu balcão ou prateleiras para armazenar pacotes com segurança.',
      icone: 'Box',
      destaque: 'Zero custo com estoque'
    },
    {
      id: '5',
      titulo: 'Operação Rápida pelo Aplicativo',
      descricao: 'Bipagem prática e ágil com o leitor de código de barras ou QR code do próprio smartphone.',
      icone: 'Smartphone',
      destaque: '100% digital e prático'
    },
    {
      id: '6',
      titulo: 'Reconhecimento e Credibilidade Local',
      descricao: 'Seu comércio passa a ser exibido como ponto de referência logístico no mapa do maior e-commerce da América Latina.',
      icone: 'ShieldCheck',
      destaque: 'Maior visibilidade no bairro'
    }
  ],
  como_funciona: [
    { etapa: 1, titulo: 'Preencha os dados da loja', descricao: 'Informe CNPJ, dados cadastrais, endereço e os horários de atendimento.' },
    { etapa: 2, titulo: 'Envie as fotos da loja', descricao: 'Envie fotos nítidas da fachada externa e do espaço interno disponível para pacotes.' },
    { etapa: 3, titulo: 'Revise e envie a solicitação', descricao: 'Confira os dados preenchidos, concorde com os termos e envie para gerar seu protocolo.' },
    { etapa: 4, titulo: 'Atendimento pelo WhatsApp', descricao: 'Entre em contato com nossa equipe com seu protocolo para acompanhar a avaliação.' }
  ],
  requisitos: [
    'CNPJ ativo e dados cadastrais da empresa regulares',
    'Nome fantasia condizente com a fachada comercial',
    'Fotos nítidas da fachada e da área interna de armazenamento',
    'Endereço comercial fixo com atendimento ao público',
    'Horários regulares de funcionamento comercial'
  ],
  perguntas_frequentes: [
    { pergunta: 'Quem pode solicitar o cadastro?', resposta: 'Qualquer comércio com CNPJ ativo, ponto fixo e espaço seguro para guardar encomendas.' },
    { pergunta: 'Preciso pagar alguma taxa para me credenciar?', resposta: 'Não! O cadastro é 100% gratuito e você é remunerado por pacote manipulado.' },
    { pergunta: 'Preciso ter CNPJ?', resposta: 'Sim, é necessário possuir CNPJ ativo (MEI, ME ou demais modalidades).' },
    { pergunta: 'O cadastro garante aprovação?', resposta: 'Não. O envio do formulário representa uma candidatura submetida à análise de viabilidade logística regional.' }
  ],
  tipos_comercio: [
    'Mercearia ou minimercado',
    'Loja de conveniência',
    'Papelaria / Bazar',
    'Loja de roupas / calçados',
    'Loja de eletrônicos / celulares',
    'Assistência técnica',
    'Farmácia / Drogaria',
    'Outros'
  ],
  servicos_disponiveis: [
    'Receber pacotes de vendedores parceiros',
    'Entregar pacotes a compradores',
    'Ponto de devolução e logística reversa'
  ]
};

const SUPABASE_CONFIG_KEY_MAP = {
  site_name: 'nome_site',
  whatsapp_number: 'whatsapp_numero',
  whatsapp_message: 'whatsapp_mensagem',
  collect_financial_data: 'coleta_bancaria_ativa'
};

function getSiteConfigFromSupabase(configuracion) {
  if (!configuracion || typeof configuracion !== 'object' || Array.isArray(configuracion)) {
    throw new Error('As configurações do site no Supabase possuem um formato inválido.');
  }

  const config = {};
  // Nomes legados primeiro; os nomes atuais do painel prevalecem independentemente da ordem do JSONB.
  for (const [legacyKey, appKey] of Object.entries(SUPABASE_CONFIG_KEY_MAP)) {
    if (Object.prototype.hasOwnProperty.call(configuracion, legacyKey)) {
      config[appKey] = configuracion[legacyKey];
    }
  }
  for (const [key, value] of Object.entries(configuracion)) {
    if (key === 'admin_security_state' || SUPABASE_CONFIG_KEY_MAP[key]) continue;
    if (Object.prototype.hasOwnProperty.call(DEFAULT_CONFIG, key)) {
      config[key] = value;
    }
  }
  return config;
}

function getSupabaseSiteConfig(config) {
  const persisted = Object.fromEntries(
    Object.entries(config).filter(([key]) => Object.prototype.hasOwnProperty.call(DEFAULT_CONFIG, key))
  );
  for (const [supabaseKey, appKey] of Object.entries(SUPABASE_CONFIG_KEY_MAP)) {
    if (Object.prototype.hasOwnProperty.call(config, appKey)) {
      persisted[supabaseKey] = config[appKey];
    }
  }
  return persisted;
}

// Seed inicial de solicitações
const INITIAL_SOLICITACOES = [
  {
    id: 1,
    protocolo: 'PDC-2026-A1B2C3',
    cnpj: '12.345.678/0001-90',
    razao_social: 'Silva & Oliveira Papelaria LTDA',
    nome_fantasia: 'Papelaria Central',
    tipo_comercio: 'Papelaria / Bazar',
    tipo_comercio_outro: null,
    cep: '01310-100',
    estado: 'SP',
    cidade: 'São Paulo',
    bairro: 'Bela Vista',
    rua: 'Avenida Paulista',
    numero: '1000',
    complemento: 'Loja 12',
    latitude: -23.56168,
    longitude: -46.65598,
    dias_funcionamento: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'],
    horarios_funcionamento: {
      SEG: { aberto: true, abertura: '08:00', fechamento: '19:00' },
      TER: { aberto: true, abertura: '08:00', fechamento: '19:00' },
      QUA: { aberto: true, abertura: '08:00', fechamento: '19:00' },
      QUI: { aberto: true, abertura: '08:00', fechamento: '19:00' },
      SEX: { aberto: true, abertura: '08:00', fechamento: '19:00' },
      SAB: { aberto: true, abertura: '09:00', fechamento: '15:00' },
      DOM: { aberto: false, abertura: '08:00', fechamento: '12:00' }
    },
    fecha_almoco: false,
    horario_almoco_inicio: null,
    horario_almoco_fim: null,
    estacionamento: 'Possui vagas na frente',
    quantidade_colaboradores: '3 a 5 colaboradores',
    experiencia_logistica: 'Já é ponto de coleta de outro parceiro',
    servicos_desejados: ['Receber pacotes de vendedores parceiros', 'Entregar pacotes a compradores'],
    nome_responsavel: 'Carlos Alberto Silva',
    telefone: '(11) 98765-4321',
    email: 'contato@papelariacentral.com.br',
    banco_1: 'Banco do Brasil',
    agencia_1: '1234',
    conta_1: '56789-0',
    tipo_conta_1: 'Corrente Pessoa Jurídica',
    pix_1: '12.345.678/0001-90',
    banco_2: 'Itaú Unibanco',
    agencia_2: '4321',
    conta_2: '98765-4',
    tipo_conta_2: 'Corrente Pessoa Jurídica',
    pix_2: 'contato@papelariacentral.com.br',
    origem_cadastro: 'Anúncio em redes sociais.',
    origem_outro: null,
    status: 'Em análise',
    observacoes_internas: 'Ótima localização na Avenida Paulista, fluxo constante de pedestres.',
    criado_em: new Date(Date.now() - 86400000 * 2).toISOString(),
    atualizado_em: new Date(Date.now() - 86400000).toISOString(),
    arquivos: [
      { id: 101, solicitacao_id: 1, tipo_imagem: 'fachada', caminho_arquivo: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800', nome_original: 'fachada.jpg' },
      { id: 102, solicitacao_id: 1, tipo_imagem: 'interior', caminho_arquivo: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800', nome_original: 'interior.jpg' }
    ],
    historico: [
      { id: 1, solicitacao_id: 1, status_anterior: null, status_novo: 'Recebido', administrador_id: 'Sistema', observacao: 'Candidatura submetida', criado_em: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: 2, solicitacao_id: 1, status_anterior: 'Recebido', status_novo: 'Em análise', administrador_id: 'Administrador Geral', observacao: 'Triagem técnica inicial aprovada', criado_em: new Date(Date.now() - 86400000).toISOString() }
    ]
  },
  {
    id: 2,
    protocolo: 'PDC-2026-F4D5E6',
    cnpj: '98.765.432/0001-10',
    razao_social: 'Mercado Bom Preço de Santana ME',
    nome_fantasia: 'Minimercado Santana',
    tipo_comercio: 'Mercearia ou minimercado',
    tipo_comercio_outro: null,
    cep: '02012-000',
    estado: 'SP',
    cidade: 'São Paulo',
    bairro: 'Santana',
    rua: 'Rua Voluntários da Pátria',
    numero: '2100',
    complemento: null,
    latitude: -23.50125,
    longitude: -46.62651,
    dias_funcionamento: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'],
    horarios_funcionamento: {
      SEG: { aberto: true, abertura: '07:30', fechamento: '21:00' },
      TER: { aberto: true, abertura: '07:30', fechamento: '21:00' },
      QUA: { aberto: true, abertura: '07:30', fechamento: '21:00' },
      QUI: { aberto: true, abertura: '07:30', fechamento: '21:00' },
      SEX: { aberto: true, abertura: '07:30', fechamento: '21:00' },
      SAB: { aberto: true, abertura: '08:00', fechamento: '20:00' },
      DOM: { aberto: true, abertura: '08:00', fechamento: '14:00' }
    },
    fecha_almoco: false,
    horario_almoco_inicio: null,
    horario_almoco_fim: null,
    estacionamento: 'Não tem estacionamento',
    quantidade_colaboradores: '6 a 10 colaboradores',
    experiencia_logistica: 'Já trabalhou com entregas',
    servicos_desejados: ['Receber pacotes de vendedores parceiros', 'Entregar pacotes a compradores'],
    nome_responsavel: 'Mariana Souza dos Santos',
    telefone: '(11) 97654-3210',
    email: 'mariana@mercadobompreco.com.br',
    banco_1: 'Bradesco',
    agencia_1: '0543',
    conta_1: '12345-6',
    tipo_conta_1: 'Corrente Pessoa Jurídica',
    pix_1: '98.765.432/0001-10',
    banco_2: 'Caixa Econômica',
    agencia_2: '1100',
    conta_2: '33445-5',
    tipo_conta_2: 'Corrente Pessoa Jurídica',
    pix_2: 'mariana@mercadobompreco.com.br',
    origem_cadastro: 'Recebi uma ligação e me orientaram a preencher o formulário.',
    origem_outro: null,
    status: 'Recebido',
    observacoes_internas: null,
    criado_em: new Date(Date.now() - 3600000 * 6).toISOString(),
    atualizado_em: new Date(Date.now() - 3600000 * 6).toISOString(),
    arquivos: [
      { id: 201, solicitacao_id: 2, tipo_imagem: 'fachada', caminho_arquivo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800', nome_original: 'fachada.jpg' },
      { id: 202, solicitacao_id: 2, tipo_imagem: 'interior', caminho_arquivo: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800', nome_original: 'interior.jpg' }
    ],
    historico: [
      { id: 3, solicitacao_id: 2, status_anterior: null, status_novo: 'Recebido', administrador_id: 'Sistema', observacao: 'Candidatura submetida', criado_em: new Date(Date.now() - 3600000 * 6).toISOString() }
    ]
  }
];

// Carregar ou salvar dados em cache de memória e /tmp com suporte a persistent_state.json
let inMemoryStore = null;

function loadStore() {
  if (inMemoryStore) return inMemoryStore;

  // 1. Tentar ler do arquivo temporário (/tmp ou TEMP)
  try {
    if (fs.existsSync(TMP_DATA_FILE)) {
      const content = fs.readFileSync(TMP_DATA_FILE, 'utf-8');
      inMemoryStore = JSON.parse(content);
      return inMemoryStore;
    }
  } catch (err) {
    console.warn('Erro ao ler TMP_DATA_FILE store:', err.message);
  }

  // 2. Se /tmp estiver vazio (novo container/cold start), ler o estado persistente empacotado
  const possiblePaths = [
    path.join(process.cwd(), 'api', 'persistent_state.json'),
    path.join(process.cwd(), 'persistent_state.json'),
    path.resolve('api/persistent_state.json'),
  ];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf-8');
        inMemoryStore = JSON.parse(content);
        saveStore(inMemoryStore);
        return inMemoryStore;
      }
    } catch (err) {
      console.warn('Erro ao ler persistent_state.json em', p, err.message);
    }
  }

  // 3. Fallback seguro garantindo 2FA ativo
  inMemoryStore = {
    admin: {
      id: 1,
      nome: 'Administrador Geral',
      email: (process.env.ADMIN_EMAIL || 'admin@pontodecoleta.com.br').trim().toLowerCase(),
      senha_hash: bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin@2026', 10),
      permissao: 'superadmin',
      two_factor_enabled: 0,
      two_factor_secret: null,
      two_factor_temp_secret: null
    },
    config: { ...DEFAULT_CONFIG },
    solicitacoes: [...INITIAL_SOLICITACOES],
    nextId: 10
  };

  saveStore(inMemoryStore);
  return inMemoryStore;
}

function saveStore(store) {
  inMemoryStore = store;
  try {
    const dir = path.dirname(TMP_DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TMP_DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    // ignorar falhas de escrita em read-only estrito
  }

  // Tentar sincronizar persistent_state.json se acessível e gravável
  try {
    const persistentFile = path.join(process.cwd(), 'api', 'persistent_state.json');
    if (fs.existsSync(persistentFile)) {
      fs.writeFileSync(persistentFile, JSON.stringify(store, null, 2), 'utf-8');
    }
  } catch {
    // read-only no runtime Vercel é esperado
  }
}

// O filesystem do runtime serverless não é durável; o estado de autenticação usa Supabase.
async function syncWithSupabase(store) {
  const supabase = getAdminStateSupabase();
  if (!supabase) return store;
  const { data, error } = await supabase
    .from('configuracoes_site')
    .select('configuracao')
    .eq('id', true)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao ler o estado de segurança do administrador: ${error.message}`);
  }

  const persistedState = data?.configuracao?.admin_security_state;
  if (persistedState) {
    const state = persistedState;
    if (state.admin_id !== undefined && Number(state.admin_id) !== Number(store.admin.id)) {
      throw new Error('O estado de segurança persistido pertence a outro administrador.');
    }
    if (state.email && String(state.email).toLowerCase() !== String(store.admin.email).toLowerCase()) {
      throw new Error('O estado de segurança persistido não corresponde ao e-mail administrativo configurado.');
    }
    for (const key of [
      'two_factor_enabled',
      'two_factor_secret',
      'two_factor_temp_secret',
      'senha_hash',
      'token_version',
      'last_totp_step',
      'last_totp_code',
      'last_totp_time',
      'failed_login_attempts'
    ]) {
      if (Object.prototype.hasOwnProperty.call(state, key)) {
        store.admin[key] = state[key];
      }
    }
  }

  if (data?.configuracao) {
    store.config = {
      ...store.config,
      ...getSiteConfigFromSupabase(data.configuracao)
    };
  }
  return store;
}

// Solicitações (cadastros de clientes): tabelas `solicitacoes` e `arquivos_solicitacao` do Supabase.
// O registro completo fica em `solicitacoes.dados`; campos bancários são cifrados (AES-256-GCM).
const SOLICITACAO_SENSITIVE_FIELDS = [
  'banco_1', 'agencia_1', 'conta_1', 'tipo_conta_1', 'pix_1',
  'banco_2', 'agencia_2', 'conta_2', 'tipo_conta_2', 'pix_2'
];

function setSolicitacaoUuid(sol, uuid) {
  Object.defineProperty(sol, '__uuid', { value: uuid, enumerable: false, writable: true, configurable: true });
  return sol;
}

function rowToSolicitacao(row) {
  const dados = { ...(row.dados || {}) };
  for (const field of SOLICITACAO_SENSITIVE_FIELDS) {
    if (typeof dados[field] === 'string') dados[field] = decryptSecret(dados[field]);
  }
  const sol = {
    ...dados,
    id: Number(dados.legacy_id),
    protocolo: row.protocolo,
    cnpj: dados.cnpj || row.cnpj,
    razao_social: row.razao_social,
    nome_fantasia: row.nome_fantasia,
    tipo_comercio: row.tipo_comercio,
    cidade: row.cidade,
    estado: row.estado,
    telefone: dados.telefone ?? row.telefone,
    email: row.email,
    status: row.status,
    observacoes_internas: row.observacoes_internas,
    criado_em: row.criado_em,
    atualizado_em: row.atualizado_em,
    arquivos: []
  };
  delete sol.legacy_id;
  return setSolicitacaoUuid(sol, row.id);
}

function solicitacaoToRow(sol) {
  const dados = { ...sol, legacy_id: sol.id };
  delete dados.arquivos;
  for (const field of SOLICITACAO_SENSITIVE_FIELDS) {
    if (typeof dados[field] === 'string' && dados[field]) dados[field] = encryptSecret(dados[field]);
  }
  return {
    protocolo: sol.protocolo,
    cnpj: String(sol.cnpj || '').replace(/\D/g, ''),
    razao_social: sol.razao_social,
    nome_fantasia: sol.nome_fantasia,
    tipo_comercio: sol.tipo_comercio || 'Outros',
    cidade: sol.cidade || '',
    estado: sol.estado || '',
    telefone: String(sol.telefone || '').replace(/\D/g, ''),
    email: sol.email || '',
    status: sol.status,
    observacoes_internas: sol.observacoes_internas || '',
    dados,
    atualizado_em: sol.atualizado_em || new Date().toISOString()
  };
}

async function loadSolicitacoesFromSupabase(store) {
  const supabase = getAdminStateSupabase();
  if (!supabase) return store;
  const { data, error } = await supabase
    .from('solicitacoes')
    .select('id,protocolo,cnpj,razao_social,nome_fantasia,tipo_comercio,cidade,estado,telefone,email,status,observacoes_internas,criado_em,atualizado_em,dados')
    .order('criado_em', { ascending: false });
  if (error) throw new Error(`Falha ao ler as solicitações: ${error.message}`);
  const list = (data || []).map(rowToSolicitacao).filter((s) => Number.isFinite(s.id));
  store.solicitacoes = list;
  store.nextId = list.reduce((max, s) => Math.max(max, s.id), 0) + 1;
  return store;
}

async function loadSolicitacaoArquivos(sol) {
  const supabase = getAdminStateSupabase();
  if (!supabase || !sol.__uuid) return sol.arquivos || [];
  const { data, error } = await supabase
    .from('arquivos_solicitacao')
    .select('id,tipo_imagem,caminho_arquivo,criado_em')
    .eq('solicitacao_id', sol.__uuid)
    .order('criado_em', { ascending: true });
  if (error) throw new Error(`Falha ao ler os arquivos da solicitação: ${error.message}`);
  return (data || []).map((a) => ({ id: a.id, tipo_imagem: a.tipo_imagem, caminho_arquivo: a.caminho_arquivo }));
}

// Persiste e confirma a gravação; sem Supabase configurado mantém apenas o armazenamento local.
async function persistSolicitacao(sol, { isNew = false, arquivos = [] } = {}) {
  const supabase = getAdminStateSupabase();
  if (!supabase) return;
  const row = solicitacaoToRow(sol);
  if (isNew) {
    const uuid = crypto.randomUUID();
    const { data, error } = await supabase
      .from('solicitacoes')
      .insert({ ...row, id: uuid, idempotency_key: crypto.randomUUID(), criado_em: sol.criado_em })
      .select('id')
      .single();
    if (error || !data) throw new Error(`Falha ao gravar a solicitação: ${error?.message || 'sem confirmação'}`);
    setSolicitacaoUuid(sol, uuid);
    if (arquivos.length) {
      const { error: fileError } = await supabase.from('arquivos_solicitacao').insert(
        arquivos.map((a) => ({ solicitacao_id: uuid, tipo_imagem: a.tipo_imagem, caminho_arquivo: a.caminho_arquivo }))
      );
      if (fileError) {
        await supabase.from('solicitacoes').delete().eq('id', uuid);
        throw new Error(`Falha ao gravar os arquivos da solicitação: ${fileError.message}`);
      }
    }
    return;
  }
  if (!sol.__uuid) throw new Error('Solicitação sem identificador persistente.');
  const { data, error } = await supabase
    .from('solicitacoes')
    .update(row)
    .eq('id', sol.__uuid)
    .select('id')
    .maybeSingle();
  if (error || !data) throw new Error(`Falha ao atualizar a solicitação: ${error?.message || 'registro não encontrado'}`);
}

async function deleteSolicitacaoPersisted(sol) {
  const supabase = getAdminStateSupabase();
  if (!supabase) return;
  if (!sol.__uuid) throw new Error('Solicitação sem identificador persistente.');
  for (const table of ['arquivos_solicitacao', 'historico_status', 'dados_financeiros']) {
    const { error } = await supabase.from(table).delete().eq('solicitacao_id', sol.__uuid);
    if (error) throw new Error(`Falha ao excluir dados relacionados (${table}): ${error.message}`);
  }
  const { error } = await supabase.from('solicitacoes').delete().eq('id', sol.__uuid);
  if (error) throw new Error(`Falha ao excluir a solicitação: ${error.message}`);
}

async function persistSolicitacaoOrRespond(res, sol, options) {
  try {
    await persistSolicitacao(sol, options);
    return true;
  } catch (error) {
    console.error('Falha ao persistir a solicitação:', error.message);
    res.status(503).json({ error: 'Não foi possível salvar os dados do cliente. Tente novamente.' });
    return false;
  }
}

function isMissingMergeFunction(error) {
  return Boolean(error) && (
    error.code === 'PGRST202' ||
    error.code === '42883' ||
    /merge_configuracoes_site/i.test(error.message || '')
  );
}

// Mescla atomicamente via RPC; se a função ainda não existir no banco, usa leitura+mesclagem+upsert.
async function mergeSiteConfigRow(supabase, patch) {
  const { error } = await supabase.rpc('merge_configuracoes_site', { p_config: patch });
  if (!error) return;
  if (!isMissingMergeFunction(error)) throw new Error(error.message);

  const { data: currentRow, error: readError } = await supabase
    .from('configuracoes_site')
    .select('configuracao')
    .eq('id', true)
    .maybeSingle();
  if (readError) throw new Error(readError.message);

  const currentConfig = currentRow?.configuracao || {};
  if (typeof currentConfig !== 'object' || Array.isArray(currentConfig)) {
    throw new Error('As configurações persistidas no Supabase possuem um formato inválido.');
  }

  const { error: upsertError } = await supabase
    .from('configuracoes_site')
    .upsert({
      id: true,
      configuracao: { ...currentConfig, ...patch },
      atualizado_em: new Date().toISOString()
    }, { onConflict: 'id' });
  if (upsertError) throw new Error(upsertError.message);
}

async function persistSiteConfigToSupabase(config) {
  const supabase = getAdminStateSupabase();
  if (!supabase) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não está configurada para persistir as configurações do site.');
  }

  const patch = getSupabaseSiteConfig(config);
  try {
    await mergeSiteConfigRow(supabase, patch);
  } catch (error) {
    throw new Error(`Falha ao persistir as configurações do site: ${error.message}`);
  }

  // Confirma a gravação lendo o registro de volta antes de reportar sucesso.
  const { data, error: verifyError } = await supabase
    .from('configuracoes_site')
    .select('configuracao')
    .eq('id', true)
    .maybeSingle();
  if (verifyError) {
    throw new Error(`Não foi possível confirmar a gravação: ${verifyError.message}`);
  }
  const saved = data?.configuracao || {};
  for (const key of ['whatsapp_number', 'whatsapp_numero', 'whatsapp_message', 'whatsapp_mensagem']) {
    if (key in patch && JSON.stringify(saved[key]) !== JSON.stringify(patch[key])) {
      throw new Error(`A gravação de "${key}" não foi confirmada no banco de dados.`);
    }
  }
}

async function persistSecurityStateToSupabase(admin) {
  const supabase = getAdminStateSupabase();
  if (!supabase) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não está configurada para persistir o estado administrativo.');
  }

  const securityPatch = {
      admin_security_state: {
        admin_id: admin.id,
        email: admin.email,
        two_factor_enabled: admin.two_factor_enabled,
        two_factor_secret: admin.two_factor_secret || null,
        two_factor_temp_secret: admin.two_factor_temp_secret || null,
        senha_hash: admin.senha_hash,
        token_version: Number(admin.token_version || 1),
        last_totp_step: admin.last_totp_step ?? null,
        last_totp_code: admin.last_totp_code || null,
        last_totp_time: admin.last_totp_time || null,
        failed_login_attempts: admin.failed_login_attempts || {},
        atualizado_em: new Date().toISOString()
      }
  };

  try {
    await mergeSiteConfigRow(supabase, securityPatch);
  } catch (error) {
    throw new Error(`Falha ao persistir o estado de segurança do administrador: ${error.message}`);
  }
}

async function persistAdminStateOrRespond(res, admin) {
  try {
    await persistSecurityStateToSupabase(admin);
    return true;
  } catch (error) {
    console.error('Falha ao persistir o estado administrativo:', error.message);
    res.status(503).json({ error: 'Não foi possível salvar o estado de segurança. Tente novamente.' });
    return false;
  }
}

function getAdminLoginKey(ip) {
  return crypto.createHash('sha256').update(String(ip || 'unknown')).digest('hex');
}

function getRequestIp(req) {
  return req.headers['x-real-ip'] || req.ip || req.socket?.remoteAddress || 'unknown';
}

function checkAdminLoginThrottle(ip, admin) {
  const key = getAdminLoginKey(ip);
  const attempts = admin.failed_login_attempts || {};
  const record = attempts[key];
  if (!record) return { allowed: true };
  if (record.lockedUntil && record.lockedUntil > Date.now()) {
    return { allowed: false, minutesLeft: Math.ceil((record.lockedUntil - Date.now()) / 60000) };
  }
  if (record.lockedUntil || Date.now() - record.firstAttempt > 15 * 60 * 1000) {
    delete attempts[key];
    admin.failed_login_attempts = attempts;
  }
  return { allowed: true };
}

async function recordFailedAdminLogin(ip, admin, res) {
  const key = getAdminLoginKey(ip);
  const attempts = { ...(admin.failed_login_attempts || {}) };
  const now = Date.now();
  for (const [storedKey, storedRecord] of Object.entries(attempts)) {
    if (now - storedRecord.firstAttempt > 15 * 60 * 1000) delete attempts[storedKey];
  }
  const record = attempts[key] || { count: 0, firstAttempt: now };
  record.count += 1;
  record.lastAttempt = now;
  if (record.count >= 5) record.lockedUntil = now + 15 * 60 * 1000;
  attempts[key] = record;
  const oldest = Object.entries(attempts)
    .sort(([, left], [, right]) => left.lastAttempt - right.lastAttempt);
  while (oldest.length > 100) {
    const [expiredKey] = oldest.shift();
    delete attempts[expiredKey];
  }
  admin.failed_login_attempts = attempts;
  return persistAdminStateOrRespond(res, admin);
}

async function clearFailedAdminLogins(ip, admin, res) {
  const key = getAdminLoginKey(ip);
  const attempts = { ...admin.failed_login_attempts };
  delete attempts[key];
  admin.failed_login_attempts = attempts;
  return persistAdminStateOrRespond(res, admin);
}

// Blacklist de tokens invalidados via logout
const revokedTokens = new Set();

function revokeToken(token) {
  if (!token) return;
  const clean = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
  const hash = crypto.createHash('sha256').update(clean).digest('hex');
  revokedTokens.add(hash);
}

function isTokenRevoked(token) {
  if (!token) return false;
  const clean = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
  const hash = crypto.createHash('sha256').update(clean).digest('hex');
  return revokedTokens.has(hash);
}

// Helper para ler body JSON ou multipart
function parseRequestBody(req) {
  return new Promise((resolve) => {
    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('application/json')) {
      if (req.body && typeof req.body === 'object') return resolve(req.body);
      let data = '';
      req.on('data', (chunk) => { data += chunk; });
      req.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve({}); }
      });
      return;
    }

    if (contentType.includes('multipart/form-data')) {
      const busboy = Busboy({ headers: req.headers });
      const fields = {};
      const files = [];

      busboy.on('field', (fieldname, val) => {
        fields[fieldname] = val;
      });

      busboy.on('file', (fieldname, file, info) => {
        const chunks = [];
        file.on('data', (d) => chunks.push(d));
        file.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const base64 = buffer.toString('base64');
          const mime = info.mimeType || 'image/jpeg';
          const dataUrl = `data:${mime};base64,${base64}`;
          files.push({
            fieldname,
            filename: info.filename,
            mimeType: mime,
            size: buffer.length,
            dataUrl
          });
        });
      });

      busboy.on('finish', () => {
        resolve({ ...fields, _files: files });
      });

      busboy.on('error', () => {
        resolve({});
      });

      req.pipe(busboy);
      return;
    }

    if (req.body) return resolve(req.body);
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      try { resolve(JSON.parse(raw)); } catch { resolve({}); }
    });
  });
}

// Helper para verificar token JWT
function verifyAuth(req, store = null) {
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();

  if (isTokenRevoked(token)) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!store?.admin || decoded.scope !== 'admin') return null;
    if (Number(decoded.id) !== Number(store.admin.id)) return null;
    if (decoded.token_version === undefined) return null;
    if (Number(decoded.token_version) !== Number(store.admin.token_version || 1)) return null;
    return decoded;
  } catch {
    return null;
  }
}

// Helper para verificar token de cliente homologado
function verifyClienteAuth(req) {
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();

  if (isTokenRevoked(token)) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.scope !== 'cliente') return null;
    return decoded;
  } catch {
    return null;
  }
}

function sanitizeClienteData(sol) {
  if (!sol) return null;
  let dias = sol.dias_funcionamento;
  let horarios = sol.horarios_funcionamento;
  let servicos = sol.servicos_desejados;

  try { if (typeof dias === 'string') dias = JSON.parse(dias); } catch {}
  try { if (typeof horarios === 'string') horarios = JSON.parse(horarios); } catch {}
  try { if (typeof servicos === 'string') servicos = JSON.parse(servicos); } catch {}

  let pix1 = sol.pix_1;
  let conta1 = sol.conta_1;
  if (pix1 && pix1.length > 6) pix1 = pix1.slice(0, 3) + '••••' + pix1.slice(-3);
  if (conta1 && conta1.length > 3) conta1 = '••••-' + conta1.slice(-2);

  return {
    id: sol.id,
    protocolo: sol.protocolo,
    cnpj: sol.cnpj,
    razao_social: sol.razao_social,
    nome_fantasia: sol.nome_fantasia,
    tipo_comercio: sol.tipo_comercio,
    cep: sol.cep,
    estado: sol.estado,
    cidade: sol.cidade,
    bairro: sol.bairro,
    rua: sol.rua,
    numero: sol.numero,
    complemento: sol.complemento,
    latitude: sol.latitude,
    longitude: sol.longitude,
    nome_responsavel: sol.nome_responsavel,
    telefone: sol.telefone,
    email: sol.email,
    banco_1: sol.banco_1,
    agencia_1: sol.agencia_1,
    conta_1: conta1,
    tipo_conta_1: sol.tipo_conta_1,
    pix_1: pix1,
    dias_funcionamento: dias,
    horarios_funcionamento: horarios,
    servicos_desejados: servicos,
    status: sol.status,
    tem_senha: Boolean(sol.senha_hash),
    ultimo_login: sol.ultimo_login,
    criado_em: sol.criado_em,
    atualizado_em: sol.atualizado_em
  };
}

// HANDLER PRINCIPAL VERCEL SERVERLESS
export default async function handler(req, res) {
  // CORS universal
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-2fa-code, x-two-factor-code');

  // Cabeçalhos HTTP de Segurança Avançados (OWASP Hardening)
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Determinar rota normalizada
  const urlObj = new URL(req.url, 'http://localhost');
  let pathname = urlObj.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
  const endpointParam = urlObj.searchParams.get('endpoint') || urlObj.searchParams.get('path');
  if (endpointParam) {
    pathname = endpointParam.replace(/^\//, '').replace(/\/$/, '');
  }

  const method = req.method.toUpperCase();
  const requiresAdminState = pathname === 'config' && method === 'PUT'
    || pathname === 'admin'
    || pathname.startsWith('admin/');
  const requiresPersistentSiteConfig = pathname === 'config'
    && (method === 'GET' || method === 'PUT');

  if (requiresAdminState && !hasDurableAdminStateStore()) {
    return res.status(503).json({
      error: 'O armazenamento administrativo persistente não está configurado. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.'
    });
  }
  if (requiresAdminState && !JWT_SECRET) {
    return res.status(503).json({ error: 'JWT_SECRET deve ser configurado para autenticação administrativa em produção.' });
  }
  if (
    requiresPersistentSiteConfig &&
    method === 'GET' &&
    process.env.NODE_ENV === 'production' &&
    !hasDurableAdminStateStore()
  ) {
    return res.status(503).json({
      error: 'O armazenamento persistente das configurações do site não está configurado.'
    });
  }

  const store = loadStore();
  try {
    await syncWithSupabase(store);
  } catch (error) {
    console.error('Falha ao carregar dados persistentes do Supabase:', error.message);
    if (requiresAdminState || (requiresPersistentSiteConfig && hasDurableAdminStateStore())) {
      return res.status(503).json({ error: 'Não foi possível carregar as configurações persistidas.' });
    }
  }

  const usesSolicitacoes = pathname === 'solicitacoes'
    || pathname.startsWith('solicitacoes/')
    || pathname === 'admin/dashboard'
    || pathname === 'admin/live-check'
    || pathname === 'admin/export/csv'
    || pathname.startsWith('cliente/');
  if (usesSolicitacoes && getAdminStateSupabase()) {
    try {
      await loadSolicitacoesFromSupabase(store);
    } catch (error) {
      console.error('Falha ao carregar solicitações do Supabase:', error.message);
      return res.status(503).json({ error: 'Não foi possível carregar os dados dos clientes.' });
    }
  }

  // 1. HEALTH CHECK
  if (pathname === 'health' || pathname === '') {
    return res.status(200).json({
      status: 'ok',
      service: 'ponto-coleta-api',
      runtime: 'vercel-serverless',
      timestamp: new Date().toISOString()
    });
  }

  // 2. CONFIGURAÇÕES PÚBLICAS E ADMINISTRATIVAS (/api/config)
  if (pathname === 'config') {
    if (method === 'GET') {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(store.config);
    }
    if (method === 'PUT') {
      const user = verifyAuth(req, store);
      if (!user) return res.status(401).json({ error: 'Acesso não autorizado. Sessão administrativa inválida.' });

      // Verificar se o administrador possui 2FA ativo
      if (!store.admin.two_factor_enabled || !store.admin.two_factor_secret) {
        return res.status(403).json({
          error: 'Autenticação de dois fatores (2FA) não configurada nesta conta. Por segurança, é obrigatório ativar o Google Authenticator antes de alterar as configurações da plataforma.',
          require_2fa_setup: true,
        });
      }

      const body = await parseRequestBody(req);
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({ error: 'O formato das configurações enviadas é inválido.' });
      }
      if (Object.prototype.hasOwnProperty.call(body, 'whatsapp_numero')) {
        const digits = String(body.whatsapp_numero ?? '').replace(/\D/g, '');
        if (!/^\d{10,15}$/.test(digits)) {
          return res.status(400).json({ error: 'Número de WhatsApp inválido. Informe DDI + DDD + número (10 a 15 dígitos).' });
        }
        body.whatsapp_numero = digits;
      }
      const twoFactorCode = (
        req.headers['x-2fa-code'] ||
        req.headers['x-two-factor-code'] ||
        body.two_factor_code ||
        ''
      ).toString().replace(/\D/g, '');

      if (!twoFactorCode || twoFactorCode.length !== 6) {
        return res.status(403).json({
          error: 'Código de autenticação de dois fatores (2FA) de 6 dígitos é obrigatório para salvar as alterações.',
          require_2fa: true,
        });
      }

      const plainSecret = decryptSecret(store.admin.two_factor_secret);
      if (!plainSecret) {
        return res.status(503).json({ error: 'Não foi possível validar a configuração do autenticador.' });
      }
      const matchedStep = getTotpStep(twoFactorCode, plainSecret);

      if (matchedStep === null || Number(store.admin.last_totp_step ?? -1) >= matchedStep) {
        if (!await recordFailedAdminLogin(getRequestIp(req), store.admin, res)) return;
        return res.status(403).json({
          error: 'Código 2FA incorreto, expirado ou já utilizado. Aguarde a próxima atualização e tente novamente.',
          require_2fa: true,
        });
      }

      const ip = getRequestIp(req);
      store.admin.last_totp_step = matchedStep;
      if (!await clearFailedAdminLogins(ip, store.admin, res)) return;
      delete body.two_factor_code;
      const updatedConfig = { ...store.config, ...body };
      try {
        await persistSiteConfigToSupabase(updatedConfig);
      } catch (error) {
        console.error('Falha ao persistir configurações do site:', error.message);
        return res.status(503).json({ error: 'Não foi possível salvar as configurações de forma persistente. Tente novamente.' });
      }
      store.config = updatedConfig;
      saveStore(store);
      return res.status(200).json({ success: true, message: 'Configurações atualizadas com sucesso mediante validação 2FA!' });
    }
  }

  // 3. AUTENTICAÇÃO DO ADMINISTRADOR (/api/admin/login)
  if (pathname === 'admin/login' && method === 'POST') {
    const ip = getRequestIp(req);
    const throttle = checkAdminLoginThrottle(ip, store.admin);
    if (!throttle.allowed) {
      return res.status(429).json({
        error: `Muitas tentativas incorretas. Acesso temporariamente bloqueado por segurança. Tente novamente em ${throttle.minutesLeft} minutos.`
      });
    }

    const body = await parseRequestBody(req);
    const { email, senha, pre_auth_token } = body || {};

    if (pre_auth_token) {
      return res.status(400).json({ error: 'Use o endpoint de validação do segundo fator para concluir o login.' });
    }

    const emailInput = String(email || '').trim().toLowerCase();
    const senhaInput = String(senha || '');
    const isEmailValid = emailInput === String(store.admin.email || '').toLowerCase();
    const isPasswordValid = Boolean(store.admin.senha_hash) &&
      bcrypt.compareSync(senhaInput, store.admin.senha_hash);

    if (!isEmailValid || !isPasswordValid) {
      if (!await recordFailedAdminLogin(ip, store.admin, res)) return;
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
    }

    if (Number(store.admin.two_factor_enabled) === 1) {
      if (!store.admin.two_factor_secret) {
        console.error(`Administrador ${store.admin.id} tem 2FA habilitado sem segredo persistido.`);
        return res.status(503).json({ error: 'A configuração de segurança da conta está inconsistente.' });
      }

      const preAuthToken = jwt.sign(
        {
          id: store.admin.id,
          email: store.admin.email,
          token_version: Number(store.admin.token_version || 1),
          scope: '2fa_pending'
        },
        JWT_SECRET,
        { expiresIn: '5m' }
      );

      return res.status(200).json({
        require_2fa: true,
        pre_auth_token: preAuthToken,
        email: store.admin.email,
        message: 'Autenticação em duas etapas requerida. Digite o código de 6 dígitos gerado pelo aplicativo autenticador.'
      });
    }

    if (!await clearFailedAdminLogins(ip, store.admin, res)) return;

    const token = jwt.sign(
      {
        id: store.admin.id,
        email: store.admin.email,
        nome: store.admin.nome,
        permissao: store.admin.permissao,
        scope: 'admin',
        token_version: store.admin.token_version || 1,
        two_factor_enabled: Boolean(store.admin.two_factor_enabled)
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      token,
      admin: {
        id: store.admin.id,
        nome: store.admin.nome,
        email: store.admin.email,
        permissao: store.admin.permissao,
        two_factor_enabled: Boolean(store.admin.two_factor_enabled)
      }
    });
  }

  // 3.1 VALIDAÇÃO DEDICADA DE 2FA NO LOGIN (/api/admin/2fa/verify-login)
  if (pathname === 'admin/2fa/verify-login' && method === 'POST') {
    const ip = getRequestIp(req);
    const throttle = checkAdminLoginThrottle(ip, store.admin);
    if (!throttle.allowed) {
      return res.status(429).json({
        error: `Muitas tentativas incorretas. Acesso temporariamente bloqueado por segurança. Tente novamente em ${throttle.minutesLeft} minutos.`
      });
    }

    const body = await parseRequestBody(req);
    const { pre_auth_token, two_factor_code, code } = body || {};
    const totpInput = two_factor_code || code;

    if (!pre_auth_token) {
      return res.status(400).json({ error: 'Token de autenticação intermediário é obrigatório.' });
    }

    if (!totpInput) {
      return res.status(400).json({ error: 'Código de 6 dígitos do Google Authenticator é obrigatório.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(pre_auth_token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Token temporário expirado ou inválido. Realize login novamente com suas credenciais.' });
    }

    if (
      decoded.scope !== '2fa_pending' ||
      Number(decoded.id) !== Number(store.admin.id) ||
      Number(decoded.token_version) !== Number(store.admin.token_version || 1)
    ) {
      return res.status(401).json({ error: 'Token de autenticação com escopo inválido.' });
    }

    if (Number(store.admin.two_factor_enabled) !== 1 || !store.admin.two_factor_secret) {
      return res.status(401).json({ error: 'O 2FA não está ativo para esta conta.' });
    }

    const cleanCode = String(totpInput).replace(/\D/g, '');
    const plainSecret = decryptSecret(store.admin.two_factor_secret);
    if (!plainSecret) {
      console.error(`Não foi possível descriptografar o segredo 2FA do administrador ${store.admin.id}.`);
      return res.status(503).json({ error: 'Não foi possível validar a configuração do autenticador.' });
    }

    const matchedStep = getTotpStep(cleanCode, plainSecret);
    const lastTotpStep = Number(store.admin.last_totp_step ??
      (store.admin.last_totp_time ? Math.floor(store.admin.last_totp_time / 30_000) : -1));
    if (matchedStep === null || lastTotpStep >= matchedStep) {
      if (!await recordFailedAdminLogin(ip, store.admin, res)) return;
      return res.status(401).json({
        error: 'Código do autenticador inválido, expirado ou já utilizado. Aguarde a próxima atualização e tente novamente.'
      });
    }

    store.admin.last_totp_step = matchedStep;
    saveStore(store);
    if (!await clearFailedAdminLogins(ip, store.admin, res)) return;

    const token = jwt.sign(
      {
        id: store.admin.id,
        email: store.admin.email,
        nome: store.admin.nome,
        permissao: store.admin.permissao,
        scope: 'admin',
        token_version: store.admin.token_version || 1,
        two_factor_enabled: true
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      token,
      admin: {
        id: store.admin.id,
        nome: store.admin.nome,
        email: store.admin.email,
        permissao: store.admin.permissao,
        two_factor_enabled: true
      }
    });
  }

  // 3.2 LOGOUT E INVALIDAÇÃO DE SESSÃO (/api/admin/logout)
  if (pathname === 'admin/logout' && method === 'POST') {
    const user = verifyAuth(req, store);
    if (!user) return res.status(401).json({ error: 'Sessão administrativa inválida.' });
    const authHeader = req.headers['authorization'] || '';
    if (authHeader.startsWith('Bearer ')) {
      revokeToken(authHeader.slice(7).trim());
    }
    store.admin.token_version = (store.admin.token_version || 1) + 1;
    saveStore(store);
    if (!await persistAdminStateOrRespond(res, store.admin)) return;

    return res.status(200).json({
      success: true,
      message: 'Sessão administrativa encerrada com sucesso.'
    });
  }

  // 4. DADOS DA SESSÃO DO ADMINISTRADOR (/api/admin/me)
  if (pathname === 'admin/me' && method === 'GET') {
    const user = verifyAuth(req, store);
    if (!user) return res.status(401).json({ error: 'Sessão expirada ou inválida' });
    return res.status(200).json({
      admin: {
        id: store.admin.id,
        nome: store.admin.nome,
        email: store.admin.email,
        permissao: store.admin.permissao,
        two_factor_enabled: Boolean(Number(store.admin.two_factor_enabled) === 1 && store.admin.two_factor_secret)
      }
    });
  }

  // 5. DASHBOARD DO ADMINISTRADOR (/api/admin/dashboard)
  if (pathname === 'admin/dashboard' && method === 'GET') {
    const user = verifyAuth(req, store);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });

    const total = store.solicitacoes.length;
    const stats = {
      total,
      recebido: 0,
      em_analise: 0,
      aguardando_contato: 0,
      documentacao_pendente: 0,
      aprovado: 0,
      rejeitado: 0,
      ultimos_7_dias: 0,
      mes_atual: 0
    };

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const tipoMap = {};

    for (const s of store.solicitacoes) {
      if (s.status === 'Recebido') stats.recebido++;
      else if (s.status === 'Em análise') stats.em_analise++;
      else if (s.status === 'Aguardando contato') stats.aguardando_contato++;
      else if (s.status === 'Documentação pendente') stats.documentacao_pendente++;
      else if (s.status === 'Aprovado') stats.aprovado++;
      else if (s.status === 'Rejeitado') stats.rejeitado++;

      const createdAt = new Date(s.criado_em || Date.now()).getTime();
      if (createdAt >= sevenDaysAgo) stats.ultimos_7_dias++;
      if (createdAt >= startOfMonth) stats.mes_atual++;

      const tipo = s.tipo_comercio || 'Outros';
      tipoMap[tipo] = (tipoMap[tipo] || 0) + 1;
    }

    // Gráfico diário dos últimos 14 dias
    const timeline = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = store.solicitacoes.filter((s) => (s.criado_em || '').startsWith(dateStr)).length;
      timeline.push({
        data: dateStr,
        label: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`,
        quantidade: count
      });
    }

    const tipos_comercio = Object.entries(tipoMap)
      .map(([tipo_comercio, count]) => ({ tipo_comercio, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const recentes = [...store.solicitacoes]
      .sort((a, b) => new Date(b.criado_em || 0).getTime() - new Date(a.criado_em || 0).getTime())
      .slice(0, 6);

    return res.status(200).json({
      stats,
      timeline,
      tipos_comercio,
      recentes
    });
  }

  // 5.1 LIVE CHECK EM TEMPO REAL (/api/admin/live-check)
  if (pathname === 'admin/live-check' && method === 'GET') {
    const user = verifyAuth(req, store);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });

    const lastId = parseInt(urlObj.searchParams.get('last_id') || '0', 10);
    const novos = store.solicitacoes.filter((s) => s.id > lastId);

    return res.status(200).json({
      novos,
      total: store.solicitacoes.length,
      hasNew: novos.length > 0
    });
  }

  // 5.2 GOOGLE AUTHENTICATOR 2FA (/api/admin/2fa/*)
  if (pathname === 'admin/2fa/status' && method === 'GET') {
    const user = verifyAuth(req, store);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });
    const isEnabled = Boolean(Number(store.admin.two_factor_enabled) === 1 && store.admin.two_factor_secret);
    if (Number(store.admin.two_factor_enabled) === 1 && !store.admin.two_factor_secret) {
      return res.status(503).json({ error: 'A configuração de segurança da conta está inconsistente.' });
    }
    const isPending = Boolean(!isEnabled && store.admin.two_factor_temp_secret);
    return res.status(200).json({
      enabled: isEnabled,
      pending: isPending
    });
  }

  if (pathname === 'admin/2fa/setup' && method === 'POST') {
    const user = verifyAuth(req, store);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });

    if (Number(store.admin.two_factor_enabled) === 1) {
      return res.status(400).json({
        error: 'A autenticação em duas etapas já está ativa nesta conta. Para reconfigurar, desative-a primeiro na aba Segurança confirmando sua senha.'
      });
    }

    let secret;
    if (store.admin.two_factor_temp_secret) {
      secret = decryptSecret(store.admin.two_factor_temp_secret);
      if (!secret) {
        return res.status(503).json({ error: 'Não foi possível recuperar a configuração pendente do autenticador.' });
      }
    } else {
      secret = generateSecret();
      store.admin.two_factor_temp_secret = encryptSecret(secret);
      saveStore(store);
      if (!await persistAdminStateOrRespond(res, store.admin)) return;
    }

    const otpauthUrl = generateURI({
      issuer: 'Ponto de Coleta Admin',
      label: store.admin.email,
      secret
    });

    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      width: 260,
      margin: 2,
      color: { dark: '#0F172A', light: '#FFFFFF' }
    });

    return res.status(200).json({
      secret,
      qr_code: qrCodeDataUrl,
      otpauth_url: otpauthUrl
    });
  }

  if (pathname === 'admin/2fa/direct-enable' && method === 'POST') {
    return res.status(403).json({
      error: 'Ativação direta descontinuada por segurança. É obrigatório validar o código de 6 dígitos gerado no Google Authenticator através de /api/admin/2fa/verify-and-enable.'
    });
  }

  if ((pathname === 'admin/2fa/verify-and-enable' || pathname === 'admin/2fa/verify') && method === 'POST') {
    const user = verifyAuth(req, store);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });
    const ip = getRequestIp(req);
    const throttle = checkAdminLoginThrottle(ip, store.admin);
    if (!throttle.allowed) {
      return res.status(429).json({
        error: `Muitas tentativas incorretas. Acesso temporariamente bloqueado por segurança. Tente novamente em ${throttle.minutesLeft} minutos.`
      });
    }

    if (Number(store.admin.two_factor_enabled) === 1) {
      return res.status(409).json({ error: 'O 2FA já está ativado nesta conta.' });
    }

    const body = await parseRequestBody(req);
    const tokenInput = String(body.token || body.code || '').replace(/\D/g, '');

    if (!tokenInput || tokenInput.length !== 6) {
      return res.status(400).json({ error: 'O código de 6 dígitos é obrigatório.' });
    }

    if (!store.admin.two_factor_temp_secret) {
      return res.status(400).json({ error: 'Nenhuma configuração de 2FA em andamento. Gere um novo QR Code.' });
    }

    const plainTempSecret = decryptSecret(store.admin.two_factor_temp_secret);
    if (!plainTempSecret) {
      return res.status(503).json({ error: 'Não foi possível recuperar a configuração pendente do autenticador.' });
    }
    const matchedStep = getTotpStep(tokenInput, plainTempSecret);

    if (matchedStep === null) {
      if (!await recordFailedAdminLogin(ip, store.admin, res)) return;
      return res.status(400).json({
        error: 'Código inválido ou incorreto. Certifique-se de digitar os 6 dígitos gerados no aplicativo Google Authenticator.'
      });
    }

    store.admin.two_factor_enabled = 1;
    store.admin.two_factor_secret = encryptSecret(plainTempSecret);
    store.admin.two_factor_temp_secret = null;
    store.admin.last_totp_step = matchedStep;
    saveStore(store);
    if (!await clearFailedAdminLogins(ip, store.admin, res)) return;

    return res.status(200).json({
      success: true,
      message: 'Autenticação em duas etapas (2FA) do Google Authenticator ativada com sucesso!'
    });
  }

  if (pathname === 'admin/2fa/disable' && method === 'POST') {
    const user = verifyAuth(req, store);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });

    // Procedimento seguro de recuperação emergencial devidamente autorizado via chave de ambiente
    const emergencyKey = process.env.EMERGENCY_RECOVERY_KEY;
    const reqEmergencyKey = req.headers['x-emergency-recovery-key'];
    const isAuthorizedEmergency = Boolean(emergencyKey && reqEmergencyKey && emergencyKey === reqEmergencyKey);

    if (!isAuthorizedEmergency) {
      return res.status(403).json({
        error: 'A desativação do 2FA está bloqueada pelas políticas de segurança da plataforma. A autenticação em duas etapas é mandatória e não pode ser desativada pelo painel administrativo comum.',
        locked: true
      });
    }

    // Apenas se autorizado emergencialmente:
    store.admin.two_factor_enabled = 0;
    store.admin.two_factor_secret = null;
    store.admin.two_factor_temp_secret = null;
    store.admin.last_totp_step = null;
    saveStore(store);
    if (!await persistAdminStateOrRespond(res, store.admin)) return;

    console.info(`[AUDIT] 2FA desativado mediante protocolo emergencial autorizado em ${new Date().toISOString()}`);

    return res.status(200).json({
      success: true,
      message: 'Autenticação em duas etapas desativada mediante protocolo emergencial.'
    });
  }


  // 6. ALTERAR SENHA ADMINISTRATIVA (/api/admin/password)
  if (pathname === 'admin/password' && method === 'PUT') {
    const user = verifyAuth(req, store);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });
    const body = await parseRequestBody(req);
    const { senha_atual, nova_senha, two_factor_code, code } = body || {};

    const isCurrentValid = Boolean(store.admin.senha_hash) &&
      bcrypt.compareSync(String(senha_atual || ''), store.admin.senha_hash);

    if (!isCurrentValid) {
      return res.status(401).json({ error: 'A senha atual informada está incorreta.' });
    }

    if (!nova_senha || nova_senha.length < 8) {
      return res.status(400).json({ error: 'A nova senha deve possuir no mínimo 8 caracteres.' });
    }

    if (Number(store.admin.two_factor_enabled) === 1) {
      const tokenInput = String(two_factor_code || code || '').replace(/\D/g, '');
      if (!tokenInput || tokenInput.length !== 6) {
        return res.status(400).json({
          error: 'Código 2FA do Google Authenticator é obrigatório para alterar a senha administrativa.'
        });
      }
      const plainSecret = decryptSecret(store.admin.two_factor_secret);
      if (!plainSecret) {
        return res.status(503).json({ error: 'Não foi possível validar a configuração do autenticador.' });
      }
      const matchedStep = getTotpStep(tokenInput, plainSecret);
      if (matchedStep === null || Number(store.admin.last_totp_step ?? -1) >= matchedStep) {
        return res.status(401).json({
          error: 'Código do autenticador inválido, expirado ou já utilizado. Aguarde a próxima atualização e tente novamente.'
        });
      }
      store.admin.last_totp_step = matchedStep;
    }

    store.admin.senha_hash = bcrypt.hashSync(nova_senha, 10);
    saveStore(store);
    if (!await persistAdminStateOrRespond(res, store.admin)) return;
    console.info(`[AUDIT] Senha administrativa alterada com sucesso em ${new Date().toISOString()}`);
    return res.status(200).json({ success: true, message: 'Senha administrativa atualizada com sucesso!' });
  }

  // 7. EXPORTAÇÃO CSV (/api/admin/export/csv)
  if (pathname === 'admin/export/csv' && method === 'GET') {
    const user = verifyAuth(req, store);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      let clean = String(str).replace(/"/g, '""').replace(/\r?\n/g, ' ');
      if (/^[=+\-@\t\r]/.test(clean)) {
        clean = "'" + clean;
      }
      return `"${clean}"`;
    };

    const headers = 'Protocolo;CNPJ;Nome Fantasia;Cidade;UF;Status;Data Cadastro\r\n';
    const rows = store.solicitacoes.map((s) => [
      escapeCsv(s.protocolo),
      escapeCsv(s.cnpj),
      escapeCsv(s.nome_fantasia),
      escapeCsv(s.cidade),
      escapeCsv(s.estado),
      escapeCsv(s.status),
      escapeCsv(s.criado_em)
    ].join(';')).join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="solicitacoes.csv"');
    return res.status(200).send('\uFEFF' + headers + rows);

  }

  // 8. LISTAGEM E CADASTRO DE SOLICITAÇÕES (/api/solicitacoes)
  if (pathname === 'solicitacoes') {
    // GET: Listar com filtros e paginação
    if (method === 'GET') {
      const user = verifyAuth(req, store);
      if (!user) return res.status(401).json({ error: 'Não autorizado' });

      const q = (urlObj.searchParams.get('q') || '').trim().toLowerCase();
      const status = urlObj.searchParams.get('status');
      const page = Math.max(1, parseInt(urlObj.searchParams.get('page') || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(urlObj.searchParams.get('limit') || '10', 10)));

      let filtered = [...store.solicitacoes];

      if (q) {
        filtered = filtered.filter(
          (s) =>
            s.protocolo?.toLowerCase().includes(q) ||
            s.nome_fantasia?.toLowerCase().includes(q) ||
            s.cnpj?.includes(q) ||
            s.cidade?.toLowerCase().includes(q)
        );
      }

      if (status) {
        filtered = filtered.filter((s) => s.status === status);
      }

      const total = filtered.length;
      const offset = (page - 1) * limit;
      const paginated = filtered.slice(offset, offset + limit);

      return res.status(200).json({
        data: paginated,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    }

    // POST: Nova candidatura pública
    if (method === 'POST') {
      const body = await parseRequestBody(req);

      if (!body.cnpj || !body.nome_fantasia || !body.razao_social) {
        return res.status(400).json({ error: 'Campos obrigatórios não preenchidos.' });
      }

      const ano = new Date().getFullYear();
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let randCode = '';
      for (let i = 0; i < 6; i++) randCode += chars.charAt(Math.floor(Math.random() * chars.length));
      const protocolo = `PDC-${ano}-${randCode}`;
      const agora = new Date().toISOString();

      // Resolver arquivos enviados
      const filesAttached = [];
      if (Array.isArray(body._files)) {
        body._files.forEach((f, idx) => {
          filesAttached.push({
            id: Date.now() + idx,
            tipo_imagem: f.fieldname.includes('fachada') ? 'fachada' : 'interior',
            caminho_arquivo: f.dataUrl,
            nome_original: f.filename
          });
        });
      } else {
        filesAttached.push(
          { id: Date.now() + 1, tipo_imagem: 'fachada', caminho_arquivo: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800', nome_original: 'fachada.jpg' },
          { id: Date.now() + 2, tipo_imagem: 'interior', caminho_arquivo: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800', nome_original: 'interior.jpg' }
        );
      }

      let dias = body.dias_funcionamento;
      if (typeof dias === 'string') {
        try { dias = JSON.parse(dias); } catch { dias = ['SEG', 'TER', 'QUA', 'QUI', 'SEX']; }
      }

      let horarios = body.horarios_funcionamento;
      if (typeof horarios === 'string') {
        try { horarios = JSON.parse(horarios); } catch { horarios = {}; }
      }

      let servicos = body.servicos_desejados;
      if (typeof servicos === 'string') {
        try { servicos = JSON.parse(servicos); } catch { servicos = []; }
      }

      const novaSolicitacao = {
        id: store.nextId++,
        protocolo,
        cnpj: body.cnpj,
        razao_social: body.razao_social,
        nome_fantasia: body.nome_fantasia,
        tipo_comercio: body.tipo_comercio || 'Outros',
        tipo_comercio_outro: body.tipo_comercio_outro || null,
        cep: body.cep || '',
        estado: body.estado || '',
        cidade: body.cidade || '',
        bairro: body.bairro || '',
        rua: body.rua || '',
        numero: body.numero || '',
        complemento: body.complemento || null,
        latitude: parseFloat(body.latitude) || -23.55052,
        longitude: parseFloat(body.longitude) || -46.633308,
        dias_funcionamento: dias || ['SEG', 'TER', 'QUA', 'QUI', 'SEX'],
        horarios_funcionamento: horarios || {},
        fecha_almoco: body.fecha_almoco === true || body.fecha_almoco === 'true',
        horario_almoco_inicio: body.horario_almoco_inicio || null,
        horario_almoco_fim: body.horario_almoco_fim || null,
        estacionamento: body.estacionamento || 'Não tem estacionamento',
        quantidade_colaboradores: body.quantidade_colaboradores || '3 a 5 colaboradores',
        experiencia_logistica: body.experiencia_logistica || 'Não trabalhou ainda',
        servicos_desejados: servicos || [],
        nome_responsavel: body.nome_responsavel || '',
        telefone: body.telefone || '',
        email: body.email || '',
        banco_1: body.banco_1 || null,
        agencia_1: body.agencia_1 || null,
        conta_1: body.conta_1 || null,
        tipo_conta_1: body.tipo_conta_1 || null,
        pix_1: body.pix_1 || null,
        banco_2: body.banco_2 || null,
        agencia_2: body.agencia_2 || null,
        conta_2: body.conta_2 || null,
        tipo_conta_2: body.tipo_conta_2 || null,
        pix_2: body.pix_2 || null,
        origem_cadastro: body.origem_cadastro || 'Outro.',
        origem_outro: body.origem_outro || null,
        status: 'Recebido',
        observacoes_internas: null,
        criado_em: agora,
        atualizado_em: agora,
        arquivos: filesAttached,
        historico: [
          {
            id: Date.now(),
            status_anterior: null,
            status_novo: 'Recebido',
            administrador_id: 'Sistema',
            observacao: 'Candidatura submetida pelo formulário público',
            criado_em: agora
          }
        ]
      };

      store.solicitacoes.unshift(novaSolicitacao);
      saveStore(store);
      if (!await persistSolicitacaoOrRespond(res, novaSolicitacao, { isNew: true, arquivos: filesAttached })) return;
      return res.status(201).json({
        success: true,
        protocolo,
        id: novaSolicitacao.id,
        nome_fantasia: novaSolicitacao.nome_fantasia,
        criado_em: agora
      });
    }
  }

  // 9. OPERAÇÕES EM SOLICITAÇÃO ESPECÍFICA (/api/solicitacoes/:id, /status, /observacoes)
  const solMatch = pathname.match(/^solicitacoes\/(\d+)(?:\/(status|observacoes))?$/);
  if (solMatch) {
    const user = verifyAuth(req, store);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });

    const id = parseInt(solMatch[1], 10);
    const subRoute = solMatch[2];
    const index = store.solicitacoes.findIndex((s) => s.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    const sol = store.solicitacoes[index];

    // GET detalhes
    if (!subRoute && method === 'GET') {
      const reveal = urlObj.searchParams.get('reveal_financial') === 'true';
      const clone = JSON.parse(JSON.stringify(sol));
      try {
        if (getAdminStateSupabase()) clone.arquivos = await loadSolicitacaoArquivos(sol);
      } catch (error) {
        console.error('Falha ao carregar arquivos da solicitação:', error.message);
        return res.status(503).json({ error: 'Não foi possível carregar os arquivos do cliente.' });
      }
      if (!reveal) {
        if (clone.pix_1) clone.pix_1 = clone.pix_1.slice(0, 3) + '••••' + clone.pix_1.slice(-3);
        if (clone.conta_1) clone.conta_1 = '••••-' + clone.conta_1.slice(-2);
        if (clone.pix_2) clone.pix_2 = clone.pix_2.slice(0, 3) + '••••' + clone.pix_2.slice(-3);
        if (clone.conta_2) clone.conta_2 = '••••-' + clone.conta_2.slice(-2);
      }
      return res.status(200).json(clone);
    }

    // PATCH status
    if (subRoute === 'status' && method === 'PATCH') {
      const body = await parseRequestBody(req);
      const agora = new Date().toISOString();
      const anterior = sol.status;
      sol.status = body.status || sol.status;
      sol.atualizado_em = agora;
      sol.historico = sol.historico || [];
      sol.historico.unshift({
        id: Date.now(),
        status_anterior: anterior,
        status_novo: sol.status,
        administrador_id: user.nome || 'Administrador',
        observacao: body.observacao || 'Alteração manual de status',
        criado_em: agora
      });
      saveStore(store);
      if (!await persistSolicitacaoOrRespond(res, sol)) return;
      return res.status(200).json({ success: true, message: `Status alterado para '${sol.status}'`, status: sol.status });
    }

    // POST observações
    if (subRoute === 'observacoes' && method === 'POST') {
      const body = await parseRequestBody(req);
      sol.observacoes_internas = body.observacoes_internas || '';
      sol.atualizado_em = new Date().toISOString();
      saveStore(store);
      if (!await persistSolicitacaoOrRespond(res, sol)) return;
      return res.status(200).json({ success: true, message: 'Observações salvas.' });
    }

    // DELETE exclusão LGPD
    if (!subRoute && method === 'DELETE') {
      try {
        await deleteSolicitacaoPersisted(sol);
      } catch (error) {
        console.error('Falha ao excluir a solicitação:', error.message);
        return res.status(503).json({ error: 'Não foi possível excluir o registro. Tente novamente.' });
      }
      store.solicitacoes.splice(index, 1);
      saveStore(store);
      return res.status(200).json({ success: true, message: 'Registro excluído.' });
    }
  }

  // 10. ROTAS DO CLIENTE / PARCEIRO HOMOLOGADO (/api/cliente/*)
  if (pathname === 'cliente/login' && method === 'POST') {
    const body = await parseRequestBody(req);
    const { identifier, cnpj, senha, password, protocolo } = body || {};
    const rawCnpj = (cnpj || identifier || '').toString().trim();
    const cleanCnpjDigits = rawCnpj.replace(/\D/g, '');
    const cleanEmail = rawCnpj.toLowerCase();
    const cleanProtocolo = (protocolo || '').toString().trim().toUpperCase();
    const inputPassword = senha || password;

    if (!cleanCnpjDigits && !cleanEmail && !cleanProtocolo) {
      return res.status(400).json({ error: 'Informe seu CNPJ, E-mail ou Protocolo para continuar.' });
    }

    const sol = store.solicitacoes.find((s) => {
      const sCnpjDigits = (s.cnpj || '').replace(/\D/g, '');
      const sEmail = (s.email || '').toLowerCase().trim();
      const sProto = (s.protocolo || '').toUpperCase().trim();
      return (
        (cleanCnpjDigits && sCnpjDigits === cleanCnpjDigits) ||
        (cleanEmail && sEmail === cleanEmail) ||
        (cleanProtocolo && sProto === cleanProtocolo)
      );
    });

    if (!sol) {
      return res.status(404).json({
        error: 'Nenhum cadastro encontrado com os dados informados. Verifique os dados digitados ou realize um novo cadastro.'
      });
    }

    if (sol.status !== 'Aprovado') {
      const isAnalise = ['Recebido', 'Em análise', 'Aguardando contato', 'Documentação pendente'].includes(sol.status);
      if (isAnalise) {
        return res.status(403).json({
          error: 'Cadastro em análise.',
          status: sol.status,
          protocolo: sol.protocolo,
          nome_fantasia: sol.nome_fantasia,
          message: `Sua solicitação (Protocolo: ${sol.protocolo}) foi recebida e está em fase de avaliação logística. O acesso ao portal do parceiro é liberado assim que seu ponto for Aprovado.`
        });
      }

      if (sol.status === 'Rejeitado') {
        return res.status(403).json({
          error: 'Solicitação não aprovada.',
          status: 'Rejeitado',
          protocolo: sol.protocolo,
          message: 'Seu cadastro não foi homologado para ponto de coleta na nossa rede.'
        });
      }

      return res.status(403).json({
        error: `Status atual: ${sol.status}. O acesso é restrito a estabelecimentos homologados.`,
        status: sol.status,
        protocolo: sol.protocolo
      });
    }

    // Acesso com Protocolo
    if (cleanProtocolo) {
      if ((sol.protocolo || '').toUpperCase().trim() !== cleanProtocolo) {
        return res.status(401).json({ error: 'Protocolo incorreto para este estabelecimento.' });
      }
    } else {
      // Acesso com Senha
      if (!sol.senha_hash) {
        return res.status(400).json({
          require_password_setup: true,
          status: 'Aprovado',
          protocolo: sol.protocolo,
          nome_fantasia: sol.nome_fantasia,
          message: 'Parabéns, seu cadastro foi Aprovado! Como este é seu primeiro acesso, cadastre sua senha usando seu protocolo.'
        });
      }

      if (!inputPassword) {
        return res.status(400).json({ error: 'Informe sua senha de acesso.' });
      }

      const isMatch = bcrypt.compareSync(inputPassword, sol.senha_hash);
      if (!isMatch) {
        return res.status(401).json({
          error: 'Senha incorreta. Caso tenha esquecido, você pode redefinir usando seu número de protocolo.'
        });
      }
    }

    sol.ultimo_login = new Date().toISOString();
    saveStore(store);
    await persistSolicitacao(sol).catch((e) => console.error('Falha ao registrar último login:', e.message));

    const token = jwt.sign(
      {
        id: sol.id,
        scope: 'cliente',
        protocolo: sol.protocolo,
        cnpj: sol.cnpj,
        razao_social: sol.razao_social,
        nome_fantasia: sol.nome_fantasia,
        nome_responsavel: sol.nome_responsavel,
        email: sol.email
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      token,
      cliente: sanitizeClienteData(sol)
    });
  }

  if (pathname === 'cliente/primeiro-acesso' && method === 'POST') {
    const body = await parseRequestBody(req);
    const { cnpj, identifier, protocolo, nova_senha, senha } = body || {};
    const rawCnpj = (cnpj || identifier || '').toString().trim();
    const cleanCnpjDigits = rawCnpj.replace(/\D/g, '');
    const cleanProtocolo = (protocolo || '').toString().trim().toUpperCase();
    const newPass = nova_senha || senha;

    if (!cleanCnpjDigits || !cleanProtocolo) {
      return res.status(400).json({ error: 'CNPJ e Protocolo são obrigatórios para validar sua identidade.' });
    }

    if (!newPass || newPass.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
    }

    const sol = store.solicitacoes.find((s) => {
      const sCnpjDigits = (s.cnpj || '').replace(/\D/g, '');
      const sProto = (s.protocolo || '').toUpperCase().trim();
      return sCnpjDigits === cleanCnpjDigits && sProto === cleanProtocolo;
    });

    if (!sol) {
      return res.status(404).json({ error: 'Nenhum cadastro encontrado com este CNPJ e Protocolo.' });
    }

    if (sol.status !== 'Aprovado') {
      return res.status(403).json({
        error: 'Apenas cadastros aprovados podem criar senha de acesso ao portal.',
        status: sol.status
      });
    }

    const salt = bcrypt.genSaltSync(10);
    sol.senha_hash = bcrypt.hashSync(newPass, salt);
    sol.ultimo_login = new Date().toISOString();
    sol.atualizado_em = new Date().toISOString();
    saveStore(store);
    if (!await persistSolicitacaoOrRespond(res, sol)) return;

    const token = jwt.sign(
      {
        id: sol.id,
        scope: 'cliente',
        protocolo: sol.protocolo,
        cnpj: sol.cnpj,
        razao_social: sol.razao_social,
        nome_fantasia: sol.nome_fantasia,
        nome_responsavel: sol.nome_responsavel,
        email: sol.email
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Senha cadastrada com sucesso! Bem-vindo ao Portal do Parceiro.',
      token,
      cliente: sanitizeClienteData(sol)
    });
  }

  if (pathname === 'cliente/me' && method === 'GET') {
    const cliente = verifyClienteAuth(req);
    if (!cliente) return res.status(401).json({ error: 'Sessão expirada ou não autorizada.' });

    const sol = store.solicitacoes.find((s) => s.id === cliente.id);
    if (!sol) return res.status(404).json({ error: 'Ponto de coleta não encontrado.' });
    if (sol.status !== 'Aprovado') {
      return res.status(403).json({ error: 'Cadastro não mais homologado.', status: sol.status });
    }

    return res.status(200).json({ cliente: sanitizeClienteData(sol) });
  }

  if (pathname === 'cliente/alterar-senha' && method === 'POST') {
    const cliente = verifyClienteAuth(req);
    if (!cliente) return res.status(401).json({ error: 'Sessão expirada ou não autorizada.' });

    const body = await parseRequestBody(req);
    const { senha_atual, nova_senha } = body || {};

    if (!nova_senha || nova_senha.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
    }

    const sol = store.solicitacoes.find((s) => s.id === cliente.id);
    if (!sol) return res.status(404).json({ error: 'Cadastro não encontrado.' });

    if (sol.senha_hash) {
      if (!senha_atual) return res.status(400).json({ error: 'Informe a senha atual.' });
      if (!bcrypt.compareSync(senha_atual, sol.senha_hash)) {
        return res.status(401).json({ error: 'Senha atual incorreta.' });
      }
    }

    const salt = bcrypt.genSaltSync(10);
    sol.senha_hash = bcrypt.hashSync(nova_senha, salt);
    sol.atualizado_em = new Date().toISOString();
    saveStore(store);
    if (!await persistSolicitacaoOrRespond(res, sol)) return;

    return res.status(200).json({ success: true, message: 'Senha alterada com sucesso!' });
  }

  if (pathname === 'cliente/logout' && method === 'POST') {
    const authHeader = req.headers['authorization'] || '';
    if (authHeader.startsWith('Bearer ')) {
      revokeToken(authHeader.slice(7).trim());
    }
    return res.status(200).json({ success: true, message: 'Sessão do parceiro encerrada com sucesso.' });
  }

  // Rota desconhecida
  return res.status(404).json({ error: `Endpoint não encontrado: ${pathname}` });
}
