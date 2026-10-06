const fs = require('fs');
const { execSync } = require('child_process');

// Find all files with type="checkbox"
const out = execSync('grep -rl "type=\\"checkbox\\"" next-app/src/components', { encoding: 'utf8' });
const files = out.trim().split('\n').filter(Boolean);

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace h-4 w-4 or w-4 h-4
  content = content.replace(/className="([^"]*)h-4 w-4([^"]*)"/g, (match, p1, p2) => {
    if (!match.includes('m-0')) {
      return `className="${p1}h-4 w-4 m-0 align-middle shrink-0${p2}"`;
    }
    return match;
  });
  
  content = content.replace(/className=\{cn\([\s\S]*?"([^"]*)h-4 w-4([^"]*)"/g, (match, p1, p2) => {
    if (!match.includes('m-0')) {
      return match.replace(`${p1}h-4 w-4${p2}`, `${p1}h-4 w-4 m-0 align-middle shrink-0${p2}`);
    }
    return match;
  });

  // What about w-4 h-4?
  content = content.replace(/className="([^"]*)w-4 h-4([^"]*)"/g, (match, p1, p2) => {
    if (!match.includes('m-0')) {
      return `className="${p1}w-4 h-4 m-0 align-middle shrink-0${p2}"`;
    }
    return match;
  });
  
  fs.writeFileSync(file, content);
}
console.log("Patched all component checkboxes");
