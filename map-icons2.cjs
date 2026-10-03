const fs = require('fs');
const iconKeys = fs.readFileSync('hugeicons-list.txt', 'utf8').split('\n');

const lucideToHuge = {
  "Search": "Search01Icon",
  "ZoomOut": "ZoomOutIcon",
  "ZoomIn": "ZoomInIcon",
  "Settings": "Settings01Icon",
  "Home": "Home01Icon",
  "Mail": "Mail01Icon",
  "FolderOpen": "FolderOpenIcon", // or Folder01Icon
  "Pencil": "PencilEdit01Icon",
  "Trash2": "Delete01Icon",
  "X": "Cancel01Icon",
  "Check": "Tick01Icon",
  "Plus": "Add01Icon",
  "Minus": "MinusSignIcon",
  "ChevronDown": "ArrowDown01Icon",
  "ChevronRight": "ArrowRight01Icon",
  "ChevronLeft": "ArrowLeft01Icon",
  "ChevronUp": "ArrowUp01Icon",
  "Calendar": "Calendar01Icon",
  "Frown": "Sad01Icon",
  "Loader2": "Loading01Icon",
  "EyeOff": "ViewOffIcon",
  "Download": "Download01Icon",
  "Upload": "Upload01Icon",
  "FileSpreadsheet": "File01Icon",
  "CloudUpload": "CloudUploadIcon",
  "ShieldOff": "ShieldOffIcon",
  "ShieldAlert": "ShieldWarningIcon",
  "BarChart": "Analytics01Icon",
  "LineChart": "ChartLineData01Icon",
  "PieChart": "PieChartIcon",
  "FileCheck": "FileAcceptIcon",
  "Columns": "Layout01Icon",
  "CheckCircle": "TickCircleIcon",
  "XCircle": "CancelCircleIcon",
  "ArrowLeft": "ArrowLeft02Icon",
  "ArrowRight": "ArrowRight02Icon",
  "FileText": "File02Icon",
  "CheckSquare": "Task01Icon",
  "Square": "SquareIcon",
  "Bell": "Notification01Icon",
  "BellOff": "NotificationOff01Icon",
  "Archive": "Archive01Icon",
  "ArchiveRestore": "Archive02Icon", // just an approximation
  "Scan": "ScanIcon",
  "Users": "UserMultiple01Icon",
  "UserPlus": "UserAdd01Icon",
  "ArrowUpRight": "ArrowUpRight01Icon",
  "ShieldCheck": "ShieldTickIcon",
  "Eye": "ViewIcon",
  "Camera": "Camera01Icon",
  "Key": "Key01Icon",
  "Clock": "Clock01Icon",
  "Copy": "Copy01Icon",
  "Link": "Link01Icon",
  "Heart": "FavouriteIcon",
  "Cog": "Setting01Icon",
  "Paperclip": "Attachment01Icon",
  "File": "File01Icon",
  "CheckCheck": "TickDouble01Icon",
  "Save": "Save01Icon",
  "BadgeCheck": "Badge01Icon",
  "BookOpen": "BookOpen01Icon",
  "Laptop": "LaptopIcon",
  "MessageSquare": "Message01Icon",
  "FolderArchive": "FolderArchiveIcon",
  "Building2": "Building01Icon",
  "Building": "Building02Icon",
  "LayoutGrid": "LayoutGridIcon",
  "Activity": "Activity01Icon",
  "History": "Time01Icon", // history
  "LogIn": "Login01Icon",
  "Newspaper": "NewspaperIcon",
  "Radio": "RadioIcon",
  "Box": "Box01Icon",
  "ChevronsUpDown": "ArrowUpDown01Icon",
  "RefreshCw": "RefreshIcon",
  "Shield": "Shield01Icon",
  "Usb": "UsbIcon",
  "Lock": "Lock01Icon",
  "GraduationCap": "EducationIcon",
  "ArrowUpDown": "ArrowUpDown02Icon",
  "Zap": "EnergyIcon",
  "TrendingUp": "TrendUp01Icon",
  "MousePointer": "Mouse01Icon",
  "GripVertical": "DragDropIcon", // or Menu01Icon
  "Library": "LibraryIcon",
  "ListOrdered": "ListViewIcon",
  "RotateCw": "ReloadIcon",
  "Layers": "Layers01Icon",
  "ListFilter": "FilterIcon",
  "Inbox": "Inbox01Icon",
  "UserCheck": "UserStatusIcon",
  "UserCog": "UserSetting01Icon",
  "FilePlus": "FileAddIcon",
  "Minimize2": "MinimizeIcon",
  "Maximize2": "MaximizeIcon",
  "ExternalLink": "LinkSquare01Icon",
  "Mails": "MailMultiple01Icon",
  "ClipboardList": "ClipboardIcon",
  "IdCard": "IdCardIcon",
  "Info": "InformationIcon",
  "Wrench": "Tool01Icon",
  "Monitor": "Monitor01Icon",
  "Workflow": "Workflow01Icon", // approximate
  "HelpCircle": "QuestionCircleIcon",
  "Files": "FileMultipleIcon",
  "Scale": "ScalesIcon",
  "Type": "TextFontIcon",
  "MousePointerClick": "Click01Icon",
  "Devices": "DevicesIcon",
  "Pointer": "PointerIcon",
  "Hourglass": "HourglassIcon",
  "Globe": "Globe01Icon",
  "BellRing": "Notification02Icon",
  "List": "Menu01Icon", // or List01Icon
  "RectangleHorizontal": "RectangleIcon",
  "Waves": "WaveIcon",
  "Send": "SentIcon",
  "FileUp": "FileUploadIcon",
  "Route": "Route01Icon",
  "PanelBottom": "LayoutBottomIcon",
  "RotateCcw": "Reload01Icon", // approximate
  "ArrowLeftRight": "ArrowLeftRight01Icon",
  "Expand": "ExpandIcon",
  "Smartphone": "SmartPhone01Icon",
  "DoorClosed": "Door01Icon",
  "Server": "ServerIcon",
  "Plug": "Plug01Icon",
  "AlertCircle": "Alert01Icon",
  "AlertTriangle": "Alert02Icon",
  "Warehouse": "WarehouseIcon",
  "DatabaseBackup": "DatabaseIcon", // approx
  "PanelLeftClose": "LayoutLeftIcon",
  "MoveHorizontal": "ArrowLeftRight02Icon",
  "LayoutDashboard": "DashboardSquare01Icon",
  "Image": "Image01Icon",
  "GitMerge": "GitMergeIcon",
  "ClipboardCheck": "ClipboardTickIcon",
  "LogOut": "Logout01Icon",
  "Database": "Database01Icon",
  "MapPin": "Location01Icon",
  "Fingerprint": "Fingerprint01Icon",
  "ArrowDown": "ArrowDown01Icon"
};

