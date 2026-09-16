import { NextResponse } from "next/server";
import { populateSampleData } from "@/lib/seedRepo";
import { requireSystemAdmin, createAuthErrorResponse } from "@/lib/authHelpers";

export const runtime = "nodejs";

async function handleSeed(req) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Mock data seeding is unavailable in production." }, { status: 404 });
  }

  const { user, error } = await requireSystemAdmin(req);
  if (error || !user) {
    const status = error?.startsWith("Access denied") ? 403 : 401;
    return createAuthErrorResponse(error || "System administrator authentication required", status);
  }

  const force = req.nextUrl.searchParams.get("force") === "true";

  try {
    const result = await populateSampleData({ force });
    return NextResponse.json({
      ok: true,
      message: "Mock data seeded successfully.",
      data: result.summary,
    });
  } catch (error) {
    console.error("[SeedAPI] Error seeding data:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Mock data seeding requires POST." },
    { status: 405, headers: { Allow: "POST" } }
  );
}

export async function POST(req) {
  return handleSeed(req);
}
