import fs from 'fs';
import { globSync } from 'glob';

const files = globSync('src/**/*.{js,jsx}');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  if (content.includes('<i ') || content.includes('<i>')) {
    // Replace opening tags that have className and ph- or ti-
    const newContent = content.replace(/<i(\s+[^>]*?className=[\s\S]*?)>/g, '<LucideIcon $1>');
    if (newContent !== content) {
      content = newContent;
      // Because we replaced ALL `<i className="..." >` with `<LucideIcon ... >`
      // We can just replace ALL `</i>` with `</LucideIcon>` safely.
      content = content.replace(/<\/i>/g, '</LucideIcon>');
      changed = true;
    }
  }

  if (changed) {
    if (!content.includes('import LucideIcon')) {
       let directives = '';
       if (content.startsWith('"use client"') || content.startsWith("'use client'")) {
         directives = content.substring(0, 13) + '\n';
         content = content.substring(13).trimStart();
       }
       content = directives + `import LucideIcon from "@/components/shared/LucideIcon";\n` + content;
    }
    fs.writeFileSync(file, content);
  }
}
