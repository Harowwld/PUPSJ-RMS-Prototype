import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookieName, verifySessionToken } from "../../../../lib/jwt";
import { populateSampleData } from "../../../../lib/seedRepo";
import { getStaffById } from "../../../../lib/staffRepo";
import { getDb } from "../../../../lib/sqlite";

export const runtime = "nodejs";

export async function GET(req) {
  const store = await cookies();
  const token = store.get(getSessionCookieName())?.value || "";
  let user = null;

  if (token) {
    try {
      const payload = await verifySessionToken(token);
      if (payload?.sub) {
        user = await getStaffById(payload.sub);
      }
    } catch {}
  }

  const bypassToken = req.nextUrl.searchParams.get("bypass");
  const force = req.nextUrl.searchParams.get("force") === "true";
  const masterSecret = process.env.JWT_SECRET || "pup-secret-fallback";
  const isBypass = bypassToken === masterSecret;

  // Check if we're in bootstrap mode (no staff at all)
  const db = await getDb();
  const staffCountRow = db.prepare("SELECT COUNT(*) as count FROM staff").get();
  const staffCount = staffCountRow?.count || 0;

  if (!isBypass) {
    // Standard auth check
    if (staffCount > 0) {
      if (!user) {
        return NextResponse.json(
          { ok: false, error: "Authentication required. Use ?bypass=[JWT_SECRET] if locked out." },
          { status: 401 }
        );
      }
      if (user.role !== "Admin") {
        return NextResponse.json(
          { ok: false, error: "Only administrators can seed mock data." },
          { status: 403 }
        );
      }
    }
  }

  try {
    const result = await populateSampleData({ force });
    return NextResponse.json({
      ok: true,
      message: "Mock data seeded successfully.",
      data: result.summary
    });
  } catch (error) {
    console.error("[SeedAPI] Error seeding data:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
