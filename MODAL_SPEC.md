# Standard Modal System Specification

This document defines the consistent design patterns for all modals in the PUPSJ RMS Prototype.

---

## 1. Modal Type Specifications

| Feature | Information (Info) | Form Entry (Edit/Create) | High-Stakes Action (Delete/Destructive) |
| :--- | :--- | :--- | :--- |
| **Header Icon** | `ph-duotone ph-info` / `ph-file-pdf` / `ph-scanner` | `ph-duotone ph-pencil-line` / `ph-user-gear` | `ph-duotone ph-warning-circle` |
| **Icon Style** | Blue/Amber/Brand (`bg-blue-50 text-blue-600`, `bg-amber-50 text-amber-600`, `bg-red-50 text-pup-maroon`) | Brand (`bg-red-50 text-pup-maroon border-red-100`) | Danger (`bg-red-50 text-red-600 border-red-100`) |
| **Header Title** | Action-oriented (e.g., "Export Complete", "Preview Document") | Task-oriented (e.g., "Edit Profile", "Create Document Type") | Result-oriented (e.g., "Delete Staff Member", "Confirm Deletion") |
| **Description** | Context + Consequence (< 120 chars) | Purpose + Location (< 120 chars) | Loss + Reversibility (< 120 chars) |
| **Visual Hierarchy** | Single Primary (Right) or None | Secondary + Primary (Right) | Secondary + Destructive (Right) |
| **Primary Action** | Brand / Neutral / Link | Brand (PUP Maroon #800000) | Destructive (Red #DC2626) |
| **A11y** | ARIA-describedby, Focus Trap | ARIA-labelledby, First-field Focus | ARIA-describedby, Focus Trap |

---

## 2. Universal Modal Structure

All modals use the shadcn/ui `Dialog` component with this consistent structure:

```jsx
<Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
  <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
    {/* Header */}
    <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm flex items-center justify-center shrink-0">
          <i className="ph-duotone ph-icon-name text-2xl"></i>
        </div>
        <div className="min-w-0">
          <DialogTitle className="text-lg font-black tracking-tight text-gray-900 leading-tight">
            Modal Title
          </DialogTitle>
          <DialogDescription className="text-sm font-medium mt-1.5 text-gray-600 leading-relaxed">
            Description text here.
          </DialogDescription>
        </div>
      </div>
    </DialogHeader>

    {/* Content Body */}
    <div className="p-6">
      {/* Form fields, messages, or other content */}
    </div>

    {/* Footer */}
    <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
      <Button variant="outline" className="h-11 px-6 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand">
        Cancel
      </Button>
      <Button className="h-11 px-6 bg-pup-maroon text-white hover:bg-red-900 shadow-sm font-bold rounded-brand">
        Confirm
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

---

## 3. Size Variants

| Size | Class | Use Case |
|------|-------|----------|
| **Small** | `sm:max-w-sm` | Simple confirmations, alerts |
| **Standard** | `sm:max-w-md` | Forms, prompts, most modals |
| **Large** | `sm:max-w-lg` | OCR resolution, multi-option lists |
| **Extra Large** | `sm:max-w-2xl` | Account setup wizard |
| **Full Width** | `w-[96vw] max-w-[96vw] xl:max-w-[1400px] h-[88vh]` | PDF Preview, large content |

---

## 4. Icon Style Variants

### 4.1 Brand/Form Icon (Default for edit/create)
```jsx
<div className="w-12 h-12 rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm flex items-center justify-center shrink-0">
  <i className="ph-duotone ph-pencil-line text-2xl"></i>
</div>
```

### 4.2 Info/Neutral Icon
```jsx
<div className="w-12 h-12 rounded-full border border-blue-100 bg-blue-50 text-blue-600 shadow-sm flex items-center justify-center shrink-0">
  <i className="ph-duotone ph-info text-2xl"></i>
</div>
```

### 4.3 Warning Icon
```jsx
<div className="w-12 h-12 rounded-full border border-amber-100 bg-amber-50 text-amber-600 shadow-sm flex items-center justify-center shrink-0">
  <i className="ph-duotone ph-warning text-2xl"></i>
</div>
```

### 4.4 Danger/Destructive Icon
```jsx
<div className="w-12 h-12 rounded-full border border-red-100 bg-red-50 text-red-600 shadow-sm flex items-center justify-center shrink-0">
  <i className="ph-duotone ph-warning-circle text-2xl"></i>
</div>
```

---

## 5. Button Patterns

### 5.1 Cancel/Secondary Button
```jsx
<Button
  type="button"
  variant="outline"
  onClick={onCancel}
  className="h-11 px-6 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand"
  disabled={isLoading}
>
  Cancel
</Button>
```

### 5.2 Primary/Brand Button
```jsx
<Button
  type="button"
  onClick={onConfirm}
  className="h-11 px-6 bg-pup-maroon text-white hover:bg-red-900 shadow-sm font-bold flex items-center gap-2 rounded-brand"
  disabled={isLoading}
>
  <i className="ph-bold ph-check text-lg"></i>
  {isLoading ? "Processing..." : "Confirm"}
</Button>
```

### 5.3 Destructive Button
```jsx
<Button
  type="button"
  variant="destructive"
  onClick={onConfirm}
  className="h-11 px-6 bg-red-600 hover:bg-red-700 text-white shadow-sm font-bold flex items-center gap-2 rounded-brand"
  disabled={isLoading}
>
  <i className="ph-bold ph-trash text-lg"></i>
  {isLoading ? "Processing..." : "Delete"}
</Button>
```

---

## 6. Form Input Patterns (For Form Modals)

### 6.1 Standard Input
```jsx
<label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
  Field Label <span className="text-pup-maroon">*</span>
</label>
<Input
  type="text"
  className="h-11 bg-white border border-gray-300 rounded-brand text-sm focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
  placeholder="Placeholder text"
  required
/>
```

### 6.2 Textarea (Multiline)
```jsx
<textarea
  className="flex w-full h-24 rounded-brand border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon min-h-[96px] transition-all"
  placeholder="Enter text..."
/>
```

### 6.3 Select Dropdown
```jsx
<select
  className="h-12 w-full rounded-brand border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon"
>
  <option value="" disabled>Select...</option>
  {/* options */}
</select>
```

### 6.4 Error Display
```jsx
{error && (
  <div className="mt-3 p-3 rounded-brand border border-red-200 bg-red-50 text-red-800 text-sm font-bold flex items-center gap-2">
    <i className="ph-bold ph-warning-circle text-lg"></i>
    {error}
  </div>
)}
```

---

## 7. Special Modal Patterns

### 7.1 PDF Preview Modal (Full-Size)
```jsx
<DialogContent className="w-[96vw] max-w-[96vw] xl:max-w-[1400px] h-[88vh] p-0 flex flex-col overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
  <DialogHeader className="p-5 border-b border-gray-100 bg-gray-50/50">
    {/* Standard header with PDF icon */}
  </DialogHeader>
  <div className="flex-1 bg-gray-100 p-0 flex flex-col overflow-hidden relative">
    {/* PDF iframe or content */}
  </div>
</DialogContent>
```

### 7.2 Wizard/Stepped Modal (Account Setup)
- Use sidebar tabs with step indicators
- Each step has its own `DialogHeader`
- Footer actions at bottom of each step
- Non-dismissible (`hideClose` prop on DialogContent)

### 7.3 Selection List Modal (OCR Resolution)
- Radio button cards with highlighted selection state:
```jsx
<label className={`flex items-start gap-3 rounded-brand border p-3 cursor-pointer transition-colors ${
  checked
    ? "border-pup-maroon bg-red-50/60"
    : "border-gray-200 bg-white hover:bg-gray-50"
}`}>
  <input type="radio" checked={checked} />
  <span className="flex-1">{/* Content */}</span>
</label>
```

---

## 8. Typography Specifications

| Element | Class | Size | Weight | Color |
|---------|-------|------|--------|-------|
| **DialogTitle** | `text-lg font-black tracking-tight text-gray-900 leading-tight` | 18px | 900 | #111827 |
| **DialogDescription** | `text-sm font-medium mt-1.5 text-gray-600 leading-relaxed` | 14px | 500 | #4B5563 |
| **Label** | `text-xs font-bold text-gray-700 uppercase tracking-wide` | 12px | 700 | #374151 |
| **Section Label** | `text-[11px] font-bold text-gray-500 uppercase tracking-widest` | 11px | 700 | #6B7280 |

---

## 9. Design Guidelines

1. **Context + Consequence Rule**: Descriptions must explicitly state what the user is doing and what will happen as a result.

2. **Action-Oriented Titles**: Titles should reflect the specific action (e.g., "Confirm Deletion" is worse than "Delete Staff Member").

3. **Destructive Cues**: High-stakes actions must use Red #DC2626 for the primary button and accompanying warning icons.

4. **Character Constraints**: All modal descriptions MUST be under 120 characters to maintain legibility and focus.

5. **Consistent Radius**: Maintain `rounded-brand` (10px) border radius across all containers and buttons.

6. **Button Height**: All modal buttons use `h-11` (44px) for consistent touch targets.

7. **Footer Layout**: Always use `flex-col-reverse sm:flex-row sm:justify-end` for responsive button stacking (Cancel on left/bottom, Confirm on right/top).

8. **Icon Size**: All header icons use `text-2xl` (24px) inside a 48px container.

9. **Spacing**: 
   - Header padding: `p-6`
   - Content padding: `p-6`
   - Footer padding: `p-4`
   - Gap between buttons: `gap-2.5`

10. **No Close Button for Forced Actions**: Use `hideClose` prop on DialogContent for mandatory modals (e.g., account setup).

---

## 10. Common Icon References

| Context | Icon Class |
|---------|------------|
| Edit/Create | `ph-duotone ph-pencil-line` |
| User/Profile | `ph-duotone ph-user-gear` |
| PDF/Document | `ph-duotone ph-file-pdf` |
| Warning | `ph-duotone ph-warning` |
| Danger/Delete | `ph-duotone ph-warning-circle` |
| Info | `ph-duotone ph-info` |
| Scanner/OCR | `ph-duotone ph-scanner` |
| Success/Check | `ph-duotone ph-seal-check` |
| Shield/Security | `ph-duotone ph-shield-check` |
| Password | `ph-duotone ph-password` |

---

*Last updated: Comprehensive modal styling specifications for consistent UI across the PUPSJ RMS Prototype.*

