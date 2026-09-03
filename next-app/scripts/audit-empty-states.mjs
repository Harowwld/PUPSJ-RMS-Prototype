import fs from "node:fs"
import path from "node:path"

const root = path.resolve("src")
const extensions = new Set([".js", ".jsx", ".ts", ".tsx"])
const dataCollections = new Set([
  "rows", "items", "records", "staff", "students", "notifications", "templates",
  "offices", "courses", "sections", "docTypes", "documents", "backups", "logs",
  "requests", "proposals", "rooms", "cabinets", "drawers", "history", "byCourse",
])
const files = []

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(fullPath)
    else if (extensions.has(path.extname(entry.name))) files.push(fullPath)
  }
}

function lineNumber(source, index) {
  return source.slice(0, index).split("\n").length
}

function parentComponent(source, index) {
  const before = source.slice(0, index)
  const matches = [...before.matchAll(/(?:function|class)\s+([A-Z][A-Za-z0-9_]*)|const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g)]
  const last = matches.at(-1)
  return last?.[1] || last?.[2] || "unknown"
}

walk(root)
const findings = []

for (const file of files) {
  const source = fs.readFileSync(file, "utf8")
  for (const match of source.matchAll(/\{\s*([A-Za-z_$][\w$]*)\.map\s*\(/g)) {
    const name = match[1]
    if (!dataCollections.has(name)) continue
    if (file.endsWith("components/shared/Sidebar.js")) continue
    const context = source.slice(match.index, match.index + 600)
    if (context.includes("<option") || context.includes("<SortIndicator") || context.includes("<Sidebar")) continue
    const hasLengthGuard = new RegExp(`(?:${name}\\s*\\.\\s*length\\s*(?:===|!==|>|<)|!${name}\\s*\\.\\s*length)`).test(source)
    if (!hasLengthGuard) {
      findings.push({
        file: path.relative(process.cwd(), file),
        line: lineNumber(source, match.index),
        component: parentComponent(source, match.index),
        collection: name,
      })
    }
  }
}

if (findings.length === 0) {
  console.log("All rendered collections have a detectable empty-state guard.")
  process.exit(0)
}

console.log("Collections without a detectable empty-state guard:")
for (const finding of findings) {
  console.log(`${finding.file}:${finding.line}\t${finding.component}\t${finding.collection}.map(...)`)
}
process.exitCode = 1
