import { createStaff } from "../src/lib/staffRepo.js";
import { reloadDb } from "../src/lib/sqlite.js";

async function main() {
  const id = process.env.ADMIN_ID || "admin";
  const fname = process.env.ADMIN_FNAME || "admin";
  const lname = process.env.ADMIN_LNAME || " ";
  const email = process.env.ADMIN_EMAIL || " ";
  const section = process.env.ADMIN_SECTION || "Registrar";
  const role = "Admin";
  const status = "Active";
  const password = process.env.ADMIN_PASSWORD || "admin123";

  console.log("[add-admin] Creating admin user with:");
  console.log({ id, fname, lname, email, section, role, status });

  try {
    const staff = await createStaff({
      id,
      fname,
      lname,
      role,
      section,
      status,
      email,
      lastActive: null,
      password,
    });

    console.log("[add-admin] Created admin user:");
    console.log(staff);
  } catch (err) {
    console.error("[add-admin] Failed to create admin:", err?.message || err);
  } finally {
    // Ensure in-memory DB is flushed to disk and reloaded cleanly for app usage
    reloadDb();
  }
}

main();
