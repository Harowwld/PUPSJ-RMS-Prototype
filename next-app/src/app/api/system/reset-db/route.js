import { NextResponse } from "next/server";
import { query, transaction } from "@/lib/postgres";
import { createStaff } from "@/lib/staffRepo";
import { clearHealthCache } from "../health/route";

export const runtime = "nodejs";

export async function GET() {
  try {
    await transaction(async ({ query: txQuery }) => {
      await txQuery(`TRUNCATE TABLE
        transaction_updates, event_proposals, document_requests, documents,
        student_accounts, students, staff, global_audit_logs, backups,
        staff_notification_item_states, staff_notification_state, settings
        RESTART IDENTITY CASCADE`);
    });
    await createStaff({ id: "PUPREGISTRAR-001", officeId: "registrar", fname: "Elias", lname: "Austria", role: "SuperAdmin", section: "Administrative", status: "Active", email: "admin.default@pup.local", password: process.env.DEFAULT_STAFF_PASSWORD || "pupstaff" });
    await createStaff({ id: "PUPREGISTRAR-003", officeId: "registrar", fname: "Elias", lname: "Austria", role: "Admin", section: "Administrative", status: "Active", email: "admin.registrar@pup.local", password: process.env.DEFAULT_STAFF_PASSWORD || "pupstaff" });
    await query("INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", ["last_reset_at", new Date().toISOString()]);
    clearHealthCache();
    return NextResponse.json({ ok: true, message: `PostgreSQL data reset successfully. Default SuperAdmin: admin.default@pup.local / ${process.env.DEFAULT_STAFF_PASSWORD || "pupstaff"}` });
  } catch (error) {
    console.error("[reset-db] Reset failed:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
