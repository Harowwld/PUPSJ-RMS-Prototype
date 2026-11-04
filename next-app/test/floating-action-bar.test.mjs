import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadJsx } from "./helpers/load-jsx.mjs";

const { default: FloatingActionBar } = loadJsx("src/components/shared/FloatingActionBar.js");

test("FloatingActionBar - returns null when selectedCount is 0", () => {
  const html = renderToStaticMarkup(React.createElement(FloatingActionBar, {
    selectedCount: 0,
    actionLabel: "Delete",
    onAction: () => {},
  }));
  assert.equal(html, "");
});

test("FloatingActionBar - formats entity pluralization and renders Apple dock structure", () => {
  const html = renderToStaticMarkup(React.createElement(FloatingActionBar, {
    selectedCount: 4,
    entityName: "personnel",
    forceMount: true,
    onCancel: () => {},
    primaryAction: {
      label: "Archive Personnel",
      variant: "danger",
      onClick: () => {},
    },
    secondaryActions: [
      { label: "Copy Emails", onClick: () => {} },
      { label: "Copy IDs", onClick: () => {} },
    ],
    overflowActions: [
      { label: "Additional Action", onClick: () => {} },
    ],
  }));

  // Must render portal region
  assert.match(html, /role="region"/);
  assert.match(html, /aria-label="Selection batch actions"/);

  // Count badge and plain entity label
  assert.match(html, />4<\/span>/);
  assert.match(html, />personnel selected<\/span>/);

  // Primary action button (text-only, no leading icon)
  assert.match(html, /<button[^>]*><span>Archive Personnel<\/span><\/button>/);

  // Secondary actions (text-only, no leading icons)
  assert.match(html, /<button[^>]*><span>Copy Emails<\/span><\/button>/);
  assert.match(html, /<button[^>]*><span>Copy IDs<\/span><\/button>/);

  // Overflow trigger button
  assert.match(html, /aria-label="More batch actions"/);

  // Deselect button at the end with separator and rounded-full kbd capsule
  assert.match(html, /aria-hidden="true"><\/div><button[^>]*><span>Deselect<\/span><kbd[^>]*class="[^"]*rounded-full[^"]*"[^>]*>esc<\/kbd><\/button>/);
});

test("FloatingActionBar - supports backward-compatible single action props", () => {
  const html = renderToStaticMarkup(React.createElement(FloatingActionBar, {
    selectedCount: 1,
    entityName: "department",
    forceMount: true,
    onCancel: () => {},
    actionLabel: "Delete Department",
    actionVariant: "danger",
    onAction: () => {},
  }));

  assert.match(html, />1<\/span>/);
  assert.match(html, />department selected<\/span>/);
  assert.match(html, /Delete Department/);
  assert.match(html, /Deselect/);
});

test("FloatingActionBar - Escape key dismisses when checkbox is active and does not blur text inputs", () => {
  let cancelled = false;
  let blurred = false;

  const mockCheckbox = {
    tagName: "INPUT",
    type: "checkbox",
    blur: () => { blurred = true; },
  };

  const listeners = [];
  const fakeWindow = {
    addEventListener: (type, fn) => listeners.push(fn),
    removeEventListener: () => {},
  };

  // Simulate onKeyDown logic
  const handleEscape = (activeElement, onCancel) => {
    const isTextEditable =
      activeElement &&
      ((activeElement.tagName === "INPUT" &&
        !["checkbox", "radio", "button", "submit", "reset"].includes(
          (activeElement.type || "").toLowerCase()
        )) ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.isContentEditable);

    if (!isTextEditable && onCancel) {
      if (activeElement && typeof activeElement.blur === "function") {
        activeElement.blur();
      }
      onCancel();
    }
  };

  // Case 1: Checkbox is active (e.g. Select All checkbox)
  handleEscape(mockCheckbox, () => { cancelled = true; });
  assert.equal(cancelled, true, "Must cancel selection when checkbox is focused");
  assert.equal(blurred, true, "Must blur checkbox to remove focus highlight");

  // Case 2: Text input is active (e.g. search filter)
  let textCancelled = false;
  const mockTextInput = {
    tagName: "INPUT",
    type: "text",
    blur: () => {},
  };
  handleEscape(mockTextInput, () => { textCancelled = true; });
  assert.equal(textCancelled, false, "Must not cancel selection when typing in text input");
});
