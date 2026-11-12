const DEMO_ACCOUNTS = new Map([
  ["superadmin@pup.com", "PUPSUPERADMIN-001"],
  ["admin.registrar@pup.com", "PUPREGISTRAR-003"],
  ["staff.registrar@pup.com", "PUPREGISTRAR-002"],
  ["admin.osas@pup.com", "PUPOSAS-001"],
  ["staff.osas@pup.com", "PUPOSAS-002"],
  ["student@pup.com", "2022-10001-SJ-0"],
  ["test.student@pup.com", "2023-00001-SJ-0"],
]);

export function getDemoAccountId(email) {
  return DEMO_ACCOUNTS.get(String(email || "").trim().toLowerCase());
}

export function isDemoAccount(email) {
  return Boolean(getDemoAccountId(email));
}
