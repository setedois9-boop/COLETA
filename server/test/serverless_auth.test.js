import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import { generateSecret, generateSync } from 'otplib';
import handler from '../../api/index.js';

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end() {
      return this;
    }
  };
}

test('Vercel admin endpoints fail closed without durable Supabase credentials', async () => {
  const previousUrl = process.env.SUPABASE_URL;
  const previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  const response = createResponse();

  try {
    await handler({
      method: 'POST',
      url: '/api/admin/login',
      headers: {},
      socket: {}
    }, response);
  } finally {
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRoleKey;
  }

  assert.equal(response.statusCode, 503);
  assert.match(response.body.error, /SUPABASE_SERVICE_ROLE_KEY/);
});

test('Vercel persists site and WhatsApp settings without replacing admin security state', async () => {
  const previousUrl = process.env.SUPABASE_URL;
  const previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const jwtSecret = process.env.JWT_SECRET?.trim() ||
    '6c48d88a3273c0ea10957e9dbd2c789784f8541dbf2391bed73c8f54760116bf';
  const secret = generateSecret();
  const email = 'admin@pontodecoleta.com.br';
  let persistedConfig = {
    site_name: 'Nome já salvo',
    whatsapp_number: '5511987654321',
    whatsapp_message: 'Mensagem antiga',
    collect_financial_data: false,
    extra_existing_setting: 'preservar',
    admin_security_state: {
      admin_id: 1,
      email,
      two_factor_enabled: 1,
      two_factor_secret: secret,
      senha_hash: 'hash-de-teste',
      token_version: 7,
      last_totp_step: null,
      failed_login_attempts: {}
    }
  };

  const supabaseMock = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      if (req.method === 'GET' && req.url.startsWith('/rest/v1/configuracoes_site')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ configuracao: persistedConfig }));
        return;
      }
      if (req.method === 'POST' && req.url === '/rest/v1/rpc/merge_configuracoes_site') {
        const { p_config } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        persistedConfig = { ...persistedConfig, ...p_config };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('null');
        return;
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Unexpected mock request' }));
    });
  });

  await new Promise(resolve => supabaseMock.listen(0, '127.0.0.1', resolve));
  process.env.SUPABASE_URL = `http://127.0.0.1:${supabaseMock.address().port}`;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

  try {
    const getResponse = createResponse();
    await handler({
      method: 'GET',
      url: '/api/config',
      headers: {},
      socket: {}
    }, getResponse);

    assert.equal(getResponse.statusCode, 200);
    assert.equal(getResponse.body.nome_site, 'Nome já salvo');
    assert.equal(getResponse.body.whatsapp_numero, '5511987654321');
    assert.equal(getResponse.body.whatsapp_mensagem, 'Mensagem antiga');
    assert.equal(getResponse.body.coleta_bancaria_ativa, false);
    assert.equal(JSON.stringify(getResponse.body).includes(secret), false);

    const token = jwt.sign(
      { id: 1, email, token_version: 7, scope: 'admin' },
      jwtSecret,
      { expiresIn: '5m' }
    );
    const code = generateSync({ secret });
    const saveResponse = createResponse();
    await handler({
      method: 'PUT',
      url: '/api/config',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json'
      },
      body: {
        nome_site: 'Nome atualizado',
        whatsapp_numero: '5511912345678',
        whatsapp_mensagem: 'Nova mensagem de atendimento',
        two_factor_code: code
      },
      socket: {}
    }, saveResponse);

    assert.equal(saveResponse.statusCode, 200);
    assert.equal(persistedConfig.site_name, 'Nome atualizado');
    assert.equal(persistedConfig.whatsapp_number, '5511912345678');
    assert.equal(persistedConfig.whatsapp_message, 'Nova mensagem de atendimento');
    assert.equal(persistedConfig.extra_existing_setting, 'preservar');
    assert.equal(persistedConfig.admin_security_state.two_factor_enabled, 1);
    assert.ok(persistedConfig.admin_security_state.last_totp_step);

    const refreshedResponse = createResponse();
    await handler({
      method: 'GET',
      url: '/api/config',
      headers: {},
      socket: {}
    }, refreshedResponse);
    assert.equal(refreshedResponse.statusCode, 200);
    assert.equal(refreshedResponse.body.whatsapp_numero, '5511912345678');
    assert.equal(refreshedResponse.body.whatsapp_mensagem, 'Nova mensagem de atendimento');
  } finally {
    await new Promise((resolve, reject) => {
      supabaseMock.close(error => error ? reject(error) : resolve());
    });
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRoleKey;
  }
});

