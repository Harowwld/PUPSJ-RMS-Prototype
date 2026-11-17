import assert from "node:assert/strict";
import test from "node:test";
import { MISSING_DOCUMENTS_INQUIRY } from "../src/lib/missingDocumentsInquiry.js";
import { queueRequestUpdate, resolveReadyRequest } from "../src/lib/workflowNotificationsRepo.js";
import { workflowNotificationReference } from "../src/lib/workflowNotificationEvents.js";

const request = {
  id: 21,
  office_id: "registrar",
  status: "InProgress",
  portal_submitter_account_id: 43,
  doc_type: "Certificate of Grades",
};

test("Ready uses the office default or the request override and requires directions", async () => {
  const db = {
    queryOne: async (_sql, [key]) => {
      assert.equal(key, "request_pickup_instructions:registrar");
      return { value: "  Visit the Registrar service counter.  " };
    },
  };
  assert.deepEqual(await resolveReadyRequest(db, { request, nextStatus: "Ready" }), {
    instructions: "Visit the Registrar service counter.",
    pickupChanged: true,
  });
  assert.deepEqual(await resolveReadyRequest({}, { request, nextStatus: "Ready", pickupInstructions: " Visit Room 4. " }), {
    instructions: "Visit Room 4.",
    pickupChanged: true,
  });
  assert.match((await resolveReadyRequest({}, { request, nextStatus: "Ready", pickupInstructions: "" })).error, /pickup instructions/);
});

test("inquiry Ready requires a response and uses the inquiry event", async () => {
  const inquiry = { ...request, doc_type: MISSING_DOCUMENTS_INQUIRY };
  assert.match((await resolveReadyRequest({}, { request: inquiry, nextStatus: "Ready", message: "" })).error, /response/);
  assert.deepEqual(await resolveReadyRequest({}, { request: inquiry, nextStatus: "Ready", message: "Please review the attached checklist." }), {});
  const db = { query: async (_sql, params) => {
    assert.deepEqual(params, [43, "request_inquiry_response", "/student?view=odrs&request=21", true, null]);
  } };
  await queueRequestUpdate(db, { request: inquiry, nextStatus: "Ready" });
});

test("Ready queues a portal alert to the submitting account, and a same-status save queues nothing", async () => {
  const writes = [];
  const db = { query: async (_sql, params) => writes.push(params) };
  await queueRequestUpdate(db, { request, nextStatus: "Ready", pickupChanged: true });
  await queueRequestUpdate(db, { request: { ...request, status: "Ready" }, nextStatus: "Ready" });
  assert.deepEqual(writes, [[43, "request_ready", "/student?view=odrs&request=21", true, null]]);
  assert.equal(workflowNotificationReference(writes[0][2]), "Request #21");
});

test("completed corrections notify the Registrar queue and the submitting account", async () => {
  const writes = [];
  const db = { query: async (_sql, params) => writes.push(params) };
  await queueRequestUpdate(db, {
    request: { ...request, status: "Deficient" },
    nextStatus: "Pending",
    correctionsSubmitted: true,
  });
  assert.equal(writes.length, 2);
  assert.ok(writes[0].includes("queue_registrar_returned"));
  assert.deepEqual(writes[1], [43, "request_corrections_received", "/student?view=odrs&request=21", false, null]);
});
