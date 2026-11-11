import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

test("Phase 2: Identity Resolution & Transaction Attribution Suite", async (t) => {
  await t.test("1. documentsRepo.js resolves reviewer display name for approval and decline notifications", () => {
    const filePath = path.join(rootDir, "src/lib/documentsRepo.js");
    const content = fs.readFileSync(filePath, "utf8");

    assert.ok(
      content.includes("getStaffFullName"),
      "documentsRepo.js must use full staff names for attribution"
    );
    assert.ok(
      content.includes("actorName: reviewerDisplayName"),
      "documentsRepo.js must supply actorName with resolved reviewerDisplayName"
    );
    assert.ok(
      content.includes("actorId: reviewedBy"),
      "documentsRepo.js must supply actorId with reviewedBy identifier"
    );
  });

  await t.test("2. documentRequestsRepo.js joins staff & students on updates and resolves actor identity", () => {
    const filePath = path.join(rootDir, "src/lib/documentRequestsRepo.js");
    const content = fs.readFileSync(filePath, "utf8");

    assert.ok(
      content.includes("FROM transaction_updates tu") &&
      content.includes("LEFT JOIN staff s ON tu.created_by = s.id") &&
      content.includes("LEFT JOIN students st ON tu.created_by = st.student_no"),
      "getDocumentRequestById must join staff and students on transaction_updates.created_by"
    );
    assert.ok(
      content.includes("actor_id: u.created_by || null"),
      "row.updates must include resolved actor_id"
    );
    assert.ok(
      content.includes("actor_name: actorName"),
      "row.updates must include resolved actor_name"
    );
    assert.ok(
      content.includes("actorName: creatorDisplayName") &&
      content.includes("actorId: createdBy || null"),
      "createDocumentRequest notification must include creatorDisplayName and actorId"
    );
    assert.ok(
      content.includes("actorName: updaterDisplayName") &&
      content.includes("actorId: fields.updatedBy || null"),
      "updateDocumentRequest notification must include updaterDisplayName and actorId"
    );
  });

  await t.test("3. osasPostEventRepo.js records created_by on transaction_updates and resolves reviewer_name with decrypted PII", () => {
    const filePath = path.join(rootDir, "src/lib/osasPostEventRepo.js");
    const content = fs.readFileSync(filePath, "utf8");

    assert.ok(
      content.includes("INSERT INTO transaction_updates (event_proposal_id, status, message, created_by)"),
      "createPostEventReport must record created_by in transaction_updates"
    );
    assert.ok(
      content.includes("LEFT JOIN staff st ON st.id = per.reviewed_by"),
      "listPostEventReports & getPostEventReportById must join staff on reviewed_by"
    );
    assert.ok(
      content.includes("getStaffFullName({") &&
      content.includes("fname: decryptPII(r.reviewer_fname)") &&
      content.includes("lname: decryptPII(r.reviewer_lname)"),
      "osasPostEventRepo must resolve reviewer_name via decrypted PII and getStaffFullName"
    );
  });

  await t.test("4. UI detail sheets render resolved actor_name and badge actor_id", () => {
    const docReqSheet = fs.readFileSync(
      path.join(rootDir, "src/components/staff/requests/DocumentRequestDetailSheet.js"),
      "utf8"
    );
    assert.ok(
      docReqSheet.includes("u.actor_name"),
      "DocumentRequestDetailSheet must render u.actor_name"
    );
    assert.ok(
      docReqSheet.includes("u.actor_id"),
      "DocumentRequestDetailSheet must render u.actor_id badge"
    );

    const osasSheet = fs.readFileSync(
      path.join(rootDir, "src/components/staff/osas/OsasProposalReviewSheet.js"),
      "utf8"
    );
    assert.ok(
      osasSheet.includes("update.actor_name"),
      "OsasProposalReviewSheet must render update.actor_name"
    );
    assert.ok(
      osasSheet.includes("update.actor_id"),
      "OsasProposalReviewSheet must render update.actor_id badge"
    );

    const notifTab = fs.readFileSync(
      path.join(rootDir, "src/components/staff/NotificationsTab.js"),
      "utf8"
    );
    assert.ok(
      notifTab.includes("selectedNotif.actor_name"),
      "NotificationsTab must render selectedNotif.actor_name"
    );
    assert.ok(
      notifTab.includes("selectedNotif.actor_id"),
      "NotificationsTab must render selectedNotif.actor_id"
    );

    const postEventSheet = fs.readFileSync(
      path.join(rootDir, "src/components/staff/osas/OsasPostEventReviewSheet.js"),
      "utf8"
    );
    assert.ok(
      postEventSheet.includes("selectedPostEvent.reviewer_name"),
      "OsasPostEventReviewSheet must render selectedPostEvent.reviewer_name"
    );
  });
});
