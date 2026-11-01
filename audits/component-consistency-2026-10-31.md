# Component consistency audit

Date: 2026-10-31 (Asia/Manila)

## Cross-audit recheck — 2026-11-02

Reviewed all seven audit reports and their referenced source/documentation. The component findings in the current matrix are marked addressed. The form-control finding was closed on 2026-11-02: shared `Textarea` and named `Input` variants now cover multiline, floating-label, and flexible verification-code fields; legacy global important dimensions were removed from `.field-wrapper`.

The source recheck confirms Plus Jakarta Sans is the only declared application font family (the `font-mono`/`font-serif` aliases resolve to the same family), and no Phosphor/Tabler icon class aliases or `HugeIcon` calls remain in application source. The legacy names in historical SQL migrations are handled by migration `082_migrate_legacy_hugeicons_aliases.sql`. The icon migration's fixed 24px default was corrected: all 1,036 direct Hugeicons callsites now supply a size, typically `1em` so their existing typography classes determine SVG dimensions; 73 fixed-geometry icons retain explicit pixel values. `AppIcon` continues to default to `1em`.

A fresh production build passed on 2026-11-02 after the form-control and icon-size updates. Remaining review limits are validation scope: there has not been a new browser sweep of every authenticated page/state, and no full-app screen-reader or contrast certification is claimed. The font-only change has build validation now, but has not received a fresh browser visual comparison.

Audit script results: `pnpm audit:empty-states` reports only `DashboardShellSkeleton.js:59`, a detector false positive on `items.map(...)`; `pnpm audit:buttons` continues to emit heuristic matches for native tabs, tertiary controls, and semantic actions, so those matches are not treated as failures. This is a source and audit-script recheck, not a fresh visual review of every authenticated route or modal flow.

## Fresh recheck — 2026-11-01

The shared refresh control is restored, icon callsites now use named Hugeicons components or the data-driven Hugeicons registry, and button-label guidance agrees across the repo. The legacy icon adapter and Phosphor-style UI aliases have been removed from application source. This recheck is source-based and does not claim a visual pass of every authenticated page.

| Finding | Recheck status | Evidence / remaining work |
|---|---|---|
| 1. RefreshButton | **Addressed — P1** | Shared component now renders a 40px outlined icon button using direct `RefreshIcon`/`Loading03Icon` imports. All 34 JSX call sites supply a handler, loading state, and accessible title. |
| 2. Select | **Addressed** | Shared adapter uses Base UI Select; source includes keyboard/listbox and viewport positioning. Browser fixture previously passed keyboard, form, disabled, inline, and edge-placement checks. |
| 3. High Contrast Mode | **Addressed** | Uses the shared Switch with `aria-label="High Contrast Mode"`. |
| 4. Typography | **Addressed** | Global forced type rules were removed; all app text now uses Plus Jakarta Sans. Former monospace/serif utilities were migrated and numeric alignment uses tabular figures. |
| 5–6. Modal layout and headers | **Addressed in shared patterns** | Dialog/sheet primitives no longer add header/footer separators, tinted bands, or negative footer margins; the modal layout fixture passed at 1440px and 320px. This is not an authenticated-page screenshot review. |
| 7. Switch reuse | **Addressed** | Audited custom settings switches use the shared Switch; source search found 11 switch call sites and no custom `role="switch"` implementation. |
| 8. Primary button styling | **Addressed in migrated actions** | Shared primary buttons consume role accent/foreground tokens; semantic variants remain distinct. Browser role-color checks passed. `audit:buttons` emits 142 heuristic matches, primarily native tabs, tertiary controls, and semantic actions; it is not a count of broken primary buttons. |
| 9. Notice banners | **Addressed for audited cases** | Eight notices were moved to NoticeBanner across five consumers. Contextual form instructions, structured previews, and review-note content remain grouped with their related fields or records. |
| 10. Form-control variants | **Addressed — P2** | Shared `Textarea` and named `Input` variants now cover multiline, floating-label, and flexible verification-code fields. Legacy `.field-wrapper` no longer forces input dimensions or typography with important declarations; merged fields retain a shared visible focus outline. |
| 11. Icon API and sizing | **Addressed — P2** | Static icons use direct named Hugeicons imports with explicit `size` props; typography-sized icons use `1em` so utility classes control their dimensions. Dynamic/data-driven icons use the shared registry, which defaults to `1em`. The legacy adapter and Phosphor/Tabler aliases were removed from app source. |
| 12. Button-label documentation | **Addressed — P2** | `AGENTS.md` and `COMPONENT_STANDARDS.md` now both require verb + specific noun for primary/context-dependent actions, while allowing concise dismissal/navigation labels. |

