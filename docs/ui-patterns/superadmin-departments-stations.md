# SuperAdmin Departments & Stations Page Reference

**Purpose:** Record the layout and behavior of the SuperAdmin Departments & Stations page as a reusable reference for future directory and record-management pages.

**Current implementation:** [`next-app/src/components/systemadmin/OfficeManagementTab.js`](../../next-app/src/components/systemadmin/OfficeManagementTab.js)

**Related standards:** [`COMPONENT_STANDARDS.md`](../../COMPONENT_STANDARDS.md), especially the table contract in section 9; [`audits/table-consistency-2026-11-02.md`](../../audits/table-consistency-2026-11-02.md).

This page adapts the information hierarchy of the provided task-table reference to the PUP application. Use this document to repeat the successful structure and interaction patterns; do not copy task-specific labels or filters onto unrelated records.

## Design intent

The page is a working directory for departments, scanning stations, and their records. It should make the current scope clear, keep filtering and table controls in one predictable strip, and let the table adapt to the question the SuperAdmin is answering. The visual treatment stays quiet and Apple-inspired: clear typography, thin dividers, standard corner-radius tokens, and no decorative metric cards.

## Page anatomy

```text
Page header
  Departments & Stations   ·   total departments · total personnel
  Short purpose description

Page-level tabs attached to the divider
  Active / Archived                         Cards / Table
  ───────────────── active underline aligned to the shared rule ─────────

Record controls
  Search  Filter  Sort menu (direction included)  Group menu  Columns menu  Table scroll controls   Refresh   Add Department

Applied filters (only when search or filter rules are active)
  Search/filter chips with individual remove controls and Clear Filters

Records
  Cards (with an Add Department tile at the end of the active collection) or a configurable table

Shared pagination for the table
```

### Header and summary

- Keep the page name and its compact, decision-relevant summary on the same title line when space permits. In this page the summary is the campus-wide department and personnel totals.
- Keep the purpose description below the title. Put Refresh beside Add Department at the right end of the controls row because office and module records can change outside this view.
- Avoid a separate row of stat cards when the values repeat status-tab counts or table values. If a page needs a metric, prefer one concise inline summary unless the metric is a key dashboard task in its own right.
- Let the title and summary wrap cleanly on narrow screens; the summary uses a smaller size and normal weight so it remains supporting information.

### Tabs and divider

- Place record-lifecycle tabs and view-mode tabs immediately below the header and immediately above record controls.
- Give each tab group an accessible name, such as `Department status` and `Department display`.
- Use compact, text-led controls (36px / `h-9`, `px-3`, `text-xs`). The selected state uses the PUP accent and a 2px underline; inactive tabs stay quiet.
- Draw one continuous bottom rule across the tab row. Extend the selected underline to that same edge so the underline is visibly attached to the divider. Do not put each tab in a floating pill, card, or separate outlined container.
- Keep the groups visually distinct with spacing. Status and layout answer different questions even though they share a row.
- Use `aria-pressed` on these button controls and preserve visible keyboard focus.

### Record-control strip

Keep record operations together in one `DataViewToolbar`. The current order follows the reference:

1. Search, with the filtered-result count inside the input at its right edge.
2. Filter, for refinements beyond the top-level Active / Archived tabs.
3. Sort menu, with the field list and ascending/descending segmented control in the same popover.
4. Group-by menu.
5. Visible-columns menu.
6. Horizontal table-scroll controls when Table view is active and the table overflows.
7. Refresh, followed by the primary page action at the far right (`Add Department`).

Use the shared `DataViewToolbar`, `Popover`, and project `<Select>` components for these controls. The Filter popover follows a rule-builder pattern: `Where [field] [operator] [value]`, supports multiple AND-combined rules, offers Clear all, and exposes field chips under Add filter. Current filter fields are Department, Office name, Station, Staff, and Modules. The Station value list contains known station names plus No station assigned. Numeric fields allow is, is not, greater than, and less than; text and station fields allow is / is not. Active / Archived remains the page-level status scope, so status is not repeated as a filter field. Filtering applies in both Cards and Table views. Sorting, grouping, column visibility, and table-scroll controls appear only in Table view because they operate on the table representation.

