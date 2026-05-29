import { NextResponse } from "next/server";
import os from "node:os";
import { getSessionStaff, isActiveStaff } from "../../../lib/scanSessionAuth.js";
import {
  createPairToken,
  createScanSession,
  listIncomingForSession,
} from "../../../lib/scanSessionRepo.js";

export const runtime = "nodejs";

function pickLanIPv4() {
  try {
    const nets = os.networkInterfaces();
    const candidates = [];
    for (const name of Object.keys(nets)) {
      const list = nets[name] || [];
      for (const n of list) {
        if (!n || n.family !== "IPv4" || n.internal) continue;
        const addr = String(n.address || "");
        if (!addr) continue;
        // Prefer typical private LAN ranges.
        const isPrivate =
          addr.startsWith("192.168.") ||
          addr.startsWith("10.") ||
          /^172\.(1[6-9]|2\d|3[0-1])\./.test(addr);
        if (isPrivate) candidates.unshift(addr);
        else candidates.push(addr);
      }
    }
    return candidates[0] || "";
  } catch {
    return "";
  }
}

export async function POST(req) {
  try {
    const staff = await getSessionStaff();
    if (!staff || !isActiveStaff(staff)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const token = createPairToken();
    const session = await createScanSession({ staffId: staff.id, token });
    if (!session?.id) {
      return NextResponse.json(
        { ok: false, error: "Failed to create scan session" },
        { status: 500 }
      );
    }

    const incoming = await listIncomingForSession(session.id, { limit: 25 });
    const host = String(req.headers.get("x-forwarded-host") || req.headers.get("host") || "").trim();
    const proto = String(req.headers.get("x-forwarded-proto") || "http").trim() || "http";
    let origin = req.nextUrl.origin;
    if (host) origin = `${proto}://${host}`;
    try {
      const u = new URL(origin);
      const isLocalhost =
        u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "::1";
      if (isLocalhost) {
        const lan = pickLanIPv4();
        if (lan) u.hostname = lan;
      }
      origin = u.toString().replace(/\/$/, "");
    } catch {
      // keep origin as-is
    }
    const phoneLinkUrl = `${origin}/scan/link?session=${session.id}&token=${encodeURIComponent(token)}`;

    return NextResponse.json({
      ok: true,
      data: {
        session,
        incoming,
        phoneLinkUrl,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          process.env.NODE_ENV === "development"
            ? err?.message || "Scan session error"
            : "Failed to create scan session",
      },
      { status: 500 }
    );
  }
}
