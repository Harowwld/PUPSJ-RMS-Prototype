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

  // 2. Fetch students and their unique document counts using an optimized JOIN
  // This avoids the O(N*M) correlated subquery bottleneck by grouping documents first.
  const students = await dbAll(
    `
    SELECT
      s.student_no,
      s.course_code,
      s.year_level,
      COALESCE(d_counts.actual_count, 0) AS actual_count
    FROM students s
    LEFT JOIN (
      SELECT student_no, COUNT(DISTINCT doc_type) AS actual_count
      FROM documents d
      WHERE ${docQualifies}
        AND d.doc_type IN (${allDocTypes.length ? allDocTypes.map(() => "?").join(",") : "NULL"})
      GROUP BY student_no
    ) d_counts ON s.student_no = d_counts.student_no
    ${where}
    `,
    [...(allDocTypes.length ? allDocTypes : []), ...params]
  );

  let totalStudents = students.length;
  let fullyDigitizedCount = 0;
  let totalCompletenessRatio = 0;
  let totalDigitizedDocsCount = 0;
  let totalExpectedDocsCount = totalStudents * expectedCountPerStudent;

  const courseStats = {};
  const yearStats = {};

  students.forEach((s) => {
    const actual = Number(s.actual_count) || 0;
    
    // 100% completion is the goal
    const completeness = expectedCountPerStudent > 0 ? Math.min(1.0, actual / expectedCountPerStudent) : 1.0;
    const isFullyDigitized = completeness >= 1.0;

    if (isFullyDigitized) fullyDigitizedCount++;
    totalCompletenessRatio += completeness;
    totalDigitizedDocsCount += actual;

    const cc = String(s.course_code || "").trim();
    if (!courseStats[cc]) {
      courseStats[cc] = { total: 0, fullyDigitized: 0, completeness: 0, digitizedDocs: 0 };
    }
    courseStats[cc].total++;
    if (isFullyDigitized) courseStats[cc].fullyDigitized++;
    courseStats[cc].completeness += completeness;
    courseStats[cc].digitizedDocs += actual;

    const yr = Number(s.year_level) || 0;
    if (yr) {
      if (!yearStats[yr]) yearStats[yr] = 0;
      yearStats[yr]++;
    }
  });

  const avgCompleteness = totalStudents > 0 ? roundPercent(totalCompletenessRatio / totalStudents) : null;
  const fullyDigitizedRate = totalStudents > 0 ? roundPercent(fullyDigitizedCount / totalStudents) : null;

  const byCourse = Object.entries(courseStats).map(([code, stats]) => ({
    courseCode: code,
    total: stats.total,
    digitized: stats.fullyDigitized, // Number of 100% complete students
    percent: roundPercent(stats.completeness / stats.total),
    fullyDigitizedRate: roundPercent(stats.fullyDigitized / stats.total)
  })).sort((a, b) => a.courseCode.localeCompare(b.courseCode));

  const byYear = Object.entries(yearStats).map(([year, count]) => ({
    year: Number(year),
    count
  })).sort((a, b) => b.year - a.year);

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
