import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "pup_session";

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

export async function signSessionToken(payload) {
  const secret = getJwtSecret();
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    // Session cookie: no explicit exp; browser session ends on close.
    .sign(secret);
}

export async function verifySessionToken(token) {
  const secret = getJwtSecret();
  const { payload } = await jwtVerify(token, secret);
  return payload;
}
