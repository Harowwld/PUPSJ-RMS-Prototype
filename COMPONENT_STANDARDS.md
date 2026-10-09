# Component Styling & Design System Standards Guide

This guide establishes the mandatory UI/UX standards, component blueprints, and styling patterns for the **PUPSJ Records Management System**. All agents and engineers developing new features must follow these patterns to preserve visual harmony, Apple Human Interface Guidelines (HIG) compliance, and consistent interaction behaviors across portals.

---

## 1. Core Visual Principles & Hierarchy

1. **Quiet, Apple-Inspired Clarity**: Avoid decorative clutter, artificial card glows, AI-generated purple/blue gradients, and unnecessary iconography.
2. **Text-Only Primary Action Buttons**: Primary buttons must lead with clear action text (e.g. `Save`, `Register`, `Submit`). Never put static leading icons on primary action buttons.
3. **No Icons in Modal Headers**: Dialog headers must be clean and typographic. Do not place decorative icon boxes (such as 48×48px squircles with duotone icons) in `DialogHeader`.
4. **Action-Only Words for Buttons & Dialogs**: Use succinct, unambiguous verbs (`Save`, `Restore`, `Submit`, `Update`, `Cancel`, `Close`, `Done`). Do not use verbose phrases or sentences (`Skip for Now`, `Click here to save`, `Save Changes`, `Submit Feedback`).

---

## 2. Border Radius Token Hierarchy

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
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              Field Label <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Value"
              className="h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon shadow-xs"
            />
          </div>
        </div>

        {/* 4. Footer: Action-only words, outlined cancel, text-only primary confirm */}
        <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="h-10 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={isLoading}
            className="h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white! shadow-xs cursor-pointer active:scale-95 disabled:opacity-50 transition-all border-0"
          >
            {isLoading ? "Saving..." : "Save"}
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

### 3.3 Modal Golden Rules
- **NEVER** insert `<div className="w-12 h-12 rounded-xl border flex items-center justify-center ..."><HugeIcon ... /></div>` into `DialogHeader`.
- **NEVER** prepend icons to `DialogTitle` (e.g. `<HugeIcon className="ph-fill ph-warning" /> Alert Title`).
- Keep header titles between `15px` and `17px` (`text-[16px] font-semibold tracking-[-0.01em]`).
- Keep descriptions at `text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-1`.
- For global confirmation dialogs, always use `<ConfirmModal />`, which natively enforces Apple styling and icon-free headers.

---

## 4. Buttons & Interaction Standards

### 4.1 Primary Action Buttons
- **Style**: Text-only, bold or semibold, `rounded-xl`.
- **Colors**: Brand Maroon (`btn-brand-red`), Emerald (`btn-brand-green`), or Destructive Red (`bg-red-600 hover:bg-red-700`).
- **Icons**: Permitted **only** during loading or processing states (e.g. `<HugeIcon className="ph-bold ph-spinner animate-spin" />`).
```jsx
// Correct
<Button className="h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white! shadow-xs cursor-pointer active:scale-95 transition-all border-0">
  {isLoading ? <HugeIcon className="ph-bold ph-spinner animate-spin text-sm" /> : "Register Student"}
</Button>

// Incorrect (DO NOT ADD STATIC LEADING ICONS)
<Button ...>
  <HugeIcon className="ph-bold ph-plus" /> Register Student
</Button>
```

### 4.2 Secondary / Dismissal Buttons
- **Style**: Outlined (`variant="outline"`), `rounded-xl`, clear border.
- **Copy**: Single action-only word (`Cancel` or `Close`).
```jsx
<Button
  variant="outline"
  onClick={onClose}
  className="h-10 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
>
  Cancel
</Button>
```

### 4.3 Universal Header Refresh Action
Never use a text button that says "Refresh". Use the project's squircle `<RefreshButton />`:
```jsx
import RefreshButton from "@/components/shared/RefreshButton";

<RefreshButton onRefresh={fetchData} isLoading={isLoading} title="Refresh Records" />
```
Renders an accessible 40×40px `rounded-xl` icon-only squircle with hover feedback and spinning indicator.

