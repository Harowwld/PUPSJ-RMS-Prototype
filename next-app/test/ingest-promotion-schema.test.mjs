import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync(new URL("../migrations/068_idempotent_ingest_document_promotion.sql", import.meta.url), "utf8");
const documentsRepo = fs.readFileSync(new URL("../src/lib/documentsRepo.js", import.meta.url), "utf8");
const processor = fs.readFileSync(new URL("../src/lib/ingestBatchProcessor.js", import.meta.url), "utf8");
const confirmRoute = fs.readFileSync(new URL("../src/app/api/ingest/review/[id]/confirm/route.js", import.meta.url), "utf8");
const promoteRoute = fs.readFileSync(new URL("../src/app/api/ingest/hot-folder/[id]/promote/route.js", import.meta.url), "utf8");

test("document schema permits at most one document per promoted ingest item", () => {
  assert.match(migration, /source_ingest_id BIGINT REFERENCES ingest_queue\(id\)/);
  assert.match(migration, /CREATE UNIQUE INDEX[\s\S]*ON documents\(source_ingest_id\)/);
});

test("all document-creating ingest promotion paths carry the source ingest id", () => {
  assert.match(documentsRepo, /source_ingest_id,/);
  assert.match(processor, /sourceIngestId: item\.id/);
  assert.match(confirmRoute, /sourceIngestId: id/);
  assert.match(promoteRoute, /sourceIngestId: id/);
  assert.doesNotMatch(promoteRoute, /writeFileSync\(targetAbsPath/);
});
