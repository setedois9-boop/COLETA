import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import db from '../database.js';
import { authenticateToken, generateToken } from '../middleware/auth.js';

const router = Router();

// POST /api/admin/login - Autenticação de administradores com suporte a 2FA do Google Authenticator
router.post('/login', (req, res) => {
  try {
    const { email, senha, two_factor_code } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const admin = db.prepare('SELECT * FROM administradores WHERE email = ?').get(email.trim().toLowerCase());
    if (!admin) {
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
    }

    const match = bcrypt.compareSync(senha, admin.senha_hash);
    if (!match) {
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
    }

    // Se o 2FA do Google Authenticator estiver ativado para esta conta
    if (admin.two_factor_enabled === 1) {
      if (!two_factor_code) {
        return res.json({
          require_2fa: true,
          email: admin.email,
          message: 'Autenticação em duas etapas requerida. Digite o código de 6 dígitos gerado pelo Google Authenticator.'
        });
      }

      const cleanCode = String(two_factor_code).replace(/\D/g, '');
      const verification = verifySync({
        token: cleanCode,
        secret: admin.two_factor_secret
      });

      if (!verification || !verification.valid) {
        return res.status(401).json({
          error: 'Código do Google Authenticator inválido ou expirado. Verifique o relógio do seu celular e tente novamente.'
        });
      }
    }

    const token = generateToken({
      id: admin.id,
      nome: admin.nome,
      email: admin.email,
      permissao: admin.permissao,
      two_factor_enabled: Boolean(admin.two_factor_enabled)
    });

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        nome: admin.nome,
        email: admin.email,
        permissao: admin.permissao,
        two_factor_enabled: Boolean(admin.two_factor_enabled)
      }
    });
  } catch (error) {
    console.error('Erro no login administrativo:', error);
    res.status(500).json({ error: 'Falha interna durante a autenticação.' });
  }
});

// GET /api/admin/me - Verificar sessão ativa
router.get('/me', authenticateToken, (req, res) => {
  const admin = db.prepare('SELECT id, nome, email, permissao, two_factor_enabled FROM administradores WHERE id = ?').get(req.user.id);
  if (!admin) {
    return res.status(404).json({ error: 'Administrador não encontrado.' });
  }
  res.json({
    admin: {
      ...admin,
      two_factor_enabled: Boolean(admin.two_factor_enabled)
    }
  });
});

// GET /api/admin/2fa/status - Status do 2FA do usuário logado
router.get('/2fa/status', authenticateToken, (req, res) => {
  try {
    const admin = db.prepare('SELECT two_factor_enabled FROM administradores WHERE id = ?').get(req.user.id);
    res.json({ enabled: Boolean(admin?.two_factor_enabled) });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao consultar status do 2FA.' });
  }
});

// POST /api/admin/2fa/setup - Iniciar configuração do Google Authenticator
router.post('/2fa/setup', authenticateToken, async (req, res) => {
  try {
    const secret = generateSecret();
    const admin = db.prepare('SELECT email FROM administradores WHERE id = ?').get(req.user.id);
    if (!admin) return res.status(404).json({ error: 'Administrador não encontrado.' });

    // Salvar segredo temporário enquanto o usuário escaneia e valida
    db.prepare('UPDATE administradores SET two_factor_temp_secret = ? WHERE id = ?').run(secret, req.user.id);

    const otpauthUrl = generateURI({
      issuer: 'Ponto de Coleta Admin',
      label: admin.email,
      secret
    });

    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      width: 260,
      margin: 2,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF'
      }
    });

    res.json({
      secret,
      qr_code: qrCodeDataUrl,
      otpauth_url: otpauthUrl
    });
  } catch (err) {
    console.error('Erro ao gerar setup 2FA:', err);
    res.status(500).json({ error: 'Erro ao gerar credenciais do Google Authenticator.' });
  }
});

