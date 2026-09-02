import { NextResponse } from "next/server";
import { query, queryOne, transaction } from "@/lib/postgres";
import { requireSuperAdminSession } from "@/lib/moduleAccess";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  const session = await requireSuperAdminSession(req);
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
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const session = await requireSuperAdminSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    if (!body || !Array.isArray(body.moduleIds)) {
      return NextResponse.json({ ok: false, error: "Missing moduleIds array in body" }, { status: 400 });
    }
    const office = await queryOne("SELECT id FROM offices WHERE id = $1", [id]);
    if (!office) return NextResponse.json({ ok: false, error: "Office not found" }, { status: 404 });
    const requested = new Set(body.moduleIds.map(String));
    const modules = await query("SELECT id, is_system FROM modules");
    await transaction(async ({ query: run }) => {
      for (const moduleRow of modules) {
        const enabled = moduleRow.is_system || requested.has(moduleRow.id);
        await run(`INSERT INTO office_modules (office_id, module_id, enabled, updated_at)
          VALUES ($1, $2, $3, NOW()) ON CONFLICT (office_id, module_id)
          DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW()`, [id, moduleRow.id, enabled]);
      }
    });
    const updated = await query("SELECT * FROM office_modules WHERE office_id = $1 ORDER BY module_id", [id]);
    await writeGlobalAuditLog(req, "Updated module access", {
      officeId: id,
      details: "Module access assignments changed.",
      entity_type: "office",
      entity_id: id,
    });
    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
