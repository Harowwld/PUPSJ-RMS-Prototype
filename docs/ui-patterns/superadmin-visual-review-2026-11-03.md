# SuperAdmin visual review — November 3, 2026

Reviewed the live local application at a 1440 × 1000 browser viewport using an isolated browser and the existing SuperAdmin demo account. Inspected upper and lower page content in light and dark styling. Existing navigation, page composition, workflows, and saved settings were retained.

## Coverage

| Area | Views inspected | Themes |
| --- | --- | --- |
| Departments & Stations | Cards and table | Light, dark |
| Department Features | Department cards and comparison matrix, including lower feature groups | Light, dark |
| Campus Operations | Operation records and Turnaround Standards sheet | Light, dark |
| Institutional Identity | Typography, seals, letterhead, signatories, report colors, document preview | Light, dark |
| Landing Page CMS | Hero, Workflow, Catalog, FAQ, Footer; content editors and interactive previews | Light, dark |
| Global Directory | Personnel table and department badges | Light, dark |
| Security Questions | Question cards, field controls, required/optional states | Light, dark |
| Platform Activity History | Severity tabs, search/date controls, table and pagination | Light, dark |
| Platform Backups | Toolbar, schedule, archives, System Status and dates | Light, dark |
| My Activity | Metrics, filters, activity list and lower content | Light, dark |
| Account Settings | Profile, Security and Preferences, including lower preferences | Light, dark |

## Corrections

| Before | After | Why |
| --- | --- | --- |
| Inactive SuperAdmin sidebar icons and the black logo nearly disappeared on dark surfaces. | Scoped theme-aware icon color and inversion of the existing monochrome logo in dark styling. | Navigation remains recognizable in both themes; other portal branding is unaffected. |
| Catalog header actions wrapped separately from the other CMS sections. | Shared PageHeader text can shrink and wrap while the action region retains its natural width. | Preserves the header arrangement and keeps related actions together. |
| A later generic scroll-control selector overrode the single-row toolbar rule, wrapping Backup controls into multiple rows. | Excluded DataViewToolbar from that wrapping rule and preserved non-wrapping nested scroll controls. | Restores the canonical horizontally scrollable toolbar without changing the Backup/status-panel composition. |
| Platform Backups hardcoded a black accent inside its own brand scope. | Inherits the existing SuperAdmin role accent from the dashboard. | Primary buttons use the same role color as the other tabs. |
| System Status timestamps referenced nonexistent `dark:text-zinc-150` utilities and remained almost black in dark mode. | Uses the existing `text-gray-900 dark:text-zinc-100` text pair. | Last Synced and Last Restored are legible on dark surfaces. |
| Department badges and comparison-matrix headings used the same saturated text colors in both themes. | Retains the configured department hues, with a lighter foreground mix in dark mode. | Improves text visibility while preserving department identity. |
| The Catalog's local light preview inherited dark text utilities from a dark dashboard, producing white text on a white stage; its dark toggle also depended on the outer theme. | Uses the existing light-only boundary for the light stage and a local dark boundary for the dark stage. | Both preview modes work independently inside either dashboard theme. |

## Evidence

Screenshots are local review artifacts under `next-app/.local/superadmin-visual/`:

- Original main-page captures: `light-*.png` and `dark-*.png`.
- Rechecked main pages: `after/`, including `*-bottom.png`.
- Additional table/matrix, sheet, preferences and CMS preview captures: `details/`.
- Main-page contact sheets: `after/light-overview.jpg` and `after/dark-overview.jpg`.

The application currently sets `forcedTheme="light"` in its root provider and has no dashboard appearance switch. Dark styling was inspected with a browser-only class/color-scheme override. This review does not enable a new theme setting or alter the public portal's preview design.

The captures use existing local data. The review did not save forms, change permissions, toggle features, or create/restore backups. Authentication produces the application's normal session/activity entries.

## Validation

- Targeted ESLint: no errors; the shared Sidebar retains its existing Next.js image-element warnings.
- Table inventory and presentation checks passed.
- Shared table browser checks passed at 1440, 768 and 320px in light, dark and both high-contrast themes.
- Live main-page capture recorded no page JavaScript errors or body-width overflow.
- Production compilation checked with `next build --webpack`; this environment previously prevented the standard Turbopack process from binding its internal port.

This is a visual consistency review of the inspected populated views, not a full accessibility certification or a test of every destructive workflow.