// POST /api/admin/2fa/verify-and-enable - Confirmar primeiro código e ativar 2FA
router.post('/2fa/verify-and-enable', authenticateToken, (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'O código de 6 dígitos é obrigatório.' });
    }

    const admin = db.prepare('SELECT two_factor_temp_secret FROM administradores WHERE id = ?').get(req.user.id);
    if (!admin || !admin.two_factor_temp_secret) {
      return res.status(400).json({ error: 'Nenhuma configuração de 2FA em andamento. Gere um novo QR Code.' });
    }

    const cleanCode = String(token).replace(/\D/g, '');
    const verification = verifySync({
      token: cleanCode,
      secret: admin.two_factor_temp_secret
    });

    if (!verification || !verification.valid) {
      return res.status(400).json({
        error: 'Código inválido ou incorreto. Certifique-se de digitar os 6 dígitos gerados no aplicativo Google Authenticator.'
      });
    }

    // Ativar 2FA definitivamente
    db.prepare(`
      UPDATE administradores
      SET two_factor_secret = two_factor_temp_secret,
          two_factor_enabled = 1,
          two_factor_temp_secret = NULL
      WHERE id = ?
    `).run(req.user.id);

    res.json({
      success: true,
      message: 'Autenticação em duas etapas (2FA) do Google Authenticator ativada com sucesso!'
    });
  } catch (err) {
    console.error('Erro ao validar 2FA:', err);
    res.status(500).json({ error: 'Falha ao confirmar ativação do 2FA.' });
  }
});

// POST /api/admin/2fa/disable - Desativar 2FA com confirmação de senha
router.post('/2fa/disable', authenticateToken, (req, res) => {
  try {
    const { senha } = req.body;
    if (!senha) {
      return res.status(400).json({ error: 'Sua senha administrativa atual é necessária para desativar o 2FA.' });
    }

    const admin = db.prepare('SELECT senha_hash FROM administradores WHERE id = ?').get(req.user.id);
    if (!admin) return res.status(404).json({ error: 'Administrador não encontrado.' });

    const match = bcrypt.compareSync(senha, admin.senha_hash);
    if (!match) {
      return res.status(401).json({ error: 'Senha incorreta. Ação não autorizada.' });
    }

    db.prepare(`
      UPDATE administradores
      SET two_factor_enabled = 0,
          two_factor_secret = NULL,
          two_factor_temp_secret = NULL
      WHERE id = ?
    `).run(req.user.id);

    res.json({
      success: true,
      message: 'Autenticação em duas etapas desativada com sucesso.'
    });
  } catch (err) {
    console.error('Erro ao desativar 2FA:', err);
    res.status(500).json({ error: 'Falha ao desativar 2FA.' });
  }
});

// GET /api/admin/live-check - Verificação ultra-rápida de novos cadastros para polling
router.get('/live-check', authenticateToken, (req, res) => {
  try {
    const lastId = parseInt(req.query.last_id, 10) || 0;
    const novos = db.prepare(`
      SELECT id, protocolo, cnpj, nome_fantasia, razao_social, cidade, estado, status, telefone, criado_em
      FROM solicitacoes
      WHERE id > ?
      ORDER BY id ASC
    `).all(lastId);

    const total = db.prepare('SELECT COUNT(*) as count FROM solicitacoes').get().count;

    res.json({
      novos,
      total,
      hasNew: novos.length > 0
    });
  } catch (error) {
    console.error('Erro no live-check:', error);
    res.status(500).json({ error: 'Erro ao verificar atualizações' });
  }
});

// GET /api/admin/dashboard - Métricas consolidadas e gráficos
router.get('/dashboard', authenticateToken, (req, res) => {
  try {
    // 1. Total e contagens por status
    const statusCounts = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM solicitacoes 
      GROUP BY status
    `).all();

    const stats = {
      total: 0,
      recebido: 0,
      em_analise: 0,
      aguardando_contato: 0,
      documentacao_pendente: 0,
      aprovado: 0,
      rejeitado: 0
    };

    for (const row of statusCounts) {
      stats.total += row.count;
      if (row.status === 'Recebido') stats.recebido = row.count;
      else if (row.status === 'Em análise') stats.em_analise = row.count;
      else if (row.status === 'Aguardando contato') stats.aguardando_contato = row.count;
      else if (row.status === 'Documentação pendente') stats.documentacao_pendente = row.count;
      else if (row.status === 'Aprovado') stats.aprovado = row.count;
      else if (row.status === 'Rejeitado') stats.rejeitado = row.count;
    }

    // 2. Cadastros nos últimos 7 dias
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const ultimos7Dias = db.prepare(`
      SELECT COUNT(*) as count FROM solicitacoes WHERE criado_em >= ?
    `).get(sevenDaysAgo).count;

    // 3. Cadastros no mês atual
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const mesAtual = db.prepare(`
      SELECT COUNT(*) as count FROM solicitacoes WHERE criado_em >= ?
    `).get(inicioMes).count;

    // 4. Gráfico diário dos últimos 14 dias
    const timeline = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = db.prepare(`
        SELECT COUNT(*) as count FROM solicitacoes 
        WHERE substr(criado_em, 1, 10) = ?
      `).get(dateStr).count;

      timeline.push({
        data: dateStr,
        label: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`,
        quantidade: count
      });
    }

    // 5. Distribuição por tipo de comércio
    const tiposComercio = db.prepare(`
      SELECT tipo_comercio, COUNT(*) as count 
      FROM solicitacoes 
      GROUP BY tipo_comercio 
      ORDER BY count DESC 
      LIMIT 6
    `).all();

    // 6. As 6 solicitações mais recentes
    const recentes = db.prepare(`
      SELECT id, protocolo, nome_fantasia, cidade, estado, status, criado_em, telefone, email
      FROM solicitacoes 
      ORDER BY criado_em DESC 
      LIMIT 6
    `).all();

    res.json({
      stats: {
        ...stats,
        ultimos_7_dias: ultimos7Dias,
        mes_atual: mesAtual
      },
      timeline,
      tipos_comercio: tiposComercio,
      recentes
    });
  } catch (error) {
    console.error('Erro ao gerar estatísticas do dashboard:', error);
    res.status(500).json({ error: 'Erro ao consolidar estatísticas' });
  }
});

