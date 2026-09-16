import fs from 'fs';
import { globSync } from 'glob';
import * as babel from '@babel/core';

const files = globSync('src/**/*.{js,jsx}');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = babel.parseSync(content, {
      sourceType: 'module',
      plugins: ['jsx', 'estree'],
    });
  } catch(e) {
    continue;
  }
  
  let changed = false;
  
  babel.traverse(ast, {
    JSXElement(path) {
      if (path.node.openingElement.name.name === 'i') {
        const classAttr = path.node.openingElement.attributes.find(
          a => a.name && a.name.name === 'className'
        );
        if (!classAttr) return;
        
        // Let's check if the className has `ph-` anywhere in the raw source string 
        const loc = classAttr.loc;
        if (!loc) return;
        
        const attrStr = content.substring(loc.start.index, loc.end.index);
        if (attrStr.includes('ph-')) {
          path.node.openingElement.name.name = 'LucideIcon';
          if (path.node.closingElement) {
             path.node.closingElement.name.name = 'LucideIcon';
          }
          changed = true;
        }
      }
    }
  });

  if (changed) {
    const { code } = babel.transformFromAstSync(ast, content, {
       retainLines: true,
       plugins: ['@babel/plugin-syntax-jsx']
    });
    
    // Add import for LucideIcon
    let newCode = code;
    if (!newCode.includes('import LucideIcon')) {
       // Insert after last import or at top
       // wait, babel transform might have shifted some things. 
       // let's just prepend safely after "use client"
       let directives = '';
       if (newCode.startsWith('"use client"') || newCode.startsWith("'use client'")) {
         directives = newCode.substring(0, 13) + '\n';
         newCode = newCode.substring(13).trimStart();
       }
       newCode = directives + `import LucideIcon from "@/components/shared/LucideIcon";\n` + newCode;
    }
    fs.writeFileSync(file, newCode);
    console.log("Migrated", file);
  }
}
