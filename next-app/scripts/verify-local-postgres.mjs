import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: ".env" });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const client = new Client({ connectionString: process.env.DATABASE_URL });
const requiredTables = [
  "schema_migrations", "offices", "modules", "office_modules", "staff", "students",
  "student_accounts", "documents", "document_requests", "event_proposals",
  "document_request_feedback", "transaction_updates", "global_audit_logs", "recognition_templates",
  "student_office_memberships", "student_identity_profiles", "student_identity_link_reviews",
];

try {
  await client.connect();
  for (const table of requiredTables) {
    const result = await client.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
    console.log(`${table}=${result.rows[0].count}`);
  }

  const unlinkedTransactions = await client.query(`
    SELECT entity_type, entity_id FROM (
      SELECT 'document_request'::text AS entity_type, dr.id AS entity_id
      FROM document_requests dr
      WHERE dr.identity_profile_id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM student_identity_link_reviews review
          WHERE review.entity_type = 'document_request'
            AND review.entity_id = dr.id AND review.status = 'Pending'
        )
      UNION ALL
      SELECT 'event_proposal', ep.id
      FROM event_proposals ep
      WHERE ep.identity_profile_id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM student_identity_link_reviews review
          WHERE review.entity_type = 'event_proposal'
            AND review.entity_id = ep.id AND review.status = 'Pending'
        )
      UNION ALL
      SELECT 'request_feedback', rf.id
      FROM document_request_feedback rf
      WHERE rf.identity_profile_id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM student_identity_link_reviews review
          WHERE review.entity_type = 'request_feedback'
            AND review.entity_id = rf.id AND review.status = 'Pending'
        )
    ) unlinked
  `);
  if (unlinkedTransactions.rowCount) {
    const examples = unlinkedTransactions.rows.slice(0, 5).map((row) => `${row.entity_type}:${row.entity_id}`).join(", ");
    throw new Error(`Found transaction records without an identity profile or pending link review: ${examples}`);
  }

  const unreviewedSecondaryAccounts = await client.query(`
    SELECT ranked.id
    FROM (
      SELECT sa.id, sa.student_no,
             row_number() OVER (PARTITION BY sa.student_no ORDER BY sa.id) AS account_rank
      FROM student_accounts sa
      WHERE sa.student_no IS NOT NULL
    ) ranked
    WHERE ranked.account_rank > 1
      AND NOT EXISTS (
        SELECT 1 FROM student_identity_link_reviews review
        WHERE review.entity_type = 'student_account'
          AND review.entity_id = ranked.id
      )
  `);
  if (unreviewedSecondaryAccounts.rowCount) {
    const ids = unreviewedSecondaryAccounts.rows.slice(0, 5).map((row) => row.id).join(", ");
    throw new Error(`Found secondary accounts without an identity-link review record: ${ids}`);
  }

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
