# Component Styling & Design System Standards Guide

This guide establishes the mandatory UI/UX standards, component blueprints, and styling patterns for the **PUPSJ Records Keeping System**. All agents and engineers developing new features must follow these patterns to preserve visual harmony, Apple Human Interface Guidelines (HIG) compliance, and consistent interaction behaviors across portals.

---

## 1. Core Visual Principles & Hierarchy

1. **Quiet, Apple-Inspired Clarity**: Avoid decorative clutter, artificial card glows, AI-generated purple/blue gradients, and unnecessary iconography.
2. **Text-Only Primary Action Buttons**: Primary buttons must lead with clear action text that names the action and its target (e.g. `Save Changes`, `Register Student`, `Submit Request`). Never put static leading icons on primary action buttons.
3. **No Icons in Modal Headers**: Dialog headers must be clean and typographic. Do not place decorative icon boxes (such as 48×48px squircles with duotone icons) in `DialogHeader`.
4. **Verb + Specific Noun for Actions**: Primary and context-dependent action labels name both the action and its target (e.g. `Save Changes`, `Register Student`, `Submit Feedback`). Keep dismissal and navigation labels concise (`Cancel`, `Close`, `Back`, `Done`).

---

## 2. Border Radius Token Hierarchy

**Typography ownership:** Plus Jakarta Sans is the app interface font. It is loaded in the root layout and inherited by controls, preview toolbars, and code-like labels. Generated PDF reports use the font selected in Institutional Branding, embedded in regular and bold weights throughout the document. Do not apply the PDF font to the surrounding app interface. Use `tabular-nums` to align interface IDs and timestamps. Component utilities own sizes, weights, and line heights; do not add universal `!important` typography rules. Shared Input and Select default to 13px and preserve explicit caller sizes. Heading/table defaults stay in Tailwind's base layer so utilities can override them.

Follow this strict sizing hierarchy across all pages and components:

| Scope | Class Token | Typical Usage |
|---|---|---|
| **Outer Containers** | `rounded-2xl` | Standalone cards, sheets, dialog popups, main page containers |
| **Controls & Tiles** | `rounded-xl` | Buttons, text inputs, `<Select>` dropdown triggers, squircle icon tiles |
| **Segmented Items & Badges** | `rounded-lg` | Segmented control buttons, dropdown menu items, table action buttons (`w-7 h-7`), active filter chips, stepper buttons |
| **Pills & Indicators** | `rounded-full` | Apple toggle switches, status pill badges, presence dot indicators |

---

## 3. Standard Modals & Dialogs (`Dialog`)

### 3.1 Modal Architectural Anatomy
All dialogs built on shadcn/ui and Radix primitives must follow this structure:

```jsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function StandardFeatureModal({ open, onClose, onSave, isLoading }) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      {/* 1. Container: rounded-2xl, p-0, overflow-hidden, border, shadow-2xl, gap-0 */}
      <DialogContent className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-md dark:border-white/10 dark:bg-card gap-0">
        
        {/* 2. Header: Clean typography ONLY. NO icon box wrapper. */}
        <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none text-left">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                Modal Action Title
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px] font-normal text-gray-500 dark:text-zinc-400">
                Concise description explaining the purpose or consequence of this action.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 3. Body: Standard padding (p-6), structured layout */}
        <div className="p-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-300">
              Field Label <span className="text-gray-400 dark:text-zinc-500 font-normal">(Optional)</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Value"
              className="h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon shadow-xs"
            />
          </div>
        </div>

        {/* 4. Footer: Verb + specific noun for submit; outlined dismissal */}
        <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="h-10 px-4 text-xs font-semibold rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={isLoading}
            className="h-10 px-5"
          >
            {isLoading ? "Saving Changes…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 3.2 Modal Sizing Standards

| Size Variant | `DialogContent` Class | Common Use Cases |
|---|---|---|
| **Compact / Alert** | `sm:max-w-md` (or `max-w-md`) | Feedback forms, password reset notices, single input prompts |
| **Standard Form** | `sm:max-w-lg` / `sm:max-w-xl` | Multi-step prompts and medium forms |
| **Complex Form** | `sm:max-w-2xl` / `max-w-4xl` | Student registration, user editing, template assignment |
| **Full Inspection** | `w-[96vw] max-w-[96vw] h-[90vh] xl:max-w-[1400px]` | PDF previewers, digitization audits, document reviews |

### 3.3 Modal & Sheet Golden Rules
- **No Header or Footer Dividers**: Do not add separator borders, rules, or tinted bands between a modal/sheet header, body, and footer. Use spacing and typography to establish the sections. Keep functional borders inside forms, tables, notices, and previews where needed.
- **Footer Layout**: `DialogFooter` has no default negative margins, border, background, or padding. A zero-padding shell supplies `p-6 pt-0` on the footer; a padded shell uses the neutral footer directly. Never compensate for footer layout with negative margins.
- **NEVER** insert a decorative icon box or leading icon into `DialogHeader` or `SheetHeader`.
- **NEVER** prepend icons to `DialogTitle` or `SheetTitle`.
- Keep header titles between `15px` and `18px` (`text-[16px] font-semibold tracking-[-0.01em]` for Dialogs; `text-[17px]` to `text-[19px]` for Sheets).
- Keep descriptions at `text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-1`.
- For global confirmation dialogs, always use `<ConfirmModal />`, which natively enforces Apple styling and icon-free headers.
- Footers use a specific action and target for primary actions (e.g. `Save Changes`, `Register Student`, `Submit Request`) with concise dismissal labels (`Cancel`, `Close`, `Done`).

### 3.4 Form Field Sequence

Arrange modal fields in the order a person provides or understands the information:

1. Core identity fields (name, title, identifier where editable).
2. Classification and status fields.
3. Long-form description or purpose.
4. Contact, ownership, or adviser details.
5. Appearance, storage, and other optional configuration.
6. Generated or read-only previews, grouped after the inputs that determine them.

Keep related fields together in a responsive grid. On narrow screens, let the grid stack in the same reading and tab order. Do not place appearance/configuration controls before required record details.

### 3.5 Sheet Pagination

Use `SheetPagination` from `@/components/shared/SheetPagination` for every sheet pager. It matches the table controls: compact ghost `Prev` / `Next` buttons with a bordered current-page indicator. Keep the existing record callbacks, accessible entity-specific labels, and disabled conditions.

- Record-detail sheets use `compact` with the current record index plus one and the record count. Header controls may wrap onto another line on narrow screens.
- List sheets use the full layout with `Showing X–Y of Z`, `Rows: 10 / 20 / 50 / 100`, and page navigation. Pass `pageSize` to calculate the range accurately, including the last partial page. Reset to the first page when the row count changes.
- Keep pagination outside the sheet's action footer. Do not copy table-container divider lines or tinted footer backgrounds into sheets.
- Do not build separate arrow-button/zero-padded counters or outlined previous/next layouts for sheets.

### 3.6 PDF Preview Modals

Use `PDFPreviewModal` from `@/components/shared/PDFPreviewModal` for records, attachments, and generated reports. All PDF preview dialogs use this one shell; page components provide the document, context, and existing download/logging callbacks.

- Use a specific title such as `Student Records Report Preview`, plus a short report description. The header uses `px-6 py-5` and a single close control.
- Keep the PDF canvas edge to edge inside the full-inspection dialog. The common viewer supplies loading and retry states, the shared PDF zoom policy below, and fullscreen behavior.
- Place the fullscreen control at the footer's left. Actions on the right are outlined `Close`, outlined `Print PDF`, and primary `Download PDF`. The footer uses `px-6 py-4`, wraps on narrow screens, and supplies at least 44px mobile controls.
- Printing waits for the active PDF frame to load. Downloads use the same PDF URL or the caller's existing download handler, preserving filenames, logging, and feedback.
- Use `headerActions` for contextual controls such as the SLA/CSM report switcher. Preserve the common header, canvas, footer, focus behavior, and action order.
- Use `usePdfPreviewSession` for page-owned report generation. Closing or unmounting cancels pending generations and releases the current object URL. Route every dismissal through `onClose` so footer, header, Escape, and backdrop dismissal release the same resources.
- Import `PDF_ACTION_LABELS` from `@/lib/pdfPreview`: `Preview PDF` opens a preview, `Print PDF` opens the print dialog, and `Download PDF` saves the displayed PDF. Use `Download Original` only for the original image or an unsupported source format. Do not label a preview-opening action `Export PDF Report`.

### 3.7 Document PDF Preview & Zoom

All full document and report previews use `PDFPreview` from `@/components/shared/PDFPreview`. It owns the application's PDF iframe and opening zoom.

- Open desktop previews at **100%**, rather than stretching the paper to the available width. Containers narrower than 820px fit the whole page so mobile views and embedded panels show the paper without horizontal clipping.
- Use `PDFPreviewModal` for opening records, scanned documents, and attachments. It shares file loading, missing-file recovery, and replacement behavior with embedded `ResilientPDFViewer` panels.
- Image attachments and scans are converted to a temporary PDF for viewing in the same preview. `Download PDF` saves that PDF; `Download Original` preserves the uploaded file and filename. Conversion does not alter stored files. Unsupported formats receive an explicit original-download state.
- Use `PDFPreviewModal` for generated reports, with the same `PDFPreview` body. Preview, printing, and downloading must use the generated PDF rather than separate HTML print layouts.
- File-card downloads use the download callback or `downloadDocument` to save received bytes. Do not use `window.open` as a download fallback or bypass the preview for non-PDF attachments.
- Pass the source URL to the shared component. Do not create page-specific PDF iframes or append `view=FitH` / custom zoom fragments. The shared helper preserves page destinations and enforces the opening zoom.
- Keep document thumbnails and OCR/template editing canvases in their existing editing or navigation roles. Their full document preview actions open the shared PDF preview.

### 3.8 Generated Institutional Reports

- Build every generated report with `createReportDocument` from `@/lib/reportDocument`. Report generators supply their data and sections; they do not implement separate letterheads, font registration, table themes, or page footers.
- Use A4 portrait for narrative reports and landscape for wide lists. Shared page margins are 54pt; reserve 72pt at the bottom for footer clearance. Body text is 10.5pt with 1.4 line spacing, section headings are 11.5pt bold, and data tables use 9pt text (8.5pt for dense matrices).
- The letterhead contains the institutional seals, jurisdiction, school, campus, and office. Follow it with the report title, generation date, scope/coverage metadata, numbered sections, and relevant data. Use the configured signatory titles where a review/signature area is appropriate; leave signatures blank.
- Tables use black text, light gray column headings, thin rules, repeated headings on continuation pages, wrapped cell text, and right-aligned numeric columns. Use document tables rather than dashboard metric cards.
- Every page has a document reference, generation timestamp, and `Page X of Y`. Continuation pages include the institution and report title. Avoid orphaned section headings, clipped text, and tables overlapping footers.
- `reportFont` is stored with institutional branding. Available families are Plus Jakarta Sans, Arial-compatible Liberation Sans, Times New Roman-compatible Liberation Serif, Noto Sans, and Noto Serif. All fonts are self-hosted and embedded in the PDF. Keep option labels explicit about compatible fonts.
- The branding screen previews the actual generated sample PDF, including unsaved changes. Save Branding applies the settings to subsequent generated reports. Resolve current branding before generating a report, with cached branding available when offline.
- Describe the recorded data and the selected coverage. Missing measurements display `N/A` or an explicit empty state; do not manufacture metrics, signatures, certification statements, or legal conclusions.

---

## 4. Buttons & Interaction Standards

### 4.1 Primary Action Buttons
- **Style**: Text-only, bold or semibold, `rounded-xl`.
- **Colors**: The default `<Button>` inherits `--brand-accent` and `--brand-foreground` from the authenticated role/office in both themes, with institutional maroon/white fallbacks. Hover darkens the same accent. Do not hardcode neutral colors or invert primary colors in dark mode. Dialogs and sheets supply the same role variables to their portalled content. Use `variant="success"`, `variant="warning"`, or `variant="danger"` for semantic confirmations. Keep `variant="destructive"` for soft destructive actions.
- **Styling**: The shared component owns colors, focus, press feedback, radius, and typography. Add layout classes only. Default height is 40px; `size="sm"` is 36px. Avoid local color overrides and `!important` utilities.
- **Icons**: Permitted only during loading or processing states; use direct Hugeicons imports.
```jsx
// Correct (Text-only, action verb + specific noun)
<Button disabled={isLoading}>
  {isLoading ? "Registering Student…" : "Register Student"}
