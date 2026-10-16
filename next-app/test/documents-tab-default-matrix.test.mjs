import assert from "node:assert/strict";
import test from "node:test";

// Simulate the refreshDocuments default view logic from staff/page.js
function buildDefaultDocsRows({ isOsas, staffDocs, students }) {
  const defaultDocs = isOsas
    ? staffDocs
    : staffDocs.filter((doc) => doc.source_type !== "event_proposal");

  return defaultDocs.map((doc) => {
    const matchedStudent = students.find(
      (s) => String(s.studentNo || "").trim() === String(doc.student_no || "").trim()
    );
    return {
      id: doc.id,
      student_no: doc.student_no,
      student_name: doc.student_name || matchedStudent?.name || doc.student_no,
      doc_type: doc.doc_type,
      status: "uploaded",
      verificationStatus: doc.approval_status === "Approved" ? "verified" : "unverified",
      doc,
      reviewDoc: doc,
      student: matchedStudent || null,
    };
  });
}

test("Registrar Documents Tab: shows uploaded documents by default instead of empty list", () => {
  const students = [
    { studentNo: "2021-00001-SJ-0", name: "Dela Cruz, Juan" },
    { studentNo: "2021-00002-SJ-0", name: "Santos, Maria" },
  ];

  const staffDocs = [
    {
      id: 101,
      student_no: "2021-00001-SJ-0",
      doc_type: "Transcript of Records",
      approval_status: "Approved",
      original_filename: "tor_delacruz.pdf",
      source_type: null,
    },
    {
      id: 102,
      student_no: "2021-00002-SJ-0",
      doc_type: "PSA Birth Certificate",
      approval_status: "Pending",
      original_filename: "psa_santos.pdf",
      source_type: null,
    },
  ];

  const rows = buildDefaultDocsRows({ isOsas: false, staffDocs, students });

  assert.equal(rows.length, 2, "Registrar should have 2 documents showing by default");
  assert.equal(rows[0].student_name, "Dela Cruz, Juan");
  assert.equal(rows[0].doc_type, "Transcript of Records");
  assert.equal(rows[0].status, "uploaded");
  assert.equal(rows[0].verificationStatus, "verified");
  assert.equal(rows[0].student?.studentNo, "2021-00001-SJ-0");

  assert.equal(rows[1].student_name, "Santos, Maria");
  assert.equal(rows[1].doc_type, "PSA Birth Certificate");
  assert.equal(rows[1].status, "uploaded");
  assert.equal(rows[1].verificationStatus, "unverified");
});

test("Registrar Documents Tab: excludes event_proposal if present in staffDocs", () => {
  const students = [
    { studentNo: "2021-00001-SJ-0", name: "Dela Cruz, Juan" },
  ];

  const staffDocs = [
    {
      id: 101,
      student_no: "2021-00001-SJ-0",
      doc_type: "Transcript of Records",
      approval_status: "Approved",
      source_type: null,
    },
    {
      id: 999,
      student_no: "ORG-001",
      doc_type: "Event Proposal",
      approval_status: "Approved",
      source_type: "event_proposal",
    },
  ];

  const rows = buildDefaultDocsRows({ isOsas: false, staffDocs, students });

  assert.equal(rows.length, 1, "Registrar must filter out event proposals");
  assert.equal(rows[0].id, 101);
});

test("OSAS Documents Tab: shows both event proposals and regular OSAS documents by default", () => {
  const students = [];

  const staffDocs = [
    {
      id: 201,
      student_no: "ORG-001",
      student_name: "Junior Philippine Computer Society",
      doc_type: "Event Proposal",
      approval_status: "Approved",
      source_type: "event_proposal",
    },
    {
      id: 202,
      student_no: "ORG-002",
      student_name: "Association of Computing Machinery",
      doc_type: "Constitution and By-Laws",
      approval_status: "Pending",
      source_type: null,
    },
  ];

  const rows = buildDefaultDocsRows({ isOsas: true, staffDocs, students });

  assert.equal(rows.length, 2, "OSAS should include all OSAS documents by default");
  assert.equal(rows[0].doc_type, "Event Proposal");
  assert.equal(rows[1].doc_type, "Constitution and By-Laws");
});
