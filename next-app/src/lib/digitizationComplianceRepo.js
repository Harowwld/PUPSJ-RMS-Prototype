import { dbAll, dbGet } from "./postgresCompat.js";
import { query, queryOne } from "./postgres.js";
import { decryptStudentRow } from "./studentAuth.js";

function buildDocQualifiesSql(requireApproved) {
  if (requireApproved) {
    return "d.approval_status = 'Approved'";
  }
  return "(d.approval_status IS NULL OR d.approval_status != 'Declined')";
}

function buildStudentWhere({ studentStatus, courseCode, courseCodes, officeId }) {
  const filters = [];
  const params = [];

  if (officeId) {
    filters.push(`EXISTS (
      SELECT 1
      FROM student_office_memberships som
      WHERE som.student_no = s.student_no
        AND som.office_id = ?
        AND som.status = 'Active'
    )`);
    params.push(officeId);
  }

  // Support multiple courses via courseCodes (array or comma-separated) or courseCode
  const rawList = Array.isArray(courseCodes)
    ? courseCodes
    : typeof courseCodes === "string"
    ? courseCodes.split(",")
    : typeof courseCode === "string"
    ? courseCode.split(",")
    : [];

  const cleanedCourses = rawList
    .map((c) => String(c || "").trim().toUpperCase())
    .filter(Boolean);

  if (cleanedCourses.length === 1) {
    filters.push("s.course_code = ?");
    params.push(cleanedCourses[0]);
  } else if (cleanedCourses.length > 1) {
    filters.push(`s.course_code IN (${cleanedCourses.map(() => "?").join(", ")})`);
    params.push(...cleanedCourses);
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
  return { where, params, selectedCourses: cleanedCourses };
}

function roundPercent(ratio) {
  if (!Number.isFinite(ratio)) return null;
  return Math.round(ratio * 100);
}

export async function getDigitizationComplianceSummary({
  studentStatus = "Active",
  courseCode,
  courseCodes,
  requireApproved = false,
  officeId,
} = {}) {
  const normalizedOfficeId = String(officeId || "").trim().toLowerCase() || null;
  // 1. Get all doc types currently configured in the system
  // Read lookup data from PostgreSQL directly; document_types is part of the
  // migrated schema and the legacy docTypesRepo still targets SQLite.
  const typeRows = await query(
    `SELECT id, name FROM document_types
      WHERE status = 'Active' AND is_compliance = TRUE${normalizedOfficeId ? " AND office_id = $1" : ""}
      ORDER BY LOWER(name) ASC`,
    normalizedOfficeId ? [normalizedOfficeId] : [],
  );
  const allDocTypes = typeRows.map((row) => String(row?.name || ""));
  const expectedCountPerStudent = allDocTypes.length;

  const docQualifies = buildDocQualifiesSql(Boolean(requireApproved));
  const { where, params, selectedCourses } = buildStudentWhere({
    studentStatus,
    courseCode,
    courseCodes,
    officeId: normalizedOfficeId,
  });
  const documentOfficeFilter = normalizedOfficeId ? "AND d.office_id = ?" : "";

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
        ${documentOfficeFilter}
        AND d.doc_type IN (${allDocTypes.length ? allDocTypes.map(() => "?").join(",") : "NULL"})
      GROUP BY student_no
    ) d_counts ON s.student_no = d_counts.student_no
    ${where}
    GROUP BY s.course_code
    `,
    [
      expectedCountPerStudent,
      ...(normalizedOfficeId ? [normalizedOfficeId] : []),
      ...(allDocTypes.length ? allDocTypes : []),
      ...params,
    ]
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

  const missingByDocumentTypeRows = await dbAll(
    `
    SELECT
      dt.id AS document_type_id,
      dt.name AS document_type,
      COUNT(DISTINCT s.student_no) AS total_students,
      COUNT(DISTINCT CASE WHEN d.student_no IS NOT NULL THEN s.student_no END) AS digitized_students,
      COUNT(DISTINCT CASE WHEN d.student_no IS NULL THEN s.student_no END) AS missing_students
    FROM document_types dt
    CROSS JOIN students s
    LEFT JOIN documents d
      ON d.student_no = s.student_no
      AND d.doc_type = dt.name
      AND ${docQualifies}
      ${documentOfficeFilter}
    WHERE dt.status = 'Active'
      AND dt.is_compliance = TRUE
      ${normalizedOfficeId ? "AND dt.office_id = ?" : ""}
      ${where ? `AND ${where.slice(6)}` : ""}
    GROUP BY dt.id, dt.name
    ORDER BY LOWER(dt.name) ASC
    `,
    [
      ...(normalizedOfficeId ? [normalizedOfficeId] : []),
      ...(normalizedOfficeId ? [normalizedOfficeId] : []),
      ...params,
    ]
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
  const avgCompleteness = totalStudents > 0 ? roundPercent(totalCompletenessRatio / totalStudents) : 0;
  const fullyDigitizedRate = totalStudents > 0 ? roundPercent(fullyDigitizedCount / totalStudents) : 0;
  const totalExpectedDocsCount = totalStudents * expectedCountPerStudent;
  const missingByDocumentType = totalStudents === 0
    ? typeRows.map((row) => ({
        documentTypeId: Number(row.id),
        documentType: String(row.name || ""),
        totalStudents: 0,
        digitizedStudents: 0,
        missingStudents: 0,
      }))
    : missingByDocumentTypeRows.map((row) => ({
        documentTypeId: Number(row.document_type_id),
        documentType: String(row.document_type || ""),
        totalStudents: Number(row.total_students) || 0,
        digitizedStudents: Number(row.digitized_students) || 0,
        missingStudents: Number(row.missing_students) || 0,
      }));

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
      fullyDigitizedStudents: fullyDigitizedCount,
      notDigitizedStudents: Math.max(0, totalStudents - fullyDigitizedCount),
      percentDigitized: avgCompleteness ?? 0,
      fullyDigitizedRate: fullyDigitizedRate ?? 0,
      totalDigitizedDocsCount,
      totalExpectedDocsCount,
    },
    byCourse,
    byYear,
    missingByDocumentType,
    meta: {
      studentStatus: String(studentStatus || "").trim() || "Active",
      courseCode: selectedCourses.length === 1 ? selectedCourses[0] : (selectedCourses.length > 1 ? selectedCourses.join(", ") : null),
      courseCodes: selectedCourses,
      requireApproved: Boolean(requireApproved),
      definitions: {
        population: normalizedOfficeId
          ? "students table rows with an active student-office membership matching status and optional course filter"
          : "students table rows matching status and optional course filter",
        digitizedStudent: "Student who has uploaded all configured document types.",
        expectedCountFormula: `Requirement: All ${expectedCountPerStudent} document types defined in system settings.`,
        completenessMetric: "Average ratio of (Unique Uploaded Types / Total System Types) across all students.",
        configuredDocTypes: allDocTypes
      },
      generatedAt,
    },
  };
}

export async function getMissingStudentsForDocumentType({
  documentTypeId,
  studentStatus = "Active",
  courseCodes,
  requireApproved = false,
  officeId,
  limit = 20,
  offset = 0,
} = {}) {
  const normalizedOfficeId = String(officeId || "").trim().toLowerCase() || null;
  const parsedTypeId = Number.parseInt(documentTypeId, 10);
  if (!Number.isInteger(parsedTypeId) || parsedTypeId < 1) return null;

  const typeRow = await queryOne(
    `SELECT id, name FROM document_types
      WHERE id = $1 AND status = 'Active' AND is_compliance = TRUE${normalizedOfficeId ? " AND office_id = $2" : ""}`,
    normalizedOfficeId ? [parsedTypeId, normalizedOfficeId] : [parsedTypeId],
  );
  if (!typeRow) return null;

  const { where, params } = buildStudentWhere({
    studentStatus,
    courseCodes,
    officeId: normalizedOfficeId,
  });
  const docQualifies = buildDocQualifiesSql(Boolean(requireApproved));
  const documentOfficeFilter = normalizedOfficeId ? "AND d.office_id = ?" : "";
  const missingClause = `NOT EXISTS (
    SELECT 1 FROM documents d
    WHERE d.student_no = s.student_no
      AND d.doc_type = ?
      AND ${docQualifies}
      ${documentOfficeFilter}
  )`;
  const missingParams = [
    ...params,
    String(typeRow.name || ""),
    ...(normalizedOfficeId ? [normalizedOfficeId] : []),
  ];
  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100);
  const safeOffset = Math.max(Number.parseInt(offset, 10) || 0, 0);
  const filterSql = where ? `${where} AND ${missingClause}` : `WHERE ${missingClause}`;

  const countRow = await dbGet(
    `SELECT COUNT(s.student_no) AS total
      FROM students s
      ${filterSql}`,
    missingParams,
  );
  const rows = await dbAll(
    `SELECT s.student_no, s.name, s.course_code
      FROM students s
      ${filterSql}
      ORDER BY s.student_no ASC
      LIMIT ? OFFSET ?`,
    [...missingParams, safeLimit, safeOffset],
  );

  return {
    documentTypeId: parsedTypeId,
    documentType: String(typeRow.name || ""),
    total: Number(countRow?.total) || 0,
    students: rows.map((row) => decryptStudentRow(row)),
    limit: safeLimit,
    offset: safeOffset,
  };
}
