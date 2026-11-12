import { createHmac, randomInt } from "node:crypto";
import { queryOne, transaction } from "./postgres.js";
import { encryptPII } from "./piiEncryption.js";
import { sendEmailVerificationCode } from "./accountEmail.js";

function hashCode(staff, code) {
  return createHmac("sha256", process.env.JWT_SECRET)
    .update(JSON.stringify(["staff-email-verification", staff.id, staff.email, code]))
    .digest("hex");
}

export async function sendStaffVerification(staff, deliver = sendEmailVerificationCode) {
  const code = String(randomInt(1_000_000)).padStart(6, "0");
  const hash = hashCode(staff, code);
  const challenge = await queryOne(
    `INSERT INTO staff_email_verifications AS pending (staff_id, code_hash)
     VALUES ($1, $2)
     ON CONFLICT (staff_id) DO UPDATE SET
       code_hash = EXCLUDED.code_hash, sent_at = EXCLUDED.sent_at,
       expires_at = EXCLUDED.expires_at, attempts_remaining = EXCLUDED.attempts_remaining
     WHERE pending.sent_at <= NOW() - INTERVAL '1 minute'
     RETURNING staff_id`,
    [staff.id, hash],
  );
  if (!challenge) return { sent: false, reason: "cooldown" };

  try {
    await deliver({ to: staff.email, code, staff: true });
    return { sent: true };
  } catch (error) {
    await queryOne(
      "DELETE FROM staff_email_verifications WHERE staff_id = $1 AND code_hash = $2 RETURNING staff_id",
      [staff.id, hash],
    );
    console.error("Staff verification email failed:", error?.code || error?.name);
    return { sent: false, reason: "delivery_failed" };
  }
}

export async function verifyStaffEmail(staff, code) {
  const hash = hashCode(staff, code);
  return transaction(async (tx) => {
    const current = await tx.queryOne(
      "SELECT id FROM staff WHERE id = $1 AND email IN ($2, $3) AND status = 'Active' AND email_verification_required FOR UPDATE",
      [staff.id, encryptPII(staff.email), staff.email],
    );
    if (!current) return false;

    const challenge = await tx.queryOne(
      `UPDATE staff_email_verifications SET attempts_remaining = attempts_remaining - 1
       WHERE staff_id = $1 AND expires_at > NOW() AND attempts_remaining > 0
       RETURNING (code_hash = $2) AS matched`,
      [staff.id, hash],
    );
    if (!challenge?.matched) return false;

    await tx.query("UPDATE staff SET email_verification_required = FALSE WHERE id = $1", [staff.id]);
    await tx.query("DELETE FROM staff_email_verifications WHERE staff_id = $1", [staff.id]);
    return true;
  });
}
