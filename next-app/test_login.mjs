import { queryOne } from './src/lib/postgres.js';
import { verifyPasswordHash } from './src/lib/passwordHash.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
  const staff = await queryOne("SELECT * FROM staff WHERE email = 'enc:v1:9b08f4c3f56e9fbbbb2e4f07a2a7f5a3:d560c5da2c8b725c832c32cf9de8b7c3'"); // Wait, how to search?
  // Let's just find by id
  const row = await queryOne("SELECT * FROM staff WHERE id = 'PUPSUPERADMIN-001'");
  if (!row) {
    console.log("Not found");
    process.exit(1);
  }
  const match = verifyPasswordHash('pupstaff', row.password_hash);
  console.log("Password match:", match.valid);
  process.exit(0);
}
test();
