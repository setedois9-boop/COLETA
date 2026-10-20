import crypto from 'crypto';
import { generateSync } from 'otplib';

const STEP_SECONDS = 30;

export function getTotpStep(token, secret, now = Date.now()) {
  if (!/^\d{6}$/.test(String(token || '')) || !secret) return null;

  const currentStep = Math.floor(now / 1000 / STEP_SECONDS);
  const submitted = Buffer.from(token, 'ascii');

  for (const step of [currentStep, currentStep - 1, currentStep + 1]) {
    const expected = Buffer.from(generateSync({ secret, epoch: step * STEP_SECONDS }), 'ascii');
    if (expected.length === submitted.length && crypto.timingSafeEqual(expected, submitted)) {
      return step;
    }
  }

  return null;
}

export function consumeTotpToken(db, adminId, token, secret, now = Date.now()) {
  const step = getTotpStep(token, secret, now);
  if (step === null) return false;

  const result = db.prepare(`
    UPDATE administradores
    SET last_totp_step = ?
    WHERE id = ?
      AND (last_totp_step IS NULL OR last_totp_step < ?)
  `).run(step, adminId, step);

  return result.changes === 1;
}
