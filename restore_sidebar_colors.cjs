const fs = require('fs');
const file = 'next-app/src/components/shared/Sidebar.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'const defaultColor = "#232e3b"',
  'const defaultColor = isSystemAdmin ? "#0f172a" : (isStaff ? "#EDBB00" : "#EA580C")'
);

content = content.replace(
  'const activeColor = "#232e3b"',
  'const activeColor = accentColor || defaultColor'
);

content = content.replace(
  'const staffIconColor = "#232e3b"',
  'const staffIconColor = accentColor || defaultColor'
);

fs.writeFileSync(file, content);
console.log("Restored activeColor in Sidebar.js");
