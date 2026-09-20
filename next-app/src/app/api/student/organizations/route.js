import { NextResponse } from "next/server";
import { requireStudent, createAuthErrorResponse } from "@/lib/authHelpers";
import { getOrganizationsForStudentEmail } from "@/lib/organizationsRepo";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requireStudent(req);
  if (access.error || !access.user) {
    return createAuthErrorResponse(
      access.error || "Student authentication required",
      access.error?.startsWith("Access denied") ? 403 : 401
    );
  }

  const studentEmail = access.user.email;
  if (!studentEmail) {
    return NextResponse.json({ ok: true, data: [] });
  }

  const orgs = await getOrganizationsForStudentEmail(studentEmail);
  return NextResponse.json({ ok: true, data: orgs });
}
