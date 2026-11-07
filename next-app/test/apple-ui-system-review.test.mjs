import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BADGE_PATH = path.resolve("src/components/ui/badge.jsx");
const INPUT_PATH = path.resolve("src/components/ui/input.jsx");
const TEXTAREA_PATH = path.resolve("src/components/ui/textarea.jsx");
const PROGRESS_PATH = path.resolve("src/components/ui/progress.jsx");
const SIDEBAR_PATH = path.resolve("src/components/shared/Sidebar.js");
const FLOATING_ACTION_BAR_PATH = path.resolve("src/components/shared/FloatingActionBar.js");
const TABLE_PAGINATION_PATH = path.resolve("src/components/shared/TablePagination.js");
const TABLE_PATH = path.resolve("src/components/ui/table.jsx");
const NOTICE_BANNER_PATH = path.resolve("src/components/shared/NoticeBanner.js");

test("Badge component supports Apple semantic status variants and capsule styling", () => {
  const code = fs.readFileSync(BADGE_PATH, "utf8");
  assert.ok(code.includes("rounded-full"), "Badge must use rounded-full pill shape");
  assert.ok(code.includes("success:"), "Badge must support success variant");
  assert.ok(code.includes("warning:"), "Badge must support warning variant");
  assert.ok(code.includes("brand:"), "Badge must support brand variant");
  assert.ok(code.includes("info:"), "Badge must support info variant");
});

test("Input and Textarea components conform to Apple macOS squircle design tokens", () => {
  const inputCode = fs.readFileSync(INPUT_PATH, "utf8");
  assert.ok(inputCode.includes("rounded-xl"), "Input must use rounded-xl squircle");
  assert.ok(inputCode.includes("backdrop-blur-sm"), "Input must use translucent backdrop blur");
  assert.ok(inputCode.includes("shadow-[inset_0_1px_2px"), "Input must have Apple inset depth");
  assert.ok(inputCode.includes("focus-visible:ring-3"), "Input must have Apple glowing halo focus ring");

  const textareaCode = fs.readFileSync(TEXTAREA_PATH, "utf8");
  assert.ok(textareaCode.includes("rounded-xl"), "Textarea must use rounded-xl squircle");
  assert.ok(textareaCode.includes("backdrop-blur-sm"), "Textarea must use translucent backdrop blur");
  assert.ok(textareaCode.includes("shadow-[inset_0_1px_2px"), "Textarea must have Apple inset depth");
});

test("Progress component conforms to Apple sunken track and sheen indicator", () => {
  const code = fs.readFileSync(PROGRESS_PATH, "utf8");
  assert.ok(code.includes("rounded-full"), "Progress must be rounded-full");
  assert.ok(code.includes("shadow-[inset_0_1px_2px"), "Progress track must have inset shadow");
  assert.ok(code.includes("shadow-[inset_0_1px_0_0_rgba(255,255,255"), "Progress indicator must have specular top sheen");
});

test("Sidebar conforms to Apple UI translucent mobile bar and ProfileAvatar integration", () => {
  const code = fs.readFileSync(SIDEBAR_PATH, "utf8");
  assert.ok(code.includes('import ProfileAvatar from "@/components/shared/ProfileAvatar"'), "Sidebar must import ProfileAvatar");
  assert.ok(code.includes("backdrop-blur-2xl"), "Mobile header bar must use 2xl backdrop blur");
  assert.ok(code.includes("<ProfileAvatar"), "Sidebar must render ProfileAvatar component");
});

test("FloatingActionBar conforms to Apple Dynamic Island capsule dock", () => {
  const code = fs.readFileSync(FLOATING_ACTION_BAR_PATH, "utf8");
  assert.ok(code.includes("rounded-full"), "FloatingActionBar must use rounded-full capsule dock");
  assert.ok(code.includes("backdrop-blur-2xl"), "FloatingActionBar must use 2xl backdrop blur");
  assert.ok(code.includes("inset_0_1px_0_0_rgba(255,255,255"), "FloatingActionBar must have specular inset highlight");
});

test("TablePagination and NoticeBanner conform to Apple micro-interactions", () => {
  const pagCode = fs.readFileSync(TABLE_PAGINATION_PATH, "utf8");
  assert.ok(pagCode.includes("rounded-full"), "TablePagination controls must use rounded-full styling");

  const bannerCode = fs.readFileSync(NOTICE_BANNER_PATH, "utf8");
  assert.ok(bannerCode.includes("rounded-full"), "NoticeBanner dismiss button must be circular rounded-full");

  const tableCode = fs.readFileSync(TABLE_PATH, "utf8");
  assert.ok(tableCode.includes("data-slot=\"table-identifier\""), "Table must support identifier badge");
  assert.ok(tableCode.includes("data-slot=\"table-status\""), "Table must support table status");
});
