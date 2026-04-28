import { NextResponse } from "next/server";
import { getRateLimiter } from "./rateLimiter";
import { getEndpointType } from "./rateLimitConfig";
import { writeAuditLog } from "./auditLogRequest";
import { verifySessionToken } from "./jwt";
import { detectBruteForcePatterns, shouldBlockIP, logBruteForceDetection } from "./bruteForceDetector";

/**
 * Extract client IP address from request
 */
function getClientIP(req) {
  // Check various headers for the real IP
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const cfConnectingIP = req.headers.get('cf-connecting-ip'); // Cloudflare
  
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP.trim();
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }
  
  // For local development, use a consistent IP
  if (req.headers.get('host')?.includes('localhost') || req.headers.get('host')?.includes('127.0.0.1')) {
    return '127.0.0.1';
  }
  
  // Fallback to request IP or unknown
  return req.ip || 'unknown';
}

/**
 * Extract user ID from request if authenticated
 */
async function getUserIdFromRequest(req) {
  const token = req.cookies.get('pup_session')?.value;
  if (!token) {
    return null;
  }
  
  try {
    const payload = await verifySessionToken(token);
    return payload?.sub || null;
  } catch (error) {
    return null;
  }
}

/**
 * Rate limiting middleware function
 */
export async function applyRateLimiting(req) {
  const { pathname } = req.nextUrl;
  const method = req.method || 'GET';
  
  // Skip rate limiting for certain paths
  const skipPaths = [
    '/_next',
    '/favicon.ico',
    '/api/auth/me', // Health check for auth status
    '/api/health'   // General health check
  ];
  
  for (const skipPath of skipPaths) {
    if (pathname.startsWith(skipPath)) {
      return { allowed: true };
    }
  }
  
  // Determine endpoint type
  const endpointType = getEndpointType(pathname, method);
  
  // Get client identifier
  const ipAddress = getClientIP(req);
  const userId = await getUserIdFromRequest(req);
  
  // Check for brute force patterns for authentication endpoints
  if (endpointType.startsWith('auth_')) {
    const blockCheck = await shouldBlockIP(ipAddress);
    if (blockCheck.shouldBlock) {
      await writeAuditLog(req, `IP auto-blocked due to suspicious activity`, {
        actor: `IP:${ipAddress}`,
        role: 'Blocked',
        details: {
          reason: blockCheck.reason,
          pattern: blockCheck.pattern
        }
      });
      
      return {
        allowed: false,
        response: NextResponse.json(
          { ok: false, error: "Access temporarily blocked due to suspicious activity. Please try again later." },
          { status: 403 }
        )
      };
    }
    
    // Log detected patterns for monitoring
    const pattern = await detectBruteForcePatterns(ipAddress);
    if (pattern.detected && pattern.riskLevel !== 'MINIMAL') {
      await logBruteForceDetection(req, pattern);
    }
  }
  
  // For authenticated users, use user ID as primary identifier
  // For unauthenticated requests, use IP address
  const identifier = userId || ipAddress;
  
  try {
    const rateLimiter = getRateLimiter();
    const result = await rateLimiter.checkRateLimit(endpointType, identifier, {
      ipAddress,
      userId
    });
    
    if (!result.allowed) {
      // Log rate limit violation to audit system
      await writeAuditLog(req, `Rate limit exceeded: ${endpointType}`, {
        actor: userId || `IP:${ipAddress}`,
        role: userId ? 'User' : 'Guest',
        details: {
          endpointType,
          reason: result.reason,
          currentHits: result.currentHits,
          limit: result.limit,
          ipAddress
        }
      });
      
      // Return appropriate error response
      const response = NextResponse.json(
        {
          ok: false,
          error: getRateLimitErrorMessage(result),
          retryAfter: result.resetTime ? Math.ceil((result.resetTime - Date.now()) / 1000) : undefined
        },
        { status: 429 }
      );
      
      // Add rate limit headers
      if (result.resetTime) {
        response.headers.set('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000));
        response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
      }
      
      if (result.limit) {
        response.headers.set('X-RateLimit-Limit', result.limit);
        response.headers.set('X-RateLimit-Remaining', Math.max(0, result.remaining || 0));
      }
      
      return { allowed: false, response };
    }
    
    // Add rate limit headers to successful requests
    const headers = {};
    if (result.limit) {
      headers['X-RateLimit-Limit'] = result.limit;
      headers['X-RateLimit-Remaining'] = result.remaining;
      headers['X-RateLimit-Reset'] = new Date(result.resetTime).toISOString();
    }
    
    return { allowed: true, headers };
    
  } catch (error) {
    console.error('[RateLimitMiddleware] Error:', error);
    // Fail open - allow request if rate limiting fails
    return { allowed: true };
  }
}

/**
 * Get user-friendly error message for rate limiting
 */
function getRateLimitErrorMessage(result) {
  switch (result.reason) {
    case 'locked_out':
      const lockoutTime = new Date(result.lockoutUntil);
      const timeUntil = Math.ceil((lockoutTime.getTime() - Date.now()) / (1000 * 60));
      if (timeUntil < 60) {
        return `Too many failed attempts. Account locked for ${timeUntil} minute${timeUntil !== 1 ? 's' : ''}.`;
      } else {
        const hours = Math.floor(timeUntil / 60);
        const minutes = timeUntil % 60;
        return `Too many failed attempts. Account locked for ${hours} hour${hours !== 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} minute${minutes !== 1 ? 's' : ''}` : ''}.`;
      }
    
    case 'rate_limit_exceeded':
      return `Rate limit exceeded. Please try again later.`;
    
    default:
      return 'Too many requests. Please try again later.';
  }
}

/**
 * Middleware wrapper for Next.js middleware
 */
export async function rateLimitMiddleware(req) {
  const result = await applyRateLimiting(req);
  
  if (!result.allowed && result.response) {
    return result.response;
  }
  
  // If allowed but has headers to add, create a new response with headers
  if (result.allowed && result.headers) {
    const response = NextResponse.next();
    Object.entries(result.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }
  
  return NextResponse.next();
}

/**
 * Helper function to check rate limits in API routes
 */
export async function checkRateLimitInApi(req, endpointType = null) {
  const pathname = req.nextUrl?.pathname || '';
  const method = req.method || 'GET';
  
  // Use provided endpoint type or determine from pathname
  const finalEndpointType = endpointType || getEndpointType(pathname, method);
  
  const ipAddress = getClientIP(req);
  const userId = await getUserIdFromRequest(req);
  const identifier = userId || ipAddress;
  
  const rateLimiter = getRateLimiter();
  return await rateLimiter.checkRateLimit(finalEndpointType, identifier, {
    ipAddress,
    userId
  });
}
