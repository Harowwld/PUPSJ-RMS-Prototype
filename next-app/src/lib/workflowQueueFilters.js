export const agingRegistrarQueue = `
  dr.office_id = 'registrar' AND dr.portal_submitter_account_id IS NOT NULL
  AND (dr.status IN ('Pending', 'InProgress') OR (dr.status = 'PendingPayment' AND (
    SELECT max(receipt.created_at) FROM document_request_attachments receipt
     WHERE receipt.document_request_id = dr.id AND receipt.attachment_type = 'receipt'
  ) <= now() - interval '3 days'))
  AND dr.updated_at <= now() - interval '3 days'
`;

export const agingProposals = `ep.archived_at IS NULL AND ep.status IN ('Submitted', 'Under Review')
  AND ep.updated_at <= now() - interval '3 days'`;

export const agingPostEventReports = `per.status IN ('Submitted', 'Under Review')
  AND per.updated_at <= now() - interval '3 days'`;
