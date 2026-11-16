const event = (label, email = false) => ({ label, channels: email ? ["in_app", "email"] : ["in_app"] });

export const workflowEvents = {
  request_submitted: event("Request received"),
  request_processing: event("Request in progress"),
  request_action_required: event("Action required", true),
  request_receipt_received: event("Payment proof received"),
  request_payment: event("Payment pending", true),
  request_pickup_deadline: event("Pickup Deadline Approaching", true),
  checklist_missing: event("Missing Requirement Needs Attention"),
  request_ready: event("Ready for pickup", true),
  request_inquiry_response: event("Inquiry response available", true),
  request_completed: event("Request completed"),
  request_cancelled: event("Request cancelled", true),
  request_reopened: event("Request reopened", true),
  request_disposed: event("Document no longer available", true),
  request_pickup_updated: event("Pickup instructions updated", true),
  request_update: event("Registrar posted a request update"),
  osas_bylaws_received: event("Constitution & By-Laws received"),
  osas_bylaws_revision: event("Constitution & By-Laws revision requested", true),
  osas_bylaws_decision: event("Constitution & By-Laws decision posted", true),
  osas_received: event("Submission received"),
  osas_revision_received: event("Revision received"),
  osas_review: event("Submission under review"),
  osas_revision: event("Revision requested", true),
  osas_decision: event("Decision posted", true),
  osas_report_due: event("Post-Event Report Due Soon", true),
  osas_report_update: event("Post-event report updated"),
  osas_report_action: event("Post-event report requires action", true),
  osas_report_decision: event("Post-event report decision posted", true),
};

export const requestStatusEvents = {
  Pending: "request_submitted",
  InProgress: "request_processing",
  Deficient: "request_action_required",
  PendingPayment: "request_payment",
  Ready: "request_ready",
  Completed: "request_completed",
  Cancelled: "request_cancelled",
  Shredded: "request_disposed",
};

export const officeQueueEvents = {
  registrar: {
    queue_registrar_aging: event("Items Still Awaiting Review"),
    queue_registrar_scan: { ...event("Scan Batch Needs Attention"), moduleId: "scan_upload" },
    queue_registrar_new: event("New Online Requests"),
    queue_registrar_returned: event("Requests Returned to the Queue"),
  },
  osas: {
    queue_osas_aging: event("Items Still Awaiting Review"),
    queue_osas_scan: { ...event("Scan Batch Needs Attention"), moduleId: "scan_upload" },
    queue_osas_bylaws: { ...event("Constitution & By-Laws Submissions"), moduleId: "student_organizations" },
    queue_osas_new: event("New Proposals and Post-Event Reports"),
    queue_osas_returned: event("Revised Proposals and Post-Event Reports"),
  },
};

export function workflowNotificationReference(targetPath) {
  const [, query = ""] = targetPath.split("?");
  const params = new URLSearchParams(query);
  for (const [key, label] of [["request", "Request"], ["proposal", "Proposal"], ["postEventFor", "Proposal"], ["report", "Report"], ["bylaws", "By-laws version"]]) {
    const id = params.get(key);
    if (/^\d+$/.test(id || "")) return `${label} #${id}`;
  }
  return "";
}
