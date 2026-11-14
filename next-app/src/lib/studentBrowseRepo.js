import { query, queryOne } from "./postgres.js";
import { decryptStudentRow } from "./studentAuth.js";
import { decryptPII } from "./piiEncryption.js";
import { matchesSearchQuery } from "./searchUtils.js";

const folderYear = `COALESCE(CASE WHEN split_part(s.student_no, '-', 1) ~ '^[0-9]{4}$'
  AND split_part(s.student_no, '-', 1)::int BETWEEN 1900 AND 2200
  THEN split_part(s.student_no, '-', 1)::int END, s.year_level)`;
const status = `CASE WHEN som.status = 'Archived' THEN 'Archived' ELSE s.status END`;
const studentColumns = `s.student_no, s.name, s.first_name, s.middle_name, s.last_name, s.course_code, s.year_level, s.section,
  s.storage_room AS room, s.storage_cabinet AS cabinet, s.storage_drawer AS drawer,
  s.created_at, s.updated_at, ${status} AS status`;

function scope() {
  return `FROM students s JOIN student_office_memberships som
    ON som.student_no = s.student_no AND som.office_id = $1`;
}

function normalize(row) {
  const { odrs_email, ...record } = row;
  const student = decryptStudentRow(record);
  const decodedEmail = odrs_email ? decryptPII(odrs_email) : "";
  return {
    ...student,
    studentNo: student.student_no,
    courseCode: student.course_code,
    yearLevel: student.year_level,
    odrsEmail: decodedEmail?.startsWith("enc:v1:") ? "" : (decodedEmail || ""),
    documentCount: Number(row.document_count || 0),
  };
}

export async function getStudentBrowseSummary(officeId) {
  const from = scope();
  const [counts, facets, years, documents, docTypes] = await Promise.all([
    queryOne(`SELECT count(*) FILTER (WHERE ${status} = 'Active')::int AS active,
      count(*) FILTER (WHERE ${status} <> 'Active')::int AS archived,
      count(*) FILTER (WHERE ${status} = 'Active' AND s.storage_room IS NOT NULL
        AND s.storage_cabinet IS NOT NULL AND s.storage_drawer IS NOT NULL)::int AS assigned
      ${from}`, [officeId]),
    query(`SELECT ${status} AS status, s.course_code, s.year_level, s.section, count(*)::int AS count
      ${from} GROUP BY 1, 2, 3, 4`, [officeId]),
    query(`SELECT ${folderYear} AS year, ${status} AS status, count(*)::int AS count
      ${from} GROUP BY 1, 2 ORDER BY 1 DESC`, [officeId]),
    queryOne(`SELECT count(*)::int AS total,
      count(DISTINCT d.student_no)::int AS students_with_files
      FROM documents d WHERE d.office_id = $1 AND d.approval_status <> 'Declined'`, [officeId]),
    query(`SELECT d.doc_type, count(*)::int AS count FROM documents d
      WHERE d.office_id = $1 AND d.approval_status <> 'Declined'
      GROUP BY d.doc_type ORDER BY count(*) DESC, d.doc_type LIMIT 5`, [officeId]),
  ]);
  return { counts, facets, years, documents, docTypes };
}

