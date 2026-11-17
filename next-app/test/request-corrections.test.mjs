import assert from "node:assert/strict";
import test from "node:test";
import { pendingRequestCorrection, prepareRequestCorrections, recordRequestCorrection } from "../src/lib/requestCorrections.js";

const onlineRequest = { office_id: "registrar", portal_submitter_account_id: 11, status: "Pending" };

test("online deficiencies require named items and custom requirements need instructions", () => {
  assert.match(prepareRequestCorrections(onlineRequest, "Deficient").error, /at least one requirement/);
  assert.match(prepareRequestCorrections(onlineRequest, "Deficient", [{ type: "other" }]).error, /Add instructions/);
  assert.deepEqual(prepareRequestCorrections({ ...onlineRequest, portal_submitter_account_id: null }, "Deficient"), {});
  const result = prepareRequestCorrections(onlineRequest, "Deficient", [
    { type: "valid_id" },
    { type: "other", note: " Upload a signed authorization. " },
  ]);
  assert.equal(result.corrections[1].note, "Upload a signed authorization.");
  assert.notEqual(result.corrections[0].id, result.corrections[1].id);
  assert.match(result.message, /Valid ID/);
});

test("only the submitting account can upload once to each open item", () => {
  const request = {
    ...onlineRequest,
    status: "Deficient",
    correction_items: [{ id: "first", type: "valid_id" }, { id: "second", type: "spa" }],
  };
  assert.equal(pendingRequestCorrection(request, 12, "first"), undefined);
  assert.equal(pendingRequestCorrection(request, 11, "stale"), undefined);
  assert.equal(pendingRequestCorrection(request, 11, "first").type, "valid_id");
  assert.match(prepareRequestCorrections(request, "Deficient", [{ type: "valid_id" }]).error, /already waiting/);

  const partial = recordRequestCorrection(request.correction_items, "first", 21);
  assert.equal(partial.status, "Deficient");
  assert.equal(partial.completed, false);
  assert.equal(pendingRequestCorrection({ ...request, correction_items: partial.corrections }, 11, "first"), undefined);

  const final = recordRequestCorrection(partial.corrections, "second", 22);
  assert.equal(final.status, "Pending");
  assert.equal(final.completed, true);
  assert.deepEqual(final.corrections.map((item) => item.attachmentId), [21, 22]);
  assert.equal(pendingRequestCorrection({ ...request, status: final.status }, 11, "second"), undefined);
});
