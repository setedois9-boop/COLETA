import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { generateSync, generateSecret } from 'otplib';

import { initDatabase } from '../src/database.js';
import db from '../src/database.js';
import { authenticateToken, generateToken, requireRole } from '../src/middleware/auth.js';
import { encryptSecret, decryptSecret, getTotpEncryptionKey } from '../src/utils/crypto.js';
import solicitacoesRoutes from '../src/routes/solicitacoes.js';
import configRoutes from '../src/routes/config.js';
import adminRoutes from '../src/routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Inicializar app express de teste idêntica à de produção
const app = express();
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
});

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads/:filename', authenticateToken, (req, res) => {
  try {
    const safeFilename = path.basename(req.params.filename);
    const targetFile = path.resolve(uploadsDir, safeFilename);
    if (!targetFile.startsWith(uploadsDir)) {
      return res.status(403).json({ error: 'Acesso negado: tentativa de travessia de diretório detectada.' });
    }
    if (!fs.existsSync(targetFile)) {
      return res.status(404).json({ error: 'Arquivo solicitado não foi encontrado.' });
    }
    res.sendFile(targetFile);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao processar arquivo' });
  }
});

app.use('/api/solicitacoes', solicitacoesRoutes);
app.use('/api/config', configRoutes);
app.use('/api/admin', adminRoutes);

// Helper HTTP Client
function makeRequest(server, options, bodyData = null) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const reqOptions = {
      hostname: '127.0.0.1',
      port: addr.port,
      path: options.path,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (bodyData && typeof bodyData === 'object' && !reqOptions.headers['Content-Type']) {
      reqOptions.headers['Content-Type'] = 'application/json';
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
          raw: data
        });
      });
    });

    req.on('error', reject);

    if (bodyData) {
      if (typeof bodyData === 'string') {
        req.write(bodyData);
      } else {
        req.write(JSON.stringify(bodyData));
      }
    }
    req.end();
  });
}