</Button>

// Incorrect (DO NOT ADD STATIC LEADING ICONS OR VAGUE LABELS)
import { Add01Icon } from "hugeicons-react";

<Button ...>
  <Add01Icon size={16} aria-hidden="true" /> Register
</Button>
```

### 4.2 Action Label Convention (Golden Rule)
- **Primary and context-dependent actions** use `[Action Verb] + [Specific Noun]` so users know what the action changes: `Save Changes`, `Register Student`, `Register Staff`, `Submit Request`, `Submit Feedback`, `Add Program`, `Restore Backup`.
- Avoid vague action-only labels (`Save`, `Register`, `Submit`, `Add`, `Create`) when the target is not obvious from the surrounding interface.
- **Dismissal and navigation** may use concise atomic labels: `Cancel`, `Close`, `Back`, `Done`.
- Use natural loading text that retains the target, such as `Saving Changes…` or `Registering Student…`.

### 4.3 Secondary / Dismissal Buttons
- **Style**: Outlined (`variant="outline"`), `rounded-xl`, clear border.
- **Copy**: Concise dismissal word (`Cancel` or `Close`).
```jsx
<Button
  variant="outline"
  onClick={onClose}
  className="h-10 px-4 text-xs font-semibold rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
>
  Cancel
</Button>
```

### 4.4 Selective Data Refresh Action
Use a refresh control when data may change outside the current screen and users need a way to pull in those changes, such as live queues, notifications, audit feeds, and operations monitoring. Routine settings and reference screens should load when opened and update after save without a refresh control. When refresh is needed, use the project's squircle `<RefreshButton />` instead of a text-only button:
```jsx
import { RefreshButton } from "@/components/shared/RefreshButton";

<RefreshButton onRefresh={fetchData} isLoading={isLoading} title="Refresh Records" />
```
Renders an accessible 40×40px `rounded-xl` icon-only squircle with hover feedback and spinning indicator.

### 4.5 Table / Row Inline Actions
Use a fixed 48px action column with one control, following section 9. A single action renders directly; multiple actions use the shared menu. Supply a specific label and retain the existing authorization, disabled state, callback, and confirmation:
```jsx
import { PencilEdit01Icon } from "hugeicons-react";
import { TableActions } from "@/components/shared/TableActions";

<TableActions
  label={`Actions for ${row.studentNo}`}
  actions={[
    { label: "Edit Student", icon: PencilEdit01Icon, onClick: () => handleEdit(row) },
  ]}
