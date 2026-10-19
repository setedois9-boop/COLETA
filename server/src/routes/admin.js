import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { generateSecret, generateURI, verifySync, generateSync } from 'otplib';
import QRCode from 'qrcode';
import db from '../database.js';
import { authenticateToken, generateToken } from '../middleware/auth.js';
import { encryptSecret, decryptSecret } from '../utils/crypto.js';

const router = Router();

// Proteção contra ataques de força bruta no login administrativo
const loginAttempts = new Map();

function checkLoginThrottle(ip) {
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true };
  if (record.lockedUntil && record.lockedUntil > Date.now()) {
    const minutesLeft = Math.ceil((record.lockedUntil - Date.now()) / 60000);
    return { allowed: false, minutesLeft };
  }
  return { allowed: true };
}

function recordFailedLogin(ip) {
  const record = loginAttempts.get(ip) || { count: 0, firstAttempt: Date.now() };
  record.count += 1;
  if (record.count >= 5) {
    record.lockedUntil = Date.now() + 15 * 60 * 1000; // Bloqueio de 15 minutos
  }
  loginAttempts.set(ip, record);
}

function clearLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

// Função auxiliar para validação resiliente de códigos TOTP (compatível com variações de relógio)
export function verifyTotpToken(cleanCode, secret) {
  if (!cleanCode || !secret) return false;

  // 1. Verificação padrão com tolerância estendida de época
  try {
    const verification = verifySync({
      token: cleanCode,
      secret,
      epochTolerance: 120,
    });
    if (verification && verification.valid) return true;
  } catch {}

  // 2. Comparação direta com o código do timestamp atual
  try {
    const current = generateSync({ secret });
    if (cleanCode === current) return true;
  } catch {}

  // 3. Verificação em janela de -6 a +6 passos (3 minutos para frente ou para trás)
  const now = Date.now();
  for (let offset = -6; offset <= 6; offset++) {
    try {
      const stepToken = generateSync({ secret, epoch: now + offset * 30000 });
      if (cleanCode === stepToken) return true;
    } catch {}
  }

  return false;
}

// POST /api/admin/login - Autenticação de administradores com suporte a 2FA do Google Authenticator
router.post('/login', (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const throttle = checkLoginThrottle(ip);
    if (!throttle.allowed) {
      return res.status(429).json({
        error: `Muitas tentativas incorretas. Acesso temporariamente bloqueado por segurança. Tente novamente em ${throttle.minutesLeft} minutos.`
      });
    }

    const { email, senha, two_factor_code } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const admin = db.prepare('SELECT * FROM administradores WHERE email = ?').get(email.trim().toLowerCase());
    if (!admin) {
      recordFailedLogin(ip);
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
    }

    const match = bcrypt.compareSync(senha, admin.senha_hash);
    if (!match) {
      recordFailedLogin(ip);
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
    }

    // Se o 2FA do Google Authenticator estiver ativado para esta conta
    if (admin.two_factor_enabled === 1 && admin.two_factor_secret) {
      if (!two_factor_code) {
        return res.json({
          require_2fa: true,
          email: admin.email,
          message: 'Autenticação em duas etapas requerida. Digite o código de 6 dígitos gerado pelo Google Authenticator.'
        });
      }

      const cleanCode = String(two_factor_code).replace(/\D/g, '');
      const plainSecret = decryptSecret(admin.two_factor_secret);
      const valid = verifyTotpToken(cleanCode, plainSecret);

      if (!valid) {
        recordFailedLogin(ip);
        return res.status(401).json({
          error: 'Código do Google Authenticator inválido ou expirado. Verifique o relógio do seu celular e tente novamente.'
        });
      }
    }

    clearLoginAttempts(ip);

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
  const admin = db.prepare('SELECT id, nome, email, permissao, two_factor_enabled, two_factor_secret FROM administradores WHERE id = ? OR email = ?').get(req.user?.id || 0, req.user?.email || '');
  if (!admin) {
    return res.status(404).json({ error: 'Administrador não encontrado.' });
  }
  const isEnabled = Boolean(Number(admin.two_factor_enabled) === 1 && admin.two_factor_secret);
  res.json({
    admin: {
      id: admin.id,
      nome: admin.nome,
      email: admin.email,
      permissao: admin.permissao,
      two_factor_enabled: isEnabled
    }
  });
});

// GET /api/admin/2fa/status - Status do 2FA do usuário logado
router.get('/2fa/status', authenticateToken, (req, res) => {
  try {
    const admin = db.prepare('SELECT id, two_factor_enabled, two_factor_secret FROM administradores WHERE id = ? OR email = ?').get(req.user?.id || 0, req.user?.email || '');
    if (!admin) {
      return res.status(404).json({ error: 'Administrador não encontrado.' });
    }
    const isEnabled = Boolean(Number(admin.two_factor_enabled) === 1 && admin.two_factor_secret);
    res.json({ enabled: isEnabled });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao consultar status do 2FA.' });
  }
});

// Rate limiting para desativação de 2FA (proteção contra força bruta de senha)
const disable2FaAttempts = new Map();

