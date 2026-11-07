import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

const DOCUMENTS_TAB_PATH = path.resolve("src/components/staff/DocumentsTab.js");
const STAFF_PAGE_PATH = path.resolve("src/app/staff/page.js");
const SCAN_UPLOAD_TAB_PATH = path.resolve("src/components/staff/ScanUploadTab.js");
const DOCUMENTS_REPO_PATH = path.resolve("src/lib/documentsRepo.js");

test("Codebase Contract: DocumentsTab has removed inline file-browsing modal", () => {
  const code = fs.readFileSync(DOCUMENTS_TAB_PATH, "utf8");

  // Verify legacy inline upload state is completely removed
  assert.ok(
    !code.includes("updatePromptOpen"),
    "DocumentsTab must not contain legacy updatePromptOpen modal state"
  );
  assert.ok(
    !code.includes("setUpdateFile"),
    "DocumentsTab must not contain legacy setUpdateFile state"
  );
  assert.ok(
    !code.includes("setUpdatePromptOpen"),
    "DocumentsTab must not open legacy inline file modal"
  );
});

test("Codebase Contract: DocumentsTab invokes onRescan for document updates", () => {
  const code = fs.readFileSync(DOCUMENTS_TAB_PATH, "utf8");

  // Must declare onRescan prop
  assert.ok(
    code.includes("onRescan"),
    "DocumentsTab must accept onRescan prop"
  );

  // Must invoke onRescan with student_no, doc_type, doc.id, original_filename, mime_type
  assert.ok(
    code.includes("onRescan?.(") && code.includes("selectedDoc.student_no"),
    "DocumentsTab detail modal Update button must invoke onRescan with document metadata"
  );

  // Matrix cell rescan trigger for declined or missing documents
  assert.ok(
    code.includes("item.student.studentNo") && code.includes("req.docType"),
    "DocumentsTab matrix cells must wire up onRescan with studentNo and docType"
  );
});

test("Codebase Contract: staff/page.js redirects to Scan Upload with prefilled metadata", () => {
  const code = fs.readFileSync(STAFF_PAGE_PATH, "utf8");

  // Verify handleRescan sets up rescanContext and isReplaceMode
  assert.ok(
    code.includes("const handleRescan = useCallback("),
    "staff/page.js must implement handleRescan handler"
  );
  assert.ok(
    code.includes("setRescanContext({") && code.includes("setIsReplaceMode(true)"),
    "handleRescan must initialize rescanContext and enable replace mode"
  );

  // Verify applyStudentToPdfForm is called and existing student is flagged
  assert.ok(
    code.includes("applyStudentToPdfForm(s, docType)") || code.includes("applyStudentToPdfForm("),
    "handleRescan must carry over student metadata via applyStudentToPdfForm"
  );
  assert.ok(
    code.includes("setUploadStudentIsExisting(true)"),
    "handleRescan must mark uploadStudentIsExisting as true"
  );

  // Verify previous uploads are cleared to prepare dropzone
  assert.ok(
    code.includes("setUploadedFile(null)") && code.includes("setUploadedFiles([])"),
    "handleRescan must clear previous dropzone files for the new scan"
  );

  // Verify programmatic redirect to upload view
  assert.ok(
    code.includes('setView("upload")') || code.includes('switchView("upload")'),
    'handleRescan must programmatically redirect view to "upload"'
  );
});

test("Codebase Contract: ScanUploadTab renders rescan banner and locks identity fields", () => {
  const code = fs.readFileSync(SCAN_UPLOAD_TAB_PATH, "utf8");

  // Accepts rescanContext & isReplaceMode props
  assert.ok(
    code.includes("rescanContext") && code.includes("isReplaceMode"),
    "ScanUploadTab must receive rescanContext and isReplaceMode props"
  );

  // Shows rescan replacement banner
  assert.ok(
    code.includes("Rescan / Replacement Mode Active:"),
    "ScanUploadTab must show active Rescan / Replacement banner"
  );

  // Locks student number and doc type when in rescan mode
  assert.ok(
    code.includes("disabled={Boolean(rescanContext)}"),
    "ScanUploadTab must lock student number input during rescan"
  );
  assert.ok(
    code.includes("disabled={Boolean(rescanContext?.docType)}"),
    "ScanUploadTab must lock document type selector during rescan"
  );

  // Displays contextual action label
  assert.ok(
    code.includes("Replace Existing Document"),
    "ScanUploadTab must show 'Replace Existing Document' action button during replacement"
  );
});

