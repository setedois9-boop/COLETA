import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import { validarCNPJ } from '../utils/cnpjValidator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuração do Multer com validação de tipo e tamanho
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Formato de arquivo inválido. Permitido apenas JPG, JPEG, PNG e WEBP.'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter
});

const router = Router();

// Função para gerar número de protocolo único e legível
function gerarProtocolo() {
  const ano = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `PDC-${ano}-${codigo}`;
}

// POST /api/solicitacoes - Envio público de nova candidatura (Multipart/form-data)
router.post(
  '/',
  upload.fields([
    { name: 'foto_fachada', maxCount: 1 },
    { name: 'foto_interior', maxCount: 1 }
  ]),
  (req, res) => {
    try {
      const body = req.body;

      // 1. Validação de CNPJ
      if (!body.cnpj || !validarCNPJ(body.cnpj)) {
        return res.status(400).json({ error: 'CNPJ inválido. Verifique os números informados.' });
      }

      // 2. Validação dos campos obrigatórios da Loja
      if (!body.razao_social || !body.nome_fantasia || !body.tipo_comercio) {
        return res.status(400).json({ error: 'Campos obrigatórios da etapa 1 não foram preenchidos.' });
      }

      // 3. Validação das fotos obrigatórias
      const fachadaFile = req.files && req.files['foto_fachada'] ? req.files['foto_fachada'][0] : null;
      const interiorFile = req.files && req.files['foto_interior'] ? req.files['foto_interior'][0] : null;

      // Se não vier por multipart file, verificar se veio caminho ou URL (ex: reenvio ou mock)
      const fachadaPath = fachadaFile ? `/uploads/${fachadaFile.filename}` : body.foto_fachada_url;
      const interiorPath = interiorFile ? `/uploads/${interiorFile.filename}` : body.foto_interior_url;

      if (!fachadaPath || !interiorPath) {
        return res.status(400).json({ error: 'As duas fotos (fachada e interior) são obrigatórias.' });
      }

      // 4. Validação de Endereço
      if (!body.cep || !body.estado || !body.cidade || !body.bairro || !body.rua || !body.numero) {
        return res.status(400).json({ error: 'Endereço incompleto. Preencha todos os campos obrigatórios.' });
      }

      // 5. Validação de Contato
      if (!body.nome_responsavel || !body.telefone || !body.email) {
        return res.status(400).json({ error: 'Dados de contato do responsável são obrigatórios.' });
      }

      // 6. Validação de Dados Bancários Obrigatórios (Mínimo dois bancos)
      if (!body.banco_1 || !body.agencia_1 || !body.conta_1 || !body.pix_1) {
        return res.status(400).json({ error: 'Os dados da Conta Bancária 1 são obrigatórios (Banco, Agência, Conta com Dígito e Chave Pix).' });
      }
      if (!body.banco_2 || !body.agencia_2 || !body.conta_2 || !body.pix_2) {
        return res.status(400).json({ error: 'É obrigatório informar no mínimo dois bancos. Por favor, preencha todos os dados da Conta Bancária 2 (Banco, Agência, Conta com Dígito e Chave Pix).' });
      }

      // Previne duplicação acidental (mesmo CNPJ nos últimos 2 minutos)
      const cnpjLimpo = String(body.cnpj).replace(/\D/g, '');
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const existingRecent = db.prepare(`
        SELECT id, protocolo FROM solicitacoes 
        WHERE replace(replace(replace(replace(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?
        AND criado_em > ?
      `).get(cnpjLimpo, twoMinutesAgo);

      if (existingRecent) {
        return res.status(429).json({
          error: 'Uma solicitação recente para este CNPJ já foi recebida. Aguarde alguns instantes.',
          protocolo: existingRecent.protocolo
        });
      }

      // Gera protocolo único
      let protocolo = gerarProtocolo();
      while (db.prepare('SELECT id FROM solicitacoes WHERE protocolo = ?').get(protocolo)) {
        protocolo = gerarProtocolo();
      }

      const agora = new Date().toISOString();

      // Serialização segura de campos de lista ou objeto
      const diasFuncionamento = typeof body.dias_funcionamento === 'object' ? JSON.stringify(body.dias_funcionamento) : String(body.dias_funcionamento || '[]');
      const horariosFuncionamento = typeof body.horarios_funcionamento === 'object' ? JSON.stringify(body.horarios_funcionamento) : String(body.horarios_funcionamento || '{}');
      const servicosDesejados = typeof body.servicos_desejados === 'object' ? JSON.stringify(body.servicos_desejados) : String(body.servicos_desejados || '[]');

      const insertStmt = db.prepare(`
        INSERT INTO solicitacoes (
          protocolo, cnpj, razao_social, nome_fantasia, tipo_comercio, tipo_comercio_outro,
          cep, estado, cidade, bairro, rua, numero, complemento,
          latitude, longitude, dias_funcionamento, horarios_funcionamento,
          fecha_almoco, horario_almoco_inicio, horario_almoco_fim,
          estacionamento, quantidade_colaboradores, experiencia_logistica, servicos_desejados,
          nome_responsavel, telefone, email,
          banco_1, agencia_1, conta_1, tipo_conta_1, pix_1,
          banco_2, agencia_2, conta_2, tipo_conta_2, pix_2,
          origem_cadastro, origem_outro, status, observacoes_internas, criado_em, atualizado_em
        ) VALUES (
          @protocolo, @cnpj, @razao_social, @nome_fantasia, @tipo_comercio, @tipo_comercio_outro,
          @cep, @estado, @cidade, @bairro, @rua, @numero, @complemento,
          @latitude, @longitude, @dias_funcionamento, @horarios_funcionamento,
          @fecha_almoco, @horario_almoco_inicio, @horario_almoco_fim,
          @estacionamento, @quantidade_colaboradores, @experiencia_logistica, @servicos_desejados,
          @nome_responsavel, @telefone, @email,
          @banco_1, @agencia_1, @conta_1, @tipo_conta_1, @pix_1,
          @banco_2, @agencia_2, @conta_2, @tipo_conta_2, @pix_2,
          @origem_cadastro, @origem_outro, 'Recebido', NULL, @criado_em, @atualizado_em
        )
      `);

      let solicitacaoId;

      const runTransaction = db.transaction(() => {
        const info = insertStmt.run({
          protocolo,
          cnpj: body.cnpj,
          razao_social: body.razao_social,
          nome_fantasia: body.nome_fantasia,
          tipo_comercio: body.tipo_comercio,
          tipo_comercio_outro: body.tipo_comercio_outro || null,
          cep: body.cep,
          estado: body.estado,
          cidade: body.cidade,
          bairro: body.bairro,
          rua: body.rua,
          numero: body.numero,
          complemento: body.complemento || null,
          latitude: parseFloat(body.latitude) || -23.55052,
          longitude: parseFloat(body.longitude) || -46.633308,
          dias_funcionamento: diasFuncionamento,
          horarios_funcionamento: horariosFuncionamento,
          fecha_almoco: body.fecha_almoco === true || body.fecha_almoco === 'true' || body.fecha_almoco === 1 ? 1 : 0,
          horario_almoco_inicio: body.horario_almoco_inicio || null,
          horario_almoco_fim: body.horario_almoco_fim || null,
          estacionamento: body.estacionamento || 'Não tem estacionamento',
          quantidade_colaboradores: body.quantidade_colaboradores || 'Não tem colaboradores',
          experiencia_logistica: body.experiencia_logistica || 'Não trabalhou ainda',
          servicos_desejados: servicosDesejados,
          nome_responsavel: body.nome_responsavel,
          telefone: body.telefone,
          email: body.email,
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
          origem_cadastro: body.origem_cadastro || 'Outro',
          origem_outro: body.origem_outro || null,
          criado_em: agora,
          atualizado_em: agora
        });

        solicitacaoId = info.lastInsertRowid;

        // Registrar arquivos
        const insertArquivo = db.prepare(`
          INSERT INTO arquivos_solicitacao (solicitacao_id, tipo_imagem, caminho_arquivo, nome_original, tamanho_bytes, mime_type, criado_em)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        insertArquivo.run(
          solicitacaoId,
          'fachada',
          fachadaPath,
          fachadaFile ? fachadaFile.originalname : 'fachada.jpg',
          fachadaFile ? fachadaFile.size : null,
          fachadaFile ? fachadaFile.mimetype : 'image/jpeg',
          agora
        );

        insertArquivo.run(
          solicitacaoId,
          'interior',
          interiorPath,
          interiorFile ? interiorFile.originalname : 'interior.jpg',
          interiorFile ? interiorFile.size : null,
          interiorFile ? interiorFile.mimetype : 'image/jpeg',
          agora
        );

        // Registrar histórico de status inicial
        const insertHistorico = db.prepare(`
          INSERT INTO historico_status (solicitacao_id, status_anterior, status_novo, administrador_id, observacao, criado_em)
          VALUES (?, NULL, 'Recebido', 'Sistema', 'Candidatura submetida pelo formulário público', ?)
        `);

        insertHistorico.run(solicitacaoId, agora);
      });

      runTransaction();

      res.status(201).json({
        success: true,
        protocolo,
        id: solicitacaoId,
        nome_fantasia: body.nome_fantasia,
        criado_em: agora
      });
    } catch (error) {
      console.error('Erro ao cadastrar solicitação:', error);
      res.status(500).json({ error: 'Falha ao processar solicitação: ' + error.message });
    }
  }
);

// GET /api/solicitacoes - Listagem com filtros e paginação no servidor (Admin)
router.get('/', authenticateToken, (req, res) => {
  try {
    const {
      q,
      status,
      estado,
      cidade,
      data_inicio,
      data_fim,
      page = 1,
      limit = 10,
      sort_by = 'criado_em',
      sort_order = 'DESC'
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (parsedPage - 1) * parsedLimit;

    const conditions = [];
    const params = [];

    if (q) {
      const searchParam = `%${q.trim()}%`;
      conditions.push(`(
        protocolo LIKE ? OR
        nome_fantasia LIKE ? OR
        razao_social LIKE ? OR
        cnpj LIKE ? OR
        telefone LIKE ? OR
        email LIKE ? OR
        cidade LIKE ?
      )`);
      for (let i = 0; i < 7; i++) params.push(searchParam);
    }

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (estado) {
      conditions.push('estado = ?');
      params.push(estado);
    }

    if (cidade) {
      conditions.push('cidade LIKE ?');
      params.push(`%${cidade}%`);
    }

    if (data_inicio) {
      conditions.push('criado_em >= ?');
      params.push(data_inicio);
    }

    if (data_fim) {
      conditions.push('criado_em <= ?');
      params.push(data_fim + 'T23:59:59.999Z');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Contagem total
    const countQuery = `SELECT COUNT(*) as total FROM solicitacoes ${whereClause}`;
    const totalCount = db.prepare(countQuery).get(...params).total;

    // Colunas de ordenação permitidas
    const allowedSortCols = ['id', 'protocolo', 'nome_fantasia', 'cidade', 'estado', 'status', 'criado_em'];
    const orderCol = allowedSortCols.includes(sort_by) ? sort_by : 'criado_em';
    const orderDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Seleção de dados (sem expor dados bancários na listagem)
    const selectQuery = `
      SELECT 
        id, protocolo, cnpj, razao_social, nome_fantasia, tipo_comercio,
        cep, estado, cidade, bairro, rua, numero,
        nome_responsavel, telefone, email,
        status, criado_em, atualizado_em
      FROM solicitacoes
      ${whereClause}
      ORDER BY ${orderCol} ${orderDirection}
      LIMIT ? OFFSET ?
    `;

    const records = db.prepare(selectQuery).all(...params, parsedLimit, offset);

    res.json({
      data: records,
      total: totalCount,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(totalCount / parsedLimit)
    });
  } catch (error) {
    console.error('Erro ao listar solicitações:', error);
    res.status(500).json({ error: 'Erro ao buscar solicitações' });
  }
});

// GET /api/solicitacoes/:id - Detalhes completos da solicitação
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { reveal_financial } = req.query;

    const solicitacao = db.prepare('SELECT * FROM solicitacoes WHERE id = ?').get(id);

    if (!solicitacao) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    // Buscar fotos associadas
    const arquivos = db.prepare('SELECT * FROM arquivos_solicitacao WHERE solicitacao_id = ?').all(id);

    // Buscar histórico de alterações de status
    const historico = db.prepare(`
      SELECT * FROM historico_status 
      WHERE solicitacao_id = ? 
      ORDER BY criado_em DESC
    `).all(id);

    // Parsing de campos JSON armazenados
    let diasFuncionamento = [];
    let horariosFuncionamento = {};
    let servicosDesejados = [];

    try { diasFuncionamento = JSON.parse(solicitacao.dias_funcionamento); } catch {}
    try { horariosFuncionamento = JSON.parse(solicitacao.horarios_funcionamento); } catch {}
    try { servicosDesejados = JSON.parse(solicitacao.servicos_desejados); } catch {}

    const resposta = {
      ...solicitacao,
      dias_funcionamento: diasFuncionamento,
      horarios_funcionamento: horariosFuncionamento,
      servicos_desejados: servicosDesejados,
      arquivos,
      historico
    };

    // Mascarar dados bancários por padrão para segurança, a menos que explicitamente solicitado pelo admin
    if (reveal_financial !== 'true') {
      if (resposta.pix_1) resposta.pix_1 = resposta.pix_1.slice(0, 3) + '••••' + resposta.pix_1.slice(-3);
      if (resposta.conta_1) resposta.conta_1 = '••••-' + resposta.conta_1.slice(-2);
      if (resposta.pix_2) resposta.pix_2 = resposta.pix_2.slice(0, 3) + '••••' + resposta.pix_2.slice(-3);
      if (resposta.conta_2) resposta.conta_2 = '••••-' + resposta.conta_2.slice(-2);
    }

    res.json(resposta);
  } catch (error) {
    console.error('Erro ao buscar detalhes da solicitação:', error);
    res.status(500).json({ error: 'Erro ao carregar detalhes' });
  }
});

// PATCH /api/solicitacoes/:id/status - Atualização de status com registro de auditoria
router.patch('/:id/status', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { status, observacao } = req.body;

    const allowedStatus = [
      'Recebido',
      'Em análise',
      'Aguardando contato',
      'Documentação pendente',
      'Aprovado',
      'Rejeitado'
    ];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ error: 'Status informado é inválido.' });
    }

    const solicitacao = db.prepare('SELECT id, status FROM solicitacoes WHERE id = ?').get(id);
    if (!solicitacao) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    const agora = new Date().toISOString();
    const adminNome = req.user ? (req.user.nome || req.user.email) : 'Administrador';

    const updateTx = db.transaction(() => {
      // 1. Atualizar status na solicitação
      db.prepare(`
        UPDATE solicitacoes 
        SET status = ?, atualizado_em = ?
        WHERE id = ?
      `).run(status, agora, id);

      // 2. Gravar no histórico de status
      db.prepare(`
        INSERT INTO historico_status (solicitacao_id, status_anterior, status_novo, administrador_id, observacao, criado_em)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        id,
        solicitacao.status,
        status,
        adminNome,
        observacao || 'Alteração manual de status',
        agora
      );
    });

    updateTx();

    res.json({
      success: true,
      message: `Status atualizado para '${status}' com sucesso.`,
      status,
      atualizado_em: agora
    });
  } catch (error) {
    console.error('Erro ao alterar status:', error);
    res.status(500).json({ error: 'Falha ao atualizar status' });
  }
});

// POST /api/solicitacoes/:id/observacoes - Atualizar anotação interna
router.post('/:id/observacoes', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { observacoes_internas } = req.body;

    const agora = new Date().toISOString();
    db.prepare(`
      UPDATE solicitacoes
      SET observacoes_internas = ?, atualizado_em = ?
      WHERE id = ?
    `).run(observacoes_internas || '', agora, id);

    res.json({ success: true, message: 'Observações internas salvas.' });
  } catch (error) {
    console.error('Erro ao salvar observação interna:', error);
    res.status(500).json({ error: 'Falha ao salvar observação' });
  }
});

// DELETE /api/solicitacoes/:id - Exclusão por LGPD / Privacidade
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM solicitacoes WHERE id = ?').run(id);
    res.json({ success: true, message: 'Registro excluído em conformidade com as diretrizes de privacidade.' });
  } catch (error) {
    console.error('Erro ao excluir solicitação:', error);
    res.status(500).json({ error: 'Falha ao excluir registro' });
  }
});

export default router;
