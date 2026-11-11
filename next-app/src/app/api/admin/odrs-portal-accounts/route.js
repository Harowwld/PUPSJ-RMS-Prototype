import { NextResponse } from "next/server";
import { createAuthErrorResponse, requireSystemAdmin } from "@/lib/authHelpers";
import { listOdrsPortalAccounts } from "@/lib/odrsPortalAccountsRepo";

export async function GET(req) {
  const access = await requireSystemAdmin(req);
  if (!access.user) return createAuthErrorResponse(access.error, access.error?.startsWith("Access denied") ? 403 : 401);

  try {
    return NextResponse.json({ ok: true, data: await listOdrsPortalAccounts() });
  } catch (error) {
    console.error("Failed to load ODRS portal accounts:", error?.code || error?.name);
    return NextResponse.json({ ok: false, error: "Unable to load portal accounts." }, { status: 500 });
  }
}
