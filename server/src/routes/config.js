import { Router } from 'express';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

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

// PUT /api/config - Apenas administradores autenticados
router.put('/', authenticateToken, (req, res) => {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Dados de configuração inválidos' });
    }

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

    res.json({ success: true, message: 'Configurações atualizadas com sucesso' });
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    res.status(500).json({ error: 'Falha ao salvar configurações' });
  }
});

export default router;
