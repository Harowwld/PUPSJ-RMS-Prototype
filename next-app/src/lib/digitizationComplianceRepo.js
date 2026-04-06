import { dbAll, dbGet } from "./sqlite.js";
import { listDocuments } from "./documentsRepo.js";

/**
 * Digitization compliance analytics (single source of truth for KPIs).
 *
 * Population: rows in `students`, optionally filtered by status and course_code.
 *
 * Student is "digitized" when they have ≥1 row in `documents` that qualifies:
 * - Default (requireApproved=false): approval_status is NULL or not 'Declined'
 *   (aligned with staff `excludeDeclined` / staffDocs filter).
 * - Strict (requireApproved=true): approval_status = 'Approved' only.
 *
 * Compliance: (digitizedStudents / totalStudents) >= threshold when totalStudents > 0;
 * when totalStudents === 0, isCompliant is true and percentDigitized is null.
 */

function buildDocQualifiesSql(requireApproved) {
  if (requireApproved) {
    return "d.approval_status = 'Approved'";
  }
  return "(d.approval_status IS NULL OR d.approval_status != 'Declined')";
}

function buildStudentWhere({ studentStatus, courseCode }) {
  const filters = [];
  const params = [];

  const cc = String(courseCode || "").trim().toUpperCase();
  if (cc) {
    filters.push("upper(trim(s.course_code)) = ?");
    params.push(cc);
  }

  const st = String(studentStatus || "").trim();
  if (st && st.toLowerCase() !== "all") {
    filters.push("s.status = ?");
    params.push(st);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  return { where, params };
}

function roundPercent(ratio) {
  if (!Number.isFinite(ratio)) return null;
  return Math.round(ratio * 10000) / 100;
}

export async function getDigitizationComplianceSummary({
  studentStatus = "Active",
  courseCode,
  requireApproved = false,
  threshold = 0.95,
} = {}) {
  await listDocuments({ limit: 1 });

  const docQualifies = buildDocQualifiesSql(Boolean(requireApproved));
  const { where, params } = buildStudentWhere({ studentStatus, courseCode });

  const thr = Number(threshold);
  const safeThreshold =
    Number.isFinite(thr) && thr >= 0 && thr <= 1 ? thr : 0.95;

  const summaryRow = await dbGet(
    `
    SELECT
      COUNT(*) AS total,
      SUM(
        CASE WHEN EXISTS (
          SELECT 1 FROM documents d
          WHERE d.student_no = s.student_no
            AND ${docQualifies}
        ) THEN 1 ELSE 0 END
      ) AS digitized
    FROM students s
    ${where}
    `,
    params
  );

  const totalStudents = Number(summaryRow?.total || 0) || 0;
  const digitizedStudents = Number(summaryRow?.digitized || 0) || 0;
  const notDigitizedStudents = Math.max(0, totalStudents - digitizedStudents);

  let percentDigitized = null;
  let isCompliant = true;
  if (totalStudents > 0) {
    const ratio = digitizedStudents / totalStudents;
    percentDigitized = roundPercent(ratio);
    isCompliant = ratio >= safeThreshold;
  }

  let byCourse = [];
  if (!String(courseCode || "").trim()) {
    byCourse = await dbAll(
      `
      SELECT
        s.course_code AS course_code,
        COUNT(*) AS total,
        SUM(
          CASE WHEN EXISTS (
            SELECT 1 FROM documents d
            WHERE d.student_no = s.student_no
              AND ${docQualifies}
          ) THEN 1 ELSE 0 END
        ) AS digitized
      FROM students s
      ${where}
      GROUP BY s.course_code
      ORDER BY s.course_code ASC
      `,
      params
    );
  }

  const byCourseNorm = (byCourse || []).map((row) => {
    const t = Number(row?.total || 0) || 0;
    const d = Number(row?.digitized || 0) || 0;
    const pct = t > 0 ? roundPercent(d / t) : null;
    return {
      courseCode: String(row?.course_code || "").trim(),
      total: t,
      digitized: d,
      percent: pct,
    };
  });

  const generatedAt = new Date().toISOString();

  return {
    summary: {
      totalStudents,
      digitizedStudents,
      notDigitizedStudents,
      percentDigitized,
      isCompliant,
      threshold: safeThreshold,
    },
    byCourse: byCourseNorm,
    meta: {
      studentStatus: String(studentStatus || "").trim() || "Active",
      courseCode: String(courseCode || "").trim() || null,
      requireApproved: Boolean(requireApproved),
      definitions: {
        population:
          "students table rows matching status (default Active) and optional course filter",
        digitizedStudent:
          requireApproved
            ? "≥1 document with approval_status Approved"
            : "≥1 document where approval_status is not Declined",
      },
      generatedAt,
    },
  };
}
