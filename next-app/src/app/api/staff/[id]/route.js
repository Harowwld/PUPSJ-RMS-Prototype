import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { archiveStaff, restoreStaff, getStaffById, updateStaff } from "../../../../lib/staffRepo";
import { writeAuditLog } from "../../../../lib/auditLogRequest";
import { getSessionCookieName, verifySessionToken } from "../../../../lib/jwt";
import { requireTOTP, extractTOTPToken } from "../../../../lib/totpMiddleware";

export const runtime = "nodejs";

async function getCurrentUserId() {
  try {
    const cookieName = getSessionCookieName();
    const cookieStore = cookies();
    const store = (cookieStore instanceof Promise) ? await cookieStore : cookieStore;
    const token = store.get(cookieName)?.value || "";
    if (!token) return null;
    const payload = await verifySessionToken(token);
    return payload.sub || null;
  } catch (err) {
    return null;
  }
}

async function getStaffDisplayNameById(id) {
  try {
    const s = await getStaffById(id);
    return s ? `${s.fname} ${s.lname}` : id;
  } catch {
    return id;
  }
}


export async function PATCH(req, ctx) {
  const params = await ctx.params;
  const raw = params.id;
  const id = String(raw || "").trim();
  if (!id) {
    return NextResponse.json(
      { ok: false, error: `Invalid id: ${raw}` },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const name = await getStaffDisplayNameById(id);

  // Handle explicit status toggle (archiving/restoring)
  if (body.status === "Active") {
    const row = await restoreStaff(id);
    if (!row) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    await writeAuditLog(req, `Restore Account`, { 
      details: `restored system access permissions for personnel account '${name}' (ID: ${id})`,
      entity_type: "User",
      entity_id: id
    });
    return NextResponse.json({ ok: true, data: row });
  } else if (body.status === "Inactive") {
    const row = await archiveStaff(id);
    if (!row) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    await writeAuditLog(req, `Archive Account`, { 
      details: `archived personnel profile for '${name}' (ID: ${id}) and suspended all associated credentials`,
      severity: "WARNING",
      entity_type: "User",
      entity_id: id
    });
    return NextResponse.json({ ok: true, data: row });
  }

  const patch = {
    id: body.id === undefined ? undefined : String(body.id).trim(),
    fname: body.fname === undefined ? undefined : String(body.fname).trim(),
    lname: body.lname === undefined ? undefined : String(body.lname).trim(),
    role: body.role === undefined ? undefined : String(body.role).trim(),
    section:
      body.section === undefined ? undefined : String(body.section).trim(),
    email: body.email === undefined ? undefined : String(body.email).trim(),
    lastActive:
      body.lastActive === undefined ? undefined : String(body.lastActive).trim(),
  };

  const needsTOTP = patch.role !== undefined;
  if (needsTOTP) {
    const currentUserId = await getCurrentUserId();
    const totpToken = extractTOTPToken(req.headers);
    const totpResult = await requireTOTP(currentUserId, totpToken);
    if (!totpResult.valid) {
      return NextResponse.json(
        { ok: false, error: "TOTP verification required: " + totpResult.error, requiresTOTP: true },
        { status: 403 }
      );
    }
  }

  try {
    const currentUserId = await getCurrentUserId();
    
    if (currentUserId === id && patch.role !== undefined) {
      const existing = await getStaffById(id);
      if (existing && existing.role !== patch.role) {
        return NextResponse.json(
          { ok: false, error: "You cannot change your own role." },
          { status: 403 }
        );
      }
    }

    const row = await updateStaff(id, patch);
    if (!row) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    await writeAuditLog(req, `Update Account`, { 
      details: `modified profile configuration and registry metadata for personnel '${name}' (ID: ${id})`,
      entity_type: "User",
      entity_id: id
    });

    return NextResponse.json({ ok: true, data: row });
  } catch (e) {
    const msg = String(e?.message || "");
    if (msg.includes("UNIQUE") || msg.includes("PRIMARY")) {
      return NextResponse.json(
        { ok: false, error: "Staff ID already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Failed to update staff" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, ctx) {
  const params = await ctx.params;
  const raw = params.id;
  const id = String(raw || "").trim();
  if (!id) {
    return NextResponse.json(
      { ok: false, error: `Invalid id: ${raw}` },
      { status: 400 }
    );
  }

  const name = await getStaffDisplayNameById(id);
  const currentUserId = await getCurrentUserId();
  const totpToken = extractTOTPToken(req.headers);
  const totpResult = await requireTOTP(currentUserId, totpToken);
  if (!totpResult.valid) {
    return NextResponse.json(
      { ok: false, error: "TOTP verification required: " + totpResult.error, requiresTOTP: true },
      { status: 403 }
    );
  }

  if (currentUserId === id) {
    return NextResponse.json(
      { ok: false, error: "You cannot archive your own account." },
      { status: 403 }
    );
  }

  const row = await archiveStaff(id);
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  await writeAuditLog(req, `Archive Account`, { 
    details: `archived personnel profile for '${name}' (ID: ${id}) via administrative DELETE protocol`,
    severity: "WARNING",
    entity_type: "User",
    entity_id: id
  });

  return NextResponse.json({ ok: true, data: row });
}

export async function GET(_req, ctx) {
  const params = await ctx.params;
  const raw = params.id;
  const id = String(raw || "").trim();
  if (!id) {
    return NextResponse.json(
      { ok: false, error: `Invalid id: ${raw}` },
      { status: 400 }
    );
  }

  const row = await getStaffById(id);
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: row });
}
