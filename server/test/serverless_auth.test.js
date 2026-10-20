import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../../api/index.js';

test('Vercel admin endpoints fail closed without durable Supabase credentials', async () => {
  const previousUrl = process.env.SUPABASE_URL;
  const previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  const response = {
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
