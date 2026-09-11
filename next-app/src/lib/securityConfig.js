const DEMO_VALUES = [
  "pupstaff",
  "student123",
  "password",
  "password123",
  "change-me",
  "changeme",
  "development",
  "dev-secret",
  "pup-dev-secret",
];
const DEMO_SUBSTRINGS = [
  "pupstaff",
  "student123",
  "change-me",
  "changeme",
  "development",
  "dev-secret",
  "pup-dev-secret",
];

function isDemoValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return DEMO_VALUES.includes(normalized) ||
    DEMO_SUBSTRINGS.some((demo) => normalized.includes(demo));
}

export function validateProductionSecurityConfig(env = process.env) {
  if (String(env.NODE_ENV || "").toLowerCase() !== "production") return;

  const jwtSecret = String(env.JWT_SECRET || "").trim();
  if (jwtSecret.length < 32 || isDemoValue(jwtSecret)) {
    throw new Error("Production requires a non-demo JWT_SECRET of at least 32 characters.");
  }

  const defaultPassword = String(env.DEFAULT_STAFF_PASSWORD || "").trim();
  if (defaultPassword.length < 8 || isDemoValue(defaultPassword)) {
    throw new Error("Production requires a non-demo DEFAULT_STAFF_PASSWORD.");
  }

  const publicDefaultPassword = String(
    env.NEXT_PUBLIC_DEFAULT_STAFF_PASSWORD || ""
  ).trim();
  if (publicDefaultPassword && isDemoValue(publicDefaultPassword)) {
    throw new Error("Production cannot expose a demo default password to the client.");
  }

  const ingestToken = String(env.HOT_FOLDER_INGEST_TOKEN || "").trim();
  if (ingestToken.length < 32 || isDemoValue(ingestToken)) {
    throw new Error("Production requires a non-demo HOT_FOLDER_INGEST_TOKEN of at least 32 characters.");
  }
}
