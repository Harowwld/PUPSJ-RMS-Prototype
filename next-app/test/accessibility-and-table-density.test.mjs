import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

test("1. High Contrast preference cache updates synchronously regardless of userId presence", async () => {
  // Create mock browser environment for localStorage and window events
  const storageMap = new Map();
  const mockLocalStorage = {
    getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k),
    get length() {
      return storageMap.size;
    },
    key: (i) => Array.from(storageMap.keys())[i] || null,
  };
  globalThis.window = {
    localStorage: mockLocalStorage,
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  globalThis.localStorage = mockLocalStorage;
  const attributesMap = new Map();
  globalThis.document = {
    documentElement: {
      setAttribute(k, v) {
        attributesMap.set(k, String(v));
      },
      getAttribute(k) {
        return attributesMap.get(k) ?? null;
      },
      classList: {
        _classes: new Set(),
        add(c) {
          this._classes.add(c);
        },
        remove(c) {
          this._classes.delete(c);
        },
        contains(c) {
          return this._classes.has(c);
        },
      },
    },
  };
  globalThis.CustomEvent = class {
    constructor(type, init) {
      this.type = type;
      this.detail = init?.detail;
    }
  };
  globalThis.Event = class {
    constructor(type) {
      this.type = type;
    }
  };

  const {
    getHighContrastPreference,
    setHighContrastPreference,
    toggleHighContrastPreference,
    invalidateAccessibilityCache,
    getReduceMotionPreference,
    setReduceMotionPreference,
    toggleReduceMotionPreference,
  } = await import("../src/lib/accessibility.js");

  invalidateAccessibilityCache();

  // Test setHighContrastPreference with userId
  const resOn = setHighContrastPreference(true, "user-42");
  assert.equal(resOn, true);
  assert.equal(getHighContrastPreference(), true, "getHighContrastPreference() without userId must return true");
  assert.equal(getHighContrastPreference("user-42"), true, "getHighContrastPreference(userId) must return true");
  assert.ok(globalThis.document.documentElement.classList.contains("high-contrast"), "Class high-contrast must be applied to documentElement");

  // Test toggle with userId
  const resToggled = toggleHighContrastPreference("user-42");
  assert.equal(resToggled, false);
  assert.equal(getHighContrastPreference(), false, "getHighContrastPreference() without userId must return false after toggle");
  assert.equal(getHighContrastPreference("user-42"), false);
  assert.ok(!globalThis.document.documentElement.classList.contains("high-contrast"), "Class high-contrast must be removed from documentElement");

  // Test reduce motion cache updates synchronously with userId
  setReduceMotionPreference(true, "user-42");
  assert.equal(getReduceMotionPreference(), true, "getReduceMotionPreference() without userId must return true");
  assert.equal(getReduceMotionPreference("user-42"), true);

  setReduceMotionPreference(false, "user-42");
  assert.equal(getReduceMotionPreference(), false, "getReduceMotionPreference() without userId must return false");
  assert.equal(getReduceMotionPreference("user-42"), false);
});

test("2. CommandPalette persists accessibility toggles to server preferences", () => {
  const commandPalettePath = path.join(ROOT_DIR, "src/components/shared/CommandPalette.js");
  const code = fs.readFileSync(commandPalettePath, "utf8");

  assert.ok(
    code.includes('item.action === "toggle-contrast"') &&
    code.includes('/api/auth/preferences') &&
    code.includes('high_contrast: next'),
    "CommandPalette toggle-contrast must send preference update to /api/auth/preferences"
  );

  assert.ok(
    code.includes('item.action === "toggle-motion"') &&
    code.includes('/api/auth/preferences') &&
    code.includes('reduce_motion: next'),
    "CommandPalette toggle-motion must send preference update to /api/auth/preferences"
  );
});