function check2FaDisableThrottle(ip, adminId) {
  const adminRecord = disable2FaAttempts.get(`admin:${adminId}`);
  if (adminRecord && adminRecord.lockedUntil && adminRecord.lockedUntil > Date.now()) {
    const minutesLeft = Math.ceil((adminRecord.lockedUntil - Date.now()) / 60000);
    return { allowed: false, minutesLeft };
  }
  const ipRecord = disable2FaAttempts.get(`ip:${ip}`);
  if (ipRecord && ipRecord.lockedUntil && ipRecord.lockedUntil > Date.now()) {
    const minutesLeft = Math.ceil((ipRecord.lockedUntil - Date.now()) / 60000);
    return { allowed: false, minutesLeft };
  }
  return { allowed: true };
}

function recordFailed2FaDisableAttempt(ip, adminId) {
  const keys = [`admin:${adminId}`, `ip:${ip}`];
  for (const key of keys) {
    const record = disable2FaAttempts.get(key) || { count: 0, firstAttempt: Date.now() };
    record.count += 1;
    if (record.count >= 5) {
      record.lockedUntil = Date.now() + 15 * 60 * 1000; // Bloqueio de 15 minutos
    }
    disable2FaAttempts.set(key, record);
  }
}

function clear2FaDisableAttempts(ip, adminId) {
  disable2FaAttempts.delete(`admin:${adminId}`);
  disable2FaAttempts.delete(`ip:${ip}`);
}

// POST /api/admin/2fa/setup - Iniciar configuração do Google Authenticator com vínculo seguro
router.post('/2fa/setup', authenticateToken, async (req, res) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) return res.status(401).json({ error: 'Sessão administrativa inválida.' });

    const admin = db.prepare('SELECT id, email, permissao, two_factor_enabled FROM administradores WHERE id = ?').get(adminId);
    if (!admin) return res.status(401).json({ error: 'Acesso não autorizado. Administrador não encontrado.' });

    const allowedRoles = ['admin', 'superadmin', 'master', 'administrador'];
    if (admin.permissao && !allowedRoles.includes(admin.permissao.toLowerCase())) {
      return res.status(403).json({ error: 'Permissão insuficiente.' });
    }

    // Se o 2FA já estiver ativo, impede reconfiguração silenciosa sem desativação prévia autorizada
    if (admin.two_factor_enabled === 1) {
      return res.status(400).json({
        error: 'A autenticação em duas etapas já está ativa nesta conta. Para reconfigurar, desative-a primeiro na aba Segurança confirmando sua senha.'
      });
    }

    const secret = generateSecret();

    // Salvar segredo temporário criptografado com AES-256-GCM vinculado estritamente à conta autenticada
    const encryptedSecret = encryptSecret(secret);
    db.prepare('UPDATE administradores SET two_factor_temp_secret = ? WHERE id = ?').run(encryptedSecret, admin.id);

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

    // Segurança: NÃO expor current_code na resposta da API; o código deve ser lido no app do celular
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

// POST /api/admin/2fa/direct-enable - Bloqueado por segurança (requer validação estrita via verify-and-enable)
router.post('/2fa/direct-enable', authenticateToken, (req, res) => {
  return res.status(403).json({
    error: 'Ativação direta descontinuada por segurança. É obrigatório validar o código de 6 dígitos gerado no Google Authenticator através de /api/admin/2fa/verify-and-enable.'
  });
});

// POST /api/admin/2fa/verify-and-enable - Confirmar código e ativar 2FA
router.post('/2fa/verify-and-enable', authenticateToken, (req, res) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) return res.status(401).json({ error: 'Sessão administrativa inválida.' });

    const { token } = req.body || {};
    if (!token) {
      return res.status(400).json({ error: 'O código de 6 dígitos é obrigatório.' });
    }

    const admin = db.prepare('SELECT id, two_factor_temp_secret, two_factor_secret, permissao FROM administradores WHERE id = ?').get(adminId);
    if (!admin) return res.status(401).json({ error: 'Acesso não autorizado. Administrador não encontrado.' });

    const allowedRoles = ['admin', 'superadmin', 'master', 'administrador'];
    if (admin.permissao && !allowedRoles.includes(admin.permissao.toLowerCase())) {
      return res.status(403).json({ error: 'Permissão insuficiente.' });
    }

    const secret = decryptSecret(admin.two_factor_temp_secret);
    if (!secret) {
      return res.status(400).json({ error: 'Nenhuma configuração de 2FA em andamento. Gere um novo QR Code primeiro.' });
    }

    const cleanCode = String(token).replace(/\D/g, '');
    const valid = verifyTotpToken(cleanCode, secret);

    if (!valid) {
      return res.status(400).json({
        error: 'Código inválido ou expirado. Certifique-se de digitar os 6 dígitos gerados no aplicativo Google Authenticator.'
      });
    }

    // Ativar 2FA definitivamente armazenando o segredo criptografado com AES-256-GCM
    const encryptedSecret = encryptSecret(secret);
    db.prepare(`
      UPDATE administradores
      SET two_factor_secret = ?,
          two_factor_enabled = 1,
          two_factor_temp_secret = NULL
      WHERE id = ?
    `).run(encryptedSecret, admin.id);

    try {
      const pStatePath = path.resolve('api/persistent_state.json');
      if (fs.existsSync(pStatePath)) {
        const pState = JSON.parse(fs.readFileSync(pStatePath, 'utf-8'));
        pState.admin.two_factor_enabled = 1;
        pState.admin.two_factor_secret = encryptedSecret;
        pState.admin.two_factor_temp_secret = null;
        fs.writeFileSync(pStatePath, JSON.stringify(pState, null, 2), 'utf-8');
      }
    } catch {}

    res.json({
      success: true,
      message: 'Autenticação em duas etapas (2FA) do Google Authenticator ativada com sucesso!'
    });
  } catch (err) {
    console.error('Erro ao validar 2FA:', err);
    res.status(500).json({ error: 'Falha ao confirmar ativação do 2FA.' });
  }
});

