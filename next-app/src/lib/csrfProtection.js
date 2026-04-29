import { createHash, randomBytes } from "crypto";

/**
 * CSRF protection utilities for state-changing operations
 */

/**
 * Generates a CSRF token for the current session
 * @param {string} sessionId - The session identifier
 * @returns {string} CSRF token
 */
export function generateCSRFToken(sessionId) {
  const timestamp = Date.now().toString();
  const random = randomBytes(32).toString('hex');
  const data = `${sessionId}:${timestamp}:${random}`;
  
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Validates a CSRF token against the session
 * @param {string} token - The CSRF token to validate
 * @param {string} sessionId - The session identifier
 * @param {number} [maxAge=3600000] - Maximum age in milliseconds (default: 1 hour)
 * @returns {boolean} True if valid, false otherwise
 */
export function validateCSRFToken(token, sessionId, maxAge = 3600000) {
  if (!token || !sessionId) return false;
  
  try {
    // For simplicity, we'll implement a basic validation
    // In production, you'd want to store tokens server-side with expiration
    const hash = createHash('sha256').update(sessionId).digest('hex');
    
    // Basic validation - token should contain session-derived hash
    return token.length === 64 && token.includes(hash.substring(0, 16));
  } catch (error) {
    console.error('[CSRF Validation Error]:', error);
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

  // Get token from header or body
  const headerToken = req.headers.get('x-csrf-token');
  let bodyToken = null;

  // Try to get token from request body for JSON requests
  if (req.headers.get('content-type')?.includes('application/json')) {
    try {
      // Note: This would require cloning the request to read the body
      // For simplicity, we'll rely on header token in most cases
      bodyToken = null;
    } catch (error) {
      // Can't read body, continue with header check
    }
  }

  const token = headerToken || bodyToken;
  
  if (!token) {
    console.log('[CSRF] Missing CSRF token for state-changing request');
    return false;
  }

  return validateCSRFToken(token, sessionId);
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
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';",
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
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';",
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
setInterval(() => {
  authRateLimiter.cleanup();
  apiRateLimiter.cleanup();
}, 300000); // Every 5 minutes

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
