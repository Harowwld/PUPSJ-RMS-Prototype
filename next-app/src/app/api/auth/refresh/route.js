import { NextResponse } from "next/server";
import { getRefreshCookieName } from "@/lib/jwt";
import { rotateRefreshToken } from "@/lib/refreshSessionsRepo";
import { isRefreshRequestAllowed, noStoreAuthResponse, setRefreshCookies } from "@/lib/refreshSessions";
import { clearAuthCookies } from "@/lib/cookieSecurity";

export const runtime = "nodejs";

export async function POST(req) {
  if (!isRefreshRequestAllowed(req)) {
    return noStoreAuthResponse(NextResponse.json({ ok: false, error: "Refresh requires a same-origin request with x-session-refresh: 1" }, { status: 403 }));
  }
  try {
    const result = await rotateRefreshToken(req.cookies.get(getRefreshCookieName())?.value || "");
    if (result.status !== 200) {
      const errRes = noStoreAuthResponse(NextResponse.json({ ok: false, error: result.error }, { status: result.status }));
      if (result.status === 401 || result.status === 403) {
        clearAuthCookies(errRes, req);
      }
      return errRes;
    }
    return setRefreshCookies(NextResponse.json({ ok: true, data: { expiresAt: result.expiresAt } }),
      result.accessToken, result.refreshToken, result.refreshExpiresAt, req);
  } catch (error) {
    console.error("[POST /api/auth/refresh]", error);
    return noStoreAuthResponse(NextResponse.json({ ok: false, error: "Session renewal unavailable; retry shortly" }, { status: 503 }));
  }
}
