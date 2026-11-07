import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT_DIR = process.cwd()

test('DashboardSearch elevates leading search icon and trailing controls with z-10', () => {
  const file = path.join(ROOT_DIR, 'src/components/systemadmin/DashboardSearch.js')
  assert.ok(fs.existsSync(file), 'DashboardSearch.js must exist')
  const content = fs.readFileSync(file, 'utf8')

  assert.ok(
    content.includes('Search01Icon') && content.includes('z-10'),
    'DashboardSearch must have z-10 on Search01Icon'
  )
  assert.ok(
    content.includes('right-2.5 z-10'),
    'DashboardSearch must have z-10 on trailing controls container'
  )
})

test('Search inputs in key staff and admin components elevate icons with z-10', () => {
  const filesToCheck = [
    'src/components/admin/StaffDirectoryTab.js',
    'src/components/admin/DigitalRecordsReviewTab.js',
    'src/components/admin/DigitizationComplianceTab.js',
    'src/components/admin/OSASOrganizationComplianceView.js',
    'src/components/admin/system-config/DocTypesTab.js',
    'src/components/admin/system-config/CoursesTab.js',
    'src/components/admin/system-config/SectionsTab.js',
    'src/components/admin/system-config/BulkImportTab.js',
    'src/components/admin/audit-logs/LogFilters.js',
    'src/components/staff/StudentDirectoryTab.js',
    'src/components/staff/StudentOrganizationsTab.js',
    'src/components/staff/DocumentRequestsTab.js',
    'src/components/staff/DocumentsTab.js',
    'src/components/staff/BatchReviewTab.js',
    'src/components/staff/RecordsArchiveTab.js',
    'src/components/staff/NotificationsTab.js',
    'src/components/staff/OfficeDocumentsTable.js',
    'src/components/staff/OsasMonitoringTab.js',
    'src/components/student/StudentComplianceTab.js',
    'src/app/student/page.js',
    'src/components/shared/PageHeader.js',
  ]

  for (const relativePath of filesToCheck) {
    const fullPath = path.join(ROOT_DIR, relativePath)
    assert.ok(fs.existsSync(fullPath), `${relativePath} must exist`)
    const content = fs.readFileSync(fullPath, 'utf8')
    assert.ok(
      content.includes('z-10'),
      `${relativePath} must contain z-10 for its search input icon or adorner`
    )
  }
})

test('globals.css defines universal stacking guard for relative input adornments and icons', () => {
  const cssFile = path.join(ROOT_DIR, 'src/app/globals.css')
  const content = fs.readFileSync(cssFile, 'utf8')

  assert.ok(
    content.includes('.relative > svg.absolute') || content.includes('.relative > .pointer-events-none'),
    'globals.css must define universal stacking context guard for input icons'
  )
  assert.ok(
    content.includes('z-index: 10'),
    'globals.css must set z-index: 10 on input adornments'
  )
})
