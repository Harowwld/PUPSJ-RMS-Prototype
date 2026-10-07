const DEMO_ACCOUNTS = new Set([
  "superadmin@pup.local",
  "admin.registrar@pup.local",
  "staff.registrar@pup.local",
  "admin.osas@pup.local",
  "staff.osas@pup.local",
  "student@pup.local",
  "test.student@pup.local",
]);

export function isDemoAccount(email) {
  return DEMO_ACCOUNTS.has(String(email || "").trim().toLowerCase());
}
