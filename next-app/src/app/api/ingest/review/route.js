import { NextResponse } from "next/server";
import { requireStaff, createAuthErrorResponse, getPrincipalOfficeId } from "../../../../lib/authHelpers";
import { query } from "../../../../lib/postgres";
import { canAccessResource } from "@/lib/resourceAuthorization";

export const runtime = "nodejs";

export async function GET(req) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Authentication required");
  const officeId = getPrincipalOfficeId(user);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
  const { searchParams } = new URL(req.url);
  const status = String(searchParams.get("status") || "").trim();
  const docType = String(searchParams.get("docType") || "").trim();
  const batchId = String(searchParams.get("batchId") || "").trim();
  const q = String(searchParams.get("q") || "").trim();
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 200);
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0);
  const values = [officeId];
  const filters = ["office_id = $1"];

  if (status) {
    const rawTokens = status.split(",").map((s) => s.trim()).filter(Boolean);
    if (rawTokens.length > 0) {
      const expanded = [];
      for (const tok of rawTokens) {
        if (tok === "Conflict") {
          expanded.push("Conflict", "Needs Review");
        } else {
          expanded.push(tok);
        }
      }
      const uniqueStatuses = Array.from(new Set(expanded));
      const placeholders = uniqueStatuses.map((_, i) => `$${values.length + 1 + i}`);
      values.push(...uniqueStatuses);
      filters.push(`review_status IN (${placeholders.join(", ")})`);
    }
  }

  if (docType) {
    const types = docType.split(",").map((t) => t.trim()).filter(Boolean);
    if (types.length > 0) {
      const placeholders = types.map((_, i) => `$${values.length + 1 + i}`);
      values.push(...types);
      filters.push(`proposed_doc_type IN (${placeholders.join(", ")})`);
    }
  }

  if (batchId) { values.push(batchId); filters.push(`batch_id = $${values.length}`); }
  if (q) { values.push(`%${q}%`); filters.push(`(original_filename ILIKE $${values.length} OR COALESCE(ocr_name, '') ILIKE $${values.length} OR COALESCE(ocr_text, '') ILIKE $${values.length})`); }
  const where = filters.join(" AND ");
  const rows = await query(`SELECT * FROM ingest_queue WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, limit, offset]);
  const count = await query(`SELECT COUNT(*)::int AS count FROM ingest_queue WHERE ${where}`, values);
  return NextResponse.json({ ok: true, data: { rows: rows.filter((row) => canAccessResource(user, "ingest", row)), total: Number(count[0]?.count || 0), limit, offset } });
}
