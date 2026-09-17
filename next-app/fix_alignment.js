const fs = require('fs');
const files = [
  'src/app/admin/page.js',
  'src/app/staff/page.js',
  'src/app/student/page.js'
];
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /style=\{\{ zoom: \[0\.75, 0\.83, 0\.92, 1\.0, 1\.08, 1\.17, 1\.25\]\[zoomNode\] \}\}/g,
    "style={{ transform: `scale(${[0.75, 0.83, 0.92, 1.0, 1.08, 1.17, 1.25][zoomNode]})`, transformOrigin: 'top left', width: `${100 / [0.75, 0.83, 0.92, 1.0, 1.08, 1.17, 1.25][zoomNode]}%`, height: `${100 / [0.75, 0.83, 0.92, 1.0, 1.08, 1.17, 1.25][zoomNode]}%` }}"
  );
  fs.writeFileSync(file, content);
});
console.log('Replaced array-based zooms');

let sysAdminContent = fs.readFileSync('src/app/systemadmin/page.js', 'utf8');
sysAdminContent = sysAdminContent.replace(
  /style=\{\{ zoom: zoomFactor \}\}/g,
  "style={{ transform: `scale(${zoomFactor})`, transformOrigin: 'top left', width: `${100 / zoomFactor}%`, height: `${100 / zoomFactor}%` }}"
);
fs.writeFileSync('src/app/systemadmin/page.js', sysAdminContent);
console.log('Replaced zoomFactor');
