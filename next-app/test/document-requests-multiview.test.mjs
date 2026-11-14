import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  canTransitionRequestStatus,
  isTerminalRequestStatus,
  ALLOWED_STATUS_TRANSITIONS,
} from "../src/lib/constants.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("Document Requests multi-view architecture and toolbar design standard", () => {
  const tabPath = path.resolve(__dirname, "../src/components/staff/DocumentRequestsTab.js");
  const tabContent = fs.readFileSync(tabPath, "utf-8");

  // 1. Must implement 3-way view switcher (List, Table, Kanban)
  assert.match(
    tabContent,
    /value:\s*["']list["'],\s*label:\s*["']List["']/,
    "DocumentRequestsTab should include 'List' view option"
  );
  assert.match(
    tabContent,
    /value:\s*["']table["'],\s*label:\s*["']Table["']/,
    "DocumentRequestsTab should include 'Table' view option"
  );
  assert.match(
    tabContent,
    /value:\s*["']kanban["'],\s*label:\s*["']Kanban["']/,
    "DocumentRequestsTab should include 'Kanban' view option"
  );

  // 2. Must use equal-width auto-cols-fr segmented control
  assert.match(
    tabContent,
    /inline-grid\s+grid-flow-col\s+auto-cols-fr/,
    "DocumentRequestsTab must use equal-width auto-cols-fr segmented controls"
  );

  // 3. Must reuse the new UI design controls from OfficeTableControls
  assert.match(
    tabContent,
    /import\s*\{[\s\S]*?FilterPopover[\s\S]*?SortPopover[\s\S]*?GroupPopover[\s\S]*?ColumnsPopover[\s\S]*?\}\s*from\s*["']@\/components\/systemadmin\/OfficeTableControls["']/,
    "DocumentRequestsTab must reuse FilterPopover, SortPopover, GroupPopover, and ColumnsPopover"
  );
  assert.match(
    tabContent,
    /import\s+DashboardSearch\s+from\s+["']@\/components\/systemadmin\/DashboardSearch["']/,
    "DocumentRequestsTab must reuse DashboardSearch component"
  );

  // 4. Must import the new List and Kanban components
  assert.match(
    tabContent,
    /import\s+DocumentRequestRecordList(?:,\s*\{[^}]+\})?\s+from\s+["']@\/components\/staff\/requests\/DocumentRequestRecordList["']/,
    "DocumentRequestsTab must import DocumentRequestRecordList"
  );
  assert.match(tabContent, /viewMode !== "kanban" && \(\s*<GroupPopover/);
  assert.match(tabContent, /groupDocumentRequests\(displayedRows,\s*(?:activeGroupBy|groupBy)\)/);
  assert.match(
    tabContent,
    /import\s+DocumentRequestKanbanPipeline(?:,\s*\{[^}]+\})?\s+from\s+["']@\/components\/staff\/requests\/DocumentRequestKanbanPipeline["']/,
    "DocumentRequestsTab must import DocumentRequestKanbanPipeline"
  );

  // 5. Must strictly avoid status dots in badges (Apple HIG text-only policy)
  assert.doesNotMatch(
    tabContent,
    /<span[^>]*className=["'][^"']*\b(w-1\.5\s+h-1\.5|h-1\.5\s+w-1\.5|w-2\s+h-2|h-2\s+w-2)\s+[^"']*rounded-full[^"']*status/,
    "DocumentRequestsTab table cells must not contain status dots inside badges"
  );

  // 6. Anti-Flicker & UI Stability: Header buttons and active filter row must stay mounted during loading
  assert.doesNotMatch(
    tabContent,
    /!loading\s*&&\s*!error\s*&&\s*\(\s*<Button[^>]*>[^<]*Create Request/,
    "Header 'Create Request' button must stay unconditionally mounted without flickering on loading"
  );
  assert.doesNotMatch(
    tabContent,
    /!loading\s*&&\s*!error\s*&&\s*activeChips\.length\s*>\s*0/,
    "Active filter chips row must not unmount or flicker when loading state triggers"
  );
  assert.match(
    tabContent,
    /loading\s*&&\s*!hasLoaded/,
    "Skeleton must only replace table before the first load, including when the first result is empty"
  );
  assert.doesNotMatch(
    tabContent,
    /loadList\s*=\s*useCallback\([\s\S]*?\],\s*\[[^\]]*\bviewMode\b[^\]]*\]\s*\)/,
    "loadList must not list viewMode in its dependency array to prevent view switches from invalidating the fetch"
  );
});

test("DocumentRequestRecordList implements status-grouped accordion and text-only badges", () => {
  const listPath = path.resolve(__dirname, "../src/components/staff/requests/DocumentRequestRecordList.js");
  const listContent = fs.readFileSync(listPath, "utf-8");

  // Must export default function
  assert.match(listContent, /export\s+default\s+function\s+DocumentRequestRecordList/);

  // Must support collapsible status groups and role listitem
  assert.match(listContent, /role=["']listitem["']/);
  assert.match(listContent, /role=["']list["']/);

  // Must follow text-only badge policy (no indicator dots)
  assert.doesNotMatch(
    listContent,
    /<span[^>]*className=["'][^"']*\b(w-1\.5\s+h-1\.5|h-1\.5\s+w-1\.5|w-2\s+h-2|h-2\s+w-2)\s+[^"']*rounded-full[^"']*aria-hidden/,
    "DocumentRequestRecordList must not render status dots inside badge pills"
  );
});

test("DocumentRequestKanbanPipeline implements columns and validates transitions", () => {
  const kanbanPath = path.resolve(__dirname, "../src/components/staff/requests/DocumentRequestKanbanPipeline.js");
  const kanbanContent = fs.readFileSync(kanbanPath, "utf-8");

  // Verify ODRS_KANBAN_COLUMNS contains primary progressive workflow stages
  assert.match(kanbanContent, /key:\s*["']Pending["']/);
  assert.match(kanbanContent, /key:\s*["']PendingPayment["']/);
  assert.match(kanbanContent, /key:\s*["']InProgress["']/);
  assert.match(kanbanContent, /key:\s*["']Ready["']/);
  assert.match(kanbanContent, /key:\s*["']Completed["']/);
  assert.match(kanbanContent, /key:\s*["']Cancelled["']/);

  // Must use canTransitionRequestStatus
  assert.match(
    kanbanContent,
    /canTransitionRequestStatus/,
    "DocumentRequestKanbanPipeline must check transition rules via canTransitionRequestStatus"
  );

  // Must support drag and drop
  assert.match(kanbanContent, /onDragStart/);
  assert.match(kanbanContent, /onDrop/);

  // Check state machine transition validity using constants
  assert.strictEqual(canTransitionRequestStatus("Pending", "InProgress"), true);
  assert.strictEqual(canTransitionRequestStatus("Pending", "PendingPayment"), true);
  assert.strictEqual(canTransitionRequestStatus("Pending", "Ready"), true);
  assert.strictEqual(canTransitionRequestStatus("Ready", "Completed"), true);
  assert.strictEqual(canTransitionRequestStatus("Completed", "Pending"), false, "Completed is terminal");
  assert.strictEqual(canTransitionRequestStatus("Cancelled", "Ready"), false, "Cancelled is terminal");
  assert.strictEqual(isTerminalRequestStatus("Completed"), true);
  assert.strictEqual(isTerminalRequestStatus("Cancelled"), true);
  assert.strictEqual(isTerminalRequestStatus("Pending"), false);
});