function findClosest(lucideName) {
  if (lucideToHuge[lucideName] && iconKeys.includes(lucideToHuge[lucideName])) {
    return lucideToHuge[lucideName];
  }
  
  const exact = lucideName + 'Icon';
  if (iconKeys.includes(exact)) return exact;
  const with01 = lucideName + '01Icon';
  if (iconKeys.includes(with01)) return with01;
  const with02 = lucideName + '02Icon';
  if (iconKeys.includes(with02)) return with02;
  
  const lower = lucideName.toLowerCase();
  for (let key of iconKeys) {
    if (key.toLowerCase().includes(lower)) return key;
  }
  return 'StarIcon';
}

const currentMappingText = fs.readFileSync('current-mapping.txt', 'utf8');
const lines = currentMappingText.split('\n');
const result = {};

for (let line of lines) {
  const match = line.match(/"(.*)": "(.*)"/);
  if (match) {
    const raw = match[1];
    const lucide = match[2];
    result[raw] = findClosest(lucide);
  }
}

const code = `"use client";
import React from 'react';
import * as icons from 'hugeicons-react';
import { cn } from '@/lib/utils';

const iconMapping = ${JSON.stringify(result, null, 2)};

function toCamelCase(str) {
  return str.replace(/-([a-z0-9])/g, (g) => g[1].toUpperCase());
}

function getHugeName(rawName) {
  if (iconMapping[rawName]) return iconMapping[rawName];
  const camelName = toCamelCase(rawName);
  const capitalized = camelName.charAt(0).toUpperCase() + camelName.slice(1);
  return capitalized + 'Icon';
}

export default function LucideIcon({ className, size, ...props }) {
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
       console.warn(\`Hugeicons: Icon \${hugeName} not found for \${rawIconName}\`);
       IconComponent = icons['HelpCircleIcon'] || icons['StarIcon'] || Object.values(icons)[0];
    }
  }
  
  if (!IconComponent) return null;
  // Convert standard size (like "1em" or unspecified) to a reasonable pixel size if needed, but hugeicons handles size via props.
  // We'll pass size as number or string. Lucide uses size="1em" in the old code. We will default to size="1em" or omit it.
  
  // Actually, hugeicons defaults to size={24}. 
  // Let's omit size entirely if not provided, or provide size="1em".
  // wait, hugeicons-react uses size={24} by default.
  // We'll just pass size={size || "1em"}.
  
  return <IconComponent className={cn(remainingClasses)} size={size || "1em"} {...props} />;
}
`;

fs.writeFileSync('next-app/src/components/shared/LucideIcon.js', code);
console.log("Rewrote LucideIcon.js to use hugeicons-react!");
