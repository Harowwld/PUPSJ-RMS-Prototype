import { Pool } from "pg";
import dotenv from "dotenv";
import { decryptPII } from "../src/lib/piiEncryption.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

function decryptField(val) {
  if (!val || typeof val !== "string") return val;
  if (!val.includes("enc:v1:")) return val;
  if (val.startsWith("enc:v1:") && !val.includes(" ")) {
    return decryptPII(val);
  }
  return val
    .split(/\s+/)
    .map((part) => (part.startsWith("enc:v1:") ? decryptPII(part) : part))
    .join(" ")
    .trim();
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  console.log("Starting requester_name decryption migration...");
  
  // 1. Decrypt any rows where requester_name contains enc:
  const encRows = await pool.query(
    "SELECT id, student_no, requester_name FROM document_requests WHERE requester_name LIKE '%enc:v1:%'"
  );
  
  console.log(`Found ${encRows.rows.length} rows with encrypted requester_name.`);
  for (const row of encRows.rows) {
    const decrypted = decryptField(row.requester_name);
    console.log(`Updating row #${row.id}: "${row.requester_name}" -> "${decrypted}"`);
    await pool.query(
      "UPDATE document_requests SET requester_name = $1 WHERE id = $2",
      [decrypted, row.id]
    );
  }

  // 2. Backfill rows where requester_name is null using decrypted student/account name
  const nullRows = await pool.query(`
    SELECT dr.id, s.name AS s_name, sa.first_name AS sa_first, sa.middle_name AS sa_mid, sa.last_name AS sa_last, sa.email AS sa_email
    FROM document_requests dr
    LEFT JOIN students s ON s.student_no = dr.student_no
    LEFT JOIN student_accounts sa ON sa.id = dr.student_account_id
    WHERE dr.requester_name IS NULL
  `);

  console.log(`Found ${nullRows.rows.length} rows with NULL requester_name to backfill.`);
  for (const row of nullRows.rows) {
    const sName = decryptField(row.s_name);
    const saFirst = decryptField(row.sa_first);
    const saMid = decryptField(row.sa_mid);
    const saLast = decryptField(row.sa_last);
    const saFullName = [saFirst, saMid, saLast].filter(Boolean).join(" ");
    const saEmail = decryptField(row.sa_email);
    const resolved = sName || saFullName || saEmail || null;

    if (resolved) {
      await pool.query(
        "UPDATE document_requests SET requester_name = $1 WHERE id = $2",
        [resolved, row.id]
      );
    }
  }

  console.log("requester_name migration complete!");
  await pool.end();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
