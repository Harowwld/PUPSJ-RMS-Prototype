import { 
  getRateLimitConfig, 
  recordRateLimitHit, 
  getRateLimitHits, 
  getActiveLockout,
  recordRateLimitViolation,
  cleanupOldRateLimitHits
} from "./rateLimitRepo";

// In-memory cache for rate limit data
const cache = new Map();
const CACHE_TTL_MS = 2 * 1000; // 2 seconds - short TTL to not interfere with hit recording

class RateLimiter {
  constructor() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupCache();
      this.cleanupOldHits();
    }, 5 * 60 * 1000); // Run cleanup every 5 minutes
  }

  /**
   * Check if a request is allowed based on rate limits
   * @param {string} endpointType - Type of endpoint (e.g., 'auth_login', 'api_general')
   * @param {string} identifier - Unique identifier (IP address or user ID)
   * @param {Object} options - Additional options
   * @param {string} options.ipAddress - Client IP address
   * @param {string} options.userId - Authenticated user ID (if available)
   * @returns {Promise<Object>} - Result with allowed status and metadata
   */
  async checkRateLimit(endpointType, identifier, options = {}) {
    const { ipAddress, userId } = options;
    
    // Check for active lockout first
    const lockout = await getActiveLockout(endpointType, identifier);
    if (lockout) {
      return {
        allowed: false,
        reason: 'locked_out',
        lockoutUntil: lockout.lockout_until,
        violationCount: lockout.violation_count,
        resetTime: new Date(lockout.lockout_until).getTime()
      };
    }

    // Get rate limit configuration
    const config = await getRateLimitConfig(endpointType, 'default');
    if (!config) {
      // No rate limit configured, allow request
      return { allowed: true };
    }

    // Check cache first
    const cacheKey = `${endpointType}:${identifier}`;
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
      return cached.result;
    }

    // Count hits in the time window
    const hitsResult = await getRateLimitHits(endpointType, identifier, config.window_seconds);
    const currentHits = hitsResult[0]?.count || 0;

    if (currentHits >= config.max_requests) {
      // Rate limit exceeded, record violation
      const violation = await recordRateLimitViolation(
        endpointType, 
        identifier, 
        ipAddress, 
        userId
      );

      const result = {
        allowed: false,
        reason: 'rate_limit_exceeded',
        limit: config.max_requests,
        windowSeconds: config.window_seconds,
        currentHits,
        resetTime: Date.now() + (config.window_seconds * 1000),
        violation: violation
      };

      // Cache the result
      cache.set(cacheKey, {
        timestamp: Date.now(),
        result
      });

      return result;
    }

    // Request is allowed
    const result = {
      allowed: true,
      limit: config.max_requests,
      windowSeconds: config.window_seconds,
      currentHits,
      remaining: config.max_requests - currentHits - 1
    };

    // Record this hit
    await recordRateLimitHit(endpointType, identifier, ipAddress, userId);

    // Cache the result
    cache.set(cacheKey, {
      timestamp: Date.now(),
      result
    });

    return result;
  }

  /**
   * Get rate limit status without recording a hit
   */
  async getRateLimitStatus(endpointType, identifier) {
    const config = await getRateLimitConfig(endpointType, 'default');
    if (!config) {
      return { allowed: true };
    }

    const lockout = await getActiveLockout(endpointType, identifier);
    if (lockout) {
      return {
        allowed: false,
        reason: 'locked_out',
        lockoutUntil: lockout.lockout_until,
        violationCount: lockout.violation_count,
        resetTime: new Date(lockout.lockout_until).getTime()
      };
    }

    const hitsResult = await getRateLimitHits(endpointType, identifier, config.window_seconds);
    const currentHits = hitsResult[0]?.count || 0;

    return {
      allowed: currentHits < config.max_requests,
      limit: config.max_requests,
      windowSeconds: config.window_seconds,
      currentHits,
      remaining: Math.max(0, config.max_requests - currentHits),
      resetTime: Date.now() + (config.window_seconds * 1000)
    };
  }

  /**
   * Clear rate limit violation for a specific endpoint/identifier
   */
  async clearViolation(endpointType, identifier) {
    const { clearRateLimitViolation } = await import("./rateLimitRepo");
    await clearRateLimitViolation(endpointType, identifier);
    
    // Clear cache
    const cacheKey = `${endpointType}:${identifier}`;
    cache.delete(cacheKey);
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > CACHE_TTL_MS) {
        cache.delete(key);
      }
    }
  }

  /**
   * Clean up old hit records
   */
  async cleanupOldHits() {
    try {
      await cleanupOldRateLimitHits(60); // Clean up hits older than 1 hour
    } catch (error) {
      console.error('[RateLimiter] Cleanup error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: cache.size,
      ttl: CACHE_TTL_MS
    };
  }

  /**
   * Destroy the rate limiter and clean up intervals
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    cache.clear();
  }
}

// Global rate limiter instance
let globalRateLimiter = null;

export function getRateLimiter() {
  if (!globalRateLimiter) {
    globalRateLimiter = new RateLimiter();
  }
  return globalRateLimiter;
}

export function destroyRateLimiter() {
  if (globalRateLimiter) {
    globalRateLimiter.destroy();
    globalRateLimiter = null;
  }
}

// Helper functions for common endpoint types
export async function checkAuthLoginRateLimit(ipAddress, userId = null) {
  const rateLimiter = getRateLimiter();
  return await rateLimiter.checkRateLimit('auth_login', ipAddress, { ipAddress, userId });
}

export async function checkAuthForgotPasswordRateLimit(ipAddress, userId = null) {
  const rateLimiter = getRateLimiter();
  return await rateLimiter.checkRateLimit('auth_forgot_password', ipAddress, { ipAddress, userId });
}

export async function checkApiGeneralRateLimit(identifier, ipAddress, userId = null) {
  const rateLimiter = getRateLimiter();
  return await rateLimiter.checkRateLimit('api_general', identifier, { ipAddress, userId });
}

export async function checkApiSensitiveRateLimit(userId, ipAddress) {
  const rateLimiter = getRateLimiter();
  return await rateLimiter.checkRateLimit('api_sensitive', userId, { ipAddress, userId });
}

export async function checkFileUploadRateLimit(userId, ipAddress) {
  const rateLimiter = getRateLimiter();
  return await rateLimiter.checkRateLimit('file_upload', userId, { ipAddress, userId });
}
