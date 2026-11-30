import assert from "node:assert/strict";
import test from "node:test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Search01Icon } from "hugeicons-react";
import { loadJsx } from "./helpers/load-jsx.mjs";

const { Empty, EmptyMedia, EmptyState } = loadJsx("src/components/ui/empty.jsx");

test("empty media preserves explicit icon sizes, styles, and classes", () => {
  const markup = renderToStaticMarkup(h(EmptyMedia, null,
    h(Search01Icon, { size: 22, className: "custom-icon", style: { color: "red" } })));
  assert.match(markup, /width="22"/);
  assert.match(markup, /height="22"/);
  assert.match(markup, /custom-icon/);
  assert.match(markup, /style="color:red"/);
  assert.doesNotMatch(markup, /#C7C7CC|font-size:48px/);
  assert.match(markup, /aria-hidden="true"/);
});

test("compact states do not inherit the page minimum height", () => {
  const page = renderToStaticMarkup(h(Empty, null));
  const compact = renderToStaticMarkup(h(Empty, { variant: "compact" }));
  assert.match(page, /data-variant="page"/);
  assert.match(page, /min-h-\[360px\]/);
  assert.match(compact, /data-variant="compact"/);
  assert.match(compact, /min-h-0/);
  assert.doesNotMatch(compact, /min-h-\[360px\]/);
});

test("empty states preserve conditional recovery actions and escape search text", () => {
  const render = (filtered) => renderToStaticMarkup(h(EmptyState, {
    icon: Search01Icon,
    title: filtered ? "No Matches Found" : "No Records Yet",
    description: filtered ? 'No matches for "<script>".' : undefined,
  }, filtered ? h("button", { type: "button" }, "Reset Filters") : null));
  const filtered = render(true);
  const initial = render(false);
  assert.match(filtered, /Reset Filters/);
  assert.match(filtered, /&lt;script&gt;/);
  assert.doesNotMatch(filtered, /<script>/);
  assert.doesNotMatch(initial, /<button|empty-content|empty-description/);
  assert.match(initial, /No Records Yet/);
});

test("empty states are visible in the initial markup", () => {
  const markup = renderToStaticMarkup(h(EmptyState, { title: "No Records Yet" }));
  assert.doesNotMatch(markup, /opacity:\s*0(?:;|")/);
});