/>
```

---

## 5. Form Controls, Inputs & Selectors

### 5.1 Labels & Text Inputs
Use Title Case labels (`text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5`). Do not append red asterisks (`*`) to required fields; instead, mark only optional fields with `<span className="text-gray-400 dark:text-zinc-500 font-normal">(Optional)</span>`.

All `<Input>` and `<Textarea>` controls share a standardized 1px border + 1px ring focus style (`focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80`) inherited directly from the shared UI primitives. Never pass raw `focus-visible:ring-pup-maroon` without `ring-1` or introduce 3px thick focus rings.
```jsx
<div>
  <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-300">
    Full Name
  </label>
  <Input
    type="text"
    placeholder="e.g. Dela Cruz, Juan"
    value={name}
    onChange={(e) => setName(e.target.value)}
    className="h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-xs"
  />
</div>
```

### 5.2 Dropdown `<Select>`
Always use `@/components/ui/select`:

The shared adapter uses Base UI Select for combobox/listbox semantics, keyboard navigation (arrows, Home/End, typeahead, Enter/Space, Escape), focus return, and viewport collision handling. Existing `options`, option children/fragments/groups, `onValueChange`, and `onChange({ target: { value, name } })` remain supported. Supply an associated label or accessible name. Default triggers are 40px with 13px text; compact callers may use `h-9 text-xs`. The options list owns the single scroll container.
```jsx
import { Select } from "@/components/ui/select";

<Select
  value={selectedOption}
  onValueChange={setSelectedOption}
  options={[
    { value: "opt1", label: "Option 1" },
    { value: "opt2", label: "Option 2" },
  ]}
  placeholder="Select Option"
  buttonClassName="h-10 text-xs rounded-xl border border-gray-200 dark:border-white/10"
/>
```
> [!CAUTION]
> **Double Scrollbar Trap**: Never pass `max-h-* overflow-y-auto` into `menuClassName`. The inner options container in `<Select>` already manages scroll bounds.

### 5.3 Apple Toggle Switch (`<Switch>`)
Always use `@/components/ui/switch`:

Use the default 44×24px track with a 20px white thumb, or `size="sm"` for a 36×20px track with a 16px thumb. Enabled tracks are emerald in both themes; disabled controls retain their state at half opacity. Do not recreate switches with hidden checkboxes or local track colors. Supply an associated label, `aria-labelledby`, or `aria-label`; matrix switches must include both the module and office in their accessible name. Preserve `checked`, `onCheckedChange`, and `disabled` behavior. Focus rings and reduced-motion support come from the shared component.
```jsx
import { Switch } from "@/components/ui/switch";

<div className="flex items-center justify-between">
  <div>
    <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">Working Days Only</span>
    <p className="text-[12px] text-gray-500 dark:text-zinc-400">Exclude weekends and official holidays</p>
  </div>
  <Switch
    checked={workingDaysOnly}
    onCheckedChange={setWorkingDaysOnly}
    aria-label="Toggle working days"
  />
</div>
```

### 5.4 Segmented Control Tabs
For frequency selectors, views, and preset switchers:
```jsx
<div className="inline-flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-gray-200/60 dark:border-white/5">
  <button
    type="button"
    onClick={() => setMode("daily")}
    className={cn(
      "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
      mode === "daily"
        ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
        : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
    )}
  >
    Daily
  </button>
  <button
    type="button"
    onClick={() => setMode("weekly")}
    className={cn(
      "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
      mode === "weekly"
        ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
        : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
    )}
  >
    Weekly
  </button>
</div>
```

### 5.5 Tactile Numeric Steppers
For bounded integers (e.g. days, counts, limits):
```jsx
<div className="flex items-center gap-2">
  <button
    type="button"
    onClick={decrement}
    disabled={value <= min}
    className="h-8 w-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold text-xs active:scale-95 transition-all shadow-xs cursor-pointer dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300"
  >
    −
  </button>
  <div className="w-14 h-8 rounded-lg bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-white/10 flex items-center justify-center font-sans tabular-nums text-xs font-semibold text-gray-900 dark:text-zinc-100">
    {value}
  </div>
  <button
    type="button"
    onClick={increment}
    disabled={value >= max}
    className="h-8 w-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold text-xs active:scale-95 transition-all shadow-xs cursor-pointer dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300"
  >
    +
  </button>
</div>
```

### 5.6 Draggable KPI Stat Cards (`Reorder` from `framer-motion`)
Standardized 3-card stat grid with drag-and-drop reordering, squircle icon tile, and expandable detail popover on click:

```jsx
import { Reorder } from "framer-motion";
import { Analytics01Icon, DragDropIcon } from "hugeicons-react";

export default function FeatureKpiCards({ data }) {
  const [selectedKpi, setSelectedKpi] = useState(null);
  const [kpiOrder, setKpiOrder] = useState(["metric1", "metric2", "metric3"]);
  const containerRef = useRef(null);

  return (
    <Reorder.Group
      as="div"
      axis="x"
      values={kpiOrder}
      onReorder={setKpiOrder}
      ref={containerRef}
      className="grid grid-cols-1 gap-4 md:grid-cols-3 items-stretch relative z-20 w-full"
    >
      {kpiOrder.map((key) => (
        <Reorder.Item
          as="div"
          value={key}
          key={key}
          className={cn(
            "relative group rounded-xl w-full cursor-grab active:cursor-grabbing",
            selectedKpi === key ? "z-30" : "z-10"
          )}
        >
          <div
            onClick={() => setSelectedKpi(selectedKpi === key ? null : key)}
            className={cn(
              "relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-none flex flex-col justify-between min-h-[110px] bg-gray-50/70 dark:bg-zinc-900/60 hover:bg-gray-100/70 dark:hover:bg-zinc-800/60",
              selectedKpi === key ? "border-red-500/50 ring-1 ring-red-500/20" : "border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10"
            )}
          >
            {/* Header: Label, Pill Badge, Squircle Icon Tile */}
            <div className="flex justify-between items-start p-4 pb-0">
              <div className="flex flex-col gap-1 min-w-0 pr-2">
                <span className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 truncate capitalize">
                  Metric Title
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 w-fit">
                  Status
                </span>
              </div>
              <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-pup-maroon">
                <Analytics01Icon size={15} aria-hidden="true" />
              </div>
            </div>

            {/* Footer: Large Metric Number, Subtitle & Reorder Grip Handle */}
            <div className="flex justify-between items-end p-4 pt-1">
              <div className="flex items-baseline gap-2 min-w-0 pr-2">
                <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                  100%
                </span>
                <span className="text-xs font-medium mb-1 truncate text-gray-500 dark:text-zinc-400">
                  Subtitle info
                </span>
              </div>
              <DragDropIcon
                size={18}
                aria-hidden="true"
                className="cursor-grab active:cursor-grabbing hover:text-gray-400 dark:hover:text-zinc-500 text-gray-300 dark:text-zinc-700 mb-0.5 shrink-0"
                title="Drag to rearrange"
              />
            </div>
          </div>
        </Reorder.Item>
      ))}
    </Reorder.Group>
  );
}
```

### 5.7 Professional Requirement & Item Cards (3-Column Layout)
For multi-item checklists, records, and catalogs (such as the Student Document Checklist), cards must use a responsive 3-column grid (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5`) with quiet institutional luxury:

- **Surface**: `rounded-[18px] border bg-white dark:bg-zinc-900/60 p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]`.
- **Top Row**: Category badge on left (`text-[10px] uppercase font-semibold text-gray-500 bg-gray-100/90 rounded-md px-2 py-0.5`), status pill on right (`rounded-full px-2.5 py-0.5 text-[11px] font-semibold` with 6px status dot).
- **Icon Tile**: Squircle `w-9 h-9 rounded-xl` with a category-specific Hugeicons component (e.g. `Contact01Icon`, `GraduationScrollIcon`, `Award01Icon`, `Shield01Icon`).
- **Typography**: Clean title `text-[13.5px] font-semibold text-gray-900 dark:text-zinc-100 line-clamp-1`, description clamped at 2 lines (`text-[11.5px] text-gray-500 min-h-[34px]`).
- **Callout Micro-Banner**: Clean inset box (`rounded-xl p-2.5 border text-[11px]`) for submission channel or digital archive confirmation.
- **Footer**: Location indicator on left, interactive detail popover trigger on right (`Popover` with instructions and audit timestamps).

