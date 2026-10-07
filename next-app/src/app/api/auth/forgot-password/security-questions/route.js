import { NextResponse } from "next/server";
import { ForgotPasswordIdentifySchema } from "@/lib/authSchemas";
import { checkAuthForgotPasswordRateLimit } from "@/lib/rateLimiter";
import { getStaffByUsername, getStaffRecoveryQuestions } from "@/lib/staffRepo";

export const runtime = "nodejs";

export async function POST(req) {
  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")?.trim() || req.ip || "unknown";
  const ipLimit = await checkAuthForgotPasswordRateLimit(ipAddress);
  if (!ipLimit.allowed) {
    return NextResponse.json({ ok: false, error: "Too many password reset attempts. Please try again later." }, { status: 429 });
  }
  const validation = ForgotPasswordIdentifySchema.safeParse(await req.json().catch(() => null));
  if (!validation.success) {
    return NextResponse.json({ ok: false, error: "Invalid account identifier." }, { status: 400 });
  }

  const identifier = validation.data.identifier.toLowerCase();
  const staff = await getStaffByUsername(identifier);
  const accountLimit = await checkAuthForgotPasswordRateLimit(ipAddress, staff?.id || identifier);
  if (!accountLimit.allowed) {
    return NextResponse.json({ ok: false, error: "Too many password reset attempts. Please try again later." }, { status: 429 });
  }
  const questions = staff?.status === "Active" ? await getStaffRecoveryQuestions(staff.id) : [];
  if (!questions.length) {
    return NextResponse.json({
      ok: false,
      error: "Security question recovery is unavailable for this account. Use an email link or contact your administrator.",
    }, { status: 400 });
  }
  return NextResponse.json({ ok: true, data: {
    id: staff.id,
    questions: questions.map(({ id, question }) => ({ id, question })),
  } }, { headers: { "Cache-Control": "no-store" } });
}
