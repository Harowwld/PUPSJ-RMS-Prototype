function recordId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

export function isLegacyPostEventNotification(notification) {
  const details = notification?.metadata;
  return notification?.office_id === "osas" && notification.entity_type === "document"
    && recordId(details?.proposal_id) !== undefined
    && !Object.hasOwn(details, "event_date") && !Object.hasOwn(details, "document_id");
}

export function getNotificationAttachments(notification) {
  if (!notification) return [];
  const { entity_type: type, entity_id: entityId, metadata = {} } = notification;
  const details = metadata ?? {};
  const documentId = recordId(details.document_id) ?? (
    type === "document" && !details.proposal_id ? recordId(entityId) : undefined
  );

  if (documentId) {
    return [{
      docId: documentId,
      url: `/api/documents/${documentId}`,
      originalFilename: notification.original_filename || "document.pdf",
      mimeType: notification.mime_type,
      size: notification.size_bytes,
      title: notification.doc_type || "Document",
      studentName: notification.student_name,
      studentNo: notification.student_no,
    }];
  }

  const reportId = recordId(notification.report_attachment_id ?? details.report_id ?? (type === "post_event_report" ? entityId : null));
  if (reportId) {
    const liquidationFilename = notification.liquidation_original_filename || details.liquidation_original_filename;
    return [
      { kind: "narrative", title: "Narrative Report", originalFilename: notification.narrative_original_filename || details.narrative_original_filename || "Narrative-Report.pdf" },
      ...(liquidationFilename ? [
        { kind: "liquidation", title: "Liquidation Report", originalFilename: liquidationFilename },
      ] : []),
    ].map(({ kind, ...attachment }) => ({
      ...attachment,
      url: `/api/osas/post-event-reports/${reportId}?file=${kind}`,
    }));
  }

  // Older sample proposal notifications used the document type. Older report
  // notifications also stored a proposal ID, but only proposals stored event_date.
  const isLegacyProposal = type === "document" && Object.hasOwn(details, "event_date");
  const proposalId = type === "event_proposal" || isLegacyProposal
    ? recordId(details.proposal_id ?? entityId)
    : undefined;
  if (proposalId) {
    return [{
      url: `/api/osas/event-proposals/${proposalId}?file=1`,
      originalFilename: notification.original_filename || "Event-Proposal.pdf",
      title: details.title || "Event Proposal",
    }];
  }

  const bylawsVersionId = type === "organization_bylaws"
    ? recordId(details.bylaws_version_id ?? entityId)
    : undefined;
  if (bylawsVersionId && details.organization_id) {
    return [{
      url: `/api/osas/organizations/${encodeURIComponent(details.organization_id)}/bylaws?file=1&versionId=${bylawsVersionId}`,
      originalFilename: notification.original_filename || "Constitution-and-By-Laws.pdf",
      title: "Constitution & By-Laws",
    }];
  }

  return [];
}
