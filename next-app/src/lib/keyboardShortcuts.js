export const KEYBOARD_SHORTCUT_GROUPS = [
  {
    id: "global",
    title: "Global Navigation & Workspace",
    description: "Available from any page in the records system.",
    shortcuts: [
      {
        id: "command-palette",
        keys: ["Ctrl / ⌘", "K"],
        label: "Command Palette",
        description: "Open quick search and jump to pages, records, or actions.",
      },
      {
        id: "toggle-sidebar",
        keys: ["Ctrl / ⌘", "B"],
        label: "Toggle Sidebar",
        description: "Collapse or expand the left navigation sidebar.",
      },
      {
        id: "escape-close",
        keys: ["Esc"],
        label: "Dismiss Active Overlay",
        description: "Close the open modal, inspector sheet, popover, or clear selection.",
      },
    ],
  },
  {
    id: "batch-review",
    title: "Batch Review Queue",
    description: "Active when navigating queued documents outside text inputs.",
    shortcuts: [
      {
        id: "batch-nav",
        keys: ["↑ / ↓"],
        label: "Navigate Queue",
        description: "Move focus to the previous or next document in the queue.",
      },
      {
        id: "batch-range",
        keys: ["Shift", "↑ / ↓"],
        label: "Extend Selection",
        description: "Select a contiguous range of queued documents.",
      },
      {
        id: "batch-select-all",
        keys: ["Ctrl / ⌘", "A"],
        label: "Select All Queued",
        description: "Select all documents currently loaded in the batch queue.",
      },
      {
        id: "batch-clear",
        keys: ["Esc"],
        label: "Clear Selection",
        description: "Deselect the currently selected queue rows.",
      },
    ],
  },
  {
    id: "storage-layout",
    title: "Storage Layout Editor",
    description: "Active on the 2D archive room canvas when not typing.",
    shortcuts: [
      {
        id: "layout-undo",
        keys: ["Ctrl / ⌘", "Z"],
        label: "Undo Layout Change",
        description: "Revert the previous cabinet move, resize, or edit.",
      },
      {
        id: "layout-redo",
        keys: ["Ctrl / ⌘", "Y"],
        label: "Redo Layout Change",
        description: "Reapply an undone layout edit (also supports Ctrl / ⌘ + Shift + Z).",
      },
      {
        id: "layout-copy-paste",
        keys: ["Ctrl / ⌘", "C / V"],
        label: "Copy & Paste Cabinets",
        description: "Duplicate selected cabinets onto the active room canvas.",
      },
      {
        id: "layout-delete",
        keys: ["Delete / Backspace"],
        label: "Remove Selected Cabinet",
        description: "Delete the selected cabinet when it has no assigned records.",
      },
      {
        id: "layout-snap",
        keys: ["S"],
        label: "Toggle Snap to Grid",
        description: "Enable or disable grid snapping while dragging cabinets.",
      },
      {
        id: "layout-grid",
        keys: ["G"],
        label: "Toggle Grid Overlay",
        description: "Show or hide the alignment grid on the room canvas.",
      },
    ],
  },
];
