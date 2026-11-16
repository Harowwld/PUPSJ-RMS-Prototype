import { agingRegistrarQueue, agingProposals, agingPostEventReports } from "./workflowQueueFilters.js";
import { transaction } from "./postgres.js";
import { claimNotificationOccurrence, queueOfficeWorkflowNotification, queuePortalWorkflowNotification } from "./workflowNotificationsRepo.js";

const campusToday = "(now() AT TIME ZONE 'Asia/Manila')::date";

const reminderWindows = { request_pickup_deadline: 7, osas_report_due: 3 };

const reminders = [
  {
    eventKey: "request_pickup_deadline",
    sql: `SELECT request.id, request.portal_submitter_account_id AS account_id,
                 request.pickup_claim_by::text AS deadline
            FROM document_requests request
           WHERE request.office_id = 'registrar' AND request.status = 'Ready'
             AND request.portal_submitter_account_id IS NOT NULL
             AND request.pickup_claim_by BETWEEN ${campusToday} AND ${campusToday} + ${reminderWindows.request_pickup_deadline}
             AND NOT EXISTS (SELECT 1 FROM workflow_notification_occurrences sent
                WHERE sent.event_key = $1 AND sent.occurrence_key = request.id || ':' || request.pickup_claim_by::text)
           ORDER BY request.pickup_claim_by, request.id LIMIT 200 FOR UPDATE OF request SKIP LOCKED`,
    targetPath: (id) => `/student?view=odrs&request=${id}`,
    detail: (date) => `Claim your document by ${date}.`,
  },
  {
    eventKey: "osas_report_due",
    sql: `SELECT proposal.id, version.portal_submitter_account_id AS account_id,
                 proposal.post_event_due_date::text AS deadline
            FROM event_proposals proposal
            JOIN LATERAL (
              SELECT portal_submitter_account_id FROM event_proposal_versions
               WHERE event_proposal_id = proposal.id ORDER BY revision_number DESC LIMIT 1
            ) version ON version.portal_submitter_account_id IS NOT NULL
           WHERE proposal.office_id = 'osas' AND proposal.status = 'Approved'
             AND proposal.post_event_status = 'Pending Submission'
             AND proposal.post_event_due_date BETWEEN ${campusToday} AND ${campusToday} + ${reminderWindows.osas_report_due}
             AND NOT EXISTS (SELECT 1 FROM osas_post_event_reports report WHERE report.event_proposal_id = proposal.id)
             AND NOT EXISTS (SELECT 1 FROM workflow_notification_occurrences sent
                WHERE sent.event_key = $1 AND sent.occurrence_key = proposal.id || ':' || proposal.post_event_due_date::text)
           ORDER BY proposal.post_event_due_date, proposal.id LIMIT 200 FOR UPDATE OF proposal SKIP LOCKED`,
    targetPath: (id) => `/student?view=osas&postEventFor=${id}`,
    detail: (date) => `Submit your post-event report by ${date}.`,
  },
];

const queueSummarySql = `
  SELECT 'registrar' AS office_id, 'document_requests' AS module_id, count(*)::int AS awaiting,
         'online document requests' AS queue_name
    FROM document_requests dr WHERE ${agingRegistrarQueue}
  UNION ALL
  SELECT 'osas', 'osas_monitoring', (
    (SELECT count(*) FROM event_proposals ep WHERE ep.office_id = 'osas' AND ${agingProposals}) +
    (SELECT count(*) FROM osas_post_event_reports per WHERE ${agingPostEventReports})
  )::int, 'proposals or post-event reports'
`;

export async function runWorkflowReminderCycle() {
  await transaction(async (db) => {
    for (const { eventKey, sql, targetPath, detail } of reminders) {
      const { rows } = await db.query(sql, [eventKey]);
      for (const row of rows) {
        if (!await claimNotificationOccurrence(db, eventKey, `${row.id}:${row.deadline}`)) continue;
        const date = new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeZone: "UTC" })
          .format(new Date(`${row.deadline}T00:00:00Z`));
        await queuePortalWorkflowNotification(db, {
          accountId: row.account_id, eventKey, targetPath: targetPath(row.id), detail: detail(date),
        });
      }
    }
    const { rows: queues } = await db.query(
      `SELECT summary.*, ${campusToday}::text AS date FROM (${queueSummarySql}) summary
        JOIN office_modules om ON om.office_id = summary.office_id
          AND om.module_id = summary.module_id AND om.enabled
       WHERE awaiting > 0`,
    );
    for (const queue of queues) {
      const eventKey = `queue_${queue.office_id}_aging`;
      if (!await claimNotificationOccurrence(db, eventKey, queue.date)) continue;
      await queueOfficeWorkflowNotification(db, {
        officeId: queue.office_id, eventKey, title: "Items Still Awaiting Review",
        detail: `${queue.awaiting} ${queue.queue_name} have been waiting for at least 3 days.`,
        entityType: "office_queue", entityId: queue.module_id,
      });
    }
  });
}

export function initWorkflowReminderScheduler() {
  if (globalThis.__workflowReminderScheduler) return;
  globalThis.__workflowReminderScheduler = true;

  const schedule = (delay) => {
    const timer = setTimeout(async () => {
      try {
        await runWorkflowReminderCycle();
      } catch (error) {
        if (error.code !== "42P01" && error.code !== "42703") {
          console.warn("Workflow reminder cycle failed", { code: error.code });
        }
      } finally {
        schedule(60 * 60 * 1000);
      }
    }, delay);
    timer.unref();
  };
  schedule(5000);
}