`audit:empty-states` reports only `DashboardShellSkeleton.js:59`, where a skeleton maps `items`; this is a detector false positive rather than an empty-state regression. The button audit is heuristic and requires manual classification. The shared refresh button and standards/audit documentation were updated during this follow-up. A source scan after icon sizing found no direct Hugeicons callsite without `size`; the production build passed. This remains source/build evidence, not a fresh screenshot review of every route.

Implementation follow-up, 2026-11-01: the findings below are the original 2026-10-31 baseline. Use the fresh status table above for their current state. Modal findings 5 and 6 were addressed, including the divider-free header and footer requirement; see [modal standardization](modal-standardization-2026-11-01.md).

## Executive summary

The biggest inconsistencies are in shared behavior and styling ownership: dropdowns implement their own interaction model, global CSS overrides component typography, and equivalent controls use multiple visual implementations. Several dialog headers and notice banners also retain the boxed treatment that conflicts with the quieter direction adopted for empty states.

This is a cross-app source audit with verified representative locations, excluding the completed empty-state redesign. It does not claim that every component or authenticated flow was rendered. No application code was changed during this review.

## Prioritized audit matrix

| ID | Severity | Component / pillar | Confirmed issue | Proposed remediation |
|---|---|---|---|---|
| 1 | P1 | RefreshButton / interaction feedback | `next-app/src/components/shared/RefreshButton.js:1` returns `null`. Thirty-two source files render this component, so their supplied refresh handlers and loading state have no corresponding control. | Align implementation and policy: restore the documented 40×40px accessible refresh control if manual refresh is intended. If removal was intentional, remove dead consumers and revise the standard instead. |
| 2 | P1 | Select / keyboard and semantics | `next-app/src/components/ui/select.jsx:175` renders clickable option buttons; the trigger at line 208 toggles on click. There is no built-in arrow-key navigation, Escape handler, active-option management, expanded-state announcement, or listbox/option semantics. | Back the existing public Select API with an accessible primitive. Support ArrowUp/Down, Home/End, Enter/Space, Escape, selected-option focus, and return focus to the trigger. Preserve existing value/onChange consumers. |
| 3 | P1 | High Contrast Mode control / accessibility | `next-app/src/components/shared/AccountSettingsPanel.js:1567` wraps a hidden checkbox in a label that contains only a decorative div. The visible heading is outside that label; there is no id/for, aria-label, or aria-labelledby connection. | Use the shared Switch and connect it to the visible heading with `aria-labelledby`; retain the existing preference handler. Ensure keyboard focus remains visible. |
| 4 | P2 | Typography globals / hierarchy and tokens | `next-app/src/app/globals.css:746` forces line-height 1.5, line 763 makes font-mono start with Jakarta, line 781 applies Jakarta through a broad important selector, and line 1785 forces inputs to 13px. Component `leading-tight`, mono, and input-size choices can be defeated by these rules. | Put ordinary defaults on body. Give font-mono an actual monospace stack, remove important size/line-height overrides, and let documented component variants own their type scale. Verify the result before changing individual controls. |
| 5 | P2 | DialogFooter / layout consistency | `next-app/src/components/ui/dialog.jsx:128` includes `-mx-4 -mb-4`, assuming a padded popup. `PromptModal.js:85` uses a zero-padding, clipped popup and its footer at line 161 overrides padding without clearing the negative margins. Similar footer usage appears in RestoreModal. | Make the footer neutral by default with no negative margins. Put padding/dividers in a shared dialog layout or explicit variants. Check compact and long-content dialogs at narrow widths; clipping is a source-level risk, not a browser-confirmed failure in this audit. |
| 6 | P2 | Modal headers / visual hierarchy | `next-app/src/components/shared/RestoreModal.js:111`, `next-app/src/components/staff/DocumentRequestsTab.js:1840`, and `next-app/src/components/staff/RegistrarODRSTab.js:563` include decorative icon boxes in DialogHeader. Login's 2FA dialog at `src/app/login/page.js:1301` uses a larger heading treatment. | Use typographic headers: 16px semibold title and 13px normal secondary description. Move meaningful warning context into the body. This follows the existing icon-free-header standard. |
| 7 | P2 | Switches / component reuse | Shared Switch uses maroon when enabled and a light track in dark mode (`ui/switch.jsx:16`). AutoBackupSchedule uses a separate green switch (`admin/backup/AutoBackupSchedule.js:293`) and a smaller blue retention switch (line 436). Account settings has a third checkbox/CSS implementation. | Consolidate into Switch, with a documented size and semantic accent API if distinct colors are needed. Prefer one enabled-state treatment for ordinary preferences; preserve labels, disabled state, and keyboard support. |
| 8 | P2 | Primary buttons / visual priority | The Button default is maroon (`ui/button.jsx:14`); RegisterAccountTab uses slate/white (`admin/RegisterAccountTab.js:241`); OfficeManagementTab uses brand-red in the header (line 866) and slate/white for its empty-state action (line 1130). Global brand classes also force radius, shadow, and press behavior (`globals.css:993`). | Choose one default treatment for equivalent primary actions and express it as a shared variant. Keep semantic destructive/success variants purposeful. Migrate redundant caller class strings and important brand overrides gradually. |
| 9 | P2 | Warning/notice banners / layout | `staff/DocumentRequestsTab.js:1784`, `staff/RegistrarODRSTab.js:349`, and `shared/RestoreModal.js:319` use inset rounded colored notice boxes. The standards require line-attached notices for this role. | Create a NoticeBanner with tone/action/dismissal slots, `px-5 sm:px-6 py-2.5`, no outer margins or radius, and a container divider. Keep actual input groups or document cards separate from banners. |
| 10 | P2 | Form controls / radius and focus styling | Resolved: the verification field uses the shared `verification` Input variant and the shared one-pixel focus styling. PromptModal and other multiline fields use shared `Textarea`. |
| 11 | P2 | Icon API / component consistency | Original finding: the removed `shared/HugeIcon.js` adapter translated Phosphor-style class names to Hugeicons and could fall back to a generic file/folder icon. | Addressed in the 2026-11-02 follow-up: static icons use direct named imports, data-driven icons use an explicit Hugeicons export registry, and app source no longer contains icon class aliases. |
| 12 | P2 | Documentation / consistency maintenance | `AGENTS.md:499` requires verb plus specific noun; `COMPONENT_STANDARDS.md:142` requires single verbs and explicitly forbids labels such as Register Student. This encourages conflicting future edits. | Align the component guide with the explicit action+noun rule for primary actions; keep atomic Cancel, Close, Back, and Done for dismissal/navigation. Update obsolete examples alongside it. |

