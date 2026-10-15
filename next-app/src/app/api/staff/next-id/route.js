import { NextResponse } from "next/server";
import { getNextStaffId } from "@/lib/staffRepo";
import { requireAdmin, createAuthErrorResponse, getPrincipalOfficeId } from "@/lib/authHelpers";
import { isSystemAdminRole } from "@/lib/roleUtils";

export const runtime = "nodejs";

export async function GET(req) {
  const { user, error } = await requireAdmin(req);
  if (error || !user) {
    return createAuthErrorResponse(error || "Admin access required", 403);
  }

  const { searchParams } = new URL(req.url);
  const officeFilter = searchParams.get("officeId");
  const role = searchParams.get("role") || "Staff";

  let officeId = getPrincipalOfficeId(user);
  if (isSystemAdminRole(user.role)) {
    if (officeFilter && officeFilter !== "global" && officeFilter !== "All") {
      officeId = officeFilter;
    } else {
      officeId = null;
    }
  }

  try {
    const nextId = await getNextStaffId({ officeId, role });
    return NextResponse.json({ ok: true, nextId });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to generate next staff ID" },
      { status: 500 }
    );
  }
}
