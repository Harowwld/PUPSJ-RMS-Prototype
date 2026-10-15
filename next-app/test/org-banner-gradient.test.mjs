import assert from "node:assert/strict";
import test from "node:test";
import { BANNER_GRADIENT_PRESETS, getOrgBannerGradientClasses } from "../src/lib/constants.js";

test("BANNER_GRADIENT_PRESETS contains 8 distinct institutional themes", () => {
  assert.equal(BANNER_GRADIENT_PRESETS.length, 8);
  const ids = BANNER_GRADIENT_PRESETS.map((p) => p.id);
  assert.deepEqual(ids, [
    "maroon",
    "navy",
    "emerald",
    "violet",
    "crimson",
    "azure",
    "amber",
    "slate",
  ]);

  for (const preset of BANNER_GRADIENT_PRESETS) {
    assert.ok(preset.label, `Preset ${preset.id} missing label`);
    assert.ok(preset.classes, `Preset ${preset.id} missing classes`);
    assert.ok(preset.previewGradient, `Preset ${preset.id} missing previewGradient`);
    assert.ok(preset.classes.startsWith("from-"), `Preset ${preset.id} classes should start with from-`);
  }
});

test("getOrgBannerGradientClasses resolves correct gradient classes with fallback", () => {
  // Exact match
  assert.equal(
    getOrgBannerGradientClasses("navy"),
    "from-[#1e3a8a] via-[#1e293b] to-[#0f172a]"
  );
  assert.equal(
    getOrgBannerGradientClasses("emerald"),
    "from-[#064e3b] via-[#065f46] to-[#022c22]"
  );

  // Fallback to maroon (default) for null, undefined, or unknown IDs
  assert.equal(
    getOrgBannerGradientClasses(null),
    "from-[#800000] via-[#6d0000] to-[#4a0000]"
  );
  assert.equal(
    getOrgBannerGradientClasses(undefined),
    "from-[#800000] via-[#6d0000] to-[#4a0000]"
  );
  assert.equal(
    getOrgBannerGradientClasses("unknown_theme"),
    "from-[#800000] via-[#6d0000] to-[#4a0000]"
  );
});

test("preset validation accepts all 8 themes and falls back gracefully", () => {
  const themes = ["maroon", "navy", "emerald", "violet", "crimson", "azure", "amber", "slate"];
  for (const theme of themes) {
    const classes = getOrgBannerGradientClasses(theme);
    assert.ok(classes.length > 0);
  }
});
