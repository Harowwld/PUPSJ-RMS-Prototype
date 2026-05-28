import { NextResponse } from "next/server";
import { createStudent } from "../../../../lib/studentsRepo";
import { listCourses } from "../../../../lib/coursesRepo";
import { writeAuditLog } from "../../../../lib/auditLogRequest";
import { getStorageLayout } from "../../../../lib/storageLayoutRepo";
import { canonicalizeCabinetId } from "../../../../lib/storageLayoutUtils";

export const runtime = "nodejs";

export async function GET() {
  try {
    const courses = await listCourses();
    return NextResponse.json({ ok: true, data: courses.map(c => c.code) });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Failed to load courses" },
      { status: 500 }
    );
  }
}

function validateStudentPayload(body, layout) {
  const studentNo = String(body?.studentNo || "").trim();
  const name = String(body?.name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
  const courseCode = String(body?.courseCode || "").trim().toUpperCase();
  const yearLevel = parseInt(body?.yearLevel);
  const section = String(body?.section || "").trim();
  const room = parseInt(body?.room);
  const cabinet = canonicalizeCabinetId(body?.cabinet);
  const drawer = parseInt(body?.drawer);
  const status = String(body?.status || "Active").trim() || "Active";

  const studentNoPattern = /^\d{4}-\d{5}-[A-Z]{2}-\d$/;

  if (!studentNo || !name || !courseCode || !section) {
    return { ok: false, error: "Missing required fields" };
  }

  if (!studentNoPattern.test(studentNo.toUpperCase())) {
    return { ok: false, error: "Invalid studentNo format" };
  }

  if (!Number.isFinite(yearLevel) || yearLevel < 2000 || yearLevel > 2100) {
    return { ok: false, error: "Invalid yearLevel" };
  }

  // Storage Location Validation
  if (!Number.isFinite(room) || room < 1) {
    return { ok: false, error: "Invalid room" };
  }
  if (!cabinet) {
    return { ok: false, error: "Invalid cabinet" };
  }
  if (!Number.isFinite(drawer) || drawer < 1) {
    return { ok: false, error: "Invalid drawer" };
  }

  // Physical Layout Verification
  const roomDef = layout?.rooms?.find(r => r.id === room);
  if (!roomDef) {
    return { ok: false, error: `Storage Room ${room} does not exist in the system` };
  }
  const cabDef = roomDef.cabinets?.find(c => c.id === cabinet);
  if (!cabDef) {
    return { ok: false, error: `Cabinet ${cabinet} does not exist in Room ${room}` };
  }
  if (!cabDef.drawerIds?.includes(drawer)) {
    return { ok: false, error: `Drawer ${drawer} does not exist in Cabinet ${cabinet} (Room ${room})` };
  }

  return {
    ok: true,
    value: {
      studentNo,
      name,
      courseCode,
      yearLevel,
      section,
      room,
      cabinet,
      drawer,
      status,
    },
  };
}

export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const rows = Array.isArray(body.rows) ? body.rows : null;
  if (!rows) {
    return NextResponse.json(
      { ok: false, error: "Missing rows" },
      { status: 400 }
    );
  }

  const layout = await getStorageLayout().catch(() => null);

  const results = [];
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const validated = validateStudentPayload(raw, layout);
    if (!validated.ok) {
      results.push({ index: i, ok: false, error: validated.error });
      continue;
    }

    try {
      const created = await createStudent(validated.value);
      results.push({ index: i, ok: true, data: created });
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("UNIQUE") || msg.includes("PRIMARY")) {
        results.push({ index: i, ok: false, error: "Student already exists" });
      } else if (
        msg.includes("Invalid courseCode") ||
        msg.includes("Invalid section") ||
        msg.includes("is linked to")
      ) {
        results.push({ index: i, ok: false, error: msg });
      } else {
        results.push({ index: i, ok: false, error: "Failed to create student" });
      }
    }
  }
  const successCount = results.filter((r) => r.ok).length;
  const failCount = results.length - successCount;
  await writeAuditLog(req, `Batch student import`, { details: `${rows.length} rows (${successCount} success, ${failCount} failed)` });

  return NextResponse.json({ ok: true, data: results });
}
