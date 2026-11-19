import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

test("StudentOverviewTab caps attention cards and provides a standard slide-over Attention Sheet", () => {
  const tabPath = path.join(ROOT_DIR, "src/components/student/StudentOverviewTab.js");
  assert.ok(fs.existsSync(tabPath), "StudentOverviewTab.js must exist");

  const code = fs.readFileSync(tabPath, "utf8");

  // 1. Attention capping logic & state
  assert.ok(
    code.includes("isAttentionSheetOpen") && code.includes("setIsAttentionSheetOpen"),
    "Must maintain state for Attention Required Sheet"
  );
  assert.ok(
    code.includes("MAX_INLINE_ATTENTION") && code.includes("displayedAttentionItems"),
    "Must cap inline attention cards on the overview page to avoid dominating the screen"
  );

  // 2. View More trigger on the overview page
  assert.ok(
    code.includes("View More (") && code.includes("hiddenAttentionCount"),
    "Must display a 'View More' button indicating remaining attention items"
  );
  assert.ok(
    code.includes("View All ("),
    "Must offer a 'View All' header action to inspect all attention items"
  );

  // 3. Slide-over Sheet component alignment with standard pick-up info look
  assert.ok(
    code.includes("<Sheet") && code.includes("open={isAttentionSheetOpen}"),
    "Must render a Sheet component bound to isAttentionSheetOpen"
  );
  assert.ok(
    code.includes('className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full font-jakarta p-0 overflow-hidden"'),
    "Attention Sheet must match canonical inspector pane width and geometry"
  );
  assert.ok(
    code.includes("<SheetTitle>Attention Required</SheetTitle>"),
    "Attention Sheet must have clean header title"
  );
  assert.ok(
    code.includes("rounded-full bg-black/[0.04]") && code.includes("dark:bg-white/[0.08]"),
    "Attention Sheet must use Apple circular disc close button"
  );

  // 4. Line-attached Edge-to-Edge NoticeBanner status strip (Component Standard 6)
  assert.ok(
    code.includes("<NoticeBanner") && code.includes("Action Required:"),
    "Attention Sheet must feature edge-to-edge line-attached status notice"
  );

  // 5. Urgent items section and all items listed
  assert.ok(
    code.includes('<SheetSectionHeading icon="Alert02Icon" title={`Urgent Items (${attentionItems.length})`} />'),
    "Attention Sheet must render section heading with Alert02Icon and item count"
  );

  // 6. Action button in sheet closes sheet and executes action
  assert.ok(
    code.includes("setIsAttentionSheetOpen(false);\n                              item.action();") ||
    code.includes("setIsAttentionSheetOpen(false); item.action();") ||
    code.includes("setIsAttentionSheetOpen(false);\n                      item.action();"),
    "Clicking an action in the Attention Sheet must close the sheet and invoke the action"
  );

  // 7. SheetFooter canonical button
  assert.ok(
    code.includes("<SheetFooter") && code.includes("Close") && code.includes("h-9 px-4"),
    "Attention Sheet must have standard SheetFooter with canonical h-9 px-4 Close button"
  );
});
