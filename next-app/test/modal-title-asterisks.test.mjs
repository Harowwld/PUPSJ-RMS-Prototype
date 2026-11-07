import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

function getSourceFiles(dir) {
  let results = []
  const list = fs.readdirSync(dir)
  for (const file of list) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat && stat.isDirectory()) {
      results = results.concat(getSourceFiles(fullPath))
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(fullPath)
    }
  }
  return results
}

test('All DialogTitle headers adhere to Title Case', () => {
  const srcDir = path.join(ROOT_DIR, 'src')
  const files = getSourceFiles(srcDir)
  const dialogTitlePattern = /<DialogTitle[^>]*>(.*?)<\/DialogTitle>/gs

  const nonTitleCaseFiles = []

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    let match
    while ((match = dialogTitlePattern.exec(content)) !== null) {
      const rawText = match[1].trim()
      // If it's pure static text (no JSX interpolations like {title} or conditionals)
      if (!rawText.includes('{') && !rawText.includes('}')) {
        // Words in title should generally start with uppercase (excluding minor articles/prepositions if not first/last)
        const words = rawText.split(/\s+/).filter(w => /^[a-zA-Z]/.test(w))
        const hasLowercaseMajorWord = words.some((w, idx) => {
          // Allow minor words in middle: and, of, in, for, to, the, by, with, or
          const minorWords = ['and', 'of', 'in', 'for', 'to', 'the', 'by', 'with', 'or', 'on', 'a', 'an']
          if (idx > 0 && idx < words.length - 1 && minorWords.includes(w.toLowerCase())) {
            return false
          }
          // First character should be uppercase
          return w[0] === w[0].toLowerCase() && w[0] !== w[0].toUpperCase()
        })

        if (hasLowercaseMajorWord) {
          nonTitleCaseFiles.push({ file: path.relative(ROOT_DIR, file), title: rawText })
        }
      }
    }
  }

  assert.deepEqual(
    nonTitleCaseFiles,
    [],
    `Found DialogTitles not following Title Case: ${JSON.stringify(nonTitleCaseFiles, null, 2)}`
  )
})

test('Form field labels in modals and pages do not contain red asterisks (*)', () => {
  const srcDir = path.join(ROOT_DIR, 'src')
  const files = getSourceFiles(srcDir)

  const asteriskLabelFiles = []
  const labelPattern = /<label[^>]*>(.*?)<\/label>/gs

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    let match
    while ((match = labelPattern.exec(content)) !== null) {
      const inner = match[1]
      // Strip comments
      const innerNoComments = inner.replace(/\/\*.*?\*\//gs, '')
      // Check if there is an asterisk in rendered text (not in accept="..." or regex)
      const textOnly = innerNoComments.replace(/<[^>]+>/g, '').trim()
      if (textOnly.includes('*')) {
        asteriskLabelFiles.push({ file: path.relative(ROOT_DIR, file), label: textOnly })
      }
    }
  }

  assert.deepEqual(
    asteriskLabelFiles,
    [],
    `Found labels with required asterisks: ${JSON.stringify(asteriskLabelFiles, null, 2)}`
  )
})

test('Optional field tags are lowercase (optional) rather than (Optional)', () => {
  const srcDir = path.join(ROOT_DIR, 'src')
  const files = getSourceFiles(srcDir)

  const capitalizedOptionalFiles = []

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    const lines = content.split('\n')
    lines.forEach((line, idx) => {
      // Check if line contains (Optional) in JSX text (not inside comments)
      if (line.includes('(Optional)') && !line.trim().startsWith('{/*') && !line.trim().startsWith('//')) {
        capitalizedOptionalFiles.push({ file: path.relative(ROOT_DIR, file), line: idx + 1, text: line.trim() })
      }
    })
  }

  assert.deepEqual(
    capitalizedOptionalFiles,
    [],
    `Found (Optional) that should be standardized to (optional): ${JSON.stringify(capitalizedOptionalFiles, null, 2)}`
  )
})
