import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const { parseSync } = require("next/dist/compiled/babel/core");

function sources(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? sources(file) : /\.[jt]sx?$/.test(file) ? [file] : [];
  });
}
function visit(node, callback) {
  if (!node || typeof node !== "object") return;
  callback(node);
  for (const [key, value] of Object.entries(node)) {
    if (["loc", "tokens", "comments"].includes(key)) continue;
    if (Array.isArray(value)) value.forEach((child) => visit(child, callback));
    else if (value && typeof value === "object") visit(value, callback);
  }
}
function staticCells(row) {
  const cells = [];
  for (const child of row.children || []) {
    if (child.type === "JSXText" || (child.type === "JSXExpressionContainer" && child.expression.type === "JSXEmptyExpression")) continue;
    if (child.type !== "JSXElement" || !["th", "TableHead", "SortableTableHeader"].includes(child.openingElement.name.name)) return null;
    cells.push(child);
  }
  return cells;
}

test("every application table uses the shared table and declares its column contract", () => {
  let tableCount = 0;
  for (const file of sources(path.resolve("src"))) {
    const source = fs.readFileSync(file, "utf8");
    if (!/<(?:table|Table)\b/.test(source)) continue;
    const primitive = file.endsWith(path.join("components", "ui", "table.jsx"));
    if (!primitive) assert.doesNotMatch(source, /<table\b/, `${file} bypasses shared density and presentation`);
    const ast = parseSync(source, { babelrc: false, configFile: false, parserOpts: { plugins: ["jsx"] } });
    visit(ast, (node) => {
      if (node.type !== "JSXElement" || node.openingElement.name.name !== "Table") return;
      tableCount += 1;
      const columns = node.openingElement.attributes.find((attribute) => attribute.name?.name === "columns");
      assert.ok(columns, `${file}:${node.loc.start.line} needs an explicit column contract`);
      const schema = columns.value?.expression;
      if (schema?.type !== "ArrayExpression" || schema.elements.some((entry) => entry?.type === "SpreadElement")) return;
      visit(node, (section) => {
        if (section.type !== "JSXElement" || !["thead", "TableHeader"].includes(section.openingElement.name.name)) return;
        for (const row of section.children || []) {
          if (row.type !== "JSXElement" || !["tr", "TableRow"].includes(row.openingElement.name.name)) continue;
          const cells = staticCells(row);
          if (cells) assert.equal(schema.elements.length, cells.length, `${file}:${node.loc.start.line}: column kinds and headers disagree`);
        }
      });
    });
  }
  assert.ok(tableCount >= 1, "The table inventory must include application tables");
});
