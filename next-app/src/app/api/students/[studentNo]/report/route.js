import { NextResponse } from "next/server"
import {
  requireStaff,
  createAuthErrorResponse,
  getPrincipalOfficeId,
} from "@/lib/authHelpers"
import { isSystemAdminRole } from "@/lib/roleUtils"
import { canAccessResource } from "@/lib/resourceAuthorization"
import { getStudentRecordsReport } from "@/lib/digitizationComplianceRepo"
import { writeAuditLog } from "@/lib/auditLogRequest"

export const runtime = "nodejs"

export async function GET(req, context) {
  const access = await requireStaff(req)
  if (access.error || !access.user)
    return createAuthErrorResponse(
      access.error || "Staff authentication required"
    )
  const url = new URL(req.url)
  const requestedOffice = String(url.searchParams.get("officeId") || "")
    .trim()
    .toLowerCase()
  const ownOffice = getPrincipalOfficeId(access.user)
  const officeId = isSystemAdminRole(access.user.role)
    ? requestedOffice || "registrar"
    : ownOffice
  if (
    !officeId ||
    (!isSystemAdminRole(access.user.role) &&
      requestedOffice &&
      requestedOffice !== ownOffice)
  ) {
    return createAuthErrorResponse("Access denied to that office", 403)
  }
  try {
    const { studentNo } = await context.params
    const report = await getStudentRecordsReport({ studentNo, officeId })
    if (
      !report ||
      !canAccessResource(access.user, "student", {
        ...report.student,
        office_id: officeId,
      })
    ) {
      return NextResponse.json(
        { ok: false, error: "Student record not found" },
        { status: 404 }
      )
    }
    await writeAuditLog(req, "Generate student records report", {
      entity_type: "Student",
      entity_id: report.student.studentNo,
      details: `${report.digitizedDocuments.length} digitized records; ${report.outstandingRequirements.length} outstanding requirements; generatedAt=${report.meta.generatedAt}`,
    })
    return NextResponse.json(
      { ok: true, data: report },
      { headers: { "Cache-Control": "private, no-store" } }
    )
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to generate student records report" },
      { status: 500 }
    )
  }
}
