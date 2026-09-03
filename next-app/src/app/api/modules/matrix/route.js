import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { requireSuperAdminSession } from "@/lib/moduleAccess";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    if (!await requireSuperAdminSession(req)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    // Heal any missing default icons in the database if necessary
    await query("UPDATE modules SET icon = 'ph-bold ph-student' WHERE id = 'osas_monitoring' AND (icon IS NULL OR icon = '')").catch(() => {});
    await query("UPDATE offices SET icon = 'ph-bold ph-certificate' WHERE id = 'registrar' AND (icon IS NULL OR icon = '')").catch(() => {});
    await query("UPDATE offices SET icon = 'ph-bold ph-student' WHERE id = 'osas' AND (icon IS NULL OR icon = '')").catch(() => {});

    const [offices, modules, rows] = await Promise.all([
      query("SELECT id, name, short_name, description, icon, accent_color, status FROM offices ORDER BY created_at"),
      query("SELECT * FROM modules ORDER BY category, sort_order"),
      query("SELECT office_id, module_id, enabled, config FROM office_modules"),
    ]);

    const sanitizedOffices = offices.map((o) => {
      if (!o.icon || !o.icon.trim()) {
        const id = (o.id || o.short_name || "").toLowerCase();
        let icon = "ph-bold ph-building";
        if (id.includes("reg")) icon = "ph-bold ph-certificate";
        else if (id.includes("osas") || id.includes("student")) icon = "ph-bold ph-student";
        else if (id.includes("admiss")) icon = "ph-bold ph-user-check";
        else if (id.includes("lib")) icon = "ph-bold ph-books";
        else if (id.includes("acc") || id.includes("cash") || id.includes("fin")) icon = "ph-bold ph-banknote";
        return { ...o, icon };
      }
      return o;
    });

    const sanitizedModules = modules.map((m) => {
      if (!m.icon || !m.icon.trim()) {
        if (m.id === "osas_monitoring") return { ...m, icon: "ph-bold ph-student" };
        if (m.id === "records_review") return { ...m, icon: "ph-bold ph-seal-check" };
        if (m.id === "compliance_analytics") return { ...m, icon: "ph-bold ph-chart-bar" };
        if (m.id === "request_analytics") return { ...m, icon: "ph-bold ph-trend-up" };
        if (m.id === "staff_directory") return { ...m, icon: "ph-bold ph-users" };
        if (m.id === "storage_layout") return { ...m, icon: "ph-bold ph-warehouse" };
        if (m.id === "system_config") return { ...m, icon: "ph-bold ph-gear" };
        if (m.id === "backup") return { ...m, icon: "ph-bold ph-database-backup" };
        if (m.id === "audit_logs") return { ...m, icon: "ph-bold ph-shield-check" };
        if (m.id === "alumni_requests") return { ...m, icon: "ph-bold ph-tray-arrow-up" };
        if (m.id === "scan_upload") return { ...m, icon: "ph-bold ph-scan" };
        if (m.id === "documents") return { ...m, icon: "ph-bold ph-file-text" };
        if (m.id === "notifications") return { ...m, icon: "ph-bold ph-bell" };
        if (m.id === "records_archive") return { ...m, icon: "ph-bold ph-archive-box" };
        if (m.id === "storage_explorer") return { ...m, icon: "ph-bold ph-folder-open" };
        return { ...m, icon: "ph-bold ph-cube" };
      }
      return m;
    });

    const assignments = {};
    rows.forEach((row) => { assignments[row.office_id] ||= {}; assignments[row.office_id][row.module_id] = row; });
    return NextResponse.json({ ok: true, data: { offices: sanitizedOffices, modules: sanitizedModules, assignments } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
