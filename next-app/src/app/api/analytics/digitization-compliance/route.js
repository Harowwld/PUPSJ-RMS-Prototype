import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getSessionCookieName, verifySessionToken } from "../../../../lib/jwt";
import { getStaffById } from "../../../../lib/staffRepo";
import { getDigitizationComplianceSummary } from "../../../../lib/digitizationComplianceRepo";

export const runtime = "nodejs";

async function getSessionStaff() {
  const cookieName = getSessionCookieName();
  const store = await cookies();
  const token = store.get(cookieName)?.value || "";
  if (!token) return null;

  const payload = await verifySessionToken(token);
  const userId = String(payload?.sub || "").trim();
  if (!userId) return null;

  return await getStaffById(userId);
}

function isAdminRole(roleRaw) {
  const role = String(roleRaw || "").toLowerCase();
  return ["admin", "administrator", "superadmin"].includes(role);
}

function parseBool(raw) {
  if (raw === null || raw === undefined) return false;
  const s = String(raw).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

export async function GET(req) {
  try {
    const cookieName = getSessionCookieName();
    const store = await cookies();
    const token = store.get(cookieName)?.value || "";
    if (!token) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifySessionToken(token);
    const userId = String(payload?.sub || "").trim();
    
    // Attempt database lookup for fresh role info, but fallback to token payload for resilience
    const staff = userId ? await getStaffById(userId) : null;
    const effectiveRole = staff?.role || payload?.role || "";

    if (!isAdminRole(effectiveRole)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const studentStatus =
      statusParam === null || statusParam === ""
        ? "Active"
        : String(statusParam).trim();

    const courseCode = searchParams.get("courseCode") || "";
    const requireApproved = parseBool(searchParams.get("requireApproved"));

    const thresholdRaw = searchParams.get("threshold");
    let threshold = 0.95;
    if (thresholdRaw !== null && thresholdRaw !== "") {
      const t = parseFloat(thresholdRaw);
      if (Number.isFinite(t)) threshold = t;
    }

    const data = await getDigitizationComplianceSummary({
      studentStatus,
      courseCode: courseCode.trim() || undefined,
      requireApproved,
      threshold,
    });

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load digitization compliance" },
      { status: 500 }
    );
  }
}
