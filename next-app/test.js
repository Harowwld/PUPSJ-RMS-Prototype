import { Pool } from "pg";
import { decryptPII } from "./next-app/src/lib/piiEncryption.js";
import dotenv from 'dotenv';
dotenv.config({ path: 'next-app/.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function test() {
  const staffRes = await pool.query("SELECT id, email FROM staff");
  for (const row of staffRes.rows) {
    console.log(decryptPII(row.email));
  }
  process.exit(0);
}
test();