### 5.8 Standard Search Input with Live Result Count Badge & Quick Clear Action
All search bars across table toolbars, master lists, directories, and archive scopes must follow the standardized search input pattern:

- **Apple HIG & Visual Ergonomics**: Provides immediate visual confirmation of the search query scope, total matching count, and an effortless single-click clear action without leaving the keyboard or toolbar.
- **Container**: `relative flex-1 sm:w-64 min-w-[200px] max-w-sm group` (or responsive fixed width `w-full sm:w-[260px] lg:w-[300px] relative group shrink-0`). Must include `group` so the leading search icon transitions color when the input is focused.
- **Leading Search Icon**: Embedded at `absolute inset-y-0 left-3 flex items-center pointer-events-none` with `<Search01Icon size={16} aria-hidden="true" className="text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400" />`.
- **Input Geometry & Spacing**: Must use `h-9 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all`.
  - **Crucial Padding Requirement**: Always specify `pl-8 pr-16` (or `pr-20` if large numbers/controls) so typed text never overlaps or clips under the trailing count badge or clear button.
- **Trailing Control Cluster (Clear Button + Live Count Badge)**: Positioned at `absolute inset-y-0 right-3 flex items-center gap-1.5`:
  - **Quick Clear Button**: Displayed conditionally whenever the search query is non-empty (`query !== ""`). Must use a borderless, transparent button with `<CancelCircleIcon size={14} aria-hidden="true" />` and accessible tooltip/aria-label.
  - **Live Count Badge**: Shows pure numeric matching count using `text-[11px] font-sans tabular-nums text-gray-400 dark:text-zinc-500 pointer-events-none` formatted with `.toLocaleString()`.

#### Code Blueprint: Standard Search Input
```jsx
import { CancelCircleIcon, Search01Icon } from "hugeicons-react";

<div className="relative w-full sm:w-64 group">
  {/* 1. Leading Search Icon with Brand Focus Transition */}
  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
    <Search01Icon size={16} aria-hidden="true" className="text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400" />
  </div>

  {/* 2. Text Input with Standard Hairline Border & pl-8 pr-16 Padding */}
  <Input
    type="text"
    placeholder="Search student no. or name"
    value={searchQuery}
    onChange={(e) => {
      setSearchQuery(e.target.value);
      setPage(1);
    }}
    className="h-9 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 pl-8 pr-16 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
  />

  {/* 3. Trailing Cluster: Quick Clear Button + Live Tabular Count Badge */}
  <div className="absolute inset-y-0 right-3 flex items-center gap-1.5">
    {searchQuery && (
      <button
        type="button"
        onClick={() => {
          setSearchQuery("");
          setPage(1);
        }}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 cursor-pointer p-0.5 transition-colors border-0 bg-transparent flex items-center justify-center"
        title="Clear search"
        aria-label="Clear search"
      >
        <CancelCircleIcon size={14} aria-hidden="true" />
      </button>
    )}
    <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-sans tabular-nums pointer-events-none">
      {filteredStudents.length.toLocaleString()}
    </span>
  </div>
</div>
```

#### Search Input Golden Rules:
1. **Never omit the count badge**: Every search input in toolbars and table headers must report its current scope or filtered result count.
2. **Keep the same font with stable digits**: Use `font-sans tabular-nums text-[11px]` to prevent layout jitter when numeric values change.
3. **Always ensure `pr-16` right padding**: Standard `pr-4` or `pr-8` causes text to type underneath the count badge.
4. **Never use raw "×" characters**: Always render `<CancelCircleIcon size={14} aria-hidden="true" />` for the clear button.

### 5.9 Standard Popovers (`Popover`) & The Three-Zone Architecture
All popovers (filter drawers, contextual utility popups, color pickers, and detail cards) must follow the **Three-Zone Architecture (Header, Body, Footer)** established by the canonical Combine Filter (`MultiCriteriaFilter`):

- **The Three-Zone Architecture**:
  1. **Header Zone (`PopoverHeader`)**: Inset top bar with `px-4 py-2.5 border-b border-border dark:border-border bg-gray-50/60 dark:bg-zinc-800/40 flex items-center justify-between text-sm`.
     - **Left**: Clean title/category (`text-sm font-semibold text-gray-900 dark:text-zinc-100` or `text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500`).
     - **Right**: Action link (`Reset Filters`, `text-xs font-semibold text-pup-maroon dark:text-red-400 hover:underline`), or active status pill badge.
  2. **Body Zone (`PopoverBody`)**: Main content area with snug `p-3` or `p-3.5 space-y-3` (`bg-white dark:bg-zinc-900`). Holds scrollable criteria groups, color swatch grids, or guideline callouts.
  3. **Footer Zone (`PopoverFooter`)**: Inset bottom bar with `px-4 py-2 border-t border-border dark:border-border bg-gray-50/60 dark:bg-zinc-800/40 text-[11px] text-gray-500 dark:text-zinc-400`.
     - **When to include a footer**: ONLY include a footer when it provides genuine functional value (such as live filter calculation results like `Matching: X of Y` in `MultiCriteriaFilter`, or account state & sign out actions in the user profile menu).
     - **Never include filler footers**: Action dropdowns and utility menus (e.g. Official Report PDF, Export CSV, Document Actions, Template Actions, Arrange Records, Folder Color) must NEVER include artificial filler footers (such as "generator / archival dossier", "target", "selected", "sort mode").
     - **Profile Menu Stacked Layout**: In profile menus with footers, session status and primary actions like Sign Out must be stacked on **new lines** (`flex flex-col gap-1.5`), never squished side-by-side.

#### Code Blueprint: Three-Zone Popover
```jsx
<PopoverContent className="w-80 p-0 rounded-2xl border border-border dark:border-border bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden font-jakarta">
  {/* 1. Header Zone */}
  <PopoverHeader>
    <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
      Combine Filter Criteria
    </span>
    {hasActiveFilters && (
      <button type="button" onClick={handleReset} className="text-xs font-semibold text-pup-maroon dark:text-red-400 hover:underline cursor-pointer">
        Reset Filters
      </button>
    )}
  </PopoverHeader>

  {/* 2. Body Zone */}
  <PopoverBody className="max-h-72 overflow-y-auto">
    {/* Criteria options, controls, or swatches */}
  </PopoverBody>

  {/* 3. Footer Zone */}
  <PopoverFooter>
    <span>
      Matching: <strong className="text-gray-900 dark:text-zinc-100">{matchingCount}</strong> of {totalCount}
    </span>
    <span className="font-medium text-emerald-600 dark:text-emerald-400">
      Combined active
    </span>
  </PopoverFooter>
</PopoverContent>
```

- **Geometry & Hierarchy**:
  - **Multi-Criteria Filter Drawers & Persona Dialogs**: `w-80` (`320px` width) with `rounded-2xl border border-border dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden p-0`.
  - **Contextual Utility Popups & Swatch Pickers**: `w-60` (`240px` width) with `p-0 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-border/80 shadow-2xl overflow-hidden` and tactile `h-8 rounded-lg` swatches.
  - **Action & Sort Dropdown Menus**: Standardized `w-60` (`240px` width) with `rounded-2xl border border-border dark:border-white/10 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 select-none`, `px-4 py-2.5` header zone with `text-xs font-semibold` title, `p-1.5 space-y-0.5` body zone, and `py-1.5 px-2 rounded-lg text-xs font-medium` item padding.
  - **Calendar Pickers**: `w-auto rounded-2xl border border-border bg-white p-0 shadow-2xl dark:border-border dark:bg-card`.
