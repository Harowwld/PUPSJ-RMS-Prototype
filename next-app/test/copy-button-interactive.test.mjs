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

  // 4. Stable button appearance (no color changes on copy)
  assert.ok(!code.includes('bg-emerald-50'), 'Must not change button background color when copied')
  assert.ok(!code.includes('text-emerald-800') && !code.includes('text-emerald-700'), 'Must not change button text color when copied')

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
    'src/components/systemadmin/OfficeDetailSheet.js',
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

test('FloatingActionBar and SuperAdmin secondary actions support interactive copy label swapping', () => {
  const fabPath = path.join(ROOT_DIR, 'src/components/shared/FloatingActionBar.js')
  const fabCode = fs.readFileSync(fabPath, 'utf8')

  assert.ok(fabCode.includes('FloatingSecondaryActionButton'), 'FloatingActionBar must use FloatingSecondaryActionButton')
  assert.ok(fabCode.includes('col-start-1 row-start-1'), 'FloatingActionBar copy buttons must use zero-layout-shift grid stacking')
  assert.ok(fabCode.includes('aria-live={isCopy ? "polite" : undefined}'), 'FloatingActionBar copy buttons must announce via aria-live')

  const globalStaffPath = path.join(ROOT_DIR, 'src/components/systemadmin/GlobalStaffTab.js')
  const globalStaffCode = fs.readFileSync(globalStaffPath, 'utf8')
  assert.ok(globalStaffCode.includes('copiedLabel: "Copied Emails"'), 'GlobalStaffTab must configure copiedLabel for emails')
  assert.ok(globalStaffCode.includes('copiedLabel: "Copied IDs"'), 'GlobalStaffTab must configure copiedLabel for IDs')
  assert.ok(globalStaffCode.includes('Copy Personnel Data'), 'GlobalStaffTab must provide Copy Personnel Data action')

  const officeMgmtPath = path.join(ROOT_DIR, 'src/components/systemadmin/OfficeManagementTab.js')
  const officeMgmtCode = fs.readFileSync(officeMgmtPath, 'utf8')
  assert.ok(officeMgmtCode.includes('copiedLabel: "Copied Codes"'), 'OfficeManagementTab must configure copiedLabel for codes')
  assert.ok(officeMgmtCode.includes('copiedStorageId === office.id'), 'OfficeManagementTab must provide interactive storage path copy')

  const backupsPath = path.join(ROOT_DIR, 'src/components/systemadmin/SystemBackupsTab.js')
  const backupsCode = fs.readFileSync(backupsPath, 'utf8')
  assert.ok(backupsCode.includes('copiedLabel: "Copied Filenames"'), 'SystemBackupsTab must configure copiedLabel for filenames')
})
