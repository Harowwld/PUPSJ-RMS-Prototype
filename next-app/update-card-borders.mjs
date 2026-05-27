import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, 'src');

const filesToProcess = [];

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walk(filePath);
        } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
            filesToProcess.push(filePath);
        }
    }
}

walk(path.join(rootDir, 'components'));
walk(path.join(rootDir, 'app'));

console.log(`Found ${filesToProcess.length} files to process.`);

let totalReplacements = 0;

for (const filePath of filesToProcess) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Replace dark:border-zinc-800 and dark:border-zinc-700 without opacity suffix
    // with dark:border-zinc-800/50
    
    // Regex matches dark:border-zinc-800 or dark:border-zinc-700 followed by NOT a slash
    const targetRegex = /dark:border-zinc-(700|800)(?![/0-9])/g;
    
    content = content.replace(targetRegex, 'dark:border-zinc-800/50');
    
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated borders in: ${filePath}`);
        totalReplacements++;
    }
}

console.log(`Cleanup complete. Updated ${totalReplacements} files.`);
