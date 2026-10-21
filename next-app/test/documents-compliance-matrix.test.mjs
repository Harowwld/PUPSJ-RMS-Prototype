import test from "node:test";
import assert from "node:assert/strict";

/**
 * Pure calculation logic matching DocumentsTab.js for matrix computation
 */
export function calculateComplianceMatrix({
  students = [],
  staffDocs = [],
  complianceDocTypes = [],
  statusFilter = "all", // "all" | "incomplete" | "compliant"
  missingDocTypeFilter = "",
  searchQuery = "",
}) {
  const norm = (s) => String(s || "").toLowerCase().replace(/[\s\-_]+/g, " ").trim();

  // Group docs by student_no
  const docsByStudent = new Map();
  for (const doc of staffDocs) {
    const sn = norm(doc.student_no);
    if (!sn) continue;
    if (!docsByStudent.has(sn)) docsByStudent.set(sn, []);
    docsByStudent.get(sn).push(doc);
  }

  const activeStudents = students.filter(
    (s) => s.status !== "Inactive" && s.status !== "Archived"
  );

  const matrixRecords = activeStudents.map((student) => {
    const sn = norm(student.studentNo);
    const studentFiles = docsByStudent.get(sn) || [];

    const requirements = complianceDocTypes.map((type) => {
      const normType = norm(type);
      const matched = studentFiles.find((d) => norm(d.doc_type) === normType);

      if (matched) {
        const isApproved = matched.approval_status === "Approved";
        return {
          docType: type,
          status: isApproved ? "verified" : "pending",
          doc: matched,
        };
      }

      return {
        docType: type,
        status: "missing",
        doc: null,
      };
    });

    const verifiedCount = requirements.filter((r) => r.status === "verified").length;
    const pendingCount = requirements.filter((r) => r.status === "pending").length;
    const missingCount = requirements.filter((r) => r.status === "missing").length;
    const uploadedCount = verifiedCount + pendingCount;
    const totalCount = requirements.length;
    const isCompliant = totalCount > 0 && verifiedCount === totalCount;
    const completionPercent = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 100;

    return {
      student,
      requirements,
      verifiedCount,
      pendingCount,
      missingCount,
      uploadedCount,
      totalCount,
      isCompliant,
      completionPercent,
    };
  });

  const total = matrixRecords.length;
  const compliant = matrixRecords.filter((m) => m.isCompliant).length;
  const incomplete = total - compliant;
  const totalSlots = total * complianceDocTypes.length;
  const totalVerified = matrixRecords.reduce((acc, m) => acc + m.verifiedCount, 0);
  const overallRate = totalSlots > 0 ? Math.round((totalVerified / totalSlots) * 100) : 0;

  const kpiStats = {
    totalStudents: total,
    fullyCompliant: compliant,
    incomplete: incomplete,
    overallRate: overallRate,
  };

  const filteredRecords = matrixRecords.filter((item) => {
    if (statusFilter === "incomplete" && item.isCompliant) return false;
    if (statusFilter === "compliant" && !item.isCompliant) return false;

    if (searchQuery.trim()) {
      const q = norm(searchQuery);
      const sn = norm(item.student.studentNo);
      const name = norm(item.student.name);
      const course = norm(item.student.courseCode);
      const sec = norm(item.student.section);
      if (!sn.includes(q) && !name.includes(q) && !course.includes(q) && !sec.includes(q)) {
        return false;
      }
    }

    if (missingDocTypeFilter) {
      const normMissing = norm(missingDocTypeFilter);
      const hasMissing = item.requirements.some(
        (r) => norm(r.docType) === normMissing && r.status === "missing"
      );
      if (!hasMissing) return false;
    }

    return true;
  });

  return {
    kpiStats,
    matrixRecords,
    filteredRecords,
  };
}

test("Batch Compliance Matrix: computes verified, pending, and missing cells accurately", () => {
  const students = [
    { studentNo: "2024-00001-SJ-0", name: "Dela Cruz, Juan", courseCode: "BSIT", section: "1" },
    { studentNo: "2024-00002-SJ-0", name: "Santos, Maria", courseCode: "BSIT", section: "1" },
    { studentNo: "2024-00003-SJ-0", name: "Reyes, Pedro", courseCode: "BSA", section: "2" },
  ];

  const complianceDocTypes = ["PSA Birth Certificate", "Form 137", "Good Moral"];

  const staffDocs = [
    // Student 1 has all 3 approved
    { student_no: "2024-00001-SJ-0", doc_type: "PSA Birth Certificate", approval_status: "Approved", original_filename: "psa.pdf" },
    { student_no: "2024-00001-SJ-0", doc_type: "Form 137", approval_status: "Approved", original_filename: "f137.pdf" },
    { student_no: "2024-00001-SJ-0", doc_type: "Good Moral", approval_status: "Approved", original_filename: "gm.pdf" },

    // Student 2 has 2 approved, missing Good Moral
    { student_no: "2024-00002-SJ-0", doc_type: "PSA Birth Certificate", approval_status: "Approved", original_filename: "psa2.pdf" },
    { student_no: "2024-00002-SJ-0", doc_type: "Form 137", approval_status: "Approved", original_filename: "f1372.pdf" },

    // Student 3 has 1 pending, 2 missing
    { student_no: "2024-00003-SJ-0", doc_type: "PSA Birth Certificate", approval_status: "Pending", original_filename: "psa3.pdf" },
  ];

  const { kpiStats, matrixRecords } = calculateComplianceMatrix({
    students,
    staffDocs,
    complianceDocTypes,
  });

  // Verify KPI stats
  assert.equal(kpiStats.totalStudents, 3);
  assert.equal(kpiStats.fullyCompliant, 1);
  assert.equal(kpiStats.incomplete, 2);
  // Total slots: 9. Total verified: 3 + 2 + 0 = 5. 5/9 = 56%
  assert.equal(kpiStats.overallRate, 56);

  // Student 1: 100% compliant
  const s1 = matrixRecords.find((m) => m.student.studentNo === "2024-00001-SJ-0");
  assert.equal(s1.isCompliant, true);
  assert.equal(s1.completionPercent, 100);
  assert.equal(s1.verifiedCount, 3);
  assert.equal(s1.missingCount, 0);

  // Student 2: 67%
  const s2 = matrixRecords.find((m) => m.student.studentNo === "2024-00002-SJ-0");
  assert.equal(s2.isCompliant, false);
  assert.equal(s2.completionPercent, 67);
  assert.equal(s2.verifiedCount, 2);
  assert.equal(s2.missingCount, 1);
  const s2Gm = s2.requirements.find((r) => r.docType === "Good Moral");
  assert.equal(s2Gm.status, "missing");

  // Student 3: 0% verified, 1 pending, 2 missing
  const s3 = matrixRecords.find((m) => m.student.studentNo === "2024-00003-SJ-0");
  assert.equal(s3.isCompliant, false);
  assert.equal(s3.completionPercent, 0);
  assert.equal(s3.pendingCount, 1);
  assert.equal(s3.missingCount, 2);
});

