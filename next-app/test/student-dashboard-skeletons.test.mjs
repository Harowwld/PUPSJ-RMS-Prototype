import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

function readFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

describe("Student Dashboard Skeletons match data-populated views", () => {
  it("StudentDashboardSkeleton defaults null/empty view to overview, matches Sidebar geometry, and supports all views", () => {
    const src = readFile("src/components/student/skeletons/StudentDashboardSkeleton.js");

    // Defaults view={null} or undefined to overview
    assert.match(src, /const activeView = view \|\| "overview"/);

    // Matches Sidebar command palette pill, 5-star feedback widget, and rounded-full bottom profile trigger
    assert.match(src, /h-\[38px\]/);
    assert.match(src, /rounded-2xl border border-gray-200\/90/);
    assert.match(src, /rounded-full border border-black\/\[0\.06\]/);
    assert.match(src, /bg-white dark:bg-zinc-950\/50/);

    // Supports overview (fallback), odrs, compliance, osas, activity, and settings
    assert.match(src, /<StudentOverviewSkeleton \/>/);
    assert.match(src, /activeView === "odrs"/);
    assert.match(src, /activeView === "compliance"/);
    assert.match(src, /activeView === "osas"/);
    assert.match(src, /activeView === "activity"/);
    assert.match(src, /activeView === "settings"/);
  });

  it("StudentOverviewSkeleton matches StudentOverviewTab header, tracker, portals, and 5-item activity feed", () => {
    const src = readFile("src/components/student/skeletons/StudentOverviewSkeleton.js");

    // Header uses size-11 rounded-full avatar and h-9 actions
    assert.match(src, /size-11 rounded-full/);
    assert.match(src, /h-9 w-9 rounded-xl/);
    assert.match(src, /h-9 w-36 rounded-xl/);

    // Apple capsule SegmentedControl for 4-tab Recent Activity filter
    assert.match(src, /inline-grid grid-flow-col auto-cols-fr items-center gap-1 p-1 rounded-full/);

    // No pagination footer on Overview Recent Activity
    assert.doesNotMatch(src, /Standard Table Pagination Footer/);
  });

  it("StudentRequestsTableSkeleton matches the sleek horizontal list and 2-zone DataViewToolbar in student/page.js", () => {
    const src = readFile("src/components/student/skeletons/StudentRequestsTableSkeleton.js");
    const pageSrc = readFile("src/app/student/page.js");

    // Uses horizontal list (role="list" divide-y) instead of legacy 6-column HTML table
    assert.match(src, /role="list"/);
    assert.match(src, /divide-y divide-gray-100 dark:divide-zinc-800\/60/);
    assert.doesNotMatch(src, /<Table /);

    // Standardized DataViewToolbar search width and h-9 controls
    assert.match(src, /h-9 w-72 sm:w-80 shrink-0 rounded-xl/);
    assert.match(src, /size-10 rounded-xl/);

    // student/page.js uses StudentRequestsTableRowsSkeleton for inline loading
    assert.match(pageSrc, /<StudentRequestsTableRowsSkeleton/);
  });

  it("Document Checklist keeps the live header and toolbar while the grouped list loads", () => {
    const src = readFile("src/components/student/skeletons/StudentComplianceSkeleton.js");
    const tab = readFile("src/components/student/StudentComplianceTab.js");

    assert.match(src, /<StudentChecklistVerificationSkeleton \/>/);
    assert.match(tab, /<StudentChecklistVerificationSkeleton \/>/);
    assert.match(src, /getListDensityClasses\(density\)/);
    assert.match(src, /size-8 shrink-0 rounded-lg/);
    assert.match(tab, /<PageHeader[\s\S]*<DataViewToolbar[\s\S]*<StudentComplianceListSkeleton density=\{density\}/);
  });

  it("StudentOsasProposalsSkeleton matches OSAS header, 3-tab stream switcher, inline form, 2-zone toolbar, and proposal cards", () => {
    const src = readFile("src/components/student/skeletons/StudentOsasProposalsSkeleton.js");

    // Organization selector pill + h-9 refresh button
    assert.match(src, /rounded-full border border-border\/80/);
    assert.match(src, /h-9 w-9 rounded-xl/);

    // 3-tab OSAS Stream Switcher SegmentedControl
    assert.match(src, /inline-grid grid-flow-col auto-cols-fr items-center gap-1 p-1 rounded-full/);

    // Canonical 2-zone toolbar with w-72 sm:w-80 search
    assert.match(src, /h-9 w-72 sm:w-80 shrink-0 rounded-xl/);

    // Proposal card has border-t latest update section
    assert.match(src, /border-t border-border\/70 pt-3/);
  });

  it("StudentActivitySkeleton matches MyActivityPanel Card, PageHeader, 2-zone toolbar, grouped list, and pagination", () => {
    const src = readFile("src/components/student/skeletons/StudentActivitySkeleton.js");

    assert.match(src, /h-9 w-9 rounded-xl/);
    assert.match(src, /h-9 w-72 sm:w-80 shrink-0 rounded-xl/);
    assert.match(src, /h-10 w-10 rounded-full/);
    assert.match(src, /rounded-b-2xl mt-auto/);
  });
});