- **Snug Padding Principle**:
  - The primitive `<PopoverContent />` must use `gap-0` so child dividers (`border-b`) and containers sit flush without artificial flex gaps.
  - Detail popovers use snug `p-3.5 space-y-2.5` inside the body zone (never bloated `p-4 space-y-4`).
  - Dropdown menu items must never use oversized `py-2 px-2.5` padding; always use Apple HIG standard `py-1.5 px-2`.
- **No Hardcoded Responsive Blowout**: **NEVER** add `sm:w-96` or responsive width modifiers to the primitive `<PopoverContent />` or custom popovers. Responsive media queries in CSS override callers that declare fixed widths on desktop viewports.
- **Typographic & Font-Weight Standards**:
  - **Header Titles**: `text-sm font-semibold text-gray-900 dark:text-zinc-100` with hairline divider `border-b border-border dark:border-border`.
  - **Category / Section Labels**: `text-[10px]` or `text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500`.
  - **Item / Option Labels**: `text-xs font-medium text-gray-700 dark:text-zinc-200` (or `text-sm font-medium` for master lists).
  - **Badges & Counts**: `text-[9px]` or `text-[10px] font-semibold rounded-full`.
  - **Secondary Subtext**: `text-[10px]` or `text-xs font-normal text-gray-500 dark:text-zinc-400`.
  - **Action / Reset Buttons**: `text-[11px]` or `text-xs font-semibold text-pup-maroon dark:text-red-400 hover:underline cursor-pointer`.

---

### 5.10 Standard Empty States (Hugeicons)

Use `EmptyState` from `@/components/ui/empty` for empty collections and selection placeholders. Use the exported `Empty`, `EmptyHeader`, `EmptyMedia`, `EmptyTitle`, `EmptyDescription`, and `EmptyContent` primitives when conditional markup requires composition. Keep layout classes in these shared components instead of repeating visual overrides in each page.

| Property | Page / table (default) | Compact (`variant="compact"`) |
|---|---|---|
| Container | `px-6 py-12 min-h-[360px] flex-1` | `px-4 py-6 min-h-0 flex-none` |
| Optional standalone icon | 48px, no enclosing surface, border, or shadow | 28px, same unboxed treatment |
| Title | `text-xl font-semibold leading-tight tracking-[-0.02em] text-gray-900 dark:text-zinc-50` | `text-sm tracking-[-0.01em]`, same weight and colors |
| Description | `mt-2 max-w-xs text-sm font-normal text-gray-500 dark:text-zinc-400` | `mt-1 text-xs`, same width and colors |
| Optional action area | `mt-6`; existing standard button variants | Same |

```jsx
import { Search01Icon } from "hugeicons-react";
import { EmptyState } from "@/components/ui/empty";

<EmptyState
  icon={Search01Icon}
  title={hasActiveFilters ? "No Matches Found" : "No Records Yet"}
  description={hasActiveFilters
    ? "Adjust your search or reset your filters."
    : "Registered records will appear here."}
>
  {hasActiveFilters && (
    <Button variant="outline" onClick={clearFilters}
      className="h-10 rounded-xl px-5 text-xs font-semibold">
      Reset Filters
    </Button>
  )}
</EmptyState>
```

- Import icons directly from Hugeicons. Use direct Hugeicons components in empty states; do not use Phosphor imports, `ph-*` names, or Tabler class aliases.
- Hugeicons default to a fixed 24px size, so always pass `size`. Use `size="1em"` when a `text-*` class or parent typography should set the icon dimensions; use an explicit numeric size for fixed geometry. Ordinary inline icons without a typography size use 16px, with smaller sizes reserved for dense metadata and larger sizes for prominent standalone symbols. `AppIcon` already defaults to `1em`.
- Keep the composition quiet: a standalone symbol, a clear title, a short explanation, and an optional action. Empty-state symbols must not sit in decorative boxes, badges, or elevated tiles.
- When composing primitives, render icons with `size="1em"` inside `EmptyMedia`; the wrapper handles size and color and hides decorative media from assistive technology. Explicit child styles remain supported.
- Use compact states for sheet lists, chart panels, account setup, and small cards. Dropdown no-results messages can remain single-line messages. Upload dropzones and loading skeletons retain their distinct behavior.
- Preserve context-specific copy, action handlers, and permission checks. A filter miss should offer an outlined reset action; a first-use state may offer a permitted primary creation action. Do not turn these actions into borderless text links with global CSS.
- The action slot constrains buttons and links to its width and wraps long labels on narrow screens. Keep empty action slots hidden.
- No pulsing halos, oversized shadows, fixed content heights, or blanket descendant overrides. Functional borders, such as kanban drop targets, may remain on the containing surface.

### 5.11 Standard Textarea

Use `Textarea` from `@/components/ui/textarea` for descriptions, purposes, notes, explanations, and other multiline form values. It follows the shared Input border, radius, 13px typography, theme colors, disabled state, and one-pixel focus treatment. Keep only meaningful size or resize overrides at the callsite; do not restate border, background, text, or focus styling.

```jsx
import { Textarea } from "@/components/ui/textarea"

<Textarea
  id="office-description"
  value={description}
  onChange={(event) => setDescription(event.target.value)}
  rows={3}
  placeholder="Describe this office's purpose and responsibilities."
/>
```

### 5.12 Shared Input Variants

`Input` from `@/components/ui/input` is the standard single-line control. Use `variant="floating"` only inside the merged field shell where an overlaid label floats on focus or value; this variant owns its transparent, borderless field geometry so global CSS must not force its dimensions. Use `variant="verification"` for one-time codes that may also accept recovery codes or keys; it keeps the shared rounded geometry and one-pixel focus treatment while centering and spacing the value. Keep labels associated with their inputs and preserve the standard disabled and invalid states.

```jsx
<Input variant="floating" id="email" placeholder=" " />
<Input variant="verification" id="verificationCode" autoComplete="one-time-code" />
```

### 5.13 Selectable Cards, Icon Tiles & Preset Chips

All selectable cards, preset cards, checklist cards, icon picker tiles, and preset filter/suggestion chips across dashboards, modals, and sheets must use the single **Crisp Outline & Soft Gray Surface** selection standard instead of competing solid black fills or maroon borders:

- **Selected State**: `border-gray-950 dark:border-white bg-gray-100/80 dark:bg-zinc-800 text-gray-950 dark:text-zinc-50 shadow-xs ring-1 ring-black/10 dark:ring-white/20`
- **Unselected State**: `border-border dark:border-border bg-white dark:bg-zinc-900/40 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800/60`
- **Inner Index / Count Badges** (when present inside a selectable or expandable card):
  - Selected: `bg-gray-950 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs`
  - Unselected: `bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400` (or `bg-gray-200/80 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300`)

```jsx
<button
  type="button"
  onClick={() => onSelect(item.id)}
  className={cn(
    "rounded-xl border p-3.5 text-left transition-all cursor-pointer select-none",
    isSelected
      ? "border-gray-950 dark:border-white bg-gray-100/80 dark:bg-zinc-800 text-gray-950 dark:text-zinc-50 shadow-xs ring-1 ring-black/10 dark:ring-white/20"
      : "border-border dark:border-border bg-white dark:bg-zinc-900/40 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800/60"
  )}
>
  {children}
</button>
```

