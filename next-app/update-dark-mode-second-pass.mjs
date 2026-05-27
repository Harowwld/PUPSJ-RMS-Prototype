import fs from 'fs';
import path from 'path';

const files = [
  'next-app/src/components/staff/RoomMap2D.js',
  'next-app/src/components/staff/OCRPromptModal.js',
  'next-app/src/components/admin/EditUserModal.js',
  'next-app/src/components/admin/storage-layout/ConflictResolutionModals.js',
  'next-app/src/components/admin/backup/BackupPagination.js',
  'next-app/src/components/admin/backup/BackupFilters.js',
  'next-app/src/components/admin/audit-logs/LogPagination.js',
  'next-app/src/components/admin/audit-logs/LogFilters.js',
  'next-app/src/components/admin/audit-logs/LogExpandedRow.js',
  'next-app/src/components/admin/analytics/SlaFilters.js',
  'next-app/src/components/admin/analytics/SlaCharts.js',
  'next-app/src/components/admin/RegisterAccountTab.js',
  'next-app/src/components/admin/backup/HealthSidebar.js',
  'next-app/src/components/admin/SystemConfigTab.js',
  'next-app/src/components/admin/audit-logs/PdfPreviewDialog.js',
  'next-app/src/components/admin/analytics/SlaKpiCards.js',
  'next-app/src/components/admin/storage-layout/CabinetSidebar.js',
  'next-app/src/components/admin/storage-layout/CabinetCanvas.js',
  'next-app/src/components/admin/StorageLayoutEditorTab.js',
  'next-app/src/components/admin/system-config/SecurityQuestionsTab.js',
  'next-app/src/components/admin/backup/BackupTable.js',
  'next-app/src/components/admin/audit-logs/LogDetailSheet.js',
  'next-app/src/components/admin/audit-logs/StatCards.js',
  'next-app/src/components/admin/DigitizationComplianceTab.js',
  'next-app/src/components/admin/RateLimitingTab.js',
  'next-app/src/components/admin/system-config/DocTypesTab.js',
  'next-app/src/components/admin/system-config/CoursesTab.js',
  'next-app/src/components/admin/system-config/SectionsTab.js',
  'next-app/src/components/admin/system-config/BulkImportTab.js',
  'next-app/src/components/admin/BackupTab.js',
  'next-app/src/components/admin/AuditLogsTab.js',
  'next-app/src/components/staff/ScanUploadTab.js',
  'next-app/src/components/staff/NotificationsTab.js',
  'next-app/src/components/admin/StaffDirectoryTab.js',
  'next-app/src/components/staff/RecordsArchiveTab.js',
  'next-app/src/components/staff/DocumentsTab.js',
  'next-app/src/components/staff/DocumentRequestsTab.js',
  'next-app/src/components/admin/SLAAnalyticsTab.js',
  'next-app/src/components/admin/audit-logs/LogTable.js',
  'next-app/src/components/admin/DigitalRecordsReviewTab.js'
];

const rawMappings = [
  { light: 'bg-gray-100/80', darkBase: 'bg-zinc-800/80' },
  { light: 'bg-gray-200/60', darkBase: 'bg-zinc-700/60' },
  { light: 'bg-red-50/30', darkBase: 'bg-red-900/10' },
  { light: 'bg-blue-50/30', darkBase: 'bg-blue-900/10' },
  { light: 'bg-amber-50/30', darkBase: 'bg-amber-900/10' },
  { light: 'bg-emerald-50/30', darkBase: 'bg-emerald-900/10' },
  { light: 'bg-red-50', darkBase: 'bg-red-900/20' },
  { light: 'bg-blue-50', darkBase: 'bg-blue-900/20' },
  { light: 'bg-amber-50', darkBase: 'bg-amber-900/20' },
  { light: 'bg-emerald-50', darkBase: 'bg-emerald-900/20' },
  { light: 'border-gray-50', darkBase: 'border-zinc-800' },
  { light: 'border-blue-100', darkBase: 'border-blue-900/30' },
  { light: 'border-amber-100', darkBase: 'border-amber-900/30' },
  { light: 'border-emerald-100', darkBase: 'border-emerald-900/30' },
  { light: 'text-blue-600', darkBase: 'text-blue-400' },
  { light: 'text-amber-600', darkBase: 'text-amber-400' },
  { light: 'text-emerald-600', darkBase: 'text-emerald-400' },
  { light: 'ring-gray-100', darkBase: 'ring-zinc-800' },
  { light: 'bg-white', darkBase: 'bg-zinc-900' },
  { light: 'bg-gray-50', darkBase: 'bg-zinc-950' },
  { light: 'bg-gray-50', darkBase: 'bg-zinc-800/50', forcePrefix: 'hover' },
  { light: 'bg-gray-100', darkBase: 'bg-zinc-800', forcePrefix: 'hover' },
  { light: 'text-gray-700', darkBase: 'text-zinc-200', forcePrefix: 'hover' }
];

// Sort mappings by length of 'light' class, longest first, to avoid partial matches
rawMappings.sort((a, b) => b.light.length - a.light.length);

const prefixes = ['hover', 'focus', 'active', 'group-hover', 'disabled', 'focus-visible'];

function updateFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // HEAL STEP: Remove erroneously injected dark classes that caused double opacities
  const healRegex = /\s+dark:(?:hover:|focus:|active:|group-hover:|disabled:|focus-visible:)?(?:bg|border|text|ring)-[a-z]+-\d+(?:\/\d+)?(?=\/\d+)/g;
  content = content.replace(healRegex, '');

  for (const mapping of rawMappings) {
    const { light, darkBase, forcePrefix } = mapping;
    
    if (forcePrefix) {
        const lightClass = `${forcePrefix}:${light}`;
        const darkClass = `dark:${forcePrefix}:${darkBase}`;
        const escapedLight = lightClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedDark = darkClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?<![a-zA-Z0-9-:])(?<!dark:)${escapedLight}(?![a-zA-Z0-9-/])(?![^"']*${escapedDark}(?![a-zA-Z0-9-/]))`, 'g');
        content = content.replace(regex, (match) => `${match} ${darkClass}`);
    } else {
        const variants = ['', ...prefixes.map(p => `${p}:`)];
        for (const variant of variants) {
            const lightClass = `${variant}${light}`;
            const darkClass = `dark:${variant}${darkBase}`;
            const escapedLight = lightClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const escapedDark = darkClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            const regex = new RegExp(`(?<![a-zA-Z0-9-:])(?<!dark:)${escapedLight}(?![a-zA-Z0-9-/])(?![^"']*${escapedDark}(?![a-zA-Z0-9-/]))`, 'g');
            content = content.replace(regex, (match) => `${match} ${darkClass}`);
        }
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

files.forEach(updateFile);
