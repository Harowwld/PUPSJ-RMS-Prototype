import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadJsx } from "./helpers/load-jsx.mjs";

const { REFERENCE_ACCENT_COLORS, DEFAULT_ACCENT_COLORS } = loadJsx(
  "src/components/ui/color-selector.jsx"
);

test("REFERENCE_ACCENT_COLORS matches the reference design colors", () => {
  assert.equal(REFERENCE_ACCENT_COLORS.length, 8);

  const expectedColors = [
    { name: "Blue", hex: "#3777f6" },
    { name: "Purple", hex: "#916fe7" },
    { name: "Pink", hex: "#e56aa3" },
    { name: "Red", hex: "#e45757" },
    { name: "Orange", hex: "#ec9043" },
    { name: "Yellow", hex: "#e4b53e" },
    { name: "Green", hex: "#65a55a" },
    { name: "Teal", hex: "#1c9c82" },
  ];

  for (let i = 0; i < expectedColors.length; i++) {
    assert.equal(
      REFERENCE_ACCENT_COLORS[i].name,
      expectedColors[i].name,
      `Color name mismatch at index ${i}`
    );
    assert.equal(
      REFERENCE_ACCENT_COLORS[i].hex.toLowerCase(),
      expectedColors[i].hex.toLowerCase(),
      `Hex mismatch at index ${i}`
    );
  }
});

test("DEFAULT_ACCENT_COLORS contains PUP Maroon followed by reference colors", () => {
  assert.equal(DEFAULT_ACCENT_COLORS.length, 9);
  assert.equal(DEFAULT_ACCENT_COLORS[0].name, "PUP Maroon");
  assert.equal(DEFAULT_ACCENT_COLORS[0].hex, "#800000");

  for (let i = 0; i < REFERENCE_ACCENT_COLORS.length; i++) {
    assert.deepEqual(DEFAULT_ACCENT_COLORS[i + 1], REFERENCE_ACCENT_COLORS[i]);
  }
});

test("ColorSelector component file implementation conforms to reference look", () => {
  const componentPath = path.resolve(
    process.cwd(),
    "src/components/ui/color-selector.jsx"
  );
  const content = fs.readFileSync(componentPath, "utf-8");

  // Verify concentric outer ring styling
  assert.match(
    content,
    /border-2 transition-all/,
    "Should include 2px outer border transition"
  );
  assert.match(
    content,
    /style=\{\{\s*borderColor:\s*c\.hex\s*\}\}/,
    "Outer ring border color must match swatch color"
  );

  // Verify circular tray and inner dot
  assert.match(
    content,
    /rounded-full border border-black\/10 dark:border-white\/10/,
    "Inner circular tray must have subtle border"
  );
  assert.match(
    content,
    /size-5 rounded-full shadow-2xs/,
    "Inner colored dot must be 20px (size-5)"
  );
  assert.match(
    content,
    /style=\{\{\s*backgroundColor:\s*c\.hex\s*\}\}/,
    "Inner dot must have backgroundColor set to hex"
  );

  // Ensure NO Tick01Icon or checkmark inside swatches
  assert.ok(
    !content.includes("Tick01Icon"),
    "Swatches should NOT render checkmarks or tick icons"
  );

  // Verify accessibility
  assert.match(content, /role="radiogroup"/);
  assert.match(content, /role="radio"/);
  assert.match(content, /aria-checked=\{isSelected\}/);

  // Verify default label is Accent
  assert.match(content, /label = "Accent"/);
});

test("InstitutionalBrandingTab renders ColorSelector with the new look and original brand presets", () => {
  const filePath = path.resolve(
    process.cwd(),
    "src/components/systemadmin/InstitutionalBrandingTab.js"
  );
  const content = fs.readFileSync(filePath, "utf-8");

  assert.match(
    content,
    /import ColorSelector/i,
    "InstitutionalBrandingTab must import ColorSelector"
  );
  assert.match(
    content,
    /<ColorSelector[\s\S]*?value=\{branding\.brandColor\}/,
    "Must render ColorSelector with branding.brandColor"
  );
  assert.ok(
    !content.includes('label="Accent"'),
    "Accent label should be removed from InstitutionalBrandingTab"
  );
  assert.ok(
    !content.includes('customLabel="Report accent"'),
    "Report accent label should be removed from InstitutionalBrandingTab"
  );
  assert.match(
    content,
    /const COLOR_PRESETS = \[[\s\S]*?PUP Maroon[\s\S]*?State Blue[\s\S]*?University Emerald[\s\S]*?Heritage Crimson[\s\S]*?Academic Navy[\s\S]*?Institutional Gold/,
    "Must preserve the original institutional brand color presets"
  );
  assert.ok(
    !content.includes("Recommended University Presets"),
    "Old ad-hoc presets grid should be replaced by ColorSelector"
  );
});

test("OfficeManagementTab renders ColorSelector with the new look, 12 colors per line, and standard label outside card", () => {
  const filePath = path.resolve(
    process.cwd(),
    "src/components/systemadmin/OfficeManagementTab.js"
  );
  const content = fs.readFileSync(filePath, "utf-8");

  assert.match(
    content,
    /import ColorSelector/i,
    "OfficeManagementTab must import ColorSelector"
  );
  assert.match(
    content,
    /<label[^>]*>\s*Branding Theme Color\s*<\/label>[\s\S]*?\{form\.accent_color\}[\s\S]*?<ColorSelector[\s\S]*?label=\{null\}[\s\S]*?columns=\{12\}/,
    "Must render Branding Theme Color label and hex code outside card, with columns={12} on ColorSelector"
  );
  assert.match(
    content,
    /const OFFICE_COLOR_PRESETS = \[[\s\S]*?PUP Maroon[\s\S]*?Midnight Black/,
    "Must preserve the full departmental colors palette in OFFICE_COLOR_PRESETS"
  );
  assert.ok(
    !content.includes("Live Preview:"),
    "Live preview badge must be removed from the department modal"
  );
  assert.ok(
    !content.includes("Expanded Swatches Grid"),
    "Old ad-hoc swatches grid should be replaced by ColorSelector"
  );
});

test("InstitutionalBrandingSkeleton mirrors the circular new look", () => {
  const filePath = path.resolve(
    process.cwd(),
    "src/components/systemadmin/skeletons/InstitutionalBrandingSkeleton.js"
  );
  const content = fs.readFileSync(filePath, "utf-8");

  assert.match(
    content,
    /size-12 rounded-full dark:bg-muted/,
    "Skeleton must render circular swatches matching the new look"
  );
});
