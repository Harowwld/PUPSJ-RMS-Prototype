import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { requireSuperAdminSession } from "@/lib/moduleAccess";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const session = await requireSuperAdminSession(req);
    if (session === null) {
      return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }
    if (!session) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const [offices, modules, rows] = await Promise.all([
      query("SELECT id, name, short_name, description, icon, accent_color, status FROM offices ORDER BY created_at"),
      query("SELECT * FROM modules ORDER BY category, sort_order"),
      query("SELECT office_id, module_id, enabled, config FROM office_modules"),
    ]);

    const sanitizedOffices = offices.map((o) => {
      if (!o.icon || !o.icon.trim()) {
        const id = (o.id || o.short_name || "").toLowerCase();
        let icon = " Building02Icon";
        if (id.includes("reg")) icon = " Certificate01Icon";
        else if (id.includes("osas") || id.includes("student")) icon = " StudentIcon";
        else if (id.includes("admiss")) icon = " UserCheck01Icon";
        else if (id.includes("lib")) icon = " LibraryIcon";
        else if (id.includes("acc") || id.includes("cash") || id.includes("fin")) icon = " BankIcon";
        return { ...o, icon };
      }
      return o;
    });

    const sanitizedModules = modules.map((m) => {
      if (!m.icon || !m.icon.trim()) {
        if (m.id === "osas_monitoring") return { ...m, icon: " StudentIcon" };
        if (m.id === "records_review") return { ...m, icon: " CheckmarkBadge01Icon" };
        if (m.id === "compliance_analytics") return { ...m, icon: " Analytics01Icon" };
        if (m.id === "request_analytics") return { ...m, icon: " Analytics01Icon" };
        if (m.id === "staff_directory") return { ...m, icon: " UserSearch01Icon" };
        if (m.id === "storage_layout") return { ...m, icon: " WarehouseIcon" };
        if (m.id === "system_config") return { ...m, icon: " Settings01Icon" };
        if (m.id === "backup") return { ...m, icon: " DatabaseIcon" };
        if (m.id === "audit_logs") return { ...m, icon: " Shield01Icon" };
        if (m.id === "document_requests") return { ...m, icon: " FileUploadIcon" };
        if (m.id === "student_directory") return { ...m, icon: " UserSearch01Icon" };
        if (m.id === "scan_upload") return { ...m, icon: " FingerPrintScanIcon" };
        if (m.id === "documents") return { ...m, icon: " File02Icon" };
        if (m.id === "notifications") return { ...m, icon: " Notification01Icon" };
        if (m.id === "records_archive") return { ...m, icon: " Archive01Icon" };
        if (m.id === "storage_explorer") return { ...m, icon: " FolderOpenIcon" };
        if (m.id === "student_organizations") return { ...m, icon: " Building01Icon" };
        return { ...m, icon: " AlignBoxBottomCenterIcon" };
      }
      return m;
    });

    const assignments = {};
    rows.forEach((row) => { assignments[row.office_id] ||= {}; assignments[row.office_id][row.module_id] = row; });
    return NextResponse.json({ ok: true, data: { offices: sanitizedOffices, modules: sanitizedModules, assignments } });
  } catch {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