The Sort popover presents one selected field at a time and keeps Ascending / Descending in a segmented control at its footer. The Group popover presents Station, Status, Staff count, and No grouping as a short selected list; No grouping uses the minus icon. The Columns popover is a checkbox list headed Visible columns. Its choices use checkboxes without leading icons, and its footer has a full-width Reset Columns action with an icon. These compact popovers replace a row of several unrelated native dropdowns and make the available choices discoverable in one place per action.

The shared toolbar uses a single horizontal line with horizontal overflow on narrow screens. Keep this behavior unless a different page has a stronger mobile interaction requirement; do not make dense record controls wrap into several hard-to-scan rows by default.

### Department cards

- Use a responsive grid of equal-width department cards. In each card, the description spans the full available card-content width so it gets the broadest text area; keep it to one truncated line to preserve consistent card heights and align workstation details and footer actions across cards. Retain the full description in `title`.
- Keep a primary footer button on every card: `Configure Department` for active departments and `Restore Department` for archived departments. Keep it beside the staff and module shortcuts; the kebab remains available for the full action list.
- Use the same status-badge component in Cards and Table views. Active and Archived pills use shared semantic colors with a subtle 8px emerald/zinc dot, so both views stay visually identical without a strong dot competing with the status label.
- Add a dashed Add Department tile after the active cards, following the Landing Page CMS photo-tile pattern (`rounded-2xl`, 2px dashed border, centered 48px icon tile, short action and helper text). Show it on the last page of the Active card view so it appears once; the toolbar action remains available in either view.
- Route View Details and Configure Department through the card kebab so the card and table action popovers expose the same choices. Keep staff and module counts as direct card shortcuts.

### Department action menu

- Share the action popover content between Cards and Table, but keep each view's trigger treatment appropriate to its layout: the card uses its quiet vertical kebab, while the table keeps the shared table action button and horizontal ellipsis. Do not copy the card trigger styling onto the Table action column.
- Build both popovers on the shared `Popover` primitive used by Filter, Sort, Group, and Columns so their collision behavior, surface, border, shadow, and header treatment stay consistent. Use a 224px width at 100% zoom, capped to the viewport, with a scrollable list capped at `min(55vh, 18rem)`.
- Match the Apple radius hierarchy: `rounded-2xl` surface, `rounded-lg` action rows, a fine border, restrained shadow, and a small uppercase heading. Keep the header free of redundant identifiers such as `#osas`. Keep rows at least 36px high with leading icons and visible keyboard focus.
- Use the same menu items in Cards and Table: View Details, Configure Department when active, Copy Storage Path, and Archive Department / Restore Department according to status. Render this as the only control in the table's 48px action column so the shared TableActions wrapper does not replace it with a different menu.
- Stop row click propagation from the trigger and actions. Keep the trigger 28px with an accessible department-specific label; close the popover after an action.
- Derive Archive versus Restore from the office record's normalized status inside the shared menu component so Cards and Table always expose the same lifecycle action. Give the kebab a quiet filled surface and fine border so the trigger remains visible in light mode.

### Department detail sheet

- In the footer, place the secondary `Close` button on the left and the status-appropriate primary action on the right (`Configure Department` for active records, `Restore Department` for archived records).
- Use the shared primary Button treatment for Configure and the success variant for Restore. Keep the top-right icon close control as a compact dismissal affordance.

### Applied-filter strip

- Put a compact `ActiveFilterChips` row directly below the controls and above the records. It appears when Search has text or at least one rule is applied.
- Show Search and each rule as a separate chip. Name the field in the chip and include the operator and selected value so users can tell what is narrowing the result set.
- Each chip removes only its own search or rule. Keep `Clear Filters` available even when there is only one chip; it clears Search and all rule-builder clauses together.
- Treat Active / Archived as the page's lifecycle scope. Clearing search and rule-builder filters preserves the selected lifecycle tab.
- Do not represent Sort, Group, or visible-column choices as active filters.

