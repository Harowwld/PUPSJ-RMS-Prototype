import { NextResponse } from "next/server";
import { resetDatabase } from "@/lib/resetDatabase";
import { requireSystemAdmin, createAuthErrorResponse } from "@/lib/authHelpers";

export const runtime = "nodejs";

async function handleResetDb(req) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Database reset is unavailable in production." }, { status: 404 });
  }

  const { user, error } = await requireSystemAdmin(req);
  if (error || !user) {
    const status = error?.startsWith("Access denied") ? 403 : 401;
    return createAuthErrorResponse(error || "System administrator authentication required", status);
  }

  const body = await req.json().catch(() => null);
  if (body?.confirmation !== "RESET_LOCAL_DATABASE") {
    return NextResponse.json(
      { ok: false, error: "Explicit reset confirmation is required." },
      { status: 400 }
    );
  }

  try {
    await resetDatabase();

    return NextResponse.json({
      ok: true,
      message: "PostgreSQL data reset successfully. Demo accounts seeded for local development.",
    });
  } catch (error) {
    console.error("[reset-db] Reset failed:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Database reset requires POST." },
    { status: 405, headers: { Allow: "POST" } }
  );
}

export async function POST(req) {
  return handleResetDb(req);
}
