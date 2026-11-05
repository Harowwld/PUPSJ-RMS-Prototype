import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

test("1. Centralized Motion Tokens in src/lib/motion.js", async () => {
  const motionFilePath = path.join(ROOT_DIR, "src/lib/motion.js");
  assert.ok(fs.existsSync(motionFilePath), "src/lib/motion.js must exist");

  const motionModule = await import("../src/lib/motion.js");

  // Easing curves
  assert.deepEqual(motionModule.EASE_OUT, [0.16, 1, 0.3, 1], "EASE_OUT curve must match Apple/beUI standard");
  assert.deepEqual(motionModule.EASE_IN_OUT, [0.77, 0, 0.175, 1], "EASE_IN_OUT curve must match standard");
  assert.deepEqual(motionModule.EASE_DRAWER, [0.32, 0.72, 0, 1], "EASE_DRAWER curve must match standard");

  // Spring physics
  assert.equal(motionModule.SPRING_PRESS.type, "spring");
  assert.equal(motionModule.SPRING_PRESS.stiffness, 500);
  assert.equal(motionModule.SPRING_PRESS.damping, 30);
  assert.equal(motionModule.SPRING_PRESS.mass, 0.5);

  assert.equal(motionModule.SPRING_LAYOUT.type, "spring");
  assert.equal(motionModule.SPRING_LAYOUT.stiffness, 420);
  assert.equal(motionModule.SPRING_LAYOUT.damping, 38);
  assert.equal(motionModule.SPRING_LAYOUT.mass, 0.8);

  assert.equal(motionModule.SIDEBAR_MORPH_TRANSITION.type, "spring");
  assert.equal(motionModule.SIDEBAR_MORPH_TRANSITION.stiffness, 380);
  assert.equal(motionModule.SIDEBAR_MORPH_TRANSITION.damping, 35);
  assert.equal(motionModule.SIDEBAR_MORPH_TRANSITION.mass, 0.75);

  // Content swap asymmetric timings (exit faster than enter)
  assert.ok(
    motionModule.CONTENT_SWAP_EXIT_TRANSITION.duration < motionModule.CONTENT_SWAP_ENTER_TRANSITION.duration,
    "Exit transition must be faster than entrance transition in ContentSwap recipe"
  );
  assert.ok(
    motionModule.CONTENT_SWAP_ENTER_TRANSITION.duration <= 0.25,
    "Enter transition must be <= 250ms"
  );
});

test("2. Motion Primitives in src/components/ui/motion/index.jsx conform to Motion Guides", () => {
  const motionIndexPath = path.join(ROOT_DIR, "src/components/ui/motion/index.jsx");
  assert.ok(fs.existsSync(motionIndexPath), "ui/motion/index.jsx must exist");

  const code = fs.readFileSync(motionIndexPath, "utf8");

  // Required exports
  const expectedExports = [
    "ContentSwap",
    "ContentReveal",
    "PageTransition",
    "FadeIn",
    "SlideUp",
    "StaggerContainer",
    "StaggerItem",
  ];
  for (const exp of expectedExports) {
    assert.ok(code.includes(`export function ${exp}`), `Must export ${exp}`);
  }

  // Accessibility: must import and use useReducedMotion or useAppReducedMotion
  assert.ok(
    code.includes("useReducedMotion") || code.includes("useAppReducedMotion"),
    "ui/motion/index.jsx must use useAppReducedMotion/useReducedMotion for accessibility fallbacks"
  );

  // ContentSwap recipe compliance: asymmetric enter/exit with minimal travel
  assert.ok(
    code.includes("AnimatePresence mode=\"wait\""),
    "ContentSwap must use AnimatePresence in wait mode"
  );
  assert.ok(
    code.includes("y: shouldReduceMotion ? 0 : 4"),
    "ContentSwap must restrict travel to 4px and remove travel on reduced motion"
  );

  // Sub-300ms ceiling for interface motion
  assert.ok(
    !code.includes("duration = 0.4") && !code.includes("duration: 0.35"),
    "Interface motion must stay under 300ms (no 400ms or 350ms durations)"
  );
});

test("3. Sidebar imports and consumes centralized motion tokens", () => {
  const sidebarPath = path.join(ROOT_DIR, "src/components/shared/Sidebar.js");
  const code = fs.readFileSync(sidebarPath, "utf8");

  assert.ok(
    code.includes('from "@/lib/motion"'),
    "Sidebar.js must import tokens from @/lib/motion"
  );
  assert.ok(
    code.includes("SIDEBAR_MORPH_TRANSITION"),
    "Sidebar.js must use SIDEBAR_MORPH_TRANSITION"
  );
  assert.ok(
    code.includes("SPRING_LAYOUT"),
    "Sidebar.js must use SPRING_LAYOUT"
  );
  assert.ok(
    code.includes("SPRING_PRESS"),
    "Sidebar.js must use SPRING_PRESS"
  );
  assert.ok(
    code.includes("useReducedMotion"),
    "Sidebar.js must use useReducedMotion"
  );
});

