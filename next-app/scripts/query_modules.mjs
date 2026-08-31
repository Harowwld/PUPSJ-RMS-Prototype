import Database from "better-sqlite3";
import path from "node:path";

const dbPath = path.join(process.cwd(), ".local/system.sqlite");
try {
  const db = new Database(dbPath);
  const modules = db.prepare("SELECT id, name, icon FROM modules").all();
  console.log("Modules in database:", JSON.stringify(modules, null, 2));
  db.close();
} catch (e) {
  console.error("Error:", e.message);
}
