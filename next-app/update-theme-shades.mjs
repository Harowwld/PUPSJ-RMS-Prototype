import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, 'src');

const replacements = [
  // Order matters: more specific first
  { 
    pattern: /dark:(hover:|active:|group-hover:)?bg-zinc-950(\/[0-9]+)?/g, 
    replacement: (match, prefix, opacity) => `dark:${prefix || ''}bg-muted${opacity ? '/30' : ''}`
  },
  { 
    pattern: /dark:(hover:|active:|group-hover:)?bg-black\/(20|40)/g, 
    replacement: (match, prefix) => `dark:${prefix || ''}bg-white/5` 
  },
];

// Special replacement for dark:bg-background in components
function replaceBackgroundInComponents(content, filePath) {
  // If it's a page component, we need to be careful not to replace the main background
  const isPage = filePath.includes('app') && filePath.endsWith('page.js');
  
  if (isPage) {
    // Only replace dark:bg-background if it's NOT on the main container
    // We'll assume the main container is one of the first few lines and has h-screen or min-h-screen
    // This is a bit risky with regex, so we'll try to target specific elements like headers, cards
    content = content.replace(/<(thead|div|span|button|section)[^>]+className="[^"]*dark:bg-background[^"]*"[^>]*>/g, (match) => {
      if (match.includes('h-screen') || match.includes('min-h-screen')) {
        return match; // Keep main page background
      }
      return match.replace('dark:bg-background', 'dark:bg-card');
    });
  } else {
    // In components, dark:bg-background is usually used for sub-elements that should be gray
    content = content.replace(/dark:bg-background/g, 'dark:bg-card');
  }
  return content;
}

// Special replacement for thead
function updateTableHeaders(content) {
  return content.replace(/<thead[^>]+className="[^"]*bg-gray-50[^"]*"[^>]*>/g, (match) => {
    if (!match.includes('dark:bg-')) {
       return match.replace('className="', 'className="dark:bg-muted ');
    }
    return match.replace(/dark:bg-(background|zinc-950|black\/20|black\/40)/g, 'dark:bg-muted');
  });
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;

      // Apply standard replacements
      for (const { pattern, replacement } of replacements) {
        content = content.replace(pattern, replacement);
      }

      // Apply specialized replacements
      content = replaceBackgroundInComponents(content, fullPath);
      content = updateTableHeaders(content);

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

console.log('Starting theme update...');
processDirectory(path.join(__dirname, 'src/components'));
processDirectory(path.join(__dirname, 'src/app'));
console.log('Theme update complete.');
