import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT_DIR = process.cwd()

test('DashboardSearch maintains standardized width token w-72 sm:w-80 shrink-0', () => {
  const file = path.join(ROOT_DIR, 'src/components/systemadmin/DashboardSearch.js')
  assert.ok(fs.existsSync(file), 'DashboardSearch.js must exist')
  const content = fs.readFileSync(file, 'utf8')

  assert.ok(
    content.includes('w-72 sm:w-80 shrink-0'),
    'DashboardSearch must define standard w-72 sm:w-80 shrink-0'
  )
  assert.ok(
    !content.includes('w-[min(320px,30vw)]'),
    'DashboardSearch must not use erratic viewport-based width 30vw'
  )
})

test('Superadmin views do not override DashboardSearch with ad-hoc erratic widths', () => {
  const auditLogs = path.join(ROOT_DIR, 'src/components/systemadmin/GlobalAuditLogsTab.js')
  const secQuestions = path.join(ROOT_DIR, 'src/components/systemadmin/SecurityQuestionsTab.js')
  const landingFaq = path.join(ROOT_DIR, 'src/components/systemadmin/LandingFaqCmsView.js')
  const backupFilters = path.join(ROOT_DIR, 'src/components/admin/backup/BackupFilters.js')

  const auditContent = fs.readFileSync(auditLogs, 'utf8')
  assert.ok(!auditContent.includes('flex-1 sm:w-64 min-w-[200px] max-w-sm'), 'GlobalAuditLogsTab must not override search width with sm:w-64')

  const secContent = fs.readFileSync(secQuestions, 'utf8')
  assert.ok(!secContent.includes('w-[min(320px,60vw)]'), 'SecurityQuestionsTab must not override search width with 60vw')

  const faqContent = fs.readFileSync(landingFaq, 'utf8')
  assert.ok(!faqContent.includes('w-[min(280px,45vw)] min-w-[200px]'), 'LandingFaqCmsView must not override search width with 280px')

  const backupContent = fs.readFileSync(backupFilters, 'utf8')
  assert.ok(!backupContent.includes('flex-1 sm:w-64 min-w-[200px] max-w-sm'), 'BackupFilters must not override search width with sm:w-64')
})

test('Superadmin loading skeletons have standardized search input widths w-72 sm:w-80', () => {
  const skeletons = [
    'OfficeManagementPageSkeleton.js',
    'ModuleConfigSkeleton.js',
    'CampusOperationsSkeleton.js',
    'GlobalStaffSkeleton.js',
    'SecurityQuestionsSkeleton.js',
    'GlobalAuditLogsSkeleton.js',
    'SystemBackupsSkeleton.js',
    'LandingFaqSkeleton.js',
  ]

  for (const skelFile of skeletons) {
    const fullPath = path.join(ROOT_DIR, 'src/components/systemadmin/skeletons', skelFile)
    assert.ok(fs.existsSync(fullPath), `${skelFile} must exist`)
    const content = fs.readFileSync(fullPath, 'utf8')
    assert.ok(
      content.includes('w-72 sm:w-80 shrink-0'),
      `${skelFile} must use uniform search skeleton width w-72 sm:w-80 shrink-0`
    )
  }
})