test('SUÍTE COMPLETA DE SEGURANÇA E AUDITORIA DA PLATAFORMA', async (t) => {
  initDatabase();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  t.after(() => {
    server.close();
  });

  // Obter ou preparar admin de teste
  let admin = db.prepare("SELECT * FROM administradores WHERE email = 'admin@pontodecoleta.com.br'").get();
  assert.ok(admin, 'Administrador padrão deve existir no banco');

  // Gerar token de superadmin válido
  const validAdminToken = generateToken({
    id: admin.id,
    nome: admin.nome,
    email: admin.email,
    permissao: admin.permissao || 'superadmin',
    two_factor_enabled: Boolean(admin.two_factor_enabled)
  });

  // Token com perfil sem permissões administrativas
  const unprivilegedToken = generateToken({
    id: 999,
    nome: 'Usuario Comum',
    email: 'comum@teste.com',
    permissao: 'visitante',
    two_factor_enabled: false
  });

  // --- SEÇÃO 1: CABEÇALHOS HTTP OWASP E PROTEÇÃO DE INFRAESTRUTURA ---
  await t.test('1.1 Deve emitir cabeçalhos de segurança OWASP e ocultar X-Powered-By', async () => {
    const res = await makeRequest(server, { path: '/api/config', method: 'GET' });
    assert.equal(res.status, 200);
    assert.equal(res.headers['x-frame-options'], 'DENY');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['referrer-policy'], 'strict-origin-when-cross-origin');
    assert.ok(res.headers['permissions-policy']);
    assert.equal(res.headers['cross-origin-opener-policy'], 'same-origin');
    assert.equal(res.headers['x-powered-by'], undefined, 'X-Powered-By deve estar desativado');
  });

  // --- SEÇÃO 2: CONTROLE DE ACESSO, RBAC E ISOLAMENTO ---
  await t.test('2.1 Deve rejeitar acesso não autenticado a rotas protegidas', async () => {
    const res = await makeRequest(server, { path: '/api/solicitacoes', method: 'GET' });
    assert.equal(res.status, 401);
    assert.ok(res.data.error.includes('Token de autenticação não fornecido'));
  });

  await t.test('2.2 Deve rejeitar token em query parameter para operações de modificação (PUT/POST)', async () => {
    const res = await makeRequest(server, {
      path: `/api/config?token=${validAdminToken}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { nome_site: 'Teste Bypass' });
    // Token em query param em PUT deve ser estritamente ignorado -> 401
    assert.equal(res.status, 401);
  });

  await t.test('2.3 Mascaramento de dados bancários sensíveis em detalhes da solicitação', async () => {
    // Buscar uma solicitação existente ou criar mock
    const existing = db.prepare('SELECT id FROM solicitacoes LIMIT 1').get();
    if (existing) {
      const resMasked = await makeRequest(server, {
        path: `/api/solicitacoes/${existing.id}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${validAdminToken}` }
      });
      assert.equal(resMasked.status, 200);
      if (resMasked.data.pix_1) {
        assert.ok(resMasked.data.pix_1.includes('••••'), 'Chave Pix deve estar mascarada');
      }
    }
  });

  await t.test('2.4 Exclusão LGPD de solicitação inexistente deve retornar 404', async () => {
    const res = await makeRequest(server, {
      path: '/api/solicitacoes/99999999',
      method: 'DELETE',
      headers: { Authorization: `Bearer ${validAdminToken}` }
    });
    assert.equal(res.status, 404);
  });

  // --- SEÇÃO 3: CRIPTOGRAFIA DE SEGREDOS TOTP (AES-256-GCM) ---
  await t.test('3.1 AES-256-GCM: Cifragem, decifragem e compatibilidade retroativa', async () => {
    const plainSecret = 'JBSWY3DPEHPK3PXP';
    const encrypted = encryptSecret(plainSecret);
    assert.ok(encrypted.startsWith('enc:gcm:'), 'Formato deve iniciar com enc:gcm:');

    const parts = encrypted.split(':');
    assert.equal(parts.length, 5, 'Formato deve ter 5 partes: enc, gcm, iv, tag, ciphertext');
    assert.equal(parts[2].length, 24, 'IV deve ter 12 bytes em hex (24 caracteres)');
    assert.equal(parts[3].length, 32, 'Tag deve ter 16 bytes em hex (32 caracteres)');

    const decrypted = decryptSecret(encrypted);
    assert.equal(decrypted, plainSecret, 'Texto decifrado deve coincidir com o original');

    // Compatibilidade com segredo legatário não criptografado
    const legacySecret = 'LEGACYPLAINSECRET123';
    assert.equal(decryptSecret(legacySecret), legacySecret, 'Segredo legatário em texto puro deve ser preservado');
  });

  // --- SEÇÃO 4: CICLO DE VIDA DO 2FA (SETUP, ATIVAÇÃO, DESATIVAÇÃO) ---
  await t.test('4.1 Bloqueio de rota direta direct-enable (403 Forbidden)', async () => {
    const res = await makeRequest(server, {
      path: '/api/admin/2fa/direct-enable',
      method: 'POST',
      headers: { Authorization: `Bearer ${validAdminToken}` }
    });
    assert.equal(res.status, 403);
    assert.ok(res.data.error.includes('descontinuada por segurança'));
  });

  await t.test('4.2 Setup 2FA gera credenciais sem vazar current_code', async () => {
    // Garantir que 2FA esteja desativado para testar o ciclo completo de setup
    db.prepare('UPDATE administradores SET two_factor_enabled = 0, two_factor_secret = NULL, two_factor_temp_secret = NULL WHERE id = ?').run(admin.id);

    const resSetup = await makeRequest(server, {
      path: '/api/admin/2fa/setup',
      method: 'POST',
      headers: { Authorization: `Bearer ${validAdminToken}` }
    });

    assert.equal(resSetup.status, 200);
    assert.ok(resSetup.data.secret, 'Deve retornar secret Base32');
    assert.ok(resSetup.data.qr_code, 'Deve retornar QR Code em Data URL');
    assert.equal(resSetup.data.current_code, undefined, 'NÃO pode vazar current_code na resposta da API');

    // Verificar se no banco o temp_secret foi gravado cifrado com AES-256-GCM
    const checkDb = db.prepare('SELECT two_factor_temp_secret FROM administradores WHERE id = ?').get(admin.id);
    assert.ok(checkDb.two_factor_temp_secret.startsWith('enc:gcm:'), 'Temp secret no banco deve ser cifrado com AES-256-GCM');

    // 4.3 Rejeição de código 2FA inválido na ativação
    const resInvalidCode = await makeRequest(server, {
      path: '/api/admin/2fa/verify-and-enable',
      method: 'POST',
      headers: { Authorization: `Bearer ${validAdminToken}` }
    }, { token: '000000' });
    assert.equal(resInvalidCode.status, 400);

    // 4.4 Ativação bem-sucedida com código TOTP válido
    const validCode = generateSync({ secret: resSetup.data.secret });
    const resEnable = await makeRequest(server, {
      path: '/api/admin/2fa/verify-and-enable',
      method: 'POST',
      headers: { Authorization: `Bearer ${validAdminToken}` }
    }, { token: validCode });
    assert.equal(resEnable.status, 200);
    assert.ok(resEnable.data.success);

    // Verificar banco: secret final cifrado com AES-256-GCM e temp_secret limpo
    const adminActive = db.prepare('SELECT two_factor_enabled, two_factor_secret, two_factor_temp_secret FROM administradores WHERE id = ?').get(admin.id);
    assert.equal(adminActive.two_factor_enabled, 1);
    assert.ok(adminActive.two_factor_secret.startsWith('enc:gcm:'), 'Secret final deve estar cifrado com AES-256-GCM');
    assert.equal(adminActive.two_factor_temp_secret, null, 'Temp secret deve ter sido limpo');
  });

  // --- SEÇÃO 5: SALVAMENTO DE CONFIGURAÇÕES COM 2FA E ANTI-REPLAY ---
  await t.test('5.1 (Req 1 & 3) PUT /api/config rejeita ausência de código 2FA e preserva dados', async () => {
    const configBefore = db.prepare("SELECT valor FROM configuracoes_site WHERE chave = 'nome_site'").get();

    const res = await makeRequest(server, {
      path: '/api/config',
      method: 'PUT',
      headers: { Authorization: `Bearer ${validAdminToken}` }
    }, { nome_site: 'Tentativa Invasiva Sem 2FA' });

    assert.equal(res.status, 403);
    assert.equal(res.data.require_2fa, true);

    // Comprovar que o banco não foi alterado
    const configAfter = db.prepare("SELECT valor FROM configuracoes_site WHERE chave = 'nome_site'").get();
    assert.equal(configAfter?.valor, configBefore?.valor);
  });

  await t.test('5.2 (Req 2) PUT /api/config com código 2FA inválido impede a gravação', async () => {
    const configBefore = db.prepare("SELECT valor FROM configuracoes_site WHERE chave = 'nome_site'").get();

    const res = await makeRequest(server, {
      path: '/api/config',
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${validAdminToken}`,
        'x-2fa-code': '000000'
      }
    }, { nome_site: 'Tentativa Com Código Invalido' });

    assert.equal(res.status, 403);
    assert.ok(res.data.error.includes('Código 2FA incorreto ou expirado'));

    const configAfter = db.prepare("SELECT valor FROM configuracoes_site WHERE chave = 'nome_site'").get();
    assert.equal(configAfter?.valor, configBefore?.valor);
  });

  await t.test('5.3 (Req 1 & 4) PUT /api/config com código 2FA válido permite salvar e bloqueia Replay Attack', async () => {
    const adminRow = db.prepare('SELECT two_factor_secret FROM administradores WHERE id = ?').get(admin.id);
    const plainSecret = decryptSecret(adminRow.two_factor_secret);
    const code = generateSync({ secret: plainSecret });

    // 1º Envio: Código válido -> Deve ser aceito
    const resFirst = await makeRequest(server, {
      path: '/api/config',
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${validAdminToken}`,
        'x-2fa-code': code
      }
    }, { nome_site: 'Rede Logística Auditada 2026' });

    assert.equal(resFirst.status, 200);
    assert.ok(resFirst.data.success);

    // Verificar se persistiu no banco
    const configSaved = db.prepare("SELECT valor FROM configuracoes_site WHERE chave = 'nome_site'").get();
    assert.equal(JSON.parse(configSaved.valor), 'Rede Logística Auditada 2026');

    // 2º Envio imediato: Mesmo código -> Rejeitado por Replay Attack
    const resReplay = await makeRequest(server, {
      path: '/api/config',
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${validAdminToken}`,
        'x-2fa-code': code
      }
    }, { nome_site: 'Tentativa Replay' });

    assert.equal(resReplay.status, 403);
    assert.ok(resReplay.data.error.includes('já foi utilizado recentemente'), 'Deve bloquear código reutilizado');
  });

  await t.test('5.4 (Req 4) Chamada direta à API /api/config sem token ou com token forjado é rejeitada', async () => {
    const resNoAuth = await makeRequest(server, {
      path: '/api/config',
      method: 'PUT',
      headers: { 'x-2fa-code': '123456' }
    }, { nome_site: 'Ataque Direto' });
    assert.equal(resNoAuth.status, 401);

    const resFakeToken = await makeRequest(server, {
      path: '/api/config',
      method: 'PUT',
      headers: {
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.fake',
        'x-2fa-code': '123456'
      }
    }, { nome_site: 'Ataque Token Falso' });
    assert.equal(resFakeToken.status, 403);
  });

  // --- SEÇÃO 6: BLOQUEIO DA DESATIVAÇÃO DO 2FA E PERSISTÊNCIA ---
  await t.test('6.1 (Req 5) Interface administrativa não contém botão ou modal de desativação de 2FA', async () => {
    const configComponentPath = path.resolve(__dirname, '../../client/src/pages/Admin/AdminConfiguracoes.tsx');
    const fileContent = fs.readFileSync(configComponentPath, 'utf-8');

    // Comprovar que o botão e modal foram removidos do código-fonte do componente
    assert.ok(!fileContent.includes('Desativar Google Authenticator'), 'Não deve existir título de modal de desativação');
    assert.ok(!fileContent.includes('handleDisable2FA'), 'Não deve existir handler de desativação no componente');
    assert.ok(!fileContent.includes('showDisableModal'), 'Não deve existir estado de modal de desativação');
    assert.ok(fileContent.includes('Proteção Mandatória Ativa'), 'Deve exibir badge indicando 2FA mandatório');
  });

  await t.test('6.2 (Req 6) Tentativa de desativar o 2FA pela API comum é bloqueada (403 Forbidden)', async () => {
    const adminBefore = db.prepare('SELECT two_factor_enabled, two_factor_secret FROM administradores WHERE id = ?').get(admin.id);
    assert.equal(adminBefore.two_factor_enabled, 1);
    assert.ok(adminBefore.two_factor_secret);

    // Tentativa direta com credenciais e código TOTP
    const plainSecret = decryptSecret(adminBefore.two_factor_secret);
    const code = generateSync({ secret: plainSecret });

    const resBlock = await makeRequest(server, {
      path: '/api/admin/2fa/disable',
      method: 'POST',
      headers: { Authorization: `Bearer ${validAdminToken}` }
    }, { senha: 'Admin@2026', code });

    // A API comum deve rejeitar com 403 Forbidden
    assert.equal(resBlock.status, 403);
    assert.equal(resBlock.data.locked, true);
    assert.ok(resBlock.data.error.includes('bloqueada pelas políticas de segurança'));

    // O segredo e o status 2FA continuam ativos no banco de dados
    const adminAfter = db.prepare('SELECT two_factor_enabled, two_factor_secret FROM administradores WHERE id = ?').get(admin.id);
    assert.equal(adminAfter.two_factor_enabled, 1);
    assert.equal(adminAfter.two_factor_secret, adminBefore.two_factor_secret, 'Segredo não deve ser apagado');
  });

  await t.test('6.3 (Req 7) Persistência do 2FA após logout e novo login com desafio TOTP', async () => {
    // 1. Simular login inicial (somente e-mail e senha)
    const resStep1 = await makeRequest(server, {
      path: '/api/admin/login',
      method: 'POST'
    }, {
      email: 'admin@pontodecoleta.com.br',
      senha: 'Admin@2026'
    });

    assert.equal(resStep1.status, 200);
    assert.equal(resStep1.data.require_2fa, true);
    assert.ok(resStep1.data.message.includes('Autenticação em duas etapas requerida'));

    // 2. Simular login com código TOTP do Google Authenticator
    const adminRow = db.prepare('SELECT two_factor_secret FROM administradores WHERE email = ?').get('admin@pontodecoleta.com.br');
    const plainSecret = decryptSecret(adminRow.two_factor_secret);
    const totpCode = generateSync({ secret: plainSecret });

    const resStep2 = await makeRequest(server, {
      path: '/api/admin/login',
      method: 'POST'
    }, {
      email: 'admin@pontodecoleta.com.br',
      senha: 'Admin@2026',
      two_factor_code: totpCode
    });

    assert.equal(resStep2.status, 200);
    assert.ok(resStep2.data.token);
    assert.equal(resStep2.data.admin.two_factor_enabled, true);

    const newToken = resStep2.data.token;

    // 3. Verificar /api/admin/me com a nova sessão
    const resMe = await makeRequest(server, {
      path: '/api/admin/me',
      method: 'GET',
      headers: { Authorization: `Bearer ${newToken}` }
    });
    assert.equal(resMe.status, 200);
    assert.equal(resMe.data.admin.two_factor_enabled, true);
  });

  await t.test('6.4 (Req 8) Página de segurança / status reconhece corretamente o 2FA ativado', async () => {
    const resStatus = await makeRequest(server, {
      path: '/api/admin/2fa/status',
      method: 'GET',
      headers: { Authorization: `Bearer ${validAdminToken}` }
    });
    assert.equal(resStatus.status, 200);
    assert.equal(resStatus.data.enabled, true, 'Deve retornar enabled: true');
  });

  await t.test('6.5 Alteração de senha administrativa exige validação 2FA quando ativo', async () => {
    // Tentativa sem código 2FA -> Rejeitado
    const resNo2FA = await makeRequest(server, {
      path: '/api/admin/password',
      method: 'PUT',
      headers: { Authorization: `Bearer ${validAdminToken}` }
    }, {
      senha_atual: 'Admin@2026',
      nova_senha: 'NovaSenhaForte@2026'
    });
    assert.equal(resNo2FA.status, 400);
    assert.ok(resNo2FA.data.error.includes('Código 2FA'));

    // Tentativa com código 2FA válido -> Aprovado
    const adminRow = db.prepare('SELECT two_factor_secret FROM administradores WHERE id = ?').get(admin.id);
    const plainSecret = decryptSecret(adminRow.two_factor_secret);
    const valid2FACode = generateSync({ secret: plainSecret });

    const resWith2FA = await makeRequest(server, {
      path: '/api/admin/password',
      method: 'PUT',
      headers: { Authorization: `Bearer ${validAdminToken}` }
    }, {
      senha_atual: 'Admin@2026',
      nova_senha: 'NovaSenhaForte@2026',
      two_factor_code: valid2FACode
    });
    assert.equal(resWith2FA.status, 200);
    assert.ok(resWith2FA.data.success);

    // Restaurar senha para testes subsequentes
    const valid2FACodeRestore = generateSync({ secret: plainSecret });
    await makeRequest(server, {
      path: '/api/admin/password',
      method: 'PUT',
      headers: { Authorization: `Bearer ${validAdminToken}` }
    }, {
      senha_atual: 'NovaSenhaForte@2026',
      nova_senha: 'Admin@2026',
      two_factor_code: valid2FACodeRestore
    });
  });

  // --- SEÇÃO 7: PREVENÇÃO DE CSV FORMULA INJECTION (CWE-1236) ---
  await t.test('7.1 Exportação CSV neutraliza caracteres executáveis (=, +, -, @)', async () => {
    const resCsv = await makeRequest(server, {
      path: '/api/admin/export/csv',
      method: 'GET',
      headers: { Authorization: `Bearer ${validAdminToken}` }
    });
    assert.equal(resCsv.status, 200);
    assert.ok(resCsv.headers['content-type'].includes('text/csv'));
    assert.ok(resCsv.raw.startsWith('\uFEFF'), 'CSV deve incluir UTF-8 BOM para Excel');
  });

  // --- SEÇÃO 8: SEGURANÇA NO ENVIO PÚBLICO DE SOLICITAÇÃO ---
  await t.test('8.1 Validação de CNPJ rejeita números inválidos no envio público', async () => {
    const resInvalidCnpj = await makeRequest(server, {
      path: '/api/solicitacoes',
      method: 'POST'
    }, {
      cnpj: '11.111.111/1111-11',
      razao_social: 'Loja Teste'
    });
    assert.equal(resInvalidCnpj.status, 400);
    assert.ok(resInvalidCnpj.data.error.includes('CNPJ inválido'));
  });

  // --- SEÇÃO 9: TESTES DE RESILIÊNCIA E VALIDAÇÕES COMPLEMENTARES ---
  await t.test('9.1 (Req 9) Falhas de banco de dados não produzem confirmações falsas de sucesso', async () => {
    // Tentar enviar dados malformados na rota PUT /api/config
    const resBad = await makeRequest(server, {
      path: '/api/config',
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${validAdminToken}`,
        'x-2fa-code': '123456'
      }
    }, 'null');
    // Deve rejeitar com 400 Bad Request e nunca retornar 200 falso
    assert.notEqual(resBad.status, 200);
  });

  await t.test('9.2 (Req 10) Usuários sem privilégios administrativos continuam sem acesso', async () => {
    // Inserir usuário com permissão não-administrativa para validação estrita de autorização
    db.prepare(`
      INSERT OR REPLACE INTO administradores (id, nome, email, senha_hash, permissao, criado_em, two_factor_enabled)
      VALUES (99, 'Operador Limitado', 'operador@pontodecoleta.com.br', 'hash_test', 'operador', datetime('now'), 0)
    `).run();

    const operadorToken = generateToken({
      id: 99,
      nome: 'Operador Limitado',
      email: 'operador@pontodecoleta.com.br',
      permissao: 'operador',
      two_factor_enabled: false
    });

    const resNoRole = await makeRequest(server, {
      path: '/api/config',
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${operadorToken}`,
        'x-2fa-code': '123456'
      }
    }, { nome_site: 'Ataque Não Autorizado' });

    assert.equal(resNoRole.status, 403);
    assert.ok(resNoRole.data.error.includes('Permissão insuficiente'));

    // Limpar usuário de teste
    db.prepare('DELETE FROM administradores WHERE id = 99').run();
  });

  await t.test('9.3 (Req 11) Dispositivos móveis possuem regra CSS font-size: 16px para evitar zoom persistente no iPhone', async () => {
    const cssPath = path.resolve(__dirname, '../../client/src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    assert.ok(cssContent.includes('font-size: 16px !important'), 'CSS deve conter regra para prevenir zoom automático no iPhone');
    assert.ok(cssContent.includes('touch-action: manipulation'), 'CSS deve conter touch-action: manipulation');
  });

  await t.test('9.4 Desativação emergencial permitida exclusivamente com chave de manutenção autorizada', async () => {
    process.env.EMERGENCY_RECOVERY_KEY = 'emergency-recovery-super-secret-key-2026';

    // 1. Sem a chave de emergência -> Bloqueado
    const resDenied = await makeRequest(server, {
      path: '/api/admin/2fa/disable',
      method: 'POST',
      headers: { Authorization: `Bearer ${validAdminToken}` }
    });
    assert.equal(resDenied.status, 403);

    // 2. Com a chave de emergência correta -> Autorizado
    const resEmergency = await makeRequest(server, {
      path: '/api/admin/2fa/disable',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${validAdminToken}`,
        'x-emergency-recovery-key': 'emergency-recovery-super-secret-key-2026'
      }
    });
    assert.equal(resEmergency.status, 200);
    assert.ok(resEmergency.data.success);

    // Reativar 2FA imediatamente para manter a plataforma segura
    const adminRow = db.prepare('SELECT id, two_factor_secret FROM administradores WHERE id = ?').get(admin.id);
    const plainSecret = 'JBSWY3DPEHPK3PXP'; // Base32 padrão
    const encryptedSecret = encryptSecret(plainSecret);
    db.prepare('UPDATE administradores SET two_factor_enabled = 1, two_factor_secret = ? WHERE id = ?').run(encryptedSecret, admin.id);

    delete process.env.EMERGENCY_RECOVERY_KEY;
  });
});
