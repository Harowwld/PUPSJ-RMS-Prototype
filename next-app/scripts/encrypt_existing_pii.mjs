import dotenv from "dotenv";
import pg from "pg";
import { decryptPII, encryptPII } from "../src/lib/piiEncryption.js";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT id, first_name, middle_name, last_name, display_name, email
         FROM student_identity_profiles
        ORDER BY id
        FOR UPDATE`,
    );

    const profiles = rows.map((row) => {
      const clear = (value, field) => {
        if (!value) return null;
        const plaintext = decryptPII(value);
        if (String(value).startsWith("enc:v1:") && plaintext === value) {
          throw new Error(`Cannot decrypt ${field} for identity profile ${row.id}; no rows were changed.`);
        }
        return plaintext;
      };
      return {
        id: row.id,
        firstName: clear(row.first_name, "first_name"),
        middleName: clear(row.middle_name, "middle_name"),
        lastName: clear(row.last_name, "last_name"),
        displayName: clear(row.display_name, "display_name"),
        email: clear(row.email, "email")?.trim().toLowerCase() || null,
      };
    });

    const idsByEmail = new Map();
    for (const profile of profiles) {
      if (!profile.email) continue;
      const ids = idsByEmail.get(profile.email) || [];
      ids.push(profile.id);
      idsByEmail.set(profile.email, ids);
    }
    const duplicates = [...idsByEmail.values()].filter((ids) => ids.length > 1);
    if (duplicates.length) {
      throw new Error(`Case-insensitive duplicate profile email IDs found: ${duplicates.map((ids) => ids.join("/")).join(", ")}. No rows were changed.`);
    }

    for (const profile of profiles) {
      await client.query(
        `UPDATE student_identity_profiles
            SET first_name = $1, middle_name = $2, last_name = $3,
                display_name = $4, email = $5, updated_at = NOW()
          WHERE id = $6`,
        [
          encryptPII(profile.firstName),
          encryptPII(profile.middleName),
          encryptPII(profile.lastName),
          encryptPII(profile.displayName),
          encryptPII(profile.email),
          profile.id,
        ],
      );
    }
    await client.query("COMMIT");
    console.log(`Canonicalized and encrypted PII for ${profiles.length} student identity profiles.`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
