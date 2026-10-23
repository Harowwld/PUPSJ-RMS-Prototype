import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT_DIR = process.cwd()

test('Popover Primitive Standard Geometry in popover.jsx', () => {
  const popoverPath = path.join(ROOT_DIR, 'src/components/ui/popover.jsx')
  assert.ok(fs.existsSync(popoverPath), 'popover.jsx must exist')
  const code = fs.readFileSync(popoverPath, 'utf8')

  assert.ok(
    code.includes('w-80'),
    'popover.jsx must define standard w-80 width'
  )
  assert.ok(
    !code.includes('sm:w-96'),
    'popover.jsx must NOT include sm:w-96 responsive blowout'
  )
  assert.ok(
    code.includes('rounded-2xl'),
    'popover.jsx must use Apple HIG rounded-2xl border radius'
  )
  assert.ok(
    !code.includes('rounded-lg'),
    'popover.jsx must not use rounded-lg'
  )
})

test('MultiCriteriaFilter Popover Size Consistency', () => {
  const filterPath = path.join(ROOT_DIR, 'src/components/shared/MultiCriteriaFilter.js')
  assert.ok(fs.existsSync(filterPath))
  const code = fs.readFileSync(filterPath, 'utf8')

  assert.ok(
    code.includes('className="w-80 rounded-2xl'),
    'MultiCriteriaFilter must use standard w-80 rounded-2xl'
  )
  assert.ok(
    !code.includes('sm:w-96'),
    'MultiCriteriaFilter must not include sm:w-96'
  )
})

test('StudentComplianceTab Popover Size Consistency', () => {
  const tabPath = path.join(ROOT_DIR, 'src/components/student/StudentComplianceTab.js')
  assert.ok(fs.existsSync(tabPath))
  const code = fs.readFileSync(tabPath, 'utf8')

  assert.ok(
    !code.includes('sm:w-96'),
    'StudentComplianceTab must not include sm:w-96 on any popovers'
  )
  assert.ok(
    !code.includes('w-96'),
    'StudentComplianceTab must not include w-96'
  )
})

test('Login Page Demo Accounts Popover Size Consistency', () => {
  const loginPath = path.join(ROOT_DIR, 'src/app/login/page.js')
  assert.ok(fs.existsSync(loginPath))
  const code = fs.readFileSync(loginPath, 'utf8')

  assert.ok(
    !code.includes('w-[370px]'),
    'login/page.js must not use arbitrary w-[370px]'
  )
  assert.ok(
    code.includes('className="w-80 p-0 rounded-2xl'),
    'login/page.js Demo Accounts must use standard w-80 rounded-2xl'
  )
})

test('RecordsArchiveTab Folder Color Popover Follows Three-Zone Architecture', () => {
  const archivePath = path.join(ROOT_DIR, 'src/components/staff/RecordsArchiveTab.js')
  assert.ok(fs.existsSync(archivePath))
  const code = fs.readFileSync(archivePath, 'utf8')

  assert.ok(
    code.includes('className="w-60 p-0 rounded-2xl'),
    'RecordsArchiveTab Folder Color must use standardized w-60 p-0 rounded-2xl'
  )
  assert.ok(
    code.includes('h-8 w-full rounded-lg'),
    'RecordsArchiveTab Folder Color swatches must use compact h-8 rounded-lg'
  )
  assert.ok(
    code.includes('Folder Color'),
    'RecordsArchiveTab Folder Color must include Header zone'
  )
  assert.ok(
    !code.includes('Default shade') && !code.includes('Custom shade'),
    'RecordsArchiveTab Folder Color must not include redundant shade footer'
  )
})

test('RecordsArchiveTab Arrange Records Dropdown Follows Three-Zone Architecture', () => {
  const archivePath = path.join(ROOT_DIR, 'src/components/staff/RecordsArchiveTab.js')
  assert.ok(fs.existsSync(archivePath))
  const code = fs.readFileSync(archivePath, 'utf8')

  assert.ok(
    code.includes('className="w-60 rounded-2xl border border-border dark:border-white/10 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 select-none"'),
    'RecordsArchiveTab Arrange Records must use w-60 rounded-2xl p-0 overflow-hidden'
  )
  assert.ok(
    code.includes('Arrange Records'),
    'RecordsArchiveTab Arrange Records must have Header zone'
  )
  assert.ok(
    !code.includes('Sort Mode</span>'),
    'RecordsArchiveTab Arrange Records must not include redundant sort mode footer'
  )
  assert.ok(
    code.includes('py-1.5 px-2 text-gray-700'),
    'RecordsArchiveTab Arrange Records items must use snug py-1.5 px-2 padding'
  )
})