export async function browseStudents({ officeId, archived = false, year, startDate = "", endDate = "", q = "", courses = [], years = [], sections = [], excludedCourses = [], excludedYears = [], excludedSections = [], sortBy = "studentNo", sortOrder = "ASC", groupBy, page = 1, pageSize = 10, exportAll = false }) {
  const includeOdrsEmail = String(officeId || "").trim().toLowerCase() === "registrar";
  const selectedStudentColumns = includeOdrsEmail
    ? `${studentColumns}, odrs.email AS odrs_email`
    : studentColumns;
  const contactJoin = includeOdrsEmail
    ? " LEFT JOIN registrar_odrs_contacts odrs ON odrs.student_no = s.student_no"
    : "";
  const params = [officeId];
  const add = (value) => { params.push(value); return `$${params.length}`; };
  const conditions = [archived ? `${status} <> 'Active'` : `${status} = 'Active'`];
  if (year != null) conditions.push(`${folderYear} = ${add(year)}`);
  if (startDate) conditions.push(`s.created_at >= (${add(startDate)}::date::timestamp AT TIME ZONE 'Asia/Manila')`);
  if (endDate) conditions.push(`s.created_at < ((${add(endDate)}::date + 1)::timestamp AT TIME ZONE 'Asia/Manila')`);
  if (courses.length) conditions.push(`upper(s.course_code) = ANY(${add(courses.map((v) => v.toUpperCase()))}::text[])`);
  if (years.length) conditions.push(`s.year_level = ANY(${add(years)}::int[])`);
  if (sections.length) conditions.push(`upper(s.section) = ANY(${add(sections.map((v) => v.toUpperCase()))}::text[])`);
  if (excludedCourses.length) conditions.push(`NOT (upper(coalesce(s.course_code, '')) = ANY(${add(excludedCourses.map((v) => v.toUpperCase()))}::text[]))`);
  if (excludedYears.length) conditions.push(`NOT (coalesce(s.year_level, 0) = ANY(${add(excludedYears)}::int[]))`);
  if (excludedSections.length) conditions.push(`NOT (upper(coalesce(s.section, '')) = ANY(${add(excludedSections.map((v) => v.toUpperCase()))}::text[]))`);
  const search = String(q || "").trim();
  const needsDecrypt = Boolean(search && !/^[\d-]+$/.test(search)) || sortBy === "name" || sortBy === "odrsEmail";
  if (search && !needsDecrypt) {
    conditions.push(`(s.student_no ILIKE ${add(`%${search}%`)} OR replace(s.student_no, '-', '') ILIKE ${add(`%${search.replace(/-/g, "")}%`)})`);
  }
  const from = `${scope()}${contactJoin} WHERE ${conditions.join(" AND ")}`;
  const docCount = `(SELECT count(*)::int FROM documents d WHERE d.office_id = $1
    AND d.student_no = s.student_no AND d.approval_status <> 'Declined') AS document_count`;
  const orderColumn = {
    studentNo: "s.student_no", courseCode: "s.course_code", yearLevel: "s.year_level",
    section: "s.section", room: "s.storage_room", cabinet: "s.storage_cabinet",
    drawer: "s.storage_drawer", documents: "document_count",
  }[sortBy] || "s.student_no";
  const groupColumns = {
    courseCode: "coalesce(s.course_code, '')",
    yearLevel: "coalesce(s.year_level, 0)",
    section: "coalesce(s.section, '')",
  };
  const groupColumn = Object.hasOwn(groupColumns, groupBy) ? groupColumns[groupBy] : null;
  const direction = sortOrder === "DESC" ? "DESC" : "ASC";
  const offset = (page - 1) * pageSize;

  if (needsDecrypt) {
    const rows = (await query(`SELECT ${selectedStudentColumns}, ${docCount}
      ${groupColumn ? `, dense_rank() OVER (ORDER BY ${groupColumn}) AS group_rank` : ""} ${from}`, params))
      .map((row) => ({ ...normalize(row), groupRank: Number(row.group_rank || 0) }));
    const matched = search ? rows.filter((s) => matchesSearchQuery([s.studentNo, s.name, s.courseCode, s.section, s.odrsEmail], search)) : rows;
    matched.sort((a, b) => {
      if (a.groupRank !== b.groupRank) return a.groupRank - b.groupRank;
      const left = sortBy === "documents" ? a.documentCount : sortBy === "odrsEmail" ? a.odrsEmail : a[sortBy] ?? "";
      const right = sortBy === "documents" ? b.documentCount : sortBy === "odrsEmail" ? b.odrsEmail : b[sortBy] ?? "";
      const comparison = typeof left === "number" && typeof right === "number"
        ? left - right : String(left).localeCompare(String(right), undefined, { numeric: true });
      return (direction === "DESC" ? -comparison : comparison) || a.studentNo.localeCompare(b.studentNo);
    });
    return { rows: (exportAll ? matched : matched.slice(offset, offset + pageSize)).map(({ groupRank, ...row }) => row), total: matched.length };
  }

  const total = Number((await queryOne(`SELECT count(*)::int AS total ${from}`, params))?.total || 0);
  const rows = await query(`SELECT ${selectedStudentColumns}, ${docCount} ${from}
    ORDER BY ${groupColumn ? `${groupColumn}, ` : ""}${orderColumn} ${direction} NULLS LAST, s.student_no ASC
    ${exportAll ? "" : `LIMIT ${add(pageSize)} OFFSET ${add(offset)}`}`, params);
  return { rows: rows.map(normalize), total };
}
