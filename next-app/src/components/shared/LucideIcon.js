import React from 'react';
import * as icons from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMapping = {
  "magnifying-glass": "Search",
  "magnifying-glass-minus": "ZoomOut",
  "magnifying-glass-plus": "ZoomIn",
  "gear-six": "Settings",
  "house": "Home",
  "envelope": "Mail",
  "folder-open": "FolderOpen",
  "pencil-simple": "Pencil",
  "trash": "Trash2",
  "x": "X",
  "check": "Check",
  "plus": "Plus",
  "minus": "Minus",
  "caret-down": "ChevronDown",
  "caret-right": "ChevronRight",
  "caret-left": "ChevronLeft",
  "caret-up": "ChevronUp",
  "calendar-blank": "Calendar",
  "mask-sad": "Frown",
  "spinner": "Loader2",
  "eye-slash": "EyeOff",
  "download-simple": "Download",
  "upload-simple": "Upload",
  "file-csv": "FileSpreadsheet",
  "cloud-arrow-up": "CloudUpload",
  "shield-slash": "ShieldOff",
  "shield-key": "ShieldAlert",
  "chart-bar": "BarChart",
  "file-check": "FileCheck",
  "layout-sidebar": "Columns",
  "check-circle": "CheckCircle",
  "x-circle": "XCircle",
  "arrow-left": "ArrowLeft",
  "arrow-right": "ArrowRight",
  "file-text": "FileText",
  "file-pdf": "FileText",
  "check-square": "CheckSquare",
  "square": "Square",
  "bell": "Bell",
  "bell-slash": "BellOff",
  "bell-simple-slash": "BellOff",
  "archive": "Archive",
  "archive-restore": "ArchiveRestore",
  "scan": "Scan",
  "users": "Users",
  "user-plus": "UserPlus",
  "arrow-up-right": "ArrowUpRight",
  "shield-check": "ShieldCheck",
  "eye": "Eye",
  "camera": "Camera",
  "key": "Key",
  "clock": "Clock",
  "copy": "Copy",
  "link": "Link",
  "heart": "Heart",
  "gear": "Cog",
  "paperclip": "Paperclip",
  "file": "File",
  "checks": "CheckCheck",
  "floppy-disk": "Save",
  "certificate": "BadgeCheck",
  "book-2": "BookOpen",
  "device-laptop": "Laptop",
  "messages": "MessageSquare",
  "folder-archive": "FolderArchive",
  "buildings": "Building2",
  "building": "Building",
  "squares-four": "LayoutGrid",
  "heartbeat": "Activity",
  "clock-counter-clockwise": "History",
  "sign-in": "LogIn",
  "newspaper-clipping": "Newspaper",
  "broadcast": "Radio",
  "cube": "Box",
  "caret-up-down": "ChevronsUpDown",
  "arrows-clockwise": "RefreshCw",
  "shield-star": "Shield",
  "usb-slash": "Usb",
  "lock-key": "Lock",
  "envelope-simple": "Mail",
  "student": "GraduationCap",
  "circle-notch": "Loader2",
  "arrows-vertical": "ArrowUpDown",
  "calendar-dots": "Calendar",
  "lightning": "Zap",
  "chart-line-up": "TrendingUp",
  "mouse-left-click": "MousePointer",
  "dots-six-vertical": "GripVertical",
  "books": "Library",
  "list-numbers": "ListOrdered",
  "rotate-2": "RotateCw",
  "stack": "Layers",
  "list-magnifying-glass": "ListFilter",
  "tray": "Inbox",
  "user-focus": "UserCheck",
  "archive-tray": "Archive",
  "user-circle-gear": "UserCog",
  "file-dashed": "FilePlus",
  "corners-in": "Minimize2",
  "corners-out": "Maximize2",
  "arrow-square-out": "ExternalLink",
  "envelopes": "Mails",
  "clipboard-text": "ClipboardList",
  "check-double": "CheckCheck",
  "rotate-clockwise": "RotateCw",
  "identification-badge": "IdCard",
  "info-circle": "Info",
  "tools": "Wrench",
  "desktop": "Monitor",
  "device-desktop": "Monitor",
  "flow-arrow": "Workflow",
  "workflow": "Workflow",
  "question": "HelpCircle",
  "question-circle": "HelpCircle",
  "help-circle": "HelpCircle",
  "files": "Files",
  "scales": "Scale",
  "text-t": "Type",
  "cursor-click": "MousePointerClick",
  "devices": "MonitorSmartphone",
  "hand-pointing": "Pointer",
  "clock-countdown": "Hourglass",
  "globe-hemisphere-east": "Globe",
  "bell-ringing": "BellRing",
  "list-dashes": "List",
  "button": "RectangleHorizontal",
  "wave-sine": "Waves",
  "paper-plane-tilt": "Send",
  "file-arrow-up": "FileUp",
  "folder-notch-open": "FolderOpen",
  "path": "Route",
  "browser": "PanelBottom",
  "panel-bottom": "PanelBottom",
  "arrow-counter-clockwise": "RotateCcw",
  "arrows-left-right": "ArrowLeftRight",
  "arrows-out": "Expand",
  "device-mobile": "Smartphone",
  "door": "DoorClosed",
  "hard-drives": "Server",
  "plugs": "Plug",
  "users-three": "Users",
  "warning-circle": "AlertCircle",
  "warning": "AlertTriangle",
};

function toCamelCase(str) {
  return str.replace(/-([a-z0-9])/g, (g) => g[1].toUpperCase());
}
function getLucideName(rawName) {
  if (iconMapping[rawName]) return iconMapping[rawName];
  const camelName = toCamelCase(rawName);
  return camelName.charAt(0).toUpperCase() + camelName.slice(1);
}

export default function LucideIcon({ className, ...props }) {
  if (!className) return null;
  
  const classParts = className.split(' ');
  let rawIconName = null;
  let remainingClasses = [];
  
  for (const part of classParts) {
    if (part.startsWith('ph-') && !['ph-bold', 'ph-fill', 'ph-duotone', 'ph-light', 'ph-thin'].includes(part)) {
      rawIconName = part.replace('ph-', '');
    } else if (part.startsWith('ti-') && part !== 'ti') {
      rawIconName = part.replace('ti-', '');
    } else if (!part.startsWith('ph-') && part !== 'ti') {
      remainingClasses.push(part);
    }
  }
  
  if (!rawIconName) return null;
  
  const lucideName = getLucideName(rawIconName);
  const IconComponent = icons[lucideName];
  
  if (!IconComponent) {
    console.warn(`LucideIcon: Icon ${lucideName} not found for ${rawIconName}`);
    return null;
  }
  
  return <IconComponent className={cn(remainingClasses)} {...props} />;
}
