import test from "node:test";
import assert from "node:assert/strict";
import { isIngestEventForOffice } from "../src/lib/ingestEvents.js";

test("ingest events match offices case-insensitively", () => {
  assert.equal(isIngestEventForOffice({ officeId: "REGISTRAR" }, "registrar"), true);
  assert.equal(isIngestEventForOffice({ officeId: "osas" }, "registrar"), false);
  assert.equal(isIngestEventForOffice({ officeId: null }, "registrar"), false);
});
