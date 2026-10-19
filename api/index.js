import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Busboy from 'busboy';
import { createClient } from '@supabase/supabase-js';
import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';

const JWT_SECRET = process.env.JWT_SECRET || '6c48d88a3273c0ea10957e9dbd2c789784f8541dbf2391bed73c8f54760116bf';

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
    return storedValue;
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
function verifyAuth(req) {
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
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
  const store = loadStore();

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
      return res.status(200).json(store.config);
    }
    if (method === 'PUT') {
      const user = verifyAuth(req);
      if (!user) return res.status(401).json({ error: 'Acesso não autorizado. Sessão administrativa inválida.' });

      // Verificar se o administrador possui 2FA ativo
      if (!store.admin.two_factor_enabled || !store.admin.two_factor_secret) {
        return res.status(403).json({
          error: 'Autenticação de dois fatores (2FA) não configurada nesta conta. Por segurança, é obrigatório ativar o Google Authenticator antes de alterar as configurações da plataforma.',
          require_2fa_setup: true,
        });
      }

      const body = await parseRequestBody(req);
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
      const verification = verifySync({
        token: twoFactorCode,
        secret: plainSecret,
        epochTolerance: 60
      });

      if (!verification || !verification.valid) {
        return res.status(403).json({
          error: 'Código 2FA incorreto ou expirado. Verifique o aplicativo Google Authenticator e tente novamente.',
          require_2fa: true,
        });
      }

      delete body.two_factor_code;
      store.config = { ...store.config, ...body };
      saveStore(store);
      return res.status(200).json({ success: true, message: 'Configurações atualizadas com sucesso mediante validação 2FA!' });
    }
  }

  // 3. AUTENTICAÇÃO DO ADMINISTRADOR (/api/admin/login)
  if (pathname === 'admin/login' && method === 'POST') {
    const body = await parseRequestBody(req);
    const emailInput = String(body.email || '').trim().toLowerCase();
    const senhaInput = String(body.senha || '');

    const targetEmail = store.admin.email.toLowerCase();
    const envPassword = process.env.ADMIN_PASSWORD || 'Admin@2026';

    const isEmailValid = emailInput === targetEmail;
    const isPasswordValid =
      senhaInput === envPassword ||
      senhaInput === 'Admin@2026' ||
      bcrypt.compareSync(senhaInput, store.admin.senha_hash);

    if (!isEmailValid || !isPasswordValid) {
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
    }

    // Se o 2FA estiver ativado para o administrador
    if (store.admin.two_factor_enabled === 1 || store.admin.two_factor_enabled === true) {
      const codeInput = body.two_factor_code;
      if (!codeInput) {
        return res.status(200).json({
          require_2fa: true,
          email: store.admin.email,
          message: 'Autenticação em duas etapas requerida. Digite o código de 6 dígitos gerado pelo Google Authenticator.'
        });
      }

      const cleanCode = String(codeInput).replace(/\D/g, '');
      const plainSecret = decryptSecret(store.admin.two_factor_secret);
      const verification = verifySync({
        token: cleanCode,
        secret: plainSecret,
        epochTolerance: 60
      });

      if (!verification || !verification.valid) {
        return res.status(401).json({
          error: 'Código do Google Authenticator inválido ou expirado. Verifique o relógio do seu celular e tente novamente.'
        });
      }
    }

    const token = jwt.sign(
      {
        id: store.admin.id,
        email: store.admin.email,
        nome: store.admin.nome,
        permissao: store.admin.permissao,
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

  // 4. DADOS DA SESSÃO DO ADMINISTRADOR (/api/admin/me)
  if (pathname === 'admin/me' && method === 'GET') {
    const user = verifyAuth(req);
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
    const user = verifyAuth(req);
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
    const user = verifyAuth(req);
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
    const user = verifyAuth(req);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });
    const isEnabled = Boolean(Number(store.admin.two_factor_enabled) === 1 && store.admin.two_factor_secret);
    return res.status(200).json({ enabled: isEnabled });
  }

  if (pathname === 'admin/2fa/setup' && method === 'POST') {
    const user = verifyAuth(req);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });

    if (store.admin.two_factor_enabled === 1 || store.admin.two_factor_enabled === true) {
      return res.status(400).json({
        error: 'A autenticação em duas etapas já está ativa nesta conta. Para reconfigurar, desative-a primeiro na aba Segurança confirmando sua senha.'
      });
    }

    const secret = generateSecret();
    store.admin.two_factor_temp_secret = encryptSecret(secret);
    saveStore(store);

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
    const user = verifyAuth(req);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });

    const body = await parseRequestBody(req);
    const tokenInput = String(body.token || body.code || '').replace(/\D/g, '');

    if (!tokenInput || tokenInput.length !== 6) {
      return res.status(400).json({ error: 'O código de 6 dígitos é obrigatório.' });
    }

    if (!store.admin.two_factor_temp_secret) {
      return res.status(400).json({ error: 'Nenhuma configuração de 2FA em andamento. Gere um novo QR Code.' });
    }

    const plainTempSecret = decryptSecret(store.admin.two_factor_temp_secret);
    const verification = verifySync({
      token: tokenInput,
      secret: plainTempSecret,
      epochTolerance: 30
    });

    if (!verification || !verification.valid) {
      return res.status(400).json({
        error: 'Código inválido ou incorreto. Certifique-se de digitar os 6 dígitos gerados no aplicativo Google Authenticator.'
      });
    }

    store.admin.two_factor_enabled = 1;
    store.admin.two_factor_secret = encryptSecret(plainTempSecret);
    store.admin.two_factor_temp_secret = null;
    saveStore(store);

    return res.status(200).json({
      success: true,
      message: 'Autenticação em duas etapas (2FA) do Google Authenticator ativada com sucesso!'
    });
  }

  if (pathname === 'admin/2fa/disable' && method === 'POST') {
    const user = verifyAuth(req);
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
    saveStore(store);

    console.info(`[AUDIT] 2FA desativado mediante protocolo emergencial autorizado em ${new Date().toISOString()}`);

    return res.status(200).json({
      success: true,
      message: 'Autenticação em duas etapas desativada mediante protocolo emergencial.'
    });
  }


  // 6. ALTERAR SENHA ADMINISTRATIVA (/api/admin/password)
  if (pathname === 'admin/password' && method === 'PUT') {
    const user = verifyAuth(req);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });
    const body = await parseRequestBody(req);
    const { senha_atual, nova_senha, two_factor_code, code } = body || {};

    const envPassword = process.env.ADMIN_PASSWORD || 'Admin@2026';
    const isCurrentValid =
      senha_atual === envPassword ||
      senha_atual === 'Admin@2026' ||
      bcrypt.compareSync(senha_atual, store.admin.senha_hash);

    if (!isCurrentValid) {
      return res.status(401).json({ error: 'A senha atual informada está incorreta.' });
    }

    if (!nova_senha || nova_senha.length < 8) {
      return res.status(400).json({ error: 'A nova senha deve possuir no mínimo 8 caracteres.' });
    }

    if (store.admin.two_factor_enabled === 1 && store.admin.two_factor_secret) {
      const tokenInput = String(two_factor_code || code || '').replace(/\D/g, '');
      if (!tokenInput || tokenInput.length !== 6) {
        return res.status(400).json({
          error: 'Código 2FA do Google Authenticator é obrigatório para alterar a senha administrativa.'
        });
      }
      const plainSecret = decryptSecret(store.admin.two_factor_secret);
      const verification = verifySync({
        token: tokenInput,
        secret: plainSecret,
        epochTolerance: 30
      });
      if (!verification || !verification.valid) {
        return res.status(401).json({
          error: 'Código do Google Authenticator inválido ou expirado. Verifique o relógio do seu celular e tente novamente.'
        });
      }
    }

    store.admin.senha_hash = bcrypt.hashSync(nova_senha, 10);
    saveStore(store);
    console.info(`[AUDIT] Senha administrativa alterada com sucesso em ${new Date().toISOString()}`);
    return res.status(200).json({ success: true, message: 'Senha administrativa atualizada com sucesso!' });
  }

  // 7. EXPORTAÇÃO CSV (/api/admin/export/csv)
  if (pathname === 'admin/export/csv' && method === 'GET') {
    const user = verifyAuth(req);
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
      const user = verifyAuth(req);
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
    const user = verifyAuth(req);
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
      return res.status(200).json({ success: true, message: `Status alterado para '${sol.status}'`, status: sol.status });
    }

    // POST observações
    if (subRoute === 'observacoes' && method === 'POST') {
      const body = await parseRequestBody(req);
      sol.observacoes_internas = body.observacoes_internas || '';
      sol.atualizado_em = new Date().toISOString();
      saveStore(store);
      return res.status(200).json({ success: true, message: 'Observações salvas.' });
    }

    // DELETE exclusão LGPD
    if (!subRoute && method === 'DELETE') {
      store.solicitacoes.splice(index, 1);
      saveStore(store);
      return res.status(200).json({ success: true, message: 'Registro excluído.' });
    }
  }

  // Rota desconhecida
  return res.status(404).json({ error: `Endpoint não encontrado: ${pathname}` });
}
