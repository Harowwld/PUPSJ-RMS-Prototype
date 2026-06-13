import { dbAll, dbGet } from "./sqlite.js";
import { listDocTypes } from "./docTypesRepo.js";

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
    filters.push("s.course_code = ?");
    params.push(cc);
  }

  const st = String(studentStatus || "").trim();
  if (st && st.toLowerCase() !== "all") {
    if (st === "Active") {
      filters.push("s.status = 'Active'");
    } else if (st === "Archived") {
      // Treat 'Archived' as a category for all non-active records
      filters.push("s.status != 'Active'");
    } else {
      filters.push("s.status = ?");
      params.push(st);
    }
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
} = {}) {
  // 1. Get all doc types currently configured in the system
  const allDocTypes = await listDocTypes();
  const expectedCountPerStudent = allDocTypes.length;

  const docQualifies = buildDocQualifiesSql(Boolean(requireApproved));
  const { where, params } = buildStudentWhere({ studentStatus, courseCode });

  // 2. Fetch course aggregation stats
  const courseRows = await dbAll(
    `
    SELECT
      s.course_code,
      COUNT(s.student_no) AS total_students,
      SUM(CASE WHEN COALESCE(d_counts.actual_count, 0) >= ? THEN 1 ELSE 0 END) AS fully_digitized_count,
      SUM(COALESCE(d_counts.actual_count, 0)) AS total_digitized_docs
    FROM students s
    LEFT JOIN (
      SELECT student_no, COUNT(DISTINCT doc_type) AS actual_count
      FROM documents d
      WHERE ${docQualifies}
        AND d.doc_type IN (${allDocTypes.length ? allDocTypes.map(() => "?").join(",") : "NULL"})
      GROUP BY student_no
    ) d_counts ON s.student_no = d_counts.student_no
    ${where}
    GROUP BY s.course_code
    `,
    [expectedCountPerStudent, ...(allDocTypes.length ? allDocTypes : []), ...params]
  );

  // 3. Fetch year aggregation stats
  const yearRows = await dbAll(
    `
    SELECT
      s.year_level,
      COUNT(s.student_no) AS count
    FROM students s
    ${where}
    GROUP BY s.year_level
    `,
    params
  );

  let totalStudents = 0;
  let fullyDigitizedCount = 0;
  let totalDigitizedDocsCount = 0;

  const byCourse = courseRows.map((row) => {
    const total = Number(row.total_students) || 0;
    const digitized = Number(row.fully_digitized_count) || 0;
    const digitizedDocs = Number(row.total_digitized_docs) || 0;

    totalStudents += total;
    fullyDigitizedCount += digitized;
    totalDigitizedDocsCount += digitizedDocs;

    const courseCompleteness = expectedCountPerStudent > 0 ? (digitizedDocs / expectedCountPerStudent) : total;

    return {
      courseCode: String(row.course_code || "").trim(),
      total,
      digitized,
      percent: total > 0 ? roundPercent(courseCompleteness / total) : null,
      fullyDigitizedRate: total > 0 ? roundPercent(digitized / total) : null
    };
  }).sort((a, b) => a.courseCode.localeCompare(b.courseCode));

  const totalCompletenessRatio = expectedCountPerStudent > 0 ? (totalDigitizedDocsCount / expectedCountPerStudent) : totalStudents;
  const avgCompleteness = totalStudents > 0 ? roundPercent(totalCompletenessRatio / totalStudents) : null;
  const fullyDigitizedRate = totalStudents > 0 ? roundPercent(fullyDigitizedCount / totalStudents) : null;
  const totalExpectedDocsCount = totalStudents * expectedCountPerStudent;

  const byYear = yearRows.map((row) => ({
    year: Number(row.year_level) || 0,
    count: Number(row.count) || 0
  })).filter((x) => x.year > 0)
    .sort((a, b) => b.year - a.year);

  const generatedAt = new Date().toISOString();

  return {
    summary: {
      totalStudents,
      digitizedStudents: fullyDigitizedCount,
      notDigitizedStudents: Math.max(0, totalStudents - fullyDigitizedCount),
      percentDigitized: avgCompleteness,
      fullyDigitizedRate,
      totalDigitizedDocsCount,
      totalExpectedDocsCount,
    },
    byCourse,
    byYear,
    meta: {
      studentStatus: String(studentStatus || "").trim() || "Active",
      courseCode: String(courseCode || "").trim() || null,
      requireApproved: Boolean(requireApproved),
      definitions: {
        population: "students table rows matching status and optional course filter",
        digitizedStudent: "Student who has uploaded all configured document types.",
        expectedCountFormula: `Requirement: All ${expectedCountPerStudent} document types defined in system settings.`,
        completenessMetric: "Average ratio of (Unique Uploaded Types / Total System Types) across all students.",
        configuredDocTypes: allDocTypes
      },
      generatedAt,
    },
  };
}