// GET /api/admin/export/csv - Exportação completa em formato CSV
router.get('/export/csv', authenticateToken, (req, res) => {
  try {
    const records = db.prepare(`
      SELECT 
        protocolo, cnpj, razao_social, nome_fantasia, tipo_comercio,
        cep, estado, cidade, bairro, rua, numero, complemento,
        dias_funcionamento, estacionamento, quantidade_colaboradores,
        nome_responsavel, telefone, email,
        banco_1, agencia_1, conta_1, tipo_conta_1, pix_1,
        banco_2, agencia_2, conta_2, tipo_conta_2, pix_2,
        origem_cadastro, status, criado_em
      FROM solicitacoes 
      ORDER BY criado_em DESC
    `).all();

    // Cabeçalhos do CSV
    const headers = [
      'Protocolo', 'CNPJ', 'Razao Social', 'Nome Fantasia', 'Tipo Comercio',
      'CEP', 'Estado', 'Cidade', 'Bairro', 'Rua', 'Numero', 'Complemento',
      'Estacionamento', 'Colaboradores', 'Responsavel', 'Telefone', 'Email',
      'Banco 1', 'Agencia 1', 'Conta 1', 'Tipo Conta 1', 'Pix 1',
      'Banco 2', 'Agencia 2', 'Conta 2', 'Tipo Conta 2', 'Pix 2',
      'Origem', 'Status', 'Data Cadastro'
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""').replace(/\r?\n/g, ' ');
      return `"${clean}"`;
    };

    const csvRows = [headers.join(';')];

    for (const r of records) {
      csvRows.push([
        escapeCsv(r.protocolo),
        escapeCsv(r.cnpj),
        escapeCsv(r.razao_social),
        escapeCsv(r.nome_fantasia),
        escapeCsv(r.tipo_comercio),
        escapeCsv(r.cep),
        escapeCsv(r.estado),
        escapeCsv(r.cidade),
        escapeCsv(r.bairro),
        escapeCsv(r.rua),
        escapeCsv(r.numero),
        escapeCsv(r.complemento),
        escapeCsv(r.estacionamento),
        escapeCsv(r.quantidade_colaboradores),
        escapeCsv(r.nome_responsavel),
        escapeCsv(r.telefone),
        escapeCsv(r.email),
        escapeCsv(r.banco_1),
        escapeCsv(r.agencia_1),
        escapeCsv(r.conta_1),
        escapeCsv(r.tipo_conta_1),
        escapeCsv(r.pix_1),
        escapeCsv(r.banco_2),
        escapeCsv(r.agencia_2),
        escapeCsv(r.conta_2),
        escapeCsv(r.tipo_conta_2),
        escapeCsv(r.pix_2),
        escapeCsv(r.origem_cadastro),
        escapeCsv(r.status),
        escapeCsv(r.criado_em)
      ].join(';'));
    }

    const csvContent = '\uFEFF' + csvRows.join('\r\n'); // UTF-8 BOM para Excel
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="solicitacoes_pontos_coleta.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Erro na exportação CSV:', error);
    res.status(500).json({ error: 'Erro ao gerar arquivo CSV' });
  }
});

export default router;