test('WhatsApp number persists via fallback when RPC is missing, rejects invalid numbers and surfaces write failures', async () => {
  const previousUrl = process.env.SUPABASE_URL;
  const previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const jwtSecret = process.env.JWT_SECRET?.trim() ||
    '6c48d88a3273c0ea10957e9dbd2c789784f8541dbf2391bed73c8f54760116bf';
  const secret = generateSecret();
  const email = 'admin@pontodecoleta.com.br';
  let failWrites = false;
  let persistedConfig = {
    whatsapp_number: '5511900000000',
    admin_security_state: {
      admin_id: 1, email, two_factor_enabled: 1, two_factor_secret: secret,
      senha_hash: 'hash-de-teste', token_version: 9, last_totp_step: null, failed_login_attempts: {}
    }
  };

  const supabaseMock = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const send = (status, body) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
      };
      if (req.method === 'GET' && req.url.startsWith('/rest/v1/configuracoes_site')) {
        return send(200, { configuracao: persistedConfig });
      }
      if (req.method === 'POST' && req.url === '/rest/v1/rpc/merge_configuracoes_site') {
        return send(404, { code: 'PGRST202', message: 'Could not find the function public.merge_configuracoes_site' });
      }
      if (req.method === 'POST' && req.url.startsWith('/rest/v1/configuracoes_site')) {
        if (failWrites) return send(403, { message: 'permission denied' });
        const row = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        persistedConfig = row.configuracao;
        return send(201, null);
      }
      return send(404, { message: 'Unexpected mock request' });
    });
  });

  await new Promise(resolve => supabaseMock.listen(0, '127.0.0.1', resolve));
  process.env.SUPABASE_URL = `http://127.0.0.1:${supabaseMock.address().port}`;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

  const token = jwt.sign({ id: 1, email, token_version: 9, scope: 'admin' }, jwtSecret, { expiresIn: '5m' });
  const put = async (body, code = generateSync({ secret })) => {
    const response = createResponse();
    await handler({
      method: 'PUT',
      url: '/api/config',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: { ...body, two_factor_code: code },
      socket: {}
    }, response);
    return response;
  };

  try {
    const invalid = await put({ whatsapp_numero: '123' });
    assert.equal(invalid.statusCode, 400);
    assert.equal(persistedConfig.whatsapp_number, '5511900000000');

    const saved = await put({ whatsapp_numero: '+55 (11) 91234-5678' });
    assert.equal(saved.statusCode, 200);
    assert.equal(persistedConfig.whatsapp_numero, '5511912345678');
    assert.equal(persistedConfig.whatsapp_number, '5511912345678');
    assert.equal(persistedConfig.admin_security_state.two_factor_enabled, 1);

    const getResponse = createResponse();
    await handler({ method: 'GET', url: '/api/config', headers: {}, socket: {} }, getResponse);
    assert.equal(getResponse.body.whatsapp_numero, '5511912345678');
    assert.equal(getResponse.headers['Cache-Control'], 'no-store');

    failWrites = true;
    await new Promise(resolve => setTimeout(resolve, 0));
    const failed = await put({ whatsapp_numero: '5511977776666' }, generateSync({ secret, epoch: Math.floor(Date.now() / 1000) + 30 }));
    assert.notEqual(failed.statusCode, 200);
    assert.equal(persistedConfig.whatsapp_numero, '5511912345678');
  } finally {
    await new Promise((resolve, reject) => {
      supabaseMock.close(error => error ? reject(error) : resolve());
    });
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRoleKey;
  }
});