#### Control geometry and corners

| Element | Reference treatment |
|---|---|
| Main page container | `rounded-2xl` |
| Search input, select triggers, buttons, column menu trigger | `rounded-xl` |
| Menu options and small interactive items | `rounded-lg` |
| Status pills and small count indicators | `rounded-full` where they function as pills |
| Toolbar buttons and input | 36px (`h-9`) |
| Refresh icon button in toolbar | 36px (`h-9 w-9`) to align with adjacent controls |
| Compact tab labels | `text-xs`, horizontal padding around 12px |
| Filter popover | 560px maximum width, viewport-capped; 18rem / 42vh scroll area maximum |
| Sort, Group, Columns, and department-action popovers | 224px width at 100% zoom, viewport-capped; lists scroll within a viewport-relative height |

These match the radius hierarchy in `COMPONENT_STANDARDS.md`. Keep the line tabs unboxed; the standard radius belongs on their controls and menus, not on a decorative capsule around the entire tab row.

The result count belongs inside the search field, not beside it. Reserve right padding for it (`pr-12` in the current input), position the count within the input wrapper, and allow the count to remain legible with tabular numerals.

#### Popover anatomy

- Use `rounded-2xl` for the outer popover surface, a fine border, and the shared restrained popover shadow. Keep control triggers at `rounded-xl`; use `rounded-lg` for selectable rows inside menus. This preserves the Apple corner hierarchy while matching the reference's compact menus.
- Use a small uppercase section title in the header. Keep the content menu scannable with 36px rows, leading field icons where helpful, and a trailing checkmark on the selected choice.
- **Filter:** show one rule per row: Where/And, field, operator, value, and a remove control. Keep Clear all in the header and the available Add filter chips in a footer. Multiple rules combine with AND.
- **Sort:** show the selected field in a checkmarked list. Put Ascending / Descending in a two-option segmented control at the bottom of the same popover.
- **Group:** show the supported grouping fields and No grouping as a single-choice list. Use `MinusSignIcon` for No grouping.
- **Columns:** use a checkbox list under Visible columns, without a separate icon for each choice. Each row toggles one optional column. Keep one identifying data column and utility columns outside the list. Add a full-width, icon-led Reset Columns action in the footer that restores every optional column.
- Use the shared `<Select>` for field, operator, and value inputs in the Filter builder so the controls keep the application's keyboard and collision behavior.
- Cap each popover to the available viewport width and height, with an 8px positioning collision inset. Keep its inner option/rule list scrollable so browser zoom and shorter viewports do not push the popup offscreen. The values above describe the intended geometry at 100% zoom on a typical desktop viewport; the CSS caps shrink it to fit smaller viewports.

## Table behavior

### Column visibility

- Offer a Columns menu with a labeled checkbox per optional data column. The checkbox is enough to identify each choice; do not add a second icon beside it.
- Keep Department / Office as a fixed identifying data column. Keep selection and Actions as fixed utility columns. None of these appear in the visibility menu, so the table still shows record identity when every optional column is hidden.
- Optional columns can be hidden or restored. Keep their order canonical (Office details, Station, Staff, Modules, Status) even after a user hides and restores one. Reset Columns restores the entire optional set.
- Build the shared table's `columns` schema from the ordered visible keys. Render matching header and body cells conditionally so the actual cell sequence stays aligned with that schema.
- Do not use only the HTML `hidden` attribute for a removed table column. Hidden cells still exist in the shared table's column-index calculation and can assign the wrong width/type to later cells.

### Sort

- Offer a field selector and a separate, accessible ascending/descending control together in the Sort popover.
- Current fields: department short name, office name, station name, staff count, module count, and status.
- In the Sort popover, show the selected field with a checkmark and keep the direction choice in the same popover. A new field selection resets the direction to ascending.
- Keep clickable table headers as an additional direct way to sort the selected field. The selected sort field and direction must drive both the header indicator and the actual record order.
- Set a stable default (department short name, ascending) and reset direction to ascending when the sort field changes.

