/**
 * Utilities for generating structured, human-readable records backup archives
 * combining permanent academic anchors (Academic Year, Program, Section) with
 * physical filing location metadata (Room, Cabinet, Drawer).
 */

import crypto from "node:crypto";
import path from "node:path";

/**
 * Sanitize a string to be safe for filesystem path components across OSes.
 * Replaces illegal characters (colon, slashes, wildcards, quotes) with underscores.
 */
export function sanitizePathComponent(value, fallback = "UNKNOWN") {
  if (!value || typeof value !== "string") {
    return fallback;
  }
  const cleaned = value
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
}

/**
 * Format physical location code, e.g. "R1-CabA-D1"
 */
export function formatLocationCode(room, cabinet, drawer) {
  const r = room != null ? String(room).trim() : "1";
  const c = cabinet ? String(cabinet).trim().toUpperCase() : "A";
  const d = drawer != null ? String(drawer).trim() : "1";
  return `R${r}-Cab${c}-D${d}`;
}

/**
 * Build the structured archive path for a Registrar student document.
 * 
 * Hierarchy:
 * records/
 *   └── AY_2024/
 *       └── BSIT/
 *           └── Section_1/
 *               └── 2024-00001-SJ-0 - DELA CRUZ, JUAN [Loc R1-CabA-D1]/
 *                   └── Transcript of Records.pdf
 */
export function buildRegistrarArchivalPath({
  studentNo,
  studentName,
  academicYear,
  courseCode,
  section,
  room,
  cabinet,
  drawer,
  docType,
  originalFilename,
  duplicateIndex = 0,
}) {
  // 1. Resolve Academic Year (permanent anchor)
  let year = academicYear ? String(academicYear).trim() : null;
  if (!year && studentNo && /^\d{4}/.test(studentNo)) {
    year = studentNo.substring(0, 4);
  }
  if (!year) year = new Date().getFullYear().toString();
  const yearFolder = `AY_${sanitizePathComponent(year, "2024")}`;

  // 2. Resolve Course / Program Code
  const courseFolder = sanitizePathComponent(courseCode ? courseCode.toUpperCase() : "GENERAL");

  // 3. Resolve Section / Block
  const secRaw = section ? String(section).trim() : "1";
  const sectionFolder = sanitizePathComponent(
    secRaw.toLowerCase().startsWith("section") ? secRaw : `Section_${secRaw}`,
    "Section_1"
  );

  // 4. Resolve Student Folder with Physical Location Marker
  const cleanStudentNo = sanitizePathComponent(studentNo, "STUDENT");
  const cleanName = sanitizePathComponent(studentName ? studentName.toUpperCase() : "STUDENT");
  const locCode = formatLocationCode(room, cabinet, drawer);
  const studentFolder = `${cleanStudentNo} - ${cleanName} [Loc ${locCode}]`;

  // 5. Resolve Document Filename
  const cleanDoc = sanitizePathComponent(docType || "Document", "Document");
  const ext = path.extname(originalFilename || "").toLowerCase() || ".pdf";
  const dupSuffix = duplicateIndex > 0 ? ` (${duplicateIndex + 1})` : "";
  const documentFilename = `${cleanDoc}${dupSuffix}${ext}`;

  return path.posix.join("records", yearFolder, courseFolder, sectionFolder, studentFolder, documentFilename);
}

/**
 * Build the structured archive path for an OSAS Organization document.
 * 
 * Hierarchy:
 * records/
 *   └── AY_2024/
 *       └── Academic Organizations/
 *           └── CS-SOC - Computer Society [Loc R1-CabB-D2]/
 *               └── Constitution & By-Laws.pdf
 */
export function buildOsasArchivalPath({
  orgId,
  orgName,
  category,
  academicYear,
  room,
  cabinet,
  drawer,
  docType,
  originalFilename,
  duplicateIndex = 0,
}) {
  let year = academicYear ? String(academicYear).trim() : null;
  if (!year) year = new Date().getFullYear().toString();
  const yearFolder = `AY_${sanitizePathComponent(year, "2024")}`;

  const categoryFolder = sanitizePathComponent(category || "Organizations", "Organizations");
  const cleanOrgId = sanitizePathComponent(orgId, "ORG");
  const cleanOrgName = sanitizePathComponent(orgName ? orgName.toUpperCase() : "ORGANIZATION");
  const locCode = formatLocationCode(room, cabinet, drawer);
  const orgFolder = `${cleanOrgId} - ${cleanOrgName} [Loc ${locCode}]`;

  const cleanDoc = sanitizePathComponent(docType || "Document", "Document");
  const ext = path.extname(originalFilename || "").toLowerCase() || ".pdf";
  const dupSuffix = duplicateIndex > 0 ? ` (${duplicateIndex + 1})` : "";
  const documentFilename = `${cleanDoc}${dupSuffix}${ext}`;

  return path.posix.join("records", yearFolder, categoryFolder, orgFolder, documentFilename);
}

/**
 * Format a string field for CSV inclusion following RFC 4180
 */
function escapeCsvCell(value) {
  if (value == null) return '""';
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Generate human-readable RECORDS_CATALOG.csv from manifest records.
 * Can be opened in Excel or any spreadsheet software.
 */
export function generateRecordsCatalogCsv(manifestRecords = []) {
  const headers = [
    "Entity Type",
    "Entity ID",
    "Entity Name",
    "Academic Year",
    "Program / Category",
    "Section",
    "Document Type",
    "Physical Room",
    "Physical Cabinet",
    "Physical Drawer",
    "Location Code",
    "Original Filename",
    "Archive Path",
    "SHA-256",
  ];

  const lines = [headers.map(escapeCsvCell).join(",")];

  for (const record of manifestRecords) {
    const row = [
      record.entityType || "Student",
      record.entityId || "",
      record.entityName || "",
      record.academicYear || "",
      record.programOrCategory || "",
      record.section || "",
      record.docType || "",
      record.physicalLocation?.room != null ? `Room ${record.physicalLocation.room}` : "",
      record.physicalLocation?.cabinet ? `Cabinet ${record.physicalLocation.cabinet}` : "",
      record.physicalLocation?.drawer != null ? `Drawer ${record.physicalLocation.drawer}` : "",
      record.physicalLocation?.code || "",
      record.originalFilename || "",
      record.archivePath || "",
      record.sha256 || "",
    ];
    lines.push(row.map(escapeCsvCell).join(","));
  }

  return lines.join("\r\n");
}

/**
 * Generate machine-readable manifest.json
 */
export function generateManifestJson({
  scope = "office",
  officeId = "registrar",
  backupType = "Full",
  generatedAt = new Date().toISOString(),
  records = [],
} = {}) {
  return JSON.stringify(
    {
      formatVersion: 2,
      archivalStructure: "academic-physical-hybrid",
      scope,
      officeId,
      backupType,
      generatedAt,
      totalRecords: records.length,
      records,
    },
    null,
    2
  );
}

/**
 * Compute SHA-256 checksum of a buffer
 */
export function computeBufferSha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
