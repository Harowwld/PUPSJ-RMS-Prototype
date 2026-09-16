import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

// The mapping from LucideIconTranslator.js (manually extracted)
const iconMapping = {
  "magnifying-glass": "search",
  "magnifying-glass-minus": "zoom-out",
  "arrow-counter-clockwise": "rotate-ccw",
  "arrows-left-right": "arrow-left-right",
  "arrows-out": "expand",
  "device-mobile": "smartphone",
  "door": "door-closed",
  "hard-drives": "server",
  "magnifying-glass-plus": "zoom-in",
  "plugs": "plug",
  "users-three": "users",
  "warning-circle": "alert-circle",
  "warning": "alert-triangle",
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

  // Find all <i className="..."></i> or <i className={cn(...)} />
  // We'll use a regex that matches `<i className=...>` up to the closing `</i>` or `/>`
  // Because className can contain cn(), it's a bit complex.
  // Instead, let's just find `ph-[a-z0-9-]+` globally and if it's inside an `<i>`, replace it.
  // A simpler way: replace <i className="ph-bold ph-eye ..."></i> with <Eye className="..." />
  // Regex for <i className="...ph-..."></i>
  
  content = content.replace(/<i\s+className=["'\{](.*?)["'\}]\s*(?:><\/i>|\/>)/g, (match, classNameContent) => {
    // Check if it has ph-
    if (!classNameContent.includes('ph-')) return match;
    
    // Extract the ph- icon name
    const matchPh = classNameContent.match(/ph-([a-z0-9-]+)/g);
    if (!matchPh) return match;
    
    // Some classes are variants: ph-bold, ph-fill, ph-duotone, ph-light, ph-thin
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
    
    if (!mainIcon) return match; // just variant? fallback
    
    const ComponentName = getLucideComponentName(mainIcon);
    iconsToImport.add(ComponentName);
    
    // Clean up extra spaces in className string
    otherClasses = otherClasses.replace(/\s+/g, ' ').trim();
    
    let newClassProp = '';
    if (otherClasses.length > 0) {
      if (match.includes('cn(')) {
         // It was className={cn(...)}
         // The regex matched everything inside the {}, which might be `cn("ph-bold ph-eye", ...)`
         // We replaced the ph- classes inside it.
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
    // Check if lucide-react import already exists
    if (content.includes('from "lucide-react"')) {
      content = content.replace(/import\s+\{([^}]+)\}\s+from\s+"lucide-react"\s*;?/, (m, existing) => {
        const existingImports = existing.split(',').map(s => s.trim());
        for (const i of iconsToImport) {
          if (!existingImports.includes(i)) existingImports.push(i);
        }
        return `import { ${existingImports.join(', ')} } from "lucide-react";`;
      });
    } else if (content.includes("from 'lucide-react'")) {
      content = content.replace(/import\s+\{([^}]+)\}\s+from\s+'lucide-react'\s*;?/, (m, existing) => {
        const existingImports = existing.split(',').map(s => s.trim());
        for (const i of iconsToImport) {
          if (!existingImports.includes(i)) existingImports.push(i);
        }
        return `import { ${existingImports.join(', ')} } from "lucide-react";`;
      });
    } else {
      // Add import at the top
      const importStmt = `import { ${imports} } from "lucide-react";\n`;
      // Put after the last import, or at top
      const lastImportIdx = content.lastIndexOf('import ');
      if (lastImportIdx !== -1) {
        const endOfImport = content.indexOf('\n', lastImportIdx);
        content = content.slice(0, endOfImport + 1) + importStmt + content.slice(endOfImport + 1);
      } else {
        content = importStmt + content;
      }
    }
  }
  
  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Migrated', file);
  }
}
