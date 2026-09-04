import { writeAuditLog } from "./auditLogRequest";

function formatTarget(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return targetUrl || "Unknown";
  }
}

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
    
    const userAgent = details.userAgent || req.headers.get("user-agent") || "";
    const rawTarget = details.target || req.url || "Unknown";
    const target = formatTarget(rawTarget);
    const reason = details.reason || "Security event triggered";
    const context = details.context || {};

    let action = "Security Alert";
    let logDetails = `${reason} on ${target}`;
    
    switch (eventType) {
      case "UNAUTHORIZED_ACCESS":
        action = "Unauthorized Access Attempt";
        logDetails = `Unauthorized access attempt to ${target}${reason ? `: ${reason}` : ""}`;
        break;
      case "FORBIDDEN_ACCESS":
        action = "Forbidden Access Attempt";
        logDetails = `Forbidden access attempt to ${target}${reason ? `: ${reason}` : ""}`;
        break;
      case "INVALID_SESSION":
        action = "Invalid Session Detected";
        logDetails = `Invalid session token on ${target}${reason ? `: ${reason}` : ""}`;
        break;
      case "PRIVILEGE_ESCALATION":
        action = "Privilege Escalation Attempt";
        logDetails = `Privilege escalation attempt on ${target}: ${reason}`;
        break;
      case "SUSPICIOUS_ACTIVITY":
        action = "Suspicious Activity Detected";
        logDetails = `Suspicious activity on ${target}: ${reason}`;
        break;
      case "RATE_LIMIT_EXCEEDED":
        action = "Rate Limit Exceeded";
        logDetails = `Rate limit exceeded on ${target}${reason ? `: ${reason}` : ""}`;
        break;
      case "CSRF_DETECTED":
        action = "CSRF Attempt Detected";
        logDetails = `CSRF attempt on ${target}${reason ? `: ${reason}` : ""}`;
        break;
      case "BRUTE_FORCE_ATTEMPT":
        action = "Brute Force Attempt Detected";
        logDetails = `Brute force attempt on ${target}: ${reason}`;
        break;
      default:
        action = eventType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
        logDetails = `${reason} on ${target}`;
    }

    if (context && Object.keys(context).length > 0) {
      logDetails += ` | Context: ${JSON.stringify(context)}`;
    }

    await writeAuditLog(req, action, {
      details: logDetails,
      ip,
      userAgent,
      target,
      eventType,
      severity: getSeverityLevel(eventType),
      actor: details.actor,
      role: details.role,
      officeId: details.officeId || details.office_id || null,
      timestamp: new Date().toISOString(),
    });

    console.log(`[Security Audit] ${action}: ${logDetails}`, {
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
 * @returns {string} Severity level (INFO, WARNING, CRITICAL)
 */
function getSeverityLevel(eventType) {
  const severityMap = {
    "UNAUTHORIZED_ACCESS": "WARNING",
    "FORBIDDEN_ACCESS": "WARNING",
    "INVALID_SESSION": "WARNING",
    "PRIVILEGE_ESCALATION": "CRITICAL",
    "SUSPICIOUS_ACTIVITY": "WARNING",
    "RATE_LIMIT_EXCEEDED": "WARNING",
    "CSRF_DETECTED": "CRITICAL",
    "BRUTE_FORCE_ATTEMPT": "CRITICAL",
  };

  return severityMap[eventType] || "WARNING";
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
