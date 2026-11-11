import { decryptPII, encryptPII } from "./piiEncryption.js";
import { query, transaction } from "./postgres.js";

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

async function findRegistrarRecord(db, studentNo, { lock = false } = {}) {
  return db.queryOne(
    `SELECT s.student_no FROM students s
      JOIN student_office_memberships som ON som.student_no = s.student_no
      WHERE s.student_no = $1 AND s.status = 'Active'
        AND som.office_id = 'registrar' AND som.status = 'Active'
      ${lock ? "FOR UPDATE OF som" : ""}`,
    [studentNo],
  );
}

async function findAccountByEmail(db, email, { lock = false } = {}) {
  const { rows } = await db.query(
    `SELECT ${accountFields} FROM student_accounts sa
      JOIN student_identity_profiles sip ON sip.id = sa.identity_profile_id
      WHERE sip.email = $1 OR lower(sip.email) = $2
      ORDER BY sa.id LIMIT 2 ${lock ? "FOR UPDATE OF sa, sip" : ""}`,
    [encryptPII(email), email],
  );
  return rows.length === 1 ? rows[0] : null;
}

export async function matchOdrsPortalAccount(studentNo, email, accountId = null) {
  return transaction(async (db) => {
    if (!await findRegistrarRecord(db, studentNo, { lock: Boolean(accountId) })) {
      return { error: "An active Registrar record is required.", status: 404 };
    }
    const account = await findAccountByEmail(db, email, { lock: Boolean(accountId) });
    if (!account) return { error: "No unique portal account matches this email address.", status: 404 };
    if (accountId && String(account.id) !== accountId) {
      return { error: "The portal account changed. Look it up again.", status: 409 };
    }
    if (account.status !== "Active" || account.client_type !== "Student") {
      return { error: "Only active current-student portal accounts can be linked.", status: 409 };
    }
    if (account.student_no && account.student_no !== studentNo) {
      return { error: "This portal account is already linked to another record.", status: 409 };
    }
    const otherAccount = await db.queryOne(
      "SELECT id FROM student_accounts WHERE student_no = $1 AND id <> $2 LIMIT 1",
      [studentNo, account.id],
    );
    if (otherAccount) return { error: "This student record already has a linked portal account.", status: 409 };

    const alreadyLinked = account.student_no === studentNo;
    if (!accountId || alreadyLinked) return { account: serializeAccount(account), alreadyLinked };

    await db.query(
      "UPDATE student_accounts SET student_no = $1, updated_at = NOW() WHERE id = $2",
      [studentNo, account.id],
    );
    return { account: serializeAccount({ ...account, student_no: studentNo }), alreadyLinked: false };
  });
}
