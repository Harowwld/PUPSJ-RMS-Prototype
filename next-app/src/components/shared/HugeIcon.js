"use client";
import React from 'react';
import * as icons from 'hugeicons-react';
import { cn } from '@/lib/utils';

const iconMapping = {
  "magnifying-glass": "Search01Icon",
  "magnifying-glass-minus": "ZoomOutAreaIcon",
  "magnifying-glass-plus": "ZoomInAreaIcon",
  "gear-six": "Settings01Icon",
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
  "shield-slash": "StarIcon",
  "shield-key": "StarIcon",
  "chart-bar": "Analytics01Icon",
  "chart-line": "ChartLineData01Icon",
  "chart-pie": "PieChartIcon",
  "chart-pie-slice": "PieChartIcon",
  "file-check": "StarIcon",
  "layout-sidebar": "Layout01Icon",
  "check-circle": "StarIcon",
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
  "shield-check": "StarIcon",
  "eye": "ViewIcon",
  "camera": "Camera01Icon",
  "key": "Key01Icon",
  "clock": "Clock01Icon",
  "copy": "Copy01Icon",
  "link": "Link01Icon",
  "heart": "FavouriteIcon",
  "gear": "IncognitoIcon",
  "paperclip": "Attachment01Icon",
  "file": "File01Icon",
  "checks": "TickDouble01Icon",
  "floppy-disk": "SaveEnergy01Icon",
  "certificate": "StarIcon",
  "book-2": "BookOpen01Icon",
  "device-laptop": "LaptopIcon",
  "messages": "Message01Icon",
  "folder-archive": "StarIcon",
  "buildings": "Building01Icon",
  "building": "Building02Icon",
  "squares-four": "LayoutGridIcon",
  "heartbeat": "Activity01Icon",
  "clock-counter-clockwise": "Time01Icon",
  "sign-in": "Login01Icon",
  "newspaper-clipping": "StarIcon",
  "broadcast": "RadioIcon",
  "cube": "AlignBoxBottomCenterIcon",
  "caret-up-down": "StarIcon",
  "arrows-clockwise": "RefreshIcon",
  "shield-star": "Shield01Icon",
  "usb-slash": "UsbIcon",
  "lock-key": "LockIcon",
  "envelope-simple": "Mail01Icon",
  "student": "StarIcon",
  "circle-notch": "Loading01Icon",
  "arrows-vertical": "ArrowUpDownIcon",
  "calendar-dots": "Calendar01Icon",
  "lightning": "EnergyIcon",
  "chart-line-up": "StarIcon",
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
  "user-circle-gear": "StarIcon",
  "file-dashed": "FileAddIcon",
  "corners-in": "StarIcon",
  "corners-out": "StarIcon",
  "arrow-square-out": "LinkSquare01Icon",
  "envelopes": "FilterMailSquareIcon",
  "clipboard-text": "ClipboardIcon",
  "check-double": "TickDouble01Icon",
  "rotate-clockwise": "ReloadIcon",
  "identification-badge": "StarIcon",
  "info-circle": "CovidInfoIcon",
  "tools": "Wrench01Icon",
  "desktop": "StarIcon",
  "device-desktop": "StarIcon",
  "flow-arrow": "WorkflowCircle01Icon",
  "workflow": "WorkflowCircle01Icon",
  "question": "HelpCircleIcon",
  "question-circle": "HelpCircleIcon",
  "help-circle": "HelpCircleIcon",
  "files": "Files01Icon",
  "scales": "JusticeScale01Icon",
  "text-t": "TextFontIcon",
  "cursor-click": "StarIcon",
  "devices": "StarIcon",
  "hand-pointing": "CursorPointer01Icon",
  "clock-countdown": "HourglassIcon",
  "globe-hemisphere-east": "GlobeIcon",
  "bell-ringing": "Notification02Icon",
  "list-dashes": "Menu01Icon",
  "button": "StarIcon",
  "wave-sine": "StarIcon",
  "paper-plane-tilt": "SentIcon",
  "paper-plane-right": "SentIcon",
  "file-arrow-up": "FileUploadIcon",
  "folder-notch-open": "FolderOpenIcon",
  "path": "Route01Icon",
  "browser": "LayoutBottomIcon",
  "panel-bottom": "LayoutBottomIcon",
  "arrow-counter-clockwise": "StarIcon",
  "arrows-left-right": "ArrowLeftRightIcon",
  "arrows-out": "ArrowExpand01Icon",
  "device-mobile": "SmartPhone01Icon",
  "door": "Door01Icon",
  "hard-drives": "CloudServerIcon",
  "plugs": "Plug01Icon",
  "users-three": "UserSearch01Icon",
  "warning-circle": "Alert01Icon",
  "warning": "Alert02Icon",
  "seal-check": "StarIcon",
  "trend-up": "StarIcon",
  "warehouse": "WarehouseIcon",
  "database-backup": "DatabaseIcon",
  "tray-arrow-up": "FileUploadIcon",
  "archive-box": "Archive01Icon",
  "sidebar-simple": "LayoutLeftIcon",
  "arrows-out-line-horizontal": "StarIcon",
  "history": "Time01Icon",
  "activity": "Activity01Icon",
  "layout": "DashboardSquare01Icon",
  "image": "Image01Icon",
  "git-merge": "GitMergeIcon",
  "clipboard-check": "StarIcon",
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
  "panel-left-dashed": "SidebarLeft01Icon"
};

function toCamelCase(str) {
  return str.replace(/-([a-z0-9])/g, (g) => g[1].toUpperCase());
}

function getHugeName(rawName) {
  if (iconMapping[rawName]) return iconMapping[rawName];
  const camelName = toCamelCase(rawName);
  const capitalized = camelName.charAt(0).toUpperCase() + camelName.slice(1);
  return capitalized + 'Icon';
}

export default function HugeIcon({ className, size, ...props }) {
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
  
  const hugeName = getHugeName(rawIconName);
  let IconComponent = icons[hugeName];
  
  if (!IconComponent) {
    if (icons[hugeName.replace('Icon', '01Icon')]) {
       IconComponent = icons[hugeName.replace('Icon', '01Icon')];
    } else if (icons[hugeName.replace('Icon', '02Icon')]) {
       IconComponent = icons[hugeName.replace('Icon', '02Icon')];
    } else {
       console.warn(`Hugeicons: Icon ${hugeName} not found for ${rawIconName}`);
       IconComponent = icons['HelpCircleIcon'] || icons['StarIcon'] || Object.values(icons)[0];
    }
  }
  
  if (!IconComponent) return null;
  // Convert standard size (like "1em" or unspecified) to a reasonable pixel size if needed, but hugeicons handles size via props.
  
  // Actually, hugeicons defaults to size={24}. 
  // Let's omit size entirely if not provided, or provide size="1em".
  // wait, hugeicons-react uses size={24} by default.
  // We'll just pass size={size || "1em"}.
  
  return <IconComponent className={cn(remainingClasses)} size={size || "1em"} {...props} />;
}
