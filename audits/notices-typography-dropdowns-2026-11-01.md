# Notice banners, typography, and dropdowns — 2026-11-01

## Implemented

### Dropdowns

Replaced the custom click-only Select internals with the installed Base UI Select primitive. The public adapter preserves option children, fragments, optgroups, options arrays, numeric/string matching, value callbacks, and caller styling. It now provides keyboard navigation, typeahead, listbox semantics, expanded/selected announcements, disabled-item protection, focus restoration, form values, and viewport-aware popup placement. Options retain a single scroll container. Default styling is a 40px rounded-xl trigger with 13px text and a rounded-xl menu.

### Typography

Follow-up on 2026-11-01: the app uses Plus Jakarta Sans as its only typeface. All 84 former monospace/serif utility usages now use the app font, with tabular numerals retained for numeric alignment. The print view loads the same local font before printing; account emails declare the same family with a generic sans-serif fallback. No separate monospace or serif style remains in application UI.

The typography ownership fix removed universal important font-family and line-height rules. Body owns ordinary defaults; component utilities own their type scale. Heading, form, and table defaults sit in Tailwind's base layer instead of overriding component classes. Input keeps a 13px default and respects specialized caller sizes at every viewport width.

### Notice banners

Added shared NoticeBanner with warning, success, information, and destructive tones, direct Hugeicons, optional actions, accessible dismissal, session persistence, and status/alert semantics. Notices span their container with hairline borders and no decorative radius.

Migrated eight notices in five consumers: document requests (missing digital copy and reopening), Registrar ODRS reopening, restore (overwrite warning and safety snapshot), archived module access, and archived/inactive organization status. Existing restore/navigation/dismissal handlers remain intact. Modal notices sit between body tiers; modal headers and footers retain their divider-free layout.

Guardian/SPA information panels, verification fields, document previews, and selectable modes remain structured data/form groups. Existing line-attached notices with specialized controls are retained; this report does not claim every colored block is a notice or that every notice now uses the shared component.

## Validation

- `node e2e/system-components.browser.mjs`: passed at 1440px and 320px in light and dark mode before the single-font follow-up. It checks component size/line-height overrides, notice persistence, dropdown keyboard/form behavior, disabled controls, inline popup behavior, and viewport bounds. Its font assertion now verifies that the former monospace utility resolves to the app font.
- Modal and role-themed button/switch browser regression fixtures passed in both themes at both widths.
- Scoped ESLint: zero errors, one existing exhaustive-deps warning in ModuleConfigTab.
- Final production build passed.

Screenshots: `next-app/.local/system-components-qa/`. These are interactive fixtures using real components, role tokens, font assets, and compiled application CSS. They do not certify every authenticated application workflow or screen-reader combination.
