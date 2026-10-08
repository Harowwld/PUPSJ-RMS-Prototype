import crypto from 'node:crypto';

const ALGO = 'aes-256-cbc';

function getEncryptionKey() {
  const keyHex = process.env.PII_ENCRYPTION_KEY;
  if (!keyHex) {
    // Fallback to JWT_SECRET for development ease if PII_ENCRYPTION_KEY is missing
    const rawFallback = process.env.JWT_SECRET || "default_insecure_fallback_key_123456";
    const fallback = rawFallback.replace(/^["']|["']$/g, "").trim();
    return crypto.createHash("sha256").update(fallback).digest();
  }
  const cleanKeyHex = keyHex.replace(/^["']|["']$/g, "").trim();
  if (cleanKeyHex.length === 64) {
    return Buffer.from(cleanKeyHex, "hex");
  }
  return crypto.createHash("sha256").update(cleanKeyHex).digest();
}

function getDecryptionCandidateKeys() {
  const candidates = [];
  try {
    candidates.push(getEncryptionKey());
  } catch {}

  const rawCandidates = [
    process.env.JWT_SECRET,
    process.env.PII_ENCRYPTION_KEY,
    process.env.BACKUP_ENCRYPTION_KEY,
    process.env.PII_PREVIOUS_KEYS,
    "b145f111c2cdc740b6705bd81b46e8a05ef5039993c1fd717240e5cb6a075766",
    "default_insecure_fallback_key_123456",
    "replace_with_a_long_random_value",
  ].filter(Boolean);

  const stringCandidates = [];
  for (const item of rawCandidates) {
    for (const part of String(item).split(",")) {
      const clean = part.replace(/^["']|["']$/g, "").trim();
      if (clean) stringCandidates.push(clean);
    }
  }

  for (const s of stringCandidates) {
    try {
      candidates.push(crypto.createHash("sha256").update(s).digest());
      if (s.length === 64 && /^[0-9a-fA-F]+$/.test(s)) {
        candidates.push(Buffer.from(s, "hex"));
      }
      if (Buffer.byteLength(s) === 32) {
        candidates.push(Buffer.from(s, "utf8"));
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

function decryptSingleToken(token, keys) {
  if (!token || typeof token !== "string" || !token.startsWith("enc:v1:")) {
    return token;
  }
  try {
    const parts = token.split(":");
    if (parts.length < 4) return token;
    const iv = Buffer.from(parts[2], "hex");
    const encryptedText = parts[3];

    for (const key of keys) {
      try {
        const decipher = crypto.createDecipheriv(ALGO, key, iv);
        let decrypted = decipher.update(encryptedText, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
      } catch {
        // Try next candidate key
      }
    }
    return token;
  } catch {
    return token;
  }
}

export function decryptPII(ciphertext) {
  if (!ciphertext || typeof ciphertext !== "string" || !ciphertext.includes("enc:v1:")) {
    return ciphertext;
  }
  try {
    const keys = getDecryptionCandidateKeys();

    if (ciphertext.startsWith("enc:v1:") && !ciphertext.includes(" ")) {
      const res = decryptSingleToken(ciphertext, keys);
      if (res === ciphertext) {
        console.error("[decryptPII Error]: Could not decrypt token with candidate keys");
      }
      return res;
    }

    // Handle compound strings, space-delimited names, or text with embedded enc:v1: tokens
    return ciphertext.replace(/enc:v1:[0-9a-fA-F]+:[0-9a-fA-F]+/g, (match) => {
      return decryptSingleToken(match, keys);
    });
  } catch (error) {
    console.error("[decryptPII Error]:", error);
    return ciphertext;
  }
}
