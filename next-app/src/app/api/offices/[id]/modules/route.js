import { NextResponse } from "next/server";
import { query, transaction } from "@/lib/postgres";
import { requireSuperAdminSession } from "@/lib/moduleAccess";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  const session = await requireSuperAdminSession(req);
  if (session === null) {
    return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }
  if (!session) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const modules = await query(`SELECT m.*, COALESCE(om.enabled, false) AS enabled, om.config
      FROM modules m LEFT JOIN office_modules om ON om.module_id = m.id AND om.office_id = $1
      ORDER BY m.category, m.sort_order`, [id]);
    return NextResponse.json({ ok: true, data: modules });
  } catch {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const session = await requireSuperAdminSession(req);
  if (session === null) {
    return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }
  if (!session) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.moduleIds)) {
      return NextResponse.json({ ok: false, error: "Missing moduleIds array in body" }, { status: 400 });
    }
    if (Object.keys(body).some((field) => field !== "moduleIds")) {
      return NextResponse.json({ ok: false, error: "Only moduleIds is supported" }, { status: 400 });
    }
    if (body.moduleIds.some((moduleId) => typeof moduleId !== "string" || !moduleId.trim())) {
      return NextResponse.json({ ok: false, error: "moduleIds must contain module ID strings" }, { status: 400 });
    }
    const requested = new Set(body.moduleIds.map(String));
    const result = await transaction(async ({ query: run, queryOne: runOne }) => {
      const office = await runOne("SELECT id, name, short_name, status FROM offices WHERE id = $1 FOR UPDATE", [id]);
      if (!office) return { error: "Office not found", status: 404 };
      if (office.status === "Inactive" || office.status === "Archived") {
        return { error: "Archived offices cannot be modified. Please reactivate the office first.", status: 400 };
      }
      const modules = await run("SELECT id, name, is_system FROM modules ORDER BY sort_order ASC, name ASC");
      const knownIds = new Set(modules.rows.map((moduleRow) => moduleRow.id));
      const unknownIds = [...requested].filter((moduleId) => !knownIds.has(moduleId));
      if (unknownIds.length) {
        return { error: `Unknown module ID(s): ${unknownIds.join(", ")}`, status: 400 };
      }
      const prevResult = await run("SELECT module_id, enabled FROM office_modules WHERE office_id = $1", [id]);
      const prevEnabledMap = new Map(prevResult.rows.map((row) => [row.module_id, Boolean(row.enabled)]));
      const newlyEnabled = [];
      const newlyDisabled = [];
      for (const moduleRow of modules.rows) {
        const isNowEnabled = Boolean(moduleRow.is_system || requested.has(moduleRow.id));
        const wasEnabled = prevEnabledMap.get(moduleRow.id) || false;
        if (isNowEnabled && !wasEnabled) newlyEnabled.push(moduleRow.name || moduleRow.id);
        else if (!isNowEnabled && wasEnabled) newlyDisabled.push(moduleRow.name || moduleRow.id);
      }
      for (const moduleRow of modules.rows) {
        const enabled = moduleRow.is_system || requested.has(moduleRow.id);
        await run(`INSERT INTO office_modules (office_id, module_id, enabled, updated_at)
          VALUES ($1, $2, $3, NOW()) ON CONFLICT (office_id, module_id)
          DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW()`, [id, moduleRow.id, enabled]);
      }
      const updated = await run("SELECT * FROM office_modules WHERE office_id = $1 ORDER BY module_id", [id]);
      return { office, modules: modules.rows, newlyEnabled, newlyDisabled, updated: updated.rows };
    });
    if (result.error) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }
    const { office, modules, newlyEnabled, newlyDisabled, updated } = result;

    const officeLabel = office.short_name || office.name || id;
    let detailsText = "";
    if (newlyEnabled.length > 0 && newlyDisabled.length > 0) {
      detailsText = `Updated modules for ${officeLabel}: enabled [${newlyEnabled.join(", ")}], disabled [${newlyDisabled.join(", ")}].`;
    } else if (newlyEnabled.length > 0) {
      detailsText = `Enabled module(s) [${newlyEnabled.join(", ")}] for ${officeLabel}.`;
    } else if (newlyDisabled.length > 0) {
      detailsText = `Disabled module(s) [${newlyDisabled.join(", ")}] for ${officeLabel}.`;
    } else {
      const activeModules = modules.filter((m) => m.is_system || requested.has(m.id)).map((m) => m.name || m.id);
      detailsText = `Re-saved module access assignments for ${officeLabel} (${activeModules.length} active: ${activeModules.join(", ")}).`;
    }

    await writeGlobalAuditLog(req, "Updated module access", {
      officeId: id,
      details: detailsText,
      entity_type: "office",
      entity_id: id,
    });
    return NextResponse.json({ ok: true, data: updated });
  } catch {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
