import { awaitingFirstPostEventReport, postEventCampusToday, postEventReminderRecipientJoin } from "./osasPostEventWorkflow.js";
import { query, queryOne } from "./postgres.js";
import { decryptPII } from "./piiEncryption.js";
import { assertAccountEmailConfigured, sendWorkflowNotificationEmail } from "./accountEmail.js";
import { workflowEvents, workflowNotificationReference } from "./workflowNotificationEvents.js";

async function canSendReminder(item, link) {
  if (item.event_key === "request_pickup_deadline") {
    return Boolean(await queryOne(
      `SELECT id FROM document_requests WHERE id = $1 AND portal_submitter_account_id = $2
        AND status = 'Ready' AND pickup_claim_by BETWEEN (now() AT TIME ZONE 'Asia/Manila')::date
          AND (now() AT TIME ZONE 'Asia/Manila')::date + 7`,
      [link.searchParams.get("request"), item.account_id],
    ));
  }
  if (item.event_key === "osas_report_due" || item.event_key === "osas_report_overdue") {
    const deadlineFilter = item.event_key === "osas_report_due"
      ? `BETWEEN ${postEventCampusToday} AND ${postEventCampusToday} + 3`
      : `< ${postEventCampusToday}`;
    return Boolean(await queryOne(
      `SELECT proposal.id FROM event_proposals proposal
          ${postEventReminderRecipientJoin}
          AND proposal.id = $1 AND version.portal_submitter_account_id = $2
          AND ${awaitingFirstPostEventReport("proposal")}
          AND proposal.post_event_due_date ${deadlineFilter}`,
      [link.searchParams.get("postEventFor"), item.account_id],
    ));
  }
  return true;
}

async function deliverNext(origin) {
  const item = await queryOne(
    `WITH pending AS (
       SELECT id FROM portal_workflow_notifications
        WHERE email_state = 'pending' AND next_email_attempt_at <= now()
        ORDER BY next_email_attempt_at, id LIMIT 1 FOR UPDATE SKIP LOCKED
     ) UPDATE portal_workflow_notifications n
       SET next_email_attempt_at = now() + interval '5 minutes', email_attempts = email_attempts + 1
       FROM pending WHERE pending.id = n.id
       RETURNING n.*`,
  );
  if (!item) return;
  let state = "skipped";
  try {
    const recipient = await queryOne(
      `SELECT sip.email FROM student_accounts sa
         JOIN student_identity_profiles sip ON sip.id = sa.identity_profile_id
         LEFT JOIN workflow_notification_preferences p ON p.principal_type = 'portal'
          AND p.principal_id = sa.id::text AND p.event_key = $2 AND p.channel = 'email'
        WHERE sa.id = $1 AND sa.status = 'Active' AND sip.portal_email_verified_at IS NOT NULL
          AND COALESCE(p.enabled, $2 = 'request_ready')`,
      [item.account_id, item.event_key],
    );
    const address = recipient?.email ? decryptPII(recipient.email) : "";
    const event = workflowEvents[item.event_key];
    const link = new URL(item.target_path, origin);
    if (event && address && !address.startsWith("enc:") && await canSendReminder(item, link)) {
      await sendWorkflowNotificationEmail({
        to: address,
        detail: item.detail,
        subject: [event.label, workflowNotificationReference(item.target_path)].filter(Boolean).join(" – "),
        link: link.toString(),
        messageId: `<workflow-${item.id}@${origin.hostname}>`,
      });
      state = "sent";
    }
  } catch (error) {
    console.warn("Workflow email delivery failed", { notificationId: item.id, code: error.code });
    state = item.email_attempts >= 6 ? "failed" : "pending";
  }
  await query(
    `UPDATE portal_workflow_notifications SET email_state = $2
      WHERE id = $1 AND email_attempts = $3`,
    [item.id, state, item.email_attempts],
  );
}

export function initWorkflowEmailWorker() {
  if (globalThis.__workflowEmailWorker) return;
  let origin;
  try {
    origin = new URL(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL);
    if (!["http:", "https:"].includes(origin.protocol)) return;
    assertAccountEmailConfigured();
  } catch {
    return;
  }
  const schedule = () => {
    const timer = setTimeout(async () => {
      try {
        await deliverNext(origin);
      } catch (error) {
        if (error.code !== "42P01") console.warn("Workflow email worker error", { code: error.code });
      } finally {
        schedule();
      }
    }, 5000);
    timer.unref();
  };
  globalThis.__workflowEmailWorker = true;
  schedule();
}