test("4. FloatingActionBar adopts AnimatePresence and SPRING_PRESS for smooth dock dismiss", () => {
  const fabPath = path.join(ROOT_DIR, "src/components/shared/FloatingActionBar.js");
  const code = fs.readFileSync(fabPath, "utf8");

  assert.ok(
    code.includes("AnimatePresence") && code.includes("motion.div"),
    "FloatingActionBar must use AnimatePresence and motion.div"
  );
  assert.ok(
    code.includes("SPRING_PRESS"),
    "FloatingActionBar must use SPRING_PRESS for physical dock entry/exit"
  );
  assert.ok(
    code.includes("useReducedMotion") || code.includes("useAppReducedMotion"),
    "FloatingActionBar must support useAppReducedMotion / useReducedMotion"
  );
});

test("5. Dashboard View Routers implement ContentSwap for smooth tab switching", () => {
  const sysAdminPath = path.join(ROOT_DIR, "src/app/systemadmin/page.js");
  const adminPath = path.join(ROOT_DIR, "src/app/admin/page.js");

  const sysCode = fs.readFileSync(sysAdminPath, "utf8");
  assert.ok(
    sysCode.includes("ContentSwap") && sysCode.includes("<ContentSwap id={view}"),
    "systemadmin/page.js must wrap active views inside ContentSwap"
  );

  const adminCode = fs.readFileSync(adminPath, "utf8");
  assert.ok(
    adminCode.includes("ContentSwap") && adminCode.includes("<ContentSwap id={view}"),
    "admin/page.js must wrap active views inside ContentSwap"
  );
});

test("6. CSS Tooltip conforms to prefers-reduced-motion fallback", () => {
  const globalsPath = path.join(ROOT_DIR, "src/app/globals.css");
  const code = fs.readFileSync(globalsPath, "utf8");

  assert.ok(
    code.includes(".rms-tooltip") &&
    code.includes("@media (prefers-reduced-motion: reduce)") &&
    code.includes("transform: none !important;"),
    "globals.css must disable tooltip transform under prefers-reduced-motion: reduce"
  );
  assert.ok(
    code.includes(".reduce-motion .rms-tooltip"),
    "globals.css must support in-app .reduce-motion class for tooltips"
  );
});

test("7. Accessibility module provides comprehensive in-app Reduce Motion support", async () => {
  const accessFilePath = path.join(ROOT_DIR, "src/lib/accessibility.js");
  assert.ok(fs.existsSync(accessFilePath), "src/lib/accessibility.js must exist");

  const accessModule = await import("../src/lib/accessibility.js");

  assert.equal(accessModule.GLOBAL_REDUCE_MOTION_KEY, "pup_reduce_motion");
  assert.equal(accessModule.REDUCE_MOTION_EVENT, "pup-reduce-motion-change");
  assert.equal(typeof accessModule.applyReduceMotionClass, "function");
  assert.equal(typeof accessModule.getReduceMotionPreference, "function");
  assert.equal(typeof accessModule.setReduceMotionPreference, "function");
  assert.equal(typeof accessModule.toggleReduceMotionPreference, "function");
  assert.equal(typeof accessModule.useAppReducedMotion, "function");
});

test("8. In-app Accessibility controls and Command Palette integrate Reduce Motion toggle", () => {
  const settingsPath = path.join(ROOT_DIR, "src/components/shared/AccountSettingsPanel.js");
  const settingsCode = fs.readFileSync(settingsPath, "utf8");

  assert.ok(
    settingsCode.includes("Reduce Motion") &&
    settingsCode.includes("reduce_motion") &&
    settingsCode.includes("setReduceMotionPreference"),
    "AccountSettingsPanel must feature a Reduce Motion switch under Accessibility"
  );

  const commandPath = path.join(ROOT_DIR, "src/components/shared/CommandPalette.js");
  const commandCode = fs.readFileSync(commandPath, "utf8");

  assert.ok(
    commandCode.includes("ctrl-toggle-motion") &&
    commandCode.includes("toggleReduceMotionPreference") &&
    commandCode.includes("isReduceMotion"),
    "CommandPalette must include a quick action to toggle Reduce Motion"
  );
});

