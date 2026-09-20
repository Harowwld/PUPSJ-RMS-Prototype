"use client";
import React from 'react';
import * as icons from 'hugeicons-react';
import { cn } from '@/lib/utils';

export function getIconByTitle(title = "") {
  const t = String(title || "").toLowerCase().trim();
  if (!t) return null;
  
  // OSAS & Student Affairs
  if (t.includes("osas") || t.includes("proposal") || t.includes("student affairs")) {
    return "SchoolIcon";
  }
  // Compliance & Requirements
  if (t.includes("compliance") || t.includes("checklist") || t.includes("requirement")) {
    return "CheckListIcon";
  }
  // Documents & Requests
  if (t.includes("document request") || t.includes("odrs") || t.includes("transcript") || t.includes("diploma") || t.includes("certificate")) {
    return "File02Icon";
  }
  if (t.includes("matrix") || t.includes("documents")) {
    return "File02Icon";
  }
  // Students & Directory
  if (t.includes("student directory") || t.includes("student profile") || (t.includes("student") && t.includes("record"))) {
    return "UserSearch01Icon";
  }
  if (t.includes("student")) {
    return "StudentIcon";
  }
  // Activity, Timeline & Audit Logs
  if (t.includes("activity") || t.includes("history") || t.includes("log") || t.includes("timeline") || t.includes("audit")) {
    return "Time01Icon";
  }
  // Staff Directory
  if (t.includes("directory") || t.includes("staff") || t.includes("personnel") || t.includes("users")) {
    return "UserSearch01Icon";
  }
  // Security
  if (t.includes("security") || t.includes("shield")) {
    return "Shield01Icon";
  }
  // Storage & Archive
  if (t.includes("storage") || t.includes("cabinet") || t.includes("warehouse")) {
    return "WarehouseIcon";
  }
  if (t.includes("backup") || t.includes("database")) {
    return "Database01Icon";
  }
  // Settings & Config
  if (t.includes("setting") || t.includes("config") || t.includes("preference")) {
    return "Settings01Icon";
  }
  // Analytics
  if (t.includes("analytic") || t.includes("metric") || t.includes("trend") || t.includes("chart")) {
    return "Analytics01Icon";
  }
  // Review & Approval
  if (t.includes("review") || t.includes("verify") || t.includes("approve")) {
    return "TaskDone01Icon";
  }
  // Navigation & Controls
  if (t.includes("sidebar")) {
    return "LayoutLeftIcon";
  }
  if (t.includes("zoom in")) {
    return "ZoomInAreaIcon";
  }
  if (t.includes("zoom out")) {
    return "ZoomOutAreaIcon";
  }
  if (t.includes("zoom") || t.includes("scale")) {
    return "ArrowLeftRightIcon";
  }
  if (t.includes("sign out") || t.includes("logout")) {
    return "Logout01Icon";
  }
  if (t.includes("notification") || t.includes("alert") || t.includes("inbox") || t.includes("bell")) {
    return "Notification01Icon";
  }
  if (t.includes("scan") || t.includes("upload") || t.includes("ingest")) {
    return "FingerPrintScanIcon";
  }
  if (t.includes("archive") || t.includes("box")) {
    return "Archive01Icon";
  }
  if (t.includes("office") || t.includes("department") || t.includes("building") || t.includes("station")) {
    return "Building01Icon";
  }
  if (t.includes("feature") || t.includes("module")) {
    return "LayoutGridIcon";
  }
  if (t.includes("operation") || t.includes("health") || t.includes("status")) {
    return "Activity01Icon";
  }
  if (t.includes("cms") || t.includes("landing") || t.includes("portal") || t.includes("website") || t.includes("dashboard")) {
    return "DashboardSquare01Icon";
  }
  return null;
}

