import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveAuditActorIds } from "../src/lib/auditActor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NARRATIVE_TEXT_PATH = path.resolve(__dirname, "../src/components/shared/NarrativeText.js");
const AUDIT_ACTOR_AVATAR_PATH = path.resolve(__dirname, "../src/components/shared/AuditActorAvatar.jsx");
const GLOBAL_LOGS_PATH = path.resolve(__dirname, "../src/components/systemadmin/GlobalAuditLogsTab.js");
const LOG_DETAIL_SHEET_PATH = path.resolve(__dirname, "../src/components/admin/audit-logs/LogDetailSheet.js");
const PLATFORM_BACKUP_TABLE_PATH = path.resolve(__dirname, "../src/components/systemadmin/PlatformBackupTable.js");
const BACKUPS_REPO_PATH = path.resolve(__dirname, "../src/lib/backupsRepo.js");
const AVATAR_ROUTE_PATH = path.resolve(__dirname, "../src/app/api/account/avatar/route.js");

describe("Actor Avatar Querying and Borderless Badges", () => {
  test("resolveAuditActorIds correctly attaches actor_id and avatar_filename for staff and students", () => {
    const mockStaff = [
      { id: "PUPREGISTRAR-002", fname: "Marcus", lname: "Reyes", role: "Staff", avatar_filename: "avatar_marcus.svg" },
      { id: "PUPSUPERADMIN-001", fname: "System", lname: "Administrator", role: "SuperAdmin", avatar_filename: "avatar_super.svg" }
    ];
    const mockStudents = [
      { id: 42, student_no: "2024-00001-SJ-0", avatar_filename: "avatar_student_42.png" }
    ];

    const rows = [
      { actor: "Marcus Reyes", role: "Staff", action: "Review Document" },
      { actor: "PUPSUPERADMIN-001", role: "SuperAdmin", action: "Create Backup" },
      { actor: "2024-00001-SJ-0", role: "Student", action: "Request Document" },
      { actor: "System Process", role: "System", action: "Auto Backup" }
    ];

    const resolved = resolveAuditActorIds(rows, mockStaff, mockStudents);

    // 1. Staff by full name
    assert.strictEqual(resolved[0].actor_id, "PUPREGISTRAR-002");
    assert.strictEqual(resolved[0].avatar_filename, "avatar_marcus.svg");

    // 2. Staff by exact ID
    assert.strictEqual(resolved[1].actor_id, "PUPSUPERADMIN-001");
    assert.strictEqual(resolved[1].avatar_filename, "avatar_super.svg");

    // 3. Student by student_no
    assert.strictEqual(resolved[2].actor_id, "2024-00001-SJ-0");
    assert.strictEqual(resolved[2].avatar_filename, "avatar_student_42.png");

    // 4. System actor has nulls
    assert.strictEqual(resolved[3].actor_id, null);
    assert.strictEqual(resolved[3].avatar_filename, null);
  });

  test("AuditActorAvatar passes avatarFilename and actor_id to ProfileAvatar", () => {
    const code = fs.readFileSync(AUDIT_ACTOR_AVATAR_PATH, "utf8");
    assert.ok(code.includes("avatarFilename"), "AuditActorAvatar must extract avatarFilename from log");
    assert.ok(code.includes("avatarFilename={avatarFilename}"), "AuditActorAvatar must pass avatarFilename to ProfileAvatar");
    assert.ok(code.includes("log?.actor_id"), "AuditActorAvatar must prioritize actor_id");
  });

  test("NarrativeText queries avatar for mentions and uses borderless capsule styling", () => {
    const code = fs.readFileSync(NARRATIVE_TEXT_PATH, "utf8");
    assert.ok(code.includes("<ProfileAvatar"), "NarrativeText must render ProfileAvatar for mentions");
    assert.ok(!code.includes("border border-black/[0.06]"), "NarrativeText must not have bordered mention pill");
    assert.ok(!code.includes("border border-white/[0.08]"), "NarrativeText must not have dark bordered mention pill");
    assert.ok(code.includes("border-0"), "NarrativeText must enforce border-0 styling on entity tokens");
  });

  test("GlobalAuditLogsTab and LogDetailSheet enforce borderless badges and avatars", () => {
    const logsCode = fs.readFileSync(GLOBAL_LOGS_PATH, "utf8");
    assert.ok(!logsCode.includes("className=\"size-8 border border-border\""), "GlobalAuditLogsTab actor avatar must not have border-border");
    assert.ok(logsCode.includes("BADGE_BASE"), "GlobalAuditLogsTab must use BADGE_BASE for badges");

    const sheetCode = fs.readFileSync(LOG_DETAIL_SHEET_PATH, "utf8");
    assert.ok(!sheetCode.includes("className=\"size-11 border border-black/10"), "LogDetailSheet actor avatar must not have border");
    assert.ok(sheetCode.includes("className=\"size-11 border-0\""), "LogDetailSheet actor avatar must be border-0");
  });

  test("PlatformBackupTable supports actor column with AuditActorAvatar and backupsRepo returns creator details", () => {
    const tableCode = fs.readFileSync(PLATFORM_BACKUP_TABLE_PATH, "utf8");
    assert.ok(tableCode.includes("key: \"actor\""), "PLATFORM_BACKUP_COLUMNS must include actor");
    assert.ok(tableCode.includes("<AuditActorAvatar"), "PlatformBackupTable must render AuditActorAvatar");

    const repoCode = fs.readFileSync(BACKUPS_REPO_PATH, "utf8");
    assert.ok(repoCode.includes("LEFT JOIN staff"), "listBackups must join with staff to fetch creator attribution");
    assert.ok(repoCode.includes("creator_avatar_filename"), "listBackups must fetch creator avatar_filename");
    assert.ok(repoCode.includes("avatar_filename:"), "listBackups must return avatar_filename");
  });

  test("Avatar route supports resolving staff by name when lookupId is provided", () => {
    const avatarRouteCode = fs.readFileSync(AVATAR_ROUTE_PATH, "utf8");
    assert.ok(avatarRouteCode.includes("decryptPII"), "Avatar route must import decryptPII");
    assert.ok(avatarRouteCode.includes("avatar_filename FROM staff"), "Avatar route must query avatar_filename from staff");
  });
});
