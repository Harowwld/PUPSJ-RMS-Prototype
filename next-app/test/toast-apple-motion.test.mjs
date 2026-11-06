import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

test("1. Centralized Toast Motion Tokens in src/lib/motion.js", async () => {
  const motionFilePath = path.join(ROOT_DIR, "src/lib/motion.js");
  assert.ok(fs.existsSync(motionFilePath), "src/lib/motion.js must exist");

  const motionModule = await import("../src/lib/motion.js");

  // Verify toast-specific spring and easing tokens
  assert.equal(motionModule.SPRING_TOAST.type, "spring");
  assert.equal(motionModule.SPRING_TOAST.stiffness, 380);
  assert.equal(motionModule.SPRING_TOAST.damping, 28);
  assert.equal(motionModule.SPRING_TOAST.mass, 0.8);

  assert.deepEqual(motionModule.EASE_APPLE_SPRING, [0.16, 1, 0.3, 1]);
  assert.deepEqual(motionModule.EASE_APPLE_EXIT, [0.4, 0, 0.2, 1]);
});

test("2. Keyframes and CSS Animations in src/app/globals.css", () => {
  const globalsPath = path.join(ROOT_DIR, "src/app/globals.css");
  const css = fs.readFileSync(globalsPath, "utf8");

  // Dynamic Island / iOS notification fluid spring drop-and-settle
  assert.ok(
    css.includes("@keyframes apple-toast-slide-down"),
    "globals.css must define @keyframes apple-toast-slide-down"
  );
  assert.ok(
    css.includes("translate3d(0, -32px, 0) scale(0.9"),
    "apple-toast-slide-down must start from top offset with scale compression"
  );
  assert.ok(
    css.includes("scale(1.018)") || css.includes("scale(1.02)"),
    "apple-toast-slide-down must include subtle physical overshoot (Apple spring signature)"
  );
  assert.ok(
    css.includes("translate3d(0, 0, 0) scale(1)"),
    "apple-toast-slide-down must settle at origin (0, 0, 0) scale(1)"
  );

  // Symmetric swift retraction exit
  assert.ok(
    css.includes("@keyframes apple-toast-slide-up"),
    "globals.css must define @keyframes apple-toast-slide-up"
  );
  assert.ok(
    css.includes("translate3d(0, -28px, 0) scale(0.88)") || css.includes("translate3d(0, -28px, 0) scale(0.9"),
    "apple-toast-slide-up must retract back toward top edge with scale compression"
  );

  // Reduced motion support
  assert.ok(
    css.includes(".reduce-motion .rms-toast") || css.includes("@media (prefers-reduced-motion: reduce)"),
    "globals.css must support reduced motion for toasts"
  );
});

test("3. Apple-inspired Motion and Stacking in src/components/ui/sonner.jsx", () => {
  const sonnerPath = path.join(ROOT_DIR, "src/components/ui/sonner.jsx");
  const code = fs.readFileSync(sonnerPath, "utf8");

  // Apple spring fluid entry and swift retraction exit classes
  assert.ok(
    code.includes("apple-toast-slide-down_360ms_cubic-bezier(0.16,1,0.3,1)"),
    "sonner.jsx must use 360ms spring entry with cubic-bezier(0.16,1,0.3,1)"
  );
  assert.ok(
    code.includes("apple-toast-slide-up_200ms_cubic-bezier(0.4,0,0.2,1)"),
    "sonner.jsx must use 200ms swift retraction exit with cubic-bezier(0.4,0,0.2,1)"
  );

  // Physical touch/pointer swipe-to-dismiss support
  assert.ok(
    code.includes("handlePointerDown") &&
    code.includes("handlePointerMove") &&
    code.includes("handlePointerUp"),
    "sonner.jsx must implement pointer drag tracking for swipe-to-dismiss"
  );
  assert.ok(
    code.includes("dragOffset") && code.includes("setDragOffset"),
    "sonner.jsx must track 1:1 drag offset during swipe"
  );
  assert.ok(
    code.includes("rubber-band") || code.includes("0.22"),
    "sonner.jsx must apply rubber-band resistance when pulling downward"
  );

  // Stack depth and hover expansion
  assert.ok(
    code.includes('transformOrigin: "top center"'),
    "Toaster must anchor stack scale to top center"
  );
  assert.ok(
    code.includes("translate3d(0, ${translateY}px, 0) scale(${scale})"),
    "Toaster must apply hardware-accelerated translate3d with scale"
  );
  assert.ok(
    code.includes("duration-380 ease-[cubic-bezier(0.16,1,0.3,1)]"),
    "Toaster must apply 380ms Apple spring transition on stack wrapper"
  );
  assert.ok(
    code.includes("active:scale-[0.98]"),
    "Toasts must provide active press tactile feedback"
  );
});
