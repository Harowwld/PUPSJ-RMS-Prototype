import crypto from 'node:crypto';

const ALGO = 'aes-256-cbc';

function getEncryptionKey() {
  const keyHex = process.env.PII_ENCRYPTION_KEY;
  if (!keyHex) {
    // Fallback to JWT_SECRET for development ease if PII_ENCRYPTION_KEY is missing
    const fallback = process.env.JWT_SECRET || "default_insecure_fallback_key_123456";
    return crypto.createHash("sha256").update(fallback).digest();
  }
  if (keyHex.length === 64) {
    return Buffer.from(keyHex, "hex");
  }
  return crypto.createHash("sha256").update(keyHex).digest();
}

function getDecryptionCandidateKeys() {
  const candidates = [];
  try {
    candidates.push(getEncryptionKey());
  } catch {}

  const stringCandidates = [
    process.env.JWT_SECRET,
    process.env.PII_ENCRYPTION_KEY,
    "default_insecure_fallback_key_123456",
    "replace_with_a_long_random_value",
  ].filter(Boolean);

  for (const s of stringCandidates) {
    try {
      candidates.push(crypto.createHash("sha256").update(s).digest());
      if (s.length === 64 && /^[0-9a-fA-F]+$/.test(s)) {
        candidates.push(Buffer.from(s, "hex"));
      }
    } catch {}
  }

  const seen = new Set();
  const unique = [];
  for (const k of candidates) {
    const h = k.toString("hex");
    if (!seen.has(h)) {
      seen.add(h);
      unique.push(k);
    }
  }
  return unique;
}

/**
 * Deterministically encrypts a string so it can be searched with exact matches in the DB.
 */
export function encryptPII(text) {
  if (!text) return text;
  if (typeof text === 'string' && text.startsWith('enc:v1:')) {
    return text;
  }
  try {
    const key = getEncryptionKey();
    // Deterministic IV based on the text itself (HMAC)
    const iv = crypto.createHmac('md5', key).update(text).digest();

    const cipher = crypto.createCipheriv(ALGO, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `enc:v1:${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error("[encryptPII Error]:", error);
    return text;
  }
}

export function decryptPII(ciphertext) {
  if (!ciphertext || typeof ciphertext !== 'string' || !ciphertext.startsWith('enc:v1:')) {
    return ciphertext; // Not encrypted or old format
  }
  try {
    const parts = ciphertext.split(':');
    if (parts.length < 4) return ciphertext;
    const iv = Buffer.from(parts[2], 'hex');
    const encryptedText = parts[3];
    const keys = getDecryptionCandidateKeys();

    for (const key of keys) {
      try {
        const decipher = crypto.createDecipheriv(ALGO, key, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } catch {
        // Try next candidate key
      }
    }

    console.error("[decryptPII Error]: Could not decrypt with any candidate key");
    return ciphertext; // Fallback to returning ciphertext if all decryptions fail
  } catch (error) {
    console.error("[decryptPII Error]:", error);
    return ciphertext;
  }
}
