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
  { light: 'bg-white', dark: 'dark:bg-zinc-900' },
  { light: 'bg-gray-50', dark: 'dark:bg-zinc-950' },
  { light: 'text-gray-900', dark: 'dark:text-zinc-100' },
  { light: 'text-gray-700', dark: 'dark:text-zinc-300' },
  { light: 'text-gray-600', dark: 'dark:text-zinc-400' },
  { light: 'text-gray-500', dark: 'dark:text-zinc-400' },
  { light: 'border-gray-200', dark: 'dark:border-zinc-800' },
  { light: 'border-gray-100', dark: 'dark:border-zinc-800' },
  { light: 'shadow-sm', dark: 'dark:shadow-none' },
  { light: 'shadow-md', dark: 'dark:shadow-none' },
  { light: 'shadow-xl', dark: 'dark:shadow-none' },
  { light: 'text-pup-maroon', dark: 'dark:text-red-500' },
  { light: 'bg-pup-maroon', dark: 'dark:bg-red-600' }
];

// Special cases
const specialMappings = [
  { light: 'bg-white/80', dark: 'dark:bg-zinc-900/80' }
];

function updateFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Handle special mappings first
  for (const { light, dark } of specialMappings) {
    if (content.includes(light) && !content.includes(dark)) {
      const regex = new RegExp(light.replace(/\//g, '\\/'), 'g');
      content = content.replace(regex, `${light} ${dark}`);
    }
  }

  for (const { light, dark } of mappings) {
    // We use a regex that looks for the light class as a whole word.
    // Negative lookbehind (?<!dark:) ensures we don't match something already prefixed with dark:
    // Negative lookahead (?![^"']*${dark}) attempts to ensure the dark variant isn't already in the same class string.
    // We use a boundary that handles hyphens better than \b for Tailwind.
    const escapedLight = light.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<![a-zA-Z0-9-])(?<!dark:)${escapedLight}(?![a-zA-Z0-9-])(?![^"']*${dark})`, 'g');
    
    content = content.replace(regex, (match) => {
      return `${match} ${dark}`;
    });
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  } else {
    console.log(`No changes needed: ${filePath}`);
  }
}

files.forEach(updateFile);
