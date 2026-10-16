import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT_DIR = process.cwd()

test('Checkbox Styles in globals.css', () => {
  const cssPath = path.join(ROOT_DIR, 'src/app/globals.css')
  assert.ok(fs.existsSync(cssPath), 'globals.css must exist')
  const css = fs.readFileSync(cssPath, 'utf8')

  // Must not have circular checkbox rule
  assert.ok(
    !css.includes('border-radius: 50% !important;'),
    'globals.css must not force circular border-radius: 50% on checkboxes'
  )

  // Must have 4px border radius
  assert.ok(
    css.includes('border-radius: 4px !important;'),
    'globals.css must set border-radius: 4px !important on checkboxes'
  )

  // Must protect .sr-only
  assert.ok(
    css.includes('input[type="checkbox"]:not(.sr-only)'),
    'globals.css must target :not(.sr-only) to protect toggle switches and hidden inputs'
  )

  // Must contain crisp SVG checkmark
  assert.ok(
    css.includes('data:image/svg+xml') && css.includes("stroke='white'"),
    'globals.css must contain SVG checkmark data-URI for :checked'
  )

  // Must contain dark stroke checkmark for system admin dark theme
  assert.ok(
    css.includes("stroke='%2318181b'"),
    'globals.css must provide dark checkmark stroke for system admin dark mode'
  )
})

test('Table Clickable Rows in Components', () => {
  // 1. BulkImportTab
  const bulkImportPath = path.join(ROOT_DIR, 'src/components/admin/system-config/BulkImportTab.js')
  assert.ok(fs.existsSync(bulkImportPath))
  const bulkImportCode = fs.readFileSync(bulkImportPath, 'utf8')
  assert.ok(
    bulkImportCode.includes('toggleImportRowSelected(row.index)'),
    'BulkImportTab must allow toggling row selection'
  )
  assert.ok(
    bulkImportCode.includes('isSelectable && "cursor-pointer"'),
    'BulkImportTab must render cursor-pointer on selectable rows'
  )

  // 2. DigitalRecordsReviewTab
  const reviewTabPath = path.join(ROOT_DIR, 'src/components/admin/DigitalRecordsReviewTab.js')
  assert.ok(fs.existsSync(reviewTabPath))
  const reviewCode = fs.readFileSync(reviewTabPath, 'utf8')
  assert.ok(
    reviewCode.includes('handlePreview(r)'),
    'DigitalRecordsReviewTab must trigger preview on reviewed rows'
  )

  // 3. DigitizationComplianceTab
  const complianceTabPath = path.join(ROOT_DIR, 'src/components/admin/DigitizationComplianceTab.js')
  assert.ok(fs.existsSync(complianceTabPath))
  const complianceCode = fs.readFileSync(complianceTabPath, 'utf8')
  assert.ok(
    complianceCode.includes('setCourseFilter') && complianceCode.includes('cursor-pointer'),
    'DigitizationComplianceTab course breakdown rows must be clickable with cursor-pointer'
  )

  // 4. StudentComplianceTab
  const studentCompPath = path.join(ROOT_DIR, 'src/components/student/StudentComplianceTab.js')
  assert.ok(fs.existsSync(studentCompPath))
  const studentCompCode = fs.readFileSync(studentCompPath, 'utf8')
  assert.ok(
    studentCompCode.includes('PopoverTrigger') && studentCompCode.includes('Details'),
    'StudentComplianceTab table view must provide Details popover'
  )

  // 5. OfficeManagementTab
  const officePath = path.join(ROOT_DIR, 'src/components/systemadmin/OfficeManagementTab.js')
  assert.ok(fs.existsSync(officePath))
  const officeCode = fs.readFileSync(officePath, 'utf8')
  assert.ok(
    officeCode.includes('toggleSelect(office.id, e)'),
    'OfficeManagementTab table view must have row click selection'
  )
})
