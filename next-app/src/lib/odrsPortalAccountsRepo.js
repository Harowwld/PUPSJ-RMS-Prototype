import { decryptPII } from "./piiEncryption.js";
import { query } from "./postgres.js";

const accountFields = `sa.id, sa.student_no, sa.status, sa.created_at, sip.email,
  sip.display_name, sip.first_name, sip.last_name, sip.client_type`;

function serializeAccount(row) {
  return {
    id: String(row.id),
    name: decryptPII(row.display_name) || [decryptPII(row.first_name), decryptPII(row.last_name)].filter(Boolean).join(" "),
    email: decryptPII(row.email),
    affiliation: row.client_type,
    status: row.status,
    studentNo: row.student_no,
    createdAt: row.created_at,
  };
}

export async function listOdrsPortalAccounts() {
  const rows = await query(
    `SELECT ${accountFields} FROM student_accounts sa
      JOIN student_identity_profiles sip ON sip.id = sa.identity_profile_id
      ORDER BY sa.created_at DESC, sa.id DESC`,
  );
  return rows.map(serializeAccount);
}
