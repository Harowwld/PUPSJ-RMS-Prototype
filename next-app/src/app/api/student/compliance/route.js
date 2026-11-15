import { NextResponse } from "next/server";
import { requireCurrentStudent, createAuthErrorResponse } from "@/lib/authHelpers";
import { getStudentChecklist } from "@/lib/studentChecklist";

export const runtime = "nodejs";

export async function GET(req) {
  const { user, error } = await requireCurrentStudent(req);
  if (!user) return createAuthErrorResponse(error || "Student authentication required", error?.startsWith("Access denied") ? 403 : 401);
  try {
    const data = await getStudentChecklist(user);
    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Unable to load student checklist:", error?.code || error?.name);
    return NextResponse.json({ ok: false, error: "Could not load the checklist. Try refreshing." }, { status: 500 });
  }
}
