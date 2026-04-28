import { NextResponse } from "next/server";
import { getSessionCookieName, verifySessionToken } from "./jwt";
import { cookies } from "next/headers";
import { getStaffById } from "./staffRepo";
import { logUnauthorizedAccess, logForbiddenAccess, logInvalidSession } from "./securityAuditLogger";

/**
 * Validates session and returns user information with role verification
 * @param {Request} req - The request object
 * @returns {Promise<{user: object, error: string|null}>}
 */
export async function validateSession(req) {
  try {
    const cookieName = getSessionCookieName();
    const cookieStore = await cookies();
    const store = cookieStore instanceof Promise ? await cookieStore : cookieStore;
    const token = store.get(cookieName)?.value || "";
    
    if (!token) {
      await logUnauthorizedAccess(req, "Missing session token");
      return { user: null, error: "Not authenticated: Missing session token" };
    }

    const payload = await verifySessionToken(token);
    const userId = payload?.sub;
    
    if (!userId) {
      await logInvalidSession(req, "Missing user ID in session payload");
      return { user: null, error: "Invalid session: Missing user ID" };
    }

    // Fetch fresh user data from database
    const staff = await getStaffById(userId);
    if (!staff) {
      await logInvalidSession(req, `User not found: ${userId}`);
      return { user: null, error: "User not found" };
    }

    if (staff.status !== "Active") {
      await logUnauthorizedAccess(req, `Inactive account access attempt: ${staff.status}`, { userId, status: staff.status });
      return { user: null, error: "Account is inactive" };
    }

    const user = {
      id: staff.id,
      role: staff.role || payload.role,
      email: staff.email,
      fname: staff.fname,
      lname: staff.lname,
      status: staff.status,
      totp_enabled: Boolean(staff.totp_enabled),
      mustChangePassword: Boolean(payload.mustChangePassword),
    };

    return { user, error: null };
  } catch (err) {
    console.error("[validateSession Error]:", err);
    return { user: null, error: "Invalid session: " + err.message };
  }
}

/**
 * Checks if user has admin role
 * @param {object} user - User object from validateSession
 * @returns {boolean}
 */
export function isAdmin(user) {
  if (!user) return false;
  const role = String(user.role || "").toLowerCase();
  return ["admin", "administrator", "superadmin"].includes(role);
}

/**
 * Checks if user has staff role (any authenticated user)
 * @param {object} user - User object from validateSession
 * @returns {boolean}
 */
export function isStaff(user) {
  if (!user) return false;
  return user.status === "Active";
}

/**
 * Middleware function for API routes that require authentication
 * @param {Request} req - The request object
 * @param {string[]} [allowedRoles] - Array of allowed roles (optional)
 * @returns {Promise<{user: object, error: string|null}>}
 */
export async function requireAuth(req, allowedRoles = []) {
  const { user, error } = await validateSession(req);
  
  if (error || !user) {
    return { user: null, error: error || "Authentication required" };
  }

  if (allowedRoles.length > 0) {
      const userRole = String(user.role || "").toLowerCase();
      const hasRequiredRole = allowedRoles.some(role => 
        String(role).toLowerCase() === userRole
      );
      
      if (!hasRequiredRole) {
        await logForbiddenAccess(req, allowedRoles.join(" or "), user.role, { userId: user.id, userRole: user.role });
        return { 
          user: null, 
          error: `Access denied. Required role: ${allowedRoles.join(" or ")}` 
        };
      }
    }

  return { user, error: null };
}

/**
 * Middleware function for admin-only routes
 * @param {Request} req - The request object
 * @returns {Promise<{user: object, error: string|null}>}
 */
export async function requireAdmin(req) {
  return requireAuth(req, ["Admin"]);
}

/**
 * Middleware function for staff routes (any authenticated user)
 * @param {Request} req - The request object
 * @returns {Promise<{user: object, error: string|null}>}
 */
export async function requireStaff(req) {
  return requireAuth(req); // Any authenticated user with active status
}

/**
 * Creates a standardized error response for authorization failures
 * @param {string} error - Error message
 * @param {number} [status=401] - HTTP status code
 * @returns {NextResponse}
 */
export function createAuthErrorResponse(error, status = 401) {
  return NextResponse.json(
    { ok: false, error }, 
    { status }
  );
}

/**
 * Extracts session token from request headers (for API calls)
 * @param {Request} req - The request object
 * @returns {string|null}
 */
export function extractTokenFromHeaders(req) {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const cookieName = getSessionCookieName();
    const match = cookieHeader.match(new RegExp(`${cookieName}=([^;]+)`));
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }
  
  return null;
}
