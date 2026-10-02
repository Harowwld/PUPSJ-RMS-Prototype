import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const { query } = await import("../src/lib/postgres.js");
const {
  createDocument,
  listDocuments,
  getDocumentById,
  updateDocumentMetadata,
} = await import("../src/lib/documentsRepo.js");
const {
  getOrganizationById,
  createOrganization,
} = await import("../src/lib/organizationsRepo.js");

test("OSAS Polymorphic Scan & Upload: Organization-Centric Documents", async (t) => {
  let testDocId = null;
  let newOrgTestDocId = null;
  const testNewOrgId = "test-poly-org-" + Date.now();

  await t.test("1. createDocument accepts organizationId for OSAS without requiring student_no", async () => {
    const doc = await createDocument({
      officeId: "osas",
      studentNo: null,
      studentName: "Junior Philippine Computer Society",
      organizationId: "jpcs",
      docType: "Constitution & By-Laws (CBL)",
      originalFilename: "JPCS_CBL_2026.pdf",
      mimeType: "application/pdf",
      sizeBytes: 10240,
      buffer: Buffer.from("%PDF-1.4 test osas polymorphic scan"),
    });

    assert.ok(doc, "Document should be created successfully");
    assert.ok(doc.id, "Document should have a generated ID");
    assert.equal(doc.organization_id, "jpcs", "Document should link to organization_id 'jpcs'");
    assert.equal(doc.office_id, "osas", "Document should belong to office 'osas'");
    assert.equal(doc.student_no, null, "student_no must be null for organization-level document");
    assert.equal(doc.doc_type, "Constitution & By-Laws (CBL)");
    assert.equal(doc.approval_status, "Pending");

    testDocId = doc.id;
  });

  await t.test("2. getDocumentById retrieves organization details for OSAS documents", async () => {
    assert.ok(testDocId, "testDocId must be present");
    const doc = await getDocumentById(testDocId);

    assert.ok(doc, "Should fetch document by ID");
    assert.equal(doc.organization_id, "jpcs");
    assert.equal(doc.student_name, "Junior Philippine Computer Society");
    assert.equal(doc.office_id, "osas");
  });

  await t.test("3. listDocuments returns org_acronym and organization_name, and supports search by acronym and org filtering", async () => {
    const docs = await listDocuments({
      officeId: "osas",
      organizationId: "jpcs",
    });

    assert.ok(Array.isArray(docs), "Should return array of documents");
    const found = docs.find((d) => d.id === testDocId);
    assert.ok(found, "Should find the newly uploaded document");
    assert.equal(found.organization_id, "jpcs");
    assert.equal(found.org_acronym, "JPCS");
    assert.equal(found.organization_name, "Junior Philippine Computer Society");

    // Search by acronym "JPCS"
    const searchResult = await listDocuments({
      officeId: "osas",
      q: "JPCS",
    });
    const foundInSearch = searchResult.find((d) => d.id === testDocId);
    assert.ok(foundInSearch, "Should find document when searching by organization acronym 'JPCS'");
  });

  await t.test("4. updateDocumentMetadata allows updating document type and organization metadata", async () => {
    assert.ok(testDocId, "testDocId must be present");
    const updated = await updateDocumentMetadata(
      testDocId,
      {
        docType: "Organization Registration Certificate",
        organizationId: "jpcs",
      },
      { officeId: "osas" }
    );

    assert.equal(updated.doc_type, "Organization Registration Certificate");
    assert.equal(updated.organization_id, "jpcs");
  });

  await t.test("5. OSAS Staff can register a new organization during scan upload and link document", async () => {
    const newOrg = await createOrganization({
      id: testNewOrgId,
      name: "Polymorphic Test Student Society",
      acronym: "PTSS",
      category: "Academic",
      adviserName: "Prof. Alan Turing",
      storageRoom: 1,
      storageCabinet: "ACADEMIC ORGANIZATIONS",
      storageDrawer: "2",
    });

    assert.ok(newOrg, "Should successfully create new organization");
    assert.equal(newOrg.id, testNewOrgId);
    assert.equal(newOrg.storage_cabinet, "ACADEMIC ORGANIZATIONS");
    assert.equal(newOrg.storage_drawer, "2");

    const doc = await createDocument({
      officeId: "osas",
      studentNo: null,
      studentName: newOrg.name,
      organizationId: newOrg.id,
      docType: "Organization Registration Certificate",
      originalFilename: "PTSS_Registration.pdf",
      mimeType: "application/pdf",
      sizeBytes: 8192,
      buffer: Buffer.from("%PDF-1.4 test new org scan"),
    });

    assert.ok(doc, "Document for new organization should be created");
    assert.equal(doc.organization_id, testNewOrgId);
    assert.equal(doc.student_name, "Polymorphic Test Student Society");

    newOrgTestDocId = doc.id;
  });

  await t.test("6. Zero regression for Registrar student document uploads", async () => {
    const studentRows = await query(
      "SELECT student_no, name FROM students WHERE status = 'Active' LIMIT 1"
    );
    assert.ok(studentRows.length > 0, "Should have active students");
    const testStudent = studentRows[0];

    const regDoc = await createDocument({
      officeId: "registrar",
      studentNo: testStudent.student_no,
      studentName: testStudent.name,
      docType: "Transcript of Records",
      originalFilename: "TOR_Test.pdf",
      mimeType: "application/pdf",
      sizeBytes: 4096,
      buffer: Buffer.from("%PDF-1.4 test reg student doc"),
    });

    assert.ok(regDoc, "Registrar document should be created");
    assert.equal(regDoc.office_id, "registrar");
    assert.equal(regDoc.student_no, testStudent.student_no);
    assert.equal(regDoc.organization_id, null, "organization_id should be null for Registrar document");

    await query("DELETE FROM documents WHERE id = $1", [regDoc.id]);
  });

  await t.test("7. OCR recognition match query resolves OSAS student organizations by name and acronym", async () => {
    const extractedName = "Junior Philippine Computer Society";
    const rows = await query(
      `WITH input AS (
         SELECT trim(regexp_replace(lower($1), '[^a-z0-9]+', ' ', 'g')) AS full_name
       ), candidates AS (
         SELECT so.id, so.id AS "studentNo", so.id AS "organizationId", so.name, so.acronym, so.category,
                so.adviser_name AS "adviserName", so.storage_room AS room, so.storage_cabinet AS cabinet, so.storage_drawer AS drawer,
                trim(regexp_replace(lower(so.name), '[^a-z0-9]+', ' ', 'g')) AS db_name,
                trim(regexp_replace(lower(coalesce(so.acronym, '')), '[^a-z0-9]+', ' ', 'g')) AS db_acronym
         FROM student_organizations so
         WHERE so.status = 'Active'
       )
       SELECT "organizationId", "studentNo", name, acronym, category, "adviserName", room, cabinet, drawer,
         round((CASE
           WHEN db_name = input.full_name OR db_acronym = input.full_name THEN 1.0
           WHEN db_name LIKE input.full_name || '%' OR input.full_name LIKE db_acronym || '%' THEN 0.95
           WHEN db_name LIKE '%' || input.full_name || '%' OR input.full_name LIKE '%' || db_acronym || '%' THEN 0.90
           ELSE similarity(db_name, input.full_name)
         END)::numeric, 4) AS score
       FROM candidates, input
       WHERE db_name = input.full_name
          OR db_acronym = input.full_name
          OR db_name LIKE '%' || input.full_name || '%'
          OR input.full_name LIKE '%' || db_acronym || '%'
          OR similarity(db_name, input.full_name) >= 0.35
       ORDER BY score DESC LIMIT 5`,
      [extractedName.toLowerCase()]
    );

    assert.ok(rows.length > 0, "Should match at least one organization");
    const matched = rows[0];
    assert.equal(matched.organizationId, "jpcs");
    assert.equal(matched.name, "Junior Philippine Computer Society");
    assert.equal(matched.acronym, "JPCS");
    assert.equal(matched.cabinet, "ACADEMIC ORGANIZATIONS");
    assert.equal(Number(matched.score), 1.0, "Exact match should have score 1.0");
  });

  await t.test("8. Batch organization CSV parsing and structure validation", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const csvPath = fs.existsSync(path.resolve("public/sample_osas_organizations.csv"))
      ? path.resolve("public/sample_osas_organizations.csv")
      : path.resolve("../_SAMPLE_DATA/sample_osas_organizations.csv");
    assert.ok(fs.existsSync(csvPath), "Sample OSAS organizations CSV should exist");
    
    const content = fs.readFileSync(csvPath, "utf8");
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    
    assert.ok(headers.includes("organization"), "CSV has organization header");
    assert.ok(headers.includes("acronym"), "CSV has acronym header");
    assert.ok(headers.includes("category"), "CSV has category header");
    assert.ok(headers.includes("adviser"), "CSV has adviser header");
    assert.ok(headers.includes("cabinet"), "CSV has cabinet header");
    assert.ok(lines.length >= 8, "CSV has at least 8 sample organizations");
  });

  t.after(async () => {
    if (testDocId) {
      await query("DELETE FROM documents WHERE id = $1", [testDocId]);
    }
    if (newOrgTestDocId) {
      await query("DELETE FROM documents WHERE id = $1", [newOrgTestDocId]);
    }
    if (testNewOrgId) {
      await query("DELETE FROM student_organizations WHERE id = $1", [testNewOrgId]);
    }
  });
});
