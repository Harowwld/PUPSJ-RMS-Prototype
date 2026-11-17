export const postEventFileLabels = {
  narrative: "Narrative Report",
  liquidation: "Financial Liquidation",
};

export const postEventCampusToday = "(now() AT TIME ZONE 'Asia/Manila')::date";

export function awaitingFirstPostEventReport(alias) {
  return `${alias}.office_id = 'osas' AND ${alias}.status = 'Approved' AND ${alias}.archived_at IS NULL
    AND ${alias}.post_event_status IN ('Pending Submission', 'Overdue')
    AND NOT EXISTS (SELECT 1 FROM osas_post_event_reports report WHERE report.event_proposal_id = ${alias}.id)`;
}

export function validatePostEventRevision(report, { narrative, liquidation, actualAttendance, totalExpenses }) {
  const replacements = [narrative && "narrative", liquidation && "liquidation"].filter(Boolean);
  const requested = report.revision_files || [];
  if (requested.some((file) => !replacements.includes(file))) {
    return "Attach every replacement PDF requested by OSAS.";
  }
  if (!narrative && !report.narrative_storage_filename) return "Attach a narrative report PDF.";
  if (!replacements.length && actualAttendance === Number(report.actual_attendance) && totalExpenses === Number(report.total_expenses)) {
    return "Replace a PDF or update the report details before resubmitting.";
  }
  return null;
}

export const postEventReminderRecipientJoin = `
  JOIN LATERAL (
    SELECT portal_submitter_account_id, submitted_by_email FROM event_proposal_versions
     WHERE event_proposal_id = proposal.id ORDER BY revision_number DESC LIMIT 1
  ) version ON version.portal_submitter_account_id IS NOT NULL
  JOIN student_accounts recipient ON recipient.id = version.portal_submitter_account_id AND recipient.status = 'Active'
  JOIN student_organizations org ON org.id = proposal.organization_id AND org.status = 'Active' AND org.archived_at IS NULL
  WHERE EXISTS (
    SELECT 1 FROM organization_officers officer
     WHERE officer.organization_id = proposal.organization_id AND officer.status = 'Active'
       AND lower(officer.email) = lower(version.submitted_by_email)
  )`;
