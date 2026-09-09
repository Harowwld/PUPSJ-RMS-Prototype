import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, 'src', 'components');

const targetDirs = ['admin', 'staff', 'shared'];

const mappings = [
  { old: /dark:bg-zinc-950/g, new: 'dark:bg-muted' },
  { old: /dark:bg-zinc-900/g, new: 'dark:bg-card' },
  { old: /dark:bg-zinc-800/g, new: 'dark:bg-muted' },
  { old: /dark:hover:bg-zinc-950/g, new: 'dark:hover:bg-white/10' },
  { old: /dark:hover:bg-zinc-900/g, new: 'dark:hover:bg-white/5' },
  { old: /dark:hover:bg-zinc-800/g, new: 'dark:hover:bg-white/10' },
  { old: /dark:group-hover:bg-zinc-950/g, new: 'dark:group-hover:bg-white/10' },
  { old: /dark:group-hover:bg-zinc-900/g, new: 'dark:group-hover:bg-white/5' },
  { old: /dark:bg-black\/20/g, new: 'dark:bg-white/5' },
  { old: /dark:bg-black\/40/g, new: 'dark:bg-white/8' },
  
  // Opacity variations
  { old: /dark:hover:bg-zinc-950\/[0-9]+/g, new: 'dark:hover:bg-white/10' },
  { old: /dark:hover:bg-zinc-900\/[0-9]+/g, new: 'dark:hover:bg-white/5' },
  { old: /dark:hover:bg-zinc-800\/[0-9]+/g, new: 'dark:hover:bg-white/5' },
  { old: /dark:bg-zinc-900\/([0-9]+)/g, new: 'dark:bg-card/$1' },
  { old: /dark:bg-zinc-950\/([0-9]+)/g, new: 'dark:bg-muted/$1' },
  { old: /dark:bg-zinc-800\/([0-9]+)/g, new: 'dark:bg-muted/$1' },
  
  // Gradient variations
  { old: /dark:from-zinc-950/g, new: 'dark:from-muted' },
  { old: /dark:to-zinc-950/g, new: 'dark:to-muted' },
  { old: /dark:from-zinc-900/g, new: 'dark:from-card' },
  { old: /dark:to-zinc-900/g, new: 'dark:to-card' },
  { old: /dark:from-zinc-800/g, new: 'dark:from-muted' },
  { old: /dark:to-zinc-800/g, new: 'dark:to-muted' },
  
  // Gradient variations with opacity
  { old: /dark:from-zinc-950\/([0-9]+)/g, new: 'dark:from-muted/$1' },
  { old: /dark:to-zinc-950\/([0-9]+)/g, new: 'dark:to-muted/$1' },
  { old: /dark:from-zinc-900\/([0-9]+)/g, new: 'dark:from-card/$1' },
  { old: /dark:to-zinc-900\/([0-9]+)/g, new: 'dark:to-card/$1' },
  { old: /dark:from-zinc-800\/([0-9]+)/g, new: 'dark:from-muted/$1' },
  { old: /dark:to-zinc-800\/([0-9]+)/g, new: 'dark:to-muted/$1' },

  // Special cases
  { old: /bg-black\/20/g, new: 'bg-white/5' },
  { old: /bg-black\/40/g, new: 'bg-white/8' },
  { old: /dark:bg-zinc-900\/95/g, new: 'dark:bg-card/95' },
  { old: /dark:bg-zinc-900\/50/g, new: 'dark:bg-card/50' },
  
  // Cleanup previously introduced invalid classes or redundant ones
  { old: /dark:hover:bg-white\/10\/[0-9]+/g, new: 'dark:hover:bg-white/10' },
  { old: /dark:hover:bg-white\/5\/[0-9]+/g, new: 'dark:hover:bg-white/5' },
  { old: /dark:hover:bg-white\/10\s+dark:hover:bg-white\/10/g, new: 'dark:hover:bg-white/10' },
  { old: /dark:hover:bg-white\/5\s+dark:hover:bg-white\/10/g, new: 'dark:hover:bg-white/10' },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const mapping of mappings) {
    if (mapping.old.test(content)) {
      content = content.replace(mapping.old, mapping.new);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
      processFile(fullPath);
    }
  }
}

for (const dir of targetDirs) {
  const targetPath = path.join(rootDir, dir);
  if (fs.existsSync(targetPath)) {
    walk(targetPath);
  }
}
