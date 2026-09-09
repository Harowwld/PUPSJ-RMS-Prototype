import fs from 'fs';
import path from 'path';

const dirs = [
  'src/components/admin',
  'src/components/staff'
];

const mappings = [
  { light: 'text-gray-400', dark: 'dark:text-zinc-500', type: 'dark:text' },
  { light: 'text-gray-500', dark: 'dark:text-zinc-400', type: 'dark:text' },
  { light: 'bg-gray-100', dark: 'dark:bg-zinc-800', type: 'dark:bg' },
  { light: 'bg-gray-200', dark: 'dark:bg-zinc-700', type: 'dark:bg' },
  { light: 'border-gray-300', dark: 'dark:border-zinc-700', type: 'dark:border' },
];

function healDoubleOpacities(content) {
  return content.replace(/([a-z0-9:-]+)\/([0-9]+)\/([0-9]+)/g, '$1/$2');
}

function processClassName(className) {
  let classes = className.split(/\s+/);
  let changed = false;

  mappings.forEach(({ light, dark, type }) => {
    // Handle both normal and important classes
    [light, '!' + light].forEach(l => {
      if (classes.includes(l)) {
        const isImportant = l.startsWith('!');
        // Tailwind important variant is dark:!bg-xxx
        const targetDark = isImportant ? dark.replace('dark:', 'dark:!') : dark;
        const targetType = isImportant ? type.replace('dark:', 'dark:!') : type;

        const darkIndex = classes.findIndex(c => c.startsWith(targetType + '-'));
        if (darkIndex !== -1) {
          if (classes[darkIndex] !== targetDark) {
            classes[darkIndex] = targetDark;
            changed = true;
          }
        } else {
          classes.push(targetDark);
          changed = true;
        }
      }
    });
  });

  return changed ? classes.join(' ') : className;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // 1. Heal double opacities
  content = healDoubleOpacities(content);

  // 2. Process all string literals
  // This handles className="..." as well as variables like const s = "bg-gray-100"
  content = content.replace(/(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g, (match, p1, p2, p3) => {
    const quote = p1 !== undefined ? '"' : p2 !== undefined ? "'" : '`';
    const className = p1 || p2 || p3 || '';
    
    // We only want to process strings that look like they might contain classes
    // (e.g., have spaces or match one of our light classes)
    const hasPossibleClass = mappings.some(m => className.includes(m.light));
    if (hasPossibleClass) {
        const newClassName = processClassName(className);
        if (newClassName !== className) {
          return `${quote}${newClassName}${quote}`;
        }
    }
    return match;
  });

  // 3. Skeleton components -> dark:bg-zinc-800
  content = content.replace(/<Skeleton\b([^>]*)\/?>/g, (match, attributes) => {
    if (!attributes.includes('dark:bg-zinc-800')) {
      if (attributes.includes('className=')) {
        if (attributes.includes('dark:bg-')) {
            return match.replace(/dark:bg-[a-z0-9-/]+/g, 'dark:bg-zinc-800');
        } else {
            return match.replace(/className=(?:"([^"]*)"|'([^']*)'|{`([^`]*)`})/, (m, p1, p2, p3) => {
                const quote = p1 !== undefined ? '"' : p2 !== undefined ? "'" : '{`';
                const endQuote = p1 !== undefined ? '"' : p2 !== undefined ? "'" : '`}';
                const className = p1 || p2 || p3 || '';
                return `className=${quote}dark:bg-zinc-800 ${className}${endQuote}`;
            });
        }
      } else {
        return match.replace('<Skeleton', '<Skeleton className="dark:bg-zinc-800"');
      }
    }
    return match;
  });

  // 4. Separator components -> dark:bg-zinc-800
  content = content.replace(/<Separator\b([^>]*)\/?>/g, (match, attributes) => {
    if (!attributes.includes('dark:bg-zinc-800')) {
      if (attributes.includes('className=')) {
        if (attributes.includes('dark:bg-')) {
            return match.replace(/dark:bg-[a-z0-9-/]+/g, 'dark:bg-zinc-800');
        } else {
            return match.replace(/className=(?:"([^"]*)"|'([^']*)'|{`([^`]*)`})/, (m, p1, p2, p3) => {
                const quote = p1 !== undefined ? '"' : p2 !== undefined ? "'" : '{`';
                const endQuote = p1 !== undefined ? '"' : p2 !== undefined ? "'" : '`}';
                const className = p1 || p2 || p3 || '';
                return `className=${quote}dark:bg-zinc-800 ${className}${endQuote}`;
            });
        }
      } else {
        return match.replace('<Separator', '<Separator className="dark:bg-zinc-800"');
      }
    }
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });
  return arrayOfFiles;
}

dirs.forEach(dir => {
  const fullPath = path.resolve(dir);
  if (fs.existsSync(fullPath)) {
    const files = getAllFiles(fullPath);
    files.forEach(processFile);
  }
});
