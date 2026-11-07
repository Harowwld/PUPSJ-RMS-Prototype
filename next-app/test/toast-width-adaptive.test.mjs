import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

test("1. Expanded Toast Max-Width in src/app/globals.css and sonner.jsx", () => {
  const globalsCss = fs.readFileSync(path.join(ROOT_DIR, "src/app/globals.css"), "utf8");
  const sonnerJsx = fs.readFileSync(path.join(ROOT_DIR, "src/components/ui/sonner.jsx"), "utf8");

  // globals.css must define 620px max-width
  assert.ok(
    globalsCss.includes("max-width: min(620px, calc(100vw - 32px))"),
    "globals.css must set max-width to min(620px, calc(100vw - 32px))"
  );

  // sonner.jsx must use 620px max-width in Tailwind classes
  assert.ok(
    sonnerJsx.includes("max-w-[min(620px,calc(100vw-32px))]"),
    "sonner.jsx must use max-w-[min(620px,calc(100vw-32px))]"
  );

  // Hover bridge must expand to 620px to support wide stacked toasts
  assert.ok(
    sonnerJsx.includes("w-[620px] max-w-[calc(100vw-32px)]"),
    "sonner.jsx must expand hover bridge width to w-[620px]"
  );
});

test("2. Full Pill Toast Geometry (rounded-full across all stages)", () => {
  const globalsCss = fs.readFileSync(path.join(ROOT_DIR, "src/app/globals.css"), "utf8");
  const sonnerJsx = fs.readFileSync(path.join(ROOT_DIR, "src/components/ui/sonner.jsx"), "utf8");

  // globals.css must enforce rounded-full (border-radius: 999px)
  assert.ok(
    globalsCss.includes("border-radius: 999px"),
    "globals.css must set border-radius: 999px on .rms-toast"
  );

  // sonner.jsx must apply rounded-full class across toast items
  assert.ok(
    sonnerJsx.includes("rounded-full"),
    "sonner.jsx must apply rounded-full class"
  );
  assert.ok(
    !sonnerJsx.includes("is-card"),
    "sonner.jsx must not apply is-card squircle override"
  );
});

test("3. Long Technical Identifiers Word Break Support (renderBreakableText & overflow-wrap)", () => {
  const globalsCss = fs.readFileSync(path.join(ROOT_DIR, "src/app/globals.css"), "utf8");
  const sonnerJsx = fs.readFileSync(path.join(ROOT_DIR, "src/components/ui/sonner.jsx"), "utf8");

  // globals.css must apply overflow-wrap: anywhere to prevent rigid boundary overflow
  assert.ok(
    globalsCss.includes("overflow-wrap: anywhere"),
    "globals.css must set overflow-wrap: anywhere on .rms-toast"
  );

  // sonner.jsx must implement renderBreakableText with <wbr /> insertion
  assert.ok(
    sonnerJsx.includes("renderBreakableText"),
    "sonner.jsx must implement renderBreakableText"
  );
  assert.ok(
    sonnerJsx.includes("<wbr"),
    "sonner.jsx must inject <wbr /> opportunities for technical tokens"
  );
  assert.ok(
    sonnerJsx.includes("renderBreakableText(titleContent)") &&
    sonnerJsx.includes("renderBreakableText(descContent)"),
    "sonner.jsx must apply renderBreakableText to titleContent and descContent"
  );
});