test("3. Table row density options and measurements conform to design specification", async () => {
  const { TABLE_DENSITIES, normalizeTableDensity, tablePreferenceKey } = await import("../src/lib/tablePresentation.js");

  assert.deepEqual(TABLE_DENSITIES.compact, { label: "Compact", height: 40, padding: 4 });
  assert.deepEqual(TABLE_DENSITIES.normal, { label: "Normal", height: 52, padding: 8 });
  assert.deepEqual(TABLE_DENSITIES.comfortable, { label: "Comfortable", height: 64, padding: 12 });

  assert.equal(normalizeTableDensity("compact"), "compact");
  assert.equal(normalizeTableDensity("normal"), "normal");
  assert.equal(normalizeTableDensity("comfortable"), "comfortable");
  assert.equal(normalizeTableDensity("invalid"), "normal");
  assert.equal(normalizeTableDensity(null), "normal");
  assert.equal(normalizeTableDensity(undefined), "normal");

  assert.equal(tablePreferenceKey({ id: "101", role: "Staff" }), "pup_table_density_staff_101");
  assert.equal(tablePreferenceKey({ id: "101", role: "Student" }), "pup_table_density_student_101");
});

test("4. Table component binds density variables to DOM styles", () => {
  const tableComponentPath = path.join(ROOT_DIR, "src/components/ui/table.jsx");
  const code = fs.readFileSync(tableComponentPath, "utf8");

  assert.ok(
    code.includes("useTablePreferences") &&
    code.includes("TABLE_DENSITIES") &&
    code.includes("--table-row-height") &&
    code.includes("--table-cell-py"),
    "Table component must consume useTablePreferences and bind --table-row-height and --table-cell-py"
  );

  assert.ok(
    code.includes("height: header ? 40 : \"var(--table-row-height)\"") &&
    code.includes("paddingTop: header ? 8 : \"var(--table-cell-py)\"") &&
    code.includes("paddingBottom: header ? 8 : \"var(--table-cell-py)\""),
    "TableCell must bind cell height and vertical padding to CSS variables"
  );
});

test("5. TablePreferencesProvider provides ready state and falls back safely", () => {
  const tablePrefPath = path.join(ROOT_DIR, "src/components/shared/TablePreferences.js");
  const code = fs.readFileSync(tablePrefPath, "utf8");

  assert.ok(
    code.includes("pup_table_density") &&
    code.includes("setDensity") &&
    code.includes("ready: true"),
    "TablePreferencesProvider must fall back to pup_table_density and provide ready: true"
  );

  assert.ok(
    code.includes("onValueChange") &&
    code.includes("TableDensityControl"),
    "TableDensityControl must bind onValueChange for robust selection"
  );
});

test("6. Default avatars feature Apple-themed names across the catalog", async () => {
  const { GENERATED_AVATARS } = await import("../src/lib/defaultAvatarsGenerated.js");

  assert.equal(GENERATED_AVATARS.length, 48, "Must contain 48 avatars");

  const sampleNames = [
    { id: 1, name: "Cupertino" },
    { id: 2, name: "Monterey" },
    { id: 3, name: "Sequoia" },
    { id: 4, name: "Mojave" },
    { id: 5, name: "Sonoma" },
    { id: 6, name: "Tangerine" },
    { id: 7, name: "Space Black" },
    { id: 8, name: "Rose Gold" },
    { id: 9, name: "Infinite Loop" },
    { id: 17, name: "Apple Park" },
    { id: 33, name: "Keynote" },
  ];

  for (const { id, name } of sampleNames) {
    const avatar = GENERATED_AVATARS.find((a) => a.id === id);
    assert.ok(avatar, `Avatar ${id} must exist`);
    assert.equal(avatar.name, name, `Avatar ${id} must be named ${name}`);
    assert.ok(avatar.svgString.includes(`<title>${name}</title>`), `Avatar ${id} SVG title must match ${name}`);
  }

  // Ensure no generic "Avatar N" names remain
  for (const avatar of GENERATED_AVATARS) {
    assert.ok(!avatar.name.startsWith("Avatar "), `Avatar ${avatar.id} must have an Apple name, got: ${avatar.name}`);
  }
});