### 4.4 Table / Row Inline Actions
For row-level table actions, use compact `rounded-lg` buttons:
```jsx
<button
  type="button"
  onClick={() => handleEdit(row)}
  className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors flex items-center justify-center border-0 bg-transparent cursor-pointer active:scale-95"
  title="Edit"
>
  <HugeIcon className="ph-bold ph-pencil-simple text-sm" />
</button>
```

---

## 5. Form Controls, Inputs & Selectors

### 5.1 Labels & Text Inputs
```jsx
<div>
  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
    Full Name <span className="text-red-500">*</span>
  </label>
  <Input
    type="text"
    placeholder="e.g. Dela Cruz, Juan"
    value={name}
    onChange={(e) => setName(e.target.value)}
    className="h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon shadow-xs"
  />
</div>
```

### 5.2 Dropdown `<Select>`
Always use `@/components/ui/select`:
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
  <div className="w-14 h-8 rounded-lg bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-white/10 flex items-center justify-center font-mono text-xs font-semibold text-gray-900 dark:text-zinc-100">
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
import HugeIcon from "@/components/shared/HugeIcon";

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
                <HugeIcon className="ph-bold text-[15px] ph-chart-pie-slice" />
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
              <HugeIcon
                className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-gray-400 dark:hover:text-zinc-500 text-gray-300 dark:text-zinc-700 text-lg mb-0.5 shrink-0"
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
- **Icon Tile**: Squircle `w-9 h-9 rounded-xl` with category-specific Phosphor icon (e.g. `ph-identification-card`, `ph-graduation-cap`, `ph-certificate`, `ph-shield-check`).
- **Typography**: Clean title `text-[13.5px] font-semibold text-gray-900 dark:text-zinc-100 line-clamp-1`, description clamped at 2 lines (`text-[11.5px] text-gray-500 min-h-[34px]`).
- **Callout Micro-Banner**: Clean inset box (`rounded-xl p-2.5 border text-[11px]`) for submission channel or digital archive confirmation.
- **Footer**: Location indicator on left, interactive detail popover trigger on right (`Popover` with instructions and audit timestamps).

---

## 6. Color Tokens & Brand Styles

| Token / Class | Hex / Equivalent | Purpose |
|---|---|---|
| `pup-maroon` / `btn-brand-red` | `#800000` | PUP Primary Maroon, header highlights, primary brand actions |
| `pup-darkMaroon` | `#5a0000` | Maroon hover states and accents |
| `btn-brand-green` | `#107C41` / Emerald | Success confirms, restore actions, active verification badges |
| `bg-white dark:bg-card` | `#FFFFFF` / `#18181B` | Unified card and modal backgrounds |
| `border-gray-200 dark:border-white/10` | Neutral 200 / 10% white | Standard hairline borders |
| `text-gray-900 dark:text-zinc-50` | Slate 900 / Zinc 50 | Primary high-contrast text |
| `text-gray-500 dark:text-zinc-400` | Gray 500 / Zinc 400 | Subtitles, helper text, and secondary metadata |

---

## 7. Pre-Commit Component Checklist for Agents

Before finalizing any new page, tab, or modal, verify the following:

- [ ] **No Header Icon in Dialogs**: Are `DialogHeader`s completely free of icon wrappers and decorative svgs?
- [ ] **Action-Only Button Labels**: Are buttons labeled with single action words (`Save`, `Submit`, `Cancel`, `Done`, `Close`)?
- [ ] **No Static Icons on Primary Buttons**: Does the main action button have clean text without leading plus/trash icons?
- [ ] **Border Radius Standards**: Outer cards are `rounded-2xl`, inputs & buttons are `rounded-xl`, small items are `rounded-lg`.
- [ ] **Secondary Button Outlines**: Dismissal buttons use `variant="outline"` with a crisp border, not borderless ghost.
- [ ] **Universal Refresh Squircle**: Is data refresh handled via `<RefreshButton />` instead of a text "Refresh" button?
- [ ] **Dark Mode Parity**: Are dark variants (`dark:border-white/10`, `dark:bg-card`, `dark:text-zinc-50`) present on all containers?
