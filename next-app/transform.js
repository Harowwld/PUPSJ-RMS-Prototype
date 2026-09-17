export default function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  
  // Icon mapping
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

  let iconsToImport = new Set();
  let hasChanges = false;

  // Process all <LucideIcon> elements
  root.find(j.JSXElement, {
    openingElement: { name: { name: 'LucideIcon' } }
  }).forEach(path => {
    const classNameAttr = path.node.openingElement.attributes.find(
      attr => attr.name && attr.name.name === 'className'
    );
    
    if (!classNameAttr) return;

    // Helper to process class strings
    const processClassString = (classStr) => {
      let iconName = null;
      let remaining = [];
      const parts = classStr.split(' ');
      
      for (const part of parts) {
        if (part.startsWith('ph-') && !['ph-bold', 'ph-fill', 'ph-duotone', 'ph-light', 'ph-thin'].includes(part)) {
          iconName = part.replace('ph-', '');
        } else if (part.startsWith('ti-') && part !== 'ti') {
          iconName = part.replace('ti-', '');
        } else if (!part.startsWith('ph-') && part !== 'ti' && part.trim() !== '') {
          remaining.push(part);
        }
      }
      return { iconName, newClassName: remaining.join(' ') };
    };

    // 1. StringLiteral
    if (classNameAttr.value.type === 'StringLiteral') {
      const { iconName, newClassName } = processClassString(classNameAttr.value.value);
      if (iconName) {
        const lucideComp = getLucideName(iconName);
        iconsToImport.add(lucideComp);
        
        path.node.openingElement.name.name = lucideComp;
        if (path.node.closingElement) path.node.closingElement.name.name = lucideComp;
        
        if (newClassName) {
          classNameAttr.value.value = newClassName;
        } else {
          // Remove className attribute
          path.node.openingElement.attributes = path.node.openingElement.attributes.filter(
            attr => attr.name.name !== 'className'
          );
        }
        hasChanges = true;
      }
    } 
    // 2. JSXExpressionContainer (e.g. className={cn(...)})
    else if (classNameAttr.value.type === 'JSXExpressionContainer') {
       // A very simple dynamic fallback for ALL complex cases!
       // Instead of transforming ternaries to React nodes (which is insanely complex), 
       // let's transform `<LucideIcon className={cond ? "ph-eye" : "ph-x"} />`
       // back to `<i className={cond ? "ph-eye" : "ph-x"} />`?
       // NO, the goal is to ONLY use lucide icon.
       // What if we keep `<LucideIcon>` for the dynamic ones?
       // The instruction says "directly import and use lucide-react components instead of relying on the runtime translator or Phosphor classes".
       // We MUST transform ternaries!
       
       // Let's find ternaries inside the expression
       // e.g. cond ? "ph-eye" : "ph-x"
       // We can just leave this node as <LucideIcon> and handle it manually, OR we can write an AST transform that converts the JSXElement itself!
    }
  });

  return hasChanges ? root.toSource() : null;
}
