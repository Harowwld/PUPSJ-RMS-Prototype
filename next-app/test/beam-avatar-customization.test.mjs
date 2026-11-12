import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  BEAM_PALETTES,
  BEAM_CLASSIC_PALETTES,
  BEAM_VIBRANT_PALETTES,
  getBeamPresetInfo,
  generateBeamSvgString,
  generateShuffledBeam,
  getBeamPalette,
} from "../src/lib/beamAvatars.js";

test("1. Beam avatar palettes catalog defines 12 palettes (6 Classic, 6 Vibrant)", () => {
  assert.equal(BEAM_PALETTES.length, 12, "Must define 12 total palettes");
  assert.equal(BEAM_CLASSIC_PALETTES.length, 6, "Classic must have 6 palettes");
  assert.equal(BEAM_VIBRANT_PALETTES.length, 6, "Vibrant must have 6 palettes");

  for (const p of BEAM_PALETTES) {
    assert.ok(p.id && typeof p.id === "string", "Palette must have id");
    assert.ok(p.name && typeof p.name === "string", "Palette must have descriptive name");
    assert.equal(p.colors.length, 5, `Palette ${p.name} must have 5 colors`);
    for (const c of p.colors) {
      assert.match(c, /^#[0-9a-fA-F]{6}$/, `Color ${c} must be valid 6-digit hex`);
    }
  }

  // Institutional Maroon Gold must be first
  assert.equal(BEAM_CLASSIC_PALETTES[0].id, "maroon-gold");
  assert.equal(BEAM_CLASSIC_PALETTES[0].colors[0], "#800000");
});

test("2. Beam SVG generator produces deterministic, valid SVG markup", () => {
  const svg1 = generateBeamSvgString("TestSeed-1", BEAM_CLASSIC_PALETTES[0].colors, "mask-test-1");
  const svg2 = generateBeamSvgString("TestSeed-1", BEAM_CLASSIC_PALETTES[0].colors, "mask-test-1");
  assert.equal(svg1, svg2, "Same seed and colors must produce identical SVG markup");

  assert.ok(svg1.startsWith("<svg"), "Must start with <svg");
  assert.ok(svg1.endsWith("</svg>"), "Must end with </svg>");
  assert.ok(svg1.includes('mask="url(#mask-test-1)"'), "Must contain mask link");
  assert.ok(svg1.includes("<path"), "Must contain mouth path");
  assert.ok(svg1.includes("<rect"), "Must contain rect elements");
});

test("3. getBeamPresetInfo maps presets 1-48 to seeds and palettes deterministically", () => {
  const p1 = getBeamPresetInfo(1);
  assert.equal(p1.seed, "Ada-Maroon Gold");
  assert.equal(p1.palette.id, "maroon-gold");

  const p2 = getBeamPresetInfo(2);
  assert.equal(p2.seed, "Ada-Ocean");
  assert.equal(p2.palette.id, "ocean");

  const p9 = getBeamPresetInfo(9);
  assert.equal(p9.seed, "Bryn-Maroon Gold");
  assert.equal(p9.palette.id, "maroon-gold");
});

test("4. generateShuffledBeam generates random and reproducible custom avatars", () => {
  const shuffled = generateShuffledBeam();
  assert.equal(shuffled.id, "custom-beam");
  assert.equal(shuffled.type, "custom");
  assert.ok(shuffled.seed.startsWith("beam-"), "Seed must start with beam-");
  assert.ok(shuffled.svgString.startsWith("<svg") && shuffled.svgString.endsWith("</svg>"), "Must generate valid SVG");
  assert.ok(shuffled.palette && shuffled.palette.colors, "Must contain palette");
  assert.ok(shuffled.svg, "Must return React SVG element");
});

test("5. AccountSettingsPanel integrates Beam Gradient customization and shuffle controls", () => {
  const code = fs.readFileSync(path.resolve("src/components/shared/AccountSettingsPanel.js"), "utf8");

  // 1. Module imports
  assert.ok(code.includes('from "@/lib/beamAvatars"'), "Must import from beamAvatars");
  assert.ok(code.includes("generateShuffledBeam"), "Must import generateShuffledBeam");
  assert.ok(code.includes("BEAM_CLASSIC_PALETTES"), "Must import BEAM_CLASSIC_PALETTES");

  // 2. Beam controls UI in modal
  assert.ok(code.includes("Gradient Palette"), "Must include Gradient Palette header");
  assert.ok(code.includes('<TabsTrigger value="classic" size="capsule"'), "Must include capsule trigger for classic");
  assert.ok(code.includes('<TabsTrigger value="vibrant" size="capsule"'), "Must include capsule trigger for vibrant");
  assert.ok(code.includes("selectedBeamPaletteId"), "Must track selectedBeamPaletteId");
  assert.ok(code.includes("handleSelectBeamPalette"), "Must wire handleSelectBeamPalette");
  assert.ok(code.includes("handleToggleBeamPaletteMode"), "Must wire handleToggleBeamPaletteMode");

  // 3. Beam shuffle button and toggle
  assert.ok(code.includes("shuffle-beam-palette-toggle"), "Must include shuffle-beam-palette-toggle");
});

test("6. AccountSetupModal supports Beam shuffle generator in Step 3", () => {
  const code = fs.readFileSync(path.resolve("src/components/shared/AccountSetupPreferences.js"), "utf8");

  assert.ok(code.includes('generateShuffledBeam'), "Must import generateShuffledBeam");
  assert.ok(code.includes('beamColorMode'), "Must track beamColorMode");
  assert.ok(code.includes('setBeamColorMode("classic")'), "Must support Classic mode");
  assert.ok(code.includes('setBeamColorMode("vibrant")'), "Must support Vibrant mode");
});
