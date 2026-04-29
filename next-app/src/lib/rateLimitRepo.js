import { dbGet, dbAll, dbRun } from "./sqlite";

export async function getRateLimitConfig(endpointType, identifier = "default") {
  return await dbGet(
    "SELECT * FROM rate_limits WHERE endpoint_type = ? AND identifier = ?",
    [endpointType, identifier]
  );
}

export async function getAllRateLimitConfigs() {
  return await dbAll("SELECT * FROM rate_limits ORDER BY endpoint_type, identifier");
}

export async function createRateLimitConfig(endpointType, identifier, windowSeconds, maxRequests) {
  return await dbRun(
    "INSERT OR REPLACE INTO rate_limits (endpoint_type, identifier, window_seconds, max_requests, updated_at) VALUES (?, ?, ?, ?, datetime('now'))",
    [endpointType, identifier, windowSeconds, maxRequests]
  );
}

export async function recordRateLimitHit(endpointType, identifier, ipAddress, userId = null) {
  return await dbRun(
    "INSERT INTO rate_limit_hits (endpoint_type, identifier, ip_address, user_id) VALUES (?, ?, ?, ?)",
    [endpointType, identifier, ipAddress, userId]
  );
}

export async function getRateLimitHits(endpointType, identifier, windowSeconds) {
  const cutoff = new Date(Date.now() - windowSeconds * 1000).toISOString().replace('T', ' ').replace('Z', '');
  const result = await dbAll(
    "SELECT COUNT(*) as count FROM rate_limit_hits WHERE endpoint_type = ? AND identifier = ? AND created_at > ?",
    [endpointType, identifier, cutoff]
  );
  return result;
}

export async function cleanupOldRateLimitHits(olderThanMinutes = 60) {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString();
  const result = await dbRun(
    "DELETE FROM rate_limit_hits WHERE created_at < ?",
    [cutoff]
  );
  return result.changes;
}

export async function getActiveLockout(endpointType, identifier) {
  return await dbGet(
    "SELECT * FROM rate_limit_violations WHERE endpoint_type = ? AND identifier = ? AND lockout_until > datetime('now')",
    [endpointType, identifier]
  );
}

export async function recordRateLimitViolation(endpointType, identifier, ipAddress, userId = null, lockoutMinutes = 1) {
  const lockoutUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000).toISOString();
  
  // Check if there's an existing violation
  const existing = await dbGet(
    "SELECT * FROM rate_limit_violations WHERE endpoint_type = ? AND identifier = ?",
    [endpointType, identifier]
  );

  if (existing) {
    // Update existing violation
    const newViolationCount = existing.violation_count + 1;
    let newLockoutMinutes = lockoutMinutes;
    
    // Progressive penalties
    if (newViolationCount >= 10) {
      newLockoutMinutes = 1440; // 24 hours for 10+ violations
    } else if (newViolationCount >= 5) {
      newLockoutMinutes = 30; // 30 minutes for 5+ violations
    } else if (newViolationCount >= 2) {
      newLockoutMinutes = 5; // 5 minutes for 2+ violations
    }

    const newLockoutUntil = new Date(Date.now() + newLockoutMinutes * 60 * 1000).toISOString();
    
    await dbRun(
      "UPDATE rate_limit_violations SET violation_count = ?, lockout_until = ?, updated_at = datetime('now') WHERE id = ?",
      [newViolationCount, newLockoutUntil, existing.id]
    );
    
    return { violationCount: newViolationCount, lockoutUntil: newLockoutUntil };
  } else {
    // Create new violation
    await dbRun(
      "INSERT INTO rate_limit_violations (endpoint_type, identifier, ip_address, user_id, violation_count, lockout_until) VALUES (?, ?, ?, ?, ?, ?)",
      [endpointType, identifier, ipAddress, userId, 1, lockoutUntil]
    );
    
    return { violationCount: 1, lockoutUntil };
  }
}

export async function clearRateLimitViolation(endpointType, identifier) {
  return await dbRun(
    "DELETE FROM rate_limit_violations WHERE endpoint_type = ? AND identifier = ?",
    [endpointType, identifier]
  );
}

export async function getRateLimitViolations(limit = 50, offset = 0) {
  return await dbAll(
    "SELECT * FROM rate_limit_violations ORDER BY created_at DESC LIMIT ? OFFSET ?",
    [limit, offset]
  );
}

export async function getRateLimitStats(endpointType = null, hours = 24) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  let whereClause = "WHERE created_at > ?";
  let params = [cutoff];
  
  if (endpointType) {
    whereClause += " AND endpoint_type = ?";
    params.push(endpointType);
  }
  
  const hits = await dbAll(
    `SELECT endpoint_type, COUNT(*) as hits FROM rate_limit_hits ${whereClause} GROUP BY endpoint_type`,
    params
  );
  
  const violations = await dbAll(
    `SELECT endpoint_type, COUNT(*) as violations FROM rate_limit_violations ${whereClause} GROUP BY endpoint_type`,
    params
  );
  
  return { hits, violations };
}
