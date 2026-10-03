import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgres://pupsj_rms:pupsj_rms_local@localhost:5433/pupsj_rms'
});

async function run() {
  try {
    const res = await pool.query('UPDATE staff SET avatar_filename = NULL');
    console.log(`Updated ${res.rowCount} staff accounts.`);
    
    // Check if student_accounts exists
    try {
      const res2 = await pool.query('UPDATE student_accounts SET avatar_filename = NULL');
      console.log(`Updated ${res2.rowCount} student accounts.`);
    } catch (e) {
      console.log("student_accounts table probably doesn't have avatar_filename or doesn't exist");
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
