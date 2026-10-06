import dotenv from "dotenv";
import pg from "pg";
import { decryptPII, encryptPII } from "../src/lib/piiEncryption.js";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const applyChanges = process.argv.includes("--apply");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT id, email FROM student_identity_profiles
       WHERE email IS NOT NULL ORDER BY id FOR UPDATE`
    );

    const normalized = rows.map((row) => {
      const clearEmail = decryptPII(row.email);
      if (String(row.email).startsWith("enc:v1:") && clearEmail === row.email) {
        throw new Error(`Cannot decrypt email for identity profile ${row.id}; no rows were changed.`);
      }
      return { id: row.id, email: String(clearEmail || "").trim().toLowerCase() };
    });

    const idsByEmail = new Map();
    for (const row of normalized) {
      if (!row.email) continue;
      const ids = idsByEmail.get(row.email) || [];
      ids.push(row.id);
      idsByEmail.set(row.email, ids);
    }
    const duplicates = [...idsByEmail.entries()].filter(([, ids]) => ids.length > 1);
    if (duplicates.length) {
      const identities = duplicates.map(([, ids]) => ids.join("/"));
      throw new Error(`Case-insensitive duplicate identity profile IDs found: ${identities.join(", ")}. No rows were changed.`);
    }

    if (!applyChanges) {
      await client.query("ROLLBACK");
      console.log(`Preflight passed: ${normalized.length} profile emails can be canonicalized. Re-run with --apply to write encrypted lowercase values.`);
    } else {
      for (const row of normalized) {
        await client.query(
          `UPDATE student_identity_profiles
           SET email = $1, updated_at = NOW()
           WHERE id = $2`,
          [encryptPII(row.email), row.id]
        );
      }
      await client.query("COMMIT");
      console.log(`Canonicalized and encrypted ${normalized.length} student identity profile emails.`);
    }
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
