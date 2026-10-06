import { NextResponse } from "next/server";
import { listOffices, createOffice, listOfficesWithStats } from "@/lib/officesRepo";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";
import { requireSystemAdmin, createAuthErrorResponse } from "@/lib/authHelpers";
import { sendAccountCredentialsNotice } from "@/lib/accountEmail";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requireSystemAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "System administrator access required", access.error?.startsWith("Access denied") ? 403 : 401);

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const q = searchParams.get("q") || undefined;
    const stats = searchParams.get("stats") === "true";

    const offices = stats ? await listOfficesWithStats() : await listOffices({ status, q });
    return NextResponse.json({ ok: true, data: offices });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req) {
  const access = await requireSystemAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "System administrator access required", access.error?.startsWith("Access denied") ? 403 : 401);

  try {
    const body = await req.json();
    const office = await createOffice(body);
    let credentialEmail = null;

    if (office && office.id) {
      const admin = office._admin;
      if (admin?.created) {
        credentialEmail = await sendAccountCredentialsNotice({
          to: admin.email,
          fullName: `${office.short_name || office.id} Administrator`,
          accountType: `${office.name} administrator account`,
          accountId: admin.id,
          username: admin.email,
          password: admin.defaultPassword,
        });
      }

      await writeGlobalAuditLog(req, "Create Administrative Office", {
        officeId: office.id,
        entity_type: "Office",
        entity_id: office.id,
        details: `Created office '${office.short_name}' (${office.id}) with full name '${office.name}'.`
      });
    }

    return NextResponse.json({ ok: true, data: office, credentialEmail }, { status: 201 });
  } catch (err) {
    if (err?.code === "OFFICE_REQUIRED_FIELDS" || err?.code === "OFFICE_INVALID_ID" || err?.code === "OFFICE_ADMIN_EMAIL_INVALID") {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
    }
    if (err?.code === "OFFICE_DUPLICATE_ID" || err?.code === "23505") {
      return NextResponse.json({ ok: false, error: err.code === "OFFICE_DUPLICATE_ID" ? err.message : "That office ID or default administrator already exists. Choose a different office ID." }, { status: 409 });
    }
    if (err?.code === "OFFICE_ADMIN_CONFLICT") {
      return NextResponse.json({ ok: false, error: err.message }, { status: 409 });
    }
    console.error("Office creation failed:", err);
    return NextResponse.json({ ok: false, error: "Could not create the office. Check the server log for the underlying error and try again." }, { status: 500 });
  }
}
