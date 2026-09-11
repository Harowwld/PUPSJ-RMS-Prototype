import crypto from "node:crypto";

const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

function safeEqualHex(left, right) {
  if (!/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right)) return false;
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
  const derived = crypto.scryptSync(String(password), salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 32 * 1024 * 1024,
  }).toString("hex");
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${derived}`;
}

function verifyScryptPassword(password, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, nText, rText, pText, salt, expected] = parts;
  const n = Number(nText);
  const r = Number(rText);
  const p = Number(pText);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  if (n < 2 ** 10 || n > 2 ** 20 || (n & (n - 1)) !== 0 || r < 1 || r > 32 || p < 1 || p > 16) return false;
  if (!/^[a-f0-9]{32,}$/i.test(salt) || !/^[a-f0-9]{128}$/i.test(expected)) return false;

  try {
    const actual = crypto.scryptSync(String(password), salt, KEY_LENGTH, {
      N: n,
      r,
      p,
      maxmem: Math.max(32 * 1024 * 1024, 128 * n * r + 1024),
    }).toString("hex");
    return safeEqualHex(actual, expected);
  } catch {
    return false;
  }
}

export function verifyPasswordHash(password, stored) {
  const value = String(stored || "");
  if (value.startsWith("scrypt$")) {
    return { valid: verifyScryptPassword(password, value), needsRehash: false };
  }

  if (/^[a-f0-9]{64}$/i.test(value)) {
    const legacy = crypto.createHash("sha256").update(String(password)).digest("hex");
    const valid = safeEqualHex(legacy, value);
    return { valid, needsRehash: valid };
  }

  // Legacy student format: salt:derived-scrypt. Keep this only as a
  // migration path; successful verification is immediately eligible for
  // replacement by the versioned format above.
  const legacyStudentParts = value.split(":");
  if (legacyStudentParts.length === 2 &&
      /^[a-zA-Z0-9._-]{1,128}$/.test(legacyStudentParts[0]) &&
      /^[a-f0-9]{128}$/i.test(legacyStudentParts[1])) {
    try {
      const actual = crypto.scryptSync(String(password), legacyStudentParts[0], KEY_LENGTH).toString("hex");
      const valid = safeEqualHex(actual, legacyStudentParts[1]);
      return { valid, needsRehash: valid };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }

  return { valid: false, needsRehash: false };
}
