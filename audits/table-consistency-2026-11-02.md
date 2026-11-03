# Table consistency implementation and verification

Date: 2026-11-02, Asia/Manila.

## Delivered contract

The table system now owns density, semantic alignment, identifier/status presentation, control-column sizing, row actions, and pagination. The existing PUP visual language, Plus Jakarta Sans, role branding, and feature callbacks remain in use. Design direction: administrative records work for staff, administrators, and students, with restrained energy, uniform scanning rhythm, and functional motion (1/1/1).

- Compact / Normal / Comfortable minimum body rows: 40 / 52 / 64px, with Normal as the default. Headers remain 40px. Multiline cells may grow.
- One browser density preference per user and staff/student principal, synchronized across tables and browser storage events. Invalid preferences and unavailable storage are handled.
- Explicit column kinds align both headings and cells. Identifiers use neutral 24px badges; statuses use semantic pills; years are centered; quantities are right-aligned.
- Selection and action columns are 48px. Row actions use one direct control or one menu, including actions previously held in separate overflow menus. Original callbacks and disabled states are preserved.
- Long text uses shrinkable, fluid truncation with designated 340px content caps. Matrices use declared column geometry so unbroken text cannot change sticky identity-column offsets.
- Pagination uses accurate ranges, 10/20/50/100 row choices, a default of 10, page clamping, and a consistent empty range. Existing sheet record navigation shares the controls without table-footer dividers.
- Organization table/cards and office table/cards now share the same controlled page state and standard footer. Storage-room cards, notifications, activity lists, and completed-scan lists use the shared pagination controls too. Folder detail layouts remain intact.
- Search-heavy pages use one horizontal `DataViewToolbar` with a consistent control order: search, view, combined filters, date controls, then density/horizontal scrolling. Active-filter chips stay immediately below that line. Narrow screens scroll the same toolbar horizontally instead of wrapping its controls into a second row.
- Request-list and global audit-list fetches ignore stale responses. Scroll observers reconnect when a viewport appears after loading or a view switch.
- `COMPONENT_STANDARDS.md` section 9 defines the complete contract; earlier action/pagination guidance and `AGENTS.md` now point to it.

## Filter and collection footer follow-up

The follow-up applies the toolbar sequence to student and staff directories, document requests/review, compliance, audit logs, system configuration, office management, organization views, import previews, and archive surfaces. Row density is now managed once from Account Settings → Preferences. Horizontal-scroll controls receive their table viewport ref and are shown only while that viewport overflows; non-table views do not show them. List/card modes for paginated collections use the same `TablePagination` footer and 10/20/50/100 choices as record tables.

The checks listed below were run for the initial table-primitives implementation. They were not rerun for this follow-up toolbar/footer change.

## Source inventory

All 50 table declarations under `next-app/src` use the shared `Table`. The only native `<table>` is its implementation. Native structural children are supported through the shared adapter; custom row components use `TableRow`.

| Area | Declarations | Included surfaces |
|---|---:|---|
| Admin | 21 | Staff directory, digital review, student/organization compliance, rate-limiting tables, backups, programs/blocks/document types, import previews, storage-conflict dialogs, audit logs, and corresponding table skeletons |
| Staff | 15 | Student directory, student documents matrix, office documents, requests, organizations, proposal/report monitoring, archives, student/organization import dialogs, and table skeletons |
| System administrator | 10 | Global personnel, offices, module matrix, campus operations, global audit logs, and table skeletons |
| Student | 3 | Requests, requirements/compliance, and request-table skeleton |
| Shared | 1 | Backup restore comparison |

`test/table-inventory.test.mjs` guards against bypassing the primitive, missing column contracts, and inconsistent static header counts. Dynamic matrix and conditional columns remain explicitly declared in their feature.

## Verification

### Automated checks

- PASS: `node --test test/table-presentation.test.mjs test/table-inventory.test.mjs test/table-and-checkbox-audit.test.mjs`. Seven checks across three files cover density keys/validation, pagination boundaries, status semantics, the application inventory, and existing checkbox/clickable-row contracts.
- PASS: ESLint with undefined-variable checks across 63 table-related files: zero errors and two existing hook-dependency warnings in rate limiting and module configuration.
- PASS: `pnpm exec next build --webpack`, including compilation, page-data collection, static generation, and build traces.
- PASS: `git diff --check`.

### Browser geometry and interactions

PASS: `node e2e/table-standards.browser.mjs` uses real shared components and the application stylesheet in an isolated browser fixture. All combinations of 1440px, 768px, and 320px with light, dark, high-contrast light, and high-contrast dark were exercised with no browser runtime or console errors.

| Interaction or geometry | Observed result |
|---|---|
| Compact / Normal / Comfortable | Measured 40 / 52 / 64px single-line rows; 40px headers |
| Selection and action columns | Measured 48px in every density and tested viewport |
| Identifiers and constrained text | 24px identifier badge height; text region at most 340px; no page overflow |
| Data alignment | Center / left / left / center / center / right / center for selection, ID, name, status, year, count, and action cells |
| Multiple actions | Arrow keys and Enter invoked View Student and Edit Student callbacks |
| Existing overflow action | Archive Student appeared in the same menu and invoked its existing callback; no nested overflow trigger remained |
| Disabled action | Locked Student remained disabled and did not invoke its callback |
| Escape | Menu closed and focus returned to the trigger |
| Single action | Direct View Single Student control invoked its callback |
| Row propagation | Actions did not invoke the row callback |
| Selection | Select-all controlled the record checkbox |
| Pagination | Next/Prev ranges, final partial page, rows-per-page reset, shrinking totals, and `Showing 0 of 0` behaved correctly |
| Matrix | Identity columns remained exactly 180px and 240px with a long unbroken name |
| Density persistence | Multiple tables synchronized immediately; reload restored the selection; other users and student/staff principals remained isolated |
| Invalid/unavailable storage | Invalid values used Normal; density remained usable without browser storage |
| Cross-tab event | Storage-event updates synchronized the mounted tables |
| Delayed viewport | Scroll-right, reset, and scroll-left worked after mounting the table following its loading state |
| Application zoom | Geometry and viewport bounds held at scale factors 0.68, 0.9, and 1.125 |
| Touch | Action targets measured 44px inside the 48px column |

Screenshots are available in the ignored runtime directory `next-app/.local/table-qa/`.

## Design delivery gate

- Hard gates PASS for the changed shared system: responsive containment, readable semantic labels, explicit loading/empty handling, keyboard focus, theme parity, and an executed production build/browser check. Evidence is recorded above.
- Purpose gate PASS: neutral badges identify record keys consistently; colored pills express real statuses; the MoreHorizontal Hugeicon opens the row-action menu. No decorative assets, metrics, or production data were invented.
- Liveliness/identity PASS: existing PUP typography and role accents remain, with uniform table rhythm intentionally supporting records scanning. No new decorative animation or unrelated page composition was introduced.
- Craft/consistency PASS: shared components enforce the contract, the source inventory covers all declarations, and keyboard/control callbacks were exercised rather than inferred from appearance.

## Verification limits and unrelated work

- The existing live API search/pagination test could not authenticate its seeded SuperAdmin account: the local app returned `401 Invalid credentials`. Its URL-parameter case passed. No accounts or database contents were reset to make the test pass.
- The default Turbopack build encountered a local process/port permission panic even after a permitted retry. The supported Webpack production build passed.
- Full authenticated portal click-through was not claimed. Browser QA used isolated real components and the production stylesheet; source inventory and compilation covered the migrated application surfaces.
- Pre-existing and concurrent uncommitted changes were retained. No backend API or database-schema changes were required for this table work.
