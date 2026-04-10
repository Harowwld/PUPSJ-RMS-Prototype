import { NextResponse } from "next/server";
import { createDocTypeFull } from "../../../../lib/docTypesRepo";
import { createCourse } from "../../../../lib/coursesRepo";
import { createSection } from "../../../../lib/sectionsRepo";
import { writeAuditLog } from "../../../../lib/auditLogRequest";

export const runtime = "nodejs";

export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.rows)) {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body or missing rows" },
      { status: 400 }
    );
  }

  const { rows } = body;
  let successCount = 0;
  let failCount = 0;

  for (const row of rows) {
    const { category, name, code } = row;
    try {
      if (category === "documenttype" || category === "document type") {
        if (!name) throw new Error("Missing name");
        await createDocTypeFull(name);
        successCount++;
      } else if (category === "course") {
        if (!code || !name) throw new Error("Course requires code and name");
        await createCourse(code, name);
        successCount++;
      } else if (category === "section") {
        if (!name) throw new Error("Missing name");
        const safeCode = code ? code : "UNKN";
        await createSection(name, safeCode);
        successCount++;
      } else {
        // Unknown category or empty row
        continue;
      }
    } catch (e) {
      failCount++;
    }
  }

  if (rows.length > 0) {
    await writeAuditLog(
      req,
      `Bulk imported system configuration: ${rows.length} rows (${successCount} success, ${failCount} failed)`
    );
  }

  return NextResponse.json({ ok: true, data: { successCount, failCount } });
}
