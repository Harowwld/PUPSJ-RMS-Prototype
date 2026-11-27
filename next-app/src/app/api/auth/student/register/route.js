import { NextResponse } from "next/server";
import { createStudentSession, setStudentSessionCookie } from "@/lib/studentAuth";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";
import { getRateLimiter } from "@/lib/rateLimiter";
import { systemConfigRepo } from "@/lib/systemConfigRepo";
import {
  completeStudentSignup,
  sendSignupChallenge,
  signupEmail,
  StudentSignupError,
  validateStudentSignupDetails,
} from "@/lib/studentSignup";

export const runtime = "nodejs";

export async function POST(req) {
  let step = "start";
  try {
    const body = await req.json().catch(() => null);
    const email = signupEmail(body?.email);
    const action = body?.action || "send";
    if (email.endsWith(".local")) {
      const settings = await systemConfigRepo.getSettings();
      if (String(settings.login_demo_accounts_enabled ?? "true").toLowerCase() === "false") {
        throw new StudentSignupError("Use a public email address. Demo addresses are disabled.");
      }
    }

    if (action === "send") {
      step = "send";
      validateStudentSignupDetails(body);
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || req.headers.get("x-real-ip")?.trim() || req.ip || "unknown";
      const limit = await getRateLimiter().checkRateLimit("student_signup_email", `ip:${ip}`, { ipAddress: ip });
      if (!limit.allowed) throw new StudentSignupError("Too many verification emails requested. Try again later.", 429);
      return NextResponse.json({ ok: true, data: await sendSignupChallenge(email) });
    }
    if (action !== "verify") throw new StudentSignupError("Invalid registration step.");

    step = "verify";
    const student = await completeStudentSignup(email, body);
    step = "sign-in";
    await writeGlobalAuditLog(req, "Student account registered", {
      actor: student.name || String(student.id),
      actor_id: String(student.id),
      role: "Student",
      details: "Verified email and created a student portal account",
      entity_type: "student_account",
      entity_id: String(student.id),
    });
    const token = await createStudentSession(student);
    return await setStudentSessionCookie(NextResponse.json({
      ok: true,
      data: { student_no: student.student_no, name: student.name },
    }, { status: 201 }), token, req);
  } catch (error) {
    if (error instanceof StudentSignupError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error("Student signup failed:", { step, code: error?.code || error?.name });
    if (step === "sign-in") {
      return NextResponse.json({ ok: false, error: "Your account was created. Sign in with the email and password you used during signup." }, { status: 500 });
    }
    if (error?.code === "42P01") {
      return NextResponse.json({ ok: false, error: "Registration is unavailable until the administrator applies the database updates." }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: "Registration is temporarily unavailable. Try again or contact your administrator." }, { status: 500 });
  }
}
