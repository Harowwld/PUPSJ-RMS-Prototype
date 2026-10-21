import test from "node:test";
import assert from "node:assert/strict";
import {
  sanitizePathComponent,
  formatLocationCode,
  buildRegistrarArchivalPath,
  buildOsasArchivalPath,
  generateRecordsCatalogCsv,
  generateManifestJson,
  computeBufferSha256,
} from "../src/lib/archivalStructure.js";

test("sanitizePathComponent replaces illegal characters and trims whitespace", () => {
  assert.equal(sanitizePathComponent("BSIT: Network & Web"), "BSIT_ Network & Web");
  assert.equal(sanitizePathComponent("Room/1\\Cabinet*A?"), "Room_1_Cabinet_A_");
  assert.equal(sanitizePathComponent("   "), "UNKNOWN");
  assert.equal(sanitizePathComponent(null, "FALLBACK"), "FALLBACK");
});

test("formatLocationCode standardizes physical archive markers", () => {
  assert.equal(formatLocationCode(1, "A", 2), "R1-CabA-D2");
  assert.equal(formatLocationCode(2, "b", 4), "R2-CabB-D4");
  assert.equal(formatLocationCode(null, null, null), "R1-CabA-D1");
});

test("buildRegistrarArchivalPath generates structured academic and physical archive paths", () => {
  const p = buildRegistrarArchivalPath({
    studentNo: "2024-00123-SJ-0",
    studentName: "Dela Cruz, Juan M.",
    academicYear: 2024,
    courseCode: "BSIT",
    section: "1",
    room: 1,
    cabinet: "A",
    drawer: 2,
    docType: "Transcript of Records",
    originalFilename: "tor_final.pdf",
  });

  assert.equal(
    p,
    "records/AY_2024/BSIT/Section_1/2024-00123-SJ-0 - DELA CRUZ, JUAN M. [Loc R1-CabA-D2]/Transcript of Records.pdf"
  );
});

test("buildRegistrarArchivalPath derives academic year from student number if missing", () => {
  const p = buildRegistrarArchivalPath({
    studentNo: "2022-09876-SJ-0",
    studentName: "Santos, Maria",
    courseCode: "BSED",
    section: "2-1",
    docType: "Form 137",
    originalFilename: "f137.pdf",
  });

  assert.match(p, /^records\/AY_2022\/BSED\/Section_2-1\/2022-09876-SJ-0 - SANTOS, MARIA/);
});

test("buildRegistrarArchivalPath handles multiple documents of the same type with index suffix", () => {
  const p1 = buildRegistrarArchivalPath({
    studentNo: "2024-00001-SJ-0",
    studentName: "Dela Cruz, Juan",
    courseCode: "BSIT",
    section: "1",
    docType: "Certificate of Grades",
    duplicateIndex: 0,
  });

  const p2 = buildRegistrarArchivalPath({
    studentNo: "2024-00001-SJ-0",
    studentName: "Dela Cruz, Juan",
    courseCode: "BSIT",
    section: "1",
    docType: "Certificate of Grades",
    duplicateIndex: 1,
  });

  assert.ok(p1.endsWith("Certificate of Grades.pdf"));
  assert.ok(p2.endsWith("Certificate of Grades (2).pdf"));
});

test("buildOsasArchivalPath formats organizational governance records correctly", () => {
  const p = buildOsasArchivalPath({
    orgId: "CS-SOC",
    orgName: "Computer Society",
    category: "Academic Organizations",
    academicYear: "2024",
    room: 2,
    cabinet: "B",
    drawer: 1,
    docType: "Constitution & By-Laws",
    originalFilename: "cbl.pdf",
  });

  assert.equal(
    p,
    "records/AY_2024/Academic Organizations/CS-SOC - COMPUTER SOCIETY [Loc R2-CabB-D1]/Constitution & By-Laws.pdf"
  );
});

test("generateRecordsCatalogCsv formats valid RFC 4180 CSV with escaping", () => {
  const manifestRecords = [
    {
      entityType: "Student",
      entityId: "2024-00001-SJ-0",
      entityName: "Dela Cruz, Juan",
      academicYear: "2024",
      programOrCategory: "BSIT",
      section: "1",
      docType: "Transcript of Records",
      physicalLocation: { room: 1, cabinet: "A", drawer: 2, code: "R1-CabA-D2" },
      originalFilename: 'sample, "quoted" file.pdf',
      archivePath: "records/AY_2024/BSIT/Section_1/sample.pdf",
      sha256: "abcdef123456",
    },
  ];

  const csv = generateRecordsCatalogCsv(manifestRecords);
  assert.ok(csv.includes('"Entity Type","Entity ID","Entity Name"'));
  assert.ok(csv.includes('"Student"'));
  assert.ok(csv.includes('"2024-00001-SJ-0"'));
  assert.ok(csv.includes('"Dela Cruz, Juan"'));
  assert.ok(csv.includes('"Room 1"'));
  assert.ok(csv.includes('"Cabinet A"'));
  assert.ok(csv.includes('"R1-CabA-D2"'));
  // verify RFC 4180 quote escaping
  assert.ok(csv.includes('""quoted""'));
});

