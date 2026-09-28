import { NextResponse } from "next/server";
import { query, queryOne, transaction } from "@/lib/postgres";
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
  } catch (err) {
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
    const body = await req.json();
    if (!body || !Array.isArray(body.moduleIds)) {
      return NextResponse.json({ ok: false, error: "Missing moduleIds array in body" }, { status: 400 });
    }
    const office = await queryOne("SELECT id, name, short_name, status FROM offices WHERE id = $1", [id]);
    if (!office) return NextResponse.json({ ok: false, error: "Office not found" }, { status: 404 });
    if (office.status === "Inactive" || office.status === "Archived") {
      return NextResponse.json({ ok: false, error: "Archived offices cannot be modified. Please reactivate the office first." }, { status: 400 });
    }
    const requested = new Set(body.moduleIds.map(String));
    const modules = await query("SELECT id, name, is_system FROM modules ORDER BY sort_order ASC, name ASC");

    // Track previous module states to log exact diff
    const prevRows = await query(
      "SELECT module_id, enabled FROM office_modules WHERE office_id = $1",
      [id]
    );
    const prevEnabledMap = new Map((prevRows || []).map((r) => [r.module_id, Boolean(r.enabled)]));

    const newlyEnabled = [];
    const newlyDisabled = [];

    for (const m of modules) {
      const isNowEnabled = Boolean(m.is_system || requested.has(m.id));
      const wasEnabled = prevEnabledMap.has(m.id) ? prevEnabledMap.get(m.id) : false;
      if (isNowEnabled && !wasEnabled) {
        newlyEnabled.push(m.name || m.id);
      } else if (!isNowEnabled && wasEnabled) {
        newlyDisabled.push(m.name || m.id);
      }
    }

    await transaction(async ({ query: run }) => {
      for (const moduleRow of modules) {
        const enabled = moduleRow.is_system || requested.has(moduleRow.id);
        await run(`INSERT INTO office_modules (office_id, module_id, enabled, updated_at)
          VALUES ($1, $2, $3, NOW()) ON CONFLICT (office_id, module_id)
          DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW()`, [id, moduleRow.id, enabled]);
      }
    });
    const updated = await query("SELECT * FROM office_modules WHERE office_id = $1 ORDER BY module_id", [id]);

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
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
