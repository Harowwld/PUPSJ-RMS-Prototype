import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { VIEW_MODE_ICONS } from "../src/lib/viewModeIcons.js";
import {
  GridViewIcon,
  Layout3ColumnIcon,
  LeftToRightListBulletIcon,
  TableIcon,
  Building01Icon,
} from "hugeicons-react";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("ViewModeIcon mappings adhere to Apple HIG and UI standard", () => {
  assert.strictEqual(VIEW_MODE_ICONS.grid, GridViewIcon, "grid should map to GridViewIcon");
  assert.strictEqual(VIEW_MODE_ICONS.card, GridViewIcon, "card should map to GridViewIcon");
  assert.strictEqual(VIEW_MODE_ICONS.cards, GridViewIcon, "cards should map to GridViewIcon");

  assert.strictEqual(VIEW_MODE_ICONS.list, LeftToRightListBulletIcon, "list should map to LeftToRightListBulletIcon");
  assert.strictEqual(VIEW_MODE_ICONS.table, TableIcon, "table should map to TableIcon");
  assert.strictEqual(VIEW_MODE_ICONS.kanban, Layout3ColumnIcon, "kanban should map to Layout3ColumnIcon");

  assert.strictEqual(VIEW_MODE_ICONS.office, Building01Icon, "office should map to Building01Icon");
  assert.strictEqual(VIEW_MODE_ICONS.department, Building01Icon, "department should map to Building01Icon");
  assert.strictEqual(VIEW_MODE_ICONS.matrix, TableIcon, "matrix should map to TableIcon");
  assert.strictEqual(VIEW_MODE_ICONS.compare, TableIcon, "compare should map to TableIcon");
});

test("Codebase views use 'Grid' label and equal-width segmented controls", () => {
  const filesToCheck = [
    "src/components/systemadmin/OfficeManagementTab.js",
    "src/components/systemadmin/ModuleConfigTab.js",
    "src/components/staff/StudentOrganizationsTab.js",
    "src/components/staff/RecordsArchiveTab.js",
    "src/components/staff/OsasMonitoringTab.js",
    "src/components/staff/DocumentRequestsTab.js",
    "src/components/student/StudentComplianceTab.js",
    "src/components/systemadmin/CampusOperationsTab.js",
  ];

  for (const relPath of filesToCheck) {
    const fullPath = path.resolve(__dirname, "..", relPath);
    const content = fs.readFileSync(fullPath, "utf-8");

    // Must use inline-grid grid-flow-col auto-cols-fr for segmented controls
    assert.match(
      content,
      /inline-grid\s+grid-flow-col\s+auto-cols-fr/,
      `${relPath} should use equal-width auto-cols-fr segmented control container`
    );

    // If it has view mode labels with Grid/Table/List/Kanban, make sure it does not display "Cards" label
    assert.doesNotMatch(
      content,
      /label:\s*["']Cards["']/,
      `${relPath} should use 'Grid' label instead of 'Cards'`
    );
  }
});

test("Codebase views adhere to canonical view sequence: kanban, grid, list, table", () => {
  const CANONICAL_ORDER = ["kanban", "grid", "card", "list", "table"];

  const filesWithViewSwitchers = [
    {
      file: "src/components/admin/DigitalRecordsReviewTab.js",
      expected: ["kanban", "list", "table"],
    },
    {
      file: "src/components/staff/DocumentRequestsTab.js",
      expected: ["kanban", "list", "table"],
    },
    {
      file: "src/components/staff/OsasMonitoringTab.js",
      expected: ["kanban", "list", "table"],
    },
    {
      file: "src/components/student/StudentComplianceTab.js",
      expected: ["grid", "table"],
    },
    {
      file: "src/components/staff/StudentOrganizationsTab.js",
      expected: ["grid", "table"],
    },
    {
      file: "src/components/staff/RecordsArchiveTab.js",
      expected: ["card", "table"],
    },
    {
      file: "src/components/systemadmin/OfficeManagementTab.js",
      expected: ["grid", "table"],
    },
    {
      file: "src/components/systemadmin/CampusOperationsTab.js",
      expected: ["list", "table"],
    },
  ];

  for (const { file, expected } of filesWithViewSwitchers) {
    const fullPath = path.resolve(__dirname, "..", file);
    const content = fs.readFileSync(fullPath, "utf-8");

    // Extract the items array that defines the view modes (contains ViewModeIcon)
    const itemsMatch = content.match(/items=\{\[\s*([\s\S]*?ViewModeIcon[\s\S]*?)\s*\]\}/);

    assert.ok(itemsMatch, `${file} should contain an items array with ViewModeIcon for view switcher`);
    const valuesInFile = [...itemsMatch[1].matchAll(/value:\s*["']([^"']+)["']/g)].map((m) => m[1]);
    
    // Filter to only views in CANONICAL_ORDER
    const detectedViews = valuesInFile.filter((v) => CANONICAL_ORDER.includes(v));

    assert.deepStrictEqual(
      detectedViews,
      expected,
      `${file} view modes sequence should strictly match canonical order: ${expected.join(", ")}`
    );
  }
});
