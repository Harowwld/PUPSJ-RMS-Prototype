import { queryOne } from "./postgres.js"
import { decryptStudentRow } from "./studentAuth.js"

const normalizeList = (value) => [
  ...new Set(
    (Array.isArray(value) ? value : String(value || "").split(","))
      .map((entry) => String(entry).trim())
      .filter(Boolean)
  ),
]

export function calculateStudentCompliance(students, requireApproved = true) {
  return students.map((student) => {
    const requirements = (student.requirements || []).map((requirement) => {
      const approval = requirement.doc?.approval_status
      const status =
        approval === "Approved"
          ? "verified"
          : approval === "Pending"
            ? "pending"
            : approval === "Declined"
              ? "declined"
              : "missing"
      return {
        ...requirement,
        status,
        satisfied:
          status === "verified" || (!requireApproved && status === "pending"),
      }
    })
    const verifiedCount = requirements.filter(
      (r) => r.status === "verified"
    ).length
    const pendingCount = requirements.filter(
      (r) => r.status === "pending"
    ).length
    const missingCount = requirements.filter(
      (r) => r.status === "missing"
    ).length
    const declinedCount = requirements.filter(
      (r) => r.status === "declined"
    ).length
    const satisfiedCount = requirements.filter((r) => r.satisfied).length
    const totalCount = requirements.length
    const { requirements: ignoredRequirements, ...identity } = student
    return {
      student: {
        ...identity,
        studentNo: student.student_no,
        courseCode: student.course_code,
        yearLevel: student.year_level,
      },
      requirements,
      verifiedCount,
      pendingCount,
      missingCount,
      declinedCount,
      uploadedCount: verifiedCount + pendingCount,
      satisfiedCount,
      totalCount,
      isCompliant: totalCount > 0 && satisfiedCount === totalCount,
      completionPercent: totalCount
        ? Math.round((satisfiedCount / totalCount) * 100)
        : 0,
    }
  })
}

async function loadComplianceSnapshot({
  studentStatus = "Active",
  courseCode,
  courseCodes,
  requireApproved = true,
  officeId,
  studentNo,
  includeDigitizedDocuments = false,
  summaryOnly = false,
} = {}) {
  const office =
    String(officeId || "")
      .trim()
      .toLowerCase() || null
  const courses = normalizeList(courseCodes ?? courseCode).map((code) =>
    code.toUpperCase()
  )
  // One statement keeps requirements, evidence and population on the same database snapshot.
  const snapshot = await queryOne(
    `
    WITH types AS (
      SELECT id, name, office_id FROM document_types
      WHERE status = 'Active' AND is_compliance = TRUE AND is_requestable = FALSE
        AND ($1::text IS NULL OR office_id = $1)
    ), population AS (
      SELECT s.student_no, s.name, s.course_code, s.year_level, s.section, s.status,
        s.storage_room AS room, s.storage_cabinet AS cabinet, s.storage_drawer AS drawer
      FROM students s
      WHERE ($2 = 'all' OR ($2 = 'Archived' AND s.status != 'Active') OR s.status = $2)
        ${studentNo ? "AND s.student_no = $4" : ""}
        AND (cardinality($3::text[]) = 0 OR upper(s.course_code) = ANY($3::text[]))
        AND ($1::text IS NULL OR EXISTS (
          SELECT 1 FROM student_office_memberships som
          WHERE som.student_no = s.student_no AND som.office_id = $1
            AND (
              ($2 = 'all' AND som.status IN ('Active', 'Archived'))
              OR ($2 = 'Archived' AND (som.status = 'Archived' OR s.status != 'Active'))
              OR ($2 = 'Active' AND som.status = 'Active' AND s.status = 'Active')
            )
        ))
    )
    SELECT
      (SELECT count(*)::int FROM students s
       WHERE s.status = 'Active'
         AND (cardinality($3::text[]) = 0 OR upper(s.course_code) = ANY($3::text[]))
         AND ($1::text IS NULL OR EXISTS (
           SELECT 1 FROM student_office_memberships som
           WHERE som.student_no = s.student_no AND som.office_id = $1 AND som.status = 'Active'
         ))) AS active_students_count,
      (SELECT count(*)::int FROM students s
       WHERE (cardinality($3::text[]) = 0 OR upper(s.course_code) = ANY($3::text[]))
         AND ($1::text IS NULL OR EXISTS (
           SELECT 1 FROM student_office_memberships som
           WHERE som.student_no = s.student_no AND som.office_id = $1
             AND (som.status = 'Archived' OR s.status != 'Active')
         ))) AS archived_students_count,
      (SELECT coalesce(jsonb_agg(t ORDER BY lower(t.name), t.id), '[]'::jsonb) FROM types t) AS types,
      (SELECT coalesce(jsonb_agg(record ORDER BY record.student_no), '[]'::jsonb) FROM (
        SELECT ${summaryOnly ? "s.student_no, s.course_code, s.year_level" : "s.*"}, (SELECT coalesce(jsonb_agg(jsonb_build_object(
          'documentTypeId', t.id, 'docType', t.name, 'officeId', t.office_id,
          'doc', (SELECT jsonb_build_object(
            ${summaryOnly
              ? "'approval_status', d.approval_status"
              : "'id', d.id, 'student_no', d.student_no, 'doc_type', d.doc_type, 'office_id', d.office_id, 'approval_status', d.approval_status, 'original_filename', d.original_filename, 'mime_type', d.mime_type, 'size_bytes', d.size_bytes, 'created_at', d.created_at, 'review_note', d.review_note, 'reviewed_at', d.reviewed_at"}
          ) FROM documents d
            WHERE d.student_no = s.student_no AND d.office_id = t.office_id AND d.doc_type = t.name
            ORDER BY CASE d.approval_status WHEN 'Approved' THEN 0 WHEN 'Pending' THEN 1 ELSE 2 END, d.id DESC
            LIMIT 1)
        ) ORDER BY lower(t.name), t.id), '[]'::jsonb) FROM types t
          WHERE EXISTS (SELECT 1 FROM student_office_memberships som
            WHERE som.student_no = s.student_no AND som.office_id = t.office_id)
        ) AS requirements
        ${
          includeDigitizedDocuments
            ? `, (
          SELECT coalesce(jsonb_agg(jsonb_build_object(
            'id', d.id, 'doc_type', d.doc_type, 'created_at', d.created_at,
            'original_filename', d.original_filename
          ) ORDER BY lower(d.doc_type), d.created_at, d.id), '[]'::jsonb)
          FROM documents d
          WHERE d.student_no = s.student_no AND d.office_id = $1 AND d.approval_status = 'Approved'
        ) AS digitized_documents`
            : ""
        }
        FROM population s
      ) record) AS students`,
    [
      office,
      studentStatus || "Active",
      courses,
      ...(studentNo ? [studentNo] : []),
    ]
  )
  const types = snapshot?.types || []
  const records = calculateStudentCompliance(
    (snapshot?.students || []).map(decryptStudentRow),
    requireApproved
  )
  return {
    types,
    records,
    office,
    courses,
    studentStatus,
    requireApproved,
    activeStudentsCount: Number(snapshot?.active_students_count) || 0,
    archivedStudentsCount: Number(snapshot?.archived_students_count) || 0,
    generatedAt: new Date().toISOString(),
  }
}

