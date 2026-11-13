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

test('Segmented control capsule triggers enforce fixed h-7 geometry with compact inline badges', () => {
  const tabsJsx = fs.readFileSync(path.resolve('src/components/ui/tabs.jsx'), 'utf8');
  assert.ok(
    tabsJsx.includes('capsule: "h-7 px-3.5 text-xs rounded-full"'),
    'tabsTriggerVariants capsule size must have fixed h-7 height and rounded-full curvature'
  );
  assert.ok(
    !tabsJsx.includes('BADGE_BASE'),
    'tabs.jsx must not import or embed table BADGE_BASE into segmented control badges'
  );
  assert.ok(
    tabsJsx.includes('h-[18px] min-w-[18px]') && tabsJsx.includes('text-[10px]'),
    'SegmentedControl inline badge must use compact 18px pill to prevent vertical trigger distortion'
  );
});

test('System-wide tabs eliminate improper BADGE_BASE injection into SegmentedControl', () => {
  const systemAdminFiles = [
    'src/components/systemadmin/CampusOperationsTab.js',
    'src/components/systemadmin/GlobalStaffTab.js',
    'src/components/systemadmin/SecurityQuestionsTab.js',
    'src/components/systemadmin/OfficeManagementTab.js',
    'src/components/systemadmin/ModuleConfigTab.js',
    'src/components/systemadmin/SystemBackupsTab.js',
    'src/components/systemadmin/GlobalAuditLogsTab.js',
    'src/components/systemadmin/LandingCmsViewTabs.js',
    'src/components/systemadmin/LandingCmsSectionTabs.js',
    'src/components/systemadmin/LandingBentoCmsView.js',
  ];

  for (const relPath of systemAdminFiles) {
    const code = fs.readFileSync(path.resolve(relPath), 'utf8');
    assert.ok(
      !code.includes('badgeClassName={BADGE_BASE}'),
      `${relPath} must not pass badgeClassName={BADGE_BASE} into SegmentedControl`
    );
  }
});
