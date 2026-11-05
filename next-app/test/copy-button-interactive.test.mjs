import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

test('CopyButton implements Approach A (Text-only Apple HIG interactive copy pattern)', () => {
  const copyButtonPath = path.join(ROOT_DIR, 'src/components/shared/CopyButton.jsx')
  assert.ok(fs.existsSync(copyButtonPath), 'CopyButton.jsx must exist')
  const code = fs.readFileSync(copyButtonPath, 'utf8')

  // 1. Text-only approach without static icons
  assert.ok(!code.includes('<Copy01Icon'), 'Must not render static leading icons (Approach A)')

  // 2. Standard Verb + Noun grammar
  assert.ok(code.includes('Copy ${entityName}'), 'Must default to Action Verb + Specific Noun (Copy [Entity])')
  assert.ok(code.includes('${entityName} Copied!'), 'Must transition to explicit status confirmation ([Entity] Copied!)')

  // 3. Zero layout shift via CSS grid cell stacking
  assert.ok(code.includes('inline-grid grid-cols-1 grid-rows-1'), 'Must use CSS Grid cell stacking to prevent layout shift')
  assert.ok(code.includes('col-start-1 row-start-1'), 'Both states must occupy the exact same grid slot')

  // 4. Emerald color transition upon copy
  assert.ok(code.includes('bg-emerald-50'), 'Must apply soft emerald background tint when copied')
  assert.ok(code.includes('text-emerald-800') || code.includes('text-emerald-700'), 'Must apply emerald text contrast')

  // 5. Accessibility & Transient timer
  assert.ok(code.includes('aria-live="polite"'), 'Must include aria-live="polite" for screen reader announcements')
  assert.ok(code.includes('2000'), 'Must revert after 2000ms duration')
  assert.ok(code.includes('clearTimeout'), 'Must clean up timeout on unmount')
})

test('CopyButton is integrated into modals, sheets, and dialogs across the application', () => {
  const targets = [
    'src/components/shared/RecoveryCodesModal.js',
    'src/components/shared/DefaultPasswordModal.js',
    'src/components/systemadmin/GlobalStaffTab.js',
    'src/components/admin/audit-logs/LogDetailSheet.js',
    'src/components/systemadmin/CampusOperationsTab.js',
    'src/components/shared/CommandPalette.js',
    'src/components/admin/system-config/BulkImportTab.js',
  ]

  for (const rel of targets) {
    const fullPath = path.join(ROOT_DIR, rel)
    assert.ok(fs.existsSync(fullPath), `${rel} must exist`)
    const src = fs.readFileSync(fullPath, 'utf8')
    assert.ok(src.includes('CopyButton'), `${rel} must import and use CopyButton`)
  }
})
