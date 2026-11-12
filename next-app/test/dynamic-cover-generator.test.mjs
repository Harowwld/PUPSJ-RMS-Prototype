import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  DYNAMIC_COVER_MOODS,
  generateDynamicCoverTheme,
  getCssFallbackGradient,
} from "../src/lib/dynamicCoverGenerator.js";

test("1. DYNAMIC_COVER_MOODS catalog defines 7 color harmony moods", () => {
  assert.equal(DYNAMIC_COVER_MOODS.length, 7, "Must define 7 harmony moods");
  const expectedIds = ["all", "institutional", "sunset", "ocean", "neon", "aurora", "velvet"];
  for (const mood of DYNAMIC_COVER_MOODS) {
    assert.ok(expectedIds.includes(mood.id), `Mood id ${mood.id} must be in expected moods`);
    assert.ok(mood.label && typeof mood.label === "string", "Mood must have descriptive label");
  }

  // Institutional PUP Heritage mood must be present
  const institutional = DYNAMIC_COVER_MOODS.find((m) => m.id === "institutional");
  assert.ok(institutional, "Must include PUP Heritage mood");
  assert.equal(institutional.label, "PUP Heritage");
});

test("2. generateDynamicCoverTheme produces valid 4-color palettes and metadata across all moods", () => {
  const hexPattern = /^#[0-9a-fA-F]{6}$/;

  for (const mood of DYNAMIC_COVER_MOODS) {
    const theme = generateDynamicCoverTheme(mood.id);
    assert.ok(theme.id.startsWith("custom-mesh-"), `Theme ID ${theme.id} must start with custom-mesh-`);
    assert.ok(theme.name && typeof theme.name === "string", "Theme must have a name");
    assert.ok(theme.theme && typeof theme.theme === "string", "Theme must have harmony description");
    assert.equal(theme.mood, mood.id, `Theme mood must match requested mood ${mood.id}`);
    assert.equal(theme.isDynamic, true, "Theme must be marked isDynamic");

    assert.equal(theme.colors.length, 4, "Theme must have exactly 4 color stops for WebGL mesh");
    for (const color of theme.colors) {
      assert.match(color, hexPattern, `Color ${color} must be valid 6-digit hex`);
    }

    assert.ok(
      theme.cssGradient.includes("radial-gradient"),
      "Theme cssGradient must include radial-gradient stops"
    );
  }
});

test("3. getCssFallbackGradient handles valid and invalid inputs gracefully", () => {
  const customColors = ["#800000", "#ea580c", "#7c3aed", "#1e1b4b"];
  const grad = getCssFallbackGradient(customColors);
  assert.ok(grad.includes("#800000"), "Fallback gradient must include first color stop");
  assert.ok(grad.includes("#ea580c"), "Fallback gradient must include second color stop");
  assert.ok(grad.includes("#7c3aed"), "Fallback gradient must include third color stop");
  assert.ok(grad.includes("#1e1b4b"), "Fallback gradient must include base color");

  const defaultGrad = getCssFallbackGradient(null);
  assert.ok(defaultGrad.includes("#800000"), "Null input must return safe default gradient");
});

test("4. AppleProfileCover unifies Curated Presets and Dynamic Mesh into a single 1-tab workspace", () => {
  const coverCode = fs.readFileSync(path.resolve("src/components/shared/AppleProfileCover.js"), "utf8");

  // Single unified tab/view architecture without tab switcher
  assert.ok(
    !coverCode.includes('TabsTrigger value="presets"') && !coverCode.includes('TabsTrigger value="dynamic"'),
    "AppleProfileCover must unify presets and dynamic mesh into 1 single tab/view without tab switching"
  );
  assert.ok(
    coverCode.includes("Curated Presets") && coverCode.includes("Harmonic Mesh Generator"),
    "AppleProfileCover must present both curated presets and dynamic harmonic generator in 1 view"
  );

  // Dynamic mesh generation and live preview
  assert.ok(
    coverCode.includes("generateDynamicCoverTheme") && coverCode.includes("DYNAMIC_COVER_MOODS"),
    "AppleProfileCover must import and use dynamicCoverGenerator functions"
  );
  assert.ok(
    coverCode.includes("stagedTheme?.colors") || coverCode.includes("stagedTheme.colors"),
    "AppleProfileCover must pass staged colors to live MeshGradient preview"
  );

  // Mood filters use color circle swatches similar to avatar modal
  assert.ok(
    coverCode.includes("size-5.5 rounded-full") && coverCode.includes("active-cover-mood-ring"),
    "AppleProfileCover mood choices must use color circles with active layout rings similar to avatars"
  );
  assert.ok(
    coverCode.includes("setSelectedMood") && coverCode.includes("handleRollTheme"),
    "AppleProfileCover must allow filtering by mood and rolling new themes"
  );
  assert.ok(
    coverCode.includes("<DiceFaces03Icon") && coverCode.includes("Shuffle Theme"),
    "AppleProfileCover must include DiceFaces03Icon and Shuffle Theme action"
  );

  // Curated preset active selection uses checkmark indicator instead of text Current badge
  assert.ok(
    coverCode.includes("<Tick01Icon") && coverCode.includes("absolute top-1.5 right-1.5 size-4 rounded-full"),
    "AppleProfileCover curated presets must use avatar-style top-right checkmark indicator for selected item"
  );
  assert.ok(
    !coverCode.includes(">Current</span>"),
    "AppleProfileCover curated presets must not use text Current badge"
  );

  // Persistence
  assert.ok(
    coverCode.includes("pupsj_profile_cover_custom") && coverCode.includes("pupsj_profile_cover_id"),
    "AppleProfileCover must persist dynamic themes to localStorage"
  );
});
