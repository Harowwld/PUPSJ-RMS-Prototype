import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadJsx } from "./helpers/load-jsx.mjs";

const appRoot = fileURLToPath(new URL("../", import.meta.url));

test("1. Slider component module exports and renders accurately", () => {
  const { Slider } = loadJsx("src/components/ui/slider.jsx");
  assert.equal(typeof Slider, "object", "Slider should be a valid React forwardRef component");

  // Render with default props: Opacity at 50%
  const html = renderToStaticMarkup(React.createElement(Slider, { value: 50 }));

  assert.ok(html.includes("Opacity"), "Should render default 'Opacity' label from attached image");
  assert.ok(html.includes("50"), "Should render default value readout '50'");
  assert.ok(html.includes('data-slot="slider-track"'), "Should provide data-slot='slider-track' for sound effects");
  assert.ok(html.includes('data-slot="slider-fill"'), "Should provide data-slot='slider-fill'");
  assert.ok(html.includes('data-slot="slider-thumb"'), "Should provide data-slot='slider-thumb'");
  assert.ok(html.includes('type="range"'), "Should provide accessible native range overlay");
});

test("2. Border radius geometry and compact size compliance", () => {
  const sliderSource = fs.readFileSync(
    path.join(appRoot, "src/components/ui/slider.jsx"),
    "utf8"
  );

  // Compact size: h-8 (32px) and rounded-xl (12px)
  assert.ok(
    sliderSource.includes("h-8"),
    "Slider must use compact h-8 height"
  );
  assert.ok(
    sliderSource.includes("rounded-xl"),
    "Outer track must use rounded-xl geometry matching compact height"
  );
  assert.ok(
    sliderSource.includes("overflow-hidden"),
    "Outer track must enforce overflow-hidden to clip the fill cleanly within the box"
  );

  // Thumb indicator and dots must be rounded-full
  assert.ok(
    sliderSource.includes("rounded-full"),
    "Vertical bar indicator and tick dots must use rounded-full geometry"
  );
});

test("3. Box-filling style: no border ring, non-gray brand fill, light-mode first", () => {
  const sliderSource = fs.readFileSync(
    path.join(appRoot, "src/components/ui/slider.jsx"),
    "utf8"
  );

  // Must NOT have focus rings or heavy drop shadows
  assert.ok(
    !sliderSource.includes("ring-2"),
    "Must not render intrusive border rings on the slider"
  );
  assert.ok(
    !sliderSource.includes("border-r border-black"),
    "Fill should not have floating card borders"
  );

  // Inactive track: distinct recessed neutral container (NOT white so it stands out against white parent cards)
  assert.ok(
    sliderSource.includes("bg-gray-100"),
    "Inactive track must have distinct recessed neutral background in light mode (bg-gray-100)"
  );

  // Active fill: brand-accent / PUP Maroon (eliminating dull gray-on-gray)
  assert.ok(
    sliderSource.includes("bg-[var(--brand-accent,#800000)]") ||
      sliderSource.includes("bg-pup-maroon"),
    "Active fill must use prestigious institutional brand accent or maroon instead of dull gray"
  );

  // Optical inversion: dual-layer with clipPath
  assert.ok(
    sliderSource.includes("clipPath") && sliderSource.includes("inset(0"),
    "Must use clipPath inset for fluid dual-layer optical contrast inversion"
  );

  // Indicator bar: crisp white vertical dividing bar
  assert.ok(
    sliderSource.includes("bg-white"),
    "Vertical indicator bar must be crisp white"
  );

  // Typography tokens
  assert.ok(
    sliderSource.includes("text-gray-700"),
    "Base label must use text-gray-700 in light mode"
  );
  assert.ok(
    sliderSource.includes("text-white"),
    "Inverted layer must use text-white over the brand fill"
  );
  assert.ok(
    sliderSource.includes("tabular-nums"),
    "Value readout must enforce tabular-nums for layout stability"
  );
});

test("4. Ticks distribution matches the reference image (5% step grid)", () => {
  const { Slider } = loadJsx("src/components/ui/slider.jsx");

  // Render with default ticks
  const html = renderToStaticMarkup(React.createElement(Slider, { value: 50 }));

  // Expected reference ticks: 30%, 35%, 40%, 45%, 50%, 55%, 60%, 65%, 70%, 75%, 80%
  const expectedTicks = [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80];
  for (const tick of expectedTicks) {
    assert.ok(
      html.includes(`left:${tick}%`) || html.includes(`left: ${tick}%`),
      `Should render tick at ${tick}%`
    );
  }
});

test("5. AccountSettingsPanel integrates redesigned compact Slider for Interface Volume", () => {
  const panelSource = fs.readFileSync(
    path.join(appRoot, "src/components/shared/AccountSettingsPanel.js"),
    "utf8"
  );

  assert.ok(
    panelSource.includes('import { Slider } from "@/components/ui/slider";'),
    "AccountSettingsPanel must import Slider component"
  );
  assert.ok(
    panelSource.includes('<Slider') && panelSource.includes('label="Volume"'),
    "AccountSettingsPanel must render Slider with label='Volume'"
  );
  assert.ok(
    panelSource.includes('sm:w-56'),
    "AccountSettingsPanel must use compact width for the slider"
  );
});
