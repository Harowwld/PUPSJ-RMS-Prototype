import { NextResponse } from "next/server";
import { listCourses, createCourse } from "../../../lib/coursesRepo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const courses = await listCourses();
    return NextResponse.json({ ok: true, data: courses });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Failed to list courses: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { code, name } = body;

    if (!code || !name) {
      return NextResponse.json(
        { ok: false, error: "Missing code or name" },
        { status: 400 }
      );
    }

    const newCourse = await createCourse(code, name);
    return NextResponse.json({ ok: true, data: newCourse });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 }
    );
  }
}
