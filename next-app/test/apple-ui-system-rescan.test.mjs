import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("CommandPalette scope tabs use Apple capsule segmented control", () => {
  const code = fs.readFileSync(path.resolve("src/components/shared/CommandPalette.js"), "utf8");
  assert.ok(
    code.includes("rounded-full bg-black/[0.04]") && code.includes("dark:bg-white/[0.06]"),
    "CommandPalette scope pills bar must sit inside Apple capsule segmented control track"
  );
  assert.ok(
    code.includes("inset_0_1px_0_0_rgba(255,255,255,0.85)"),
    "Active scope pill in CommandPalette must feature Apple specular top highlight"
  );
});

test("RestoreModal uses Apple Inset Choice Cards for strategy selection", () => {
  const code = fs.readFileSync(path.resolve("src/components/shared/RestoreModal.js"), "utf8");
  assert.ok(
    code.includes("grid grid-cols-1 sm:grid-cols-2 gap-3"),
    "RestoreModal strategy choice cards must use unified grid spacing"
  );
  assert.ok(
    code.includes("inset_0_1px_0_0_rgba(255,255,255,0.85)"),
    "Active strategy card must feature specular elevation highlight"
  );
});

test("TOTPChallengeModal uses Apple security verification input formatting", () => {
  const code = fs.readFileSync(path.resolve("src/components/shared/TOTPChallengeModal.js"), "utf8");
  assert.ok(
    code.includes("tracking-[0.25em]") && code.includes("tabular-nums"),
    "TOTPChallengeModal must format code input with tracking-[0.25em] and tabular-nums"
  );
});

test("RecoveryCodesModal and PDFPreviewModal use unified Apple circular close button", () => {
  const recoveryCode = fs.readFileSync(path.resolve("src/components/shared/RecoveryCodesModal.js"), "utf8");
  assert.ok(
    recoveryCode.includes("size-7 rounded-full") && recoveryCode.includes("bg-black/[0.05]"),
    "RecoveryCodesModal close button must use Apple unified circular close button"
  );

  const pdfCode = fs.readFileSync(path.resolve("src/components/shared/PDFPreviewModal.js"), "utf8");
  assert.ok(
    pdfCode.includes("size-7 rounded-full") && pdfCode.includes("bg-black/[0.05]"),
    "PDFPreviewModal close button must use Apple unified circular close button"
  );
});

test("DefaultPasswordModal uses Apple Inset Credentials Box and pill copy button", () => {
  const code = fs.readFileSync(path.resolve("src/components/shared/DefaultPasswordModal.js"), "utf8");
  assert.ok(
    code.includes("tabular-nums text-xl font-semibold tracking-wider") && code.includes("select-all"),
    "DefaultPasswordModal must feature prominent Apple-style credential typography"
  );
  assert.ok(
    code.includes("rounded-full px-3 py-1 text-xs font-semibold"),
    "DefaultPasswordModal must use Apple pill copy button"
  );
});

test("Tooltip primitive conforms to Apple macOS Sequoia frosted help tag", () => {
  const code = fs.readFileSync(path.resolve("src/components/ui/tooltip.jsx"), "utf8");
  assert.ok(
    code.includes("backdrop-blur-xl") && code.includes("bg-gray-950/85"),
    "Tooltip must use macOS Sequoia frosted glass material"
  );
  assert.ok(
    code.includes("border-white/15"),
    "Tooltip must feature subtle translucent border sheen"
  );
});

test("ScrollArea primitive conforms to macOS overlay auto-hiding scrollbar", () => {
  const code = fs.readFileSync(path.resolve("src/components/ui/scroll-area.jsx"), "utf8");
  assert.ok(
    code.includes("bg-black/20 hover:bg-black/35") && code.includes("dark:bg-white/20"),
    "ScrollBar thumb must use macOS overlay translucent styling"
  );
});

test("Footer conforms to Apple translucent bottom status bar", () => {
  const code = fs.readFileSync(path.resolve("src/components/layout/Footer.js"), "utf8");
  assert.ok(
    code.includes("backdrop-blur-md") && code.includes("bg-white/80 dark:bg-zinc-900/80"),
    "Footer must adopt Apple translucent backdrop-blur status bar"
  );
  assert.ok(
    !code.includes("shadow-inner"),
    "Footer must not contain obsolete shadow-inner class"
  );
});

test("Breadcrumb primitive conforms to Apple macOS navigation hierarchy", () => {
  const code = fs.readFileSync(path.resolve("src/components/ui/breadcrumb.jsx"), "utf8");
  assert.ok(
    code.includes("text-xs font-medium"),
    "Breadcrumb list must use refined text-xs typography"
  );
  assert.ok(
    code.includes("font-semibold text-gray-900 dark:text-zinc-100"),
    "Active breadcrumb page must use bold primary text"
  );
});

test("BulkImportTab Instructions modal uses Apple theme tokens without hardcoded hexes", () => {
  const code = fs.readFileSync(path.resolve("src/components/admin/system-config/BulkImportTab.js"), "utf8");
  assert.ok(
    !code.includes("#F2F2F7") && !code.includes("#8E8E93"),
    "BulkImportTab instructions dialog must use semantic theme tokens instead of hardcoded hexes"
  );
});
