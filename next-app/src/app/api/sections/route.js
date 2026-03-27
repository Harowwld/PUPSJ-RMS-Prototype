import { NextResponse } from "next/server";
import { listSections, createSection } from "../../../lib/sectionsRepo";
import { writeAuditLog } from "../../../lib/auditLogRequest";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const courseCode = String(searchParams.get("courseCode") || "").trim().toUpperCase();
    const sections = await listSections();
    const scoped = courseCode
      ? sections.filter((s) => String(s.course_code || "").toUpperCase() === courseCode)
      : sections;
    return NextResponse.json({ ok: true, data: scoped });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Failed to list sections: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, courseCode } = body;

    if (!name || !courseCode) {
      return NextResponse.json(
        { ok: false, error: "Missing name or courseCode" },
        { status: 400 }
      );
    }

    const newSection = await createSection(name, courseCode);
    await writeAuditLog(req, `Created section: ${name} (${courseCode})`);
    return NextResponse.json({ ok: true, data: newSection });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 }
    );
  }
}
