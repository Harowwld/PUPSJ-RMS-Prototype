import { dbGet, dbRun } from "../src/lib/sqlite.js";

async function countStudents() {
  const row = await dbGet("SELECT COUNT(*) AS count FROM students");
  return Number(row?.count || 0);
}

async function main() {
  const before = await countStudents();
  await dbRun("DELETE FROM students");
  const after = await countStudents();

  console.log("Students before:", before);
  console.log("Students after:", after);
  console.log("Deleted:", before - after);
}

main().catch((err) => {
  console.error("Failed to clear students:", err);
  process.exit(1);
});