### Group

- Group by a meaningful property of the current entity. This page offers Station, Status, Staff count, and No grouping.
- Label empty values clearly (`Unassigned station`) and show a count next to each group heading.
- Here, groups are assembled from the current paginated slice. Counts therefore describe the visible page, and a group can continue on a later page. If another page needs groups that remain whole across pagination, design pagination and grouping together rather than copying this page's mechanics blindly.

### Text width and truncation

The Office Name & Description column has a 420px maximum and the widest data-column cap. The Workstation & Storage column has a 280px maximum, Department has a 240px maximum, Staff and Modules have 104px maximums, and Status has a 144px maximum. Utility columns remain 48px. These caps keep the description as the main reading area without letting workstation paths or counts dominate the directory.

- Declare the caps in the shared Table column schema (`office: { kind: "text", maxWidth: 420, paddingLeft: 4, paddingRight: 0 }`, `station: { kind: "text", maxWidth: 280 }`, and smaller caps for the other data columns). In `layout="content"`, this gives the width calculator real maximums and prevents long values from expanding the table indefinitely. Optional `paddingX`, `paddingLeft`, and `paddingRight` settings default to the standard 16px horizontal inset.
- Keep the office cell's text wrappers shrinkable (`w-full min-w-0`) and use `truncate` on the single-line name and details. Cap the description line at 415px inside the 420px Office Name & Description column, leaving about 5px at the right edge at maximum width; narrower layouts still truncate at the available width. Preserve the full value in `title` so desktop users can inspect clipped text on hover.
- Keep the station name and storage-path wrappers shrinkable and truncate them at the Workstation & Storage column boundary. Preserve the full path in `title` and keep its copy action visible.
- A `max-w` class on the `<td>` alone is not sufficient: the shared table needs the `maxWidth` column contract to constrain content-based layout.
- Keep the display/column configuration and actual header/body cells in the same order. When a column is hidden, omit its cells so the shared Table column schema and cell indexes remain in sync.
- Card descriptions use a single-line `truncate` because cards have a different content geometry. Keep the description full-width inside its card and preserve the full value in `title`; do not treat card truncation as a substitute for the table column width contract.

Example for another content-based shared Table:

```jsx
<Table columns={[
  { kind: "selection" },
  { kind: "text" },
  { kind: "text", maxWidth: 420 },
  { kind: "actions" },
]}>
  {/* Header and row cells must follow the same order. */}
</Table>
```

### Pagination, selection, and empty results

- Use the shared `TablePagination` rather than a page-local footer. Keep the result range, page-size choices, and previous/next behavior consistent with other record lists.
- Select-all affects eligible visible rows on the current page. Checking or unchecking the header control selects or clears the page selection in one state update. The existing blue selected-row tint must cover every visible cell, including utility columns, and disappear from every cell in the same update. Keep selection changes transition-free and rely on the shared row `data-selected` state rather than a separate row background, so the sticky Actions cell cannot clear ahead of the data cells. Keep the selection checkbox column fixed when optional columns change.
- Search and all filter rules combine with the Active / Archived scope. If they yield no results, show a search/filter empty state with a Reset Filters action. Do not present Create Department as the recovery action for an empty filtered result set.
- Give the status dot a visible size and preserve its background color in the shared table. The shared table's nested status-label reset must not clear the dot's fill.
- When multiple departments are selected, label the floating batch action `Archive Departments` or `Restore Departments` so the action names its target.
- The search count reports the number matching the current status, search, and filter criteria.

### Loading skeletons

