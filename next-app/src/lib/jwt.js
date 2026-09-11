import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "pup_session";
const JWT_ISSUER = process.env.JWT_ISSUER || "pupsj-rms";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "pupsj-rms-app";
const DEFAULT_SESSION_EXPIRY = "8h";

function generateJti() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET environment variable");
  }
  return new TextEncoder().encode(secret);
}

export function getSessionCookieName() {
  return COOKIE_NAME;
}

export async function signSessionToken(payload, expiryOptions = {}) {
  const secret = getJwtSecret();
  const options = typeof expiryOptions === "string" ? { expiresIn: expiryOptions } : expiryOptions || {};
  const expiresIn = options.expiresIn || DEFAULT_SESSION_EXPIRY;
  const tokenPayload = {
    ...(payload || {}),
    jti: payload?.jti || generateJti(),
  };
  const builder = new SignJWT(tokenPayload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE);

  if (options.expiresAt !== undefined) {
    builder.setExpirationTime(options.expiresAt);
  } else {
    builder.setExpirationTime(expiresIn);
  }

  return await builder.sign(secret);
}

export async function verifySessionToken(token) {
  const secret = getJwtSecret();
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ["HS256"],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
  return payload;
}
