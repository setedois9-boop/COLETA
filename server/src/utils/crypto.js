import crypto from 'crypto';
import { getJwtSecret } from '../middleware/auth.js';

/**
 * Utilitário de Criptografia Autenticada AES-256-GCM para Proteção de Segredos em Repouso (At-Rest).
 *
 * Especificações de Segurança:
 * - Algoritmo: AES-256-GCM (criptografia autenticada).
 * - IV/Nonce: 12 bytes aleatórios únicos por operação (NIST SP 800-38D).
 * - Tag de Autenticação: 16 bytes (128 bits) para validação estrita de integridade.
 * - Formato serializado: enc:gcm:<iv_hex>:<tag_hex>:<ciphertext_hex>
 * - Compatibilidade retroativa: se o segredo armazenado for um segredo legatário em texto puro (Base32),
 *   a função decryptSecret reconhece e retorna sem corromper as credenciais existentes.
 */

// Obtém a chave de 256 bits (32 bytes) a partir da variável de ambiente ou derivada do JWT_SECRET
export function getTotpEncryptionKey() {
  if (process.env.TOTP_ENCRYPTION_KEY && process.env.TOTP_ENCRYPTION_KEY.trim() !== '') {
    const rawKey = process.env.TOTP_ENCRYPTION_KEY.trim();
    if (rawKey.length === 64) {
      return Buffer.from(rawKey, 'hex');
    }
    return crypto.createHash('sha256').update(rawKey).digest();
  }

  // Se TOTP_ENCRYPTION_KEY não estiver explicitamente configurada,
  // deriva uma chave forte e determinística de 256 bits a partir do segredo base
  const baseSecret = process.env.JWT_SECRET && process.env.JWT_SECRET.trim() !== ''
    ? process.env.JWT_SECRET.trim()
    : '6c48d88a3273c0ea10957e9dbd2c789784f8541dbf2391bed73c8f54760116bf';
  return crypto.createHash('sha256').update(`totp-encryption-key-aes-256-gcm-v1:${baseSecret}`).digest();
}

/**
 * Criptografa um segredo TOTP em texto plano usando AES-256-GCM
 * @param {string} plainText
 * @returns {string} Segredo criptografado formatado
 */
export function encryptSecret(plainText) {
  if (!plainText || typeof plainText !== 'string') return plainText;

  // Evita re-criptografar o que já está criptografado
  if (plainText.startsWith('enc:gcm:')) {
    return plainText;
  }

  const key = getTotpEncryptionKey();
  const iv = crypto.randomBytes(12); // IV exclusivo de 96 bits
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let ciphertext = cipher.update(plainText, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex'); // Tag de 128 bits

  return `enc:gcm:${iv.toString('hex')}:${authTag}:${ciphertext}`;
}

/**
 * Descriptografa um segredo TOTP armazenado, verificando sua integridade.
 * Se for um valor legatário em texto puro, retorna o valor original com segurança.
 * @param {string} storedValue
 * @returns {string|null} Segredo em texto puro (Base32) ou null se falhar autenticação
 */
export function decryptSecret(storedValue) {
  if (!storedValue || typeof storedValue !== 'string') return storedValue;

  // Compatibilidade transparente com dados legatários em texto puro
  if (!storedValue.startsWith('enc:gcm:')) {
    return storedValue;
  }

  try {
    const parts = storedValue.split(':');
    if (parts.length !== 5) {
      return storedValue;
    }

    const [, , ivHex, tagHex, cipherHex] = parts;
    const key = getTotpEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    console.warn('[SECURITY] Falha ao decifrar segredo TOTP em repouso:', err.message);
    return null;
  }
}
