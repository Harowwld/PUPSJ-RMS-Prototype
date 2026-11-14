# Dashboard Container, Toolbar, Table & Component Alignment Standards

This document captures the complete, production-verified layout and component standardization applied across the **SuperAdmin Dashboard** (`/systemadmin`) using **Departments & Stations** ([`OfficeManagementTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/OfficeManagementTab.js) and [`OfficeTableControls.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/OfficeTableControls.js)) as the canonical reference pattern.

Use this guide as a step-by-step blueprint when migrating or auditing views in other dashboards (e.g., **Registrar Admin**, **OSAS Admin**, **Staff**, and **Account** views).

---

## 1. Vertical Container Hierarchy & Divider Lines

Every dashboard view is encapsulated inside **one unified `<Card>` container** with a strict top-to-bottom visual hierarchy. Every adjacent horizontal section must be separated by a clear `1px` border (`border-b border-border` or `border-t border-border dark:border-border`) so there are no floating or visually merged bands.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. PageHeader (p-6, showBorder={false})                                      │
│    Left: Title + Inline Metric Summary (text-[11px] tabular-nums)            │
│          Description (text-[13px] mt-[4px])                                  │
│    Right (actions): [RefreshButton] [Secondary Outline Button] [Primary Btn] │
├──────────────────────────────────────────────────────────────────────────────┤ ← border-b border-border (if line-tabs exist)
│ 2. Connected Line-Tabs Row (px-6, h-9, border-b border-border)               │
│    [Active 12] [Archived 3]   |   [Grid] [Table]                             │
├──────────────────────────────────────────────────────────────────────────────┤
│ 3. DataViewToolbar (bg-gray-50/40 dark:bg-zinc-900/30 sm:px-5 sm:py-3)       │
│    Left:  [DashboardSearch] [TableScrollControls (no label/icon)]            │
│    Right: [FilterPopover] [SortPopover] [GroupPopover] [ColumnsPopover] ...  │
├──────────────────────────────────────────────────────────────────────────────┤ ← border-t border-border dark:border-border
│ 4. Full-Size Institutional / Schedule Banner (Optional)                      │
│    (e.g. AutoBackupSchedule or SLA Turnaround Banner, px-6 py-4 / px-5)      │
├──────────────────────────────────────────────────────────────────────────────┤ ← border-t border-border dark:border-border
│ 5. ActiveFilterChips Row (Conditional — only when filters/search active)     │
│    (bg-white dark:bg-card px-5 or px-6 py-2.5)                               │
├──────────────────────────────────────────────────────────────────────────────┤ ← border-t border-border dark:border-border
│ 6. Main Content Area (Table / Grid / Empty State / Skeleton)                 │
│    (rounded-b-2xl overflow-hidden bg-white dark:bg-card flex-1)              │
├──────────────────────────────────────────────────────────────────────────────┤ ← border-t border-border (inside TablePagination)
│ 7. TablePagination Footer                                                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Outer Card Wrapper Blueprint
```jsx
<Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
  {/* Sections 1 through 7 */}
</Card>
```

> [!IMPORTANT]
> **Container Corner Clipping & Pure White Surface**:
> - The main container card **must** use `overflow-hidden rounded-2xl` so that all internal children (such as `PageHeader`, connected line-tabs, `DataViewToolbar`, tables, and pagination) are clipped cleanly to the continuous `rounded-2xl` corners without rectangular headers or borders spilling past the card boundary.
> - The container card surface is pure white (`bg-white dark:bg-card`). Internal sub-containers, including line-tabs rows, `DataViewToolbar`, and table headers, **must** use `bg-white dark:bg-card` (or `--table-header: #fff`) rather than gray fills (`bg-gray-50/40`, `#f9fafb`), preserving a clean, unblemished Apple-style white surface.

