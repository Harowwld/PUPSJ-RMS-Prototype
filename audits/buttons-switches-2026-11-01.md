# Primary buttons and switches — 2026-11-01

## Implemented

- Shared Button owns role-themed primary colors through `--brand-accent` / `--brand-foreground`, 40px default / 36px compact sizing, rounded-xl geometry, focus indication, disabled styling, restrained press feedback, and reduced-motion behavior.
- Added solid success, warning, and danger variants. Retained the soft destructive variant for secondary destructive actions. Confirmation, prompt, and floating action controls use the shared semantic variants.
- Removed repeated primary styling from 146 buttons across 72 files, and migrated the student feedback primary action to Button. Layout classes, labels, handlers, and loading conditions remain at call sites.
- Removed global important brand-button overrides and beveled semantic shadows. Legacy CSS aliases retain flat compatibility styles; current JSX no longer references them.
- Replaced seven custom switches: automatic backup, retention, two module-access presentations, footer maps, footer watermark, and high contrast. Ordinary settings use one emerald enabled track and white thumb in both themes.
- Shared Switch supports 44×24px default and 36×20px compact tracks, keyboard focus, disabled styling, and reduced motion. Module matrix names include the module and office; existing business-days switches now have accessible names.
- Excluded aria-hidden form inputs from global checkbox styling, preventing those rules from overriding the switch library's visually hidden input geometry.

## Scope boundary

### Role-color regression correction

The first standardization pass incorrectly replaced role colors with hardcoded slate/zinc colors. Role tokens were still being supplied by the application, including DialogContent and SheetContent, but the default Button no longer consumed them. Restored token-based primary colors and matching compatibility CSS, without changing semantic actions or switches. Removed the neutral-primary instruction and example from the standards to prevent recurrence.

The browser regression check failed before the fix (`SuperAdmin primary must inherit its role theme in light mode`). It now verifies accent and foreground inheritance for system admin, registrar/OSAS/clinic admins, staff, students, all predefined palettes, and a custom office color at both viewport widths in both themes. This tests actual rendered Button styles with the real role resolver; it does not claim full authenticated navigation coverage.

Navigation tabs, selected filter chips, status badges, and explicitly secondary controls keep their own semantic treatments. This pass does not certify every application workflow or change application state logic.

## Validation

- Production build passed.
- Scoped lint: nine existing hook errors in admin/student pages, reproduced against pre-change snapshots; no new errors after correcting the floating action bar variant placement. Thirty warnings remain.
- `node e2e/actions.browser.mjs` passed at 1440px and 320px in light and dark mode: label activation, Space toggling, callback counts, controlled form values, disabled switches/buttons, primary clicks, sizes, theme colors, white thumbs, hidden input geometry, overflow, and reduced motion. Screenshots are in `next-app/.local/actions-qa/`.
- Empty-state component tests: 3 passed. Modal browser regression checks passed at 1440px and 320px in light and dark mode.
