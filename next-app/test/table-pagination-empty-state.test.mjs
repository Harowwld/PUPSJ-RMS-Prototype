import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("TablePagination.js contains empty-state safeguard check", () => {
  const content = fs.readFileSync(path.resolve("src/components/shared/TablePagination.js"), "utf8");
  assert.ok(
    content.includes("if (Number(totalCount) <= 0 && !loading)") && content.includes("return null"),
    "TablePagination must early-return null when totalCount <= 0 and not loading"
  );
});

test("SheetPagination.js contains empty-state safeguard check", () => {
  const content = fs.readFileSync(path.resolve("src/components/shared/SheetPagination.js"), "utf8");
  assert.ok(
    content.includes("if (Number(totalCount) <= 0) return null"),
    "SheetPagination must early-return null when totalCount <= 0"
  );
});

test("Audited components guard TablePagination when empty", () => {
  const checks = [
    {
      file: "src/components/staff/StudentDirectoryTab.js",
      pattern: "!loading && filteredStudents.length > 0",
      description: "StudentDirectoryTab must conditionally render pagination only when students exist",
    },
    {
      file: "src/components/staff/StudentOrganizationsTab.js",
      pattern: "!loading && filteredOrganizations.length > 0",
      description: "StudentOrganizationsTab must conditionally render pagination only when organizations exist",
    },
    {
      file: "src/components/staff/DocumentRequestsTab.js",
      pattern: "total > 0 && rows.length > 0",
      description: "DocumentRequestsTab must conditionally render pagination only when requests exist",
    },
    {
      file: "src/components/staff/OsasMonitoringTab.js",
      pattern: "activeFilteredList.length > 0",
      description: "OsasMonitoringTab must conditionally render pagination only when items exist",
    },
    {
      file: "src/components/staff/DocumentsTab.js",
      pattern: "matrixTotal > 0 && paginatedMatrixRecords.length > 0",
      description: "DocumentsTab must conditionally render matrix pagination only when matrix records exist",
    },
    {
      file: "src/components/staff/NotificationsTab.js",
      pattern: "total > 0 && items.length > 0",
      description: "NotificationsTab must conditionally render pagination only when notifications exist",
    },
    {
      file: "src/components/admin/DigitizationComplianceTab.js",
      pattern: "sortedByCourse.length > 0",
      description: "DigitizationComplianceTab must conditionally render pagination only when programs exist",
    },
    {
      file: "src/components/admin/OSASOrganizationComplianceView.js",
      pattern: "sortedOrganizations.length > 0",
      description: "OSASOrganizationComplianceView must conditionally render pagination only when orgs exist",
    },
    {
      file: "src/components/admin/system-config/DocTypesTab.js",
      pattern: "filteredDocTypesFull.length > 0",
      description: "DocTypesTab must conditionally render pagination only when doc types exist",
    },
    {
      file: "src/components/admin/system-config/CoursesTab.js",
      pattern: "filteredCoursesFull.length > 0",
      description: "CoursesTab must conditionally render pagination only when courses exist",
    },
    {
      file: "src/components/admin/system-config/SectionsTab.js",
      pattern: "filteredSectionsFull.length > 0",
      description: "SectionsTab must conditionally render pagination only when sections exist",
    },
    {
      file: "src/components/admin/system-config/BulkImportTab.js",
      pattern: "filteredRows.length > 0",
      description: "BulkImportTab must conditionally render pagination only when rows exist",
    },
    {
      file: "src/app/student/page.js",
      pattern: "filteredRequests.length > 0",
      description: "Student portal must conditionally render pagination only when requests exist",
    },
  ];

  for (const { file, pattern, description } of checks) {
    const fullPath = path.resolve(file);
    const content = fs.readFileSync(fullPath, "utf8");
    assert.ok(content.includes(pattern), `${description} in ${file}`);
  }
});
