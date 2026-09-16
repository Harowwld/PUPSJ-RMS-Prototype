import { NextResponse } from "next/server";
import { getPrincipalOfficeId, requireStaff, createAuthErrorResponse } from "../../../../lib/authHelpers";
import { isSystemAdminRole } from "../../../../lib/roleUtils";
import { query } from "../../../../lib/postgres";
import { canAccessResource } from "@/lib/resourceAuthorization";

export const runtime = "nodejs";

export async function POST(req) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Authentication required", 401);
  const body = await req.json().catch(() => null);
  const extractedName = String(body?.extractedName || "").trim();
  const strict = new URL(req.url).searchParams.get("strict") === "1";
  if (!extractedName) return NextResponse.json({ ok: true, data: [] });
  const officeId = isSystemAdminRole(user.role) ? null : getPrincipalOfficeId(user);
  if (!isSystemAdminRole(user.role) && !officeId) return createAuthErrorResponse("Office scope is required", 403);
  const officeClause = officeId
    ? "AND EXISTS (SELECT 1 FROM student_office_memberships som WHERE som.student_no = s.student_no AND som.office_id = $5 AND som.status = 'Active')"
    : "";

  const parts = extractedName.split(",");
  const surname = String(parts[0] || "").trim();
  const given = String(parts.slice(1).join(" ") || "").trim();
  const rows = await query(
    `WITH input AS (
       SELECT trim(regexp_replace(lower($1), '[^a-z0-9]+', ' ', 'g')) AS full_name,
              trim(regexp_replace(lower($2), '[^a-z0-9]+', ' ', 'g')) AS surname,
              trim(regexp_replace(lower($3), '[^a-z0-9]+', ' ', 'g')) AS given_name
     ), candidates AS (
       SELECT s.student_no AS "studentNo", s.name, s.course_code AS "courseCode",
              s.year_level AS "yearLevel", s.section,
              trim(regexp_replace(lower(s.name), '[^a-z0-9]+', ' ', 'g')) AS db_name
       FROM students s WHERE s.status = 'Active' ${officeClause}
     )
     SELECT "studentNo", name, "courseCode", "yearLevel", section,
       round((CASE
         WHEN db_name = input.full_name THEN 1.0
         WHEN db_name LIKE input.surname || ' %' AND db_name LIKE '%' || input.given_name || '%' THEN 0.92
         ELSE similarity(db_name, input.full_name)
       END)::numeric, 4) AS score,
       CASE
         WHEN db_name = input.full_name THEN 'Exact normalized name'
         WHEN db_name LIKE input.surname || ' %' AND db_name LIKE '%' || input.given_name || '%' THEN 'Surname and given-name match'
         ELSE 'Trigram similarity'
       END AS reason
     FROM candidates, input
     WHERE db_name = input.full_name
        OR (db_name LIKE input.surname || ' %' AND db_name LIKE '%' || input.given_name || '%')
        OR ($4 = false AND similarity(db_name, input.full_name) >= 0.45)
     ORDER BY score DESC, name ASC LIMIT 20`,
    officeId
      ? [extractedName.toLowerCase(), surname.toLowerCase(), given.toLowerCase(), strict, officeId]
      : [extractedName.toLowerCase(), surname.toLowerCase(), given.toLowerCase(), strict]
  );
  const authorizedRows = isSystemAdminRole(user.role)
    ? rows
    : rows.filter((row) => canAccessResource(user, "student", { ...row, office_id: officeId }));
  return NextResponse.json({ ok: true, data: authorizedRows });
}
