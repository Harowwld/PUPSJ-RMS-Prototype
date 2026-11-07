import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

test('RefreshButton aligns with standard secondary button styling and border tokens', () => {
  const refreshButtonPath = path.join(ROOT_DIR, 'src/components/shared/RefreshButton.js')
  assert.ok(fs.existsSync(refreshButtonPath), 'RefreshButton.js must exist')
  const code = fs.readFileSync(refreshButtonPath, 'utf8')

  // 1. Must use standard border-border tokens matching secondary buttons (no hardcoded black borders)
  assert.ok(
    code.includes('border-border') && code.includes('dark:border-border'),
    'RefreshButton must use border-border and dark:border-border to align with secondary buttons'
  )
  assert.ok(
    !code.includes('border-black') && !code.includes('border-[color:var(--brand-accent'),
    'RefreshButton must not render harsh black borders or jarring hover border overrides'
  )

  // 2. Must match standard secondary button surface and text colors
  assert.ok(
    code.includes('bg-white dark:bg-zinc-800'),
    'RefreshButton must use standard background matching secondary buttons'
  )
  assert.ok(
    code.includes('text-gray-700 dark:text-zinc-200'),
    'RefreshButton must use standard text/icon color matching secondary buttons'
  )
  assert.ok(
    code.includes('hover:bg-gray-50 dark:hover:bg-zinc-700'),
    'RefreshButton must use standard hover state matching secondary buttons'
  )

  // 3. Must use squircle radius and elevation shadow
  assert.ok(code.includes('rounded-xl'), 'RefreshButton must use rounded-xl radius')
  assert.ok(code.includes('shadow-xs'), 'RefreshButton must use shadow-xs elevation')
})