test('Header.js User Profile Dropdown Follows Three-Zone Architecture with Clean Sign Out Footer', () => {
  const headerPath = path.join(ROOT_DIR, 'src/components/layout/Header.js')
  assert.ok(fs.existsSync(headerPath))
  const code = fs.readFileSync(headerPath, 'utf8')

  assert.ok(
    code.includes('className="w-80 rounded-2xl border border-border dark:border-white/10 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 select-none"'),
    'Header.js User Profile must use w-80 rounded-2xl p-0 overflow-hidden'
  )
  assert.ok(
    !code.includes('Active Session</span>'),
    'Header.js User Profile must not include redundant Active Session text in footer'
  )
  assert.ok(
    code.includes('Sign Out'),
    'Header.js User Profile must include Sign Out button in footer'
  )
})

test('SLAAnalyticsTab Export CSV and PDF Report Dropdowns Avoid Unnecessary Footers', () => {
  const slaPath = path.join(ROOT_DIR, 'src/components/admin/SLAAnalyticsTab.js')
  assert.ok(fs.existsSync(slaPath))
  const code = fs.readFileSync(slaPath, 'utf8')

  assert.ok(
    code.includes('className="w-60 rounded-2xl border border-border dark:border-white/10 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 select-none"'),
    'SLAAnalyticsTab Export CSV must use w-60 rounded-2xl p-0 overflow-hidden'
  )
  assert.ok(
    code.includes('Export Dataset'),
    'SLAAnalyticsTab Export CSV must include Header zone'
  )
  assert.ok(
    !code.includes('Spreadsheet (.csv)'),
    'SLAAnalyticsTab Export CSV must not include redundant format footer'
  )

  assert.ok(
    code.includes('className="w-64 rounded-2xl border border-border dark:border-white/10 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 select-none"'),
    'SLAAnalyticsTab Official Report PDF must use w-64 rounded-2xl p-0 overflow-hidden'
  )
  assert.ok(
    code.includes('Official Report'),
    'SLAAnalyticsTab Official Report PDF must include Header zone'
  )
  assert.ok(
    !code.includes('Archival Dossier'),
    'SLAAnalyticsTab Official Report PDF must not include redundant generator footer'
  )
})

test('GoogleDrivePdfCard Document Actions Dropdowns Avoid Unnecessary Footers', () => {
  const cardPath = path.join(ROOT_DIR, 'src/components/staff/GoogleDrivePdfCard.js')
  assert.ok(fs.existsSync(cardPath))
  const code = fs.readFileSync(cardPath, 'utf8')

  assert.ok(
    code.includes('className="w-52 rounded-2xl border border-border dark:border-white/10 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 select-none"'),
    'GoogleDrivePdfCard must use w-52 rounded-2xl p-0 overflow-hidden'
  )
  assert.ok(
    code.includes('Document Actions'),
    'GoogleDrivePdfCard must include Header zone'
  )
  assert.ok(
    !code.includes('Target</span>'),
    'GoogleDrivePdfCard must not include redundant target footer'
  )
})

test('StorageLayoutEditorTab Template Actions Dropdown Avoids Unnecessary Footers', () => {
  const editorPath = path.join(ROOT_DIR, 'src/components/admin/StorageLayoutEditorTab.js')
  assert.ok(fs.existsSync(editorPath))
  const code = fs.readFileSync(editorPath, 'utf8')

  assert.ok(
    code.includes('className="w-56 rounded-2xl border border-border dark:border-white/10 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 select-none z-50"'),
    'StorageLayoutEditorTab Template Actions must use w-56 rounded-2xl p-0 overflow-hidden'
  )
  assert.ok(
    code.includes('Template Actions'),
    'StorageLayoutEditorTab Template Actions must include Header zone'
  )
  assert.ok(
    !code.includes('Selected</span>'),
    'StorageLayoutEditorTab Template Actions must not include redundant selected template footer'
  )
})

test('Popover Typographic Font-Weight Consistency', () => {
  // 1. Primitive popover.jsx
  const popoverPath = path.join(ROOT_DIR, 'src/components/ui/popover.jsx')
  const popoverCode = fs.readFileSync(popoverPath, 'utf8')
  assert.ok(
    popoverCode.includes('font-semibold'),
    'PopoverTitle must use font-semibold'
  )
  assert.ok(
    popoverCode.includes('font-normal'),
    'PopoverDescription must use font-normal'
  )

  // 2. MultiCriteriaFilter.js
  const filterPath = path.join(ROOT_DIR, 'src/components/shared/MultiCriteriaFilter.js')
  const filterCode = fs.readFileSync(filterPath, 'utf8')
  assert.ok(
    filterCode.includes('text-[11px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider'),
    'MultiCriteriaFilter group labels must use font-semibold'
  )
  assert.ok(
    !filterCode.includes('font-bold'),
    'MultiCriteriaFilter must not use font-bold inside popover'
  )

  // 3. RecordsArchiveTab.js (Folder Color & Arrange Records)
  const archivePath = path.join(ROOT_DIR, 'src/components/staff/RecordsArchiveTab.js')
  const archiveCode = fs.readFileSync(archivePath, 'utf8')
  assert.ok(
    archiveCode.includes('Folder Color'),
    'Folder Color header must exist'
  )
  assert.ok(
    archiveCode.includes('text-xs font-semibold text-gray-900 dark:text-zinc-100'),
    'Folder Color header must use font-semibold'
  )
  assert.ok(
    archiveCode.includes('text-xs font-semibold text-gray-900 dark:text-zinc-100'),
    'Arrange Records header must use font-semibold'
  )

  // 4. StudentComplianceTab.js Popovers
  const tabPath = path.join(ROOT_DIR, 'src/components/student/StudentComplianceTab.js')
  const tabCode = fs.readFileSync(tabPath, 'utf8')
  assert.ok(
    tabCode.includes('text-[11px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider'),
    'StudentComplianceTab popover filter labels must use font-semibold'
  )
  assert.ok(
    tabCode.includes('text-sm font-semibold text-gray-900 dark:text-zinc-100'),
    'StudentComplianceTab popover item titles must use font-semibold'
  )
})

