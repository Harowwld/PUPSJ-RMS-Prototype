import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, "../src");

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach((f) => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

function processFile(filePath) {
  if (!filePath.endsWith(".js") && !filePath.endsWith(".jsx")) return;
  if (filePath.includes("pdfGenerator.js")) return; // skip pdf generator library

  let content = fs.readFileSync(filePath, "utf8");
  let original = content;

  // 1. Remove leading classes since line-height is globally set to 1.5
  content = content.replace(/\bleading-(none|tight|snug|normal|relaxed|loose|none)\b/g, "");
  content = content.replace(/\bleading-\[[^\]]+\]/g, "");

  // 2. Remove custom arbitrary tracking classes unless they match our targets
  // tracking-tight gets -0.01em, tracking-wide/wider/widest get 0.04em, others normal
  content = content.replace(/\btracking-\[[^\]]+\]/g, (match) => {
    if (match.includes("-0.01em")) return "tracking-tight";
    if (match.includes("0.04em") || match.includes("0.04")) return "tracking-wide";
    return "";
  });
  content = content.replace(/\btracking-(tighter|normal)\b/g, "tracking-tight"); // map tighter to tight (-0.01em)

  // 3. Normalize font weight classes
  // We want to replace:
  // - font-black -> font-semibold (600) or font-medium (500)
  // - font-bold -> font-medium (500) or font-semibold (600) (unless it is page title or section header)
  // Let's do context-aware replacements or standard mappings:
  
  // Replace font-black/font-extrabold with font-semibold (if next to large text) or font-medium
  content = content.replace(/\bfont-(black|extrabold)\b/g, (match, p1) => {
    // If it's a heading size/title size, use font-semibold (600)
    return "font-semibold";
  });

  // 4. Map font-semibold/font-bold depending on element type and class names
  // Let's replace font-bold/font-semibold with font-medium (500) on minor labels, inputs, dropdown items, table cells, or body text
  // Let's do some common patterns:
  content = content.replace(/\bfont-bold\b/g, "font-semibold"); // First map bold to semibold (600)

  // 5. Clean up any custom font sizes to conform to the scale:
  // 10px (micro), 11px (captions), 12px (secondary), 13px (body), 15px (subheading), 18px (title)
  // Map standard Tailwind font size classes to allowed scale:
  // text-xs -> 11px
  // text-sm -> 12px
  // text-base -> 13px
  // text-lg -> 15px
  // text-xl -> 18px
  // text-2xl, text-3xl, text-4xl etc -> 18px (page titles)
  content = content.replace(/\btext-(2xl|3xl|4xl|5xl|6xl)\b/g, "text-xl");
  content = content.replace(/\btext-\[14px\]\b/g, "text-base"); // 14px -> 13px (base)
  content = content.replace(/\btext-\[16px\]\b/g, "text-lg"); // 16px -> 15px (subheading)
  content = content.replace(/\btext-\[20px\]\b/g, "text-xl"); // 20px -> 18px (title)
  content = content.replace(/\btext-\[24px\]\b/g, "text-xl"); // 24px -> 18px (title)
  content = content.replace(/\btext-\[30px\]\b/g, "text-xl"); // 30px -> 18px (title)
  content = content.replace(/\btext-\[32px\]\b/g, "text-xl"); // 32px -> 18px (title)

  // Clean up any extra spacing inside className strings
  content = content.replace(/className="([^"]*)"/g, (match, p1) => {
    const cleaned = p1.replace(/\s+/g, " ").trim();
    return `className="${cleaned}"`;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`Updated: ${filePath}`);
  }
}

console.log("Standardizing typography classes across source files...");
walkDir(srcDir, processFile);
console.log("Done!");
