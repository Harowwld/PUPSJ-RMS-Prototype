import { isAdminRole, isSystemAdminRole } from "./roleUtils";

export const ROLE_BRANDING = {
  black: { key: "black", color: "#000000", foreground: "#FFFFFF", iconSrc: "/assets/branding/black-icon.png" },
  blue: { key: "blue", color: "#005AFF", foreground: "#FFFFFF", iconSrc: "/assets/branding/blue-icon.png" },
  red: { key: "red", color: "#970000", foreground: "#FFFFFF", iconSrc: "/assets/branding/red-icon.png" },
  yellow: { key: "yellow", color: "#EDBB00", foreground: "#1C1C1E", iconSrc: "/assets/branding/yellow-icon.png" },
};

function isOsas(officeId, officeName) {
  return /osas|student affairs/i.test(`${officeId || ""} ${officeName || ""}`);
}

function isAro(officeId, officeName) {
  return /aro|registrar|academic records/i.test(`${officeId || ""} ${officeName || ""}`);
}

/** Resolve the supplied color/icon branding from the authenticated context. */
export function getRoleBranding(context = {}) {
  const { role, officeId = context.office_id, officeName = context.office_name } = context;
  if (isSystemAdminRole(role)) return ROLE_BRANDING.black;
  if (isAdminRole(role) && isOsas(officeId, officeName)) return ROLE_BRANDING.blue;
  if (isAdminRole(role) && isAro(officeId, officeName)) return ROLE_BRANDING.red;
  if (isOsas(officeId, officeName) || isAro(officeId, officeName)) return ROLE_BRANDING.yellow;
  return ROLE_BRANDING.black;
}
