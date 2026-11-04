import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadJsx } from "./helpers/load-jsx.mjs";

const { default: ActiveFilterChips } = loadJsx("src/components/shared/ActiveFilterChips.js");

test("ActiveFilterChips - returns null when no filters are active", () => {
  const html = renderToStaticMarkup(React.createElement(ActiveFilterChips, {
    chips: [],
    searchQuery: "",
    extraChips: [],
    groups: [],
  }));
  assert.equal(html, "");
});

test("ActiveFilterChips - renders Apple-styled tokens with count badge and contextual formatting", () => {
  const html = renderToStaticMarkup(React.createElement(ActiveFilterChips, {
    chips: [
      { id: "status", label: "Status is Pending", onRemove: () => {} },
    ],
    searchQuery: "Registrar",
    extraChips: [
      { key: "dateRange", label: "Range: Oct 1, 2026 to Oct 31, 2026", onRemove: () => {} }
    ],
    onClearAll: () => {},
  }));

  // Must render container with role="region" and aria-label="Active filters"
  assert.match(html, /role="region"/);
  assert.match(html, /aria-label="Active filters"/);

  // Must render Apple filter counter badge (3 total filters: status + search + dateRange)
  assert.match(html, /Filters/);
  assert.match(html, />3<\/span>/);

  // Must render Apple pill capsule class: rounded-full, h-6.5
  assert.match(html, /rounded-full/);
  assert.match(html, /h-6\.5/);

  // Search query formatted into Search group token
  assert.match(html, /Search/);
  assert.match(html, /&quot;Registrar&quot;/);

  // Date range token cleanly separated
  assert.match(html, /Range/);
  assert.match(html, /Oct 1, 2026 to Oct 31, 2026/);

  // Clear all button rendered with Apple styling
  assert.match(html, />Clear all<\/button>/);
});
