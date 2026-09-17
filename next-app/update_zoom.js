const fs = require('fs');
const files = [
  'src/app/systemadmin/page.js',
  'src/app/admin/page.js',
  'src/app/staff/page.js',
  'src/app/student/page.js'
];
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/useState\(3\)/g, 'useState(6)');
  content = content.replace(/setZoomNode\(3\)/g, 'setZoomNode(6)');
  fs.writeFileSync(file, content);
});
console.log('Done replacing');