## 6. Standard Alert & Notice Banners (Edge-to-Edge Line Attached)

Use `@/components/shared/NoticeBanner` with `tone="info|warning|success|danger"`, an optional `action`, and a stable entity-specific `dismissKey` for session persistence. Existing parent-owned dismissal can use `onDismiss` instead. Place the component directly in the unpadded card/sheet/dialog shell between content tiers, not inside the padded form body. It supplies direct Hugeicons, semantic status/alert roles, shared colors, and an accessible dismiss control. Structured fields, guardian details, previews, and verification panels remain form/data groups.

Alert and warning banners must never float as disconnected island cards (`mx-5 my-3.5 rounded-xl border`) inside cards or forms. Instead, all context notices, warnings, and status reminders must be **attached edge-to-edge directly to container divider lines** (`border-b` underneath card/section headers, or `border-t border-b` between layout tiers), taking up the exact line/space where they are located.

### 6.1 Core Architectural Principles
1. **Edge-to-Edge Line Attachment**: Zero outer margin (`mx-0 my-0`) and zero border radius (`rounded-none`). The banner attaches directly to the header divider line (`border-b`) or content separator, spanning the full 100% width of the card.
2. **Snug Line Padding**: Use `px-5 sm:px-6 py-2.5` to maintain snug vertical rhythm without artificial layout blowout.
3. **Typography & Strong Lead**: Always lead with a bold category label (e.g., `Archived Department Notice:`, `Rescan / Replacement Mode Active:`, `Pending Post-Event Compliance:`) in high-contrast text (`text-amber-950 dark:text-amber-100 font-semibold`), followed by concise message copy (`text-[11.5px] sm:text-xs leading-normal`).
4. **Leading Status Icon**: 16px Hugeicons component (`size={16}`, `shrink-0`) matching the banner theme.
5. **Direct Micro-Actions**: When an immediate remedy is available (e.g. `Restore`, `Replace Document`, `View Copy`), provide a compact micro-button (`h-7 px-2.5 text-[11px] font-semibold rounded-lg shadow-2xs active:scale-95`).
6. **Dismissable Interaction**: Use the shared `NoticeBanner` dismiss control, which includes an accessible Hugeicons cancel symbol and session persistence when given a `dismissKey`.

### 6.2 Color Palette Variants

| Variant | Container Classes | Icon & Accent | Usage |
|---|---|---|---|
| **Warning / Amber** | `border-b border-amber-200/90 bg-amber-50/90 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200` | `AlertCircleIcon` with amber foreground | Archived department notice, rescan replacement mode, ticket duplicates, missing compliance |
| **Success / Emerald** | `border-b border-emerald-200/90 bg-emerald-50/90 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200` | `CheckmarkCircle02Icon` with emerald foreground | Verified officer authorization, active system synchronization, verified credential status |
| **Information / Blue** | `border-b border-blue-200/90 bg-blue-50/90 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/25 dark:text-blue-200` | `InformationCircleIcon` with blue foreground | Operational advisories, maintenance schedules, read-only mode alerts |
| **Destructive / Rose** | `border-b border-rose-200/90 bg-rose-50/90 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-200` | `AlertCircleIcon` with rose foreground | Rejection reasons, revoked credentials, severe security restriction warnings |

### 6.3 Canonical Code Blueprint (Dismissable Line-Attached Alert)

```jsx
import { AlertCircleIcon, Cancel01Icon } from "hugeicons-react";

{/* Attached edge-to-edge dismissable alert taking the line */}
{isNoticeActive && !isNoticeDismissed && (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/90 bg-amber-50/90 dark:border-amber-900/40 dark:bg-amber-950/25 px-5 sm:px-6 py-2.5 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in transition-all">
    {/* Left: Icon & Typographic Notice */}
    <div className="flex items-center gap-2.5 min-w-0">
      <AlertCircleIcon size={16} aria-hidden="true" className="shrink-0 text-amber-600 dark:text-amber-400" />
      <span className="font-medium text-[11.5px] sm:text-xs leading-normal">
        <strong className="font-semibold text-amber-950 dark:text-amber-100">
          Archived Department Notice:
        </strong>{" "}
        This department is currently archived. Its features cannot be modified while it is archived. Restore this department in <strong className="font-semibold text-amber-950 dark:text-amber-100">Departments & Stations</strong> to change feature access.
      </span>
    </div>

    {/* Right: Quick Action & Dismiss Button */}
    <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 text-[11px] font-semibold shrink-0 cursor-pointer transition-colors shadow-2xs flex items-center justify-center active:scale-95"
        >
          Restore
        </button>
      )}
      <button
        type="button"
        onClick={handleDismissNotice}
        className="shrink-0 p-1 rounded-lg text-amber-700 hover:text-amber-950 hover:bg-amber-100/80 dark:text-amber-400 dark:hover:text-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
        aria-label="Dismiss notice"
        title="Dismiss notice"
      >
        <Cancel01Icon size={16} aria-hidden="true" />
      </button>
    </div>
  </div>
)}
```

---

## 7. Color Tokens & Brand Styles

| Token / Class | Hex / Equivalent | Purpose |
|---|---|---|
| `pup-maroon` / `--brand-accent` | Role-dependent, fallback `#800000` | PUP accents and role-themed primary buttons; pair with `--brand-foreground` |
| `pup-darkMaroon` | `#5a0000` | Maroon hover states and accents |
| `variant="success"` | Emerald 700 | Success confirmations and restore actions |
| `bg-white dark:bg-card` | `#FFFFFF` / `#18181B` | Unified card and modal backgrounds |
| `border-gray-200 dark:border-white/10` | Neutral 200 / 10% white | Standard hairline borders |
| `text-gray-900 dark:text-zinc-50` | Slate 900 / Zinc 50 | Primary high-contrast text |
| `text-gray-500 dark:text-zinc-400` | Gray 500 / Zinc 400 | Subtitles, helper text, and secondary metadata |

---

## 8. Pre-Commit Component Checklist for Agents

Before finalizing any new page, tab, or modal, verify the following:

- [ ] **No Header Icon in Dialogs**: Are `DialogHeader`s completely free of icon wrappers and decorative svgs?
- [ ] **Clear Button Labels**: Do primary actions use a verb plus specific noun (`Save Changes`, `Submit Request`) while dismissal/navigation use concise labels (`Cancel`, `Close`, `Back`, `Done`)?
- [ ] **No Static Icons on Primary Buttons**: Does the main action button have clean text without leading plus/trash icons?
- [ ] **Border Radius Standards**: Outer cards are `rounded-2xl`, inputs & buttons are `rounded-xl`, small items are `rounded-lg`.
- [ ] **Secondary Button Outlines**: Dismissal buttons use `variant="outline"` with a crisp border, not borderless ghost.
- [ ] **Selective Refresh**: Does this screen need to reload data changed by other people or background work? If yes, use `<RefreshButton />`; otherwise omit a refresh control.
- [ ] **Standard Search Input with Live Count**: Does the search bar include a leading Hugeicons magnifying glass with focus color transition, generous padding (`pl-8 pr-16`), a trailing live count badge (`text-[11px] font-sans tabular-nums pointer-events-none`), and an inline Hugeicons clear button?
- [ ] **Edge-to-Edge Line-Attached Alerts**: Are alert/warning banners attached directly to container divider lines (`border-b` / `border-t`, zero outer margins `mx-0`, no floating `rounded-xl` island cards) taking up the line space edge-to-edge?
- [ ] **Dark Mode Parity**: Are dark variants (`dark:border-white/10`, `dark:bg-card`, `dark:text-zinc-50`) present on all containers?
- [ ] **Table Contract**: Does every table use section 9's shared primitives, density, column kinds, action width, truncation, and pagination? Do skeletons match the live columns?

