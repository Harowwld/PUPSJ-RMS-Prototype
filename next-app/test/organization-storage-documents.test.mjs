import assert from "node:assert/strict";
import test from "node:test";
import { indexOrganizationStorageDocuments } from "../src/lib/organizationStorageDocuments.js";

test("organization storage includes uploaded records and each distinct proposal", () => {
  const documents = [
    { id: 1, organization_id: "glitch", doc_type: "Organization Registration Certificate" },
    { id: 2, organization_id: "hhc", student_no: "glitch", doc_type: "Activity Permit" },
    { id: 3, student_no: "glitch", doc_type: "Activity Permit" },
    { id: 4, original_filename: "glitch.pdf" },
    { id: "event-proposal-5", organization_id: "glitch", event_name: "Technology Help Desk", file_url: "/api/osas/event-proposals/5?file=1" },
    { id: "event-proposal-6", organization_id: "glitch", event_name: "Campus Orientation" },
  ];
  const result = indexOrganizationStorageDocuments([{ id: "glitch" }, { id: "hhc" }], documents);
  assert.deepEqual(result.get("glitch").map(({ id }) => id), [1, 3, "event-proposal-5", "event-proposal-6"]);
  assert.deepEqual(result.get("hhc").map(({ id }) => id), [2]);
  assert.equal(result.get("glitch")[2].eventName, "Technology Help Desk");
  assert.equal(result.get("glitch")[2].file_url, "/api/osas/event-proposals/5?file=1");
});
