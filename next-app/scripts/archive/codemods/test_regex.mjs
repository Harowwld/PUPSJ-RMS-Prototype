import fs from 'fs';
const filePath = 'next-app/src/components/admin/StaffDirectoryTab.js';
let content = fs.readFileSync(filePath, 'utf8');

const tagRegex = /<(Button|button)\b([\s\S]*?)>/g;
let match;
while ((match = tagRegex.exec(content)) !== null) {
    console.log(`Found tag: ${match[1]}`);
    const tagContent = match[2];
    const classNameAttrRegex = /className=(?:\{([\s\S]*?)\}|"([^"]*)")/g;
    let classMatch;
    while ((classMatch = classNameAttrRegex.exec(tagContent)) !== null) {
        console.log(`Found className: ${classMatch[1] || classMatch[2]}`);
    }
}
