const fs = require('fs');

const files = [
  'next-app/src/app/account/activity/page.js',
  'next-app/src/app/student/page.js',
  'next-app/src/components/admin/system-config/RecognitionTemplatesTab.js',
  'next-app/src/components/admin/AuditLogsTab.js',
  'next-app/src/components/admin/RateLimitingTab.js',
  'next-app/src/components/admin/SLAAnalyticsTab.js',
  'next-app/src/components/admin/StorageLayoutEditorTab.js',
  'next-app/src/components/admin/StaffDirectoryTab.js',
  'next-app/src/components/admin/DigitalRecordsReviewTab.js',
  'next-app/src/components/admin/BackupTab.js',
  'next-app/src/components/admin/DigitizationComplianceTab.js',
  'next-app/src/components/staff/BatchReviewTab.js',
  'next-app/src/components/staff/DocumentRequestsTab.js',
  'next-app/src/components/staff/DocumentsTab.js',
  'next-app/src/components/staff/NotificationsTab.js',
  'next-app/src/components/staff/OsasMonitoringTab.js',
  'next-app/src/components/staff/ScanUploadTab.js',
  'next-app/src/components/staff/StudentDirectoryTab.js',
  'next-app/src/components/staff/RegistrarODRSTab.js',
  'next-app/src/components/student/StudentComplianceTab.js',
  'next-app/src/components/systemadmin/GlobalAuditLogsTab.js',
  'next-app/src/components/systemadmin/ModuleConfigTab.js',
  'next-app/src/components/systemadmin/SystemBackupsTab.js',
  'next-app/src/components/systemadmin/CampusOperationsTab.js',
  'next-app/src/components/systemadmin/GlobalStaffTab.js',
  'next-app/src/components/systemadmin/SecurityQuestionsTab.js',
  'next-app/src/components/systemadmin/OfficeManagementTab.js'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Remove import
  const importRegex = /import\s+\{\s*RefreshButton\s*\}\s+from\s+["']@\/components\/shared\/RefreshButton["'];?\n?/g;
  content = content.replace(importRegex, '');
  
  // Remove component usage
  const compRegex = /<RefreshButton[\s\S]*?(?:\/>|<\/RefreshButton>)/g;
  content = content.replace(compRegex, '');
  
  fs.writeFileSync(file, content);
}
console.log('Removed RefreshButtons from all files.');
