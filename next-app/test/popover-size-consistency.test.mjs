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
  assert.ok(
    code.includes('border-[0.5px] border-border dark:border-white/10'),
    'popover.jsx must define hairline border-[0.5px] border-border dark:border-white/10'
  )
})

test('Dropdown and Dialog Primitives Border Weight and Ring Elimination', () => {
  const ddPath = path.join(ROOT_DIR, 'src/components/ui/dropdown-menu.jsx')
  const ddCode = fs.readFileSync(ddPath, 'utf8')
  assert.ok(!ddCode.includes('ring-1'), 'dropdown-menu.jsx must not contain thick ring-1')
  assert.ok(ddCode.includes('border-[0.5px] border-border dark:border-white/10'), 'dropdown-menu.jsx must use hairline border-[0.5px]')

  const dialogPath = path.join(ROOT_DIR, 'src/components/ui/dialog.jsx')
  const dialogCode = fs.readFileSync(dialogPath, 'utf8')
  assert.ok(!dialogCode.includes('ring-1'), 'dialog.jsx must not contain thick ring-1')
  assert.ok(dialogCode.includes('border-[0.5px] border-border dark:border-white/10'), 'dialog.jsx must use hairline border-[0.5px]')
})

test('MultiCriteriaFilter Popover Size Consistency', () => {
  const filterPath = path.join(ROOT_DIR, 'src/components/shared/MultiCriteriaFilter.js')
  assert.ok(fs.existsSync(filterPath))
  const code = fs.readFileSync(filterPath, 'utf8')

  assert.ok(
    code.includes('popoverWidth') && code.includes('rounded-2xl'),
    'MultiCriteriaFilter must size its width from its option labels and use rounded-2xl'
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
    code.includes('className="w-60 rounded-2xl border-[0.5px] border-border dark:border-white/10 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 select-none"'),
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
    code.includes('className="w-80 rounded-2xl border-[0.5px] border-border dark:border-white/10 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 select-none"'),
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
    code.includes('className="w-60 rounded-2xl border-[0.5px] border-border dark:border-white/10 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 select-none"'),
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
    code.includes('className="w-60 rounded-2xl border-[0.5px] border-border dark:border-white/10 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 select-none"'),
    'SLAAnalyticsTab Official Report PDF must use standard w-60 rounded-2xl p-0 overflow-hidden'
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
    code.includes('w-60 rounded-2xl border-[0.5px] border-border dark:border-white/10 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 select-none'),
    'GoogleDrivePdfCard must use standard w-60 rounded-2xl p-0 overflow-hidden'
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
    code.includes('w-60 rounded-2xl border-[0.5px] border-border dark:border-white/10 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 select-none z-50'),
    'StorageLayoutEditorTab Template Actions must use standard w-60 rounded-2xl p-0 overflow-hidden'
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
    tabCode.includes('Arrange Requirements'),
    'StudentComplianceTab must include Arrange Requirements dropdown'
  )
  assert.ok(
    tabCode.includes('text-xs font-semibold text-gray-900 dark:text-zinc-100'),
    'StudentComplianceTab arrange dropdown header must use font-semibold'
  )
})

test('StudentComplianceTab Popovers Architecture Consistency', () => {
  const tabPath = path.join(ROOT_DIR, 'src/components/student/StudentComplianceTab.js')
  assert.ok(fs.existsSync(tabPath))
  const tabCode = fs.readFileSync(tabPath, 'utf8')

  assert.ok(
    tabCode.includes('MultiCriteriaFilter'),
    'StudentComplianceTab must delegate to standardized MultiCriteriaFilter'
  )
  assert.ok(
    tabCode.includes('className="w-60 rounded-2xl border-[0.5px] border-border dark:border-white/10 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 select-none font-jakarta"'),
    'StudentComplianceTab arrange dropdown must use standard w-60 rounded-2xl'
  )
  assert.ok(
    tabCode.includes('Arrange Requirements'),
    'StudentComplianceTab arrange dropdown must include Header zone'
  )
})

test('OfficeManagementTab and Sidebar Popover Menus Follow Standards', () => {
  const officePath = path.join(ROOT_DIR, 'src/components/systemadmin/OfficeManagementTab.js')
  assert.ok(fs.existsSync(officePath))
  const officeCode = fs.readFileSync(officePath, 'utf8')
  assert.ok(
    officeCode.includes('w-60 rounded-2xl border-[0.5px] border-border dark:border-white/10 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 select-none z-50 font-jakarta'),
    'OfficeManagementTab Department Actions must use standard w-60 rounded-2xl'
  )

  const sidebarPath = path.join(ROOT_DIR, 'src/components/shared/Sidebar.js')
  assert.ok(fs.existsSync(sidebarPath))
  const sidebarCode = fs.readFileSync(sidebarPath, 'utf8')
  assert.ok(
    sidebarCode.includes('className="w-64 rounded-2xl border-[0.5px] border-border dark:border-white/10 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 select-none z-50"'),
    'Sidebar User Profile popup must use compact w-64 rounded-2xl'
  )
  assert.ok(
    sidebarCode.includes('Sign Out'),
    'Sidebar User Profile must include Sign Out button in footer'
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
    'src/components/shared/MyActivityPanel.js',
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

test('Destructive Actions Borderless Styling and Hover Consistency', () => {
  // 1. Sign Out in Header.js
  const headerCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/layout/Header.js'), 'utf8')
  assert.ok(
    headerCode.includes('text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl cursor-pointer transition-colors border-0 outline-none'),
    'Header.js Sign Out must use borderless soft destructive background on hover without lines'
  )
  assert.ok(!headerCode.includes('hover:border-red-200'), 'Header.js Sign Out must not have hover border line')

  // 2. Sign Out in Sidebar.js
  const sidebarCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/shared/Sidebar.js'), 'utf8')
  assert.ok(
    sidebarCode.includes('text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl cursor-pointer transition-colors border-0 outline-none'),
    'Sidebar.js Sign Out must use borderless soft destructive background on hover without lines'
  )
  assert.ok(!sidebarCode.includes('hover:border-red-200'), 'Sidebar.js Sign Out must not have hover border line')

  // 3. OfficeManagementTab.js Archive Department
  const officeCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/systemadmin/OfficeManagementTab.js'), 'utf8')
  assert.ok(
    officeCode.includes('variant="destructive"'),
    'OfficeManagementTab.js Archive Department must declare variant="destructive"'
  )
  assert.ok(
    officeCode.includes('hover:text-red-600 dark:hover:text-red-400') &&
    officeCode.includes('group-hover/dropdown-menu-item:text-red-600') &&
    officeCode.includes('Archive Department'),
    'OfficeManagementTab.js Archive Department must maintain red text on hover and highlight'
  )

  // 4. StorageLayoutEditorTab.js Delete Template
  const storageCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/admin/StorageLayoutEditorTab.js'), 'utf8')
  assert.ok(
    storageCode.includes('variant="destructive"'),
    'StorageLayoutEditorTab.js Delete Template must declare variant="destructive"'
  )
  assert.ok(
    storageCode.includes('hover:text-red-600 dark:hover:text-red-400') &&
    storageCode.includes('group-hover/dropdown-menu-item:text-red-600') &&
    storageCode.includes('Delete Template'),
    'StorageLayoutEditorTab.js Delete Template must maintain red text on hover and highlight'
  )
})
