import { dbRun, dbGet } from "../src/lib/sqlite.js";

async function main() {
  const result = await dbRun(
    `
      UPDATE staff
      SET fname = 'Admin', lname = ''
      WHERE lower(id) = 'admin'
         OR lower(email) = 'admin'
         OR lower(email) LIKE 'admin@%';
    `
  );

  const adminRow = await dbGet(
    `
      SELECT id, fname, lname, email, role
      FROM staff
      WHERE lower(id) = 'admin'
         OR lower(email) = 'admin'
         OR lower(email) LIKE 'admin@%'
      LIMIT 1;
    `
  );

  console.log("Updated rows:", result?.changes ?? 0);
  if (adminRow) {
    console.log("Admin record:", adminRow);
  } else {
    console.log("No matching admin record found.");
  }
}

main().catch((err) => {
  console.error("Failed to update admin name:", err);
  process.exit(1);
});
