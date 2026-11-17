import { workflowEvents, requestStatusEvents } from "./workflowNotificationEvents.js";
import { MISSING_DOCUMENTS_INQUIRY } from "./missingDocumentsInquiry.js";

export async function queuePortalWorkflowNotification(db, { accountId, eventKey, targetPath, detail = null }) {
  const event = workflowEvents[eventKey];
  if (!accountId || !event) return;
  await db.query(
    `INSERT INTO portal_workflow_notifications (account_id, event_key, target_path, in_app, email_state, detail)
     SELECT sa.id, $2, $3, COALESCE(in_app.enabled, true),
            CASE WHEN $4 AND COALESCE(email.enabled, $2 = 'request_ready')
                      AND sip.portal_email_verified_at IS NOT NULL THEN 'pending' ELSE 'none' END, $5
       FROM student_accounts sa
       JOIN student_identity_profiles sip ON sip.id = sa.identity_profile_id
       LEFT JOIN workflow_notification_preferences in_app
         ON in_app.principal_type = 'portal' AND in_app.principal_id = sa.id::text
        AND in_app.event_key = $2 AND in_app.channel = 'in_app'
       LEFT JOIN workflow_notification_preferences email
         ON email.principal_type = 'portal' AND email.principal_id = sa.id::text
        AND email.event_key = $2 AND email.channel = 'email'
      WHERE sa.id = $1`,
    [accountId, eventKey, targetPath, event.channels.includes("email"), detail],
  );
}

export async function queueRequestUpdate(db, { request, nextStatus, isReopen, pickupChanged, postedMessage, correctionsRequested, correctionsSubmitted }) {
  const statusChanged = request.status !== nextStatus;
  if (request.office_id === "registrar" && (isReopen || (statusChanged && nextStatus === "Pending"))) {
    await queueOfficeWorkflowNotification(db, {
      officeId: "registrar", eventKey: "queue_registrar_returned",
      title: correctionsSubmitted
        ? `Corrections for request #${request.id} awaiting review`
        : `Request #${request.id} returned to the queue`, entityType: "document_request", entityId: request.id,
    });
  }
  const eventKey = statusChanged && nextStatus === "Ready"
    ? (request.doc_type === MISSING_DOCUMENTS_INQUIRY ? "request_inquiry_response" : "request_ready")
    : correctionsSubmitted ? "request_corrections_received"
    : correctionsRequested ? "request_action_required"
    : isReopen ? "request_reopened"
    : statusChanged ? requestStatusEvents[nextStatus]
    : pickupChanged ? "request_pickup_updated"
    : postedMessage ? "request_update" : null;
  await queuePortalWorkflowNotification(db, {
    accountId: request.portal_submitter_account_id,
    eventKey,
    targetPath: `/student?view=odrs&request=${request.id}`,
  });
}

export function requestPickupSettingsKey(officeId) {
  return `request_pickup_instructions:${officeId}`;
}

export async function resolveReadyRequest(db, { request, nextStatus, pickupInstructions, message }) {
  if (request.office_id !== "registrar" || nextStatus !== "Ready") return {};
  const enteringReady = request.status !== "Ready";
  if (request.doc_type === MISSING_DOCUMENTS_INQUIRY) {
    return enteringReady && !message ? { error: "Enter a response to the inquiry before marking it ready." } : {};
  }
  if (!enteringReady && pickupInstructions === undefined) return {};
  let instructions = pickupInstructions?.trim();
  if (pickupInstructions === undefined) {
    const setting = await db.queryOne("SELECT value FROM settings WHERE key = $1", [requestPickupSettingsKey(request.office_id)]);
    instructions = setting?.value?.trim();
  }
  if (!instructions || instructions.length > 2000) {
    return { error: "Enter pickup instructions of 1 to 2,000 characters before saving." };
  }
  return { instructions, pickupChanged: instructions !== request.pickup_instructions };
}

export async function queueOfficeWorkflowNotification(db, { officeId, eventKey, title, entityType, entityId, detail = title }) {
  await db.query(
    `INSERT INTO notifications (office_id, type, title, message, severity, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $7, 'info', $4, $5, jsonb_build_object('queue_event', $6::text))`,
    [officeId, entityType, title, entityType, String(entityId), eventKey, detail],
  );
}

export async function claimNotificationOccurrence(db, eventKey, occurrenceKey) {
  return Boolean(await db.queryOne(
    `INSERT INTO workflow_notification_occurrences (event_key, occurrence_key)
     VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING event_key`,
    [eventKey, occurrenceKey],
  ));
}