function summarize(snapshot) {
  const {
    records,
    types,
    office,
    courses,
    studentStatus,
    requireApproved,
    generatedAt,
  } = snapshot
  const configured = types.length > 0
  const totalStudents = records.length
  const complete = records.filter((r) => r.isCompliant).length
  const expected = records.reduce((sum, r) => sum + r.totalCount, 0)
  const satisfied = records.reduce((sum, r) => sum + r.satisfiedCount, 0)
  const byCourse = new Map()
  const byYear = new Map()
  for (const record of records) {
    const code = record.student.courseCode
    const course = byCourse.get(code) || {
      courseCode: code,
      total: 0,
      digitized: 0,
      satisfied: 0,
      expected: 0,
    }
    course.total++
    course.digitized += Number(record.isCompliant)
    course.satisfied += record.satisfiedCount
    course.expected += record.totalCount
    byCourse.set(code, course)
    const year = Number(record.student.yearLevel)
    if (year > 0) byYear.set(year, (byYear.get(year) || 0) + 1)
  }
  const missingByDocumentType = types.map((type) => {
    const eligible = records.flatMap((record) =>
      record.requirements.filter((r) => r.documentTypeId === type.id)
    )
    const digitizedStudents = eligible.filter((r) => r.satisfied).length
    return {
      documentTypeId: type.id,
      documentType: type.name,
      officeId: type.office_id,
      totalStudents: eligible.length,
      digitizedStudents,
      missingStudents: eligible.length - digitizedStudents,
    }
  })
  return {
    summary: {
      totalStudents,
      activeStudentsCount: snapshot.activeStudentsCount ?? totalStudents,
      archivedStudentsCount: snapshot.archivedStudentsCount ?? 0,
      digitizedStudents: complete,
      fullyDigitizedStudents: complete,
      notDigitizedStudents: records.filter(
        (r) => r.totalCount > 0 && !r.isCompliant
      ).length,
      percentDigitized: expected ? Math.round((satisfied / expected) * 100) : 0,
      fullyDigitizedRate:
        totalStudents && configured
          ? Math.round((complete / totalStudents) * 100)
          : 0,
      totalDigitizedDocsCount: satisfied,
      totalExpectedDocsCount: expected,
      verifiedCount: records.reduce((sum, r) => sum + r.verifiedCount, 0),
      pendingCount: records.reduce((sum, r) => sum + r.pendingCount, 0),
      missingCount: records.reduce((sum, r) => sum + r.missingCount, 0),
      declinedCount: records.reduce((sum, r) => sum + r.declinedCount, 0),
    },
    byCourse: [...byCourse.values()]
      .map((c) => ({
        courseCode: c.courseCode,
        total: c.total,
        digitized: c.digitized,
        percent: c.expected ? Math.round((c.satisfied / c.expected) * 100) : 0,
        fullyDigitizedRate: c.total
          ? Math.round((c.digitized / c.total) * 100)
          : 0,
      }))
      .sort((a, b) => String(a.courseCode).localeCompare(String(b.courseCode))),
    byYear: [...byYear]
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => b.year - a.year),
    missingByDocumentType,
    meta: {
      officeId: office,
      studentStatus,
      courseCode: courses.join(", ") || null,
      courseCodes: courses,
      requireApproved,
      configured,
      generatedAt,
      definitions: {
        population:
          "Students with active membership in the authorized office and matching filters.",
        digitizedStudent: requireApproved
          ? "Every applicable requirement has approved evidence."
          : "Every applicable requirement has an approved or pending upload.",
        expectedCountFormula: `Requirement: All ${types.length} applicable compliance document types.`,
        completenessMetric: requireApproved
          ? "Approved requirements / applicable requirements."
          : "Uploaded requirements / applicable requirements.",
        configuredDocTypes: types.map((t) => t.name),
      },
    },
  }
}

