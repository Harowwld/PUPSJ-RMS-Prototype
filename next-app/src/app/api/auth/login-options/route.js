import { NextResponse } from "next/server";
import { systemConfigRepo } from "@/lib/systemConfigRepo";

export const runtime = "nodejs";

export async function GET() {
  try {
    const value = await systemConfigRepo.getSetting("login_demo_accounts_enabled", "true");
    const showDemoAccounts = String(value).toLowerCase() !== "false";
    return NextResponse.json(
      { ok: true, data: { showDemoAccounts } },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch {
    return NextResponse.json({ ok: true, data: { showDemoAccounts: true } }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}