test("7. High contrast mode ensures solid buttons display crisp white text and prevents black-on-black regression", () => {
  const globalsCssPath = path.join(ROOT_DIR, "src/app/globals.css");
  const css = fs.readFileSync(globalsCssPath, "utf8");

  // 1. Verify brand tokens in .high-contrast and .high-contrast.dark
  assert.ok(
    css.includes("--brand-accent: #000000 !important;") &&
    css.includes("--brand-foreground: #ffffff !important;"),
    ".high-contrast must define --brand-accent: #000000 and --brand-foreground: #ffffff"
  );
  assert.ok(
    css.includes("--brand-accent: #ffffff !important;") &&
    css.includes("--brand-foreground: #000000 !important;"),
    ".high-contrast.dark must define --brand-accent: #ffffff and --brand-foreground: #000000"
  );

  // 2. Ensure greedy selector 'button[class*="border"]' that turned all buttons black-on-black is eliminated
  assert.ok(
    !css.includes('.high-contrast button[class*="border"],'),
    "Greedy '.high-contrast button[class*=\"border\"]' must be eliminated"
  );

  // 3. Ensure solid / primary buttons receive pure white text and pure white icons in light high contrast
  assert.ok(
    css.includes('.high-contrast [data-slot="button"][data-variant="default"]') &&
    css.includes('.high-contrast [data-slot="button"][data-variant="default"] *'),
    "Must target solid buttons and their nested labels/icons in .high-contrast"
  );
  assert.ok(
    css.includes('.high-contrast button[class*="bg-black"]') &&
    css.includes('.high-contrast [role="button"][class*="bg-black"]'),
    "Must target raw black buttons in .high-contrast"
  );

  // 4. Ensure dark high contrast provides inverted high contrast (white background with black text)
  assert.ok(
    css.includes('.high-contrast.dark [data-slot="button"][data-variant="default"]') &&
    css.includes('.high-contrast.dark [data-slot="button"][data-variant="default"] *'),
    "Must target solid buttons and their nested labels/icons in .high-contrast.dark"
  );

  // 5. Ensure outline / secondary buttons have explicit 2px borders with appropriate high contrast
  assert.ok(
    css.includes('.high-contrast [data-slot="button"][data-variant="outline"]') &&
    css.includes('.high-contrast button[class*="border-border"]'),
    "Must target outline buttons with distinct high contrast rules"
  );
});

test("8. Font size scaling and interactive pointer cursor preferences update synchronously", async () => {
  const {
    FONT_SIZE_LEVELS,
    getFontSizePreference,
    setFontSizePreference,
    getPointerCursorPreference,
    setPointerCursorPreference,
    togglePointerCursorPreference,
    invalidateAccessibilityCache,
  } = await import("../src/lib/accessibility.js");

  invalidateAccessibilityCache();

  // Test FONT_SIZE_LEVELS contains 5 levels: smaller, small, default, large, larger
  assert.deepEqual(FONT_SIZE_LEVELS, ["smaller", "small", "default", "large", "larger"]);

  // Test default font size is "default"
  assert.equal(getFontSizePreference(), "default");

  // Test setFontSizePreference
  const resLarge = setFontSizePreference("large", "user-88");
  assert.equal(resLarge, "large");
  assert.equal(getFontSizePreference("user-88"), "large");
  assert.equal(getFontSizePreference(), "large");

  // Test invalid font size falls back to "default"
  const resInvalid = setFontSizePreference("ultra-giant", "user-88");
  assert.equal(resInvalid, "default");

  // Test pointer cursor defaults to true
  assert.equal(getPointerCursorPreference("user-99"), true);

  // Test setPointerCursorPreference
  setPointerCursorPreference(false, "user-99");
  assert.equal(getPointerCursorPreference("user-99"), false);

  // Test togglePointerCursorPreference
  const resToggled = togglePointerCursorPreference("user-99");
  assert.equal(resToggled, true);
  assert.equal(getPointerCursorPreference("user-99"), true);
});
