import assert from "node:assert/strict";
import test from "node:test";
import { getNotificationAttachments, isLegacyPostEventNotification } from "../src/lib/notificationAttachments.js";

test("a request preview uses its linked document ID and preserves the filename", () => {
  const request = { entity_type: "document_request", entity_id: "42" };
  assert.deepEqual(getNotificationAttachments(request), []);
  const [attachment] = getNotificationAttachments({
    ...request,
    metadata: { document_id: 17 },
    original_filename: "scan.png",
  });
  assert.equal(attachment.url, "/api/documents/17");
  assert.equal(attachment.docId, 17);
  assert.equal(attachment.originalFilename, "scan.png");
});

test("document reviews use their document entity ID", () => {
  const [attachment] = getNotificationAttachments({ entity_type: "document", entity_id: "42" });
  assert.equal(attachment.url, "/api/documents/42");
});

test("current and legacy OSAS proposals use the proposal file endpoint", () => {
  const current = { entity_type: "event_proposal", entity_id: "42" };
  const legacy = { entity_type: "document", entity_id: "42", metadata: { proposal_id: 42, event_date: null } };

  for (const notification of [current, legacy]) {
    const [attachment] = getNotificationAttachments(notification);
    assert.equal(attachment.url, "/api/osas/event-proposals/42?file=1");
    assert.equal(attachment.docId, undefined);
  }
});

test("a legacy report requires a matching report ID", () => {
  const legacy = { office_id: "osas", entity_type: "document", entity_id: "42", metadata: { proposal_id: 42 } };
  assert.equal(isLegacyPostEventNotification(legacy), true);
  assert.equal(isLegacyPostEventNotification({ ...legacy, office_id: "registrar" }), false);
  assert.equal(isLegacyPostEventNotification({ ...legacy, metadata: { proposal_id: 42, event_date: null } }), false);
  assert.deepEqual(getNotificationAttachments(legacy), []);
  const attachments = getNotificationAttachments({
    ...legacy,
    report_attachment_id: 17,
    liquidation_original_filename: "Liquidation.pdf",
  });
  assert.deepEqual(attachments.map(({ url }) => url), [
    "/api/osas/post-event-reports/17?file=narrative",
    "/api/osas/post-event-reports/17?file=liquidation",
  ]);
});

test("by-laws previews use the version from the notification", () => {
  const [attachment] = getNotificationAttachments({
    entity_type: "organization_bylaws",
    entity_id: "17",
    metadata: { organization_id: "demo/org", bylaws_version_id: 17 },
  });
  assert.equal(attachment.url, "/api/osas/organizations/demo%2Forg/bylaws?file=1&versionId=17");
});
