import { NextResponse } from "next/server";
import { requireAdmin, requireStaff, createAuthErrorResponse } from "../../../lib/authHelpers";
import { writeAuditLog } from "../../../lib/auditLogRequest";
import {
  listStudentLocationUsage,
  reassignStudentsByLocationMappings,
} from "../../../lib/studentsRepo";
import { getStorageLayout, setStorageLayout } from "../../../lib/storageLayoutRepo";
import { canonicalizeCabinetId } from "../../../lib/storageLayoutUtils";

export const runtime = "nodejs";


function normalizeCabinetId(cabId) {
  return canonicalizeCabinetId(cabId);
}

function buildLayoutLocationSet(layout) {
  const set = new Set();
  for (const room of layout?.rooms || []) {
    const roomId = Number(room?.id);
    if (!Number.isFinite(roomId)) continue;
    for (const cab of room?.cabinets || []) {
      const cabId = normalizeCabinetId(cab?.id);
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

export async function GET(req) {
  const { user, error } = await requireStaff(req);
  if (error || !user) {
    return createAuthErrorResponse(error || "Authentication required", 401);
  }

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
  const { user, error } = await requireAdmin(req);
  if (error || !user) {
    return createAuthErrorResponse(error || "Admin access required", 403);
  }

  try {

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
        const cabId = normalizeCabinetId(u.cabinet);
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
        if (!proposedSet.has(`${to.room}|${normalizeCabinetId(to.cabinet)}|${to.drawer}`)) {
          return NextResponse.json(
            { ok: false, error: "Reassignment target is not part of the proposed layout" },
            { status: 400 }
          );
        }
        normalized.push({
          from: { ...from, cabinet: normalizeCabinetId(from.cabinet) },
          to: { ...to, cabinet: normalizeCabinetId(to.cabinet) }
        });
      }
      const moved = await reassignStudentsByLocationMappings(normalized);
      movedCount = Number(moved?.moved || 0);
      movedBreakdown = Array.isArray(moved?.breakdown) ? moved.breakdown : [];
    }

    const saved = await setStorageLayout(incomingLayout);
    const roomCount = Array.isArray(incomingLayout?.rooms) ? incomingLayout.rooms.length : 0;
    const cabinetCount = (incomingLayout?.rooms || []).reduce((sum, r) => sum + (r.cabinets?.length || 0), 0);

    await writeAuditLog(req, `Update Storage Layout`, {
      details: reassignments.length > 0
        ? `saved physical archive layout (v${saved?.version || 1}, ${roomCount} room(s), ${cabinetCount} cabinet(s)) with drawer reassignment — ${movedCount} student record(s) migrated to new locations`
        : `saved physical archive layout (v${saved?.version || 1}, ${roomCount} room(s), ${cabinetCount} cabinet(s))`,
      entity_type: "StorageLayout",
      entity_id: saved?.version || 1,
      severity: movedCount > 0 ? "WARNING" : "INFO"
    });

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

