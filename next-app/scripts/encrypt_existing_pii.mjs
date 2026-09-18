import { Pool } from "pg";
import { encryptPII } from "../src/lib/piiEncryption.js";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  console.log("Migrating remaining PII...");
  const accRes = await pool.query("SELECT id, first_name, middle_name, last_name FROM student_accounts");
  for (const row of accRes.rows) {
    if (row.first_name && row.first_name.startsWith("enc:v1:")) continue;

    await pool.query(
      "UPDATE student_accounts SET first_name = $1, middle_name = $2, last_name = $3 WHERE id = $4",
      [
        row.first_name ? encryptPII(row.first_name) : null,
        row.middle_name ? encryptPII(row.middle_name) : null,
        row.last_name ? encryptPII(row.last_name) : null,
        row.id
      ]
    );
  }
  console.log("Migration complete.");
  process.exit(0);
}
migrate();