test("generateManifestJson and computeBufferSha256 produce expected JSON and hashes", () => {
  const buf = Buffer.from("test-content", "utf8");
  const hash = computeBufferSha256(buf);
  assert.equal(typeof hash, "string");
  assert.equal(hash.length, 64);

  const jsonStr = generateManifestJson({
    scope: "office",
    officeId: "registrar",
    records: [{ id: 1, sha256: hash }],
  });
  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.formatVersion, 2);
  assert.equal(parsed.archivalStructure, "academic-physical-hybrid");
  assert.equal(parsed.totalRecords, 1);
  assert.equal(parsed.records[0].sha256, hash);
});

test("inspectBackupBuffer recognizes structured archives and catalog", async () => {
  const AdmZip = (await import("adm-zip")).default;
  const { encryptBackupBuffer, inspectBackupBuffer } = await import("../src/lib/backupsRepo.js");

  const zip = new AdmZip();
  zip.addFile("db.sql", Buffer.from("SELECT 1;", "utf8"));
  
  const manifestData = [
    {
      documentId: 10,
      officeId: "registrar",
      entityType: "Student",
      entityId: "2024-00001-SJ-0",
      entityName: "Dela Cruz, Juan",
      academicYear: "2024",
      programOrCategory: "BSIT",
      section: "1",
      docType: "Transcript of Records",
      physicalLocation: { room: 1, cabinet: "A", drawer: 1, code: "R1-CabA-D1" },
      originalFilename: "tor.pdf",
      storageFilename: "test_doc_10.pdf",
      archivePath: "records/AY_2024/BSIT/Section_1/2024-00001-SJ-0 - DELA CRUZ, JUAN [Loc R1-CabA-D1]/Transcript of Records.pdf",
      sha256: "dummyhash",
    },
  ];

  zip.addFile("manifest.json", Buffer.from(generateManifestJson({ scope: "office", officeId: "registrar", records: manifestData }), "utf8"));
  zip.addFile("RECORDS_CATALOG.csv", Buffer.from(generateRecordsCatalogCsv(manifestData), "utf8"));
  zip.addFile(
    "records/AY_2024/BSIT/Section_1/2024-00001-SJ-0 - DELA CRUZ, JUAN [Loc R1-CabA-D1]/Transcript of Records.pdf",
    Buffer.from("PDF CONTENT TEST", "utf8")
  );

  const plainZipBuffer = zip.toBuffer();
  const encrypted = encryptBackupBuffer(plainZipBuffer);

  const inspected = await inspectBackupBuffer(encrypted);
  assert.equal(inspected.ok, true);
  assert.equal(inspected.isStructuredArchive, true);
  assert.equal(inspected.hasCatalog, true);
  assert.equal(inspected.totalArchiveFiles, 1); // Only counts actual records, excluding db.sql, manifest, and catalog!
});

test("executeRestoreBackup extracts structured archive into office storage paths", async () => {
  const AdmZip = (await import("adm-zip")).default;
  const { encryptBackupBuffer, executeRestoreBackup, getLocalDir } = await import("../src/lib/backupsRepo.js");

  const zip = new AdmZip();
  // Provide valid COPY command with exact \\.\n marker
  zip.addFile("db.sql", Buffer.from("COPY settings (key, value) FROM stdin;\n\\.\n", "utf8"));

  const testFilePayload = "HELLO_STRUCTURED_BACKUP_TEST";
  const manifestData = [
    {
      documentId: 99,
      officeId: "registrar",
      entityType: "Student",
      entityId: "2024-00099-SJ-0",
      entityName: "Test Student",
      academicYear: "2024",
      programOrCategory: "BSIT",
      section: "1",
      docType: "Form 137",
      physicalLocation: { room: 1, cabinet: "A", drawer: 1, code: "R1-CabA-D1" },
      originalFilename: "f137.pdf",
      storageFilename: "test_f137_extracted_file.pdf",
      archivePath: "records/AY_2024/BSIT/Section_1/2024-00099-SJ-0 - TEST STUDENT [Loc R1-CabA-D1]/Form 137.pdf",
      sha256: "testhash",
    },
  ];

  zip.addFile("manifest.json", Buffer.from(generateManifestJson({ scope: "office", officeId: "registrar", records: manifestData }), "utf8"));
  zip.addFile("RECORDS_CATALOG.csv", Buffer.from(generateRecordsCatalogCsv(manifestData), "utf8"));
  zip.addFile(
    "records/AY_2024/BSIT/Section_1/2024-00099-SJ-0 - TEST STUDENT [Loc R1-CabA-D1]/Form 137.pdf",
    Buffer.from(testFilePayload, "utf8")
  );

  const plainZipBuffer = zip.toBuffer();
  const encrypted = encryptBackupBuffer(plainZipBuffer);

  const restoreResult = await executeRestoreBackup(encrypted, {
    userRole: "Admin",
    userOffice: "registrar",
    mode: "overwrite",
    createSafetySnapshot: false,
  });

  assert.equal(restoreResult.ok, true);
  assert.ok(restoreResult.filesRestored >= 1);

  // Verify that the file was written to .local/storage/registrar/uploads/test_f137_extracted_file.pdf
  const localDir = getLocalDir();
  const targetPath = (await import("node:path")).default.join(
    localDir,
    "storage",
    "registrar",
    "uploads",
    "test_f137_extracted_file.pdf"
  );

  const fs = (await import("node:fs")).default;
  assert.ok(fs.existsSync(targetPath), `Expected target file to exist at ${targetPath}`);
  assert.equal(fs.readFileSync(targetPath, "utf8"), testFilePayload);

  // Clean up test file
  try {
    fs.unlinkSync(targetPath);
  } catch {}
});
