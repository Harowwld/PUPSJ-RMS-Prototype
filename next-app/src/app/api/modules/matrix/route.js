import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { requireSuperAdminSession } from "@/lib/moduleAccess";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    if (!await requireSuperAdminSession()) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const [offices, modules, rows] = await Promise.all([
      query("SELECT id, short_name, accent_color, status FROM offices ORDER BY created_at"),
      query("SELECT * FROM modules ORDER BY category, sort_order"),
      query("SELECT office_id, module_id, enabled, config FROM office_modules"),
    ]);
    const assignments = {};
    rows.forEach((row) => { assignments[row.office_id] ||= {}; assignments[row.office_id][row.module_id] = row; });
    return NextResponse.json({ ok: true, data: { offices, modules, assignments } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