test("9. Opportunity 1: Staff & Student Dashboard View Routers implement ContentSwap", () => {
  const staffPath = path.join(ROOT_DIR, "src/app/staff/page.js");
  const studentPath = path.join(ROOT_DIR, "src/app/student/page.js");

  const staffCode = fs.readFileSync(staffPath, "utf8");
  assert.ok(
    staffCode.includes("ContentSwap") && staffCode.includes("<ContentSwap id={view}"),
    "staff/page.js must wrap active views inside ContentSwap"
  );

  const studentCode = fs.readFileSync(studentPath, "utf8");
  assert.ok(
    studentCode.includes("ContentSwap") && studentCode.includes("<ContentSwap id={view}"),
    "student/page.js must wrap active views inside ContentSwap"
  );
});

test("10. Opportunity 2: ActiveFilterChips uses AnimatePresence with layout spring", () => {
  const chipsPath = path.join(ROOT_DIR, "src/components/shared/ActiveFilterChips.js");
  const code = fs.readFileSync(chipsPath, "utf8");

  assert.ok(
    code.includes("AnimatePresence") && code.includes("motion.span"),
    "ActiveFilterChips.js must use AnimatePresence and motion.span"
  );
  assert.ok(
    code.includes("SPRING_LAYOUT"),
    "ActiveFilterChips.js must use SPRING_LAYOUT for sibling chip reflow"
  );
  assert.ok(
    code.includes("useAppReducedMotion"),
    "ActiveFilterChips.js must support useAppReducedMotion"
  );
});

test("11. Opportunity 3: SegmentedControl implements shared layoutId active pill with SPRING_LAYOUT", () => {
  const tabsPath = path.join(ROOT_DIR, "src/components/ui/tabs.jsx");
  const code = fs.readFileSync(tabsPath, "utf8");

  assert.ok(
    code.includes("layoutId={`segmented-pill-"),
    "SegmentedControl must render a motion.span with layoutId for sliding pill continuity"
  );
  assert.ok(
    code.includes("SPRING_LAYOUT"),
    "SegmentedControl must use SPRING_LAYOUT token"
  );
  assert.ok(
    code.includes("useAppReducedMotion"),
    "SegmentedControl must respect useAppReducedMotion"
  );
});

test("12. Opportunity 4: NoticeBanner implements smooth vertical collapse on dismissal", () => {
  const bannerPath = path.join(ROOT_DIR, "src/components/shared/NoticeBanner.js");
  const code = fs.readFileSync(bannerPath, "utf8");

  assert.ok(
    code.includes("AnimatePresence") && code.includes("motion.div"),
    "NoticeBanner.js must wrap dismissible content in AnimatePresence and motion.div"
  );
  assert.ok(
    code.includes("height: 0") && code.includes("overflow-hidden"),
    "NoticeBanner.js must collapse height to 0 with overflow hidden upon dismissal"
  );
  assert.ok(
    code.includes("useAppReducedMotion"),
    "NoticeBanner.js must respect useAppReducedMotion"
  );
});

test("13. Opportunity 5: CMS & Configuration Accordion Bars implement smooth vertical expansion", () => {
  const faqPath = path.join(ROOT_DIR, "src/components/systemadmin/LandingFaqCmsView.js");
  const officePath = path.join(ROOT_DIR, "src/components/systemadmin/OfficeManagementTab.js");
  const workflowPath = path.join(ROOT_DIR, "src/components/systemadmin/LandingWorkflowCmsView.js");

  const faqCode = fs.readFileSync(faqPath, "utf8");
  assert.ok(
    faqCode.includes("AnimatePresence") && faqCode.includes("height: \"auto\""),
    "LandingFaqCmsView.js must animate accordion form expansion"
  );

  const officeCode = fs.readFileSync(officePath, "utf8");
  assert.ok(
    officeCode.includes("AnimatePresence") && officeCode.includes("height: \"auto\""),
    "OfficeManagementTab.js must animate modules accordion expansion"
  );

  const workflowCode = fs.readFileSync(workflowPath, "utf8");
  assert.ok(
    workflowCode.includes("AnimatePresence") && workflowCode.includes("height: \"auto\""),
    "LandingWorkflowCmsView.js must animate workflow step expansion"
  );
});

test("14. Opportunity 6: Empty State implements gentle entrance micro-lift with reduced motion fallback", () => {
  const emptyPath = path.join(ROOT_DIR, "src/components/ui/empty.jsx");
  const code = fs.readFileSync(emptyPath, "utf8");

  assert.ok(
    code.includes("motion.div") && code.includes("y: 6"),
    "empty.jsx must use motion.div with subtle 6px lift"
  );
  assert.ok(
    code.includes("useAppReducedMotion"),
    "empty.jsx must use useAppReducedMotion for accessible zero-travel fallback"
  );
});

