const fs = require('fs');

const sidebarPath = 'next-app/src/components/shared/Sidebar.js';
let code = fs.readFileSync(sidebarPath, 'utf8');

code = code.replace(
  'const defaultColor = isSystemAdmin ? "#0f172a" : (isStaff ? "#EDBB00" : "#EA580C")',
  'const defaultColor = "#232e3b"'
);

code = code.replace(
  'const activeColor = accentColor || defaultColor',
  'const activeColor = "#232e3b"'
);

code = code.replace(
  'const staffIconColor = accentColor || defaultColor',
  'const staffIconColor = "#232e3b"'
);

fs.writeFileSync(sidebarPath, code);
console.log("Patched Sidebar accent color");
