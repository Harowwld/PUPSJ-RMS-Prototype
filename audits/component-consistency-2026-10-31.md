# Component consistency audit

Date: 2026-10-31 (Asia/Manila)

Implementation follow-up, 2026-11-01: modal findings 5 and 6 have been addressed, including the additional requirement for divider-free headers and footers. See [modal standardization](modal-standardization-2026-11-01.md) for scope and validation. The findings below preserve the original review; the other items are not marked resolved.

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
| 10 | P2 | Form controls / radius and focus styling | The 2FA input (`app/login/page.js:1323`) requests a 10px radius and a two-pixel custom red ring; PromptModal's textarea (`shared/PromptModal.js:137`) uses rounded-brand and another two-pixel ring. Standard Input uses rounded-xl and a one-pixel focus treatment. | Add a shared Textarea and use named input variants for verification versus ordinary text. Keep rounded-xl geometry and the documented one-pixel border/ring pairing, while retaining a clearly visible keyboard focus indicator. |
| 11 | P2 | Icon API / component consistency | `shared/HugeIcon.js:353` translates legacy ph-* names into Hugeicons and can fall back to a generic file/folder icon (line 395). New components import Hugeicons directly. The underlying adapter already renders Hugeicons; this is API and semantic drift, not proof of two icon libraries being displayed. | Prefer direct named imports as each component is updated. Audit fallback cases before removing the adapter; avoid silently replacing a missing semantic icon with a file symbol. |
| 12 | P2 | Documentation / consistency maintenance | `AGENTS.md:499` requires verb plus specific noun; `COMPONENT_STANDARDS.md:142` requires single verbs and explicitly forbids labels such as Register Student. This encourages conflicting future edits. | Align the component guide with the explicit action+noun rule for primary actions; keep atomic Cancel, Close, Back, and Done for dismissal/navigation. Update obsolete examples alongside it. |

## Recommended implementation order

1. Resolve the refresh-control contract; fix Select interaction and the unnamed accessibility preference control.
2. Fix shared typography ownership and dialog layout. These changes influence many pages, so compare representative screens before migrating more caller styling.
3. Consolidate switches, primary button variants, modal headers, and notice banners.
4. Migrate legacy icon call sites and reconcile the documentation while touching those components.

## Detailed implementation notes

### Dropdowns

The Select already has a single inner scroll container; do not add another scroll container to menuClassName. Its positioning uses the trigger's bottom edge (`select.jsx:52`) and currently only clamps horizontally. Include vertical collision handling when replacing its interaction layer, especially for controls near the bottom of sheets.

### Typography

This should be a shared-style fix before a page-by-page font adjustment. For example, `font-mono` currently selects Jakarta when its variable is defined, so IDs and timestamps do not receive the intended monospace face. Likewise, the verification input's requested text size cannot win against the global important input rule. Screenshots are necessary after removing these overrides because they currently mask caller differences.

### Dialogs

Use one layout contract: zero-padding shell, typographic header, scrollable body where necessary, and an in-flow footer with no assumed outer margins. Do not remove borders that communicate actual form grouping or error scope merely because decorative header boxes are being removed.

### Buttons and color

For the requested restrained Apple direction, a neutral primary treatment is a reasonable default candidate, with maroon used deliberately for brand emphasis. This is a recommendation, not a claim that Apple's interfaces require a particular color. Centralize the chosen treatment before adjusting dozens of individual buttons.

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
