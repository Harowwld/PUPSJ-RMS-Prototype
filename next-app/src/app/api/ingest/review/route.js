import { NextResponse } from "next/server";
import { requireStaff, createAuthErrorResponse } from "../../../../lib/authHelpers";
import { query } from "../../../../lib/postgres";

export const runtime = "nodejs";

export async function GET(req) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Authentication required");
  const { searchParams } = new URL(req.url);
  const status = String(searchParams.get("status") || "").trim();
  const batchId = String(searchParams.get("batchId") || "").trim();
  const q = String(searchParams.get("q") || "").trim();
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 200);
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0);
  const values = [user.office_id || "registrar"];
  const filters = ["office_id = $1"];
  if (status) {
    if (status === "Conflict") {
      filters.push("review_status IN ('Conflict', 'Needs Review')");
    } else {
      values.push(status);
      filters.push(`review_status = $${values.length}`);
    }
  }
  if (batchId) { values.push(batchId); filters.push(`batch_id = $${values.length}`); }
  if (q) { values.push(`%${q}%`); filters.push(`(original_filename ILIKE $${values.length} OR COALESCE(ocr_name, '') ILIKE $${values.length} OR COALESCE(ocr_text, '') ILIKE $${values.length})`); }
  const where = filters.join(" AND ");
  const rows = await query(`SELECT * FROM ingest_queue WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, limit, offset]);
  const count = await query(`SELECT COUNT(*)::int AS count FROM ingest_queue WHERE ${where}`, values);
  return NextResponse.json({ ok: true, data: { rows, total: Number(count[0]?.count || 0), limit, offset } });
}
