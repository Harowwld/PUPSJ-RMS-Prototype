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

function isOsas(officeId, officeName) {
  return /osas|student affairs/i.test(`${officeId || ""} ${officeName || ""}`);
}

function isAro(officeId, officeName) {
  return /aro|registrar|academic records/i.test(`${officeId || ""} ${officeName || ""}`);
}

function isSecondaryOffice(officeId, officeName) {
  return /guidance|clinic|health|library|finance|accounting|cashier/i.test(`${officeId || ""} ${officeName || ""}`);
}

/** Resolve the supplied color/icon branding from the authenticated context. */
export function getRoleBranding(context = {}) {
  const { role, officeId = context.office_id, officeName = context.office_name } = context;

  if (String(role || "").toLowerCase().trim() === "student") return ROLE_BRANDING.red;

  // 1. SystemAdmin / SuperAdmin (Global Level - Always Black)
  if (isSystemAdminRole(role)) {
    return ROLE_BRANDING.black;
  }

  // 2. Admin Level (Office-Scoped Administrator)
  if (isAdminRole(role)) {
    if (isAro(officeId, officeName)) return ROLE_BRANDING.orange;
    if (isOsas(officeId, officeName)) return ROLE_BRANDING.blue;
    if (isSecondaryOffice(officeId, officeName)) return ROLE_BRANDING.green;
    return ROLE_BRANDING.orange;
  }

  // 3. Staff Level (Operational Records Staff)
  if (isStaffRole(role) || isOsas(officeId, officeName) || isAro(officeId, officeName)) {
    return ROLE_BRANDING.yellow;
  }

  return ROLE_BRANDING.black;
}
