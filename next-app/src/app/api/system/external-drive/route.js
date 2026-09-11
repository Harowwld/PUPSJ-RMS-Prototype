import { NextResponse } from "next/server";
import {
  detectExternalDrive,
  setSimulationMode,
  isSimulationMode,
} from "@/lib/externalDriveDetector";
import { requireSystemAdmin, createAuthErrorResponse } from "../../../../lib/authHelpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireAccessError(access) {
  return createAuthErrorResponse(
    access.error || "System administrator access required",
    access.error?.startsWith("Access denied") ? 403 : 401,
  );
}

export async function GET(req) {
  const access = await requireSystemAdmin(req);
  if (access.error || !access.user) return requireAccessError(access);

  try {
    const { searchParams } = new URL(req.url);
    const simulateParam = searchParams.get("simulate");
    if (simulateParam !== null) setSimulationMode(simulateParam === "true");
    return NextResponse.json({ ok: true, data: detectExternalDrive() });
  } catch {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req) {
  const access = await requireSystemAdmin(req);
  if (access.error || !access.user) return requireAccessError(access);

  try {
    const body = await req.json().catch(() => ({}));
    if (body.simulate !== undefined) {
      setSimulationMode(Boolean(body.simulate));
    } else {
      setSimulationMode(!isSimulationMode());
    }
    const info = detectExternalDrive();
    return NextResponse.json({
      ok: true,
      message: info.isEmulated ? "Simulation mode enabled" : "Hardware detection mode active",
      data: info,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
