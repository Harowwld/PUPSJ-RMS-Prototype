import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const SHEET_FILES = [
  "src/components/systemadmin/OfficeDetailSheet.js",
  "src/components/systemadmin/ServiceStandardsSheet.js",
  "src/components/admin/audit-logs/LogDetailSheet.js",
  "src/components/staff/requests/DocumentRequestDetailSheet.js",
  "src/components/staff/StudentProfileSheet.js",
  "src/components/student/PermanentAdmissionRecordSheet.js",
  "src/components/shared/ComplianceStudentsSheet.js",
  "src/components/staff/osas/OsasProposalReviewSheet.js",
  "src/components/staff/osas/OsasPostEventReviewSheet.js",
  "src/components/systemadmin/GlobalStaffTab.js",
  "src/components/systemadmin/CampusOperationsTab.js",
  "src/components/staff/StudentOrganizationsTab.js",
  "src/components/staff/NotificationsTab.js",
  "src/components/admin/OSASOrganizationComplianceView.js",
  "src/components/student/StudentOverviewTab.js",
  "src/components/systemadmin/SystemBackupsTab.js",
  "src/app/student/page.js",
];

const MODAL_FILES = [
  "src/components/shared/ConfirmModal.js",
  "src/components/shared/PromptModal.js",
  "src/components/shared/RestoreModal.js",
  "src/components/shared/DocTypeModal.js",
  "src/components/shared/DefaultPasswordModal.js",
  "src/components/shared/UserGuideModal.js",
  "src/components/shared/TOTPChallengeModal.js",
  "src/components/shared/RecoveryCodesModal.js",
  "src/components/student/StudentFeedbackModal.js",
  "src/components/staff/RegisterStudentModal.js",
  "src/components/staff/EditStudentModal.js",
  "src/components/staff/EditOrganizationModal.js",
  "src/components/staff/BulkImportStudentsModal.js",
  "src/components/staff/BulkImportOrganizationsModal.js",
  "src/components/admin/EditUserModal.js",
  "src/components/systemadmin/BulkImportQuestionsModal.js",
  "src/components/admin/storage-layout/ConflictResolutionModals.js",
  "src/components/admin/RegisterAccountTab.js",
  "src/components/admin/system-config/DocTypesTab.js",
  "src/components/admin/system-config/CoursesTab.js",
  "src/components/admin/system-config/SectionsTab.js",
  "src/components/staff/StudentOrganizationsTab.js",
  "src/components/staff/DocumentRequestsTab.js",
  "src/components/systemadmin/GlobalStaffTab.js",
  "src/components/systemadmin/OfficeManagementTab.js",
];

test("Sheet Detail Action Buttons follow canonical h-9 px-4 standard", () => {
  for (const relPath of SHEET_FILES) {
    const fullPath = path.join(ROOT_DIR, relPath);
    assert.ok(fs.existsSync(fullPath), `${relPath} must exist`);
    const code = fs.readFileSync(fullPath, "utf8");

    // Extract all SheetFooter sections
    const footerMatches = code.match(/<SheetFooter[\s\S]*?<\/SheetFooter>/g);
    if (!footerMatches) continue;

    for (const footerCode of footerMatches) {
      assert.ok(
        !footerCode.includes("h-10 px-5"),
        `${relPath} SheetFooter must not use excessive h-10 px-5 padding`
      );
      assert.ok(
        !footerCode.includes("h-10 px-6"),
        `${relPath} SheetFooter must not use excessive h-10 px-6 padding`
      );
      assert.ok(
        !footerCode.includes("h-10 px-4"),
        `${relPath} SheetFooter must use canonical h-9 height instead of h-10`
      );
      assert.ok(
        footerCode.includes("h-9"),
        `${relPath} SheetFooter buttons must use compact h-9 sizing`
      );
    }
  }
});

test("Modal and Dialog Action Buttons follow canonical h-9 px-4 standard", () => {
  for (const relPath of MODAL_FILES) {
    const fullPath = path.join(ROOT_DIR, relPath);
    assert.ok(fs.existsSync(fullPath), `${relPath} must exist`);
    const code = fs.readFileSync(fullPath, "utf8");

    const dialogFooterMatches = code.match(/<DialogFooter[\s\S]*?<\/DialogFooter>/g);
    if (!dialogFooterMatches) continue;

    for (const footerCode of dialogFooterMatches) {
      assert.ok(
        !footerCode.includes("h-10 px-5"),
        `${relPath} DialogFooter must not use excessive h-10 px-5 padding`
      );
      assert.ok(
        !footerCode.includes("h-10 px-6"),
        `${relPath} DialogFooter must not use excessive h-10 px-6 padding`
      );
      assert.ok(
        !footerCode.includes("h-10 px-4"),
        `${relPath} DialogFooter must use canonical h-9 height instead of h-10`
      );
      assert.ok(
        footerCode.includes("h-9"),
        `${relPath} DialogFooter buttons must use compact h-9 sizing`
      );
    }
  }
});

test("Codebase enforces zero occurrences of excessive h-10 px-5 and h-10 px-6 buttons", () => {
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(full);
      } else if (entry.isFile() && (entry.name.endsWith(".js") || entry.name.endsWith(".jsx"))) {
        const content = fs.readFileSync(full, "utf8");
        // Ensure no button has h-10 px-5 or h-10 px-6
        assert.ok(
          !content.includes("h-10 px-5"),
          `${full} contains forbidden 'h-10 px-5' padding`
        );
        assert.ok(
          !content.includes("h-10 px-6"),
          `${full} contains forbidden 'h-10 px-6' padding`
        );

        // Ensure no <Button tag has px-5 or px-6 in className (excluding ui/button.jsx)
        if (!full.endsWith("ui/button.jsx")) {
          const buttonMatches = content.match(/<Button[\s\S]*?>/g) || [];
          for (const btn of buttonMatches) {
            assert.ok(
              !btn.includes("px-5"),
              `${full} Button contains forbidden 'px-5' padding: ${btn}`
            );
            assert.ok(
              !btn.includes("px-6"),
              `${full} Button contains forbidden 'px-6' padding: ${btn}`
            );
          }
        }
      }
    }
  }

  scanDir(path.join(ROOT_DIR, "src/components"));
  scanDir(path.join(ROOT_DIR, "src/app"));
});