const iconMapping = {
  "magnifying-glass": "Search01Icon",
  "magnifying-glass-minus": "ZoomOutAreaIcon",
  "magnifying-glass-plus": "ZoomInAreaIcon",
  "gear-six": "Settings01Icon",
  "gear": "Settings01Icon",
  "house": "Home01Icon",
  "envelope": "Mail01Icon",
  "folder-open": "FolderOpenIcon",
  "pencil-simple": "PencilEdit01Icon",
  "trash": "Delete01Icon",
  "x": "Cancel01Icon",
  "check": "Tick01Icon",
  "plus": "Add01Icon",
  "minus": "MinusSignIcon",
  "caret-down": "ArrowDown01Icon",
  "caret-right": "ArrowRight01Icon",
  "caret-left": "ArrowLeft01Icon",
  "caret-up": "ArrowUp01Icon",
  "calendar-blank": "Calendar01Icon",
  "calendar-check": "CalendarCheckIn01Icon",
  "circle-x": "CancelCircleIcon",
  "activity-heartbeat": "Activity01Icon",
  "agency": "Building01Icon",
  "arrow-clockwise": "ReloadIcon",
  "arrows-counter-clockwise": "ReloadIcon",
  "badge-check": "Award01Icon",
  "banknote": "BankIcon",
  "building-community": "Building03Icon",
  "building-warehouse": "WarehouseIcon",
  "chevron-down": "ArrowDown01Icon",
  "clipboard-list": "ClipboardIcon",
  "column": "Layout2ColumnIcon",
  "dots-three-vertical": "MoreVerticalIcon",
  "file-x": "FileRemoveIcon",
  "flask-conical": "Chemistry01Icon",
  "graduation-cap": "GraduationScrollIcon",
  "heart-pulse": "HeartCheckIcon",
  "kanban": "LayoutGridIcon",
  "landmark": "Building01Icon",
  "layout-dashboard": "DashboardSquare01Icon",
  "lock-simple": "LockIcon",
  "message-square": "Message01Icon",
  "page": "File01Icon",
  "palette": "PaintBoardIcon",
  "pencil-line": "PencilEdit01Icon",
  "plus-circle": "AddCircleIcon",
  "prohibit": "StopIcon",
  "scroll-text": "ScrollIcon",
  "server": "CloudServerIcon",
  "settings-cog": "Settings01Icon",
  "signatory": "SignatureIcon",
  "stage": "Presentation01Icon",
  "toggle-left": "ToggleOffIcon",
  "user-gear": "UserSettings01Icon",
  "wifi-high": "WifiFullSignalIcon",
  "word": "File01Icon",
  "mask-sad": "Sad01Icon",
  "spinner": "Loading01Icon",
  "eye-slash": "ViewOffIcon",
  "download-simple": "Download01Icon",
  "upload-simple": "Upload01Icon",
  "file-csv": "File01Icon",
  "cloud-arrow-up": "CloudUploadIcon",
  "shield-slash": "Shield02Icon",
  "shield-key": "ShieldKeyIcon",
  "chart-bar": "Analytics01Icon",
  "chart-line": "ChartLineData01Icon",
  "chart-pie": "PieChartIcon",
  "chart-pie-slice": "PieChartIcon",
  "file-check": "TaskDone01Icon",
  "layout-sidebar": "Layout01Icon",
  "check-circle": "CheckmarkCircle01Icon",
  "x-circle": "CancelCircleIcon",
  "arrow-left": "ArrowLeft02Icon",
  "arrow-right": "ArrowRight02Icon",
  "file-text": "File02Icon",
  "file-pdf": "File02Icon",
  "check-square": "Task01Icon",
  "square": "SquareIcon",
  "bell": "Notification01Icon",
  "bell-slash": "NotificationOff01Icon",
  "bell-simple-slash": "NotificationOff01Icon",
  "archive": "Archive01Icon",
  "archive-restore": "Archive02Icon",
  "scan": "FingerPrintScanIcon",
  "users": "UserSearch01Icon",
  "user-plus": "UserAdd01Icon",
  "arrow-up-right": "ArrowUpRight01Icon",
  "shield-check": "Shield01Icon",
  "eye": "ViewIcon",
  "camera": "Camera01Icon",
  "key": "Key01Icon",
  "clock": "Clock01Icon",
  "copy": "Copy01Icon",
  "link": "Link01Icon",
  "heart": "FavouriteIcon",
  "paperclip": "Attachment01Icon",
  "file": "File01Icon",
  "checks": "TickDouble01Icon",
  "floppy-disk": "SaveEnergy01Icon",
  "certificate": "Certificate01Icon",
  "book-2": "BookOpen01Icon",
  "device-laptop": "LaptopIcon",
  "messages": "Message01Icon",
  "folder-archive": "Archive01Icon",
  "buildings": "Building01Icon",
  "building": "Building02Icon",
  "squares-four": "LayoutGridIcon",
  "heartbeat": "Activity01Icon",
  "clock-counter-clockwise": "Time01Icon",
  "sign-in": "Login01Icon",
  "newspaper-clipping": "News01Icon",
  "broadcast": "RadioIcon",
  "cube": "AlignBoxBottomCenterIcon",
  "caret-up-down": "ArrowUpDownIcon",
  "arrows-clockwise": "RefreshIcon",
  "shield-star": "Shield01Icon",
  "usb-slash": "UsbIcon",
  "lock-key": "LockIcon",
  "envelope-simple": "Mail01Icon",
  "student": "StudentIcon",
  "school": "SchoolIcon",
  "school-01": "School01Icon",
  "circle-notch": "Loading01Icon",
  "arrows-vertical": "ArrowUpDownIcon",
  "calendar-dots": "Calendar01Icon",
  "lightning": "EnergyIcon",
  "chart-line-up": "Analytics01Icon",
  "mouse-left-click": "Mouse01Icon",
  "dots-six-vertical": "DragDropIcon",
  "books": "LibraryIcon",
  "list-numbers": "ListViewIcon",
  "list": "ListViewIcon",
  "rotate-2": "ReloadIcon",
  "stack": "Layers01Icon",
  "list-magnifying-glass": "FilterIcon",
  "tray": "InboxIcon",
  "user-focus": "UserStatusIcon",
  "archive-tray": "Archive01Icon",
  "user-circle-gear": "UserSettings01Icon",
  "file-dashed": "FileAddIcon",
  "corners-in": "ArrowShrink01Icon",
  "corners-out": "ArrowExpand01Icon",
  "arrow-square-out": "LinkSquare01Icon",
  "envelopes": "FilterMailSquareIcon",
  "clipboard-text": "ClipboardIcon",
  "check-double": "TickDouble01Icon",
  "rotate-clockwise": "ReloadIcon",
  "identification-badge": "Contact01Icon",
  "info-circle": "CovidInfoIcon",
  "tools": "Wrench01Icon",
  "desktop": "ComputerIcon",
  "device-desktop": "ComputerIcon",
  "flow-arrow": "WorkflowCircle01Icon",
  "workflow": "WorkflowCircle01Icon",
  "question": "HelpCircleIcon",
  "question-circle": "HelpCircleIcon",
  "help-circle": "HelpCircleIcon",
  "files": "Files01Icon",
  "scales": "JusticeScale01Icon",
  "text-t": "TextFontIcon",
  "cursor-click": "Cursor01Icon",
  "devices": "ComputerPhoneSyncIcon",
  "hand-pointing": "CursorPointer01Icon",
  "clock-countdown": "HourglassIcon",
  "globe-hemisphere-east": "GlobeIcon",
  "bell-ringing": "Notification02Icon",
  "list-dashes": "Menu01Icon",
  "button": "Touch01Icon",
  "wave-sine": "Activity01Icon",
  "paper-plane-tilt": "SentIcon",
  "paper-plane-right": "SentIcon",
  "file-arrow-up": "FileUploadIcon",
  "folder-notch-open": "FolderOpenIcon",
  "path": "Route01Icon",
  "browser": "LayoutBottomIcon",
  "panel-bottom": "LayoutBottomIcon",
  "arrow-counter-clockwise": "ReloadIcon",
  "arrows-left-right": "ArrowLeftRightIcon",
  "arrows-out": "ArrowExpand01Icon",
  "device-mobile": "SmartPhone01Icon",
  "door": "Door01Icon",
  "hard-drives": "CloudServerIcon",
  "plugs": "Plug01Icon",
  "users-three": "UserSearch01Icon",
  "warning-circle": "Alert01Icon",
  "warning": "Alert02Icon",
  "seal-check": "CheckmarkBadge01Icon",
  "trend-up": "Analytics01Icon",
  "warehouse": "WarehouseIcon",
  "database-backup": "DatabaseIcon",
  "tray-arrow-up": "FileUploadIcon",
  "archive-box": "Archive01Icon",
  "sidebar-simple": "LayoutLeftIcon",
  "arrows-out-line-horizontal": "ArrowLeftRightIcon",
  "history": "Time01Icon",
  "activity": "Activity01Icon",
  "layout": "DashboardSquare01Icon",
  "image": "Image01Icon",
  "git-merge": "GitMergeIcon",
  "clipboard-check": "CheckListIcon",
  "sign-out": "Logout01Icon",
  "database": "Database01Icon",
  "info": "CovidInfoIcon",
  "text": "TextFontIcon",
  "map-pin": "Location01Icon",
  "clock-afternoon": "Clock01Icon",
  "fingerprint": "FingerPrintAddIcon",
  "arrow-down": "ArrowDown01Icon",
  "handshake": "Agreement01Icon",
  "panel-left": "SidebarLeftIcon",
  "panel-left-dashed": "SidebarLeft01Icon",
  "star": "StarIcon"
};

