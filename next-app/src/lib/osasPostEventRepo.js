import { query, queryOne } from "./postgres.js";

/**
 * Creates a post-event narrative & liquidation submission
 */
export async function createPostEventReport({
  eventProposalId,
  organizationId,
  submittedByEmail,
  actualAttendance = 0,
  totalExpenses = 0.0,
  narrativeStorageFilename,
  narrativeOriginalFilename,
  liquidationStorageFilename = null,
  liquidationOriginalFilename = null,
}) {
  const report = await queryOne(
    `INSERT INTO osas_post_event_reports (
      event_proposal_id, organization_id, submitted_by_email,
      actual_attendance, total_expenses,
      narrative_storage_filename, narrative_original_filename,
      liquidation_storage_filename, liquidation_original_filename,
      status
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, 'Submitted'
    ) RETURNING *`,
    [
      eventProposalId,
      organizationId,
      submittedByEmail.toLowerCase(),
      actualAttendance,
      totalExpenses,
      narrativeStorageFilename,
      narrativeOriginalFilename,
      liquidationStorageFilename,
      liquidationOriginalFilename,
    ]
  );

  // Update proposal post_event_status
  await query(
    `UPDATE event_proposals
     SET post_event_status = 'Submitted', updated_at = NOW()
     WHERE id = $1`,
    [eventProposalId]
  );

  // Add transaction update log
  await query(
    `INSERT INTO transaction_updates (event_proposal_id, status, message)
     VALUES ($1, 'Post-Event Submitted', $2)`,
    [
      eventProposalId,
      `Official Post-Event Narrative Report and Liquidation package submitted by ${submittedByEmail}.`,
    ]
  );

  return report;
}

/**
 * Lists post-event reports for OSAS staff review
 */
export async function listPostEventReports({ status, organizationId, search } = {}) {
  const conditions = [];
  const params = [];

  if (status && status !== "All") {
    params.push(status);
    conditions.push(`per.status = $${params.length}`);
  }

  if (organizationId) {
    params.push(organizationId);
    conditions.push(`per.organization_id = $${params.length}`);
  }

  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(`(
      lower(ep.title) LIKE $${params.length} OR
      lower(so.name) LIKE $${params.length} OR
      lower(coalesce(so.acronym, '')) LIKE $${params.length} OR
      lower(per.submitted_by_email) LIKE $${params.length}
    )`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  return query(
    `SELECT per.*,
            ep.title AS event_title,
            ep.event_date,
            ep.venue,
            ep.status AS proposal_status,
            ep.post_event_status,
            ep.post_event_due_date,
            so.name AS organization_name,
            so.acronym AS org_acronym,
            so.category AS org_category
     FROM osas_post_event_reports per
     JOIN event_proposals ep ON ep.id = per.event_proposal_id
     JOIN student_organizations so ON so.id = per.organization_id
     ${whereClause}
     ORDER BY per.created_at DESC`,
    params
  );
}

/**
 * Gets a post-event report by its ID
 */
export async function getPostEventReportById(id) {
  return queryOne(
    `SELECT per.*,
            ep.title AS event_title,
            ep.event_date,
            ep.venue,
            ep.status AS proposal_status,
            ep.post_event_status,
            ep.post_event_due_date,
            so.name AS organization_name,
            so.acronym AS org_acronym,
            so.category AS org_category,
            st.fname || ' ' || st.lname AS reviewer_name
     FROM osas_post_event_reports per
     JOIN event_proposals ep ON ep.id = per.event_proposal_id
     JOIN student_organizations so ON so.id = per.organization_id
     LEFT JOIN staff st ON st.id = per.reviewed_by
     WHERE per.id = $1`,
    [id]
  );
}

/**
 * Updates status of a post-event report (e.g. Cleared, Needs Revision, Declined)
 */
export async function updatePostEventReportStatus(id, { status, note, staffId }) {
  const existing = await getPostEventReportById(id);
  if (!existing) return null;

  const updated = await queryOne(
    `UPDATE osas_post_event_reports
     SET status = $1,
         review_note = $2,
         reviewed_by = $3,
         reviewed_at = NOW(),
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [status, note || null, staffId || null, id]
  );

  // Sync to parent proposal
  let proposalPostEventStatus = "Under Review";
  if (status === "Cleared") proposalPostEventStatus = "Cleared";
  else if (status === "Needs Revision") proposalPostEventStatus = "Needs Revision";
  else if (status === "Declined") proposalPostEventStatus = "Pending Submission";

  await query(
    `UPDATE event_proposals
     SET post_event_status = $1,
         post_event_cleared_at = CASE WHEN $1 = 'Cleared' THEN NOW() ELSE post_event_cleared_at END,
         post_event_cleared_by = CASE WHEN $1 = 'Cleared' THEN $2 ELSE post_event_cleared_by END,
         updated_at = NOW()
     WHERE id = $3`,
    [proposalPostEventStatus, staffId || null, existing.event_proposal_id]
  );

  await query(
    `INSERT INTO transaction_updates (event_proposal_id, status, message, created_by)
     VALUES ($1, $2, $3, $4)`,
    [
      existing.event_proposal_id,
      `Post-Event ${status}`,
      note || `Post-event report evaluation completed with status: ${status}.`,
      staffId || null,
    ]
  );

  return updated;
}

/**
 * Lists approved events awaiting post-event report submissions
 */
export async function listApprovedEventsAwaitingReports({ organizationId, studentEmail } = {}) {
  const conditions = [
    `ep.office_id = 'osas'`,
    `ep.status = 'Approved'`,
    `ep.post_event_status IN ('Pending Submission', 'Needs Revision', 'Overdue')`,
  ];
  const params = [];

  if (organizationId) {
    params.push(organizationId);
    conditions.push(`ep.organization_id = $${params.length}`);
  }

  if (studentEmail) {
    params.push(studentEmail.toLowerCase());
    conditions.push(`(
      EXISTS (
        SELECT 1 FROM organization_officers oo
        WHERE oo.organization_id = ep.organization_id
          AND lower(oo.email) = $${params.length}
          AND oo.status = 'Active'
      )
    )`);
  }

  return query(
    `SELECT ep.id, ep.title, ep.event_date, ep.venue, ep.organization_id, ep.organization_name,
            ep.post_event_status, ep.post_event_due_date,
            so.acronym AS org_acronym, so.category AS org_category,
            CASE 
              WHEN ep.post_event_due_date < CURRENT_DATE THEN TRUE 
              ELSE FALSE 
            END AS is_overdue
     FROM event_proposals ep
     LEFT JOIN student_organizations so ON so.id = ep.organization_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY ep.event_date ASC`,
    params
  );
}
