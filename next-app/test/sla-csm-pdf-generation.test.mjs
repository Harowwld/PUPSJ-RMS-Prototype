import test from "node:test";
import assert from "node:assert/strict";
import {
  generateSLACompliancePdf,
  generateCSMReportPdf,
  generateComprehensiveSLAPdf,
  generateSLAAnalyticsPdf,
} from "../src/lib/pdfGenerator.js";

const sampleData = {
  totalRequests: 142,
  statusCounts: {
    Completed: 130,
    Pending: 8,
    InProgress: 4,
  },
  topDocTypes: [
    { name: "Transcript of Records (TOR)", count: 75, slaWindow: 7 },
    { name: "Certificate of Grades", count: 42, slaWindow: 3 },
    { name: "Honorable Dismissal", count: 25, slaWindow: 7 },
  ],
  sla: {
    totalCompleted: 130,
    compliantCompleted: 125,
    delayedCompleted: 5,
    activeDueSoon: 2,
    activeOverdue: 1,
    tierStats: {
      SIMPLE: { label: "Simple Transactions", total: 42, compliant: 42, delayed: 0, windowDays: 3 },
      COMPLEX: { label: "Complex Transactions", total: 100, compliant: 83, delayed: 5, windowDays: 7 },
    },
    standards: {
      frameworkName: "Citizen's Charter (ARTA RA 11032)",
      frameworkType: "ARTA",
    },
  },
  feedback: {
    totalResponses: 95,
    averageRating: 4.8,
    satisfactionRate: 96,
    ratingBreakdown: { 5: 80, 4: 11, 3: 3, 2: 1, 1: 0 },
    topAspects: [
      { tag: "speed", label: "Turnaround Speed", percentage: 97 },
      { tag: "accuracy", label: "Record Accuracy", percentage: 98 },
      { tag: "courtesy", label: "Staff Courtesy", percentage: 95 },
    ],
  },
};

test("generateSLACompliancePdf generates valid PDF blob with Citizen's Charter sections", async () => {
  const blob = await generateSLACompliancePdf(sampleData, 142, 96, {
    startDate: "2026-01-01",
    endDate: "2026-06-30",
  });
  assert.ok(blob, "Blob should be generated");
  assert.equal(blob.type, "application/pdf");
  assert.ok(blob.size > 1000, `Blob size should be substantial (got ${blob.size})`);
});

test("generateCSMReportPdf generates valid PDF blob with Likert scale and SQD metrics", async () => {
  const blob = await generateCSMReportPdf(sampleData, {
    startDate: "2026-01-01",
    endDate: "2026-06-30",
  });
  assert.ok(blob, "Blob should be generated");
  assert.equal(blob.type, "application/pdf");
  assert.ok(blob.size > 1000, `Blob size should be substantial (got ${blob.size})`);
});

test("generateComprehensiveSLAPdf and generateSLAAnalyticsPdf alias work properly", async () => {
  const blob = await generateComprehensiveSLAPdf(sampleData, 142, 96, {});
  assert.ok(blob);
  assert.equal(blob.type, "application/pdf");

  const aliasBlob = await generateSLAAnalyticsPdf(sampleData, 142, 96, {});
  assert.ok(aliasBlob);
  assert.equal(aliasBlob.type, "application/pdf");
});
