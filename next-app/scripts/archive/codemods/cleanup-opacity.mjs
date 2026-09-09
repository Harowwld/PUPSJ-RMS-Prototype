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
    
    // Replace /50/50, /50/50/50, /50/50/20 etc. with /50
    // Pattern: one or more / followed by numbers, repeated
    // Specifically looking for the case where we have multiple slashes
    
    // This regex looks for / followed by digits, and then one or more occurrences of / followed by digits
    const malformedRegex = /\/([0-9]+)(\/[0-9]+)+/g;
    
    content = content.replace(malformedRegex, (match) => {
        // The user specifically said "Simplify them to just /50"
        return '/50';
    });
    
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
        totalReplacements++;
    }
}

console.log(`Cleanup complete. Updated ${totalReplacements} files.`);
