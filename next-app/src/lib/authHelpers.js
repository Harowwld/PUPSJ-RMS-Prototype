import { NextResponse } from "next/server";
import { getSessionCookieName, verifySessionToken } from "./jwt";
import { getStaffById } from "./staffRepo";
import { logUnauthorizedAccess, logForbiddenAccess, logInvalidSession } from "./securityAuditLogger";
import { isSessionActive } from "./authSessions.js";
import { queryOne } from "./postgres.js";
import { isStudentRole, isSystemAdminRole, normalizeRole } from "./roleUtils.js";
import { checkCSRFProtection } from "./csrfProtection.js";

/**
 * Validates session and returns user information with role verification
 * @param {Request} req - The request object
 * @returns {Promise<{user: object, error: string|null}>}
 */
export async function getAuthenticatedPrincipal(req) {
  try {
    const token = extractTokenFromHeaders(req) || "";
    
    if (!token) {
      await logUnauthorizedAccess(req, "Missing session token");
      return null;
    }

    const payload = await verifySessionToken(token);
    if (["POST", "PUT", "PATCH", "DELETE"].includes(String(req?.method || "").toUpperCase()) &&
        !checkCSRFProtection(req, payload.jti)) {
      await logInvalidSession(req, "Missing or invalid CSRF token");
      return null;
    }
    if (payload?.purpose && payload.purpose !== "access") {
      await logInvalidSession(req, "Non-access token used for an authenticated request");
      return null;
    }
    if (!(await isSessionActive(payload))) {
      await logInvalidSession(req, "Revoked or incomplete session token");
      return null;
    }

    const userId = String(payload?.sub || "").trim();
    const tokenRole = normalizeRole(payload?.role);
    if (!userId || !tokenRole) {
      await logInvalidSession(req, "Missing principal identity or role in session payload");
      return null;
    }

    if (isStudentRole(tokenRole)) {
      const account = await queryOne(
        `SELECT sa.id, sa.student_no, sa.email, sa.first_name, sa.middle_name, sa.last_name, sa.avatar_filename,
                sa.status AS account_status, s.status AS student_status, s.name
           FROM student_accounts sa
           LEFT JOIN students s ON s.student_no = sa.student_no
          WHERE sa.id = $1`,
        [payload.account_id || userId]
      );
      if (!account || String(account.account_status).toLowerCase() !== "active" ||
          (account.student_status && String(account.student_status).toLowerCase() !== "active")) {
        await logUnauthorizedAccess(req, "Inactive or missing student account", { userId });
        return null;
      }
      return {
        id: String(account.id),
        accountId: account.id,
        principalType: "student",
        role: "Student",
        officeId: null,
        office_id: null,
        studentNo: account.student_no ? String(account.student_no) : null,
        student_no: account.student_no ? String(account.student_no) : null,
        email: account.email || null,
        status: "Active",
        sessionId: payload.jti,
        jti: payload.jti,
        fname: account.first_name || "",
        lname: account.last_name || "",
        avatar_filename: account.avatar_filename || null,
        payload,
      };
    }

    const staff = await getStaffById(userId);
    const currentRole = normalizeRole(staff?.role);
    if (!staff || staff.status !== "Active" || !currentRole || currentRole !== tokenRole) {
      await logInvalidSession(req, "Missing, inactive, or role-changed staff account", { userId });
      return null;
    }

    return {
      id: staff.id,
      principalType: "staff",
      role: currentRole,
      officeId: staff.office_id || null,
      office_id: staff.office_id || null,
      section: staff.section || null,
      email: staff.email,
      fname: staff.fname,
      lname: staff.lname,
      status: staff.status,
      totp_enabled: Boolean(staff.totp_enabled),
      avatar_filename: staff.avatar_filename || null,
      mustChangePassword: Boolean(payload.mustChangePassword),
      studentNo: null,
      sessionId: payload.jti,
      jti: payload.jti,
      payload,
    };
  } catch (err) {
    await logInvalidSession(req, "Authentication principal resolution failed");
    return null;
  }
}

export async function validateSession(req) {
  const user = await getAuthenticatedPrincipal(req);
  return user
    ? { user, error: null }
    : { user: null, error: "Invalid or missing session" };
}

/**
 * Checks if user has admin role
 * @param {object} user - User object from validateSession
 * @returns {boolean}
 */
export function isAdmin(user) {
  if (!user) return false;
  return isSystemAdminRole(user.role) || normalizeRole(user.role) === "Admin";
}

/**
 * Checks if user has staff role (any authenticated user)
 * @param {object} user - User object from validateSession
 * @returns {boolean}
 */
export function isStaff(user) {
  if (!user) return false;
  return user.status === "Active" && !isStudentRole(user.role);
}

export function getPrincipalOfficeId(user) {
  const officeId = user?.officeId ?? user?.office_id;
  return officeId ? String(officeId).trim().toLowerCase() : null;
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
      const userRole = normalizeRole(user.role);
      const requiredRoles = allowedRoles.map(normalizeRole).filter(Boolean);
      const hasRequiredRole = requiredRoles.includes(userRole) ||
        (isSystemAdminRole(userRole) && !requiredRoles.includes("Student"));
      
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
 * Middleware function for systemadmin-only routes
 * @param {Request} req - The request object
 * @returns {Promise<{user: object, error: string|null}>}
 */
export async function requireSystemAdmin(req) {
  return requireAuth(req, ["SystemAdmin", "SuperAdmin"]);
}

/**
 * Middleware function for superadmin-only routes
 * @param {Request} req - The request object
 * @returns {Promise<{user: object, error: string|null}>}
 */
export async function requireSuperAdmin(req) {
  return requireAuth(req, ["SystemAdmin", "SuperAdmin"]);
}

/**
 * Middleware function for staff routes (any authenticated user)
 * @param {Request} req - The request object
 * @returns {Promise<{user: object, error: string|null}>}
 */
export async function requireStaff(req) {
  return requireAuth(req, ["Staff", "Admin", "SystemAdmin", "SuperAdmin"]);
}

/**
 * Middleware function for student-only routes.
 */
export async function requireStudent(req) {
  return requireAuth(req, ["Student"]);
}

/**
 * Creates a standardized error response for authorization failures
 * @param {string} error - Error message
 * @param {number} [status=401] - HTTP status code
 * @returns {NextResponse}
 */
export function createAuthErrorResponse(error, status = 401) {
  const message = String(error || "").trim().toLowerCase();
  const isAuthenticationFailure = message === "unauthorized" ||
    message.includes("authentication required") ||
    message.includes("invalid or missing session") ||
    message.includes("invalid session") ||
    message.includes("missing session");
  const responseStatus = status === 403 && isAuthenticationFailure ? 401 : status;

  return NextResponse.json(
    { ok: false, error }, 
    { status: responseStatus }
  );
}

/**
 * Extracts the browser session token from the request.
 * Machine bearer tokens are handled only by their dedicated ingest route.
 * @param {Request} req - The request object
 * @returns {string|null}
 */
export function extractTokenFromHeaders(req) {
  const cookieName = getSessionCookieName();
  const cookieHeader = req?.headers?.get?.("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`));
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }

  if (req?.cookies?.get) {
    const val = req.cookies.get(cookieName)?.value;
    if (val) return val;
  }
  
  return null;
}

/**
 * Retrieves the full name of the currently authenticated user from the session cookie.
 * @returns {Promise<string>} The user's full name or an empty string if not authenticated.
 */
export async function getSessionActorName(req) {
  const principal = await getAuthenticatedPrincipal(req);
  return `${principal?.fname || ""} ${principal?.lname || ""}`.trim() || principal?.studentNo || "";
}
