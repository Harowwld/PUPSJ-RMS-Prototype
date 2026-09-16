import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { decodeJwt } from "jose";

const API_CONTENT_SECURITY_POLICY = "default-src 'self'; script-src 'none'; style-src 'none'; img-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self';";

/**
 * CSRF protection utilities for state-changing operations
 */

/**
 * Generates a CSRF token for the current session
 * @param {string} sessionId - The session identifier
 * @returns {string} CSRF token
 */
function csrfSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET environment variable");
  return Buffer.from(secret, "utf8");
}

function signCSRFToken(sessionId, expiresAt, nonce) {
  return createHmac("sha256", csrfSecret())
    .update(`${sessionId}:${expiresAt}:${nonce}`)
    .digest("hex");
}

const DEFAULT_CSRF_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours (matches session token lifetime)

export function generateCSRFToken(sessionId, maxAge = DEFAULT_CSRF_MAX_AGE_MS) {
  const requestedAge = Number(maxAge);
  const expiresAt = Date.now() + (Number.isFinite(requestedAge) ? requestedAge : DEFAULT_CSRF_MAX_AGE_MS);
  const nonce = randomBytes(32).toString("hex");
  const signature = signCSRFToken(sessionId, expiresAt, nonce);
  return `${expiresAt}.${nonce}.${signature}`;
}

/**
 * Validates a CSRF token against the session
 * @param {string} token - The CSRF token to validate
 * @param {string} sessionId - The session identifier
 * @param {number} [maxAge=28800000] - Maximum age in milliseconds (default: 8 hours)
 * @returns {boolean} True if valid, false otherwise
 */
export function validateCSRFToken(token, sessionId, maxAge = DEFAULT_CSRF_MAX_AGE_MS) {
  if (!token || !sessionId) return false;
  
  try {
    const [expiresAtRaw, nonce, signature] = String(token).split(".");
    const expiresAt = Number(expiresAtRaw);
    if (!Number.isSafeInteger(expiresAt) || !nonce || !signature) return false;
    const now = Date.now();
    if (expiresAt <= now || expiresAt - now > maxAge) return false;
    const expected = signCSRFToken(sessionId, expiresAt, nonce);
    const actualBytes = Buffer.from(signature, "hex");
    const expectedBytes = Buffer.from(expected, "hex");
    return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
  } catch (error) {
    return false;
  }
}

/**
 * Middleware to check CSRF token for state-changing requests
 * @param {Request} req - The request object
 * @param {string} sessionId - The session identifier
 * @returns {boolean} True if CSRF check passes, false otherwise
 */
export function checkCSRFProtection(req, sessionId) {
  // Only apply to state-changing methods
  const method = req.method?.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return true;
  }

  const cookieHeader = req?.headers?.get?.("cookie") || "";
  const headerToken = req.headers.get('x-csrf-token');
  const cookieToken = req?.cookies?.get?.("pup_csrf")?.value ||
    cookieHeader.match(/(?:^|;\s*)pup_csrf=([^;]+)/)?.[1] || null;
  const token = headerToken || cookieToken;
  
  if (!token) {
    return false;
  }

  const origin = req?.headers?.get?.("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(req.url).origin) return false;
    } catch {
      return false;
    }
  }
  return validateCSRFToken(decodeURIComponent(token), sessionId);
}

export function setCSRFTokenCookie(response, sessionToken) {
  const payload = decodeJwt(sessionToken);
  if (!payload?.jti) throw new Error("Session token has no jti");
  response.cookies.set({
    name: "pup_csrf",
    value: generateCSRFToken(payload.jti),
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60, // 8 hours (matches session token lifetime)
  });
  return response;
}

/**
 * Adds CSRF protection headers to a response
 * @param {Response} response - The response object
 * @param {string} token - The CSRF token to include
 * @returns {Response} Response with CSRF headers
 */
export function addCSRFHeaders(response, token) {
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...Object.fromEntries(response.headers.entries()),
      'X-CSRF-Token': token,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': API_CONTENT_SECURITY_POLICY,
    }
  });
  
  return newResponse;
}

/**
 * Creates a secure response with CSRF protection
 * @param {object} data - Response data
 * @param {number} [status=200] - HTTP status code
 * @param {string} [csrfToken] - CSRF token to include
 * @returns {Response} Secure response with CSRF headers
 */
export function createSecureResponse(data, status = 200, csrfToken = null) {
  const response = new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': API_CONTENT_SECURITY_POLICY,
    }
  });

  if (csrfToken) {
    response.headers.set('X-CSRF-Token', csrfToken);
  }

  return response;
}

/**
 * Rate limiting utility for API endpoints
 */
class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  /**
   * Checks if a request should be allowed
   * @param {string} key - Identifier (IP address, user ID, etc.)
   * @returns {object} { allowed: boolean, remaining: number, resetTime: number }
   */
  checkRequest(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const requests = this.requests.get(key);
    
    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    this.requests.set(key, validRequests);
    
    if (validRequests.length >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: validRequests[0] + this.windowMs
      };
    }
    
    // Add current request
    validRequests.push(now);
    
    return {
      allowed: true,
      remaining: this.maxRequests - validRequests.length,
      resetTime: now + this.windowMs
    };
  }

  /**
   * Cleanup old entries to prevent memory leaks
   */
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(timestamp => timestamp > windowStart);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

// Global rate limiter instances
const authRateLimiter = new RateLimiter(5, 60000); // 5 requests per minute for auth
const apiRateLimiter = new RateLimiter(100, 60000); // 100 requests per minute for general API

// Cleanup rate limiters periodically
const cleanupInterval = setInterval(() => {
  authRateLimiter.cleanup();
  apiRateLimiter.cleanup();
}, 300000); // Every 5 minutes
cleanupInterval.unref?.();

/**
 * Rate limiting middleware for authentication endpoints
 * @param {string} key - Identifier (IP address)
 * @returns {object} Rate limit result
 */
export function checkAuthRateLimit(key) {
  return authRateLimiter.checkRequest(key);
}

/**
 * Rate limiting middleware for general API endpoints
 * @param {string} key - Identifier (IP address or user ID)
 * @returns {object} Rate limit result
 */
export function checkAPIRateLimit(key) {
  return apiRateLimiter.checkRequest(key);
}

/**
 * Extracts client IP from request headers
 * @param {Request} req - The request object
 * @returns {string} Client IP address
 */
export function getClientIP(req) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         req.headers.get('x-real-ip') ||
         req.headers.get('x-client-ip') ||
         'localhost';
}
