import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getSessionCookieName, verifySessionToken } from "../../../lib/jwt";
import { getStaffById } from "../../../lib/staffRepo";
import { writeAuditLog } from "../../../lib/auditLogRequest";
import {
  listStudentLocationUsage,
  reassignStudentsByLocationMappings,
} from "../../../lib/studentsRepo";

import { getStorageLayout, setStorageLayout } from "../../../lib/storageLayoutRepo";

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

function buildLayoutLocationSet(layout) {
  const set = new Set();
  for (const room of layout?.rooms || []) {
    const roomId = Number(room?.id);
    if (!Number.isFinite(roomId)) continue;
    for (const cab of room?.cabinets || []) {
      const cabId = String(cab?.id || "").trim();
      if (!cabId) continue;
      for (const drawerIdRaw of cab?.drawerIds || []) {
        const drawerId = Number(drawerIdRaw);
        if (!Number.isFinite(drawerId)) continue;
        set.add(`${roomId}|${cabId}|${drawerId}`);
      }
    }
  }
  return set;
}

function parseLocationKey(key) {
  const [roomRaw, cabinetRaw, drawerRaw] = String(key || "").split("|");
  const room = Number(roomRaw);
  const cabinet = String(cabinetRaw || "").trim();
  const drawer = Number(drawerRaw);
  if (!Number.isFinite(room) || !cabinet || !Number.isFinite(drawer)) return null;
  return { room, cabinet, drawer };
}

export async function GET(_req) {
  try {
    const layout = await getStorageLayout();
    return NextResponse.json({ ok: true, data: layout });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load storage layout" },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    const staff = await getSessionStaff();
    if (!staff || !isAdminRole(staff.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }
    const incomingLayout = Array.isArray(body?.rooms) ? body : body?.layout;
    if (!incomingLayout || typeof incomingLayout !== "object") {
      return NextResponse.json({ ok: false, error: "Missing layout payload" }, { status: 400 });
    }
    const reassignments = Array.isArray(body?.reassignments) ? body.reassignments : [];
    const skipUsageCheck = body?.skipUsageCheck === true;

    // Prevent deleting locations that are still referenced by student records.
    const proposedSet = buildLayoutLocationSet(incomingLayout);
    if (!skipUsageCheck) {
      const usage = await listStudentLocationUsage();
      const orphaned = usage.filter((u) => {
        const roomId = Number(u.room);
        const cabId = String(u.cabinet || "").trim();
        const drawerId = Number(u.drawer);
        return !proposedSet.has(`${roomId}|${cabId}|${drawerId}`);
      });
      if (orphaned.length > 0) {
        const preview = orphaned
          .slice(0, 4)
          .map((o) => `Room ${o.room} / Cabinet ${o.cabinet} / Drawer ${o.drawer}`)
          .join("; ");
        return NextResponse.json(
          {
            ok: false,
            error:
              `Cannot remove layout locations with existing student records. ` +
              `Reassign records first. Affected: ${preview}${orphaned.length > 4 ? "..." : ""}`,
          },
          { status: 400 }
        );
      }
    }

    let movedCount = 0;
    let movedBreakdown = [];
    if (reassignments.length > 0) {
      const normalized = [];
      for (const item of reassignments) {
        const from = parseLocationKey(item?.fromKey);
        const to = parseLocationKey(item?.toKey);
        if (!from || !to) {
          return NextResponse.json(
            { ok: false, error: "Invalid reassignment location key" },
            { status: 400 }
          );
        }
        if (!proposedSet.has(`${to.room}|${to.cabinet}|${to.drawer}`)) {
          return NextResponse.json(
            { ok: false, error: "Reassignment target is not part of the proposed layout" },
            { status: 400 }
          );
        }
        normalized.push({ from, to });
      }
      const moved = await reassignStudentsByLocationMappings(normalized);
      movedCount = Number(moved?.moved || 0);
      movedBreakdown = Array.isArray(moved?.breakdown) ? moved.breakdown : [];
    }

    const saved = await setStorageLayout(incomingLayout);
    await writeAuditLog(
      req,
      reassignments.length > 0
        ? `Updated storage layout (v${saved?.version || 1}) with drawer reassignment (${movedCount} records moved)`
        : `Updated storage layout (v${saved?.version || 1})`
    );

    return NextResponse.json({
      ok: true,
      data: saved,
      movedCount,
      movedBreakdown,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to update storage layout" },
      { status: 400 }
    );
  }
}

