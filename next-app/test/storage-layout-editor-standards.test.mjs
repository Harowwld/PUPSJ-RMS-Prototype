import { describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

describe("Storage Room Layout Editor Standards", () => {
  const editorPath = path.resolve(process.cwd(), "src/components/admin/StorageLayoutEditorTab.js")
  const sidebarPath = path.resolve(process.cwd(), "src/components/admin/storage-layout/CabinetSidebar.js")
  const canvasPath = path.resolve(process.cwd(), "src/components/admin/storage-layout/CabinetCanvas.js")
  const skeletonPath = path.resolve(process.cwd(), "src/components/admin/skeletons/StorageLayoutSkeleton.js")
  const dropdownPath = path.resolve(process.cwd(), "src/components/ui/dropdown-menu.jsx")

  it("1. Single Card Rule: CabinetSidebar does not render a nested Card", () => {
    const sidebarContent = fs.readFileSync(sidebarPath, "utf-8")
    assert.doesNotMatch(
      sidebarContent,
      /<Card[\s>]/,
      "CabinetSidebar should not render a nested <Card>"
    )
    assert.doesNotMatch(
      sidebarContent,
      /<CardHeader[\s>]/,
      "CabinetSidebar should not render <CardHeader>"
    )
  })

  it("2. Inline Metrics: PageHeader includes room, cabinet, drawer, and record count summary", () => {
    const editorContent = fs.readFileSync(editorPath, "utf-8")
    assert.match(
      editorContent,
      /totalStats\.rooms/,
      "PageHeader should include totalStats.rooms summary"
    )
    assert.match(
      editorContent,
      /totalStats\.cabinets/,
      "PageHeader should include totalStats.cabinets summary"
    )
  })

  it("3. Dedicated Room Switcher Row exists with segmented control and room stats", () => {
    const editorContent = fs.readFileSync(editorPath, "utf-8")
    assert.match(
      editorContent,
      /renderRoomSwitcher/,
      "StorageLayoutEditorTab should define renderRoomSwitcher"
    )
    assert.match(
      editorContent,
      /activeRoomCabinetCount/,
      "Room switcher should show active room cabinet count"
    )
  })

  it("4. Sleek Templates Popover Button replaces bloated 360px capsule, uses standard ArrowDown01Icon, and follows shadcn dropdown structure", () => {
    const editorContent = fs.readFileSync(editorPath, "utf-8")
    assert.doesNotMatch(
      editorContent,
      /min-w-\[360px\]/,
      "Toolbar should no longer have the bulky 360px template capsule"
    )
    assert.match(
      editorContent,
      /<span>Templates<\/span>\s*<ArrowDown01Icon/,
      "Toolbar should have a consolidated Templates button with standard ArrowDown01Icon dropdown indicator"
    )
    assert.doesNotMatch(
      editorContent,
      /Room Templates\s*<\/span>/,
      "Templates dropdown should not render a custom card header"
    )
    assert.match(
      editorContent,
      /<DropdownMenuLabel[^>]*>\s*Layout Presets\s*<\/DropdownMenuLabel>/,
      "Templates dropdown should use standard DropdownMenuLabel"
    )
  })

  it("5. Canvas supports 2D Blueprint default and 3D Isometric toggle", () => {
    const canvasContent = fs.readFileSync(canvasPath, "utf-8")
    const editorContent = fs.readFileSync(editorPath, "utf-8")

    assert.match(
      canvasContent,
      /is3D \? "rotateX\(35deg\) scale\(0\.95\)" : "none"/,
      "CabinetCanvas should default to flat 2D blueprint and support 3D mode"
    )
    assert.match(
      editorContent,
      /is3D \? "3D View" : "2D Blueprint"/,
      "Toolbar should include 2D Blueprint / 3D View toggle button"
    )
  })

  it("6. CabinetSidebar reads studentDrawerUsage and renders drawer contents breakdown", () => {
    const sidebarContent = fs.readFileSync(sidebarPath, "utf-8")
    assert.match(
      sidebarContent,
      /studentDrawerUsage/,
      "CabinetSidebar should accept studentDrawerUsage prop"
    )
    assert.match(
      sidebarContent,
      /Drawer Contents/,
      "CabinetSidebar should render drawer contents breakdown"
    )
  })

  it("7. StorageLayoutSkeleton mirrors the 3-tier structure and 2-pane split", () => {
    const skeletonContent = fs.readFileSync(skeletonPath, "utf-8")
    assert.match(
      skeletonContent,
      /Room Switcher Row/,
      "StorageLayoutSkeleton should include Room Switcher Row skeleton"
    )
    assert.match(
      skeletonContent,
      /Canvas Toolbar/,
      "StorageLayoutSkeleton should include Canvas Toolbar skeleton"
    )
  })

  it("8. Explicit Delete Room Action & Decommissioning: Visible button and unblocked empty cabinet deletion", () => {
    const editorContent = fs.readFileSync(editorPath, "utf-8")
    assert.match(
      editorContent,
      /Delete Room\s*<\/Button>/,
      "Room switcher row should have a visible 'Delete Room' button"
    )
    assert.match(
      editorContent,
      /Clear Cabinets\s*<\/Button>/,
      "Room switcher row should have a visible 'Clear Cabinets' button without popover"
    )
    assert.doesNotMatch(
      editorContent,
      /if \(activeRoom\.cabinets\?\.length\) \{\s*showToast\?\(\{\s*title: "Room Contains Cabinets"/,
      "removeActiveRoom should not block room deletion when cabinets are empty of student records"
    )
  })

  it("9. Grid Line Uniformity & Subtle Tint: Uses crispEdges SVG pattern, full 40x25 grid, and soft non-distracting neutral tint without black line fallback", () => {
    const canvasContent = fs.readFileSync(canvasPath, "utf-8")
    assert.match(
      canvasContent,
      /shapeRendering:\s*"crispEdges"/,
      "CabinetCanvas should use shapeRendering: 'crispEdges' for razor-sharp 1px line thickness"
    )
    assert.match(
      canvasContent,
      /vectorEffect="non-scaling-stroke"/,
      "CabinetCanvas should use vectorEffect='non-scaling-stroke' for uniform screen pixel lines"
    )
    assert.match(
      canvasContent,
      /var\(--storage-grid-line/,
      "CabinetCanvas should use --storage-grid-line variable to prevent black line fallback"
    )
    assert.doesNotMatch(
      canvasContent,
      /stroke="currentColor"/,
      "CabinetCanvas should not rely on stroke='currentColor' which can evaluate to black text color"
    )
    assert.doesNotMatch(
      canvasContent,
      /stroke-black/,
      "CabinetCanvas should not use black grid lines"
    )
    assert.match(
      canvasContent,
      /x < 40/,
      "CabinetCanvas should include 40 vertical grid lines for snap precision"
    )
    assert.match(
      canvasContent,
      /y < 25/,
      "CabinetCanvas should include 25 horizontal grid lines for snap precision"
    )
    assert.doesNotMatch(
      canvasContent,
      /linear-gradient\(to right,\s*currentColor 1px/,
      "CabinetCanvas should not use fractional CSS linear-gradient for blueprint grid"
    )
  })

  it("10. DropdownMenu warning variant keeps amber text and soft amber hover/highlight", () => {
    const dropdownContent = fs.readFileSync(dropdownPath, "utf-8")
    const editorContent = fs.readFileSync(editorPath, "utf-8")

    assert.match(
      dropdownContent,
      /data-\[variant=warning\]:text-amber-600/,
      "dropdown-menu.jsx should support data-[variant=warning] text styling"
    )
    assert.match(
      dropdownContent,
      /data-\[variant=warning\]:data-highlighted:bg-amber-500\/10/,
      "dropdown-menu.jsx should support data-[variant=warning] highlight bg"
    )
    assert.match(
      editorContent,
      /<DropdownMenuItem\s+variant="warning"\s+onClick=\{\(\) => setRestoreTemplatesConfirmOpen\(true\)\}/,
      "StorageLayoutEditorTab should use variant='warning' for Restore Default Templates"
    )
  })

  it("11. Toolbar follows canonical 2-Zone Left/Right Split without middle floating island", () => {
    const editorContent = fs.readFileSync(editorPath, "utf-8")
    assert.doesNotMatch(
      editorContent,
      /Center: Canvas View Controls/,
      "Toolbar should not have a middle floating island"
    )
    assert.match(
      editorContent,
      /Zone A: Editing Actions/,
      "Toolbar should define Zone A Editing Actions"
    )
    assert.match(
      editorContent,
      /Zone B: Canvas View Controls & Templates/,
      "Toolbar should define Zone B Canvas View Controls & Templates"
    )
  })

  it("12. Unified Room Actions Button Group colocates Add, Rename, Clear, and Delete rooms", () => {
    const editorContent = fs.readFileSync(editorPath, "utf-8")
    assert.match(
      editorContent,
      /Room Management Actions Button Group/,
      "Room switcher should group room actions together"
    )
    assert.match(
      editorContent,
      /\+ Add Room/,
      "Button group should include + Add Room"
    )
    assert.match(
      editorContent,
      /Rename\s*<\/Button>/,
      "Button group should include Rename"
    )
    assert.match(
      editorContent,
      /Clear Cabinets\s*<\/Button>/,
      "Button group should include Clear Cabinets"
    )
    assert.match(
      editorContent,
      /Delete Room\s*<\/Button>/,
      "Button group should include Delete Room"
    )
  })

  it("13. Institutional Identity Standards: Status indicator, unsaved changes tracking, and discard flow", () => {
    const editorContent = fs.readFileSync(editorPath, "utf-8")
    assert.match(
      editorContent,
      /Unsaved changes/,
      "PageHeader should include 'Unsaved changes' status badge text"
    )
    assert.match(
      editorContent,
      /All changes saved/,
      "PageHeader should include 'All changes saved' status badge text"
    )
    assert.match(
      editorContent,
      /disabled=\{saving \|\| !isDirty \|\| hasAnyCollisions\}/,
      "Save button should be disabled when not dirty"
    )
    assert.match(
      editorContent,
      /Discard Changes/,
      "PageHeader should include Discard Changes action when dirty"
    )
    assert.match(
      editorContent,
      /handleDiscardChanges/,
      "StorageLayoutEditorTab should define handleDiscardChanges"
    )
  })

  it("14. Fluid Motion Tabs & Unbreakable Many-Rooms Scroll: Uses layoutId motion pill and flex-nowrap constrained scroll", () => {
    const editorContent = fs.readFileSync(editorPath, "utf-8")
    assert.match(
      editorContent,
      /storage-room-active-tab-pill/,
      "Room tabs should use Framer Motion layoutId for fluid sliding pill animation"
    )
    assert.match(
      editorContent,
      /SPRING_LAYOUT/,
      "Room tabs should use SPRING_LAYOUT token for Apple-grade spring physics"
    )
    assert.match(
      editorContent,
      /flex-nowrap/,
      "Room switcher row should use flex-nowrap to prevent summary from dropping to a new line"
    )
    assert.match(
      editorContent,
      /tabsScrollRef/,
      "Room switcher should bind a scroll ref to the tabs container"
    )
    assert.match(
      editorContent,
      /shrink-0 ml-auto/,
      "Room statistics should be pinned shrink-0 on the right"
    )
  })

  it("15. Inspector Polish: Centered empty state and revamped neutral history stack", () => {
    const sidebarContent = fs.readFileSync(sidebarPath, "utf-8")
    assert.match(
      sidebarContent,
      /items-center justify-center min-h-\[300px\]/,
      "No cabinet selected empty state should be vertically and horizontally centered"
    )
    assert.doesNotMatch(
      sidebarContent,
      /bg-red-50 text-gray-900 border-red-200/,
      "History items should not use reddish background cards"
    )
    assert.match(
      sidebarContent,
      /Current/,
      "History current state should use a clean neutral 'Current' label"
    )
    assert.match(
      sidebarContent,
      /Undone/,
      "History undone states should use subtle 'Undone' label"
    )
  })
})
