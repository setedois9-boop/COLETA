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

// Middlewares
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Servir arquivos de uploads estaticamente
const uploadsDir = path.resolve(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

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