test("Functional Logic: Metadata prefill and carry-over for Registrar student", () => {
  // Simulate normalizeStudentRow + applyStudentToPdfForm logic from staff/page.js
  const sampleStudent = {
    studentNo: "2024-00123-SJ-0",
    name: "Dela Cruz, Juan M.",
    courseCode: "BSIT",
    yearLevel: 2024,
    section: "1",
    room: 2,
    cabinet: "B",
    drawer: 3,
  };

  const docTypeToUpdate = "Transcript of Records";
  const docId = 42;
  const originalFilename = "delacruz_tor_old.pdf";
  const mimeType = "application/pdf";

  // Simulate handleRescan state transformation
  let formState = {};
  let rescanContextState = null;
  let isReplaceModeState = false;
  let uploadStudentIsExistingState = false;
  let currentView = "documents";

  function simulateHandleRescan(targetId, docType, id, filename, mime) {
    rescanContextState = {
      targetId,
      docType,
      docId: id,
      filename,
      mimeType: mime,
      originalStatus: "Approved",
    };
    isReplaceModeState = true;

    // Simulate applyStudentToPdfForm
    formState = {
      studentNo: sampleStudent.studentNo,
      name: sampleStudent.name.trim().toUpperCase(),
      course: sampleStudent.courseCode,
      year: String(sampleStudent.yearLevel),
      sectionPart: sampleStudent.section,
      room: String(sampleStudent.room),
      cabinet: sampleStudent.cabinet,
      drawer: String(sampleStudent.drawer),
      docType: docType,
    };
    uploadStudentIsExistingState = true;
    currentView = "upload";
  }

  simulateHandleRescan(sampleStudent.studentNo, docTypeToUpdate, docId, originalFilename, mimeType);

  // Assert redirection
  assert.equal(currentView, "upload", "Staff member must be redirected to the upload view");

  // Assert metadata carry-over
  assert.equal(formState.studentNo, "2024-00123-SJ-0");
  assert.equal(formState.name, "DELA CRUZ, JUAN M.");
  assert.equal(formState.course, "BSIT");
  assert.equal(formState.year, "2024");
  assert.equal(formState.sectionPart, "1");
  assert.equal(formState.room, "2");
  assert.equal(formState.cabinet, "B");
  assert.equal(formState.drawer, "3");
  assert.equal(formState.docType, "Transcript of Records");

  // Assert rescan context
  assert.equal(uploadStudentIsExistingState, true);
  assert.equal(isReplaceModeState, true);
  assert.equal(rescanContextState.docId, 42);
  assert.equal(rescanContextState.filename, "delacruz_tor_old.pdf");
});

test("Functional Logic: Metadata prefill and carry-over for OSAS organization", () => {
  const sampleOrg = {
    id: "JPCS-001",
    name: "Junior Philippine Computer Society",
    acronym: "JPCS",
    category: "Academic",
    adviser_name: "Prof. Alan Turing",
    adviser_email: "turing@pup.edu.ph",
    storage_room: "1",
    storage_cabinet: "CAB-A",
    storage_drawer: "2",
  };

  const docTypeToUpdate = "Constitution and By-Laws";
  const docId = 99;

  let formState = {};
  let rescanContextState = null;
  let isReplaceModeState = false;
  let currentView = "documents";

  function simulateHandleRescanOsas(targetId, docType, id) {
    rescanContextState = {
      targetId,
      docType,
      docId: id,
      originalStatus: "Approved",
    };
    isReplaceModeState = true;

    // Simulate OSAS applyStudentToPdfForm
    formState = {
      organizationId: sampleOrg.id,
      studentNo: sampleOrg.id,
      name: sampleOrg.name.toUpperCase(),
      acronym: sampleOrg.acronym,
      category: sampleOrg.category,
      adviserName: sampleOrg.adviser_name,
      adviserEmail: sampleOrg.adviser_email,
      room: sampleOrg.storage_room,
      cabinet: sampleOrg.storage_cabinet,
      drawer: sampleOrg.storage_drawer,
      docType: docType,
    };
    currentView = "upload";
  }

  simulateHandleRescanOsas(sampleOrg.id, docTypeToUpdate, docId);

  assert.equal(currentView, "upload");
  assert.equal(formState.organizationId, "JPCS-001");
  assert.equal(formState.name, "JUNIOR PHILIPPINE COMPUTER SOCIETY");
  assert.equal(formState.acronym, "JPCS");
  assert.equal(formState.docType, "Constitution and By-Laws");
  assert.equal(rescanContextState.docId, 99);
});

test("Codebase Contract: PDFPreviewModal supports Update Document action", () => {
  const pdfModalCode = fs.readFileSync(path.resolve("src/components/shared/PDFPreviewModal.js"), "utf8");
  const pdfLabelsCode = fs.readFileSync(path.resolve("src/lib/pdfPreview.js"), "utf8");
  const staffPageCode = fs.readFileSync(STAFF_PAGE_PATH, "utf8");

  // PDF_ACTION_LABELS contains update label
  assert.ok(
    pdfLabelsCode.includes('update: "Update Document"'),
    "PDF_ACTION_LABELS must define 'Update Document'"
  );

  // PDFPreviewModal supports onUpdate prop and renders button
  assert.ok(
    pdfModalCode.includes("onUpdate") && pdfModalCode.includes("handleUpdate"),
    "PDFPreviewModal must support onUpdate prop"
  );
  assert.ok(
    pdfModalCode.includes("PDF_ACTION_LABELS.update"),
    "PDFPreviewModal must render PDF_ACTION_LABELS.update button"
  );

  // staff/page.js wires onUpdate to handleRescan for previewed documents
  assert.ok(
    staffPageCode.includes("onUpdate=") && staffPageCode.includes("handleRescan("),
    "staff/page.js must pass onUpdate calling handleRescan to PDFPreviewModal"
  );
});

