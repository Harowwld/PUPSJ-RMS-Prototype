import { NextResponse } from "next/server";
import { listSections, createSection } from "../../../lib/sectionsRepo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sections = await listSections();
    return NextResponse.json({ ok: true, data: sections });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Failed to list sections: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { ok: false, error: "Missing name" },
        { status: 400 }
      );
    }

    const newSection = await createSection(name);
    return NextResponse.json({ ok: true, data: newSection });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 }
    );
  }
}
