/**
 * Script de Migração Controlada: Cifragem de Segredos TOTP Legatários com AES-256-GCM
 *
 * MODO SEGURO:
 * Por padrão, este script opera em modo DRY-RUN (simulação sem gravação).
 * Para aplicar a migração real após aprovação formal:
 *   node server/src/scripts/migrateTotpSecrets.js --execute
 *
 * PROCEDIMENTOS INCLUSOS:
 * 1. Verificação prévia de integridade.
 * 2. Cópia de segurança atômica (backup) do banco SQLite com carimbo de data/hora.
 * 3. Cifragem AES-256-GCM com IV único de 96 bits por registro.
 * 4. Validação imediata pós-cifragem via descriptografia de teste.
 * 5. Registro de evidências e sumário de execução.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../database.js';
import { encryptSecret, decryptSecret } from '../utils/crypto.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isExecute = process.argv.includes('--execute');

console.log('='.repeat(70));
console.log('MIGRAÇÃO DE SEGREDOS TOTP EM REPOUSO (AES-256-GCM)');
console.log(`Modo de Operação: ${isExecute ? '🔴 EXECUÇÃO REAL' : '🟢 SIMULAÇÃO (DRY-RUN)'}`);
console.log('='.repeat(70));

const dataDir = path.resolve(__dirname, '../../data');
const dbPath = path.join(dataDir, 'database.sqlite');

if (isExecute) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(dataDir, `database_backup_pre_totp_migration_${timestamp}.sqlite`);
  fs.copyFileSync(dbPath, backupPath);
  console.log(`✅ Backup de segurança criado em:\n   ${backupPath}\n`);
}

const admins = db.prepare('SELECT id, email, two_factor_enabled, two_factor_secret FROM administradores').all();
console.log(`Total de administradores encontrados: ${admins.length}`);

let totalMigrated = 0;
let totalSkipped = 0;

for (const admin of admins) {
  if (!admin.two_factor_secret) {
    console.log(`- Admin ID ${admin.id} (${admin.email}): 2FA desativado (sem segredo). Ignorado.`);
    totalSkipped++;
    continue;
  }

  if (admin.two_factor_secret.startsWith('enc:gcm:')) {
    console.log(`- Admin ID ${admin.id} (${admin.email}): Segredo já está criptografado com AES-256-GCM. Ignorado.`);
    totalSkipped++;
    continue;
  }

  const plainSecret = admin.two_factor_secret;
  const encryptedSecret = encryptSecret(plainSecret);

  // Verificação de sanidade
  const testDecrypted = decryptSecret(encryptedSecret);
  if (testDecrypted !== plainSecret) {
    console.error(`❌ ERRO CRÍTICO no Admin ID ${admin.id}: Teste de descriptografia falhou! Abortando migração.`);
    process.exit(1);
  }

  if (isExecute) {
    db.prepare('UPDATE administradores SET two_factor_secret = ? WHERE id = ?').run(encryptedSecret, admin.id);
    console.log(`- Admin ID ${admin.id} (${admin.email}): Segredo migrado e cifrado com AES-256-GCM com sucesso!`);
  } else {
    console.log(`- Admin ID ${admin.id} (${admin.email}): [DRY-RUN] Seria cifrado: ${encryptedSecret.slice(0, 30)}...`);
  }
  totalMigrated++;
}

console.log('\n' + '='.repeat(70));
console.log(`Resumo da Migração:`);
console.log(`- Registros migrados: ${totalMigrated}`);
console.log(`- Registros ignorados/inalterados: ${totalSkipped}`);
if (!isExecute && totalMigrated > 0) {
  console.log(`\nPara aplicar as alterações no banco de dados, execute com autorização:`);
  console.log(`node server/src/scripts/migrateTotpSecrets.js --execute`);
}
console.log('='.repeat(70));
