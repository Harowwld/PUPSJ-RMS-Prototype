import { getStaffByUsername } from './src/lib/staffRepo.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
  const staff = await getStaffByUsername('superadmin@pup.local');
  console.log("Found staff:", staff ? staff.id : "null");
  process.exit(0);
}
test();
