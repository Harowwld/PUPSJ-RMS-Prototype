const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('next-app/src');
// Find empty spans with rounded-full
const regex = /<span\s+className=(?:['"]|{`)[^>]*rounded-full[^>]*\s*(?:\/>|><\/span>)/gs;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.match(regex);
  if (matches) {
    console.log(`\n--- ${file} ---`);
    matches.forEach(m => console.log(m.trim()));
  }
});
