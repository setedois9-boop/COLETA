import { Router } from 'express';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import { verifyTotpToken } from './admin.js';
import { decryptSecret } from '../utils/crypto.js';

const router = Router();

// Controle de tentativas de 2FA para proteção contra força bruta
const config2FaAttempts = new Map();

function checkConfig2FaThrottle(ip, adminId) {
  const adminRecord = config2FaAttempts.get(`admin:${adminId}`);
  if (adminRecord && adminRecord.lockedUntil && adminRecord.lockedUntil > Date.now()) {
    const minutesLeft = Math.ceil((adminRecord.lockedUntil - Date.now()) / 60000);
    return { allowed: false, minutesLeft };
  }
  const ipRecord = config2FaAttempts.get(`ip:${ip}`);
  if (ipRecord && ipRecord.lockedUntil && ipRecord.lockedUntil > Date.now()) {
    const minutesLeft = Math.ceil((ipRecord.lockedUntil - Date.now()) / 60000);
    return { allowed: false, minutesLeft };
  }
  return { allowed: true };
}

function recordFailed2FaAttempt(ip, adminId) {
  const keys = [`admin:${adminId}`, `ip:${ip}`];
  for (const key of keys) {
    const record = config2FaAttempts.get(key) || { count: 0, firstAttempt: Date.now() };
    record.count += 1;
    if (record.count >= 5) {
      record.lockedUntil = Date.now() + 15 * 60 * 1000; // Bloqueio temporário de 15 minutos
    }
    config2FaAttempts.set(key, record);
  }
}

function clearConfig2FaAttempts(ip, adminId) {
  config2FaAttempts.delete(`admin:${adminId}`);
  config2FaAttempts.delete(`ip:${ip}`);
}

// Prevenção de ataques de repetição (Replay Attacks)
// Impede que o mesmo código TOTP seja reutilizado dentro da janela de validade
const usedTokensCache = new Map();

function isTokenReused(adminId, code) {
  const key = `${adminId}:${code}`;
  const expiry = usedTokensCache.get(key);
  if (expiry && expiry > Date.now()) {
    return true;
  }
  return false;
}

function markTokenAsUsed(adminId, code) {
  const key = `${adminId}:${code}`;
  usedTokensCache.set(key, Date.now() + 5 * 60 * 1000); // 5 minutos de retenção
}

// Limpeza de tokens expirados no cache a cada 2 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, expiresAt] of usedTokensCache.entries()) {
    if (expiresAt <= now) {
      usedTokensCache.delete(key);
    }
  }
}, 2 * 60 * 1000).unref();

// GET /api/config - Público (retorna as configurações do site)
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT chave, valor FROM configuracoes_site').all();
    const config = {};
    for (const row of rows) {
      try {
        config[row.chave] = JSON.parse(row.valor);
      } catch {
        config[row.chave] = row.valor;
      }
    }
    res.json(config);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ error: 'Erro ao carregar configurações do sistema' });
  }
});

// PUT /api/config - Apenas administradores autenticados com validação de 2FA obrigatória
router.put('/', authenticateToken, (req, res) => {
  try {
    const rawUpdates = req.body;
    if (!rawUpdates || typeof rawUpdates !== 'object') {
      return res.status(400).json({ error: 'Dados de configuração inválidos' });
    }

    // 1. Validar sessão e permissões do administrador
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ error: 'Sessão administrativa inválida.' });
    }

    const admin = db.prepare('SELECT id, nome, email, permissao, two_factor_enabled, two_factor_secret FROM administradores WHERE id = ?').get(adminId);
    if (!admin) {
      return res.status(401).json({ error: 'Administrador não encontrado.' });
    }

    const allowedRoles = ['admin', 'superadmin', 'master', 'administrador'];
    if (admin.permissao && !allowedRoles.includes(admin.permissao.toLowerCase())) {
      return res.status(403).json({ error: 'Permissão insuficiente para alterar configurações da plataforma.' });
    }

    // 2. Se não houver 2FA configurado para o administrador, não permitir salvar as configurações
    if (!admin.two_factor_enabled || !admin.two_factor_secret) {
      return res.status(403).json({
        error: 'Autenticação de dois fatores (2FA) não configurada nesta conta. Por segurança, é obrigatório ativar o Google Authenticator antes de alterar as configurações da plataforma.',
        require_2fa_setup: true,
      });
    }

    // 3. Extrair e validar o código 2FA fornecido via header ou payload
    const twoFactorCode = (
      req.headers['x-2fa-code'] ||
      req.headers['x-two-factor-code'] ||
      rawUpdates.two_factor_code ||
      ''
    ).toString().replace(/\D/g, '');

    // 4. Verificar proteção contra força bruta (Rate Limiting)
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const throttle = checkConfig2FaThrottle(ip, admin.id);
    if (!throttle.allowed) {
      return res.status(429).json({
        error: `Muitas tentativas incorretas de código 2FA. Por segurança, o salvamento está bloqueado temporariamente por ${throttle.minutesLeft} minuto(s).`,
        locked: true,
      });
    }

    if (!twoFactorCode || twoFactorCode.length !== 6) {
      return res.status(403).json({
        error: 'Código de autenticação de dois fatores (2FA) de 6 dígitos é obrigatório para salvar as alterações.',
        require_2fa: true,
      });
    }

    // 5. Prevenção de ataque de repetição (Replay Attack)
    if (isTokenReused(admin.id, twoFactorCode)) {
      return res.status(403).json({
        error: 'Este código 2FA já foi utilizado recentemente. Por favor, aguarde o próximo código de 6 dígitos no seu Google Authenticator.',
        require_2fa: true,
      });
    }

    // 6. Validação criptográfica do TOTP
    const plainSecret = decryptSecret(admin.two_factor_secret);
    const isValid = verifyTotpToken(twoFactorCode, plainSecret);
    if (!isValid) {
      recordFailed2FaAttempt(ip, admin.id);
      return res.status(403).json({
        error: 'Código 2FA incorreto ou expirado. Verifique o aplicativo Google Authenticator e tente novamente.',
        require_2fa: true,
      });
    }

    // Código validado com sucesso: limpa contador de tentativas e marca token como consumido
    clearConfig2FaAttempts(ip, admin.id);
    markTokenAsUsed(admin.id, twoFactorCode);

    // 7. Sanitizar payload: nunca salvar 'two_factor_code' como configuração do site
    const updates = { ...rawUpdates };
    delete updates.two_factor_code;

    // 8. Persistir configurações atomicamente no banco de dados
    const upsertStmt = db.prepare(`
      INSERT INTO configuracoes_site (chave, valor)
      VALUES (?, ?)
      ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor
    `);

    const updateMany = db.transaction((data) => {
      for (const [chave, valor] of Object.entries(data)) {
        upsertStmt.run(chave, JSON.stringify(valor));
      }
    });

    updateMany(updates);

    res.json({ success: true, message: 'Configurações atualizadas com sucesso mediante validação 2FA' });
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    res.status(500).json({ error: 'Falha ao salvar configurações' });
  }
});

export default router;
