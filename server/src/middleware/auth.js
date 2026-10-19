import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Segredo JWT seguro - Prioriza variável de ambiente; caso não definida, usa chave segura padrão
export function getJwtSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim() !== '') {
    return process.env.JWT_SECRET;
  }
  return '6c48d88a3273c0ea10957e9dbd2c789784f8541dbf2391bed73c8f54760116bf';
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

  jwt.verify(token, getJwtSecret(), (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Sessão expirada ou token inválido. Por favor, autentique-se novamente.' });
    }
    req.user = user;
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

export function generateToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

