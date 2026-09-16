import fs from 'fs';
import { globSync } from 'glob';

const files = globSync('src/**/*.{js,jsx}');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  if (content.includes('<i ')) {
    // Just replace ALL <i ...> with <LucideIcon ...>
    // Wait, are there ANY <i> tags that are NOT icons? Like <i>Italics</i>?
    const matches = content.match(/<i[^>]*>/g) || [];
    let hasItalics = false;
    for (const m of matches) {
      if (!m.includes('className=')) {
        hasItalics = true;
      }
    }
    
    // Replace ALL <i> that HAVE className to <LucideIcon>
    const newContent = content.replace(/<i\s+([^>]*?className=[\s\S]*?)>/g, '<LucideIcon $1>');
    if (newContent !== content) {
      content = newContent;
      // To properly replace closing </i>, we can't just replace all </i> if there are italics.
      // But we can check if the codebase uses <i> for italics at all.
      if (!hasItalics) {
         content = content.replace(/<\/i>/g, '</LucideIcon>');
      } else {
         console.warn("WARNING: file has non-icon <i>", file);
      }
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
