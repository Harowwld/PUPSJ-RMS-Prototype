import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, 'src');

const replacements = [
  {
    // Translucent Zinc 950 -> Black/20
    pattern: /dark:bg-zinc-950\/\d+/g,
    replacement: 'dark:bg-black/20'
  },
  {
    // Zinc 950 -> Background
    pattern: /dark:bg-zinc-950(?!\/)/g,
    replacement: 'dark:bg-background'
  },
  {
    // Translucent Zinc 900 -> Card/80 or similar
    pattern: /dark:bg-zinc-900\/\d+/g,
    replacement: 'dark:bg-card/80'
  },
  {
    // Zinc 900 -> Card
    pattern: /dark:bg-zinc-900(?!\/)/g,
    replacement: 'dark:bg-card'
  },
  {
    // Zinc borders
    pattern: /dark:border-zinc-800(\/\d+)?/g,
    replacement: 'dark:border-white/10'
  }
];

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk(srcDir, (filePath) => {
  if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx') && !filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  for (const { pattern, replacement } of replacements) {
    content = content.replace(pattern, replacement);
  }

  if (content !== originalContent) {
    console.log(`Updating ${filePath}`);
    fs.writeFileSync(filePath, content, 'utf8');
  }
});
