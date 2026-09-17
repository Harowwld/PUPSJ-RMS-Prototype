import fs from 'fs';
import { globSync } from 'glob';

// The mapping from LucideIconTranslator.js (manually extracted)
const iconMapping = {
  "magnifying-glass": "search",
  "gear-six": "settings",
  "house": "home",
  "envelope": "mail",
  "folder-open": "folder-open",
  "pencil-simple": "pencil",
  "trash": "trash-2",
  "x": "x",
  "check": "check",
  "plus": "plus",
  "minus": "minus",
  "caret-down": "chevron-down",
  "caret-right": "chevron-right",
  "caret-left": "chevron-left",
  "caret-up": "chevron-up",
  "calendar-blank": "calendar",
  "mask-sad": "frown",
  "spinner": "loader-2",
  "eye-slash": "eye-off",
  "download-simple": "download",
  "upload-simple": "upload",
  "file-csv": "file-spreadsheet",
  "cloud-arrow-up": "cloud-upload",
  "shield-slash": "shield-off",
  "shield-key": "shield-alert",
  "chart-bar": "bar-chart",
  "file-check": "file-check",
  "layout-sidebar": "columns",
  "check-circle": "check-circle",
  "x-circle": "x-circle",
  "arrow-left": "arrow-left",
  "arrow-right": "arrow-right",
  "file-text": "file-text",
  "file-pdf": "file-text",
  "check-square": "check-square",
  "square": "square",
  "bell": "bell",
  "bell-slash": "bell-off",
  "bell-simple-slash": "bell-off",
  "archive": "archive",
  "archive-restore": "archive-restore",
  "scan": "scan",
  "users": "users",
  "user-plus": "user-plus",
  "arrow-up-right": "arrow-up-right",
  "shield-check": "shield-check",
  "eye": "eye",
  "camera": "camera",
  "key": "key",
  "clock": "clock",
  "copy": "copy",
  "link": "link",
  "heart": "heart",
  "gear": "cog",
  "paperclip": "paperclip",
  "file": "file",
  "checks": "check-check",
  "floppy-disk": "save",
  "certificate": "badge-check",
  "book-2": "book-open",
  "device-laptop": "laptop",
  "messages": "message-square",
  "folder-archive": "folder-archive",
  "buildings": "building-2",
  "building": "building",
  "squares-four": "layout-grid",
  "heartbeat": "activity",
  "clock-counter-clockwise": "history",
  "sign-in": "log-in",
  "newspaper-clipping": "newspaper",
  "broadcast": "radio",
  "cube": "box",
  "caret-up-down": "chevrons-up-down",
  "arrows-clockwise": "refresh-cw",
  "shield-star": "shield",
  "usb-slash": "usb",
  "lock-key": "lock",
  "envelope-simple": "mail",
  "student": "graduation-cap",
  "circle-notch": "loader-2",
  "arrows-vertical": "arrow-up-down",
  "calendar-dots": "calendar",
  "lightning": "zap",
  "chart-line-up": "trending-up",
  "mouse-left-click": "mouse-pointer",
  "dots-six-vertical": "grip-vertical",
  "books": "library",
  "list-numbers": "list-ordered",
  "rotate-2": "rotate-cw",
  "stack": "layers",
  "list-magnifying-glass": "list-filter",
  "tray": "inbox",
  "user-focus": "user-check",
  "archive-tray": "archive",
  "user-circle-gear": "user-cog",
  "file-dashed": "file-plus",
  "corners-in": "minimize-2",
  "corners-out": "maximize-2",
  "arrow-square-out": "external-link",
  "envelopes": "mails",
  "clipboard-text": "clipboard-list",
  "check-double": "check-check",
  "rotate-clockwise": "rotate-cw",
  "identification-badge": "id-card",
  "info-circle": "info",
  "tools": "wrench",
  "desktop": "monitor",
  "device-desktop": "monitor",
  "flow-arrow": "workflow",
  "workflow": "workflow",
  "question": "help-circle",
  "question-circle": "help-circle",
  "help-circle": "help-circle",
  "files": "files",
  "scales": "scale",
  "text-t": "type",
  "cursor-click": "mouse-pointer-click",
  "devices": "monitor-smartphone",
  "hand-pointing": "pointer",
  "clock-countdown": "hourglass",
  "globe-hemisphere-east": "globe",
  "bell-ringing": "bell-ring",
  "list-dashes": "list",
  "button": "rectangle-horizontal",
  "wave-sine": "waves",
  "paper-plane-tilt": "send",
  "file-arrow-up": "file-up",
  "folder-notch-open": "folder-open",
  "path": "route",
  "browser": "panel-bottom",
  "panel-bottom": "panel-bottom",
};

function toCamelCase(str) {
  return str.replace(/-([a-z0-9])/g, (g) => g[1].toUpperCase());
}

function getLucideComponentName(phName) {
  const lucideName = iconMapping[phName] || phName;
  const camelName = toCamelCase(lucideName);
  return camelName.charAt(0).toUpperCase() + camelName.slice(1);
}

const files = globSync('src/**/*.{js,jsx}');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  const iconsToImport = new Set();

  content = content.replace(/<i\s+className=["'\{](.*?)["'\}]\s*(?:><\/i>|\/>)/g, (match, classNameContent) => {
    if (!classNameContent.includes('ph-')) return match;
    
    const matchPh = classNameContent.match(/ph-([a-z0-9-]+)/g);
    if (!matchPh) return match;
    
    const variants = ["ph-bold", "ph-fill", "ph-duotone", "ph-light", "ph-thin"];
    
    let mainIcon = null;
    let otherClasses = classNameContent;
    
    for (const p of matchPh) {
      if (!variants.includes(p)) {
        mainIcon = p.replace('ph-', '');
        otherClasses = otherClasses.replace(p, '').trim();
      } else {
        otherClasses = otherClasses.replace(p, '').trim();
      }
    }
    
    if (!mainIcon) return match; 
    
    const ComponentName = getLucideComponentName(mainIcon);
    iconsToImport.add(ComponentName);
    
    otherClasses = otherClasses.replace(/\s+/g, ' ').trim();
    
    let newClassProp = '';
    if (otherClasses.length > 0) {
      if (match.includes('cn(')) {
         newClassProp = `className={${otherClasses}}`;
      } else {
         newClassProp = `className="${otherClasses}"`;
      }
    }
    
    return `<${ComponentName} ${newClassProp} />`.replace('  ', ' ');
  });
  
  if (iconsToImport.size > 0) {
    changed = true;
    const imports = Array.from(iconsToImport).join(', ');
    
    const importRegex = /import\s+\{([^}]+)\}\s+from\s+["']lucide-react["']\s*;?/;
    if (importRegex.test(content)) {
      content = content.replace(importRegex, (m, existing) => {
        const existingImports = existing.split(',').map(s => s.trim()).filter(s => s);
        for (const i of iconsToImport) {
          if (!existingImports.includes(i)) existingImports.push(i);
        }
        return `import { ${existingImports.join(', ')} } from "lucide-react";`;
      });
    } else {
      let directives = '';
      if (content.startsWith('"use client"') || content.startsWith("'use client'")) {
        directives = content.substring(0, 13) + '\n';
        content = content.substring(13).trimStart();
      }
      content = directives + `import { ${imports} } from "lucide-react";\n` + content;
    }
  }
  
  if (changed) {
    fs.writeFileSync(file, content);
  }
}
console.log('Fixed imports');
