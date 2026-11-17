import { NextResponse } from "next/server";
import { requireSystemAdmin, createAuthErrorResponse } from "@/lib/authHelpers";
import { systemConfigRepo } from "@/lib/systemConfigRepo";
import { getLandingVersionSettings, getPublicLandingVersion, LANDING_VERSION_SETTING_KEY } from "@/lib/landingVersionSettings";

export async function GET(request) {
  const isEditor = request.nextUrl.searchParams.get("view") === "editor";
  if (isEditor) {
    const access = await requireSystemAdmin(request);
    if (access.error || !access.user) return createAuthErrorResponse(access.error || "System administrator access required", 403);
  }

  try {
    const settings = await getLandingVersionSettings();
    const data = isEditor ? settings : getPublicLandingVersion(settings);
    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not load the landing page settings." }, { status: 500 });
  }
}

export async function PUT(request) {
  const access = await requireSystemAdmin(request);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "System administrator access required", 403);

  const body = await request.json().catch(() => null);
  const noticeTitle = typeof body?.noticeTitle === "string" ? body.noticeTitle.trim() : "";
  const noticeDescription = typeof body?.noticeDescription === "string" ? body.noticeDescription.trim() : "";
  const hasNotice = Boolean(noticeTitle || noticeDescription);
  const noticeEnd = typeof body?.noticeEnd === "string" ? body.noticeEnd : "";
  if (!["classic", "enhanced"].includes(body?.version)) {
    return NextResponse.json({ ok: false, error: "Choose a landing page version." }, { status: 400 });
  }
  if (hasNotice && (!noticeTitle || !noticeDescription || noticeTitle.length > 80 || noticeDescription.length > 240 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(noticeEnd) || !Number.isFinite(Date.parse(noticeEnd)) ||
      new Date(noticeEnd).toISOString().slice(0, 10) !== noticeEnd)) {
    return NextResponse.json({ ok: false, error: "Provide a notice title (up to 80 characters), description (up to 240 characters), and a valid end date." }, { status: 400 });
  }

  const data = { version: body.version, noticeTitle, noticeDescription, noticeEnd: hasNotice ? noticeEnd : "" };
  try {
    await systemConfigRepo.setSetting(LANDING_VERSION_SETTING_KEY, JSON.stringify(data));
    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not save the landing page settings." }, { status: 500 });
  }
}
