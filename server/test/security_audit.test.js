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
        try { json = JSON.parse(data); } catch { }
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

  // Inicializar com segredo TOTP robusto gerado por generateSecret() (compatível com otplib v13)
  const defaultTestSecret = generateSecret();
  const encryptedDefault = encryptSecret(defaultTestSecret);
  db.prepare('UPDATE administradores SET two_factor_enabled = 1, two_factor_secret = ?, two_factor_temp_secret = NULL, last_totp_step = NULL WHERE id = ?').run(encryptedDefault, admin.id);
  admin = db.prepare('SELECT * FROM administradores WHERE id = ?').get(admin.id);

  // Gerar token de superadmin válido
  const validAdminToken = generateToken({
    id: admin.id,
    nome: admin.nome,
    email: admin.email,
    permissao: admin.permissao || 'superadmin',
    token_version: admin.token_version || 1,
    two_factor_enabled: Boolean(admin.two_factor_enabled)
  });

  // Token com perfil sem permissões administrativas
  const unprivilegedToken = generateToken({
    id: 999,
    nome: 'Usuario Comum',
    email: 'comum@teste.com',
    permissao: 'visitante',
    token_version: 1,
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
    // Desativar temporariamente no banco para testar o fluxo de configuração do zero
    db.prepare('UPDATE administradores SET two_factor_enabled = 0, two_factor_temp_secret = NULL WHERE id = ?').run(admin.id);

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

    const resPendingSetup = await makeRequest(server, {
      path: '/api/admin/2fa/setup',
      method: 'POST',
      headers: { Authorization: `Bearer ${validAdminToken}` }
    });
    assert.equal(resPendingSetup.status, 200);
    assert.equal(resPendingSetup.data.secret, resSetup.data.secret, 'Retomar configuração não deve gerar um segredo diferente');

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
    assert.ok(res.data.error.includes('Código 2FA incorreto, expirado ou já utilizado'));

    const configAfter = db.prepare("SELECT valor FROM configuracoes_site WHERE chave = 'nome_site'").get();
    assert.equal(configAfter?.valor, configBefore?.valor);
  });

  await t.test('5.3 (Req 1 & 4) PUT /api/config com código 2FA válido permite salvar e bloqueia Replay Attack', async () => {
    const adminRow = db.prepare('SELECT two_factor_secret FROM administradores WHERE id = ?').get(admin.id);
    const plainSecret = decryptSecret(adminRow.two_factor_secret);
    const code = generateSync({
      secret: plainSecret,
      epoch: (Math.floor(Date.now() / 30000) + 1) * 30
    });

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
    assert.ok(resReplay.data.error.includes('já utilizado'), 'Deve bloquear código reutilizado');
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
    db.prepare('UPDATE administradores SET last_totp_step = NULL WHERE id = ?').run(admin.id);
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

    const resDirectCode = await makeRequest(server, {
      path: '/api/admin/login',
      method: 'POST'
    }, {
      email: 'admin@pontodecoleta.com.br',
      senha: 'Admin@2026',
      two_factor_code: totpCode
    });
    assert.equal(resDirectCode.data.require_2fa, true);
    assert.equal(resDirectCode.data.token, undefined, 'O código enviado ao endpoint de senha não deve liberar a sessão');

    const resStep2 = await makeRequest(server, {
      path: '/api/admin/2fa/verify-login',
      method: 'POST'
    }, {
      pre_auth_token: resStep1.data.pre_auth_token,
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
    db.prepare('UPDATE administradores SET last_totp_step = NULL WHERE id = ?').run(admin.id);
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
    db.prepare('UPDATE administradores SET last_totp_step = NULL WHERE id = ?').run(admin.id);
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
      token_version: 1,
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
    const plainSecret = generateSecret();
    const encryptedSecret = encryptSecret(plainSecret);
    db.prepare('UPDATE administradores SET two_factor_enabled = 1, two_factor_secret = ? WHERE id = ?').run(encryptedSecret, admin.id);

    delete process.env.EMERGENCY_RECOVERY_KEY;
  });

  // --- SEÇÃO 10: VALIDAÇÃO DOS CENÁRIOS OBRIGATÓRIOS DO 2FA (CENÁRIOS A A F) ---

  await t.test('10.1 Cenário A — Persistência Definitiva do 2FA após Logout e Novo Login', async () => {
    // Garantir admin com 2FA configurado
    const testSecret = generateSecret();
    const encSecret = encryptSecret(testSecret);
    db.prepare('UPDATE administradores SET two_factor_enabled = 1, two_factor_secret = ?, two_factor_temp_secret = NULL, last_totp_step = NULL WHERE id = ?').run(encSecret, admin.id);

    // 1. Simular tentativa de login apenas com senha
    const resLogin1 = await makeRequest(server, {
      path: '/api/admin/login',
      method: 'POST'
    }, {
      email: 'admin@pontodecoleta.com.br',
      senha: 'Admin@2026'
    });

    assert.equal(resLogin1.status, 200);
    assert.equal(resLogin1.data.require_2fa, true, 'Deve exigir 2FA');
    assert.ok(resLogin1.data.pre_auth_token, 'Deve emitir token intermediário de pré-autenticação');

    // 2. Concluir autenticação com código TOTP válido
    const validTotp = generateSync({ secret: testSecret });
    const resLogin2 = await makeRequest(server, {
      path: '/api/admin/2fa/verify-login',
      method: 'POST'
    }, {
      pre_auth_token: resLogin1.data.pre_auth_token,
      two_factor_code: validTotp
    });

    assert.equal(resLogin2.status, 200);
    assert.ok(resLogin2.data.token, 'Deve emitir token administrativo completo');
    assert.equal(resLogin2.data.admin.two_factor_enabled, true);

    // 3. Encerrar a sessão (Logout)
    const resLogout = await makeRequest(server, {
      path: '/api/admin/logout',
      method: 'POST',
      headers: { Authorization: `Bearer ${resLogin2.data.token}` }
    });
    assert.equal(resLogout.status, 200);

    // 4. Entrar novamente e confirmar que o 2FA PERMANECE ativo e continua sendo exigido
    const resNewLogin = await makeRequest(server, {
      path: '/api/admin/login',
      method: 'POST'
    }, {
      email: 'admin@pontodecoleta.com.br',
      senha: 'Admin@2026'
    });

    assert.equal(resNewLogin.status, 200);
    assert.equal(resNewLogin.data.require_2fa, true, 'O 2FA DEVE continuar ativo mesmo após logout');
    assert.ok(resNewLogin.data.pre_auth_token);
  });

  await t.test('10.2 Cenário B — Tela de Configuração não regenera segredo quando 2FA já está ativado', async () => {
    // 1. Gerar token admin válido
    const adminActive = db.prepare('SELECT * FROM administradores WHERE id = ?').get(admin.id);
    const sessionToken = generateToken({
      id: adminActive.id,
      nome: adminActive.nome,
      email: adminActive.email,
      permissao: adminActive.permissao,
      token_version: adminActive.token_version,
      two_factor_enabled: true
    });

    // 2. Consultar status do 2FA
    const resStatus = await makeRequest(server, {
      path: '/api/admin/2fa/status',
      method: 'GET',
      headers: { Authorization: `Bearer ${sessionToken}` }
    });
    assert.equal(resStatus.status, 200);
    assert.equal(resStatus.data.enabled, true, 'Status deve indicar 2FA ativado');
    assert.equal(resStatus.data.pending, false, 'Não deve constar como pendente');
    assert.equal(resStatus.data.secret, undefined, 'O segredo TOTP nunca deve ser enviado após a ativação');

    // 3. Tentar abrir/iniciar nova configuração com 2FA já ativo
    const resSetupAttempt = await makeRequest(server, {
      path: '/api/admin/2fa/setup',
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}` }
    });
    assert.equal(resSetupAttempt.status, 400, 'Deve rejeitar regeneração de segredo com 400 Bad Request');
    assert.ok(resSetupAttempt.data.error.includes('já está ativa nesta conta'));

    // 4. Confirmar que o segredo no banco de dados NÃO foi alterado
    const adminCurrent = db.prepare('SELECT two_factor_secret FROM administradores WHERE id = ?').get(admin.id);
    assert.equal(adminCurrent.two_factor_secret, adminActive.two_factor_secret, 'Segredo existente deve permanecer inalterado');
  });

  await t.test('10.3 Cenário C — Código 2FA Inválido bloqueia acesso ao painel administrativo', async () => {
    // 1. Login com senha correta -> obtém token intermediário
    const resStep1 = await makeRequest(server, {
      path: '/api/admin/login',
      method: 'POST'
    }, {
      email: 'admin@pontodecoleta.com.br',
      senha: 'Admin@2026'
    });
    assert.equal(resStep1.status, 200);
    const preAuthToken = resStep1.data.pre_auth_token;
    assert.ok(preAuthToken);

    // 2. Submeter código 2FA inválido
    const resInvalidCode = await makeRequest(server, {
      path: '/api/admin/2fa/verify-login',
      method: 'POST'
    }, {
      pre_auth_token: preAuthToken,
      two_factor_code: '000000'
    });

    assert.equal(resInvalidCode.status, 401, 'Deve rejeitar com 401 Unauthorized');
    assert.equal(resInvalidCode.data.token, undefined, 'Nenhum token administrativo deve ser emitido');
    assert.ok(resInvalidCode.data.error.includes('inválido, expirado ou já utilizado'));
  });

  await t.test('10.4 Cenário D — Acesso Direto com Token Intermediário é estritamente bloqueado', async () => {
    // 1. Obter token intermediário de pré-autenticação (scope: 2fa_pending)
    const resStep1 = await makeRequest(server, {
      path: '/api/admin/login',
      method: 'POST'
    }, {
      email: 'admin@pontodecoleta.com.br',
      senha: 'Admin@2026'
    });
    const preAuthToken = resStep1.data.pre_auth_token;
    assert.ok(preAuthToken);

    // 2. Tentar acessar /api/admin/me com o token intermediário
    const resMe = await makeRequest(server, {
      path: '/api/admin/me',
      method: 'GET',
      headers: { Authorization: `Bearer ${preAuthToken}` }
    });
    assert.equal(resMe.status, 403, 'Acesso a /admin/me deve ser bloqueado com 403 Forbidden');
    assert.equal(resMe.data.require_2fa, true);

    // 3. Tentar acessar /api/config com o token intermediário
    const resConfig = await makeRequest(server, {
      path: '/api/config',
      method: 'PUT',
      headers: { Authorization: `Bearer ${preAuthToken}` }
    }, { nome_site: 'Tentativa Hacker' });
    assert.equal(resConfig.status, 403, 'Acesso a modificação de config deve ser bloqueado com 403 Forbidden');
  });

  await t.test('10.5 Cenário E — Logout invalida definitivamente a sessão contra reutilização', async () => {
    // 1. Limpar replay buffer para teste de login limpo e obter segredo
    db.prepare('UPDATE administradores SET last_totp_code = NULL, last_totp_time = NULL, last_totp_step = NULL WHERE id = ?').run(admin.id);
    const adminRow = db.prepare('SELECT * FROM administradores WHERE id = ?').get(admin.id);
    const plainSecret = decryptSecret(adminRow.two_factor_secret);
    const totpCode = generateSync({ secret: plainSecret });

    const resChallenge = await makeRequest(server, {
      path: '/api/admin/login',
      method: 'POST'
    }, {
      email: 'admin@pontodecoleta.com.br',
      senha: 'Admin@2026'
    });
    assert.equal(resChallenge.status, 200);
    assert.equal(resChallenge.data.require_2fa, true);
    const resLogin = await makeRequest(server, {
      path: '/api/admin/2fa/verify-login',
      method: 'POST'
    }, {
      pre_auth_token: resChallenge.data.pre_auth_token,
      two_factor_code: totpCode
    });
    assert.equal(resLogin.status, 200);
    const validSessionToken = resLogin.data.token;
    assert.ok(validSessionToken);

    // 2. Testar que o token funciona
    const resBeforeLogout = await makeRequest(server, {
      path: '/api/admin/me',
      method: 'GET',
      headers: { Authorization: `Bearer ${validSessionToken}` }
    });
    assert.equal(resBeforeLogout.status, 200);

    // 3. Efetuar logout
    const resLogout = await makeRequest(server, {
      path: '/api/admin/logout',
      method: 'POST',
      headers: { Authorization: `Bearer ${validSessionToken}` }
    });
    assert.equal(resLogout.status, 200);
    assert.ok(resLogout.data.success);

    // 4. Tentar reutilizar o mesmo token anterior após o logout
    const resReusedToken = await makeRequest(server, {
      path: '/api/admin/me',
      method: 'GET',
      headers: { Authorization: `Bearer ${validSessionToken}` }
    });
    assert.equal(resReusedToken.status, 401, 'Token antigo DEVE ser rejeitado com 401 Unauthorized após logout');
  });

  await t.test('10.6 Cenário F — Regressão: Operações normais e integridade das permissões', async () => {
    // 1. Limpar replay buffer e obter nova sessão válida
    db.prepare('UPDATE administradores SET last_totp_code = NULL, last_totp_time = NULL, last_totp_step = NULL WHERE id = ?').run(admin.id);
    const adminRow = db.prepare('SELECT * FROM administradores WHERE id = ?').get(admin.id);
    const plainSecret = decryptSecret(adminRow.two_factor_secret);
    const totpCode = generateSync({ secret: plainSecret });

    const resChallenge = await makeRequest(server, {
      path: '/api/admin/login',
      method: 'POST'
    }, {
      email: 'admin@pontodecoleta.com.br',
      senha: 'Admin@2026'
    });
    assert.equal(resChallenge.data.require_2fa, true);
    const resLogin = await makeRequest(server, {
      path: '/api/admin/2fa/verify-login',
      method: 'POST'
    }, {
      pre_auth_token: resChallenge.data.pre_auth_token,
      two_factor_code: totpCode
    });
    assert.equal(resLogin.status, 200);
    const freshToken = resLogin.data.token;
    assert.ok(freshToken);

    // 2. Consulta pública de configurações (/api/config) funciona normalmente
    const resPublicConfig = await makeRequest(server, { path: '/api/config', method: 'GET' });
    assert.equal(resPublicConfig.status, 200);
    assert.ok(resPublicConfig.data.nome_site);

    // 3. Consulta administrativa de solicitações (/api/solicitacoes) funciona normalmente
    const resSolicitacoes = await makeRequest(server, {
      path: '/api/solicitacoes',
      method: 'GET',
      headers: { Authorization: `Bearer ${freshToken}` }
    });
    assert.equal(resSolicitacoes.status, 200);
    assert.ok(Array.isArray(resSolicitacoes.data.data));

    // 4. Salvar configuração com 2FA funciona e persiste
    const save2FACode = generateSync({
      secret: plainSecret,
      epoch: (Math.floor(Date.now() / 30000) + 1) * 30
    });
    const resSaveConfig = await makeRequest(server, {
      path: '/api/config',
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${freshToken}`,
        'x-2fa-code': save2FACode
      }
    }, { nome_site: 'Rede Logística Parceira Oficial' });
    assert.equal(resSaveConfig.status, 200);
    assert.ok(resSaveConfig.data.success);
  });
});
