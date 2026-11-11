import { NextResponse } from "next/server";
import { createAuthErrorResponse, requireAuth } from "@/lib/authHelpers";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";
import { matchOdrsPortalAccount } from "@/lib/odrsPortalAccountsRepo";

async function handleAccount(req, { params }, link) {
  const access = await requireAuth(req, ["Admin"]);
  if (!access.user) return createAuthErrorResponse(access.error, access.error?.startsWith("Access denied") ? 403 : 401);
  if (access.user.officeId !== "registrar") return createAuthErrorResponse("Registrar administrator access is required.", 403);

  const { studentNo } = await params;
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const accountId = typeof body?.accountId === "string" ? body.accountId : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Enter the student's portal email address." }, { status: 400 });
  }
  if (link && (!/^\d{1,19}$/.test(accountId) || body.identityConfirmed !== true)) {
    return NextResponse.json({ ok: false, error: "Find the portal account and confirm the student's identity first." }, { status: 400 });
  }

  try {
    const result = await matchOdrsPortalAccount(studentNo, email, link ? accountId : null);
    if (result.error) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    if (link && !result.alreadyLinked) {
      await writeGlobalAuditLog(req, "Linked ODRS portal account", {
        entity_type: "student_account",
        entity_id: result.account.id,
        details: `Registrar verified the account holder and linked student record ${studentNo}.`,
      });
    }
    return NextResponse.json({ ok: true, data: result.account });
  } catch (error) {
    console.error("ODRS account linking failed:", error?.code || error?.name);
    return NextResponse.json({ ok: false, error: "Unable to verify or link the portal account." }, { status: 500 });
  }
}

export async function POST(req, context) {
  return handleAccount(req, context, false);
}

export async function PATCH(req, context) {
  return handleAccount(req, context, true);
}
