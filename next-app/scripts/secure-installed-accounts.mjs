import crypto from "node:crypto";
import dotenv from "dotenv";
import { Pool } from "pg";
import { hashPassword } from "../src/lib/passwordHash.js";

dotenv.config({ path: ".env" });

const password = String(process.env.DEFAULT_STAFF_PASSWORD || "").trim();
if (password.length < 12) {
  throw new Error("DEFAULT_STAFF_PASSWORD must contain at least 12 characters.");
}

const seededHash = crypto.createHash("sha256").update("pupstaff").digest("hex");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const result = await pool.query(
    `UPDATE staff
     SET password_hash = $1, password_last_changed = NOW(), updated_at = NOW()
     WHERE password_hash = $2`,
    [hashPassword(password), seededHash],
  );
  console.log(`[install] Secured ${result.rowCount} account(s) that still had the seeded password.`);
} finally {
  await pool.end();
}