- Use the same Departments & Stations loading composition for both the page's data-fetch state and the dashboard's dynamic-import fallback. The fallback should not use the generic stat-card/table skeleton; it should preserve this page's title and inline summary placeholder, connected lifecycle/view tabs, search/filter toolbar, and card or table content shape.
- Keep the page title, lifecycle and view tabs, toolbar, and applied-filter strip in place while records load. Replace the compact summary, lifecycle counts, and search result count with inline skeletons instead of flashing zeroes.
- Match the Card skeleton to the current card anatomy: icon/title/status/action header, one-line description, inset workstation and storage rows, then staff/modules chips beside the primary Configure or Restore button. Mirror dashed, muted card treatment on the Archived tab.
- Match the Table skeleton to the selected table layout: Department / Office and the selection and Actions utility columns stay fixed, optional data columns follow the current visible-column list, and the Office description skeleton reaches the same 415px cap as the loaded row. Include the shared pagination geometry and group-header placeholders when grouping is active.
- Use six Card placeholders for the card grid and the current page size for Table rows. Keep skeletons decorative and mark the content region busy while loading.

## Accessibility and interaction checklist

- Give the toolbar an entity-specific accessible name.
- Give status and view button groups separate accessible names; expose their selected state through `aria-pressed`.
- Give `<Select>` triggers clear accessible names (`Sort departments by`, `Group departments by`).
- Use explicit labels for all column checkboxes; preserve keyboard operation and visible focus for the column menu.
- Mark icons decorative when adjacent text already names the action. Give icon-only sort-direction buttons an action-specific accessible name that updates with their state.
- Keep the search result count inside the field and expose changes politely (`aria-live="polite"`).
- Ensure full clipped content remains available through a title/tooltip or another accessible detail path.
- Preserve loading, no-record, no-search-match, no-filter-match, and populated states.

## What to reuse and what to adapt

### Reuse across record-management pages

- Title plus compact summary when the summary helps identify the scale of the current collection.
- Lifecycle tabs above the controls, attached to one divider with an underline for the selected tab.
- A single ordered toolbar for search and data operations, using the established control sizes and radius tokens.
- Shared `Table`, `TablePagination`, `DataViewToolbar`, `FilterPopover`, `SortPopover`, `GroupPopover`, `ColumnsPopover`, and `<Select>` primitives.
- A genuine `maxWidth` contract for long text columns and conditionally omitted cells for visible-column settings.
- Accessible group labels, explicit control names, inline result counts, and useful empty states.

### Adapt to the page's data and job

- Filter fields, sort fields, and group-by fields must represent real properties users need to inspect. This page's department, office name, station, staff, and module filters and its station/status/staff-count groups are department-specific.
- Do not add every available filter, sort, or grouping option merely because this reference has one. Keep only controls useful for the target page's task.
- Do not add stat cards when the same information is already present in tabs, summary text, or the records.
- Keep view tabs only when more than one presentation is useful. Keep lifecycle tabs only when records genuinely have distinct states or archives.
- Decide whether grouping should happen before pagination if the target page needs groups to remain intact across pages.
- Decide whether saved column preferences are valuable. The current `OfficeManagementTab` choices are component state and are not a persisted user preference.

## Current SuperAdmin adaptations

### Department Features & Permissions

`ModuleConfigTab.js` uses the same title-plus-summary, connected line tabs, one `DataViewToolbar`, and shared Filter, Sort, Group, and Columns popovers. Active / Archived scopes departments; By Department / Compare Features switches presentation. Search and feature filters apply to both presentations. Sort, Group, Columns, and horizontal table-scroll controls appear for Compare Features. The Public Login Demo Accounts setting sits directly below the toolbar, as a compact operational banner; the applied-filter strip follows it when needed. `ModuleConfigSkeleton.js` keeps this order while loading.

- By Department uses a horizontal selector of 240px department tiles and a grid of feature cards. Selected departments use a fine accent border; archived departments use a muted dashed surface. Feature cards use quiet `rounded-2xl` surfaces, readable disabled states, a clear title/status hierarchy, a two-line description, and a footer with availability text and the shared switch. The skeleton mirrors the card size and hierarchy.
- Compare Features uses `layout="matrix"` with System Feature fixed outside the Columns menu. Department columns can all be hidden; System Feature still identifies each row. The matrix grows to the viewport width when its columns fit and scrolls when they do not. System Feature remains the widest column. Its name stays left; the Required badge and target label sit together at the right. Long names, targets, and descriptions truncate within the column and retain their full values in `title`.
- Group choices are target role, requirement, and No grouping. The shared No grouping option uses a minus icon. Reset Columns restores every department column. When a department has no visible column, the fixed System Feature column still renders the feature data.
- Enable All Features, Reset to Core, and the supervisor/staff Enable All and Turn Off All actions all open a confirmation. The dialog lists the optional modules whose enabled state will change, rather than listing the department as one selected item. Required system modules remain enabled. When the requested state is already applied, the dialog explains that and uses the standard action label rather than `Done`.

