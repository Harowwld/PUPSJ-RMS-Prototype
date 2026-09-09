import fs from 'fs';
import path from 'path';

const files = [
  'next-app/src/app/account/page.js',
  'next-app/src/app/admin/page.js',
  'next-app/src/app/page.js',
  'next-app/src/components/admin/AuditLogsTab.js',
  'next-app/src/components/admin/BackupTab.js',
  'next-app/src/components/admin/DigitalRecordsReviewTab.js',
  'next-app/src/components/admin/DigitizationComplianceTab.js',
  'next-app/src/components/admin/EditUserModal.js',
  'next-app/src/components/admin/RateLimitingTab.js',
  'next-app/src/components/admin/RegisterAccountTab.js',
  'next-app/src/components/admin/SLAAnalyticsTab.js',
  'next-app/src/components/admin/StaffDirectoryTab.js',
  'next-app/src/components/admin/StorageLayoutEditorTab.js',
  'next-app/src/components/admin/audit-logs/PdfPreviewDialog.js',
  'next-app/src/components/admin/backup/BackupTable.js',
  'next-app/src/components/admin/storage-layout/ConflictResolutionModals.js',
  'next-app/src/components/admin/system-config/BulkImportTab.js',
  'next-app/src/components/admin/system-config/CoursesTab.js',
  'next-app/src/components/admin/system-config/DocTypesTab.js',
  'next-app/src/components/admin/system-config/SectionsTab.js',
  'next-app/src/components/admin/system-config/SecurityQuestionsTab.js',
  'next-app/src/components/shared/AccountSetupModal.js',
  'next-app/src/components/shared/ConfirmModal.js',
  'next-app/src/components/shared/DefaultPasswordModal.js',
  'next-app/src/components/shared/DocTypeModal.js',
  'next-app/src/components/shared/TOTPChallengeModal.js',
  'next-app/src/components/shared/UserGuideModal.js',
  'next-app/src/components/staff/DocumentRequestsTab.js',
  'next-app/src/components/staff/DocumentsTab.js',
  'next-app/src/components/staff/RecordsArchiveTab.js'
];

const ROOT_DIR = process.cwd();

const pupMaroonTarget = 'bg-linear-to-br from-white to-pup-maroon';
const pupMaroonReplacement = 'bg-linear-to-b from-red-800 to-pup-maroon border border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md transition-all';

const red600Target = 'bg-linear-to-br from-white to-red-600';
const red600Replacement = 'bg-linear-to-b from-red-600 to-red-800 border border-red-900 hover:from-red-500 hover:to-red-700 hover:shadow-md transition-all';

function updateClassList(classList) {
  let updated = classList;
  
  let changed = false;
  if (updated.includes(pupMaroonTarget)) {
    updated = updated.replace(pupMaroonTarget, pupMaroonReplacement);
    updated = updated.replace(/\bhover:bg-red-900\b/g, '');
    updated = updated.replace(/\bhover:bg-red-700\b/g, '');
    changed = true;
  } else if (updated.includes(red600Target)) {
    updated = updated.replace(red600Target, red600Replacement);
    updated = updated.replace(/\bhover:bg-red-700\b/g, '');
    changed = true;
  }

  if (!changed) return updated;

  // De-duplicate transition-all
  if ((updated.match(/\btransition-all\b/g) || []).length > 1) {
      updated = updated.replace(/\btransition-all\b/g, '');
      updated = updated.trim() + ' transition-all';
  }
  
  // Clean up spaces
  updated = updated.replace(/\s+/g, ' ').trim();
  return updated;
}

files.forEach(file => {
  const filePath = path.join(ROOT_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Match any string literal
  content = content.replace(/(["'`])(.*?)\1/gs, (match, quote, inner) => {
    // Only process if it contains one of our targets
    if (inner.includes(pupMaroonTarget) || inner.includes(red600Target)) {
        let newInner = updateClassList(inner);
        return `${quote}${newInner}${quote}`;
    }
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated: ${file}`);
  }
});