> [!IMPORTANT]
> **Divider Rule when Line-Tabs are Omitted**:
> - If a view has **connected line-tabs** beneath `PageHeader`, the line-tabs container carries `border-b border-border dark:border-white/10`.
> - If a view does **not** have line-tabs or a toolbar (e.g., a pure form/settings view like [`InstitutionalBrandingTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/InstitutionalBrandingTab.js)), the content container immediately below `PageHeader` **must** carry `border-t border-border dark:border-border`.
> - Every section below `DataViewToolbar` (full-size banner, `ActiveFilterChips`, table/grid wrapper, and table skeleton) **must** carry `border-t border-border dark:border-border`.

---

## 2. PageHeader: Inline Title Summary & Right-Side Button Group

### 2.1 Rules
1. **Inline Metric Summary Next to Title**:
   - Do **not** place record count badges/pills inside `description` or as a gray pill badge next to the title.
   - Render the metric summary inline with the title inside `<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">` using:
     ```jsx
     <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">
       {total.toLocaleString()} records
     </span>
     ```
2. **Header Action Slots (`actions` vs `secondaryActions`)**:
   - All non-toolbar actions belong in [`PageHeader`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/shared/PageHeader.js) on the right side of the header title.
   - Do **not** put `RefreshButton` or primary/secondary action buttons inside `DataViewToolbar`.
   - **The Refresh Button Exemption**:
     - If a view has a [`RefreshButton`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/shared/RefreshButton.js), you do **not** need to put secondary buttons into the more action button. Secondary actions (such as `Export CSV` in [`GlobalAuditLogsTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/GlobalAuditLogsTab.js) or `Restore Backup` in [`SystemBackupsTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/SystemBackupsTab.js)) stay directly visible in `actions` alongside `RefreshButton` and the primary action.
   - **When to Use the More Action Button (`secondaryActions`)**:
     - We **only** use the more action button if:
       1. There is **no** `RefreshButton` in the header, **and**
       2. The total number of action buttons is **more than 2** (e.g. `Preview Portal`, `Save Content`, `Restore Defaults`, `Discard Draft`).
     - In that case, keep the 2 main actions (e.g., `Preview` and `Save`) directly in `actions`, and place all extra actions (`Restore Defaults`, `Discard Draft`, `Reset`) into `secondaryActions`.
   - **Zero Three-Dot Button when <= 2 Actions or when RefreshButton is Present**:
     - If total buttons <= 2 (e.g., `OfficeManagementTab`, `GlobalStaffTab`, `ModuleConfigTab`, `CampusOperationsTab`, `SecurityQuestionsTab`, `ServiceStandardsTab`), or if a `RefreshButton` is present, `secondaryActions` is omitted and no three-dot icon is rendered.

3. **Three-Dot More Action Button & Disappearing Reveal Behavior**:
   - When `secondaryActions` is provided:
     - In the collapsed state (`showSecondaryActions = false`), `PageHeader` renders the three-dot icon button (`<MoreHorizontalIcon size={16} />`, `h-9 w-9 rounded-xl border border-gray-200 bg-white text-gray-700 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200`) immediately to the left of `actions`:
       `[...] [Preview Portal] [Save Content]`
     - **Clicking the three-dot button makes the three-dot button itself disappear**, revealing the extra actions in its place immediately to the left of the main buttons on the exact same row:
       `[Restore Defaults] [Discard Draft] [Preview Portal] [Save Content]`
     - **Auto-Dismiss & Collapse Back**:
       The extra buttons collapse back into the three-dot icon button when:
       1. Clicking anywhere outside the revealed group (`closeOnOutsideClick`),
       2. Pressing the `Escape` key (`closeOnEscape`), which closes the group and returns keyboard focus to the re-rendered three-dot button, or
       3. Clicking any action button inside the revealed group (`onClickCapture`).
       Upon collapsing, the extra buttons hide and the three-dot icon button reappears in place.

4. **Standard Action Button Dimensions & Padding (`h-9 px-4`)**:
   - Following **Departments & Stations** ([`OfficeManagementTab.js#L915`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/OfficeManagementTab.js#L915)), all primary and secondary action buttons across dashboard headers, toolbars, settings tabs, sheet detail action bars (`SheetFooter`), and form action groups use the compact **`h-9 px-4`** standard (`size="sm"`, 36px height, 16px horizontal padding, `text-xs font-semibold rounded-xl`).
   - `RefreshButton`: `className="h-9 w-9"`
   - Three-Dot More Action Button: `className="h-9 w-9 shrink-0"`
   - Secondary/Outline Action Buttons: `variant="outline" size="sm" className="h-9 shrink-0 px-4 text-xs font-semibold rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"`
   - Primary Action Button: `size="sm" className="h-9 shrink-0 px-4 text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50"` (strictly text-only; no static leading icons)
   - **Forbidding Excessive Padding (`h-10 px-5` & `h-9 px-4.5`)**:
     - Action buttons in dashboard headers, forms, settings, and sheet detail footers must **not** use `h-10 px-5` (40px height, 20px padding) or irregular padding like `px-4.5` / `px-6`.
     - Standardizing on `h-9 px-4` ensures optical balance alongside `RefreshButton` (`h-9 w-9`) and three-dot buttons (`h-9 w-9`).
     - Floating capsule dock buttons use compact symmetric pill geometry (`h-8 px-3.5 rounded-full`).

5. **Skeleton Parity for Three-Dot Overflow**:
   - Views that provide `secondaryActions` must have loading skeletons that mirror the collapsed header layout:
     ```jsx
     actions={
       <div className="flex shrink-0 items-center gap-2">
         <Skeleton className="h-9 w-9 rounded-xl dark:bg-muted" />
         <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
         <Skeleton className="h-9 w-32 rounded-xl dark:bg-muted" />
       </div>
     }
     ```

---

## 3. Segmented Control Tabs (Equal Width & Jitter Prevention)

When a view filters records by top-level scope/lifecycle (e.g., `Active` / `Archived`, `All` / `Open` / `Closed`, `All Levels` / `Information` / `Warning` / `Critical`, `All Types` / `Full` / `Database`, `Grid` / `Table` view switcher, or `Content` / `Interactive Live Preview` sub-navigation):

- **Apple HIG Equal Width Standard (`auto-cols-fr` & `w-full`)**:
  All segments in a segmented control **must be equal in width**, regardless of differences in label lengths (e.g., "Active" vs. "Archived", "All" vs. "Optional", "Grid" vs. "Table", "By Department" vs. "Compare Features", "Content" vs. "Interactive Live Preview").
  - Container uses `inline-grid grid-flow-col auto-cols-fr gap-1 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] select-none`.
  - CSS Grid with `auto-cols-fr` guarantees every track matches the width of the widest item in the group, ensuring identical button widths across all options.
  - **Button items must include `w-full`**: Explicitly pass `w-full` on tab buttons (`inline-flex w-full items-center justify-center gap-1.5 ...`) so button elements stretch to occupy 100% of their equal grid track. Without `w-full`, inline-flex buttons will shrink-wrap their text, breaking visual balance between short and long labels.
- **Prevents Active Tab Shifting & Geometry Jitter**:
  When all tabs share the exact same width:
  1. The active white elevated pill never stretches, shrinks, or distorts as it moves between options.
  2. Clicking a tab never shifts adjacent tabs or parent containers.
  3. Binary toggles (`Active / Archived`, `Grid / Table`, `Content / Preview`, `By Department / Compare Features`) maintain an optically balanced 50/50 proportion.
- **Sub-Navigation & View Tabs Surface Continuity**:
  Segmented control rows—including secondary view-switcher tabs such as `LandingCmsViewTabs` or tab strips directly beneath `PageHeader`—**must** use pure white/card surface background (`bg-white dark:bg-card border-b border-border/80 dark:border-white/10 px-6 py-2.5`). Do not introduce gray backgrounds (`bg-gray-50/40`, `bg-zinc-900/30`) which create disconnected bands within the container card.
- **Tab Button Classes**:
  `inline-flex w-full items-center justify-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-full transition-all duration-150 whitespace-nowrap cursor-pointer active:scale-[0.98]`
  - Active: `bg-white text-gray-950 dark:bg-zinc-800 dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.85)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)]`
  - Inactive: `text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white`
- **Count Inside Tab**:
  `px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums min-w-4 text-center` inside each button.
- **Divider & Background**:
  The segmented controls bar rests directly below `PageHeader` with `border-b border-border dark:border-white/10 bg-white dark:bg-card px-6 py-2.5`.

### 3.1 Standardized View Mode Switchers & Icons (`ViewModeIcon`)

Across all tabular and browsable records dashboards, the view mode switcher standardizes terminology, geometry, and icons:

1. **Terminology Standard ("Grid" vs "Cards") & Canonical Sequence**:
   - **Always use "Grid"**: The word "Cards" or "Card" is strictly deprecated for view mode switchers. Use **"Grid"** (e.g., `[Kanban] [List] [Table]`, `[Grid] [Table]`, `[Grid] [List]`).
   - **Canonical View Sequence (`Kanban → Grid → List → Table`)**:
     Across all pages and views in the application, view switchers strictly adhere to the universal sequence: **`Kanban` → `Grid` → `List` → `Table`**. Only include views that apply to that specific page without adding unwanted ones (for example, if a page only supports table and list, sequence them as `[List] [Table]`; if a page supports table and grid, sequence them as `[Grid] [Table]`; if a page supports table, list, and kanban, sequence them as `[Kanban] [List] [Table]`).
   - The canonical view switcher modes across the application are:
     - `Kanban`: Multi-column swimlanes grouped by status or workflow stage.
     - `Grid`: Card-based gallery layout with previews or summary metadata.
     - `List`: Vertical list rows with bullet/index affordances.
     - `Table`: Dense tabular rows and columns with sorting and pagination.
     - `By Department`: Departmental grouped layout (in Module Configurations).
     - `Compare Features`: Matrix grid comparison view (in Module Configurations).

2. **Standardized Hugeicons (`ViewModeIcon`)**:
   All view switchers use the shared `<ViewModeIcon mode="..." className="text-sm" />` component (`@/components/shared/ViewModeIcon`) backed by the mapping dictionary in `@/lib/viewModeIcons`:
   - `grid` (and backward-compatible `card` / `cards`): `GridViewIcon` (4 rounded squares 2x2).
   - `list`: `LeftToRightListBulletIcon` (3 bullet dots + lines, matching Apple HIG lists).
   - `table`: `TableIcon` (structured data table with header and columns).
   - `kanban`: `Layout3ColumnIcon` (3-column swimlanes).
   - `office` / `department`: `Building01Icon`.
   - `matrix` / `compare`: `TableIcon`.

3. **Segmented Capsule Implementation Blueprint**:
   ```jsx
   <div
     role="group"
     aria-label="View display mode"
     className="inline-grid grid-flow-col auto-cols-fr shrink-0 items-center gap-1 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] select-none"
   >
     {[
       { mode: "grid", label: "Grid" },
       { mode: "table", label: "Table" },
     ].map(({ mode, label }) => {
       const isSelected = viewMode === mode;
       return (
         <button
           key={mode}
           type="button"
           onClick={() => setViewMode(mode)}
           aria-pressed={isSelected}
           className={cn(
             "w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-full transition-all duration-150 whitespace-nowrap cursor-pointer active:scale-[0.98]",
             isSelected
               ? "bg-white text-gray-950 dark:bg-zinc-800 dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.85)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)]"
               : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
           )}
         >
           <ViewModeIcon mode={mode} className="text-sm" />
           <span>{label}</span>
         </button>
       );
     })}
   </div>
   ```

---

## 4. DataViewToolbar: Left & Right Split Layout

Now that primary/secondary action buttons live in `PageHeader`, [`DataViewToolbar`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/shared/DataViewToolbar.js) is split into two distinct groups to maximize horizontal space:

- **Left Group (`flex min-w-0 items-center gap-2`)**:
  1. [`DashboardSearch`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/DashboardSearch.js)
  2. [`TableScrollControls`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/shared/TableScrollControls.js) (only rendered when horizontal table overflow exists; displays `[Reset Scroll] [<] [>]` with **no** `"Scroll columns:"` text or icon)
- **Right Group (`ml-auto flex shrink-0 items-center gap-2`)**:
  1. [`FilterPopover`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/OfficeTableControls.js#L43-L162) (or `MultiCriteriaFilter`)
  2. [`SortPopover`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/OfficeTableControls.js#L164-L202)
  3. [`GroupPopover`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/OfficeTableControls.js#L204-L234)
  4. [`ColumnsPopover`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/OfficeTableControls.js#L236-L257)
  5. [`DateRangeFilterButton`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/shared/DateRangePickerModal.js) (when date filtering applies)

### 4.1 Filter State Persistence (`ruleFields` Registration)
When wiring [`FilterPopover`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/OfficeTableControls.js#L63) with persistent `filterRules` via [`useViewPreference`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/hooks/useViewPreference.js):
- The page key (e.g., `"logs"`, `"staff"`, `"operations"`, `"offices"`, `"backups"`, `"modules"`) and all filterable `fieldKey` attributes **must** be registered in `ruleFields` inside [`viewPreferences.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/lib/viewPreferences.js#L31-L39):
  ```javascript
  const ruleFields = {
    offices: ["short_name", "name", "station_name", "staff_count", "module_count"],
    staff: ["role", "office"],
    operations: ["department", "status"],
    backups: ["status_local", "size_bytes"],
    modules: ["category", "required", "status"],
    "cms-faq": ["category"],
    logs: ["office", "role", "severity"],
  };
  ```
- If a page key is omitted from `ruleFields`, [`normalizeViewPreference`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/lib/viewPreferences.js#L46) will sanitize and discard all rules on state changes, reverting `filterRules` to `[]`.

---

## 5. Search Input (`DashboardSearch`) & Corner Result Count

- Always use [`DashboardSearch`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/DashboardSearch.js) instead of ad-hoc `<Input>` wrappers so behavior and spacing stay identical across dashboards.
- **Standardized Width**: `DashboardSearch` has a strictly standardized width token of `w-72 sm:w-80 shrink-0` (288px on mobile, 320px / 20rem on tablet/desktop). Do not pass custom ad-hoc width overrides (such as `sm:w-64`, `w-[min(280px,...)]`, or `w-[min(320px,60vw)]`). This ensures a uniform toolbar experience across all dashboard tabs and matching widths in corresponding loading skeletons.
- The result count inside the search input must sit at the **right corner** (`right-2.5`) of the input field, **not** pushed inward with large right padding (`right-10`).
- When the search input has text (`Boolean(value)`), the clear (`Cancel01Icon`) button renders immediately to the left of the count inside the same `right-2.5` flex container (`absolute inset-y-0 right-2.5 flex items-center gap-1`).
- Hide the browser's native search cancel icon (`[&::-webkit-search-cancel-button]:hidden`) so it never collides with the custom clear button and count.

### 5.1 Table Empty-State Actions

Use the shared `EmptyState` or `Empty` components for empty table content. Show an action when it gives the user a useful next step:

| Empty-state cause | Action |
|---|---|
| Search or filters exclude all rows | `Reset Filters`, clearing the controls that caused the miss. |
| The selected `Archived` or `Active` scope has no rows, but the other scope has rows | `View Active ...` or `View Archived ...`, switching to that scope. |
| The collection has no records and the user may create one | A permitted, specifically named create action, such as `Create Department`, `Register Personnel`, or `Create Backup`. |
| Loading failed | `Retry Loading` using the existing fetch handler. |
| A read-only collection has no records | Explain the absence. If `RefreshButton` is already in `PageHeader`, do not repeat it inside the empty state. |

Keep the action contextual to the empty-state cause. In SuperAdmin, Department Features, Departments & Stations, and Global Directory switch back from an empty Archived scope; Department Features also switches to Archived when every department is archived. Platform Activity History and Campus Operations use their existing header refresh controls for unfiltered, read-only empty states. Use an outlined button for reset and scope-switch actions, and preserve the page's existing creation and permission behavior. Do not add a button that leads to another empty state or duplicates a header action.

---

## 6. Table Column Alignment (`table.jsx` & `tables.css`)

- In [`table.jsx`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/ui/table.jsx#L212), `TableCell` adds `mx-auto` when `alignment === "center"` and `ml-auto` when `alignment === "right"` on `maxWidth`-constrained inner `<div className="w-full min-w-0">` wrappers.
- In [`tables.css`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/tables.css#L64-L66), header buttons inside `th[data-kind="number"]`, `th[data-kind="status"]`, `th[data-kind="year"]`, and `th[data-kind="category"]` align with their column's cell alignment.

---

## 7. Table Row Action Buttons & The Subdued/Ghost Affordance Pattern

Across all data tables in the application, row action buttons (both multi-action kebab popover triggers and dedicated single-action icon buttons) adhere to **The Subdued/Ghost Pattern** with standardized Apple continuous squircle geometry (`var(--radius-lg)` = 12px) established by the **Departments & Stations** view ([`OfficeManagementTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/OfficeManagementTab.js) and [`OfficeActionsMenu.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/OfficeActionsMenu.js)).

### 7.1 The Subdued/Ghost Pattern vs. "Hidden Until Hover" (`opacity-0`)

#### Why Hiding Actions Completely (`opacity-0`) is Forbidden:
1. **Broken on Touch Screens & Mobile**: Touch devices (iPads, smartphones, tablets) do not have cursor hover states. If action buttons are set to `opacity-0` or hidden until hover, touch users cannot discover or tap them without blindly tapping table cells.
2. **Missing Affordance for Scanning Users**: When scanning dense datasets, users need visual reassurance that a row can be acted upon (configured, inspected, archived, or restored) without having to manually move the mouse over each individual row.
3. **Visual Jitter & Sudden Pop-In**: Completely invisible buttons popping in and out on fast cursor motion create distracting visual flicker across the viewport.

#### Why the Subdued/Ghost Pattern is the Production Standard:
1. **Immediate Affordance**: The button is subtly visible by default (`opacity: 0.6` / `opacity-60`), providing a clear touch target and visible interactive affordance.
2. **80% Noise Reduction**: Muted slate coloring and translucent backgrounds allow users to read and scan tabular data without visual competition from heavy buttons.
3. **Elevated Prominence on Interaction**: Moving the mouse over the table row (`tr:hover`), focusing into the row (`tr:focus-within`), hovering the button directly, or opening the popover elevates the button to full prominence (`opacity: 1`, elevated white/zinc background, crisp border, and soft micro-shadow).

```
Default State (Subdued / Ghost):         Elevated State (Row Hover / Focus / Open):
┌──────────────────────────────┐         ┌──────────────────────────────┐
│ ...  Department Name  [ ••• ]│         │ ...  Department Name  [ ••• ]│
└──────────────────────────────┘         └──────────────────────────────┘
Opacity: 0.6 (translucent border)         Opacity: 1.0 (elevated white surface)
Border:  border-border                    Border:  border-gray-300 / dark:border-white/20
Surface: rgba(249, 250, 251, 0.7)        Surface: #ffffff / dark:#3f3f46
Color:   text-gray-500                    Color:   text-gray-900 / dark:text-zinc-50
                                         Shadow:  0 1px 2px rgba(0, 0, 0, 0.05)
```

---

### 7.2 Border Radius & Geometry: Parity with Departments & Stations Grid View

- **Exact Geometry**: Standardized to **`28×28px`** (`w-7 h-7` or `width: 28px; height: 28px;`).
- **Standardized Border Radius**: **`border-radius: var(--radius-lg, var(--radius, 0.75rem)) !important;`** (`rounded-lg`).
  - In Tailwind CSS v4, `--radius` is configured to `0.75rem` (12px), and `--radius-lg` resolves to `var(--radius)` (12px).
  - Passing `rounded-lg` on the button trigger compiles to this exact 12px continuous squircle curvature (43% radius on a 28×28px button).
  - This matches the exact corner curvature of the grid card more action button in [`OfficeActionsMenu.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/OfficeActionsMenu.js).
  - **Prohibition of Arbitrary Radii**: Never use hardcoded `8px` (`rounded-md`), circular pills (`rounded-full`), or square corners on table action buttons. Squircles provide continuous curvature harmonizing with Apple HIG interface aesthetics.

---

### 7.3 State Transitions & CSS Specification (`.table-action-button`)

All table action buttons across the application use the global utility class `.table-action-button` defined in [`tables.css`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/tables.css):

```css
.table-action-button {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: var(--radius-lg, var(--radius, 0.75rem)) !important;
  padding: 0;
  background: rgba(249, 250, 251, 0.7);
  color: #6b7280;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 150ms ease, background-color 150ms ease, border-color 150ms ease, color 150ms ease, box-shadow 150ms ease, transform 100ms ease;
}

.dark .table-action-button {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(39, 39, 42, 0.6);
  color: #a1a1aa;
}

/* Elevated Prominent State */
tr:hover .table-action-button,
tr:focus-within .table-action-button,
.table-action-button:hover,
.table-action-button:focus-visible,
.table-action-button[data-state="open"],
.table-action-button[aria-expanded="true"] {
  opacity: 1;
  border-color: #d1d5db;
  background: #ffffff;
  color: #111827;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.dark tr:hover .table-action-button,
.dark tr:focus-within .table-action-button,
.dark .table-action-button:hover,
.dark .table-action-button:focus-visible,
.dark .table-action-button[data-state="open"],
.dark .table-action-button[aria-expanded="true"] {
  border-color: rgba(255, 255, 255, 0.22);
  background: #3f3f46;
  color: #fafafa;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.25);
}

.table-action-button svg {
  width: 16px;
  height: 16px;
}

.table-action-button:disabled {
  opacity: 0.3;
  cursor: default;
}
```

---

### 7.4 Prohibition of Outer Opacity Multiplication Wrappers (`opacity-40` Antipattern)

> [!CAUTION]
> **Nested Opacity Multiplication Bug**:
> Never wrap `.table-action-button` inside a container or cell that specifies `opacity-40 group-hover:opacity-100` or `opacity-0 group-hover:opacity-100`.
> 
> In CSS, opacity is multiplicative:
> `0.40 (outer wrapper) × 0.60 (inner button) = 0.24 (24% visible opacity!)`
> 
> This unintended multiplication washes out the button completely and renders it nearly invisible on light surfaces when the row is not hovered.

#### Standard Neutral Container:
Action button cells (`<td>`) and container wrappers must remain completely neutral:
```jsx
{/* Correct Neutral Container */}
<td className="p-4 align-middle text-center whitespace-nowrap">
  <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
    <OfficeActionsMenu office={office} triggerVariant="table" />
  </div>
</td>
```
All opacity transitions are self-contained inside `.table-action-button` responding directly to `tr:hover`, `tr:focus-within`, `:hover`, and `[data-state="open"]`.

---

### 7.5 Event Isolation & Stop Propagation (`e.stopPropagation()`)

Because data tables often support row-level interactions (such as single-click row selection in [`OfficeManagementTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/OfficeManagementTab.js) or double-click to open inspection drawers in [`CampusOperationsTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/CampusOperationsTab.js)), action button containers and triggers **must** call `e.stopPropagation()`:

```jsx
<div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
  <button
    type="button"
    onClick={(e) => e.stopPropagation()}
    ...
  >
```
This isolates the action click, preventing accidental row selection, deselection, or background drawer opening when interacting with the menu.

---

### 7.6 Action Trigger Types & Icons

1. **Multi-Action Kebab Menu (`MoreHorizontalIcon` vs. `MoreVerticalIcon`)**:
   - **Horizontal Table Rows**: Always use **`MoreHorizontalIcon`** (`size={16}`). The horizontal three-dot aligns with the horizontal rhythm of tabular rows.
   - **Vertical Grid Cards**: Always use **`MoreVerticalIcon`** (`size={16}`). The vertical three-dot aligns with vertical card headers.
   - Example from [`OfficeActionsMenu.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/OfficeActionsMenu.js#L30-L31):
     ```jsx
     const isTableTrigger = triggerVariant === "table"
     const TriggerIcon = isTableTrigger ? MoreHorizontalIcon : MoreVerticalIcon
     ```

2. **Dedicated Single-Action Buttons (Semantic Hugeicons)**:
   - When a table row features a single primary action (e.g., `ViewIcon`, `Edit01Icon`, `Download01Icon`, `Folder01Icon`, `Share01Icon`), wrap the button in a `<Tooltip>` and apply `.table-action-button rounded-lg active:scale-95 cursor-pointer`:
     ```jsx
     <Tooltip>
       <TooltipTrigger asChild>
         <button
           type="button"
           onClick={(e) => {
             e.stopPropagation()
             handleInspect(record)
           }}
           aria-label={`Inspect ${record.name}`}
           className="table-action-button rounded-lg active:scale-95 cursor-pointer"
         >
           <ViewIcon size={16} aria-hidden="true" />
         </button>
       </TooltipTrigger>
       <TooltipContent side="top">Inspect Details</TooltipContent>
     </Tooltip>
     ```

3. **Compound Row Actions (Quick Action + Kebab Menu)**:
   - In views where a direct action is paired with an overflow menu (e.g. `TableActions.js` in [`CampusOperationsTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/CampusOperationsTab.js)), arrange both buttons inside `<div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>`.
   - Both buttons use `.table-action-button rounded-lg`, providing visual symmetry and uniform elevation states.

---

### 7.7 Popover Menu Architecture & Item Styling (Strictly No Header)

Action popovers use the standardized [`Popover`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/ui/popover.jsx) primitive:
- **Strictly No PopoverHeader or PopoverTitle**: Action popovers must open directly into the actionable options without redundant title text or decorative header bars.
- **Popover Geometry & Placement**:
  ```jsx
  <PopoverContent
    align="end"
    sideOffset={6}
    className="max-h-[calc(100dvh-2rem)] w-[min(12.5rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-2xl p-1"
  >
  ```
- **Menu Item Styling**:
  ```jsx
  const actionClassName = "flex min-h-8 w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:text-zinc-300 dark:hover:bg-zinc-800/70 dark:focus-visible:ring-red-400"
  ```
  - Standard action item: Slate text, Hugeicons `size={14}` in `text-gray-500 dark:text-zinc-400`.
  - Destructive action item (e.g. `Archive Department`): `text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30`.
  - Restorative action item (e.g. `Restore Department`): `text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30`.
  - Divider between action tiers: `<div aria-hidden="true" className="my-1 h-px bg-border dark:bg-white/10" />`.

---

### 7.8 Touch Screen & Coarse Pointer Accessibility (`@media (pointer: coarse)`)

On touch-driven devices (smartphones, iPads, and touch kiosks):
- Mouse hover does not exist. The CSS automatically expands the hit target to Apple HIG minimums via:
  ```css
  @media (pointer: coarse) {
    .table-action-button {
      width: 44px;
      height: 44px;
      opacity: 0.85;
    }
  }
  ```
- Default opacity is elevated to `0.85` so affordances are crisp and distinct without requiring prior contact.
- Minimum geometry increases from `28×28px` to `44×44px` to prevent missed taps.

---

## 8. Universal Borderless Badge/Pill System & Action Button Standards

To adhere strictly to **Apple Human Interface Guidelines (HIG)** and eliminate visual noise, all badges and action buttons across dashboards—**both in data tables and inside slide-over sheets/drawers (`SheetContent`), modals, list views, and navigation**—must follow the standardized borderless pill architecture:

### 8.1 The Pure Borderless Badge Architecture (Zero Border Line Color)
- **Zero Border Lines**: Badges, status pills, and categorical indicators must **never** carry border lines, border utility classes (`border`, `border-border`, `border-*`), or hairline outline strokes around tinted backgrounds.
- **Why Border Lines are Eliminated**: Border outlines around tinted pills introduce visual clutter and compete with surrounding container and table borders. As established in the stage status and turnaround risk designs, a pure borderless badge relying on a soft tinted fill and high-contrast foreground text produces a much cleaner, elevated Apple-style appearance.
- **Universal Geometry & Uniform Padding (`BADGE_BASE`)**:
  All badges across the entire system use the shared token from [`next-app/src/lib/badgeStyles.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/lib/badgeStyles.js):
  ```javascript
  export const BADGE_BASE =
    "inline-flex items-center justify-center rounded-full font-semibold text-[11px] px-2.5 py-0.5 shrink-0 whitespace-nowrap";
  ```
  - **`rounded-full` Curvature**: All status, categorical, network, severity, platform, entity type, and scope badges **must** strictly use `rounded-full` pill geometry.
    - Never use non-standard Tailwind artifacts like `rounded-md` (6px) or `rounded-lg` (8px) on badge pills.
    - The **only** permitted exception for `rounded-lg` is monospace/tabular system identifier badges (e.g. Staff ID or Transaction ID: `rounded-lg px-2.5 py-1 text-xs font-semibold tabular-nums`).
  - **Uniform Padding (`px-2.5 py-0.5`)**: Exactly `10px` horizontal padding (`px-2.5`) and `2px` vertical padding (`py-0.5`). Badges maintain a standardized `22px` height (`h-5.5` in primitives).
  - **Standardized Typography (`text-[11px] font-semibold`)**: Every badge renders at `11px` with `font-semibold` weight (never mismatched `text-xs`, `text-[10px]`, or `font-normal`).
  - **Collapsing & Shrink Prevention (`shrink-0 whitespace-nowrap`)**: Badges never break across lines or shrink under flex layout pressure.

### 8.2 The Curated Color Pool (`BADGE_PALETTES`)
Colors must not be chosen randomly across screens. All badges draw from the curated pool defined in [`next-app/src/lib/badgeStyles.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/lib/badgeStyles.js):

| Palette Key | Semantic Role | Light Mode Classes | Dark Mode Classes |
|---|---|---|---|
| **`maroon`** | Institutional Brand, Office of the Registrar | `bg-[#800000]/10 text-[#800000]` | `dark:bg-red-950/40 dark:text-red-300` |
| **`blue`** | OSAS Office, In Progress, Processing, Under Review | `bg-blue-50 text-blue-800` | `dark:bg-blue-950/40 dark:text-blue-300` |
| **`emerald`** | Ready for Pickup, Approved, Completed, Active, Success | `bg-emerald-50 text-emerald-800` | `dark:bg-emerald-950/40 dark:text-emerald-300` |
| **`amber`** | Pending Submission, Submitted, Action Needed, Warning | `bg-amber-50 text-amber-800` | `dark:bg-amber-950/40 dark:text-amber-300` |
| **`orange`** | Needs Revision, Returned for Correction, Moderate Risk | `bg-orange-50 text-orange-800` | `dark:bg-orange-950/40 dark:text-orange-300` |
| **`rose`** | Declined, Rejected, Cancelled, Shredded, Critical Security Alert | `bg-rose-50 text-rose-800` | `dark:bg-rose-950/40 dark:text-rose-300` |
| **`purple`** | Governance, System Administration, Institutional Policy | `bg-purple-50 text-purple-800` | `dark:bg-purple-950/40 dark:text-purple-300` |
| **`indigo`** | Program Templates, Special Classifications, Metadata | `bg-indigo-50 text-indigo-800` | `dark:bg-indigo-950/40 dark:text-indigo-300` |
| **`sky`** | Public Tracking, External Hard Drive Sync, Network Origin | `bg-sky-50 text-sky-800` | `dark:bg-sky-950/40 dark:text-sky-300` |
| **`gray`** | Default Inactive, Archived, Neutral, General Categories | `bg-gray-100 text-gray-800` | `dark:bg-zinc-800 dark:text-zinc-300` |

### 8.3 Canonical Resolvers & Cross-View Alignment
To prevent color desynchronization between different sections of the app:
1. **Department Badges**:
   - Registrar is **always** PUP Maroon (`BADGE_PALETTES.maroon`), and OSAS is **always** Blue (`BADGE_PALETTES.blue`).
   - Use `getDepartmentBadgeClass(isRegistrar)` from `@/lib/badgeStyles.js` instead of custom inline styles.
2. **Lifecycle Stage Status**:
   - Use `getStatusBadgeClass(status)` from `@/lib/badgeStyles.js` for document requests, event proposals, and archival records.
3. **Cross-View Alignment (List View, Table View, Kanban & Sheets)**:
   - A record must carry the **exact same badge color, text, and padding** regardless of the active view mode (Table View, List View, Kanban pipeline cards, or Slide-Over Details Sheet). For example, a "Pending" request must not render with dark black in list view and maroon in table view.

### 8.4 Universal Component Scope: Beyond Tables to All UI Surfaces
The borderless `BADGE_BASE` standard applies uniformly across all UI surfaces:
- **Data Tables**: Status cells (`TableStatus`), department pills, severity levels, backup types.
- **Multi-View Lists & Accordions**: Row badges in `CampusOperationsList`, `DocumentRequestRecordList`, `DigitalRecordsList`, and `OsasRecordList`.
- **Slide-Over Sheets & Detail Drawers**: Header status badges, verification pills, and info row attributes in `LogDetailSheet`, `OfficeDetailSheet`, `DocumentRequestDetailSheet`, `StudentProfileSheet`, `ServiceStandardsSheet`, `OsasProposalReviewSheet`, `OsasPostEventReviewSheet`, `PermanentAdmissionRecordSheet`.
- **Modals & Dialogs**: Status indicators and counter pills in `ConflictResolutionModals`, `StudentFeedbackModal`, `EditUserModal`, `RestoreModal`, `UserGuideModal`.
- **Settings & Account Panels**: 2FA status, recovery code counts, table density, sound category badges, and accommodation pills in `AccountSettingsPanel`.
- **Navigation & Layout**: Role indicators in `Header`, active view badges in mobile `Sidebar`, shortcut counter circles in `FloatingActionBar`, and command palette badges in `CommandPalette`.
- **Activity History & Narrative Description Tokens**: Mention capsules and status transitions in `NarrativeText`.

### 8.5 Strict Text-Only Discipline & Avatar Mention Exception
- **No colored status dots**: Do not render leading indicator dots (e.g. `<span className="w-1.5 h-1.5 rounded-full ..."/>`) inside badges.
- **No static leading or trailing icons**: Do not render icons (e.g. `CheckmarkCircle01Icon`, `Clock01Icon`, `Shield01Icon`, `Certificate01Icon`, `StudentIcon`, or `AppIcon`) inside badge pills. Text communicates the exact state cleanly.
- **Distinct Exception for Actor Mentions in Narrative Text**:
  - In narrative descriptions (`NarrativeText`), an actor mention (e.g. `@Marcus Reyes`) renders as a borderless capsule (`rounded-full px-2.5 py-0.5 bg-black/[0.04] dark:bg-white/[0.06] text-[11px] font-semibold border-0`) containing a micro circular [`ProfileAvatar`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/shared/ProfileAvatar.jsx) (`size-3.5 rounded-full border-0`) that queries `/api/account/avatar?id=...` and renders the actor's profile photo with fallback initial.

### 8.6 Strict Button Affordance Policy: No Icons in Labeled Buttons, No Text in Icon Buttons
To prevent visual clutter and maintain strict Apple HIG discipline, interactive buttons follow a strict binary rule:
1. **Labeled Action Buttons (Strictly Text-Only)**:
   - Primary and secondary action buttons (`Add Department`, `Register Personnel`, `Configure Department`, `Edit Profile`, `Inspect PDF`, `Save Standards`, `Copy Record (JSON)`, `Open in Requests`, etc.) must **not** include decorative leading or trailing icons like `Plus01Icon`, `Upload01Icon`, `Copy01Icon`, `ViewIcon`, `LinkSquare01Icon`, or `Download01Icon`.
   - **Text communicates action**: Clean, clear verbs in the button text provide immediate, legible affordance without icon redundancy.
2. **Icon Utility Buttons (Strictly Icon-Only)**:
   - Buttons that intentionally use an icon (e.g. `RefreshButton`, table horizontal scroll buttons `[<] [>]`, search clear button, copy-to-clipboard icons, or row expand/collapse toggles) must **not** contain text labels.
   - Must provide an accessible `aria-label` and `title` (or `<Tooltip>`), and include Apple tactile press feedback (`active:scale-95`).
3. **Allowed Exception**: Dynamic loading spinners (`<Loading01Icon className="animate-spin mr-2" />`) shown conditionally while an asynchronous request is in flight.

### 8.7 Standardized Secondary Button Appearance
To ensure visual consistency and tactile feedback across all modal sheets, dialogs, inspection sidebars, toolbars, and palettes, all secondary and outline actions follow the design language established by the "Copy Student No" button in [`CommandPalette.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/shared/CommandPalette.js):

- **Default Variant Classes** (baked into `@/components/ui/button.jsx` for both `variant="outline"` and `variant="secondary"`):
  ```css
  border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all
  ```
- **Appearance & Feel**:
  - **Light mode**: Crisp white background (`bg-white`), ultra-subtle translucent hairline border (`border-black/[0.06]`), dark slate text (`text-gray-700`), and soft hover lift (`hover:bg-gray-50`). Unlike harsh opaque lines, the 6% black boundary melts softly into the diffuse micro-shadow (`shadow-xs`), providing separation on pure white surfaces without looking like a dark drawn outline.
  - **Dark mode**: Soft elevated zinc surface (`dark:bg-zinc-800`), 8% translucent white border (`dark:border-white/[0.08]`), light zinc text (`dark:text-zinc-200`), and subtle hover brightness (`dark:hover:bg-zinc-700`).
  - **Micro-interactions**: Apple-style tactile click feedback via `active:scale-95 transition-all` and subtle depth with `shadow-xs`.

### 8.8 Line Border Token Synchronization (`--border`)
All global boundary lines, card borders, sheet dividers, and table dividers match the exact line border color of the secondary button:
- **Light mode**: `--border: rgb(0 0 0 / 6%);` (`border-black/[0.06]`), replacing heavy opaque lines with hairline Apple-style separators.
- **Dark mode**: `--border: rgb(255 255 255 / 8%);` and `--input: rgb(255 255 255 / 8%);` (`dark:border-white/[0.08]`), harmonizing all dividers (`--table-divider`) and container frames with the Apple HIG dark translucent boundary standard.

---

## 9. Table Header Sort Icons, Typography Scale & Row Interaction Rules

### 9.1 Standardized Table Header `SortIndicator`
Every sortable column header across all tables **must** use the same Hugeicons sort indicator component (never Unicode text arrows like `↑` / `↓` or maroon/colored sort arrows):

```jsx
function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return (
      <ArrowUpDownIcon
        size="1em"
        className="ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
      />
    )
  }
  return sortOrder === "ASC" ? (
    <ArrowUp01Icon size="1em" className="ml-1 text-[12px] text-gray-400" />
  ) : (
    <ArrowDown01Icon size="1em" className="ml-1 text-[12px] text-gray-400" />
  )
}
```
And every sortable header `<button>` must highlight the active sorted column text while keeping inactive columns muted:
```jsx
className={cn(
  "group inline-flex items-center gap-1 text-xs font-semibold transition-colors focus:outline-none cursor-pointer",
  sortBy === columnKey
    ? "text-gray-900 dark:text-white"
    : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
)}
```

### 9.2 Standardized Table Typography Scale
To prevent [`tables.css`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/tables.css#L56) from overriding explicit Tailwind font-size utilities (`text-xs`, `text-[11px]`, `text-[13px]`) on `td[data-kind="text"]`, the default `13px` fallback rule in `tables.css` uses `:where([data-slot="table-cell"][data-kind="text"] > :first-child:not(button):not(svg):not([data-slot="table-text"]):not([class*="text-"]))`.

All tables follow this 3-tier typographic scale (`13px` / `12px` / `11px`):

| Table Element | Font Size & Weight | Tailwind Classes |
|---|---|---|
| **Column Header (`th`)** | `12px` (`text-xs`), Semibold (`600`) | `text-xs font-semibold text-gray-500 dark:text-zinc-400` (active sort: `text-gray-900 dark:text-white`) |
| **Group Header Row** | `12px` (`text-xs`), Semibold (`600`) | `bg-gray-50/90 dark:bg-zinc-900/80 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-zinc-200` + count in `ml-2 font-sans font-normal tabular-nums text-gray-400 dark:text-zinc-500` |
| **Primary Entity Title in Cell** (Dept Short Name, Staff Name, Backup Filename, Requester, Actor) | `13px` (`text-[13px]`), Semibold (`600`) | `text-[13px] font-semibold text-gray-900 dark:text-zinc-100` |
| **Secondary Primary Column** (Full Office Name, Action Verb, Document/Proposal Title) | `13px` (`text-[13px]`), Medium (`500`) | `text-[13px] font-medium text-gray-900 dark:text-zinc-100` |
| **Subtitle / Secondary Line in Two-Line Cell** (Email under Name, Description under Office, Checksum under Filename, Student No under Requester) | `11px` (`text-[11px]`), Regular (`400`) | `text-[11px] font-normal text-gray-500 dark:text-zinc-400` |
| **Standard Single-Line Value Cell** (Workstation, Section, Backup Type, Size, Audit Description, IP Address, Details) | `12px` (`text-xs`), Regular (`400`) | `text-xs font-normal text-gray-700 dark:text-zinc-300` (add `tabular-nums` for numbers/IPs) |
| **Date / Timestamp Cells** (`Created`, `Updated`, `Last Active`, `Submitted`, `Timestamp`) | `12px` (`text-xs`), Regular (`400`), Tabular | `text-xs font-normal text-gray-600 dark:text-zinc-300 tabular-nums` |
| **Pill Badges (`BADGE_BASE`)** (Status, Role, Department, Scope, Severity, 2FA) | `11px` (`text-[11px]`), Semibold (`600`) | `rounded-full px-2.5 py-0.5 text-[11px] font-semibold border-0` (`BADGE_BASE`) |
| **Identifier Badges (`rounded-lg`)** (Staff ID, Transaction ID) | `12px` (`text-xs`), Semibold (`600`), Tabular | `rounded-lg px-2.5 py-1 text-xs font-semibold tabular-nums` |

### 9.3 Row Click vs. Double-Click Interaction Pattern
1. **Selectable Tables (Tables with a Checkbox Column, e.g., [`OfficeManagementTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/OfficeManagementTab.js) & [`GlobalStaffTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/GlobalStaffTab.js))**:
   - **Single Click (`onClick`)** on the row toggles the row's selection checkbox (`toggleSelectRow`), making multi-row batch selection fast and forgiving.
   - **Double Click (`onDoubleClick`)** on the row opens the **View Details** drawer/sheet (`OfficeDetailSheet` / `PersonnelDetailSheet`), matching native desktop/Finder/Linear data-grid ergonomics.
   - Interactive child controls inside the row (checkbox `<input>`, primary title link button, and the right-sticky kebab menu cell) call `e.stopPropagation()` on both `onClick` and `onDoubleClick`.
2. **Read-Only Inspection Tables (Tables without a Checkbox Column, e.g., [`CampusOperationsTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/CampusOperationsTab.js) & [`GlobalAuditLogsTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/GlobalAuditLogsTab.js))**:
   - Both **Single Click (`onClick`)** and **Double Click (`onDoubleClick`)** open the **View Details** sheet directly.

### 9.4 Table Header Expand/Collapse All Control
In data tables with expandable detail rows (such as [`GlobalAuditLogsTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/GlobalAuditLogsTab.js) and [`LogTable.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/admin/audit-logs/LogTable.js)):
- **Synchronous Header Toggle Button**: The expand-chevron/indicator column header (`th.w-12 min-w-12 max-w-12 px-2.5 py-4 text-center`) renders a synchronous **Expand All / Collapse All** icon-only button so users do not have to toggle rows one by one.
- **Dynamic Icon Affordance**:
  - When all visible rows are expanded (`allExpanded === true`): renders `MinusSignIcon` (`AppIcon` or direct named import from `hugeicons-react`).
  - When collapsed or partially expanded (`allExpanded === false`): renders `Add01Icon`.
- **Accessible Tooltip & Label**: Wrapped inside a `<Tooltip>` with accessible `aria-label={allExpanded ? "Collapse all rows" : "Expand all rows"}` and matching tooltip content.
- **Disabled State**: Disabled with reduced opacity (`disabled={rows.length === 0}`) when the table contains zero items.
- **Apple Tactile Styling**:
  ```jsx
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        onClick={toggleExpandAll}
        disabled={logs.length === 0}
        aria-label={allExpanded ? "Collapse all rows" : "Expand all rows"}
        className="mx-auto flex h-7 w-7 rounded-lg items-center justify-center bg-transparent border-none text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 cursor-pointer active:scale-95 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <AppIcon className={cn("text-[14px]", allExpanded ? "MinusSignIcon" : "Add01Icon")} />
      </button>
    </TooltipTrigger>
    <TooltipContent side="top">
      {allExpanded ? "Collapse all rows" : "Expand all rows"}
    </TooltipContent>
  </Tooltip>
  ```

### 9.5 High-Volume Table Density & Pagination Defaults (50 Rows Per Page)
- **Default Limit Standardization**: For high-volume transaction, audit log, and platform activity views (e.g., [`GlobalAuditLogsTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/GlobalAuditLogsTab.js), [`AuditLogsTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/admin/AuditLogsTab.js), and [`admin/page.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/admin/page.js)), the default table page size is standardized to **50 rows per page** (`useViewPreference("logs", "limit", 50)`, `logsPerPage = 50`, `itemsPerPage = 50`).
- **Skeleton Row Count Parity**: The corresponding table loading skeleton (e.g., [`GlobalAuditLogsSkeleton.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/skeletons/GlobalAuditLogsSkeleton.js)) defaults to `rowCount={50}`. This eliminates vertical layout jump and maintains unbroken typographic rhythm while data streams in.
- **Page Size Steps**: Supported table page sizes follow `TABLE_PAGE_SIZES` (`[10, 20, 50, 100]`) via [`TablePagination`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/shared/TablePagination.js).

### 9.6 Expandable Detail Row Architecture (`LogExpandedRow` Apple Inset Grouped Bento)
When a table row is expanded to expose multi-dimensional record metadata (e.g., audit history, event payloads, or transaction forensics), the expanded area adheres to Apple iOS/macOS Inset Grouped card architecture:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ▾ Expanded Detail Sunken Surface (bg-gray-50/70 dark:bg-zinc-950/40 blur)   │
│ ┌───────────────────────┐ ┌───────────────────────┐ ┌─────────────────────┐ │
│ │ 1. Narrative & Event  │ │ 2. Security & Network │ │ 3. Resource & Scope │ │
│ │ • Severity Badge      │ │ • Connection Badge    │ │ • Entity Type Badge │ │
│ │ • Formatted Summary   │ │ • IP Address [Copy]   │ │ • Resource ID [Copy]│ │
│ │ • Action Verb Badge   │ │ • Client Platform     │ │ • Governance Scope  │ │
│ │ • Actor + Role        │ │ • Raw UA [Copy]       │ │ ─────────────────── │ │
│ │ • Tabular Timestamp   │ │ • Sequence ID [Copy]  │ │ [Copy Record (JSON)]│ │
│ └───────────────────────┘ └───────────────────────┘ └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```
1. **Sunken Translucent Backdrop**:
   `className="animate-in fade-in slide-in-from-top-1 duration-200 bg-gray-50/70 dark:bg-zinc-950/40 backdrop-blur-md px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6 border-t border-black/[0.05] dark:border-white/[0.07] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"`
2. **3-Column Responsive Bento Layout**:
   `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 items-stretch`
3. **Apple Inset Grouped Cards**:
   `rounded-2xl bg-white dark:bg-zinc-900/90 border border-black/[0.06] dark:border-white/[0.08] shadow-2xs overflow-hidden`
   - **Card Header**: `px-4 py-3 bg-gray-50/50 dark:bg-zinc-800/25 border-b border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between gap-2 shrink-0` with small category icon tile (`w-6 h-6 rounded-lg`) and dotless pill badge (`rounded-full`).
   - **Internal Divided Rows**: `divide-y divide-black/[0.04] dark:divide-white/[0.06]` with uppercase tracking-wider labels (`text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400`) and tabular numbers (`font-sans tabular-nums text-xs font-semibold`).
4. **Intelligent User Agent Attribution**:
   A zero-dependency parser (`parseUserAgent`) extracts clean platform summaries (`Google Chrome • macOS`, `Microsoft Edge • Windows 10/11`, `Safari • iOS`, `Archival Daemon`, `API Client`) while preserving an icon-only button to copy the raw user-agent string.
5. **Strictly Text-Only Action Buttons**:
   Quick actions (such as `Copy Record (JSON)` / `Record Data Copied!`) use full-width outline buttons with Apple tactile scale feedback (`active:scale-95`) without decorative icons.

---

## 10. Sheet & Slide-Over Drawer Architecture (`Sheet`)

All inspection, detail, and editing drawers across the application adhere to standard Apple macOS Inspector and iPadOS slide-over panel layout ergonomics:

```
┌─────────────────────────────────────────────────────────────┐
│ SheetHeader (p-6, border-b border-border/60)                │
│ ┌───────────────┐                                           │
│ │ Circular Tile │  Title (text-[18px] font-bold)            │
│ │ (rounded-full)│  Subtitle / Identifier (text-[12px])      │
│ └───────────────┘  Badges: [Active] [Registrar] (Text-only) │
├─────────────────────────────────────────────────────────────┤
│ Sheet Content Body (p-6, space-y-6, flex-1 overflow-y-auto) │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Summary Spec Strip (rounded-xl bg-gray-50/70 border)   │ │
│ │ • Circular Marker Icons (rounded-full)                  │ │
│ │ • Clean Key-Value Pairs                                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│ Form Fields, Accordions, Sub-tables, Activity Feeds        │
├─────────────────────────────────────────────────────────────┤
│ SheetFooter (shrink-0 p-4 px-6 border-t border-border/60)   │
│ [Close / Cancel]              [Secondary Action] [Primary]  │
│ (Left Dismissal)                     (Right Action Group)   │
└─────────────────────────────────────────────────────────────┘
```

### 10.1 Structural & Layout Ergonomics
1. **Container Geometry**:
   - Slide-over drawers dock cleanly on the right side: `side="right" className="w-[480px] sm:w-[540px] max-w-[90vw] p-0 flex flex-col bg-white dark:bg-zinc-900 border-l border-black/[0.06] dark:border-white/[0.08] shadow-2xl"`.
   - Motion uses fluid spring deceleration: `ease-[cubic-bezier(0.16,1,0.3,1)] duration-300`.

2. **Header & Circular Identity Tile**:
   - The entity avatar or identity icon is anchored in the top-left of the header using continuous circular framing: `size-12 rounded-full border border-black/10 dark:border-white/10 shadow-2xs flex items-center justify-center font-bold shrink-0 overflow-hidden`.
   - Badges in the header are **strictly borderless and text-only** (`BADGE_BASE`: `rounded-full px-2.5 py-0.5 text-[11px] font-semibold select-none border-0`, no border line color, no indicator dots, no icons).
   - Dismissal close icon button (`XIcon`) is anchored at `top-4 right-4` with circular hover feedback: `size-7 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] active:scale-95`.

3. **Summary Strip & Specification Rows**:
   - Primary metadata is grouped in an elevated summary card: `rounded-xl bg-gray-50/70 dark:bg-zinc-850/50 border border-black/[0.04] dark:border-white/[0.06] p-4`.
   - Specification rows (e.g. document types, office attachments, SLA status) use compact circular marker tiles (`w-7 h-7 rounded-full` or `w-8 h-8 rounded-full`).

4. **Space-Between Footer (`justify-between`)**:
   - The base primitive `SheetFooter` in [`sheet.jsx`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/ui/sheet.jsx) defaults to `className="mt-auto flex flex-row items-center justify-between gap-2.5 p-4"`.
   - Individual sheet footers use: `className="shrink-0 p-4 px-6 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-row items-center justify-between bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md"`.
   - **Left-Side Dismissal**: The **Close / Cancel** button is always pinned to the **left side** (`variant="outline" className="h-10 px-5"`).
   - **Right-Side Primary Action & Action Group**: The **Primary Action Button** (or secondary outline actions + primary button) is pinned to the **right side** inside `<div className="flex items-center gap-2.5">`.

### 10.2 Sheet Footer Code Blueprint
```jsx
<SheetFooter className="shrink-0 p-4 px-6 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-row items-center justify-between bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
  {/* Left: Dismissive Close / Cancel Button */}
  <Button
    type="button"
    variant="outline"
    onClick={handleClose}
    className="h-10 px-5"
  >
    Close
  </Button>

  {/* Right: Primary Action or Group */}
  <div className="flex items-center gap-2.5">
    {hasSecondaryAction && (
      <Button
        type="button"
        variant="outline"
        onClick={handleSecondary}
        className="h-10 px-4"
      >
        Secondary Action
      </Button>
    )}
    <Button
      type="button"
      onClick={handlePrimary}
      className="h-10 px-5"
    >
      Primary Action
    </Button>
  </div>
</SheetFooter>
```

---

## 11. Modal & Dialog Architecture (`Dialog`)

Modal windows in the application implement Apple macOS dialog aesthetics—floating centered glass sheets with refined specular highlights, soft layered shadows, and high-legibility typographic hierarchies:

```
┌─────────────────────────────────────────────────────────────┐
│ DialogOverlay (fixed inset-0 bg-black/40 backdrop-blur-sm)  │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ DialogContent (rounded-[22px] bg-white/95 blur-2xl) │   │
│   │                                                     │   │
│   │ [Header Icon] (size-12 rounded-full border)     [X] │   │
│   │ Title (text-[16px] font-bold text-gray-900)         │   │
│   │ Description (text-[13px] text-gray-500)             │   │
│   ├─────────────────────────────────────────────────────┤   │
│   │ Dialog Body / Interactive Form                      │   │
│   │ (Inputs, Selects, PIN Code boxes, Warning Banners)  │   │
│   ├─────────────────────────────────────────────────────┤   │
│   │ DialogFooter (flex items-center justify-end gap-2.5)│   │
│   │ [Cancel (variant="outline")]   [Confirm / Submit]   │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 11.1 Window Surface & Material Specifications
- **Backdrop Overlay (`DialogOverlay`)**: `fixed inset-0 isolate z-[70] bg-black/40 backdrop-blur-sm transition-opacity duration-200 ease-out`.
- **Window Geometry (`DialogContent`)**:
  - Border radius: `rounded-[22px]` (continuous Apple squircle).
  - Material: `bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl`.
  - Border: `border border-black/[0.08] dark:border-white/10`.
  - Specular Highlight & Depth: `shadow-[0_24px_54px_rgba(0,0,0,0.18),inset_0_1px_0_0_rgba(255,255,255,0.85)] dark:shadow-[0_28px_64px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.12)]`.
  - Motion: `data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.96] data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.96] duration-200 ease-out`.

### 11.2 Standard Button Order in Dialog Footers
In accordance with Apple macOS dialog conventions:
- **Dismissive Action (`Cancel` / `Close`)**: Rendered on the left side of the action pair using `variant="outline"`.
- **Affirmative Action (`Register ...`, `Save ...`, `Confirm ...`)**: Rendered on the right side using standard solid `<Button>`.
- **Destructive Action (`Delete ...`, `Archive ...`)**: Rendered on the right side using `variant="danger"`.
- **Button Naming**: Standard `[Action Verb] + [Specific Noun]` policy (e.g. `Register Personnel`, `Archive Department`, `Save Question`), never bare ambiguous words like `Save` or `Submit`. Dismissals use clean single words: `Cancel` or `Close`.

### 11.3 Security Authorization PIN Code Architecture
For high-privilege operations (such as resetting databases, purging audit logs, or restoring system backups), modals integrate a 4-box PIN code verification:
- **Boxes**: 4 individual input boxes (`h-12 w-12 rounded-xl border border-black/10 dark:border-white/15 text-center text-lg font-bold font-mono`).
- **Interaction Logic**:
  - **Full & Partial Paste**: Pasting a 4-digit code into *any* box automatically strips non-numeric characters and distributes the digits sequentially across all boxes.
  - **Character Replacement**: Typing a new number into an already filled box immediately replaces its contents without requiring manual backspace.
  - **Backspace Shifting**: Backspacing on an empty box smoothly clears the previous box and shifts keyboard focus backward.
  - **Exact Match Submission**: The primary action button remains disabled until all 4 digits strictly match the authorized verification challenge.

### 11.4 System & Account Settings Dialog Architecture (`AccountSettingsPanel`)
The user account and preferences dialog ([`AccountSettingsPanel.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/shared/AccountSettingsPanel.js)) adheres to Apple macOS System Settings architecture:
```
┌────────────────────────────────────────────────────────────────────────┐
│ Settings Dialog Header (px-6 py-4 border-b border-black/[0.06])        │
│ "Account & Preferences"                             [Close (ESC)] [X]  │
├──────────────────────────┬─────────────────────────────────────────────┤
│ Inner Navigation Sidebar │ Settings Tab Content Area (p-6)             │
│ (w-60 border-r p-3)      │ • Profile: 4x1 Bento Card + Cover Themes    │
│ • Profile                │ • Two-Factor Auth: Setup & Recovery Codes   │
│ • Security & Password    │ • Accessibility: Zoom, Contrast, Motion     │
│ • Two-Factor Auth        │ • Sound: Synthesized Web Audio Toggles      │
│ • Accessibility          │ • Preferences: Default Home View            │
│ • Sound                  │ • Security Questions: Key-Recovery Pairs    │
│ • Preferences            │                                             │
└──────────────────────────┴─────────────────────────────────────────────┘
```
1. **Inner Sidebar Alignment Parity**:
   The inner settings sidebar mirrors the primary application sidebar (`Sidebar.js`):
   - **Icon Center Axis (23px)**: All category icons are centered in a `w-[38px] h-[38px]` container with `px-1` padding.
   - **Text Start Axis (48px)**: Category labels start at 48px from the container's inner edge.
   - **Apple Elevated Pill Highlight**: Active tabs render with `bg-pup-maroon text-white dark:bg-zinc-800` (or theme-aware brand accent) and smooth tactile hover states. The active item explicitly renders pure white labels and icons (`text-white`) with full 100% opacity.
2. **Dedicated Two-Factor Auth Decoupling**:
   Two-factor authentication (TOTP authenticator app pairing, QR codes, verification codes, and emergency backup codes) is decoupled into its own dedicated **Two-Factor Auth** sidebar tab, preventing dense scrolling collisions inside the Password/Security view.
3. **Dedicated Accessibility Panel**:
   Accommodations are separated from general preferences into an **Accessibility** tab:
   - **Interface Zoom**: Stepped typography and UI scaling (`100%`, `110%`, `120%`, `130%`).
   - **Visual Contrast**: High-contrast outline tokens.
   - **Motion Reduction**: Disables spring translations and heavy animations.
4. **Bento Profile Header & Curated Cover Wallpapers**:
   - The user profile incorporates a 4x1 Bento card with direct photo/avatar configuration and editable institutional contact links.
   - **Wallpapers (`APPLE_WALLPAPER_PRESETS`)**: Offers 8 curated institutional themes (e.g., *Campus Crimson*, *Midnight Scholar*, *Archival Gold*, *PUP Maroon*, *Deep Slate*) with subtle hover activation.
   - **In-Situ Avatar Picker**: Allows uploading custom photos, choosing macOS deterministic initials, or selecting a clean default "no avatar" placeholder.

---

## 12. Switch & Toggle Architecture (`Switch`)

Settings toggles throughout the application use the custom Apple iOS/macOS physical switch primitive implemented in [`switch.jsx`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/ui/switch.jsx) powered by `@base-ui/react/switch`:

```
Inactive (Off):                    Active (On - Apple Green):
┌──────────────┐                   ┌──────────────┐
│  ○           │                   │           ●  │
└──────────────┘                   └──────────────┘
Track: #E9E9EA (inset shadow)      Track: #34C759 (Apple Green)
Thumb: Pure White (specular edge)  Thumb: Pure White (right translated)
```

### 12.1 Visual & Structural Specifications
1. **Dimensions**:
   - **Standard Size (`size="default"`)**: Track is `h-6 w-11` (44×24px), Thumb is `size-5` (20px), translating `translate-x-5` on check.
   - **Compact Size (`size="sm"`)**: Track is `h-5 w-9` (36×20px), Thumb is `size-4` (16px), translating `translate-x-4` on check.

2. **Track Materials & Inset Depth**:
   - **Unchecked Track**: iOS system gray `bg-[#E9E9EA] dark:bg-[#39393D]` with subtle inset depth `shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)]`.
   - **Checked Track (Apple Variant)**: System green `data-[checked]:bg-[#34C759] dark:data-[checked]:bg-[#30D158]`.
   - **Micro-Border**: Translucent boundary `border border-black/[0.06] dark:border-white/[0.08]`.
   - **Fluid Motion**: `transition-all duration-200 ease-out active:scale-[0.96]`.

3. **Thumb Physical Lighting & Multi-Layer Shadow**:
   - Thumb uses pure white surface (`bg-white`) with Apple specular highlight and soft diffuse cast:
     ```css
     shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.9),0_2px_4px_rgba(0,0,0,0.18),0_1px_1px_rgba(0,0,0,0.1),0_3px_8px_rgba(0,0,0,0.12)]
     ```
   - Transition curve uses fluid Apple spring easing: `ease-[cubic-bezier(0.16,1,0.3,1)] duration-250`.

4. **Accessibility Contract**:
   - Must always be accompanied by an associated `<Label>` (or explicit `aria-label`).
   - Retains native keyboard focus ring: `focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#34C759]/40`.
   - Never replace with raw hidden checkboxes or unstyled HTML inputs.

---

## 13. Global Command Palette Architecture (`CommandPalette`)

The global spotlight search and execution dialog ([`CommandPalette.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/shared/CommandPalette.js)) is accessible from any view via the keyboard shortcut **`⌘K` / `Ctrl+K`** or by clicking the header search input. It implements macOS Spotlight and Alfred ergonomics with a dual-pane responsive layout:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Top Search Bar (px-4 py-3.5, border-b border-black/[0.06])             │
│ [Search01Icon] "Type a command, search students, staff..."  [ESC badge]│
├────────────────────────────────────────────────────────────────────────┤
│ Scope Filter Chiclet Tabs (px-4 py-2 border-b border-black/[0.06])     │
│ [All] [Navigation] [Departments] [Personnel] [Actions] [System]        │
├──────────────────────────────────────────┬─────────────────────────────┤
│ Left Column: Filtered Results List       │ Right Column: Inspector     │
│ • Section Headers (uppercase, text-[11px]│ • Circular Avatar / Icon    │
│ • Result Rows (h-11, rounded-xl)         │ • Entity Title & Metadata   │
│   - Icon / Student Initials Avatar       │ • Badges (text-only)        │
│   - Title + Subtitle                     │ • Primary: [Open Record]    │
│   - Scope Badge + Trailing Hint          │ • Secondary: [Copy ID]      │
├──────────────────────────────────────────┴─────────────────────────────┤
│ Footer Status Bar (px-4 py-2.5, text-[11px] text-gray-500)             │
│ [↑↓ navigate]  [↵ select]  [Tab scope]  [ESC dismiss]  [⌘B sidebar]    │
└────────────────────────────────────────────────────────────────────────┘
```

### 13.1 Capabilities & Scoping
- **Unified Spotlight Indexing**:
  - **Navigation**: Instant deep links across all main sections (SuperAdmin, Registrar, OSAS, Staff, My Account).
  - **Actions**: Trigger instant actions like creating backups, exporting audit logs, toggling high-contrast mode, or launching modals.
  - **Departments**: Direct jump to department inspection sheets and scanner configurations.
  - **Personnel**: Search staff members by name, employee ID, section, or email.
  - **Documents & Students**: Instant querying of student records, verified files, and document requests.
  - **System Settings**: Jump to storage layout, institutional branding, service standards, and security questions.
- **Tab Scope Cycler**: Pressing the **`Tab` (`⇥`)** key cycles through active scopes (`All`, `Navigation`, `Departments`, `Personnel`, `Actions`, `System`). `Shift+Tab` cycles backward.
- **Recent Items LocalStorage Persistence**: Recently chosen commands and search terms are persisted locally and surfaced at the top of the default state.

### 13.2 Inspector Preview Panel (Two-Pane Desktop Architecture)
On screens `md` and above, the dialog splits into a 2-pane macOS Finder/Spotlight layout:
- **Left Pane (`flex-1`)**: Scrollable search suggestions and categorized results.
- **Right Pane (`w-[360px] lg:w-[390px] border-l border-black/[0.06] bg-black/[0.015] dark:bg-white/[0.01]`)**:
  - Renders a live inspector preview of whichever item currently has keyboard focus (`focusedItem`).
  - Displays the student's circular [`ProfileAvatar`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/shared/ProfileAvatar.jsx) or the entity's circular icon container (`rounded-full`).
  - Shows metadata breakdown (e.g. course, year level, section, storage drawer location, submission date, status).
  - Quick action buttons at the bottom of the inspector:
    - Primary Action: `Open Student Record` / `Navigate to View`.
    - Secondary Action: `Copy Student No` / `Copy Identifier` (using the ultra-subtle secondary button standard).

---

## 14. Avatar & Contact Card Architecture (`ProfileAvatar`)

Avatars across the application ([`ProfileAvatar.jsx`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/shared/ProfileAvatar.jsx) and [`avatar.jsx`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/ui/avatar.jsx)) implement the Apple macOS Contacts and Messages visual system:

```
┌─────────────────────────────────────────────────────────────┐
│ ProfileAvatar Geometry: Strictly rounded-full                │
│                                                             │
│ Verified Photo Mode:         Deterministic Initials Mode:   │
│ ┌───────────────┐            ┌───────────────┐              │
│ │   Photo Img   │            │      CA       │              │
│ │ (object-cover)│            │(Mac Vibrant)  │              │
│ └───────────────┘            └───────────────┘              │
│ Continuous Border            8-Palette Apple Gradient       │
│ border-black/10              White Bold Text + Drop Shadow  │
└─────────────────────────────────────────────────────────────┘
```

### 14.1 Geometric & Frame Specifications
- **Strictly Circular (`rounded-full`)**: In compliance with Section 14, all avatars use continuous circular framing. Never use squircle or rectangular containers for user or student identity.
- **Border & Shadow**: Every avatar carries a subtle micro-border (`border border-black/10 dark:border-white/10`) and elevation (`shadow-2xs`) to ensure clear edge definition against white or dark surfaces.

### 14.2 Deterministic 8-Palette macOS Vibrant Themes
When a user does not have a photo uploaded, `ProfileAvatar` uses deterministic string hashing on their name or ID (`getMacTheme(seed)`) to assign one of 8 Apple system gradients:

| Index | Theme Name | Gradient Stops | Apple Association |
|---|---|---|---|
| **0** | **Blue** | `from-blue-400 via-blue-500 to-blue-600` | Apple Mail / Contacts |
| **1** | **Purple** | `from-purple-400 via-purple-500 to-purple-600` | Apple Contacts |
| **2** | **Emerald** | `from-emerald-400 via-emerald-500 to-teal-600` | Apple FaceTime |
| **3** | **Amber** | `from-amber-400 via-orange-500 to-orange-600` | Apple Notes |
| **4** | **Rose** | `from-rose-400 via-rose-500 to-pink-600` | Apple Music |
| **5** | **Indigo** | `from-indigo-400 via-indigo-500 to-indigo-700` | Apple Podcasts |
| **6** | **Teal** | `from-cyan-400 via-teal-500 to-teal-600` | Apple Messages |
| **7** | **Ruby / Maroon** | `from-red-500 via-rose-700 to-pup-darkMaroon` | PUP Institutional |

- **Typography in Fallback**: Clean uppercase 2-letter initials (`getInitials(name)`) in crisp white text with a soft drop shadow: `text-white font-semibold drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]`.

### 14.3 Size Standardization
- **Table Row Avatar**: `size-8` (`32×32px`, `text-xs`)
- **Header Profile Avatar**: `size-9` (`36×36px`, `text-[13px]`)
- **Inspector & Sheet Avatar**: `size-12` (`48×48px`, `text-sm font-bold`)
- **Profile Page Hero Avatar**: `size-20` (`80×80px`, `text-2xl font-bold`)

---

## 15. Sidebar Layout, Column Axis Alignment & Minimalist Collapse (`Sidebar`)

To maintain visual harmony and eliminate erratic horizontal offsets across the left navigation sidebar ([`Sidebar.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/shared/Sidebar.js) and [`DashboardShellSkeleton.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/shared/DashboardShellSkeleton.js)):

### 15.1 Icon Column Horizontal Center Axis (23px)
All sidebar rows share a continuous vertical alignment axis:
- **Logo Row**: The eManage logo icon is enclosed in a `w-[38px] h-[38px] flex items-center justify-center shrink-0` slot inside the `px-1` header container.
- **Command Palette Trigger**: The spotlight trigger search icon is enclosed in a `w-[38px] h-[38px] flex items-center justify-center shrink-0` slot inside the `pl-1 pr-2.5` trigger button (`h-[38px]`).
- **Navigation Items & Accordion Headers**: Top-level navigation items and accordion headers render their icons in a `w-[38px] h-[38px] flex items-center justify-center shrink-0` slot with `px-1` container padding.
- **Profile Avatar**: The user avatar at the pinned bottom row is centered within a `w-[38px] h-9 flex items-center justify-center shrink-0` slot with `px-1 py-1.5` container padding.
- **Center Coordinate**: In all rows, the icon container is placed 4px (`px-1` or `pl-1`) from the sidebar's inner edge, centering every icon at exactly **23px** (`4px + 19px`).

### 15.2 Text Label Starting Axis (48px)
All text labels across the sidebar begin at the exact same horizontal coordinate:
- Following the 38px icon container, text spans ("eManage", "Search views, records...", navigation item labels, and user display name) use `ml-1.5` (6px margin).
- Every label begins at exactly **48px** (`4px + 38px + 6px`), creating a clean, flush vertical text margin down the entire sidebar.

### 15.3 Minimalist Sidebar Collapse/Expand Icon (`LayoutLeftIcon`)
- **Expanded Collapse Button**: Uses [`LayoutLeftIcon`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/shared/Sidebar.js) (`size={18}`) from `hugeicons-react` instead of cluttered icons with interior arrows and dashes (`SidebarLeft01Icon`).
- **Collapsed Expand Hover**: Uses [`LayoutLeftIcon`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/shared/Sidebar.js) (`size={18}`) to present a crisp, minimalist Apple HIG `sidebar.leading` aesthetic across all states.

### 15.4 Pinned Bottom User Card
The footer of the sidebar pins the authenticated user profile card:
- Displays user's [`ProfileAvatar`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/shared/ProfileAvatar.jsx) with deterministic macOS fallback.
- Displays full user name (`text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate`).
- Displays institutional role pill badge (strictly text-only).
- Includes rapid logout and account settings access triggers.

---

## 16. Floating Action Bar (`FloatingActionBar`)

When multi-row selection is active (`selectedCount > 0` on selectable tables such as [`GlobalStaffTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/GlobalStaffTab.js) or [`OfficeManagementTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/OfficeManagementTab.js)), the [`FloatingActionBar`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/shared/FloatingActionBar.js) appears as a portal-mounted, Apple-style floating dock at the bottom-center of the screen.

### 16.1 Visual & Structural Specifications
- **Dock Placement**: `fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in fade-in-0 slide-in-from-bottom-4 duration-200`
- **Surface Material**: `rounded-2xl border border-black/[0.08] dark:border-white/[0.12] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl py-2 px-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-none select-none`
- **Left Zone (Selection Count Pill & Label)**:
  - Counter Token Pill: `<span className="inline-flex h-5.5 min-w-5.5 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800 px-1.5 text-xs font-semibold tabular-nums text-gray-800 dark:text-zinc-200 border border-gray-200/60 dark:border-white/10">{count}</span>`
  - Entity Label: `text-xs font-medium text-gray-800 dark:text-zinc-100 whitespace-nowrap` formatted via `formatEntityLabel(count, entityName)` (e.g., `"2 personnel selected"`, `"1 department selected"`).
- **Hairline Vertical Divider**: `<div className="w-[1px] bg-black/10 dark:bg-white/10 h-4.5 shrink-0" aria-hidden="true" />`
- **Right Zone (Batch Actions)**:
  - **Secondary Actions (`secondaryActions`)**: Compact utility buttons rendered as `variant="outline"` (`h-8.5 px-3 text-xs font-medium rounded-xl`), e.g., `Copy Emails`, `Export Selected`. Text-only, no leading icons.
  - **Primary Action (`primaryAction`)**: Prominent semantic button (`h-8.5 px-4 text-xs font-semibold rounded-xl`), rendered with `variant="danger"` (e.g., `Archive Personnel`), `variant="success"` (e.g., `Restore Personnel`), or default brand. Text-only, no leading icons.
  - **Overflow Actions (`overflowActions`)**: Additional tertiary operations grouped under an Apple-style `[...]` (`MoreHorizontalIcon`) dropdown menu.
  - **Deselect All (`Deselect`)**: Anchored at the far right with a round keyboard shortcut badge:
    ```jsx
    <Button variant="outline" size="sm" onClick={handleCancel} className="flex h-8.5 items-center gap-1.5 rounded-xl px-2.5 ...">
      <span>Deselect</span>
      <kbd className="hidden sm:inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-700 px-1.5 py-0.5 text-[9.5px] font-sans font-semibold text-gray-400 dark:text-zinc-400 border border-gray-200/80 dark:border-white/5 leading-none">
        esc
      </kbd>
    </Button>
    ```
- **Keyboard Dismissal**: Automatically listens for the `Escape` key (`keydown`) to clear selection.

---

## 17. Round Keyboard Shortcut Badges (`<kbd>` Keycaps)

Keyboard shortcuts across the app are rendered with physical Apple-inspired keycap styling rather than generic text.

### 17.1 Keycap Design Foundations
- **Typography**: Clean `font-sans tabular-nums text-[9px]`, `text-[9.5px]`, or `text-[10px]` with `font-semibold` or `font-bold` and `leading-none`.
- **Interactivity & Selection**: Always set `select-none` to prevent accidental text highlighting when selecting surrounding labels.
- **Border & Shadow**: Subtle border (`border-black/10 dark:border-white/10` or `border-gray-200/80 dark:border-zinc-700`) paired with micro-depth (`shadow-2xs`).
- **Theme-Aware Background**: `bg-black/[0.04] dark:bg-white/[0.08]` or solid surface `bg-white dark:bg-zinc-800`.

### 17.2 Round Keycap Badge (`rounded-full`)
Used for inline dismissal tokens, button trailing hints, and compact tag elements:
```jsx
<kbd className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-700 px-1.5 py-0.5 text-[9.5px] font-sans font-semibold text-gray-400 dark:text-zinc-400 border border-gray-200/80 dark:border-white/5 leading-none select-none">
  esc
</kbd>
```

### 17.3 Standard Squircle Keycap Badge (`rounded-md` / `rounded`)
Used in command palettes, header search triggers, and modal navigation footers:
```jsx
<kbd className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-[9px] font-sans font-semibold tabular-nums shadow-2xs select-none">
  ⌘K
</kbd>
```

---

## 18. Circular Entity Icon Containers (`rounded-full`)

To clearly distinguish entity identity tiles, departmental markers, and informational banners from actionable square/squircle UI controls (like buttons, text inputs, and cards), all entity and organizational icon containers adopt continuous circular framing (`rounded-full`).

### 18.1 Department & Office Table / Card Icons
- **Table Department Column**: `h-8 w-8 rounded-full` with subtle tinted background and micro-border matching the office accent color (`color-mix(in srgb, ${accent} 12%, transparent)`).
- **Department Grid Cards**: `h-11 w-11 rounded-full` with high-contrast accent icon and micro-border.
- **Add Department Action Card**: `h-12 w-12 rounded-full bg-gray-100 dark:bg-zinc-800` for dashed creation cards.

### 18.2 Slide-Over Sheet Summary Headers
In detail slide-over sheets, the primary identity or entity avatar in the summary strip is rendered with a circular frame:
- **Sheet Identity Tile**: `size-11` or `w-12 h-12 rounded-full flex items-center justify-center font-bold border shadow-2xs`.
- **Document / Record Specification Items**: Inner document or category icons within list rows (e.g., document types, verified attachments) use `w-6 h-6 rounded-full`, `w-7 h-7 rounded-full`, or `w-8 h-8 rounded-full`.

### 18.3 Informational Banners & Persona Switchers
- **Public Login Demo Accounts Banner**: The toggle strip icon in system administration (`ModuleConfigTab`) uses `h-10 w-10 rounded-full`.
- **Campus Operations Institutional Banner**: Turnaround SLA charter icon in `CampusOperationsTab` uses `h-10 w-10 rounded-full`.
- **Public Login Demo Personas**: In the login demo popover, each persona row uses `w-8 h-8 rounded-full border ${acc.accent}` for its role icon avatar.

### 18.4 Superadmin Feature Tiles, Badges & Skeletons
- **Service Standards Tier Milestones**: Simple (`emerald`), complex (`amber`), and technical (`purple`) tier milestone tiles use `h-8 w-8 rounded-full` in `ServiceStandardsTab` and matching `ServiceStandardsSkeleton`.
- **Security Question Index Badges**: Question index numbers use `w-6 h-6 rounded-full` in `SecurityQuestionsTab`, `SecurityQuestionsSkeleton`, and `BulkImportQuestionsModal`.
- **Feature Cards & Matrix Row Icons**: Module feature tiles use `h-8 w-8 rounded-full` and matrix feature row icons use `h-7 w-7 rounded-full` in `ModuleConfigTab` and `ModuleConfigSkeleton`.
- **Institutional Seal Previews**: Primary and secondary official seal upload preview frames use `w-14 h-14 rounded-full` in `InstitutionalBrandingTab`.
- **Landing Page CMS Indexes & Section Tiles**: Bento accordion headers, workflow step numbers, catalog numbers, and FAQ question badges use `rounded-full` across all CMS views.

---

## 19. Interface Sound Effects & Stepped Capsule Slider Architecture

Synthesized interface audio feedback ([`soundPatch.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/lib/soundPatch.js), [`soundPreferences.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/lib/soundPreferences.js), [`SoundEffects.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/shared/SoundEffects.js)) and the **Sound** tab inside [`AccountSettingsPanel.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/shared/AccountSettingsPanel.js) follow Kobra's synthesized Web Audio design and macOS System Settings ergonomics.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Sound & Audio Feedback                                      [Active]   │
├────────────────────────────────────────────────────────────────────────┤
│ MASTER OUTPUT                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Play User Interface Sound Effects [Web Audio Synth]          ( ● ) │ │
│ ├────────────────────────────────────────────────────────────────────┤ │
│ │ Interface Volume        ┌─────────────┃─────────────┐  50%   [ ↺ ] │ │
│ │                         │  |  |  |  | ┃  |  |  |  | │              │ │
│ │                         └─────────────┃─────────────┘              │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ SOUND CATEGORIES                                      [Active: 6 of 6] │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Clicks & Navigation                          [Preview Sound] ( ● ) │ │
│ ├────────────────────────────────────────────────────────────────────┤ │
│ │ Switches & Toggles                           [Preview Sound] ( ● ) │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### 19.1 Behavioral & Scoping Standards
1. **Default Off (Opt-In)**: `sound_enabled` defaults to `false` across all accounts so shared registrar and OSAS service counters remain silent until a user explicitly opts in.
2. **Authenticated Portal Scope Only**: `<SoundEffects />` activates strictly on authenticated portal routes (`/admin`, `/staff`, `/systemadmin`, `/student`, `/account`) and never on the public landing page (`/`) or sign-in flow (`/login`, `/forgot-password`). Sounds immediately stop upon sign-out.
3. **Independent of Reduce Motion**: Synthesized audio uses `definePatch` + `setMasterVolume` from `@web-kits/audio` directly so users who enable **Reduce Motion** still receive acoustic confirmation if they enable interface sounds.
4. **6 Canonical Categories**:
   - **Clicks & Navigation (`presses`)**: `tap`, `select`, `command`, `chirp`
   - **Switches & Toggles (`toggles`)**: `toggleOn`, `toggleOff`
   - **Panels, Sheets & Menus (`surfaces`)**: `open`, `close`, `swoosh`
   - **Sliders & Value Stepper (`values`)**: `tick`, `sliderTick`, `key`
   - **Action Outcomes & Toasts (`outcomes`)**: `success`, `error`, `warning`, `destructive`, `blocked`, `copy`
   - **Live Notifications (`notifications`)**: `notification` (skips initial unread backlog on page load and coalesces bursts to at most 1 chime every 4 seconds)
5. **Element Classification (`data-slot`, `data-variant`, `data-sound`)**:
   - Delegated listeners classify interactive elements automatically via `data-slot` (`button`, `switch`, `*-trigger`, `*-close`, `*-item`, `slider-track`) and `data-variant` (`destructive`/`danger`).
   - Individual controls can opt into a named cue via `data-sound="copy"` / `"swoosh"` / `"command"` / `"chirp"` or silence themselves via `data-sound="none"`.
6. **Dual-Layer Persistence (Staff & Student)**:
   - Saved instantaneously to `localStorage` (`pup_sound_enabled_<uid>`, `pup_sound_volume_<uid>`, `pup_sound_categories_<uid>`) and reconciled with `staff.preferences` and `student_accounts.preferences` (`JSONB`) via `/api/auth/preferences` and [`AccessibilitySync.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/shared/AccessibilitySync.js).

### 19.2 Light-Mode Stepped Capsule Slider & Reset-to-Default Control
Range sliders in settings (such as **Interface Volume**) use the custom stepped capsule track with an inline percentage readout and a **Back to Default** (`ReloadIcon`) reset button:

- **Track Container (`data-slot="slider-track"`)**:
  `relative h-8 w-full sm:w-60 rounded-lg bg-gray-100 dark:bg-zinc-900 border border-black/[0.08] dark:border-white/[0.1] overflow-hidden flex items-center select-none shadow-2xs`
- **Active Fill Layer**:
  `absolute inset-y-0 left-0 bg-gray-200/90 dark:bg-zinc-700/85 pointer-events-none transition-[width] duration-75 ease-out`
- **Internal Step Ticks (9 ticks at 10%–90%)**:
  Evenly distributed `w-[1.5px] h-1.5 rounded-full` markers (`bg-gray-500/70` within the filled region, `bg-gray-400/45` in the unfilled region).
- **Vertical Bar Indicator**:
  `absolute top-1.5 bottom-1.5 w-[2.5px] rounded-full bg-gray-900 dark:bg-zinc-100 shadow-2xs pointer-events-none z-20 -translate-x-1/2 transition-[left] duration-75 ease-out` clamped inside the track (`clamp(5px, ${pct}%, calc(100% - 5px))`).
- **Trailing Tabular Readout & Reset Icon Button**:
  - Percentage label: `text-xs font-semibold tabular-nums text-gray-700 dark:text-zinc-300 w-10 text-right select-none shrink-0`
  - Back to Default button: `size-7 rounded-lg` icon-only button rendering `<ReloadIcon size={14} aria-hidden="true" />`. Disabled (`opacity-50 cursor-default`) when already at the default value (`50%`).

### 19.3 Strict Badge & Button Compliance in Sound Settings
- **Header Status Pill**: Strictly text-only (`Active` or `Muted`), with no leading speaker icons.
- **Section Counter Pill**: Strictly text-only (`Active: 6 of 6`) matching the Accessibility tab counters.
- **Category Action Buttons**: Strictly text-only outlined `<Button variant="outline" size="sm" data-sound="none">` labeled `Preview Sound` (no leading play icon).

---

## 20. Apple Toast Notification Motion & Stacking Architecture

All toast notifications across the application (via [`sonner.jsx`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/ui/sonner.jsx), [`globals.css`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/globals.css), and [`motion.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/lib/motion.js)) adhere strictly to Apple iOS notification banner and Dynamic Island physical spring principles.

### 20.1 Motion Physics & Timing
1. **Drop-and-Settle Fluid Spring Entrance**:
   - Notifications originate from the top viewport edge (Dynamic Island capsule origin) using a 4-phase critically damped physical spring curve:
     ```css
     @keyframes apple-toast-slide-down {
       0%   { transform: translate3d(0, -32px, 0) scale(0.90); opacity: 0; }
       60%  { transform: translate3d(0, 3px, 0) scale(1.018);  opacity: 1; }
       82%  { transform: translate3d(0, -1px, 0) scale(0.996); opacity: 1; }
       100% { transform: translate3d(0, 0, 0) scale(1);        opacity: 1; }
     }
     ```
   - **Timing**: `360ms` with `cubic-bezier(0.16, 1, 0.3, 1)` (or `SPRING_TOAST` spring token: `stiffness: 380`, `damping: 28`, `mass: 0.8`).
   - The slight 1.8% scale overshoot and 3px momentum dip simulate real physical mass and restitution before settling gracefully at rest.

2. **Swift Upward Retraction Exit**:
   - Notifications dismiss back along their entry path toward the top bezel:
     ```css
     @keyframes apple-toast-slide-up {
       0%   { transform: translate3d(0, 0, 0) scale(1);        opacity: 1; }
       100% { transform: translate3d(0, -28px, 0) scale(0.88); opacity: 0; }
     }
     ```
   - **Timing**: `200ms` with `cubic-bezier(0.4, 0, 0.2, 1)`. Swift, decisive, and symmetric to the entrance trajectory.

### 20.2 Direct Manipulation Gesture (Swipe-to-Dismiss)
- Individual toasts implement Pointer Event tracking with `setPointerCapture`:
  - **Upward Drag**: Direct 1:1 tracking with the user's cursor or finger.
  - **Downward Drag**: Apple rubber-band resistance formula (`delta * 0.22`) prevents unnatural stretching.
  - **Flick / Threshold Release**: If dragged upward by `> 22px` on release, the toast dismisses immediately. If released before threshold, it springs back to rest in `260ms` (`cubic-bezier(0.16, 1, 0.3, 1)`).
  - Clicks on internal interactive elements (`<button>`, `<a>`) bypass drag detection to execute cleanly without delay.

### 20.3 Stacking Hierarchy & Hover Expansion
- **Top Center Anchor**: The stack container enforces `transformOrigin: "top center"` so scaled items anchor to the top edge rather than detaching from the stack.
- **Stacked Mode (Idle)**:
  - **Active Toast (`index 0`)**: `scale(1.0)`, `translateY(0)`, full brightness, specular glass highlight.
  - **Second Toast (`index 1`)**: `scale(0.94)`, `translateY(10px)`, `brightness(0.95)`, peek beneath.
  - **Third Toast (`index 2`)**: `scale(0.88)`, `translateY(20px)`, `brightness(0.90)`.
  - Max visible stacked limit is 3; older items are tucked away.
- **Expanded Mode (Hover)**:
  - Moving the cursor over the toast stack pauses auto-dismiss timers and cascades the cards downward into a spaced list (`translateY = index * 58px`).
  - Every card expands to `scale(1.0)`, `opacity(1.0)`, and `filter: none`.
  - A 400×320px invisible hover bridge prevents jitter when moving between separated toasts.
  - Cascade transition: `duration-380 ease-[cubic-bezier(0.16,1,0.3,1)]`.

### 20.4 Tactile Feedback & Accessibility
- **Press State**: Toast body applies `active:scale-[0.98]` with `100ms ease-out` recovery. Action and close buttons apply `active:scale-95` / `active:scale-90`.
- **Reduced Motion**: Both system `@media (prefers-reduced-motion: reduce)` and the in-app `.reduce-motion` toggle suppress translation and scale bounces, falling back to clean `150ms` opacity crossfades.

---

## 21. Standardized Input, Textarea & Search Field Institutional Focus Ring

To eliminate jarring visual discrepancies where modal text inputs showed thick 2px black focus borders, textareas showed faint grayish borders, and search inputs showed browser outlines, all interactive text input controls across the entire platform use a single, unified 1px institutional focus state.

```
Unfocused State:                   Focused State (1px Maroon Ring):
┌──────────────────────────────┐   ┌──────────────────────────────┐
│ Enter department name...     │   │ Enter department name...     │
└──────────────────────────────┘   └──────────────────────────────┘
Border: border-border              Border: border-pup-maroon
                                   Ring:   ring-1 ring-pup-maroon
```

### 21.1 Unified Focus Utility Classes
Every `<Input>`, `<Textarea>`, `<DashboardSearch>`, and custom form control across pages, sheets, and dialogs must share this exact focus definition:

```css
focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon
focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon
dark:focus:border-red-500/80 dark:focus:ring-red-500/80
dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80
transition-all
```

### 21.2 Rules & Implementation Contract
1. **1px Subtle Focus Boundary**: Always combine `focus:border-pup-maroon` with `focus:ring-1 focus:ring-pup-maroon`. Never use `ring-2`, `ring-offset-2`, or thick 2px/3px borders that expand control geometry or crowd neighboring labels.
2. **Eliminate Browser & Default Outlines**: Always include `focus:outline-none focus-visible:outline-none` so native Chromium/WebKit black rectangles or blue focus outlines never bleed through.
3. **Synchronize Mouse and Keyboard States**: Explicitly define both `focus:*` and `focus-visible:*` variants. Whether a user clicks into a field with a mouse or tabs into it via the keyboard, the focus presentation must remain completely identical.
4. **Dark Mode Crimson Balance**: Light mode uses official brand maroon (`#800000` via `focus:border-pup-maroon focus:ring-pup-maroon`). Dark mode balances this with high-contrast translucent crimson (`dark:focus:border-red-500/80 dark:focus:ring-red-500/80`) to ensure crisp edge legibility against dark zinc surfaces without fluorescent bloom.
5. **Applies Universally Across**:
   - Shared primitives: [`input.jsx`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/ui/input.jsx) and [`textarea.jsx`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/ui/textarea.jsx).
   - Search components: [`DashboardSearch.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/DashboardSearch.js).
   - Form inputs and textareas in all settings, CMS editors, filter popovers, registration dialogs, and slide-over sheets.

---

## 22. Card Geometry, Surface Backgrounds & Inset Hierarchy

In complex configuration and dashboard interfaces (such as Landing Page CMS, Institutional Branding, Service Standards, and Module Configurations), views often contain multiple grouped setting panels, preview frames, and item lists. To avoid visual chaos—such as some sections rendering in `rounded-xl` with dark grayish backgrounds while others use `rounded-2xl` with white cards and shadow—all surfaces strictly adhere to this standardized geometric and color hierarchy:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Outer Section Card / Setting Group Container                           │
│ rounded-2xl border border-border bg-white dark:bg-card p-6 shadow-2xs   │
│                                                                        │
│ Title (text-[14px] font-semibold)                                      │
│ Description (text-[12px] text-gray-500)                                │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Nested Control / Inset Container / Collapsed Item                  │ │
│ │ rounded-xl border border-border bg-gray-50/50 dark:bg-zinc-900/30  │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### 22.1 Top-Level Section Cards & Setting Panels
All primary configuration cards, editorial narrative containers, and parameter blocks inside the main view must use:
```jsx
className="rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs space-y-5"
```
- **Radius**: `rounded-2xl` (continuous Apple 16px corner squircle).
- **Surface**: Pure white `bg-white` in light mode, elevated `dark:bg-card` in dark mode. Never use raw gray fills (`bg-gray-50/50`, `dark:bg-zinc-900/30`) for top-level cards resting inside the main card container.
- **Padding**: Standardized to `p-6` (or `p-5 sm:p-6` on responsive mobile views). Never mix `p-4` with `p-6` across sibling sections.
- **Elevation**: Quiet institutional micro-shadow `shadow-2xs` to establish subtle separation against the underlying container surface.

### 22.2 Interactive Preview Toolbars & Simulator Headers
Headers for live interactive preview canvas areas (such as carousel simulators, process workflow previews, FAQ simulators, or footer previews) must match top-level section cards:
```jsx
className="flex items-center justify-between rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs"
```
- Do **not** render preview headers in `rounded-xl` with dark gray backgrounds (`bg-gray-50/50`), which creates an unintended visual break between editing sections and live simulation.

### 22.3 Multi-Item Cards in Grids & Lists (Slide Cards, Accordion Items)
Individual items in a reorderable grid or list (e.g. photo slides, sequential workflow steps, catalog credentials):
```jsx
className="group rounded-2xl border border-border dark:border-border bg-white dark:bg-card overflow-hidden shadow-2xs hover:shadow-xs transition-[color,background-color,border-color,box-shadow,opacity,transform] flex flex-col justify-between select-none relative"
```
- Active expanded or selected states apply `border-gray-950 dark:border-white ring-1 ring-black/10 dark:ring-white/20 shadow-xs`.

### 22.4 Add Item / Creation Dashed Cards
Dashed cards for adding new entries (photos, workflow steps, documents, questions) must maintain consistent `rounded-2xl` geometry:
```jsx
className="w-full py-4 rounded-2xl border-2 border-dashed border-border dark:border-border hover:border-gray-900/40 dark:hover:border-white/30 hover:bg-gray-100/60 dark:hover:bg-zinc-800/50 transition-[color,background-color,border-color,box-shadow,opacity,transform] flex items-center justify-center gap-2 text-xs font-semibold text-gray-600 hover:text-gray-950 dark:text-zinc-400 dark:hover:text-zinc-100 cursor-pointer select-none shadow-2xs"
```

### 22.5 Skeleton Parity for Cards
Loading skeletons for all card-based views must mirror the exact `rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs` shell. This eliminates layout shifts and prevents jarring gray-to-white color flashes when data finishes loading.

---

## 23. Selectable Cards, Icon Tiles & Active Highlight Standard

To prevent cognitive fatigue caused by competing selection paradigms across different modals and sheets (where some dialogs used solid black backgrounds, others used maroon borders, and others used gray borders), all selectable cards, icon picker tiles, preset option chips, and expanded accordion headers strictly adhere to the single **Crisp Outline & Soft Gray Surface** selection standard.

```
Unselected Option:                 Selected Option:
┌──────────────────────────────┐   ┌──────────────────────────────┐
│  [Icon] Option Title         │   │  [Icon] Option Title         │
└──────────────────────────────┘   └──────────────────────────────┘
Border: border-border              Border: border-gray-950 dark:border-white
Surface: bg-white dark:bg-zinc-900 Surface: bg-gray-100/80 dark:bg-zinc-800
Text:   text-gray-700              Text:   text-gray-950 dark:text-zinc-50
                                   Ring:   ring-1 ring-black/10 dark:ring-white/20
```

### 23.1 Visual Specifications
- **Selected State**:
  ```css
  border-gray-950 dark:border-white bg-gray-100/80 dark:bg-zinc-800 text-gray-950 dark:text-zinc-50 shadow-xs ring-1 ring-black/10 dark:ring-white/20
  ```
- **Unselected State**:
  ```css
  border-border dark:border-border bg-white dark:bg-zinc-900/40 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800/60
  ```

### 23.2 Where This Applies
1. **Icon Picker Tiles in Modals**: Grid tiles in icon selection dialogs (e.g. department icon selector, badge icon picker).
2. **Preset Suggestion Chips**: Quick-fill chips (e.g. storage room presets, document categories, role presets).
3. **Selectable Form Cards**: Radio-style card choices (e.g. backup target destinations, curve styles, layout modes).
4. **Step Accordion Items**: Expanded workflow step bars and category panels.

---

## 24. Table Loading Skeleton Alignment, Centering & Action Column Parity

Loading skeletons must mirror the exact dimensions, alignments, and column weights of the corresponding live data tables:

### 24.1 Action & Expand Column Geometry
- When the live table uses a centered `w-12 min-w-12 max-w-12 px-2 text-center` cell for action buttons, expandable row chevrons, or selection checkboxes, the skeleton's header and cell wrappers **must** match that exact geometry:
  ```jsx
  <th className="w-12 min-w-12 max-w-12 px-2 text-center">
    <Skeleton className="h-3.5 w-3.5 rounded mx-auto dark:bg-muted" />
  </th>
  ```
  and
  ```jsx
  <td className="w-12 min-w-12 max-w-12 px-2 align-middle text-center whitespace-nowrap">
    <Skeleton className="h-7 w-7 rounded-lg mx-auto dark:bg-muted" />
  </td>
  ```
- **Zero Asymmetric Padding**: Never use right-aligned or offset padding (such as `pr-6 text-right w-20`) on centered action or expand skeleton columns. Any offset creates an asymmetric visual twitch when skeleton rows resolve into live data.

### 24.2 Default Skeleton Row Count Parity
- Table loading skeletons must accept a `rowCount` prop that defaults to or dynamically receives the active pagination limit of the table.
- For high-volume transaction views (e.g., [`GlobalAuditLogsTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/GlobalAuditLogsTab.js)), the skeleton (`GlobalAuditLogsSkeleton.js`) must default to `rowCount={50}` to preserve vertical viewport height and eliminate abrupt layout reflows on initial page mount.

---

## 25. Narrative Typography System (`NarrativeText` & `narrativeParser`)

In human-readable activity history, audit logs, review sheets, notifications, and expanded event records, raw strings like `Approved student "Juan Dela Cruz" (2021-00123) for Transcript of Records` or `Status changed from Pending to Ready` can be difficult to scan when formatted as flat, unstyled sentences.

The **Narrative Typography System** (`@/components/shared/NarrativeText` and `@/lib/narrativeParser.js`) parses descriptive event text into tokenized semantic elements with Apple-style typography and subtle inline affordances:

### 25.1 Token Parsing Rules & Visual Styling
- **Mentions & Person Names (`token.type === "mention"`)**:
  - Automatically identifies `@username` mentions and student/person references preceded by context words (e.g., `student "Juan Dela Cruz"`, `account for "Maria Santos"`, `declined submission from John Doe`).
  - Displays as a borderless capsule (`rounded-full px-2.5 py-0.5 bg-black/[0.04] dark:bg-white/[0.06] border-0`) rendering a micro circular [`ProfileAvatar`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/shared/ProfileAvatar.jsx) (`size-3.5 rounded-full border-0`) that queries the live profile photo via `/api/account/avatar?id=...` with deterministic initial fallback, paired with bold, legible name text:
    ```jsx
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-gray-900 dark:text-zinc-100 font-semibold text-[11px] align-baseline transition-transform select-text mx-0.5 border-0">
      <ProfileAvatar
        id={token.value}
        name={token.value}
        initials={initial}
        className="size-3.5 shrink-0 rounded-full border-0"
        fallbackClassName={cn("text-[8px] font-bold text-white border-0", getDeterministicColor(token.value))}
      />
      <span className="truncate max-w-[200px]">{token.value}</span>
    </span>
    ```
- **State & Status Transitions (`token.type === "transition"`)**:
  - Identifies state evolutions (e.g., `from Pending to Approved`, `Pending → Ready`).
  - Renders the previous state in muted text, followed by an inline directional arrow (`ArrowRight01Icon` or `→`), and the new state wrapped in a pure borderless micro-capsule (`rounded-full px-2.5 py-0.5 bg-black/[0.03] dark:bg-white/[0.05] text-[11px] font-medium border-0`).
- **Record & Student Identifiers (`token.type === "record_id"`)**:
  - Matches student numbers (`2021-00123`), request IDs (`#REQ-402`), and numeric IDs (`#42`).
  - Renders as a pure borderless monospace pill (`inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[11px] font-medium bg-black/[0.04] dark:bg-white/[0.06] text-gray-800 dark:text-zinc-200 tabular-nums border-0`).
- **IP Addresses (`token.type === "ip"`)**:
  - Matches IPv4 network addresses (e.g., `192.168.1.100`, `127.0.0.1`).
  - Renders in compact monospace tabular styling with network pill highlight.
- **Quoted Entities (`token.type === "quoted"`)**:
  - Renders document names, feature titles, or department codes in semi-bold slate text.

### 25.2 Rendering Modes
- **Compact Mode (`mode="compact"`)**:
  - Used in dense table rows (`LogTable.js`, `MyActivityPanel.js`).
  - Single-line truncated with tooltip on hover, prioritizing fast scanning.
- **Full Mode (`mode="full"`)**:
  - Used in sheet bodies (`LogDetailSheet.js`), expanded bento cards (`LogExpandedRow.js`), and notification popovers (`NotificationsTab.js`).
  - Renders multi-sentence paragraphs with natural line wrapping and full entity avatars.

---

## 26. Comprehensive Pre-Commit & Audit Checklist

- [ ] **Single Card Hierarchy**: Is the view wrapped in one `<Card className="... p-0 gap-0 rounded-2xl border border-border ...">` with `border-t border-border dark:border-border` between the toolbar, any full-width banner, `ActiveFilterChips`, and the table/content area?
- [ ] **Header Action Slots (RefreshButton Exemption & More Action Button)**: If a `RefreshButton` is present, are secondary and primary actions kept directly visible in `actions` without a three-dot button? If no `RefreshButton` and actions > 2, are extra actions placed in `secondaryActions` (collapsible behind an Apple HIG three-dot button that disappears on click, reveals extra actions in place on the same row, and collapses back on outside click/Esc)?
- [ ] **Inline Header Count**: Is the record count summary rendered inline next to the `PageHeader` title (`text-[11px] font-normal text-gray-500 tabular-nums`) instead of as a pill badge in the description?
- [ ] **Line-Tabs Spacing**: Do sibling tabs inside a `role="group"` use `px-3` with **no** `gap-5` between buttons, and `<span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-pup-maroon dark:bg-red-400" />` for the active indicator?
- [ ] **Segmented Tab Equal Width (`auto-cols-fr` & `w-full`)**: Do segmented controls and sub-navigation tab strips use `inline-grid grid-flow-col auto-cols-fr` with `w-full` button items and pure white `bg-white dark:bg-card border-b border-border/80 dark:border-white/10` strip backgrounds?
- [ ] **Toolbar Split**: Does `DataViewToolbar` have `DashboardSearch` + `TableScrollControls` on the left, and `FilterPopover` / `SortPopover` / `GroupPopover` / `ColumnsPopover` / `DateRangeFilterButton` pushed to the right with `ml-auto`?
- [ ] **Scroll Controls**: Does `TableScrollControls` render only `[Reset Scroll] [<] [>]` at `h-9` (`controlSize="md"`) without the `"Scroll columns:"` text or icon?
- [ ] **Search Corner Count**: Does the search bar use `DashboardSearch` so the result count is anchored at `right-2.5`?
- [ ] **Table Empty-State Action**: Does each empty table offer a useful next step for its cause (reset, populated scope, permitted creation, or retry), while read-only unfiltered states avoid duplicating the header Refresh control?
- [ ] **Table Header Sort Icons**: Do all sortable headers use the standardized `SortIndicator` (`ArrowUp01Icon`, `ArrowDown01Icon`, `ArrowUpDownIcon` at `text-[12px] text-gray-400`)?
- [ ] **Table Typography Scale**: Do cells follow the `13px` (primary entity title) / `12px` (standard value & tabular dates) / `11px` (subtitles & pill badges) scale?
- [ ] **Table Header Expand/Collapse All**: In tables with expandable rows, does the header `th.w-12` provide a synchronous icon-only toggle (`MinusSignIcon` / `Add01Icon`) with tooltip and accessible `aria-label`?
- [ ] **Default Table Density (50 Rows for High-Volume)**: Is the default pagination limit for high-volume logs/activity history configured to 50 rows per page (`limit = 50`), and does the loading skeleton mirror `rowCount={50}`?
- [ ] **Expandable Detail Row Bento**: Do expandable rows follow the Apple Inset Grouped 3-card bento architecture (`LogExpandedRow`) with translucent backdrop blur, divided rows, parsed User Agent attribution, and text-only `Copy Record (JSON)`?
- [ ] **Row Selection vs. Double-Click Details**: On tables with checkboxes, does 1-click toggle row selection and double-click open View Details?
- [ ] **Table Action Button Affordance (The Subdued/Ghost Pattern)**: Are table action buttons visible with subtle affordance (`opacity: 0.6` / `.table-action-button`) by default rather than completely hidden (`opacity-0`), elevating smoothly to full opacity on row hover (`tr:hover`), focus-within, or open popover?
- [ ] **Table Action Button Border Radius & Geometry**: Do all table action buttons use `rounded-lg` (`border-radius: var(--radius-lg, var(--radius, 0.75rem))` = 12px continuous squircle) matching the Departments & Stations grid view action button, standard `28×28px` (`h-7 w-7`) geometry, `active:scale-95`, and zero parent `opacity-40` multiplication wrappers?
- [ ] **Table Action Click Isolation**: Does every table action button wrapper attach `onClick={(e) => e.stopPropagation()}` to prevent accidental row selection or opening detail sheets when interacting with the action button?
- [ ] **Kebab Orientation Consistency**: Do horizontal table rows use `MoreHorizontalIcon` (`size={16}`) and vertical grid cards use `MoreVerticalIcon` (`size={16}`)?
- [ ] **Pure Borderless Badges (`BADGE_BASE` & `BADGE_PALETTES`)**: Are all status, department, category, network, severity, platform, and scope badges strictly borderless (zero border line colors or border utility classes), uniform `px-2.5 py-0.5` padding, `text-[11px] font-semibold`, strictly text-only (no leading dots or icons, except micro avatar in narrative mentions), and formatted as `rounded-full` pills across tables, lists, sheets, and modals?
- [ ] **Strict Button Affordance Policy**: Are all labeled buttons strictly text-only (no static leading icons), and are all icon buttons strictly icon-only without text labels?
- [ ] **Secondary Button Styling**: Do secondary/outline buttons use the ultra-subtle translucent hairline border (`border-black/[0.06] dark:border-white/[0.08]` with `shadow-xs cursor-pointer active:scale-95`)?
- [ ] **Input & Textarea Focus Ring**: Do all `<Input>`, `<Textarea>`, `<DashboardSearch>`, and custom form inputs use the unified 1px institutional maroon focus state (`focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none dark:focus:border-red-500/80 dark:focus:ring-red-500/80`)?
- [ ] **Card Geometry & Surface Backgrounds**: Do all top-level section cards, setting groups, and preview toolbars use `rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs`?
- [ ] **Selectable Highlight Standard**: Do selectable cards, icon picker tiles, and preset suggestion chips use the Crisp Outline & Soft Gray Surface standard (`border-gray-950 dark:border-white bg-gray-100/80 dark:bg-zinc-800 ring-1 ring-black/10 dark:ring-white/20`)?
- [ ] **Sheet Footers**: Does the sheet footer use `justify-between` with the **Close / Cancel** button on the left and the **Primary Action Button** (or secondary + primary action group) on the right?
- [ ] **Modal Window Standards**: Do dialogs use `rounded-[22px]`, `backdrop-blur-2xl`, specular highlight shadow, and correct button placement (Cancel left/dismissive, Primary right)?
- [ ] **Account & Settings Dialog Architecture**: Does `AccountSettingsPanel` implement the macOS System Settings two-pane layout with 23px/48px inner sidebar alignment, decoupled 2FA tab, dedicated Accessibility accommodations, and curated cover wallpapers?
- [ ] **Switch Physics**: Do toggles use `@/components/ui/switch` with Apple Green active state (`#34C759`), 44×24px / 36×20px dimensions, and specular thumb highlight?
- [ ] **Avatar Formatting**: Are user and student avatars formatted as `ProfileAvatar` with `rounded-full` geometry, deterministic 8-palette macOS gradients, and 2-letter uppercase initials?
- [ ] **Sidebar Alignment**: Do sidebar rows adhere to the 23px icon center axis and 48px flush text start margin, with `LayoutLeftIcon` for collapse?
- [ ] **Circular Entity Icons**: Are department/office column icons, sheet summary identity avatars, and banner icon tiles formatted as circles (`rounded-full`)?
- [ ] **Floating Action Bar**: For selectable tables, is `FloatingActionBar` connected with counter token, text-only secondary actions, solid semantic primary action, and round `esc` badge?
- [ ] **Command Palette**: Are page actions and views indexed in `CommandPalette.js` with `⌘K` / `Ctrl+K` keycap triggers and live 2-pane inspector preview?
- [ ] **Round Keyboard Badges**: Do inline shortcut hints use the standardized Apple `<kbd>` styling (`rounded-full` or `rounded-md`, `shadow-2xs`, `select-none`)?
- [ ] **Toast Apple Motion**: Do notifications use `360ms` spring drop-and-settle with physical overshoot, `200ms` retraction exit, 1:1 swipe-up dismissal with rubber-band resistance, and top-centered depth stacking?
- [ ] **Interface Sound & Stepped Slider**: Do sound settings use text-only status/counter pills (`Active` / `Muted`, `Active: X of 6`), text-only `Preview Sound` buttons (`data-sound="none"`), and the light-mode stepped capsule slider (`h-8 rounded-lg bg-gray-100`) with internal ticks, vertical bar indicator, tabular percentage, and `<ReloadIcon size={14} />` reset button?
- [ ] **Skeleton Parity & Action Centering**: Does the table skeleton mirror the exact column dimensions and center alignment (`w-12 min-w-12 max-w-12 px-2 text-center` with `mx-auto`) without right-aligned padding?
- [ ] **Institutional PDF Table Full-Width Standard**: Do all PDF reports (`createReportDocument`) stretch tables to 100% of the usable content width (`tableWidth: usable = width - margin * 2`) with flexible title/details columns and zero right-side blank whitespace?
