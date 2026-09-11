import { NextResponse } from "next/server";
import { 
  detectExternalDrive, 
  setSimulationMode, 
  isSimulationMode 
} from "@/lib/externalDriveDetector";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const simulateParam = searchParams.get("simulate");
    
    if (simulateParam !== null) {
      setSimulationMode(simulateParam === "true");
    }

    const info = detectExternalDrive();
    return NextResponse.json({ ok: true, data: info });
  } catch (err) {
    console.error("[EXTERNAL DRIVE API] Detection Error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
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
      data: info 
    });
  } catch (err) {
    console.error("[EXTERNAL DRIVE API] Toggle Error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