## Recommended implementation order

1. Resolve the refresh-control contract; fix Select interaction and the unnamed accessibility preference control.
2. Fix shared typography ownership and dialog layout. These changes influence many pages, so compare representative screens before migrating more caller styling.
3. Consolidate switches, primary button variants, modal headers, and notice banners.
4. Migrate legacy icon call sites and reconcile the documentation while touching those components.

## Detailed implementation notes

### Dropdowns

The Select uses Base UI positioning with viewport collision handling and a single inner scroll container. Do not add another scroll container to `menuClassName`.

### Typography

The universal font-family, line-height, and input-size overrides described in the original review have been removed. Plus Jakarta Sans is used throughout; numeric fields use tabular figures. Continue to check component-specific field wrappers if their important rules mask local sizes.

### Dialogs

Use one layout contract: zero-padding shell, typographic header, scrollable body where necessary, and an in-flow footer with no assumed outer margins. Do not remove borders that communicate actual form grouping or error scope merely because decorative header boxes are being removed.

### Buttons and color

Primary buttons now inherit the authenticated role's accent and foreground colors. The role-token regression and its correction are recorded in [the button and switch report](buttons-switches-2026-11-01.md).

## What was not flagged automatically

- Public landing-page cards can have a distinct composition from internal records tables.
- KPI cards' 18px corners appear in the project's own KPI blueprint; matching that blueprint is not automatically a standards violation.
- Status colors and meaningful warning indicators can remain distinct when they communicate different states.
- Dark-theme classes alone do not establish that a visible theme-switching flow is broken; the root provider currently forces light mode.
- No contrast, device-level touch, clipping, or screen-reader certification is claimed from source inspection alone.

## Validation boundary

### Implementation follow-up — 2026-11-01

Findings 2 (Select interaction), 4 (global typography ownership), and the audited notice cases in 9 are addressed in [the notice, typography, and dropdown implementation report](notices-typography-dropdowns-2026-11-01.md). Guardian/SPA panels remain structured information groups rather than notices.

Findings 3 (high-contrast control naming), 7 (switch reuse), and 8 (primary styling) are addressed in [the button and switch implementation report](buttons-switches-2026-11-01.md). Original findings above remain as the audit baseline.

Reviewed shared primitives, global CSS, relevant standards, and representative consumers in administrator, staff, student, system administrator, authentication, and account views. Counts refer to source usage, not the number of simultaneously visible controls. No tests were run because this audit changes only this report.
