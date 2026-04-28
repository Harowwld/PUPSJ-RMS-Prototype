import { dbAll, dbGet } from "./sqlite";
import { writeAuditLog } from "./auditLogRequest";

/**
 * Detect potential brute force attack patterns
 */
export async function detectBruteForcePatterns(ipAddress, timeWindowMinutes = 60) {
  const cutoff = new Date(Date.now() - timeWindowMinutes * 60 * 1000).toISOString();
  
  try {
    // Check for multiple failed login attempts from same IP
    const failedLogins = await dbAll(`
      SELECT COUNT(*) as count, 
             MIN(created_at) as first_attempt,
             MAX(created_at) as last_attempt
      FROM audit_logs 
      WHERE action LIKE '%Login attempt failed%' 
      AND ip = ? 
      AND created_at > ?
    `, [ipAddress, cutoff]);

    const loginAttempts = failedLogins[0];
    if (!loginAttempts || loginAttempts.count < 10) {
      return { detected: false };
    }

    // Check for attempts across multiple usernames (account enumeration)
    const uniqueUsers = await dbAll(`
      SELECT COUNT(DISTINCT actor) as unique_users
      FROM audit_logs 
      WHERE action LIKE '%Login attempt failed%' 
      AND ip = ? 
      AND created_at > ?
      AND actor != 'Unknown'
    `, [ipAddress, cutoff]);

    // Check for password reset attempts
    const passwordResetAttempts = await dbAll(`
      SELECT COUNT(*) as count
      FROM audit_logs 
      WHERE action LIKE '%password%' 
      AND ip = ? 
      AND created_at > ?
    `, [ipAddress, cutoff]);

    const pattern = {
      detected: true,
      ipAddress,
      timeWindowMinutes,
      failedLogins: loginAttempts.count,
      uniqueUsers: uniqueUsers[0].unique_users,
      passwordResetAttempts: passwordResetAttempts[0].count,
      firstAttempt: loginAttempts.first_attempt,
      lastAttempt: loginAttempts.last_attempt,
      riskLevel: calculateRiskLevel(loginAttempts.count, uniqueUsers[0].unique_users, passwordResetAttempts[0].count)
    };

    return pattern;
  } catch (error) {
    console.error('[BruteForceDetector] Error detecting patterns:', error);
    return { detected: false, error: error.message };
  }
}

/**
 * Calculate risk level based on attack patterns
 */
function calculateRiskLevel(failedLogins, uniqueUsers, passwordResetAttempts) {
  let score = 0;
  
  // High volume of failed logins
  if (failedLogins >= 50) score += 3;
  else if (failedLogins >= 20) score += 2;
  else if (failedLogins >= 10) score += 1;
  
  // Multiple target users (account enumeration)
  if (uniqueUsers >= 10) score += 3;
  else if (uniqueUsers >= 5) score += 2;
  else if (uniqueUsers >= 3) score += 1;
  
  // Password reset attempts
  if (passwordResetAttempts >= 10) score += 2;
  else if (passwordResetAttempts >= 5) score += 1;
  
  if (score >= 6) return 'HIGH';
  if (score >= 4) return 'MEDIUM';
  if (score >= 2) return 'LOW';
  return 'MINIMAL';
}

/**
 * Check if IP should be automatically blocked
 */
export async function shouldBlockIP(ipAddress) {
  const pattern = await detectBruteForcePatterns(ipAddress, 30); // Check last 30 minutes
  
  if (!pattern.detected) {
    return { shouldBlock: false };
  }
  
  // Auto-block criteria
  const shouldBlock = (
    pattern.riskLevel === 'HIGH' ||
    (pattern.failedLogins >= 100) ||
    (pattern.failedLogins >= 50 && pattern.uniqueUsers >= 10)
  );
  
  return {
    shouldBlock,
    pattern,
    reason: shouldBlock ? 'Automated blocking due to suspicious activity pattern' : null
  };
}

/**
 * Get list of suspicious IPs for monitoring
 */
export async function getSuspiciousIPs(limit = 50, timeWindowMinutes = 60) {
  const cutoff = new Date(Date.now() - timeWindowMinutes * 60 * 1000).toISOString();
  
  try {
    const suspiciousIPs = await dbAll(`
      SELECT 
        ip,
        COUNT(*) as total_events,
        COUNT(DISTINCT actor) as unique_users,
        COUNT(CASE WHEN action LIKE '%Login attempt failed%' THEN 1 END) as failed_logins,
        COUNT(CASE WHEN action LIKE '%password%' THEN 1 END) as password_attempts,
        MIN(created_at) as first_seen,
        MAX(created_at) as last_seen
      FROM audit_logs 
      WHERE ip IS NOT NULL 
      AND ip != ''
      AND created_at > ?
      GROUP BY ip
      HAVING failed_logins >= 5 OR total_events >= 20
      ORDER BY failed_logins DESC, total_events DESC
      LIMIT ?
    `, [cutoff, limit]);

    // Calculate risk scores for each IP
    const ipsWithRisk = suspiciousIPs.map(ip => ({
      ...ip,
      riskLevel: calculateRiskLevel(ip.failed_logins, ip.unique_users, ip.password_attempts)
    }));

    return ipsWithRisk;
  } catch (error) {
    console.error('[BruteForceDetector] Error getting suspicious IPs:', error);
    return [];
  }
}

/**
 * Log brute force detection events
 */
export async function logBruteForceDetection(req, pattern) {
  await writeAuditLog(req, `Brute force pattern detected: ${pattern.riskLevel} risk`, {
    actor: 'System',
    role: 'Security',
    details: {
      ipAddress: pattern.ipAddress,
      riskLevel: pattern.riskLevel,
      failedLogins: pattern.failedLogins,
      uniqueUsers: pattern.uniqueUsers,
      passwordResetAttempts: pattern.passwordResetAttempts,
      timeWindow: pattern.timeWindowMinutes
    }
  });
}

/**
 * Create security alert for admins
 */
export async function createSecurityAlert(req, alertType, details) {
  await writeAuditLog(req, `Security Alert: ${alertType}`, {
    actor: 'System',
    role: 'Security',
    details: {
      alertType,
      ...details,
      timestamp: new Date().toISOString()
    }
  });
}