---

## 9. Tables: Layout, Density, Content, and Pagination

This is the canonical table contract for every portal, including embedded tables, import previews, audit logs, compliance tables, matrices, and loading skeletons. Existing workflows, authorization, filters, data fetching, and record selection remain owned by their feature.

### 9.1 Shared Components and Page Anatomy

Use `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableText`, `IdentifierBadge`, and `TableStatus` from `@/components/ui/table`. `Table` renders a semantic table without adding another card border or scroll container.

Use this order inside the existing card:

1. Page title and primary actions.
2. Scope tabs or category tabs, when present.
3. One `DataViewToolbar` line for data controls, preserving the live search-result count. Keep this exact left-to-right order: **search → view options → combined filters → date shortcuts/date pickers → horizontal-scroll controls (only when the table overflows)**. Omit absent controls without changing the order of the rest. Do not split those controls into a second toolbar row. On narrow screens, the same row scrolls horizontally; individual controls keep their natural width. Row density is a single account preference in Account Settings, not a per-table toolbar control.
4. Active filter chips directly below the toolbar, when present.
5. A single horizontally scrollable table viewport.
6. `TablePagination`, outside the content viewport and attached to the card's bottom content boundary.

Keep the card `min-w-0`, `rounded-2xl`, and themed, with one outer border. Table headers, row dividers, hover colors, and focus states come from the shared table system. Do not reintroduce global `th`/`thead` overrides or important typography rules. Preserve high-contrast mode.

`DataViewToolbar` from `@/components/shared/DataViewToolbar` provides the shared, single-line control region. It accepts `children`, `label`, and `className`. Put search, view selectors, combined filters, date controls, and `TableScrollControls` in this same component in the order above. Give `TableScrollControls` the scroll viewport ref; it measures overflow and stays hidden when all columns fit. Its left/right buttons disable at their respective scroll edges. Do not add density selectors to table toolbars. Short static dialog tables inherit the saved density without a separate selector. Active-filter chips remain immediately below the toolbar and above the table viewport.

### 9.2 Row Density

Use the label **Row density**, with these exact names and values:

| Value | UI label | Minimum body-row height | Cell vertical padding |
|---|---|---:|---:|
| `compact` | Compact | 40px | 4px |
| `normal` | Normal | 52px | 8px |
| `comfortable` | Comfortable | 64px | 12px |

Expose the shared `TableDensityControl` once in Account Settings → Preferences. The selected value is stored per authenticated user and principal type, updates mounted tables together, and survives navigation and reload. Tables use Normal when the setting is missing or invalid. Do not place density controls beside individual tables.

Normal is the default. Header rows are 40px in every density. Heights are CSS pixels before application zoom. Multiline cells, touch controls, and existing secondary information may increase a row's height; never clip or hide useful details to force a preset. Expanded rows and spanning empty/error states size naturally.

`TablePreferencesProvider` sits above the portals. `useTablePreferences()` returns `{ density, setDensity, ready }`. One browser preference applies to every table and skeleton for the authenticated person. The storage key includes staff/student principal type and user ID; do not add a global fallback that shares another account's setting. Invalid values default to Normal. Storage failures retain a usable in-memory setting. Other tabs synchronize through browser storage events. No account-preferences endpoint or database field is required.

`Table` accepts a `density` override for isolated previews; production data tables inherit the user's setting.

### 9.3 Column Declaration and Alignment

Declare the ordered columns on `Table` using semantic kinds. An entry is a kind string or `{ kind, width, maxWidth, align }`. Numeric widths are CSS pixels. Header and body cells receive the same alignment and control widths.

| Kind | Data | Alignment | Presentation |
|---|---|---|---|
| `selection` | Row checkbox or expansion control | Center | Fixed 48px |
| `identifier` | Student number, staff ID, request/ticket ID, record code | Left | Neutral identifier badge |
| `text` | Names, titles, descriptions, filenames, locations | Left | Primary/secondary text hierarchy |
| `date` | Timestamps and dates | Left | App font; aligned digits where useful |
| `status` | Workflow or account state | Center | Shared semantic status badge |
| `year` | Year, batch, academic year | Center | Plain text |
| `category` | Short classification or matrix control | Center | Existing meaningful classification/control |
| `number` | Counts, bytes, totals, percentages | Right | Plain text with aligned digits |
| `actions` | Record actions | Center | Fixed 48px; one button or menu |

Keep sort controls aligned with their header's data. Sorting remains feature-owned; expose `aria-sort` on sortable headers. Do not use badges for ordinary quantities. Identifiers remain left-aligned even when mostly numeric.

The shared `Table` accepts native structural children (`thead`, `tbody`, `tr`, `th`, `td`) as a migration adapter and applies the declared column contract. New code should use the shared primitives. Custom components returning rows must render `TableRow`; custom header components must render `TableHead` and forward their `tableColumn` prop. Keep column declarations synchronized with conditional and repeated columns. Do not infer semantic kinds from displayed headings.

### 9.4 Sizing, Sticky Columns, and Truncation

- Ordinary record tables use content-aware layout at `w-full`; the browser distributes available width from content and column count. Declare suitable minimum table widths and retain a single `overflow-x-auto` viewport. Toolbars and pagination must not scroll horizontally with the data.
- Selection and action columns are exactly **48px** in both header and body. The Actions heading is visually hidden but available to assistive technology. Do not add outer-cell padding that expands the column.
- The action column sticks to the right. Sticky headers and identity columns must have opaque theme-aware backgrounds, appropriate stacking, and matching column offsets.
- Keep short categorical, year, and numeric columns content-sized. Use `{ kind: "text", maxWidth: 340 }` for designated long-text fields. These columns can use available width up to **340px**, then truncate at the cell boundary. This is a cap, not a universal width for every column.
- `TableText` uses `w-full min-w-0 truncate`. Keep every intervening flex/grid wrapper shrinkable. Remove nested arbitrary text caps such as `max-w-[120px]` that truncate before the actual column border.
- Use an ellipsis for single-line names, emails, titles, filenames, and identifiers. Provide the full value through the existing detail view or an accessible tooltip. Do not rely on a mouse-only title for information that has no other accessible path.
- Preserve existing secondary lines. Use the same app font for identifiers and timestamps; never introduce monospace.
- Use `layout="matrix"` for repeating requirement/office columns. Keep their explicit widths and sticky identity columns; do not collapse matrices into ordinary fixed-layout records or remove interactive document/switch controls.

### 9.5 Typography and Badges

| Element | Standard |
|---|---|
| Header | 12px / 16px, semibold |
| Primary cell text | 13px / 20px, medium |
| Secondary cell text | 12px / 16px, regular, muted |
| Identifier badge | 24px high, `rounded-lg`, 12px medium, neutral surface, `tabular-nums` |
| Status badge | Minimum 24px high, `rounded-full`, 12px medium, semantic tone |
| Missing value | `N/A` |

`TableStatus` preserves the domain label. Approved/active/completed states use success, declined/rejected/error states use danger, pending/warning states use warning, and processing/ready states use info. Archived, cancelled, and unfamiliar states use neutral. Pass an explicit `tone` when the domain's meaning requires one. Color must be accompanied by a readable status label.

### 9.6 Row Actions

Use `TableActions` with an `actions` array containing `{ label, icon, onClick, disabled }` entries; entries may be omitted conditionally to preserve permissions. A single action renders directly with a tooltip. Two or more actions render a single horizontal triple-dot menu trigger. The action column has no visible heading; its visually hidden heading remains “Actions” for assistive technology. The migration adapter also accepts existing native/Button controls and their Tooltip labels, preserving handlers and disabled state.

