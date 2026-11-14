import { NextResponse } from "next/server";
import { isValidCalendarDateRange } from "@/lib/timeFormat";
import { requireStaff, createAuthErrorResponse, getPrincipalOfficeId } from "@/lib/authHelpers";
import { hasAdminPrivileges } from "@/lib/roleUtils";
import { canAccessResource } from "@/lib/resourceAuthorization";
import { browseStudents, getStudentBrowseSummary } from "@/lib/studentBrowseRepo";
import { writeAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

const csv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export async function GET(req) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Staff authentication required", 401);
  const officeId = getPrincipalOfficeId(user);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);

  const params = new URL(req.url).searchParams;
  const mode = params.get("mode") || "page";
  if (mode === "summary") {
    return NextResponse.json({ ok: true, data: await getStudentBrowseSummary(officeId) });
  }
  const exportAll = mode === "export";
  if (exportAll && !hasAdminPrivileges(user.role)) {
    return createAuthErrorResponse("Export is restricted to administrative personnel", 403);
  }
  const page = Math.max(1, Math.min(1000000, Number.parseInt(params.get("page") || "1", 10) || 1));
  const pageSize = Math.max(1, Math.min(100, Number.parseInt(params.get("pageSize") || "10", 10) || 10));
  const startDate = params.get("startDate") || "";
  const endDate = params.get("endDate") || "";
  if (!isValidCalendarDateRange(startDate, endDate)) {
    return NextResponse.json({ ok: false, error: "Invalid date range." }, { status: 400 });
  }
  const year = params.has("folderYear") ? Number(params.get("folderYear")) : null;
  if (year != null && (!Number.isInteger(year) || year < 1900 || year > 2200)) {
    return NextResponse.json({ ok: false, error: "Invalid folder year" }, { status: 400 });
  }
  const sortBy = params.get("sortBy") || "studentNo";
  if (!["studentNo", "name", "odrsEmail", "courseCode", "yearLevel", "section", "room", "cabinet", "drawer", "documents"].includes(sortBy)) {
    return NextResponse.json({ ok: false, error: "Invalid sort" }, { status: 400 });
  }
  const data = await browseStudents({
    officeId,
    archived: params.get("archived") === "true",
    year,
    startDate,
    endDate,
    q: params.get("q") || "",
    courses: params.getAll("course"),
    years: params.getAll("year").map(Number).filter(Number.isInteger),
    sections: params.getAll("section"),
    excludedCourses: params.getAll("exclude-course"),
    excludedYears: params.getAll("exclude-year").map(Number).filter(Number.isInteger),
    excludedSections: params.getAll("exclude-section"),
    sortBy,
    groupBy: params.get("groupBy"),
    sortOrder: params.get("sortOrder") === "DESC" ? "DESC" : "ASC",
    page,
    pageSize,
    exportAll,
  });
  const rows = data.rows.filter((row) => canAccessResource(user, "student", { ...row, office_id: officeId }));

  if (exportAll) {
    const headers = ["Student No", "Full Name", ...(officeId === "registrar" ? ["Email"] : []), "Degree Program", "Section", "Year Level", "Room", "Cabinet", "Drawer", "Documents Count", "Status"];
    const lines = rows.map((s) => [s.studentNo, s.name, ...(officeId === "registrar" ? [s.odrsEmail] : []), s.courseCode, s.section, s.yearLevel, s.room, s.cabinet, s.drawer, s.documentCount, s.status].map(csv).join(","));
    await writeAuditLog(req, "Exported student directory", { details: `${rows.length} records` });
    return new Response([headers.join(","), ...lines].join("\n"), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="student-directory.csv"', "Cache-Control": "private, no-store" },
    });
  }
  return NextResponse.json({ ok: true, data: { rows, total: data.total } }, { headers: { "Cache-Control": "private, no-store" } });
}
