import test from "node:test";
import assert from "node:assert/strict";
import { downloadSlaCsv, downloadOrganizationComplianceCsv } from "../src/lib/exportHelpers.js";

// Mock minimal DOM for Node.js test environment
let lastExportedContent = "";
let lastFileName = "";

global.Blob = class MockBlob {
  constructor(parts) {
    lastExportedContent = parts.join("");
  }
};
global.URL = {
  createObjectURL: () => "mock-blob-url",
  revokeObjectURL: () => {},
};
global.document = {
  createElement: () => ({
    click: () => {},
    setAttribute: () => {},
    set download(name) {
      lastFileName = name;
    },
    set href(url) {},
  }),
};

test("CSV Exporter: downloadSlaCsv never renders 'undefined' or 'null'", () => {
  lastExportedContent = "";
  // 1. Partial/empty data
  downloadSlaCsv({}, undefined, undefined, () => {});
  assert.equal(lastExportedContent.includes("undefined"), false, "SLA CSV should not contain 'undefined'");
  assert.equal(lastExportedContent.includes("null"), false, "SLA CSV should not contain 'null'");

  // 2. Data with missing feedback or missing topDocTypes fields
  const mockData = {
    topDocTypes: [{ name: undefined, count: 5 }],
    statusCounts: { Approved: 2 },
    feedback: {
      totalResponses: 10,
      averageRating: undefined,
      satisfactionRate: undefined,
      ratingBreakdown: { 5: 8 },
    },
  };
  downloadSlaCsv(mockData, 10, 80, () => {});
  assert.equal(lastExportedContent.includes("undefined"), false, "SLA CSV with partial feedback should not contain 'undefined'");
});

test("CSV Exporter: downloadOrganizationComplianceCsv never renders 'undefined' or 'null'", () => {
  lastExportedContent = "";
  // 1. With completely empty objects
  downloadOrganizationComplianceCsv({}, () => {});
  assert.equal(lastExportedContent.includes("undefined"), false, "Org Compliance CSV should not contain 'undefined'");
  assert.equal(lastExportedContent.includes("null"), false, "Org Compliance CSV should not contain 'null'");

  // 2. With partial organizations and summary
  const mockData = {
    summary: {
      totalOrganizations: 2,
      activeOrganizations: undefined,
      fullyCompliantCount: undefined,
      overallComplianceRate: undefined,
      cblArchivedRate: undefined,
      cblArchivedCount: undefined,
      withOfficersRate: undefined,
      totalActiveOfficers: undefined,
      withAdviserRate: undefined,
      withAdviserCount: undefined,
    },
    organizations: [
      {
        id: "org-1",
        name: "Test Org",
        acronym: undefined,
        category: undefined,
        status: undefined,
        adviserName: undefined,
        adviserEmail: undefined,
        hasCbl: undefined,
        activeOfficerCount: undefined,
        complianceScore: undefined,
        complianceStatus: undefined,
        missingRequirements: undefined,
      },
    ],
  };

  downloadOrganizationComplianceCsv(mockData, () => {}, undefined, {
    summary: mockData.summary,
    organizations: mockData.organizations,
    scopeNote: "Filtered Scope",
  });

  assert.equal(lastExportedContent.includes("undefined"), false, "Org Compliance CSV should not contain 'undefined'");
  assert.equal(lastExportedContent.includes("null"), false, "Org Compliance CSV should not contain 'null'");
});
