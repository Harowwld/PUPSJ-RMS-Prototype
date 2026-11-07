import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Segmented control tabs implement Apple HIG equal-width standard (auto-cols-fr)', () => {
  const officeTab = fs.readFileSync(path.resolve('src/components/systemadmin/OfficeManagementTab.js'), 'utf8');
  assert.ok(officeTab.includes('inline-grid grid-flow-col auto-cols-fr'), 'OfficeManagementTab should use auto-cols-fr for equal segment widths');

  const staffTab = fs.readFileSync(path.resolve('src/components/systemadmin/GlobalStaffTab.js'), 'utf8');
  assert.ok(staffTab.includes('inline-grid grid-flow-col auto-cols-fr'), 'GlobalStaffTab should use auto-cols-fr for equal segment widths');

  const opsTab = fs.readFileSync(path.resolve('src/components/systemadmin/CampusOperationsTab.js'), 'utf8');
  assert.ok(opsTab.includes('inline-grid grid-flow-col auto-cols-fr'), 'CampusOperationsTab should use auto-cols-fr for equal segment widths');

  const secTab = fs.readFileSync(path.resolve('src/components/systemadmin/SecurityQuestionsTab.js'), 'utf8');
  assert.ok(secTab.includes('inline-grid grid-flow-col auto-cols-fr'), 'SecurityQuestionsTab should use auto-cols-fr for equal segment widths');

  const logsTab = fs.readFileSync(path.resolve('src/components/systemadmin/GlobalAuditLogsTab.js'), 'utf8');
  assert.ok(logsTab.includes('inline-grid grid-flow-col auto-cols-fr'), 'GlobalAuditLogsTab should use auto-cols-fr for equal segment widths');

  const backupsTab = fs.readFileSync(path.resolve('src/components/systemadmin/SystemBackupsTab.js'), 'utf8');
  assert.ok(backupsTab.includes('inline-grid grid-flow-col auto-cols-fr'), 'SystemBackupsTab should use auto-cols-fr for equal segment widths');

  const moduleTab = fs.readFileSync(path.resolve('src/components/systemadmin/ModuleConfigTab.js'), 'utf8');
  assert.ok(moduleTab.includes('inline-grid grid-flow-col auto-cols-fr'), 'ModuleConfigTab should use auto-cols-fr for equal segment widths');

  const landingTabs = fs.readFileSync(path.resolve('src/components/systemadmin/LandingCmsSectionTabs.js'), 'utf8');
  assert.ok(landingTabs.includes('inline-grid grid-flow-col auto-cols-fr'), 'LandingCmsSectionTabs should use auto-cols-fr for equal segment widths');
});

test('Tabs design system component defaults to equal-width tracks for segmented and capsule variants', () => {
  const tabsJsx = fs.readFileSync(path.resolve('src/components/ui/tabs.jsx'), 'utf8');
  assert.ok(tabsJsx.includes('inline-grid grid-flow-col auto-cols-fr rounded-xl'), 'tabs.jsx segmented variant should use auto-cols-fr');
  assert.ok(tabsJsx.includes('inline-grid grid-flow-col auto-cols-fr rounded-full'), 'tabs.jsx capsule variant should use auto-cols-fr');
});
