import { dbAll, dbGet } from "./sqlite.js";
import { getStudentByStudentNo } from "./studentsRepo.js";
import { listDocuments } from "./documentsRepo.js";
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

  const incompleteRows = expectedCountPerStudent > 0
    ? await dbAll(
      `
      SELECT
        s.student_no,
        s.name AS student_name,
        s.course_code,
        s.year_level,
        s.section,
        s.room,
        s.cabinet,
        s.drawer,
        COALESCE(d_counts.actual_count, 0) AS actual_count
      FROM students s
      LEFT JOIN (
        SELECT student_no, COUNT(DISTINCT doc_type) AS actual_count
        FROM documents d
        WHERE ${docQualifies}
          AND d.doc_type IN (${allDocTypes.length ? allDocTypes.map(() => "?").join(",") : "NULL"})
        GROUP BY student_no
      ) d_counts ON s.student_no = d_counts.student_no
      ${where ? `${where} AND` : "WHERE"} COALESCE(d_counts.actual_count, 0) < ?
      ORDER BY s.course_code ASC, s.year_level DESC, s.student_no ASC
      `,
      [...(allDocTypes.length ? allDocTypes : []), ...params, expectedCountPerStudent]
    )
    : [];

  const incompleteDocRows = incompleteRows.length
    ? await dbAll(
      `
      SELECT
        s.student_no,
        d.doc_type
      FROM students s
      LEFT JOIN documents d ON d.student_no = s.student_no
        AND ${docQualifies}
        AND d.doc_type IN (${allDocTypes.length ? allDocTypes.map(() => "?").join(",") : "NULL"})
      ${where}
      GROUP BY s.student_no, d.doc_type
      `,
      [...(allDocTypes.length ? allDocTypes : []), ...params]
    )
    : [];

  const incompleteDocMap = new Map();
  for (const row of incompleteDocRows) {
    const studentNo = String(row.student_no || "").trim();
    const docType = String(row.doc_type || "").trim();
    if (!studentNo || !docType) continue;
    if (!incompleteDocMap.has(studentNo)) incompleteDocMap.set(studentNo, new Set());
    incompleteDocMap.get(studentNo).add(docType);
  }

  const incompleteStudents = incompleteRows.map((row) => {
    const studentNo = String(row.student_no || "").trim();
    const present = incompleteDocMap.get(studentNo) || new Set();
    const missingDocumentTypes = allDocTypes.filter((docType) => !present.has(docType));

    return {
      studentNo,
      studentName: String(row.student_name || "").trim(),
      courseCode: String(row.course_code || "").trim(),
      yearLevel: Number(row.year_level) || 0,
      section: String(row.section || "").trim(),
      room: Number(row.room) || null,
      cabinet: String(row.cabinet || "").trim(),
      drawer: Number(row.drawer) || null,
      actualCount: Number(row.actual_count) || 0,
      expectedCount: expectedCountPerStudent,
      missingCount: Math.max(0, expectedCountPerStudent - (Number(row.actual_count) || 0)),
      missingDocumentTypes,
    };
  });

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
    incompleteStudents,
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

export async function getStudentDigitizationComplianceReport({
  studentNo,
  requireApproved = false,
} = {}) {
  const targetStudentNo = String(studentNo || "").trim();
  if (!targetStudentNo) {
    throw new Error("Invalid studentNo");
  }

  const student = await getStudentByStudentNo(targetStudentNo);
  if (!student) {
    return null;
  }

  const allDocTypes = await listDocTypes();
  const studentDocs = await listDocuments({
    studentNo: targetStudentNo,
    excludeDeclined: !requireApproved,
    limit: 200,
  });

  const docTypeMap = new Map(
    (studentDocs || []).map((doc) => [String(doc.doc_type || "").trim(), doc])
  );
  const completedDocs = allDocTypes.filter((docType) => docTypeMap.has(docType));
  const incompleteDocTypes = allDocTypes.filter((docType) => !docTypeMap.has(docType));
  const approvedDocs = (studentDocs || []).filter((doc) => String(doc.approval_status || "") === "Approved");

  const totalRequired = allDocTypes.length;
  const totalUploaded = studentDocs.length;
  const totalApproved = approvedDocs.length;
  const compliancePercent =
    totalRequired > 0 ? roundPercent(completedDocs.length / totalRequired) : null;

  return {
    student: {
      studentNo: student.student_no,
      name: student.name,
      courseCode: student.course_code,
      yearLevel: student.year_level,
      section: student.section,
      status: student.status,
      room: student.room,
      cabinet: student.cabinet,
      drawer: student.drawer,
    },
    summary: {
      totalRequired,
      totalUploaded,
      totalApproved,
      completedCount: completedDocs.length,
      incompleteCount: incompleteDocTypes.length,
      compliancePercent,
      approvedOnly: Boolean(requireApproved),
    },
    completedDocs,
    incompleteDocTypes,
    documents: studentDocs.map((doc) => ({
      id: doc.id,
      docType: doc.doc_type,
      originalFilename: doc.original_filename,
      approvalStatus: doc.approval_status,
      createdAt: doc.created_at,
      reviewedAt: doc.reviewed_at,
      reviewNote: doc.review_note,
    })),
    meta: {
      studentNo: student.student_no,
      generatedAt: new Date().toISOString(),
      requireApproved: Boolean(requireApproved),
      configuredDocTypes: allDocTypes,
    },
  };
}
