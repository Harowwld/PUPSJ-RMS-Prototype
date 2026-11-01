# Modal standardization

Date: 2026-11-01 (Asia/Manila)

## Form follow-up — 2026-11-02

- Added the shared shadcn-style `Textarea` primitive and migrated multiline modal, sheet, and editor fields to it. Description, purpose, notes, and explanations now share the same border, radius, typography, theme, and focus treatment; callsites retain only meaningful height/resize behavior or a validation border tone.
- Reordered the organization form so its description follows identity/category/status and precedes adviser and visual-theme settings. Reordered student identification so the editable name comes before the read-only student number, with the name receiving the wider column.
- Added field sequence and Textarea usage guidance to `COMPONENT_STANDARDS.md` and `AGENTS.md`.
- Added shared `Input` variants for floating-label and flexible verification-code fields. Removed global important input sizing from `.field-wrapper`; merged fields retain a shared focus outline. These controls are now recorded as addressed in the component consistency audit.

Validation for this follow-up: scoped ESLint found no new errors in changed components. The two findings in `src/app/student/page.js` are existing `react-hooks/set-state-in-effect` diagnostics. `git diff --check` passed. No tests or production build were run.

## Implemented

- Removed header/footer separator borders and tinted bands across dialog and sheet consumers, including report previews, forms, confirmation dialogs, account setup, and search dialogs.
- Removed decorative header icon boxes. Functional close, fullscreen, and record-navigation controls remain.
- Centralized title and description typography in the shared primitives: 16px semibold dialog titles, 17px semibold sheet titles, and 13px normal secondary descriptions. Long titles can wrap.
- Removed default negative margins, padding assumptions, backgrounds, and borders from DialogFooter. Padded and zero-padding popup layouts now use the same neutral footer.
- Updated default dialog padding to 24px. Form consumers retain explicit header/body/footer padding; preview toolbars retain their functional layout.
- Retained borders that communicate actual field groups, tables, document previews, or contextual notices inside the body.
- Updated AGENTS.md and COMPONENT_STANDARDS.md with the no-divider rule.

Changes cover 54 consuming source files plus the shared dialog and sheet primitives. No request, validation, submit, or dismissal handlers were changed.

## Validation

- `pnpm build` passed: all routes compiled and 91 static pages generated. Existing filesystem-tracing warnings remain.
- `node e2e/modal-layout.browser.mjs` passed in light/dark themes at 1440px and 320px.
- Browser fixtures use the real shared primitives, application CSS compiled through the project's Tailwind/PostCSS setup, and the application's Jakarta font. They check padded and zero-padding dialog layouts and sheet layouts.
- Verified no header/footer border lines or tinted backgrounds, no negative footer margins, the shared type scale, contained action buttons, and retained field-group borders.
- Source inspection found no border-top/border-bottom separator classes on the tagged dialog/sheet headers and footers after migration.
- Scoped ESLint checked 57 files. Its nine errors match the pre-change snapshots: seven existing hook-related errors in the admin page and two in the student page. Nineteen existing warnings remain; no new lint errors were introduced.
- `git diff --check` passed.

Browser artifacts are stored in `next-app/.local/modal-layout-qa/`.

## Limits

The browser fixtures validate shared presentation and geometry; every authenticated modal flow was not exercised end to end. Existing application lint issues and unrelated component audit findings remain outside this modal styling change. Pre-existing worktree edits were preserved.