test('StudentComplianceTab Popovers Architecture Consistency', () => {
  const tabPath = path.join(ROOT_DIR, 'src/components/student/StudentComplianceTab.js')
  assert.ok(fs.existsSync(tabPath))
  const tabCode = fs.readFileSync(tabPath, 'utf8')

  assert.ok(
    tabCode.includes('className="w-80 rounded-2xl border border-border bg-white p-0 shadow-2xl dark:border-border dark:bg-zinc-900 overflow-hidden font-jakarta"'),
    'StudentComplianceTab filter popovers must use p-0 overflow-hidden'
  )
  assert.ok(
    tabCode.includes('{/* Popover Header */}'),
    'StudentComplianceTab filter popovers must include Header zone'
  )
  assert.ok(
    !tabCode.includes('Room 102 Archive</span>'),
    'StudentComplianceTab details popovers must not include redundant Room 102 Archive footer'
  )
})

test('Popover Primitive Exports Three-Zone Architecture Components', () => {
  const popoverPath = path.join(ROOT_DIR, 'src/components/ui/popover.jsx')
  const popoverCode = fs.readFileSync(popoverPath, 'utf8')

  assert.ok(popoverCode.includes('PopoverHeader'), 'popover.jsx must export PopoverHeader')
  assert.ok(popoverCode.includes('PopoverBody'), 'popover.jsx must export PopoverBody')
  assert.ok(popoverCode.includes('PopoverFooter'), 'popover.jsx must export PopoverFooter')
})

test('Datepicker Popovers Hug Content with w-auto without sm:w-auto Workaround', () => {
  const files = [
    'src/app/account/activity/page.js',
    'src/components/admin/audit-logs/LogFilters.js',
    'src/components/admin/DigitalRecordsReviewTab.js',
    'src/components/admin/analytics/SlaFilters.js',
    'src/components/admin/backup/BackupFilters.js',
    'src/components/systemadmin/GlobalAuditLogsTab.js',
  ]

  for (const relPath of files) {
    const fullPath = path.join(ROOT_DIR, relPath)
    assert.ok(fs.existsSync(fullPath), `${relPath} must exist`)
    const code = fs.readFileSync(fullPath, 'utf8')

    assert.ok(
      code.includes('w-auto'),
      `${relPath} must define w-auto on datepicker PopoverContent`
    )
    assert.ok(
      !/<PopoverContent[^>]*sm:w-auto/.test(code),
      `${relPath} PopoverContent should not need sm:w-auto workaround since base popover no longer has sm:w-96`
    )
  }
})

test('Popovers and Dropdown Headers Have Clean Icon-Free Typography', () => {
  // 1. MultiCriteriaFilter
  const filterCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/shared/MultiCriteriaFilter.js'), 'utf8')
  assert.ok(!filterCode.includes('ph-faders'), 'MultiCriteriaFilter popover header must not include decorative icon')
  assert.ok(!filterCode.includes('ph-funnel'), 'MultiCriteriaFilter trigger button must not include leading icon')

  // 2. RecordsArchiveTab
  const archiveCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/staff/RecordsArchiveTab.js'), 'utf8')
  assert.ok(!archiveCode.includes('ph-arrows-down-up text-xs'), 'Arrange Records header must not include decorative icon')

  // 3. StudentComplianceTab
  const complianceCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/student/StudentComplianceTab.js'), 'utf8')
  assert.ok(!complianceCode.includes('ph-faders'), 'StudentComplianceTab filter popover header must not include decorative icon')
  assert.ok(!complianceCode.includes('ph-file-text text-sm'), 'StudentComplianceTab details popover headers must not include decorative icon')

  // 4. SLAAnalyticsTab
  const slaCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/admin/SLAAnalyticsTab.js'), 'utf8')
  assert.ok(!slaCode.includes('ph-file-csv'), 'Export Dataset dropdown header must not include decorative icon')
  assert.ok(!slaCode.includes('ph-file-pdf text-xs'), 'Official Report dropdown header must not include decorative icon')
})
