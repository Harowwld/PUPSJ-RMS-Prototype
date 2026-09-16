import { isAdminRole, isSystemAdminRole, isStaffRole } from "./roleUtils.js";

export const ROLE_BRANDING = {
  red: { key: "red", color: "#800000", foreground: "#FFFFFF", iconSrc: "/assets/branding/black-icon.png" },
  black: { key: "black", color: "#0F172A", foreground: "#FFFFFF", iconSrc: "/assets/branding/black-icon.png" },
  white: { key: "white", color: "#FFFFFF", foreground: "#0F172A", iconSrc: "/assets/branding/white-icon.png" },
  orange: { key: "orange", color: "#EA580C", foreground: "#FFFFFF", iconSrc: "/assets/branding/orange-icon.png" },
  blue: { key: "blue", color: "#005AFF", foreground: "#FFFFFF", iconSrc: "/assets/branding/blue-icon.png" },
  green: { key: "green", color: "#16A34A", foreground: "#FFFFFF", iconSrc: "/assets/branding/green-icon.png" },
  yellow: { key: "yellow", color: "#EDBB00", foreground: "#1C1C1E", iconSrc: "/assets/branding/yellow-icon.png" },
};

function getContextText(ctx = {}) {
  if (typeof ctx === "string") return ctx;
  return [
    ctx.officeId,
    ctx.office_id,
    ctx.officeName,
    ctx.office_name,
    ctx.office,
    ctx.section,
    ctx.role,
    ctx.department,
  ].filter(Boolean).join(" ");
}

function isOsas(ctx = {}) {
  return /osas|student affairs/i.test(getContextText(ctx));
}

function isAro(ctx = {}) {
  return /aro|registrar|academic records/i.test(getContextText(ctx));
}

function isSecondaryOffice(ctx = {}) {
  return /guidance|clinic|health|library|finance|accounting|cashier/i.test(getContextText(ctx));
}

/** Resolve the supplied color/icon branding from the authenticated context. */
export function getRoleBranding(context = {}) {
  const ctx = context || {};
  const role = ctx.role;

  if (String(role || "").toLowerCase().trim() === "student") return ROLE_BRANDING.red;

  // 1. SystemAdmin / SuperAdmin (Global Level - Always Black)
  if (isSystemAdminRole(role)) {
    return ROLE_BRANDING.black;
  }

  // 2. Admin Level (Office-Scoped Administrator)
  if (isAdminRole(role)) {
    if (isOsas(ctx)) return ROLE_BRANDING.blue;
    if (isAro(ctx)) return ROLE_BRANDING.orange;
    if (isSecondaryOffice(ctx)) return ROLE_BRANDING.green;
    return ROLE_BRANDING.orange;
  }

  // 3. Staff Level (Operational Records Staff)
  if (isStaffRole(role)) {
    return ROLE_BRANDING.yellow;
  }

  // 4. Office-based resolution when role is omitted or contextual
  if (isOsas(ctx)) return ROLE_BRANDING.blue;
  if (isAro(ctx)) return ROLE_BRANDING.orange;
  if (isSecondaryOffice(ctx)) return ROLE_BRANDING.green;

  return ROLE_BRANDING.black;
}

