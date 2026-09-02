import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config();
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const client = new Client({ connectionString: process.env.DATABASE_URL });
const requiredTables = [
  "schema_migrations", "offices", "modules", "office_modules", "staff", "students",
  "student_accounts", "documents", "document_requests", "event_proposals",
  "transaction_updates", "global_audit_logs", "recognition_templates",
];

try {
  await client.connect();
  for (const table of requiredTables) {
    const result = await client.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
    console.log(`${table}=${result.rows[0].count}`);
  }

  const fkCheck = await client.query(`
    SELECT COUNT(*)::int AS count FROM document_requests dr
    LEFT JOIN students s ON s.student_no = dr.student_no
    WHERE s.student_no IS NULL
  `);
  if (fkCheck.rows[0].count) throw new Error("Found document requests without a matching student.");

  const moduleCheck = await client.query(`
    SELECT o.id, COUNT(m.id)::int AS module_count
    FROM offices o LEFT JOIN office_modules om ON om.office_id = o.id AND om.enabled = true
    LEFT JOIN modules m ON m.id = om.module_id
    GROUP BY o.id ORDER BY o.id
  `);
  for (const row of moduleCheck.rows) {
    if (row.module_count === 0) throw new Error(`Office ${row.id} has no enabled modules.`);
  }

  const orphanUpdates = await client.query(`
    SELECT COUNT(*)::int AS count FROM transaction_updates tu
    LEFT JOIN document_requests dr ON dr.id = tu.document_request_id
    LEFT JOIN event_proposals ep ON ep.id = tu.event_proposal_id
    WHERE (tu.document_request_id IS NOT NULL AND dr.id IS NULL)
       OR (tu.event_proposal_id IS NOT NULL AND ep.id IS NULL)
  `);
  if (orphanUpdates.rows[0].count) throw new Error("Found transaction updates without a matching parent record.");
  console.log("Local PostgreSQL invariant checks passed.");
} finally {
  await client.end().catch(() => {});
}
