import { query } from './src/lib/postgres.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
  const res = await query("SELECT email FROM staff WHERE id = 'PUPSUPERADMIN-001'");
  console.log(res);
  process.exit(0);
}
check();