function toCamelCase(str) {
  return str.replace(/-([a-z0-9])/g, (g) => g[1].toUpperCase());
}

function getHugeName(rawIconName, title) {
  if (rawIconName && iconMapping[rawIconName]) {
    return iconMapping[rawIconName];
  }
  if (title) {
    const fromTitle = getIconByTitle(title);
    if (fromTitle) return fromTitle;
  }
  if (!rawIconName) return "HelpCircleIcon";
  const camelName = toCamelCase(rawIconName);
  const capitalized = camelName.charAt(0).toUpperCase() + camelName.slice(1);
  return capitalized + 'Icon';
}

export default function HugeIcon({ className, size, title, name, ...props }) {
  if (!className && !title && !name) return null;
  
  const classParts = (className || "").split(' ');
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
  
  const itemTitle = title || name || props['aria-label'] || "";
  let hugeName = getHugeName(rawIconName, itemTitle);
  let IconComponent = icons[hugeName];
  
  if (!IconComponent && hugeName) {
    if (icons[hugeName.replace('Icon', '01Icon')]) {
       IconComponent = icons[hugeName.replace('Icon', '01Icon')];
    } else if (icons[hugeName.replace('Icon', '02Icon')]) {
       IconComponent = icons[hugeName.replace('Icon', '02Icon')];
    }
  }

  // If still not found and we have a title, attempt title-based icon resolution
  if (!IconComponent && itemTitle) {
    const fallbackFromTitle = getIconByTitle(itemTitle);
    if (fallbackFromTitle && icons[fallbackFromTitle]) {
      IconComponent = icons[fallbackFromTitle];
    }
  }
  
  if (!IconComponent) {
    IconComponent = icons['HelpCircleIcon'] || icons['File01Icon'] || Object.values(icons)[0];
  }
  
  if (!IconComponent) return null;
  
  return <IconComponent className={cn(remainingClasses)} size={size || "1em"} {...props} />;
}
