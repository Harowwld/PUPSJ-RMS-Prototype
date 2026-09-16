import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'next-app/.env.local' });
import { encryptPII } from './src/lib/piiEncryption.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function fix() {
  const res = await pool.query("SELECT * FROM staff WHERE email = 'superadmin@pup.local'");
  if (res.rowCount > 0) {
    const row = res.rows[0];
    await pool.query(
      "UPDATE staff SET email = $1, fname = $2, lname = $3 WHERE id = $4",
      [encryptPII(row.email), encryptPII(row.fname), encryptPII(row.lname), row.id]
    );
    console.log("Superadmin encrypted.");
  } else {
    console.log("Superadmin not found in plaintext.");
  }
  process.exit(0);
}
fix();
