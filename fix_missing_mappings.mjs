import fs from 'fs';
const file = 'next-app/run_migration.mjs';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  '"magnifying-glass": "search",',
  `"magnifying-glass": "search",
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
  "warning": "alert-triangle",`
);

fs.writeFileSync(file, code);
