import { NextResponse } from "next/server";
import { requireStaff, createAuthErrorResponse, getPrincipalOfficeId } from "../../../../lib/authHelpers";
import { matchStudentsByConfiguredOcrName, matchStudentsByOcrText, mergeStudentMatchCandidates } from "../../../../lib/studentNameMatcher";
import { getOcrStudentRoster } from "../../../../lib/ocrStudentRoster";

export const runtime = "nodejs";

export async function POST(req) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Authentication required");
  const officeId = getPrincipalOfficeId(user);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);

  const body = await req.json().catch(() => null);
  const extractedName = String(body?.extractedName || "").trim();
  const ocrText = String(body?.ocrText || "").trim();
  if ((!extractedName && !ocrText) || extractedName.length > 200 || ocrText.length > 100_000) {
    return NextResponse.json({ ok: false, error: "A valid extracted name or OCR text is required" }, { status: 400 });
  }
  if (String(officeId).toLowerCase() === "osas") {
    return NextResponse.json({ ok: true, data: [] });
  }

  try {
    const roster = await getOcrStudentRoster(officeId);
    const configuredMatches = extractedName
      ? matchStudentsByConfiguredOcrName(extractedName, roster)
      : [];
    const textMatches = ocrText ? matchStudentsByOcrText(ocrText, roster) : [];
    const candidates = mergeStudentMatchCandidates(configuredMatches, textMatches);
    return NextResponse.json({
      ok: true,
      data: candidates.map(({ studentNo, name, mismatchPercent, student }) => ({
        studentNo,
        name,
        mismatchPercent,
        student: {
          studentNo: student.student_no || student.studentNo,
          name: student.name,
          courseCode: student.course_code || student.courseCode || "",
          yearLevel: student.year_level ?? student.yearLevel ?? "",
          section: student.section || "",
          room: student.room ?? "",
          cabinet: student.cabinet || "",
          drawer: student.drawer ?? "",
        },
      })),
    });
  } catch (matchError) {
    console.error("[OCR student match] Failed:", matchError);
    return NextResponse.json({ ok: false, error: "Unable to match the extracted name" }, { status: 500 });
  }
}
