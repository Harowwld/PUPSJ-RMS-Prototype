import { NextResponse } from "next/server";
import { systemConfigRepo } from "@/lib/systemConfigRepo";
import { requireAdmin, createAuthErrorResponse } from "@/lib/authHelpers";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { isSystemAdminRole } from "@/lib/roleUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getUserOfficeId(user) {
  if (user?.office_id) return String(user.office_id).toLowerCase().trim();
  if (user?.officeId) return String(user.officeId).toLowerCase().trim();
  if (user?.section) return String(user.section).toLowerCase().trim();
  return "registrar";
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
  const { user, error } = await requireAdmin(req);
  if (error || !user) {
    return createAuthErrorResponse(error || "Admin access required");
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
  const { user, error } = await requireAdmin(req);
  if (error || !user) {
    return createAuthErrorResponse(error || "Admin access required");
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }
  const allowedFields = new Set(["enabled", "frequency", "time", "dayOfWeek", "scope", "officeId"]);
  const unsupportedField = Object.keys(body).find((field) => !allowedFields.has(field));
  if (unsupportedField) {
    return NextResponse.json({ ok: false, error: `Unsupported field: ${unsupportedField}` }, { status: 400 });
  }
  if (!["enabled", "frequency", "time", "dayOfWeek"].some((field) => body[field] !== undefined)) {
    return NextResponse.json({ ok: false, error: "At least one schedule field is required" }, { status: 400 });
  }
  const { enabled, frequency, time, dayOfWeek, scope: reqScope, officeId: reqOfficeId } = body;

  if (enabled !== undefined && typeof enabled !== "boolean") {
    return NextResponse.json({ ok: false, error: "enabled must be a boolean" }, { status: 400 });
  }

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
    if (typeof time !== "string" || !timeRegex.test(time)) {
      return NextResponse.json(
        { ok: false, error: "Invalid time format. Must be HH:mm (e.g., 02:00)" },
        { status: 400 }
      );
    }
  }

  // Validate dayOfWeek
  if (dayOfWeek !== undefined) {
    const day = Number(dayOfWeek);
    if (!Number.isInteger(day) || day < 0 || day > 6) {
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
