import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Segredo JWT seguro - Prioriza variável de ambiente; caso não definida, gera chave segura em runtime
let runtimeSecret = null;
export function getJwtSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim() !== '' && process.env.JWT_SECRET !== 'ponto-coleta-secret-key-production-2026') {
    return process.env.JWT_SECRET;
  }
  if (!runtimeSecret) {
    runtimeSecret = crypto.randomBytes(32).toString('hex');
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ AVISO DE SEGURANÇA: JWT_SECRET não configurado no ambiente de produção! Uma chave segura em runtime foi gerada.');
    }
  }
  return runtimeSecret;
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // Suporte a token via query parameter (útil para visualização protegida de imagens e exportações)
  if (!token && req.query && req.query.token) {
    token = req.query.token;
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

export function generateToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}