export async function getDigitizationComplianceSummary(options = {}) {
  return summarize(await loadComplianceSnapshot({ ...options, summaryOnly: true }))
}

export async function getStudentRecordsReport({ studentNo, officeId } = {}) {
  const identifier = String(studentNo || "").trim()
  const office = String(officeId || "")
    .trim()
    .toLowerCase()
  if (!identifier || !office) return null
  const snapshot = await loadComplianceSnapshot({
    studentNo: identifier,
    officeId: office,
    studentStatus: "all",
    requireApproved: true,
    includeDigitizedDocuments: true,
  })
  const record = snapshot.records[0]
  if (!record) return null
  const { digitized_documents = [], ...student } = record.student
  return {
    student,
    digitizedDocuments: digitized_documents,
    outstandingRequirements: record.requirements.filter(
      (requirement) => !requirement.satisfied
    ),
    meta: {
      officeId: snapshot.office,
      generatedAt: snapshot.generatedAt,
      configured: snapshot.types.length > 0,
      requiredCount: record.totalCount,
      verifiedCount: record.verifiedCount,
    },
  }
}

export async function getStudentComplianceReport(options = {}) {
  const typeId =
    options.documentTypeId == null || options.documentTypeId === ""
      ? null
      : Number(options.documentTypeId)
  if (typeId !== null && (!Number.isSafeInteger(typeId) || typeId < 1))
    return null
  const snapshot = await loadComplianceSnapshot(options)
  const type =
    typeId === null ? null : snapshot.types.find((t) => t.id === typeId)
  if (typeId !== null && !type) return null
  const summary = summarize(snapshot)
  const search = String(options.search || "")
    .trim()
    .toLowerCase()
  const missingTypes = normalizeList(options.missingDocTypes)
  let records = snapshot.records.filter((r) => {
    if (!r.totalCount) return false
    if (options.complianceStatus === "compliant" && !r.isCompliant) return false
    if (
      options.complianceStatus !== "all" &&
      options.complianceStatus !== "compliant" &&
      r.isCompliant
    )
      return false
    if (
      type &&
      !r.requirements.some(
        (req) => req.documentTypeId === typeId && !req.satisfied
      )
    )
      return false
    if (
      missingTypes.length &&
      !r.requirements.some(
        (req) => missingTypes.includes(req.docType) && !req.satisfied
      )
    )
      return false
    return (
      !search ||
      [
        r.student.studentNo,
        r.student.name,
        r.student.courseCode,
        r.student.section,
        `${r.student.courseCode} ${r.student.section}`,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(search)
      )
    )
  })
  const sortBy = options.sortBy || "student_no"
  records.sort((a, b) => {
    const value = (r) =>
      sortBy === "progress"
        ? r.completionPercent
        : sortBy === "name"
          ? r.student.name
          : sortBy === "course"
            ? `${r.student.courseCode} ${r.student.section}`
            : r.student.studentNo
    const left = value(a),
      right = value(b)
    const result =
      typeof left === "number"
        ? left - right
        : String(left || "").localeCompare(String(right || ""))
    return (
      (result || a.student.studentNo.localeCompare(b.student.studentNo)) *
      (options.sortOrder === "DESC" ? -1 : 1)
    )
  })
  const total = records.length
  const limit = Math.min(
    Math.max(Number.parseInt(options.limit, 10) || 20, 1),
    100
  )
  const offset = Math.max(Number.parseInt(options.offset, 10) || 0, 0)
  if (!options.exportAll) records = records.slice(offset, offset + limit)
  return {
    ...summary,
    documentTypeId: typeId,
    documentType: type?.name || null,
    total,
    limit,
    offset,
    records,
    students: records.map((r) => ({
      ...r.student,
      outstandingRequirements: r.requirements
        .filter((req) => !req.satisfied)
        .filter((req) => typeId === null || req.documentTypeId === typeId),
    })),
  }
}

// Keep the existing drill-down on the same population and evidence rules as the matrix.
export const getMissingStudentsForDocumentType = getStudentComplianceReport
