import { NextResponse } from "next/server";
import { slaStandardsRepo } from "@/lib/slaStandardsRepo";
import { requireAuth, requireSystemAdmin, createAuthErrorResponse } from "@/lib/authHelpers";
import { writeAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const access = await requireAuth(req);
    if (access.error || !access.user) {
      return createAuthErrorResponse(access.error || "Authentication required", 401);
    }
    const standards = await slaStandardsRepo.getStandards();
    return NextResponse.json({ ok: true, data: standards });
  } catch (error) {
    console.error("[GET /api/system/sla-settings Error]:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const access = await requireSystemAdmin(req);
    if (access.error || !access.user) {
      return createAuthErrorResponse(
        access.error || "System administrator access required",
        access.error?.startsWith("Access denied") ? 403 : 401
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
    }
    const allowedFields = new Set([
      "reset", "frameworkName", "frameworkType", "simpleDays", "complexDays",
      "highlyTechnicalDays", "workingDaysOnly",
    ]);
    const unsupportedField = Object.keys(body).find((field) => !allowedFields.has(field));
    if (unsupportedField) {
      return NextResponse.json({ ok: false, error: `Unsupported field: ${unsupportedField}` }, { status: 400 });
    }
    if (body.reset !== undefined && typeof body.reset !== "boolean") {
      return NextResponse.json({ ok: false, error: "Reset must be a boolean." }, { status: 400 });
    }
    if (body.reset) {
      if (Object.keys(body).length !== 1) {
        return NextResponse.json({ ok: false, error: "Reset cannot be combined with other settings." }, { status: 400 });
      }
      const resetStandards = await slaStandardsRepo.resetToDefault();
      await writeAuditLog(req, "Reset Service Standards", {
        details: "Reset SLA turnaround standards to ARTA RA 11032 statutory default (3-7-20).",
        entity_type: "setting",
        entity_id: "sla_turnaround_standards",
      });
      return NextResponse.json({ ok: true, data: resetStandards });
    }

    const { frameworkName, frameworkType, simpleDays, complexDays, highlyTechnicalDays, workingDaysOnly } = body;

    if (workingDaysOnly !== undefined && typeof workingDaysOnly !== "boolean") {
      return NextResponse.json({ ok: false, error: "workingDaysOnly must be a boolean." }, { status: 400 });
    }
    const sDays = Number(simpleDays);
    const cDays = Number(complexDays);
    const hDays = Number(highlyTechnicalDays);

    if (![sDays, cDays, hDays].every(Number.isInteger) || sDays <= 0 || cDays <= 0 || hDays <= 0) {
      return NextResponse.json(
        { ok: false, error: "Turnaround days must be positive integers." },
        { status: 400 }
      );
    }

    if (sDays > cDays || cDays > hDays) {
      return NextResponse.json(
        { ok: false, error: "Turnaround tiers must follow progressive ordering: Simple ≤ Complex ≤ Highly Technical." },
        { status: 400 }
      );
    }

    const saved = await slaStandardsRepo.setStandards({
      frameworkName,
      frameworkType,
      simpleDays: sDays,
      complexDays: cDays,
      highlyTechnicalDays: hDays,
      workingDaysOnly: workingDaysOnly !== false,
    });

    await writeAuditLog(req, "Update Service Standards", {
      details: `Updated SLA standards to '${saved.frameworkName}' (${sDays}-${cDays}-${hDays} ${saved.workingDaysOnly ? "working" : "calendar"} days).`,
      entity_type: "setting",
      entity_id: "sla_turnaround_standards",
    });

    return NextResponse.json({ ok: true, data: saved });
  } catch (error) {
    console.error("[PUT /api/system/sla-settings Error]:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
