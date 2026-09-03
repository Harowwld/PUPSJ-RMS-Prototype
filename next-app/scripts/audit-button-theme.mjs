import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "src");
const extensions = new Set([".js", ".jsx", ".tsx"]);
const badButtonColor = /glassColor=|(?:bg-(?:white|gray-(?:50|100|200)|blue-(?:50|100)|red-(?:50|100)|yellow-(?:50|100)|orange-(?:50|100))|bg-\[[^\]]+\])[^>]*(?:text-white|text-\[#FFFFFF\])|(?:text-white|text-\[#FFFFFF\])[^>]*(?:bg-(?:white|gray-(?:50|100|200)|blue-(?:50|100)|red-(?:50|100)|yellow-(?:50|100)|orange-(?:50|100))|bg-\[[^\]]+\])|bg-\[(?:#0A84FF|#007AFF|#FF9500)\]/i;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (extensions.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

for (const file of walk(root)) {
  const source = fs.readFileSync(file, "utf8");
  const linesBefore = (position) => source.slice(0, position).split("\n").length;
  const componentDeclarations = [...source.matchAll(/(?:function\s+([A-Z]\w*)|const\s+([A-Z]\w*)\s*=)/g)];
  const tags = /<(?:Button|button)\b/g;
  let match;
  while ((match = tags.exec(source))) {
    let end = match.index;
    let quote = null;
    let braces = 0;
    while (end < source.length) {
      const char = source[end++];
      if (quote) {
        if (char === quote && source[end - 2] !== "\\") quote = null;
        continue;
      }
      if (char === "\"" || char === "'") quote = char;
      else if (char === "{") braces += 1;
      else if (char === "}") braces = Math.max(0, braces - 1);
      else if (char === ">" && braces === 0) break;
    }
    const openingTag = source.slice(match.index, end);
    if (!badButtonColor.test(openingTag)) continue;
    const component = componentDeclarations
      .filter((declaration) => declaration.index < match.index)
      .at(-1);
    const name = component?.[1] || component?.[2] || path.basename(file);
    const line = source.slice(match.index, end).split("\n")[0].trim();
    console.log(`${path.relative(process.cwd(), file)}:${linesBefore(match.index)}\t${name}\t${line}`);
  }
}
