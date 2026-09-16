import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'next-app/.env.local' });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
async function check() {
  const res = await pool.query("SELECT * FROM staff");
  console.log("Found staff:", res.rowCount);
  console.log(res.rows);
  process.exit(0);
}
check();
