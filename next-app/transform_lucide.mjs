import fs from 'fs';
import { globSync } from 'glob';
import * as babel from '@babel/core';
import parser from '@babel/parser';
import _traverse from '@babel/traverse';
import _generate from '@babel/generator';

const traverse = _traverse.default;
const generate = _generate.default;

const iconMapping = {
  "magnifying-glass": "search",
  "magnifying-glass-minus": "zoom-out",
  "magnifying-glass-plus": "zoom-in",
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
  "arrow-counter-clockwise": "rotate-ccw",
  "arrows-left-right": "arrow-left-right",
  "arrows-out": "expand",
  "device-mobile": "smartphone",
  "door": "door-closed",
  "hard-drives": "server",
  "plugs": "plug",
  "users-three": "users",
  "warning-circle": "alert-circle",
  "warning": "alert-triangle",
};

function toCamelCase(str) {
  return str.replace(/-([a-z0-9])/g, (g) => g[1].toUpperCase());
}
function getLucideName(phName) {
  const lucideName = iconMapping[phName] || phName;
  const camelName = toCamelCase(lucideName);
  return camelName.charAt(0).toUpperCase() + camelName.slice(1);
}

const files = globSync('src/**/*.{js,jsx}');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parser.parse(content, {
      sourceType: 'module',
      plugins: ['jsx', 'estree'],
    });
  } catch(e) {
    continue;
  }
  
  let changed = false;
  const importsToAdd = new Set();
  
  traverse(ast, {
    JSXElement(path) {
      if (path.node.openingElement.name.name === 'i') {
        const classAttr = path.node.openingElement.attributes.find(
          a => a.name && a.name.name === 'className'
        );
        if (!classAttr) return;
        
        let hasPh = false;
        // StringLiteral
        if (classAttr.value.type === 'StringLiteral') {
           if (classAttr.value.value.includes('ph-')) hasPh = true;
        } else if (classAttr.value.type === 'JSXExpressionContainer') {
           // It's inside {}, we won't replace the tag if it's conditional, we'll replace it with an icon wrapper or just map it!
           // Wait! To make it robust: 
           // Let's create a `<DynamicLucideIcon className={...} />` component and replace ALL <i> tags with it!
           // Then we don't have to parse ternaries! The wrapper will just take `className` and parse it at runtime!
           hasPh = true; 
        }
        
        if (hasPh) {
          path.node.openingElement.name.name = 'LucideIcon';
          if (path.node.closingElement) {
             path.node.closingElement.name.name = 'LucideIcon';
          }
          changed = true;
        }
      }
    }
  });

  if (changed) {
    const { code } = generate(ast, { retainLines: true }, content);
    
    // Add import for LucideIcon
    let newCode = code;
    if (!newCode.includes('import LucideIcon')) {
       newCode = `import LucideIcon from "@/components/shared/LucideIcon";\n` + newCode;
    }
    fs.writeFileSync(file, newCode);
  }
}
