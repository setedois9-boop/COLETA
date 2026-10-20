import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.COLETA_DATABASE_PATH
  ? path.resolve(process.env.COLETA_DATABASE_PATH)
  : path.join(dataDir, 'database.sqlite');
if (process.env.COLETA_DATABASE_PATH) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}
const db = new Database(dbPath);

// Enable WAL mode and foreign keys for high performance and integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  // 1. Tabela solicitacoes
  db.exec(`
    CREATE TABLE IF NOT EXISTS solicitacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      protocolo TEXT UNIQUE NOT NULL,
      cnpj TEXT NOT NULL,
      razao_social TEXT NOT NULL,
      nome_fantasia TEXT NOT NULL,
      tipo_comercio TEXT NOT NULL,
      tipo_comercio_outro TEXT,
      cep TEXT NOT NULL,
      estado TEXT NOT NULL,
      cidade TEXT NOT NULL,
      bairro TEXT NOT NULL,
      rua TEXT NOT NULL,
      numero TEXT NOT NULL,
      complemento TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      dias_funcionamento TEXT NOT NULL,
      horarios_funcionamento TEXT NOT NULL,
      fecha_almoco INTEGER NOT NULL DEFAULT 0,
      horario_almoco_inicio TEXT,
      horario_almoco_fim TEXT,
      estacionamento TEXT NOT NULL,
      quantidade_colaboradores TEXT NOT NULL,
      experiencia_logistica TEXT NOT NULL,
      servicos_desejados TEXT NOT NULL,
      nome_responsavel TEXT NOT NULL,
      telefone TEXT NOT NULL,
      email TEXT NOT NULL,
      banco_1 TEXT,
      agencia_1 TEXT,
      conta_1 TEXT,
      tipo_conta_1 TEXT,
      pix_1 TEXT,
      banco_2 TEXT,
      agencia_2 TEXT,
      conta_2 TEXT,
      tipo_conta_2 TEXT,
      pix_2 TEXT,
      origem_cadastro TEXT NOT NULL,
      origem_outro TEXT,
      status TEXT NOT NULL DEFAULT 'Recebido',
      observacoes_internas TEXT,
      senha_hash TEXT,
      ultimo_login TEXT,
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_solicitacoes_protocolo ON solicitacoes(protocolo);
    CREATE INDEX IF NOT EXISTS idx_solicitacoes_cnpj ON solicitacoes(cnpj);
    CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON solicitacoes(status);
    CREATE INDEX IF NOT EXISTS idx_solicitacoes_cidade ON solicitacoes(cidade);
    CREATE INDEX IF NOT EXISTS idx_solicitacoes_estado ON solicitacoes(estado);
    CREATE INDEX IF NOT EXISTS idx_solicitacoes_criado_em ON solicitacoes(criado_em);
  `);

  // 2. Tabela arquivos_solicitacao
  db.exec(`
    CREATE TABLE IF NOT EXISTS arquivos_solicitacao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      solicitacao_id INTEGER NOT NULL,
      tipo_imagem TEXT NOT NULL,
      caminho_arquivo TEXT NOT NULL,
      nome_original TEXT,
      tamanho_bytes INTEGER,
      mime_type TEXT,
      criado_em TEXT NOT NULL,
      FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_arquivos_solicitacao ON arquivos_solicitacao(solicitacao_id);
  `);

  // 3. Tabela historico_status
  db.exec(`
    CREATE TABLE IF NOT EXISTS historico_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      solicitacao_id INTEGER NOT NULL,
      status_anterior TEXT,
      status_novo TEXT NOT NULL,
      administrador_id TEXT,
      observacao TEXT,
      criado_em TEXT NOT NULL,
      FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_historico_solicitacao ON historico_status(solicitacao_id);
  `);

  // 4. Tabela configuracoes_site
  db.exec(`
    CREATE TABLE IF NOT EXISTS configuracoes_site (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );
  `);

  // 5. Tabela administradores
  db.exec(`
    CREATE TABLE IF NOT EXISTS administradores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      permissao TEXT DEFAULT 'admin',
      criado_em TEXT NOT NULL,
      two_factor_secret TEXT,
      two_factor_enabled INTEGER DEFAULT 0,
      two_factor_temp_secret TEXT,
      token_version INTEGER DEFAULT 1,
      last_totp_step INTEGER
    );
  `);

  // Migration segura para tabelas existentes
  const adminCols = db.prepare("PRAGMA table_info(administradores)").all();
  if (!adminCols.some(col => col.name === 'two_factor_secret')) {
    try {
      db.exec(`ALTER TABLE administradores ADD COLUMN two_factor_secret TEXT;`);
    } catch {}
  }
  if (!adminCols.some(col => col.name === 'two_factor_enabled')) {
    try {
      db.exec(`ALTER TABLE administradores ADD COLUMN two_factor_enabled INTEGER DEFAULT 0;`);
    } catch {}
  }
  if (!adminCols.some(col => col.name === 'two_factor_temp_secret')) {
    try {
      db.exec(`ALTER TABLE administradores ADD COLUMN two_factor_temp_secret TEXT;`);
    } catch {}
  }
  if (!adminCols.some(col => col.name === 'token_version')) {
    try {
      db.exec(`ALTER TABLE administradores ADD COLUMN token_version INTEGER DEFAULT 1;`);
    } catch {}
  }
  if (!adminCols.some(col => col.name === 'last_totp_code')) {
    try {
      db.exec(`ALTER TABLE administradores ADD COLUMN last_totp_code TEXT;`);
    } catch {}
  }
  if (!adminCols.some(col => col.name === 'last_totp_time')) {
    try {
      db.exec(`ALTER TABLE administradores ADD COLUMN last_totp_time INTEGER;`);
    } catch {}
  }
  if (!adminCols.some(col => col.name === 'last_totp_step')) {
    db.exec('ALTER TABLE administradores ADD COLUMN last_totp_step INTEGER;');
  }

  db.exec(`
    UPDATE administradores
    SET last_totp_step = CAST(last_totp_time / 30000 AS INTEGER)
    WHERE last_totp_step IS NULL
      AND last_totp_time >= 1000000000000;
  `);

  // Migration segura para tabela solicitacoes (acesso de clientes homologados)
  const solCols = db.prepare("PRAGMA table_info(solicitacoes)").all();
  if (!solCols.some(col => col.name === 'senha_hash')) {
    try {
      db.exec(`ALTER TABLE solicitacoes ADD COLUMN senha_hash TEXT;`);
    } catch {}
  }
  if (!solCols.some(col => col.name === 'ultimo_login')) {
    try {
      db.exec(`ALTER TABLE solicitacoes ADD COLUMN ultimo_login TEXT;`);
    } catch {}
  }

  // Seed default admin if none exists
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@pontodecoleta.com.br').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@2026';
  const existingAdmin = db.prepare('SELECT id, email FROM administradores WHERE email = ?').get(adminEmail);
  if (!existingAdmin) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(adminPassword, salt);
    db.prepare(`
      INSERT INTO administradores (nome, email, senha_hash, permissao, criado_em)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'Administrador Geral',
      adminEmail,
      hash,
      'superadmin',
      new Date().toISOString()
    );
    console.log(`Admin inicial configurado com sucesso: ${adminEmail}`);
  }

  // Seed default site settings if none exist
  const configCount = db.prepare('SELECT count(*) as count FROM configuracoes_site').get();
  if (configCount.count === 0) {
    const defaultConfigs = {
      nome_site: 'Rede Logística Parceira',
      titulo_hero: 'Transforme seu estabelecimento em um Ponto de Coleta de Encomendas',
      subtitulo_hero: 'Gere renda extra de R$ 2,50 a R$ 5,00 por pacote entregue, atraia um fluxo diário de novos clientes para o seu comércio e aumente sua visibilidade sem necessidade de estoque.',
      cor_primaria: '#EE4D2D',
      cor_secundaria: '#0F172A',
      whatsapp_numero: '5511999998888',
      whatsapp_mensagem: 'Olá! Acabei de enviar uma solicitação para cadastrar meu estabelecimento como ponto de coleta.\n\nProtocolo: [PROTOCOLO]\nEstabelecimento: [NOME FANTASIA]\n\nGostaria de receber orientações sobre as próximas etapas.',
      coleta_bancaria_obrigatoria: true,
      coleta_bancaria_ativa: true,
      limite_upload_mb: 10,
      retencao_dias: 365,
      aviso_independencia: 'Aviso importante: Este portal é uma plataforma independente de captação e análise de interesse de estabelecimentos comerciais para potenciais pontos de coleta e logística parceira de e-commerce. As solicitações são submetidas à análise de demanda territorial e critérios de conformidade da rede.',
      beneficios: [
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
      ],
      como_funciona: [
        {
          etapa: 1,
          titulo: 'Preencha os dados da loja',
          descricao: 'Informe CNPJ, dados comerciais, localização e horários de funcionamento do seu estabelecimento.'
        },
        {
          etapa: 2,
          titulo: 'Envie as fotos e informações',
          descricao: 'Envie duas fotos simples e nítidas: a fachada frontal e o espaço interno reservado para pacotes.'
        },
        {
          etapa: 3,
          titulo: 'Revise e envie a solicitação',
          descricao: 'Confira o resumo completo dos dados informados e confirme a submissão para gerar seu protocolo.'
        },
        {
          etapa: 4,
          titulo: 'Contato com o atendimento',
          descricao: 'Receba orientações via WhatsApp da nossa equipe e acompanhe as próximas etapas do processo.'
        }
      ],
      requisitos: [
        'CNPJ ativo e dados cadastrais da empresa regulares',
        'Nome fantasia condizente com a fachada comercial',
        'Fotos horizontais, nítidas da fachada e da área interna',
        'Endereço comercial com fácil acesso a transportadores',
        'Horários regulares de funcionamento comercial',
        'Espaço seguro e seco para armazenamento de pacotes',
        'Dados de contato atualizados do responsável pela loja'
      ],
      perguntas_frequentes: [
        {
          pergunta: 'Quem pode solicitar o cadastro?',
          resposta: 'Qualquer estabelecimento comercial com CNPJ ativo, ponto fixo de atendimento ao público e espaço físico disponível para armazenamento temporário e seguro de pacotes.'
        },
        {
          pergunta: 'Preciso ter CNPJ?',
          resposta: 'Sim. É necessário possuir CNPJ regular (pode ser MEI, ME, EPP ou demais modalidades) para emissão de notas ou contratos de prestação de serviços logísticos.'
        },
        {
          pergunta: 'Quais fotos devo enviar?',
          resposta: 'Você deve enviar duas imagens tiradas na horizontal: uma da fachada externa frontal completa da loja e uma da área interna onde os pacotes poderão ficar armazenados com segurança.'
        },
        {
          pergunta: 'Como funciona a análise?',
          resposta: 'Nossa equipe analisa a localização geográfica, demanda regional de encomendas, horários de funcionamento e a viabilidade do espaço para inclusão na rota logística.'
        },
        {
          pergunta: 'O cadastro garante aprovação?',
          resposta: 'Não. O envio do formulário representa uma manifestação formal de interesse. A aprovação final depende da demanda da região, capacidade operacional e conformidade com as diretrizes do programa.'
        },
        {
          pergunta: 'Como entro em contato com o atendimento?',
          resposta: 'Após submeter o formulário com sucesso, você terá acesso imediato ao botão oficial de atendimento via WhatsApp já preenchido com seu número de protocolo para obter informações.'
        }
      ],
      tipos_comercio: [
        'Mercearia ou minimercado',
        'Loja de conveniência',
        'Papelaria',
        'Loja de roupas',
        'Loja de eletrônicos',
        'Assistência técnica',
        'Outros'
      ],
      servicos_disponiveis: [
        'Receber pacotes de vendedores da Shopee',
        'Entregar pacotes a compradores da Shopee',
        'Realizar entregas a domicílio de pacotes da Shopee em áreas próximas da loja'
      ]
    };

    const insertConfig = db.prepare('INSERT INTO configuracoes_site (chave, valor) VALUES (?, ?)');
    for (const [chave, valor] of Object.entries(defaultConfigs)) {
      insertConfig.run(chave, JSON.stringify(valor));
    }
  }
}

export default db;
