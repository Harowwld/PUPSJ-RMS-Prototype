import { writeAuditLog } from "./auditLogRequest";

/**
 * Logs security-related events for monitoring and compliance
 * @param {Request} req - The request object
 * @param {string} eventType - Type of security event
 * @param {object} details - Additional event details
 * @param {string} details.ip - IP address of the requester
 * @param {string} details.userAgent - User agent string
 * @param {string} details.target - Target resource being accessed
 * @param {string} details.reason - Reason for the security event
 * @param {object} details.context - Additional context data
 */
export async function logSecurityEvent(req, eventType, details = {}) {
  try {
    const ip = details.ip || 
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "localhost";
    
    const userAgent = details.userAgent || req.headers.get("user-agent") || "Unknown";
    const target = details.target || req.url || "Unknown";
    const reason = details.reason || "Security event triggered";
    const context = details.context || {};

    // Create standardized security event message
    let action = `[SECURITY] ${eventType}`;
    
    switch (eventType) {
      case "UNAUTHORIZED_ACCESS":
        action += ` - Unauthorized access attempt to ${target}`;
        break;
      case "FORBIDDEN_ACCESS":
        action += ` - Forbidden access attempt to ${target}`;
        break;
      case "INVALID_SESSION":
        action += ` - Invalid session token used for ${target}`;
        break;
      case "PRIVILEGE_ESCALATION":
        action += ` - Privilege escalation attempt: ${reason}`;
        break;
      case "SUSPICIOUS_ACTIVITY":
        action += ` - Suspicious activity detected: ${reason}`;
        break;
      case "RATE_LIMIT_EXCEEDED":
        action += ` - Rate limit exceeded for ${target}`;
        break;
      case "CSRF_DETECTED":
        action += ` - CSRF attempt detected on ${target}`;
        break;
      case "BRUTE_FORCE_ATTEMPT":
        action += ` - Brute force attempt detected: ${reason}`;
        break;
      default:
        action += ` - ${reason}`;
    }

    // Add context information to the audit log
    const contextInfo = Object.keys(context).length > 0 
      ? ` | Context: ${JSON.stringify(context)}`
      : "";

    await writeAuditLog(req, `${action}${contextInfo}`, {
      ip,
      userAgent,
      target,
      eventType,
      severity: getSeverityLevel(eventType),
      timestamp: new Date().toISOString(),
    });

    console.log(`[Security Audit] ${eventType}: ${action}`, {
      ip,
      userAgent,
      target,
      ...context,
    });

  } catch (error) {
    console.error("[Security Audit Logger Error]:", error);
    // Don't throw errors to avoid breaking the main application flow
  }
}

/**
 * Determines the severity level for different security events
 * @param {string} eventType - Type of security event
 * @returns {string} Severity level (LOW, MEDIUM, HIGH, CRITICAL)
 */
function getSeverityLevel(eventType) {
  const severityMap = {
    "UNAUTHORIZED_ACCESS": "MEDIUM",
    "FORBIDDEN_ACCESS": "HIGH",
    "INVALID_SESSION": "MEDIUM",
    "PRIVILEGE_ESCALATION": "CRITICAL",
    "SUSPICIOUS_ACTIVITY": "HIGH",
    "RATE_LIMIT_EXCEEDED": "MEDIUM",
    "CSRF_DETECTED": "HIGH",
    "BRUTE_FORCE_ATTEMPT": "CRITICAL",
  };

  return severityMap[eventType] || "MEDIUM";
}

/**
 * Middleware function to log unauthorized access attempts
 * @param {Request} req - The request object
 * @param {string} reason - Reason for the unauthorized access
 * @param {object} context - Additional context
 */
export async function logUnauthorizedAccess(req, reason = "Access denied", context = {}) {
  await logSecurityEvent(req, "UNAUTHORIZED_ACCESS", {
    reason,
    context,
    target: req.url,
  });
}

/**
 * Middleware function to log forbidden access attempts
 * @param {Request} req - The request object
 * @param {string} requiredRole - Role that was required
 * @param {string} userRole - Role that the user has
 * @param {object} context - Additional context
 */
export async function logForbiddenAccess(req, requiredRole, userRole, context = {}) {
  await logSecurityEvent(req, "FORBIDDEN_ACCESS", {
    reason: `Insufficient privileges. Required: ${requiredRole}, User: ${userRole}`,
    context: { requiredRole, userRole, ...context },
    target: req.url,
  });
}

/**
 * Middleware function to log invalid session attempts
 * @param {Request} req - The request object
 * @param {string} reason - Reason for invalid session
 * @param {object} context - Additional context
 */
export async function logInvalidSession(req, reason = "Invalid session token", context = {}) {
  await logSecurityEvent(req, "INVALID_SESSION", {
    reason,
    context,
    target: req.url,
  });
}

/**
 * Middleware function to log privilege escalation attempts
 * @param {Request} req - The request object
 * @param {string} attemptedAction - Action that was attempted
 * @param {object} context - Additional context
 */
export async function logPrivilegeEscalation(req, attemptedAction, context = {}) {
  await logSecurityEvent(req, "PRIVILEGE_ESCALATION", {
    reason: `Attempted privileged action: ${attemptedAction}`,
    context: { attemptedAction, ...context },
    target: req.url,
  });
}

/**
 * Creates a security-aware response with audit logging
 * @param {Request} req - The request object
 * @param {string} eventType - Security event type
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @param {object} details - Additional details
 * @returns {NextResponse}
 */
export async function createSecurityResponse(req, eventType, message, status = 403, details = {}) {
  // Log the security event
  await logSecurityEvent(req, eventType, {
    reason: message,
    context: details,
    target: req.url,
  });

  // Return appropriate error response
  return new Response(
    JSON.stringify({ 
      ok: false, 
      error: message,
      code: eventType 
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
      }
    }
  );
}
