import test from "node:test";
import assert from "node:assert/strict";
import {
  downloadSlaComplianceCsv,
  downloadCsmRatingsCsv,
  downloadComprehensiveSlaCsv,
} from "../src/lib/exportHelpers.js";

const sampleData = {
  totalRequests: 50,
  statusCounts: { Completed: 45, Pending: 5 },
  topDocTypes: [{ name: "Transcript of Records", count: 30 }],
  sla: {
    totalCompleted: 45,
    compliantCompleted: 43,
    delayedCompleted: 2,
    activeOverdue: 0,
    tierStats: {
      SIMPLE: { label: "Simple Transactions", total: 20, compliant: 20, delayed: 0, windowDays: 3 },
    },
  },
  feedback: {
    totalResponses: 35,
    averageRating: 4.9,
    satisfactionRate: 98,
    ratingBreakdown: { 5: 33, 4: 2, 3: 0, 2: 0, 1: 0 },
    topAspects: [{ label: "Turnaround Speed", percentage: 99 }],
  },
};

test("CSV export functions exist and are callable", () => {
  assert.equal(typeof downloadSlaComplianceCsv, "function");
  assert.equal(typeof downloadCsmRatingsCsv, "function");
  assert.equal(typeof downloadComprehensiveSlaCsv, "function");
});
