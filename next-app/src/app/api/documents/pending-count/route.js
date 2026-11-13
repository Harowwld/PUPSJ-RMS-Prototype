import { NextResponse } from "next/server";
import { countPendingDocuments } from "@/lib/documentsRepo";
import { getPrincipalOfficeId, requireAdmin, createAuthErrorResponse } from "@/lib/authHelpers";
import { isSystemAdminRole } from "@/lib/roleUtils";

export const runtime = "nodejs";

export async function GET(req) {
  const { user, error } = await requireAdmin(req);
  if (error || !user) return createAuthErrorResponse(error || "Admin access required", 403);
  const officeId = getPrincipalOfficeId(user);
  if (!isSystemAdminRole(user.role) && !officeId) {
    return createAuthErrorResponse("Office scope is required", 403);
  }

  const count = await countPendingDocuments({ officeId: officeId || undefined });
  return NextResponse.json({ ok: true, count });
}
