import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDatabase } from './database.js';
import solicitacoesRoutes from './routes/solicitacoes.js';
import configRoutes from './routes/config.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicializar banco de dados SQLite e tabelas
initDatabase();

const app = express();
const PORT = process.env.PORT || 3001;

// Desativar identificação do Express
app.disable('x-powered-by');

// Cabeçalhos HTTP de Segurança Avançados (OWASP Hardening)
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Middlewares
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

import fs from 'fs';
import { authenticateToken } from './middleware/auth.js';

// Servir arquivos de uploads com autenticação protegida e sanitização estrita contra path traversal
const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads/:filename', authenticateToken, (req, res) => {
  try {
    const safeFilename = path.basename(req.params.filename);
    const targetFile = path.resolve(uploadsDir, safeFilename);

    // Validação estrita de confinamento dentro do diretório de uploads
    if (!targetFile.startsWith(uploadsDir)) {
      return res.status(403).json({ error: 'Acesso negado: tentativa de travessia de diretório detectada.' });
    }

    if (!fs.existsSync(targetFile)) {
      return res.status(404).json({ error: 'Arquivo solicitado não foi encontrado.' });
    }

    res.sendFile(targetFile);
  } catch (error) {
    console.error('Erro ao servir arquivo protegido:', error);
    res.status(500).json({ error: 'Falha ao processar arquivo' });
  }
});


// Rotas da API
app.use('/api/solicitacoes', solicitacoesRoutes);
app.use('/api/config', configRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ponto-coleta-api'
  });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro na requisição:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno no servidor'
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT} (http://localhost:${PORT})`);
});
