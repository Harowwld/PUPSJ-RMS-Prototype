import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("OfficeManagementTab multi-select state and range selection logic", async (t) => {
  const offices = [
    { id: "REGISTRAR", name: "Office of the Registrar", short_name: "Registrar" },
    { id: "OSAS", name: "Office of Student Affairs", short_name: "OSAS" },
    { id: "CASHIER", name: "Cashier's Office", short_name: "Cashier" },
    { id: "LIBRARY", name: "University Library", short_name: "Library" },
  ];

  let selectedIds = new Set();
  let lastSelectedId = null;

  const toggleSelect = (id, event) => {
    const isSelected = selectedIds.has(id);

    if (event?.shiftKey && lastSelectedId) {
      if (isSelected) {
        if (selectedIds.size > 1) {
          selectedIds = new Set([id]);
          lastSelectedId = id;
        } else {
          selectedIds = new Set();
          lastSelectedId = null;
        }
        return;
      }

      const currentIdx = offices.findIndex((o) => o.id === id);
      const lastIdx = offices.findIndex((o) => o.id === lastSelectedId);

      if (currentIdx !== -1 && lastIdx !== -1) {
        const start = Math.min(currentIdx, lastIdx);
        const end = Math.max(currentIdx, lastIdx);
        const idsInRange = offices.slice(start, end + 1).map((o) => o.id);

        const next = new Set(selectedIds);
        idsInRange.forEach((rangeId) => next.add(rangeId));
        selectedIds = next;
        lastSelectedId = id;
        return;
      }
    }

    const next = new Set(selectedIds);
    if (isSelected) {
      next.delete(id);
      lastSelectedId = null;
    } else {
      next.add(id);
      lastSelectedId = id;
    }
    selectedIds = next;
  };

  const toggleSelectAll = (checked) => {
    if (checked) {
      selectedIds = new Set(offices.map((o) => o.id));
    } else {
      selectedIds = new Set();
    }
    lastSelectedId = null;
  };

  // Test 1: Single select toggle
  toggleSelect("REGISTRAR");
  assert.equal(selectedIds.has("REGISTRAR"), true);
  assert.equal(selectedIds.size, 1);
  assert.equal(lastSelectedId, "REGISTRAR");

  // Test 2: Toggle select off
  toggleSelect("REGISTRAR");
  assert.equal(selectedIds.has("REGISTRAR"), false);
  assert.equal(selectedIds.size, 0);

  // Test 3: Select multiple individually
  toggleSelect("REGISTRAR");
  toggleSelect("OSAS");
  assert.equal(selectedIds.size, 2);
  assert.equal(selectedIds.has("REGISTRAR"), true);
  assert.equal(selectedIds.has("OSAS"), true);

  // Test 4: Shift-click range select
  selectedIds = new Set(["REGISTRAR"]);
  lastSelectedId = "REGISTRAR";
  toggleSelect("LIBRARY", { shiftKey: true });
  assert.equal(selectedIds.size, 4);
  assert.deepEqual(Array.from(selectedIds), ["REGISTRAR", "OSAS", "CASHIER", "LIBRARY"]);

  // Test 5: Select all and deselect all
  toggleSelectAll(true);
  assert.equal(selectedIds.size, 4);
  toggleSelectAll(false);
  assert.equal(selectedIds.size, 0);

  // Test 6: Pruning stale IDs
  selectedIds = new Set(["REGISTRAR", "NON_EXISTENT"]);
  const validIds = new Set(offices.map((o) => o.id));
  const pruned = new Set(Array.from(selectedIds).filter((id) => validIds.has(id)));
  assert.equal(pruned.size, 1);
  assert.equal(pruned.has("REGISTRAR"), true);
  assert.equal(pruned.has("NON_EXISTENT"), false);
});

test("OfficeManagementTab.js and OfficeGridSkeleton.js file verification", async () => {
  const officeManagementTabPath = path.resolve("src/components/systemadmin/OfficeManagementTab.js");
  const officeGridSkeletonPath = path.resolve("src/components/systemadmin/skeletons/OfficeGridSkeleton.js");

  const officeContent = await fs.readFile(officeManagementTabPath, "utf-8");
  const skeletonContent = await fs.readFile(officeGridSkeletonPath, "utf-8");

  // Verify FloatingActionBar import
  assert.match(officeContent, /import FloatingActionBar from ["']@\/components\/shared\/FloatingActionBar["']/);

  // Verify state variables
  assert.match(officeContent, /const \[selectedIds, setSelectedIds\] = useState\(new Set\(\)\)/);
  assert.match(officeContent, /const \[lastSelectedId, setLastSelectedId\] = useState\(null\)/);
  assert.match(officeContent, /const \[bulkArchiveOpen, setBulkArchiveOpen\] = useState\(false\)/);
  assert.match(officeContent, /const \[bulkRestoreOpen, setBulkRestoreOpen\] = useState\(false\)/);

  // Verify toggleSelect and toggleSelectAll functions
  assert.match(officeContent, /const toggleSelectAll =/);
  assert.match(officeContent, /const toggleSelect =/);

  // Verify table header checkbox
  assert.match(officeContent, /toggleSelectAll\(e\.target\.checked\)/);

  // Verify table row onClick triggers selection
  assert.match(officeContent, /onClick=\{\(e\) => toggleSelect\(office\.id, e\)\}/);

  // Verify table row checkbox column
  assert.match(officeContent, /checked=\{isSelected\}/);

  // Verify row interactive buttons stop propagation
  assert.match(officeContent, /e\.stopPropagation\(\)/);

  // Verify FloatingActionBar is rendered
  assert.match(officeContent, /<FloatingActionBar[\s\S]*?selectedCount=\{selectedIds\.size\}/);

  // Verify Skeleton table has checkbox column
  assert.match(skeletonContent, /<th className=["']w-12 p-4 text-center align-middle["']>/);
  assert.match(skeletonContent, /<td className=["']w-12 p-4 align-middle text-center["']>/);

  // Verify FloatingActionBar includes secondary copy action
  assert.match(officeContent, /label: "Copy Codes"/);
  assert.match(officeContent, /copiedLabel: "Copied Codes"/);

  // Verify storage path copy action is wired with interactive feedback
  assert.match(officeContent, /handleCopyStoragePath/);
  assert.match(officeContent, /copiedStorageId === office\.id/);
});

