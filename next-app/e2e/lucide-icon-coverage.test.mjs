import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import * as lucideIcons from "lucide-react";

const sourceRoot = path.resolve(process.cwd(), "src");
const resolverPath = path.resolve(process.cwd(), "src/components/shared/LucideIcon.js");
const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const iconVariants = new Set(["bold", "fill", "duotone", "light", "thin"]);

async function collectSourceFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectSourceFiles(entryPath));
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(entryPath);
  }

  return files;
}

function toLucideName(rawName, mapping) {
  const mappedName = mapping[rawName];
  if (mappedName) return mappedName;
  const camelName = rawName.replace(/-([a-z0-9])/g, (_, character) => character.toUpperCase());
  return camelName.charAt(0).toUpperCase() + camelName.slice(1);
}

test("every LucideIcon mapping and static icon call site resolves to an installed icon", async () => {
  const resolverSource = await fs.readFile(resolverPath, "utf8");
  const mapping = Object.fromEntries(
    [...resolverSource.matchAll(/"([^"]+)":\s*"([^"]+)"/g)].map(([, rawName, lucideName]) => [rawName, lucideName]),
  );

  assert.equal(mapping["paper-plane-right"], "Send", "paper-plane-right must map to Lucide Send");

  for (const [rawName, lucideName] of Object.entries(mapping)) {
    assert.ok(lucideIcons[lucideName], `${rawName} maps to missing lucide icon ${lucideName}`);
  }

  const sourceFiles = await collectSourceFiles(sourceRoot);
  const rawNames = new Set();
  for (const file of sourceFiles) {
    const source = await fs.readFile(file, "utf8");
    for (const [, rawName] of source.matchAll(/(?:ph|ti)-([a-z0-9-]+)/g)) {
      if (!iconVariants.has(rawName)) rawNames.add(rawName);
    }
  }

  for (const rawName of rawNames) {
    const lucideName = toLucideName(rawName, mapping);
    assert.ok(lucideIcons[lucideName], `${rawName} resolves to missing lucide icon ${lucideName}`);
  }
});