Desktop controls are 28×28px, `rounded-lg`, with explicit 16px Hugeicons. Coarse-pointer targets are 44×44px inside the same 48px column. Icon-only controls require accessible names, tooltips, and visible focus. Menu keyboard navigation, Escape, and focus return must work. Action interactions must not trigger row navigation, expansion, or selection. Destructive actions retain their existing confirmation.

### 9.6.1 Row Selection

Use `TableRow selected={isSelected}` when selection is managed separately from a checkbox. A row may also derive its selected state from a checked checkbox in a declared `selection` cell. Select All applies the existing page and eligibility scope in one state update. The selected surface covers every cell, including sticky identity and action cells, in the same render. Do not stagger cell backgrounds or leave sticky cells on the unselected surface.

### 9.7 Pagination

Use `TablePagination` from `@/components/shared/TablePagination` for every paginated table, card grid, or list:

| Prop | Meaning |
|---|---|
| `page`, `pageSize` | Controlled current page and rows per page; default 1 and 10 |
| `totalCount` | Total filtered result count, including server-side totals |
| `displayedCount` | Optional number of loaded rows on this page |
| `onPageChange(page)` | Feature's page setter/navigation callback |
| `onPageSizeChange(size)` | Feature's rows-per-page callback |
| `loading` | Disables navigation while a request is pending |
| `label` | Entity-specific accessible navigation label |
| `borderless` | Removes the table-footer divider for dialog/sheet placement |

The footer shows **Showing X–Y of Z**, **Rows: 10 / 20 / 50 / 100**, and **Prev / current page / Next**. The empty result is **Showing 0 of 0**, on page 1 with both navigation buttons disabled. The page indicator's accessible name includes the total page count. Range counts use the filtered total, never the original unfiltered count.

Reset page to 1 when filters or page size change. Clamp out-of-range pages after deletion or a shrinking result set. Disable interaction during loading and prevent stale requests from updating newer results. Keep existing URL navigation and server limit/offset behavior. Table, card, and list views for the same collection share the same page, page size, range, and footer. Keep the footer visible for empty paginated results when the feature is not loading or in an error state. Small static collections and small static tables do not need artificial pagination.

`LogPagination` and `BackupPagination` are compatibility adapters over this component. `SheetPagination` shares `PageControls` and `PageSizeControls` while preserving divider-free sheet spacing and compact record-to-record navigation. Do not duplicate footer markup.

### 9.8 Record Table Example

```jsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableText } from "@/components/ui/table";
import DataViewToolbar from "@/components/shared/DataViewToolbar";
import TableScrollControls from "@/components/shared/TableScrollControls";
import TablePagination from "@/components/shared/TablePagination";
import { ViewIcon } from "hugeicons-react";

<div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-white dark:bg-card">
  <DataViewToolbar label="Student search and filters" className="border-b border-border px-6 py-3">
    {searchInput}
    {viewOptions}
    {combinedFilters}
    {dateControls}
    <TableScrollControls {...scrollControls} scrollContainerRef={tableContainerRef} />
  </DataViewToolbar>
  {activeFilters}
  <div ref={tableContainerRef} className="min-w-0 overflow-x-auto">
    <Table columns={["identifier", { kind: "text", maxWidth: 340 }, "year", "status", "number", "actions"]} className="min-w-[800px]">
      <TableHeader>
        <TableRow><TableHead>Student No.</TableHead><TableHead>Full Name</TableHead><TableHead>Year</TableHead><TableHead>Status</TableHead><TableHead>Files</TableHead><TableHead>Actions</TableHead></TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.studentNo}>
            <TableCell>{row.studentNo}</TableCell>
            <TableCell><TableText>{row.name}</TableText></TableCell>
            <TableCell>{row.year || "N/A"}</TableCell>
            <TableCell>{row.status || "N/A"}</TableCell>
            <TableCell>{row.fileCount}</TableCell>
            <TableCell><button type="button" aria-label="View Student" onClick={() => openStudent(row)}><ViewIcon size={16} aria-hidden="true" /></button></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
  <TablePagination label="Student pages" page={page} pageSize={pageSize} totalCount={total} displayedCount={rows.length} onPageChange={setPage} onPageSizeChange={setPageSize} loading={loading} />
</div>
```

### 9.9 Loading, Empty, Error, and Verification

Skeletons use `Table` and the same semantic column order, control widths, minimum table width, sticky offsets, and inherited density as live data. Do not hardcode a separate skeleton row height or render multiple action placeholders in a 48px column.

Preserve specific no-records, no-matches, loading, and error states from section 5.10. Spanning state/detail rows are exempt from ordinary data-row height. Keep the pagination footer visible for an empty paginated result; show recovery actions where relevant.

Verify every changed table in both themes and high contrast, at desktop and mobile widths and application zoom. Include long/unbroken text, missing fields, large counts, partial and empty pages, density persistence/account isolation, keyboard actions, selection, sticky intersections, and request races. Run `node --test test/table-presentation.test.mjs test/table-inventory.test.mjs` and `node e2e/table-standards.browser.mjs` for shared behavior, then the relevant feature checks and production build. The inventory check rejects native tables outside the primitive, missing column declarations, and mismatched static headers.

---

## 10. Notification & Toast Standards (`sonner` / `rms-toast`)

All in-app alerts and notifications displayed via `@/components/ui/sonner` must adhere to these Apple-inspired physical standards:

### 10.1 Desktop Max-Width & Responsive Bounds
- **Standard Width**: Constrained to `max-width: min(620px, calc(100vw - 32px))`.
- **Purpose**: Provides ~510px of readable horizontal text width, allowing 2–3 sentence phrases in Plus Jakarta Sans to comfortably fit in 2 to at most 3 clean lines without awkward word breaks.
- **Mobile Viewports**: Safely constrained by `calc(100vw - 32px)` with 16px margins on each side.

### 10.2 Adaptive Geometry: Capsule Pill vs. Apple Card Squircle
- **Single-Line Status Alerts** (e.g. *"Record updated successfully"*):
  - Retain the sleek horizontal capsule pill with `rounded-full` and `items-center` (height ~44px).
- **Multi-Sentence & Descriptive Alerts** (when a `description` exists or title exceeds 70 characters / spans multiple sentences):
  - Adapt geometry to a squircle card with `.is-card` and `rounded-2xl sm:rounded-[20px]`.
  - Align elements with `items-start` (`p-3 sm:p-3.5 px-4`) so status icons and dismiss buttons anchor to the top header line rather than floating awkwardly in the vertical midpoint.
  - This eliminates the "bloated capsule" distortion where tall multi-line toasts produce giant semicircular corner gaps.

### 10.3 Long Technical Identifiers & Delimiter Line-Breaking
- **The Issue**: Under Unicode Line Breaking Algorithm (UAX #14) rules, browsers treat a hyphen followed by a digit (e.g. `-2026-11-07`) as an unbreakable negative number prefix. Long compound tokens (e.g. backup package filenames like `PUP-SYSTEM-GOVERNANCE-BACKUP-2026-11-07...`, UUIDs, hashes) fail to wrap after digits, causing the layout engine to push the entire 50+ character block to the next line and leaving a large empty void on the line before it.
- **The Solution**: Toast titles and descriptions pass through `renderBreakableText`, which inserts native `<wbr />` line-break opportunities after technical delimiters (`-`, `_`, `.`, `/`) in tokens longer than 12 characters, backed by `overflow-wrap: anywhere` on `.rms-toast`. This allows lines to wrap naturally at logical boundaries, eliminates empty gaps on preceding lines, and preserves clipboard purity when copied.
