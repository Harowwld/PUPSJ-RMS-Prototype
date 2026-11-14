export function indexOrganizationStorageDocuments(organizations, documents) {
  const byOrganization = new Map(organizations.map(({ id }) => [id, []]));

  for (const document of documents) {
    // Some older OSAS scans stored the organization ID in the student number field.
    const organizationId = document.organization_id || document.student_no;
    const records = byOrganization.get(organizationId);
    if (!records) continue;

    records.push({
      id: document.id,
      docType: document.doc_type,
      eventName: document.event_name,
      filename: document.original_filename,
      approvalStatus: document.approval_status,
      file_url: document.file_url,
    });
  }

  return byOrganization;
}
