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
        
        // Let's just look at the code generated for this attribute
        const { code: attrCode } = babel.transformFromAstSync(
          babel.types.file(babel.types.program([babel.types.expressionStatement(classAttr.value)])), 
          '', 
          { plugins: ['@babel/plugin-syntax-jsx'] }
        );
        
        if (attrCode.includes('ph-')) {
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
    
    let newCode = code;
    if (!newCode.includes('import LucideIcon')) {
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
