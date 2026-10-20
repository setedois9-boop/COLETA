import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../database.js';

// Segredo JWT seguro - Prioriza variável de ambiente; caso não definida, usa chave segura padrão
export function getJwtSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim() !== '') {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET deve ser configurado em ambientes de produção.');
  }
  return '6c48d88a3273c0ea10957e9dbd2c789784f8541dbf2391bed73c8f54760116bf';
}

// Lista negra (blacklist) em memória para invalidação instantânea de tokens após logout
const revokedTokens = new Set();

export function revokeToken(token) {
  if (!token) return;
  const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
  const tokenHash = crypto.createHash('sha256').update(cleanToken).digest('hex');
  revokedTokens.add(tokenHash);
}

export function isTokenRevoked(token) {
  if (!token) return false;
  const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
  const tokenHash = crypto.createHash('sha256').update(cleanToken).digest('hex');
  return revokedTokens.has(tokenHash);
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // Suporte a token via query parameter estritamente restrito a requisições GET/HEAD de mídia ou download seguro
  if (!token && req.query && req.query.token) {
    const isSafeMethod = req.method === 'GET' || req.method === 'HEAD';
    const originalUrl = req.originalUrl || req.url || '';
    const isSafeDownloadRoute = originalUrl.includes('/uploads/') || originalUrl.includes('/export/csv');
    if (isSafeMethod && isSafeDownloadRoute) {
      token = req.query.token;
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Acesso não autorizado. Token de autenticação não fornecido.' });
  }

  if (isTokenRevoked(token)) {
    return res.status(401).json({ error: 'Sessão encerrada por logout. Por favor, autentique-se novamente.' });
  }

  jwt.verify(token, getJwtSecret(), (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Sessão expirada ou token inválido. Por favor, autentique-se novamente.' });
    }

    // Bloquear tokens intermediários destinados unicamente ao desafio do 2FA
    if (user.scope === '2fa_pending') {
      return res.status(403).json({
        error: 'Autenticação em duas etapas pendente. Conclua a validação do código 2FA para acessar o painel.',
        require_2fa: true
      });
    }

    // Bloquear tokens de cliente em rotas administrativas
    if (user.scope === 'cliente') {
      return res.status(403).json({
        error: 'Acesso negado: este token pertence a um parceiro/cliente e não possui privilégios administrativos.'
      });
    }

    if (user.scope !== 'admin' || !user.id || user.token_version === undefined) {
      return res.status(403).json({ error: 'Token sem uma sessão administrativa completa.' });
    }

    let adminRow;
    try {
      adminRow = db.prepare('SELECT id, permissao, token_version FROM administradores WHERE id = ?').get(user.id);
    } catch (error) {
      console.error('Falha ao verificar a versão da sessão administrativa:', error);
      return res.status(503).json({ error: 'Não foi possível validar a sessão administrativa.' });
    }

    if (!adminRow || Number(adminRow.token_version || 1) !== Number(user.token_version)) {
      return res.status(401).json({ error: 'Sessão invalidada por encerramento ou alteração da conta.' });
    }

    req.token = token;
    req.user = { ...user, permissao: adminRow.permissao || 'admin' };
    next();
  });
}

export function requireRole(roles = ['admin', 'superadmin', 'master', 'administrador']) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Sessão administrativa não autenticada.' });
    }
    const userRole = (req.user.permissao || 'admin').toLowerCase();
    const normalizedRoles = roles.map(r => r.toLowerCase());
    if (!normalizedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Permissão insuficiente para executar esta operação.' });
    }
    next();
  };
}

export function generateToken(payload, expiresIn = '7d') {
  return jwt.sign(
    {
      ...payload,
      scope: 'admin'
    },
    getJwtSecret(),
    { expiresIn }
  );
}

export function generatePreAuthToken(payload, expiresIn = '5m') {
  return jwt.sign(
    {
      ...payload,
      scope: '2fa_pending'
    },
    getJwtSecret(),
    { expiresIn }
  );
}

export function generateClienteToken(payload, expiresIn = '7d') {
  return jwt.sign(
    {
      scope: 'cliente',
      ...payload
    },
    getJwtSecret(),
    { expiresIn }
  );
}

export function authenticateClienteToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Acesso não autorizado. Por favor, faça login com seus dados de parceiro.' });
  }

  if (isTokenRevoked(token)) {
    return res.status(401).json({ error: 'Sessão encerrada por logout. Por favor, autentique-se novamente.' });
  }

  jwt.verify(token, getJwtSecret(), (err, cliente) => {
    if (err) {
      return res.status(403).json({ error: 'Sessão expirada ou inválida. Por favor, faça login novamente.' });
    }

    if (cliente.scope !== 'cliente') {
      return res.status(403).json({ error: 'Token incompatível com a área de parceiros homologados.' });
    }

    req.token = token;
    req.cliente = cliente;
    next();
  });
}