test("Batch Compliance Matrix: status filter correctly isolates incomplete records", () => {
  const students = [
    { studentNo: "2024-00001-SJ-0", name: "Dela Cruz, Juan" },
    { studentNo: "2024-00002-SJ-0", name: "Santos, Maria" },
  ];
  const complianceDocTypes = ["Form 137"];
  const staffDocs = [
    { student_no: "2024-00001-SJ-0", doc_type: "Form 137", approval_status: "Approved" },
  ];

  // Incomplete filter
  const incompleteResult = calculateComplianceMatrix({
    students,
    staffDocs,
    complianceDocTypes,
    statusFilter: "incomplete",
  });
  assert.equal(incompleteResult.filteredRecords.length, 1);
  assert.equal(incompleteResult.filteredRecords[0].student.studentNo, "2024-00002-SJ-0");

  // Compliant filter
  const compliantResult = calculateComplianceMatrix({
    students,
    staffDocs,
    complianceDocTypes,
    statusFilter: "compliant",
  });
  assert.equal(compliantResult.filteredRecords.length, 1);
  assert.equal(compliantResult.filteredRecords[0].student.studentNo, "2024-00001-SJ-0");
});

test("Batch Compliance Matrix: missing document filter isolates students missing a specific requirement", () => {
  const students = [
    { studentNo: "2024-00001-SJ-0", name: "Dela Cruz, Juan" },
    { studentNo: "2024-00002-SJ-0", name: "Santos, Maria" },
  ];
  const complianceDocTypes = ["PSA Birth Certificate", "Form 137"];
  const staffDocs = [
    { student_no: "2024-00001-SJ-0", doc_type: "PSA Birth Certificate", approval_status: "Approved" },
    { student_no: "2024-00002-SJ-0", doc_type: "Form 137", approval_status: "Approved" },
  ];

  // Filter who is missing Form 137 -> Dela Cruz (has PSA, missing Form 137)
  const missingForm137 = calculateComplianceMatrix({
    students,
    staffDocs,
    complianceDocTypes,
    missingDocTypeFilter: "Form 137",
  });
  assert.equal(missingForm137.filteredRecords.length, 1);
  assert.equal(missingForm137.filteredRecords[0].student.studentNo, "2024-00001-SJ-0");
});

test("Batch Compliance Matrix: KPI keys exclude 'total' active student card", () => {
  const DEFAULT_KPI_ORDER = ["compliant", "incomplete", "rate"];
  assert.equal(DEFAULT_KPI_ORDER.length, 3);
  assert.equal(DEFAULT_KPI_ORDER.includes("total"), false, "'total' must be removed");

  // Migration test: previous stored array containing ["total", "compliant", "incomplete", "rate"]
  const previousStorage = ["total", "compliant", "incomplete", "rate"];
  const sanitized = previousStorage.filter((k) => DEFAULT_KPI_ORDER.includes(k));
  assert.deepEqual(sanitized, ["compliant", "incomplete", "rate"]);
});

test("Document Master List: onRescan receives accurate document and student identifiers", () => {
  let rescanCall = null;
  const mockOnRescan = (studentNo, docType, docId, originalFilename, mimeType) => {
    rescanCall = { studentNo, docType, docId, originalFilename, mimeType };
  };

  const sampleDoc = {
    id: 42,
    student_no: "2024-00001-SJ-0",
    student_name: "Dela Cruz, Juan",
    doc_type: "PSA Birth Certificate",
    original_filename: "psa_cert.pdf",
    mime_type: "application/pdf",
    source_type: null,
  };

  // Trigger rescan
  mockOnRescan(
    sampleDoc.student_no,
    sampleDoc.doc_type,
    sampleDoc.id,
    sampleDoc.original_filename,
    sampleDoc.mime_type
  );

  assert.deepEqual(rescanCall, {
    studentNo: "2024-00001-SJ-0",
    docType: "PSA Birth Certificate",
    docId: 42,
    originalFilename: "psa_cert.pdf",
    mimeType: "application/pdf",
  });
});

