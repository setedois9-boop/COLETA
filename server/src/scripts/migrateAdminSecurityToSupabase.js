import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import db, { initDatabase } from '../database.js';
import { decryptSecret, encryptSecret } from '../utils/crypto.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });
const execute = process.argv.includes('--execute');
const replaceExisting = process.argv.includes('--replace');
const knownArgs = new Set(['--execute', '--replace']);
const unknownArgs = process.argv.slice(2).filter(arg => !knownArgs.has(arg));

if (unknownArgs.length) {
  throw new Error(`Argumentos desconhecidos: ${unknownArgs.join(', ')}`);
}

if (replaceExisting && !execute) {
  throw new Error('--replace só pode ser usado em conjunto com --execute.');
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl?.trim() || !serviceRoleKey?.trim()) {
  throw new Error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente antes de executar a migração.');
}

initDatabase();

const admin = db.prepare(`
  SELECT id, email, senha_hash, permissao, two_factor_enabled,
         two_factor_secret, two_factor_temp_secret, token_version,
         last_totp_code, last_totp_time, last_totp_step
  FROM administradores
  ORDER BY id
  LIMIT 1
`).get();

if (!admin) {
  throw new Error('Nenhum administrador foi encontrado no SQLite de origem.');
}

const serverlessStatePath = path.resolve(__dirname, '../../../api/persistent_state.json');
if (fs.existsSync(serverlessStatePath)) {
  const serverlessState = JSON.parse(fs.readFileSync(serverlessStatePath, 'utf8'));
  const targetAdmin = serverlessState.admin;
  if (
    !targetAdmin ||
    Number(targetAdmin.id) !== Number(admin.id) ||
    String(targetAdmin.email).toLowerCase() !== String(admin.email).toLowerCase()
  ) {
    throw new Error('O administrador SQLite não corresponde à conta inicial da API serverless. Migração cancelada.');
  }
}

function migrateSecret(secret, description) {
  if (!secret) return null;
  const plainSecret = decryptSecret(secret);
  if (!plainSecret) {
    throw new Error(`Não foi possível validar o segredo ${description} de origem.`);
  }
  return encryptSecret(plainSecret);
}

const state = {
  admin_id: admin.id,
  email: admin.email,
  two_factor_enabled: Number(admin.two_factor_enabled) === 1 ? 1 : 0,
  two_factor_secret: migrateSecret(admin.two_factor_secret, 'TOTP'),
  two_factor_temp_secret: migrateSecret(admin.two_factor_temp_secret, 'TOTP pendente'),
  senha_hash: admin.senha_hash,
  token_version: Number(admin.token_version || 1),
  last_totp_code: admin.last_totp_code || null,
  last_totp_time: admin.last_totp_time || null,
  last_totp_step: admin.last_totp_step ?? null,
  failed_login_attempts: {},
  atualizado_em: new Date().toISOString()
};

if (state.two_factor_enabled === 1 && !state.two_factor_secret) {
  throw new Error('A conta indica 2FA ativo, mas não possui segredo TOTP. Migração cancelada.');
}

const supabase = createClient(supabaseUrl.trim(), serviceRoleKey.trim(), {
  auth: { persistSession: false }
});
const { data: existing, error: readError } = await supabase
  .from('configuracoes_site')
  .select('id, configuracao')
  .eq('id', true)
  .maybeSingle();

if (readError) {
  throw new Error(`Não foi possível consultar o estado administrativo no Supabase: ${readError.message}`);
}

const currentConfig = existing?.configuracao || {};
if (typeof currentConfig !== 'object' || Array.isArray(currentConfig)) {
  throw new Error('As configurações existentes no Supabase possuem um formato inválido. Migração cancelada.');
}
const existingSecurityState = currentConfig.admin_security_state;

if (existingSecurityState && !replaceExisting) {
  const existingAdminId = existingSecurityState.admin_id;
  const sameAccount = existingAdminId === undefined || Number(existingAdminId) === Number(admin.id);
  throw new Error(
    sameAccount
      ? 'Já existe estado administrativo no Supabase. Revise-o; para substituí-lo intencionalmente, use --execute --replace.'
      : 'O estado existente no Supabase pertence a outro administrador. Migração cancelada.'
  );
}

console.log(`Administrador SQLite ID: ${admin.id}`);
console.log(`2FA habilitado na origem: ${state.two_factor_enabled === 1}`);
console.log(`Configuração singleton do Supabase encontrada: ${Boolean(existing)}`);
console.log(`Estado administrativo já existe no Supabase: ${Boolean(existingSecurityState)}`);

if (!execute) {
  console.log('Simulação concluída sem gravar dados. Revise as variáveis de chave e use --execute para aplicar.');
} else {
  const { error: writeError } = await supabase
    .from('configuracoes_site')
    .upsert({
      id: true,
      configuracao: {
        ...currentConfig,
        admin_security_state: state
      },
      atualizado_em: new Date().toISOString()
    }, { onConflict: 'id' });

  if (writeError) {
    throw new Error(`Não foi possível persistir o estado administrativo no Supabase: ${writeError.message}`);
  }

  const { data: saved, error: verifyError } = await supabase
    .from('configuracoes_site')
    .select('configuracao')
    .eq('id', true)
    .single();

  const savedState = saved?.configuracao?.admin_security_state;
  const savedConfig = saved?.configuracao || {};
  const preservedConfig = Object.fromEntries(
    Object.entries(currentConfig).filter(([key]) => key !== 'admin_security_state')
  );
  const persistedPublicConfig = Object.fromEntries(
    Object.entries(savedConfig).filter(([key]) => key !== 'admin_security_state')
  );
  if (verifyError || Number(savedState?.admin_id) !== Number(admin.id) ||
      Boolean(Number(savedState?.two_factor_enabled) === 1) !== (state.two_factor_enabled === 1) ||
      savedState?.two_factor_secret !== state.two_factor_secret ||
      JSON.stringify(persistedPublicConfig) !== JSON.stringify(preservedConfig)) {
    throw new Error('A verificação pós-migração falhou. Não foi possível confirmar o estado de segurança gravado.');
  }

  console.log('Estado administrativo persistido e verificado no Supabase.');
}
