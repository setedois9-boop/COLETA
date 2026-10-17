import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ponto-coleta-secret-key-production-2026';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acesso não autorizado. Token não fornecido.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Sessão expirada ou token inválido. Faça login novamente.' });
    }
    req.user = user;
    next();
  });
}

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