// POST /api/admin/2fa/disable - Desativação bloqueada para fluxo administrativo comum (política de segurança corporativa)
router.post('/2fa/disable', authenticateToken, (req, res) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) return res.status(401).json({ error: 'Sessão administrativa inválida.' });

    const admin = db.prepare('SELECT id, email, permissao, two_factor_enabled, two_factor_secret FROM administradores WHERE id = ? OR email = ?').get(adminId, req.user?.email || '');
    if (!admin) return res.status(401).json({ error: 'Acesso não autorizado. Administrador não encontrado.' });

    const allowedRoles = ['admin', 'superadmin', 'master', 'administrador'];
    if (admin.permissao && !allowedRoles.includes(admin.permissao.toLowerCase())) {
      return res.status(403).json({ error: 'Permissão insuficiente.' });
    }

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
    db.prepare(`
      UPDATE administradores
      SET two_factor_enabled = 0,
          two_factor_secret = NULL,
          two_factor_temp_secret = NULL
      WHERE id = ?
    `).run(admin.id);

    console.info(`[AUDIT] 2FA desativado mediante protocolo emergencial autorizado para admin ID ${admin.id} (${admin.email}) em ${new Date().toISOString()}`);

    res.json({
      success: true,
      message: 'Autenticação em duas etapas desativada mediante protocolo emergencial.'
    });
  } catch (err) {
    console.error('Erro ao desativar 2FA:', err);
    res.status(500).json({ error: 'Falha ao processar solicitação de segurança.' });
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
      let clean = String(str).replace(/"/g, '""').replace(/\r?\n/g, ' ');
      // Previne injeção de fórmulas CSV (CWE-1236 Formula Injection)
      if (/^[=+\-@\t\r]/.test(clean)) {
        clean = "'" + clean;
      }
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

// PUT /api/admin/password - Alterar senha administrativa (exige 2FA se ativo)
router.put('/password', authenticateToken, (req, res) => {
  try {
    const { senha_atual, nova_senha, two_factor_code, code } = req.body || {};
    if (!senha_atual || !nova_senha) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias.' });
    }
    if (String(nova_senha).length < 8) {
      return res.status(400).json({ error: 'A nova senha deve possuir no mínimo 8 caracteres.' });
    }

    const admin = db.prepare('SELECT id, email, senha_hash, two_factor_enabled, two_factor_secret FROM administradores WHERE id = ? OR email = ?').get(req.user?.id || 0, req.user?.email || '');
    if (!admin) {
      return res.status(404).json({ error: 'Administrador não encontrado.' });
    }

    const match = bcrypt.compareSync(senha_atual, admin.senha_hash);
    if (!match) {
      return res.status(401).json({ error: 'A senha atual informada está incorreta.' });
    }

    // Exigir confirmação 2FA se o administrador tiver o 2FA ativo
    if (admin.two_factor_enabled === 1 && admin.two_factor_secret) {
      const tokenInput = String(two_factor_code || code || '').replace(/\D/g, '');
      if (!tokenInput || tokenInput.length !== 6) {
        return res.status(400).json({
          error: 'Código 2FA do Google Authenticator é obrigatório para alterar a senha administrativa.'
        });
      }
      const plainSecret = decryptSecret(admin.two_factor_secret);
      const isTotpValid = verifyTotpToken(tokenInput, plainSecret);
      if (!isTotpValid) {
        return res.status(401).json({
          error: 'Código do Google Authenticator inválido ou expirado. Verifique o relógio do seu celular e tente novamente.'
        });
      }
    }

    const salt = bcrypt.genSaltSync(10);
    const novoHash = bcrypt.hashSync(nova_senha, salt);
    db.prepare('UPDATE administradores SET senha_hash = ? WHERE id = ?').run(novoHash, admin.id);

    console.info(`[AUDIT] Senha administrativa alterada com sucesso para admin ID ${admin.id} (${admin.email}) em ${new Date().toISOString()}`);

    res.json({ success: true, message: 'Senha administrativa atualizada com sucesso!' });
  } catch (err) {
    console.error('Erro ao alterar senha:', err);
    res.status(500).json({ error: 'Falha ao alterar senha.' });
  }
});

export default router;
