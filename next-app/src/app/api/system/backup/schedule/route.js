import { NextResponse } from "next/server";
import { systemConfigRepo } from "@/lib/systemConfigRepo";
import { getSessionCookieName, verifySessionToken } from "@/lib/jwt";
import { getStaffById } from "@/lib/staffRepo";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { isSystemAdminRole } from "@/lib/roleUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getUserOfficeId(user) {
  if (user?.office_id) return String(user.office_id).toLowerCase().trim();
  if (user?.section) return String(user.section).toLowerCase().trim();
  return "registrar";
}

async function getAuthUser(req) {
  const token = req.cookies.get(getSessionCookieName())?.value;
  if (!token) return null;
  try {
    const payload = await verifySessionToken(token);
    const user = await getStaffById(payload.sub);
    if (!user) return null;
    const role = String(user.role || "").toLowerCase().trim();
    if (!["admin", "administrator", "superadmin"].includes(role)) return null;
    return user;
  } catch {
    return null;
  }
}

function getSettingsKey(user, reqScope, reqOfficeId) {
  const isSuper = isSystemAdminRole(user.role);
  if (isSuper) {
    if (reqScope === "office" || reqOfficeId) {
      const office = (reqOfficeId || "registrar").toLowerCase();
      return `auto_backup_schedule_${office}`;
    }
    return "auto_backup_schedule";
  }
  const officeId = getUserOfficeId(user);
  return `auto_backup_schedule_${officeId}`;
}

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const VALID_FREQUENCIES = ["daily", "weekly"];

/**
 * GET /api/system/backup/schedule
 * Returns the current auto backup schedule for the requesting admin.
 */
export async function GET(req) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const reqScope = searchParams.get("scope");
  const reqOfficeId = searchParams.get("officeId") || searchParams.get("office");
  const key = getSettingsKey(user, reqScope, reqOfficeId);
  const raw = await systemConfigRepo.getSetting(key, null);

  if (!raw) {
    // Return defaults when no schedule exists
    return NextResponse.json({
      ok: true,
      data: {
        enabled: false,
        frequency: "daily",
        time: "02:00",
        dayOfWeek: 0,
        lastRunAt: null,
        lastRunStatus: null,
        lastRunFilename: null,
        createdBy: null,
      },
    });
  }

  try {
    const schedule = JSON.parse(raw);
    return NextResponse.json({ ok: true, data: schedule });
  } catch {
    return NextResponse.json({
      ok: true,
      data: {
        enabled: false,
        frequency: "daily",
        time: "02:00",
        dayOfWeek: 0,
        lastRunAt: null,
        lastRunStatus: null,
        lastRunFilename: null,
        createdBy: null,
      },
    });
  }
}

/**
 * POST /api/system/backup/schedule
 * Updates the auto backup schedule configuration.
 * Body: { enabled, frequency, time, dayOfWeek }
 */
export async function POST(req) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { enabled, frequency, time, dayOfWeek, scope: reqScope, officeId: reqOfficeId } = body;

  // Validate frequency
  if (frequency !== undefined && !VALID_FREQUENCIES.includes(frequency)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Invalid frequency. Must be one of: ${VALID_FREQUENCIES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  // Validate time format (HH:mm)
  if (time !== undefined) {
    const timeRegex = /^([01]?\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(time)) {
      return NextResponse.json(
        { ok: false, error: "Invalid time format. Must be HH:mm (e.g., 02:00)" },
        { status: 400 }
      );
    }
  }

  // Validate dayOfWeek
  if (dayOfWeek !== undefined) {
    const day = Number(dayOfWeek);
    if (isNaN(day) || day < 0 || day > 6) {
      return NextResponse.json(
        { ok: false, error: "Invalid day of week. Must be 0 (Sunday) through 6 (Saturday)" },
        { status: 400 }
      );
    }
  }

  const key = getSettingsKey(user, reqScope, reqOfficeId);

  // Read existing schedule to preserve lastRun data
  const raw = await systemConfigRepo.getSetting(key, null);
  let existing = {};
  if (raw) {
    try {
      existing = JSON.parse(raw);
    } catch {
      existing = {};
    }
  }

  // Merge updates
  const updated = {
    enabled: enabled !== undefined ? !!enabled : existing.enabled || false,
    frequency: frequency || existing.frequency || "daily",
    time: time || existing.time || "02:00",
    dayOfWeek:
      dayOfWeek !== undefined ? Number(dayOfWeek) : existing.dayOfWeek ?? 0,
    lastRunAt: existing.lastRunAt || null,
    lastRunStatus: existing.lastRunStatus || null,
    lastRunFilename: existing.lastRunFilename || null,
    lastRunError: existing.lastRunError || null,
    createdBy: user.id,
  };

  await systemConfigRepo.setSetting(key, JSON.stringify(updated));

  // Audit log
  const isSuper = isSystemAdminRole(user.role);
  const scopeLabel = isSuper
    ? "Platform Governance"
    : `Office (${getUserOfficeId(user)})`;
  const statusLabel = updated.enabled ? "Enabled" : "Disabled";
  const freqLabel =
    updated.frequency === "weekly"
      ? `Weekly on ${DAY_LABELS[updated.dayOfWeek]} at ${updated.time}`
      : `Daily at ${updated.time}`;

  await writeAuditLog(req, "Updated Auto Backup Schedule", {
    details: `${statusLabel} ${scopeLabel} auto backup — ${freqLabel}`,
    entity_type: "Setting",
    entity_id: key,
  });

  return NextResponse.json({ ok: true, data: updated });
}
