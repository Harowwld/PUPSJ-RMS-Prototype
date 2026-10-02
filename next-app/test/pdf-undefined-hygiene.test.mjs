import test from "node:test";
import assert from "node:assert/strict";
import {
  generateAuditLogsPdf,
  generateDigitizationCompliancePdf,
  generateOrganizationCompliancePdf,
  generateSLAAnalyticsPdf,
  generateSampleBrandingPdf,
  generateStudentComplianceSlipPdf,
} from "../src/lib/pdfGenerator.js";

async function blobToText(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString("binary");
}

function assertNoUndefined(text, context) {
  const hasUndefined = text.includes("undefined");
  assert.equal(
    hasUndefined,
    false,
    `PDF for ${context} contained literal 'undefined'! Snippet around match: ${
      hasUndefined ? text.substring(Math.max(0, text.indexOf("undefined") - 30), text.indexOf("undefined") + 50) : ""
    }`
  );
}

test("PDF Generator: generateOrganizationCompliancePdf never renders 'undefined'", async () => {
  // 1. With completely empty objects
  const emptyBlob = await generateOrganizationCompliancePdf(
    {},
    {},
    {},
    [],
    []
  );
  const emptyText = await blobToText(emptyBlob);
  assertNoUndefined(emptyText, "generateOrganizationCompliancePdf (empty)");

  // 2. With partial OSAS view filteredSummary and organizations
  const mockSummary = {
    totalOrganizations: 3,
    overallComplianceRate: 67,
    fullyCompliantCount: 2,
    fullyCompliantRate: 67,
    partiallyCompliantCount: 1,
    actionRequiredCount: 0,
    cblArchivedCount: 3,
    cblArchivedRate: 100,
    cblPendingCount: 0,
    withOfficersCount: 2,
    withOfficersRate: 67,
    totalActiveOfficers: 6,
    withAdvisersCount: 2,
    withAdviserRate: 67,
    academicCount: 2,
    nonAcademicCount: 1,
    categoryBreakdown: [
      {
        category: "Academic",
        totalOrgs: 2,
        compliantCount: 2,
        fullyCompliantCount: 2,
        complianceRate: 100,
        cblArchivedCount: 2,
        cblArchivedRate: 100,
        withOfficersCount: 2,
        withOfficersRate: 100,
      },
      {
        category: "Non-Academic",
        totalOrgs: 1,
        compliantCount: 0,
        fullyCompliantCount: 0,
        complianceRate: 0,
        cblArchivedCount: 1,
        cblArchivedRate: 100,
        withOfficersCount: 0,
        withOfficersRate: 0,
      },
    ],
  };

  const mockOrgs = [
    {
      id: "org-1",
      name: "Computer Society",
      acronym: "CS",
      category: "Academic",
      adviserName: "Prof. Smith",
      hasCbl: true,
      activeOfficerCount: 4,
      status: "Active",
      complianceScore: 100,
      complianceStatus: "Compliant",
    },
    {
      id: "org-2",
      name: "Drama Guild",
      category: "Non-Academic",
      hasCbl: false,
      status: "Active",
      complianceScore: 50,
      complianceStatus: "Partially Compliant",
    },
  ];

  const blob = await generateOrganizationCompliancePdf(
    {},
    mockSummary,
    { generatedAt: new Date().toISOString() },
    mockOrgs,
    mockSummary.categoryBreakdown,
    { scopeNote: "Filtered View" }
  );

  const text = await blobToText(blob);
  assertNoUndefined(text, "generateOrganizationCompliancePdf (with mock data)");
});

test("PDF Generator: generateAuditLogsPdf never renders 'undefined'", async () => {
  // 1. Empty logs
  const emptyBlob = await generateAuditLogsPdf([], {});
  const emptyText = await blobToText(emptyBlob);
  assertNoUndefined(emptyText, "generateAuditLogsPdf (empty)");

  // 2. Logs with missing fields
  const mockLogs = [
    {
      id: 1,
      actor: undefined,
      role: null,
      action: "LOGIN",
      details: undefined,
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      actor: "Jane Doe",
      role: "Admin",
      action: undefined,
      details: "Performed action",
      created_at: undefined,
    },
  ];

  const blob = await generateAuditLogsPdf(mockLogs, {
    role: "Admin",
    search: "test",
  });
  const text = await blobToText(blob);
  assertNoUndefined(text, "generateAuditLogsPdf (with partial logs)");
});

