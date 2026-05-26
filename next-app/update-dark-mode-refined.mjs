import fs from 'fs';
import path from 'path';

const files = [
  'next-app/src/components/admin/DigitalRecordsReviewTab.js',
  'next-app/src/components/admin/audit-logs/LogTable.js',
  'next-app/src/components/admin/SLAAnalyticsTab.js',
  'next-app/src/components/staff/DocumentRequestsTab.js',
  'next-app/src/components/staff/DocumentsTab.js',
  'next-app/src/components/staff/RecordsArchiveTab.js',
  'next-app/src/components/admin/StaffDirectoryTab.js',
  'next-app/src/components/staff/NotificationsTab.js',
  'next-app/src/components/staff/ScanUploadTab.js',
  'next-app/src/components/admin/AuditLogsTab.js',
  'next-app/src/components/admin/BackupTab.js',
  'next-app/src/components/admin/system-config/BulkImportTab.js',
  'next-app/src/components/admin/system-config/SectionsTab.js',
  'next-app/src/components/admin/system-config/CoursesTab.js',
  'next-app/src/components/admin/system-config/DocTypesTab.js',
  'next-app/src/components/admin/RateLimitingTab.js',
  'next-app/src/components/admin/DigitizationComplianceTab.js',
  'next-app/src/components/admin/audit-logs/StatCards.js',
  'next-app/src/components/admin/audit-logs/LogDetailSheet.js',
  'next-app/src/components/admin/backup/BackupTable.js',
  'next-app/src/components/admin/system-config/SecurityQuestionsTab.js',
  'next-app/src/components/admin/StorageLayoutEditorTab.js',
  'next-app/src/components/admin/storage-layout/CabinetSidebar.js',
  'next-app/src/components/admin/storage-layout/CabinetCanvas.js',
  'next-app/src/components/admin/analytics/SlaKpiCards.js',
  'next-app/src/components/admin/audit-logs/PdfPreviewDialog.js',
  'next-app/src/components/admin/SystemConfigTab.js',
  'next-app/src/components/admin/backup/HealthSidebar.js',
  'next-app/src/components/admin/RegisterAccountTab.js',
  'next-app/src/components/admin/analytics/SlaCharts.js',
  'next-app/src/components/admin/analytics/SlaFilters.js',
  'next-app/src/components/admin/audit-logs/LogExpandedRow.js',
  'next-app/src/components/admin/audit-logs/LogFilters.js',
  'next-app/src/components/admin/audit-logs/LogPagination.js',
  'next-app/src/components/admin/backup/BackupFilters.js',
  'next-app/src/components/admin/backup/BackupPagination.js',
  'next-app/src/components/admin/EditUserModal.js',
  'next-app/src/components/admin/storage-layout/ConflictResolutionModals.js',
  'next-app/src/components/staff/OCRPromptModal.js',
  'next-app/src/components/staff/RoomMap2D.js'
];

const mappings = [
  { light: 'bg-white', darkBase: 'bg-zinc-900' },
  { light: 'bg-gray-50', darkBase: 'bg-zinc-950' },
  { light: 'text-gray-900', darkBase: 'text-zinc-100' },
  { light: 'text-gray-700', darkBase: 'text-zinc-300' },
  { light: 'text-gray-600', darkBase: 'text-zinc-400' },
  { light: 'text-gray-500', darkBase: 'text-zinc-400' },
  { light: 'border-gray-200', darkBase: 'border-zinc-800' },
  { light: 'border-gray-100', darkBase: 'border-zinc-800' },
  { light: 'shadow-sm', darkBase: 'shadow-none' },
  { light: 'shadow-md', darkBase: 'shadow-none' },
  { light: 'shadow-xl', darkBase: 'shadow-none' },
  { light: 'text-pup-maroon', darkBase: 'text-red-500' },
  { light: 'bg-pup-maroon', darkBase: 'bg-red-600' }
];

const prefixes = ['hover', 'focus', 'active', 'group-hover', 'disabled', 'focus-visible'];

function updateFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Cleanup previously misapplied classes (e.g. hover:bg-gray-50 dark:bg-zinc-950 -> hover:bg-gray-50)
  // We'll just do a global replace for the common mistakes I might have made.
  for (const { light, darkBase } of mappings) {
      for (const prefix of prefixes) {
          const wrong = `${prefix}:${light} dark:${darkBase}`;
          const right = `${prefix}:${light} dark:${prefix}:${darkBase}`;
          content = content.replace(new RegExp(wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), right);
      }
  }

  // General update
  for (const { light, darkBase } of mappings) {
    const escapedLight = light.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // 1. Handle prefixed ones (e.g. hover:bg-gray-50)
    for (const prefix of prefixes) {
        const regex = new RegExp(`(?<![a-zA-Z0-9-:])(?<!dark:)${prefix}:${escapedLight}(?![a-zA-Z0-9-])(?![^"']*dark:${prefix}:${darkBase})`, 'g');
        content = content.replace(regex, (match) => `${match} dark:${prefix}:${darkBase}`);
    }

    // 2. Handle non-prefixed ones
    const regex = new RegExp(`(?<![a-zA-Z0-9-:])(?<!dark:)${escapedLight}(?![a-zA-Z0-9-])(?![^"']*dark:${darkBase})`, 'g');
    content = content.replace(regex, (match) => `${match} dark:${darkBase}`);
  }

  // Special cases
  if (content.includes('bg-white/80') && !content.includes('dark:bg-zinc-900/80')) {
      content = content.replace(/bg-white\/80/g, 'bg-white/80 dark:bg-zinc-900/80');
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  } else {
    console.log(`No changes needed: ${filePath}`);
  }
}

files.forEach(updateFile);
