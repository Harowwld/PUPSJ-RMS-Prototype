import fs from 'fs';
import { globSync } from 'glob';

const files = globSync('src/**/*.{js,jsx}');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  if (content.includes('ph-') && content.includes('<i ')) {
    // Replace opening tags that have className and ph-
    const newContent = content.replace(/<i(\s+[^>]*?className=(?:\"[^\"]*ph-[^\"]*\"|\'[^\']*ph-[^\']*\'|\{[^\}]*ph-[^\}]*\})[^>]*?)>/g, '<LucideIcon$1>');
    if (newContent !== content) {
      content = newContent;
      // Replace closing tags - but only if we replaced opening tags, 
      // wait, we can just safely replace all </i> with </LucideIcon> if there are no other <i> tags used for italics.
      // Let's assume all </i> are icons if changed.
      content = content.replace(/<\/i>/g, '</LucideIcon>');
      
      // Also self closing <i ... /> -> <LucideIcon ... /> 
      // The first regex handles <i ... /> as `<LucideIcon ... />` because it matches the > at the end.
      // Wait, `<i className="ph-..." />` ends with `/>`. `[^>]*?` captures the `/`. So it becomes `<LucideIcon className="..." />`. That's perfect.
      
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
    console.log("Migrated", file);
  }
}