### Campus Operations

`CampusOperationsTab.js` keeps the title and a compact operation/open-count summary together. All / Open / Closed lifecycle tabs attach to the divider above one toolbar. The toolbar combines search, the shared Filter, Sort, Group, and Columns popovers, overflow-only horizontal scroll controls, and Refresh. The Citizen's Charter service-standards banner follows the toolbar, with a text-only Configure Standards button. Search and filter chips appear below that banner when active.

- The table keeps ID and Actions outside the Columns menu. Department, Student requester, Document or proposal, Organization / details, Stage status, and Submitted are optional columns; Reset Columns restores them. ID remains visible even if every optional column is hidden. Column schema, headers, body cells, and loading skeleton follow the same order.
- Group by Department or Stage status, or use No grouping. The group headings count the visible page's records. Pagination defaults to 20 rows; `TablePagination` remains attached below the table.
- `CampusOperationsSkeleton.js` is the dynamic-import fallback. The data-fetch state uses `TransactionsTableSkeleton`. Both preserve the title, connected lifecycle tabs, toolbar, standards banner, table shape, and pagination geometry. Data-fetch skeleton columns follow the selected visibility settings.

### Institutional Identity

`InstitutionalBrandingTab.js` uses a title with a compact seal/font summary and one action toolbar. It does not have a record table, Group menu, or Columns menu, so the table-specific controls above do not apply. Keep its settings and PDF preview workflows separate from the record-table pattern.

## Source map

| Concern | Current source |
|---|---|
| Page header, summary, and line-tab row | `OfficeManagementTab.js` near the component return |
| Search, rule-builder filter, sort, group, and visible-column popovers | `OfficeTableControls.js` |
| Department Features page, card/matrix layout, batch confirmations | `ModuleConfigTab.js` and `ModuleConfigSkeleton.js` |
| Campus Operations page and loading states | `CampusOperationsTab.js`, `CampusOperationsSkeleton.js`, and `TransactionsTableSkeleton.js` |
| Institutional Identity settings layout | `InstitutionalBrandingTab.js` and `InstitutionalBrandingSkeleton.js` |
| Reusable card/table kebab and status badge | `OfficeActionsMenu.js` and `OfficeManagementTab.js` |
| Add Department card tile | `OfficeManagementTab.js`, patterned after the Landing Page CMS photo tile |
| Refresh and Add Department actions | `OfficeTableControls.js`, aligned together at the right side of the control strip |
| Applied-filter chips and clear behavior | `OfficeManagementTab.js` and shared `ActiveFilterChips.js` |
| Search/filter/sort pipeline | `OfficeManagementTab.js`, `filteredOffices` and `filterFields` |
| Grouping and visible-column schema | `OfficeManagementTab.js`, `groupedOffices`, `tableColumns`, and `orderedVisibleColumnKeys` |
| Card/table loading states and count placeholders | `OfficeGridSkeleton.js`, `OfficeManagementTab.js`, and `OfficeTableControls.js` |
| Width calculation and column rendering | `next-app/src/components/ui/table.jsx`, `getContentColumnWidths` / `cellStyle` |
| Popover viewport collision, status-dot styling, and selected-row tint | `next-app/src/components/ui/popover.jsx` and `next-app/src/app/tables.css` |
| Toolbar horizontal behavior | `next-app/src/app/tables.css`, `.data-view-toolbar` |
| Table density, selection, action, and pagination contract | `COMPONENT_STANDARDS.md` section 9 and `audits/table-consistency-2026-11-02.md` |

When changing this page or using it to guide another one, update this document if the established structure or behavior changes materially.