test("PDF Generator: generateDigitizationCompliancePdf never renders 'undefined'", async () => {
  // 1. Empty data
  const emptyBlob = await generateDigitizationCompliancePdf({}, {}, {}, []);
  const emptyText = await blobToText(emptyBlob);
  assertNoUndefined(emptyText, "generateDigitizationCompliancePdf (empty)");

  // 2. Partial summary
  const mockSummary = {
    totalStudents: 100,
    digitizedStudents: 80,
    notDigitizedStudents: 20,
    percentDigitized: 80,
  };
  const mockByCourse = [
    { courseCode: "BSIT", total: 50, digitized: 40, percent: 80 },
    { courseCode: "BSBA", total: 50, digitized: 40, percent: undefined },
  ];

  const blob = await generateDigitizationCompliancePdf(
    {},
    mockSummary,
    {},
    mockByCourse
  );
  const text = await blobToText(blob);
  assertNoUndefined(text, "generateDigitizationCompliancePdf (partial summary)");
});

test("PDF Generator: generateSLAAnalyticsPdf never renders 'undefined'", async () => {
  // 1. Default/empty
  const emptyBlob = await generateSLAAnalyticsPdf();
  const emptyText = await blobToText(emptyBlob);
  assertNoUndefined(emptyText, "generateSLAAnalyticsPdf (empty)");

  // 2. Partial data with CSM ratings
  const mockData = {
    topDocTypes: [
      { name: "Transcript of Records", count: 42 },
      { name: undefined, count: 12 },
    ],
    feedback: {
      totalResponses: 15,
      averageRating: 4.8,
      satisfactionRate: 95,
      ratingBreakdown: { 5: 12, 4: 3 },
    },
  };

  const blob = await generateSLAAnalyticsPdf(mockData, 100, 92, {
    startDate: "2026-01-01",
    endDate: "2026-03-31",
  });
  const text = await blobToText(blob);
  assertNoUndefined(text, "generateSLAAnalyticsPdf (mock data)");
});

test("PDF Generator: generateSampleBrandingPdf never renders 'undefined'", async () => {
  // 1. Empty branding
  const emptyBlob = await generateSampleBrandingPdf({});
  const emptyText = await blobToText(emptyBlob);
  assertNoUndefined(emptyText, "generateSampleBrandingPdf (empty)");

  // 2. Partial branding
  const blob = await generateSampleBrandingPdf({
    institutionName: "Custom University",
    campusName: undefined,
    brandColor: undefined,
  });
  const text = await blobToText(blob);
  assertNoUndefined(text, "generateSampleBrandingPdf (partial branding)");

  // 3. Dual logo with custom signatory titles
  const testPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const dualBlob = await generateSampleBrandingPdf({
    institutionName: "University of the Philippines",
    campusName: "Diliman",
    logoBase64: testPng,
    secondaryLogoBase64: testPng,
    signatoryRegistrarTitle: "HEAD OF ACADEMIC ARCHIVES",
    signatoryHeadTitle: "CHANCELLOR",
  });
  const dualText = await blobToText(dualBlob);
  assertNoUndefined(dualText, "generateSampleBrandingPdf (dual logo & custom signatories)");
  assert.ok(dualText.includes("HEAD OF ACADEMIC ARCHIVES"));
  assert.ok(dualText.includes("CHANCELLOR"));
});

test("PDF Generator: generateStudentComplianceSlipPdf never renders 'undefined'", async () => {
  // 1. Empty data
  const emptyBlob = await generateStudentComplianceSlipPdf();
  const emptyText = await blobToText(emptyBlob);
  assertNoUndefined(emptyText, "generateStudentComplianceSlipPdf (empty)");

  // 2. Student with missing fields
  const mockStudent = {
    name: "Alex Dela Cruz",
    studentNo: undefined,
  };
  const mockRequirements = [
    { docType: "Form 137", category: "Academic", status: "Submitted" },
    { docType: undefined, category: undefined, status: "Missing" },
  ];
  const mockSummary = {
    totalRequired: undefined,
    submittedCount: undefined,
    complianceRate: undefined,
  };

  const blob = await generateStudentComplianceSlipPdf(
    mockStudent,
    mockRequirements,
    mockSummary
  );
  const text = await blobToText(blob);
  assertNoUndefined(text, "generateStudentComplianceSlipPdf (partial data)");
});
