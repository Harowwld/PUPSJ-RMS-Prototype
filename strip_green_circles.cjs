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
// This regex will match `<span ... rounded-full ... bg-emerald/bg-green/amber/rose ... />` or `... ></span>`
// It focuses on those used as tiny dots (e.g. w-1, w-2, w-1.5, w-2.5) 
const regex1 = /<span\s+className=(['"]|{`)[^>]*w-[0-9\.]+[^>]*h-[0-9\.]+[^>]*rounded-full[^>]*\1\s*(?:\/>|><\/span>)/g;
const regex2 = /<span\s+className=(['"]|{`)[^>]*h-[0-9\.]+[^>]*w-[0-9\.]+[^>]*rounded-full[^>]*\1\s*(?:\/>|><\/span>)/g;

let totalRemoved = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  // Let's explicitly target the ones the user highlighted, and also any other tiny green/emerald status dots.
  // Actually, we'll just target ALL empty spans with rounded-full and w-*/h-*
  // Wait, some might be colored gray or amber (like in Continuous Scanning inactive state).
  
  content = content.replace(/<span\s+className=\{?[`'"][^>]*h-[0-9\.]+ w-[0-9\.]+ rounded-full[^>]*[`'"]\}?\s*\/>/g, '');
  content = content.replace(/<span\s+className=\{?[`'"][^>]*w-[0-9\.]+ h-[0-9\.]+ rounded-full[^>]*[`'"]\}?\s*\/>/g, '');
  content = content.replace(/<span\s+className=\{?[`'"][^>]*h-[0-9\.]+ w-[0-9\.]+ rounded-full[^>]*[`'"]\}?\s*><\/span>/g, '');
  content = content.replace(/<span\s+className=\{?[`'"][^>]*w-[0-9\.]+ h-[0-9\.]+ rounded-full[^>]*[`'"]\}?\s*><\/span>/g, '');
  
  // There are some with "flex h-2 w-2" or "animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
  content = content.replace(/<span\s+className=(?:['"]|{`)[^>]*rounded-full[^>]*bg-(?:emerald|green)[^>]*\s*(?:\/>|><\/span>)/g, '');
  content = content.replace(/<span\s+className=(?:['"]|{`)[^>]*animate-ping[^>]*rounded-full[^>]*\s*(?:\/>|><\/span>)/g, '');

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Removed circles from ${file}`);
    totalRemoved++;
  }
});
console.log(`Total files modified: ${totalRemoved}`);
