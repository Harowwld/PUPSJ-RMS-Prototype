import assert from "node:assert/strict";
import test from "node:test";
import { normalizeProposalStatus, PROPOSAL_STATUSES } from "../src/lib/constants.js";

test("OSAS Proposal Status Constants & Normalization", () => {
  assert.deepEqual(PROPOSAL_STATUSES, [
    "Submitted",
    "Under Review",
    "Needs Revision",
    "Approved",
    "Declined",
  ]);

  // Submitted / Pending
  assert.equal(normalizeProposalStatus("Submitted"), "Submitted");
  assert.equal(normalizeProposalStatus("submitted"), "Submitted");
  assert.equal(normalizeProposalStatus("Pending"), "Submitted");
  assert.equal(normalizeProposalStatus("pending"), "Submitted");

  // Under Review / In Progress
  assert.equal(normalizeProposalStatus("Under Review"), "Under Review");
  assert.equal(normalizeProposalStatus("under review"), "Under Review");
  assert.equal(normalizeProposalStatus("UnderReview"), "Under Review");
  assert.equal(normalizeProposalStatus("inprogress"), "Under Review");

  // Needs Revision / Revisions Requested
  assert.equal(normalizeProposalStatus("Needs Revision"), "Needs Revision");
  assert.equal(normalizeProposalStatus("needs revision"), "Needs Revision");
  assert.equal(normalizeProposalStatus("RevisionsRequested"), "Needs Revision");
  assert.equal(normalizeProposalStatus("revision"), "Needs Revision");

  // Approved
  assert.equal(normalizeProposalStatus("Approved"), "Approved");
  assert.equal(normalizeProposalStatus("approved"), "Approved");
  assert.equal(normalizeProposalStatus("completed"), "Approved");

  // Declined / Rejected
  assert.equal(normalizeProposalStatus("Declined"), "Declined");
  assert.equal(normalizeProposalStatus("declined"), "Declined");
  assert.equal(normalizeProposalStatus("Rejected"), "Declined");
  assert.equal(normalizeProposalStatus("rejected"), "Declined");

  // Archived
  assert.equal(normalizeProposalStatus("Archived"), "Archived");
  assert.equal(normalizeProposalStatus("archived"), "Archived");
});

test("OSAS Proposal Review Status Filter Matching", () => {
  const sampleProposals = [
    { id: 1, title: "Hackathon 2026", status: "Submitted", organization_name: "AITS" },
    { id: 2, title: "Leadership Seminar", status: "Under Review", organization_name: "JPCS" },
    { id: 3, title: "Sports Fest", status: "Needs Revision", organization_name: "CSC" },
    { id: 4, title: "Year-End Gala", status: "Approved", organization_name: "AITS" },
    { id: 5, title: "Unaccredited Gathering", status: "Declined", organization_name: "PICE" },
  ];

  const filterFn = (proposals, selectedStatuses, selectedOrgs = [], query = "") => {
    const q = (query || "").trim().toLowerCase();
    return proposals.filter((item) => {
      const matchesSearch =
        !q ||
        (item.title || "").toLowerCase().includes(q) ||
        (item.organization_name || "").toLowerCase().includes(q) ||
        (item.status || "").toLowerCase().includes(q);

      const itemStatusNorm = normalizeProposalStatus(item.status);
      const matchesStatus =
        selectedStatuses.length === 0 ||
        selectedStatuses.some(
          (st) =>
            normalizeProposalStatus(st) === itemStatusNorm ||
            String(st).toLowerCase() === String(item.status || "").toLowerCase()
        );

      const matchesOrg =
        selectedOrgs.length === 0 || selectedOrgs.includes(item.organization_name || "General");

      return matchesSearch && matchesStatus && matchesOrg;
    });
  };

  // 1. No filters: returns all
  assert.equal(filterFn(sampleProposals, []).length, 5);

  // 2. Filter by Submitted
  const submittedMatches = filterFn(sampleProposals, ["Submitted"]);
  assert.equal(submittedMatches.length, 1);
  assert.equal(submittedMatches[0].id, 1);

  // 3. Filter by Under Review
  const underReviewMatches = filterFn(sampleProposals, ["Under Review"]);
  assert.equal(underReviewMatches.length, 1);
  assert.equal(underReviewMatches[0].id, 2);

  // 4. Filter by legacy alias "UnderReview"
  const underReviewAliasMatches = filterFn(sampleProposals, ["UnderReview"]);
  assert.equal(underReviewAliasMatches.length, 1);
  assert.equal(underReviewAliasMatches[0].id, 2);

  // 5. Filter by Needs Revision
  const needsRevisionMatches = filterFn(sampleProposals, ["Needs Revision"]);
  assert.equal(needsRevisionMatches.length, 1);
  assert.equal(needsRevisionMatches[0].id, 3);

  // 6. Filter by Approved
  const approvedMatches = filterFn(sampleProposals, ["Approved"]);
  assert.equal(approvedMatches.length, 1);
  assert.equal(approvedMatches[0].id, 4);

  // 7. Filter by Declined
  const declinedMatches = filterFn(sampleProposals, ["Declined"]);
  assert.equal(declinedMatches.length, 1);
  assert.equal(declinedMatches[0].id, 5);

  // 8. Multi-select: Submitted + Approved
  const multiMatches = filterFn(sampleProposals, ["Submitted", "Approved"]);
  assert.equal(multiMatches.length, 2);
  assert.deepEqual(multiMatches.map((p) => p.id), [1, 4]);

  // 9. Combined Status + Organization filter
  const orgAndStatusMatches = filterFn(sampleProposals, ["Approved"], ["AITS"]);
  assert.equal(orgAndStatusMatches.length, 1);
  assert.equal(orgAndStatusMatches[0].id, 4);

  // 10. Status + Org with no intersection
  const noIntersectionMatches = filterFn(sampleProposals, ["Approved"], ["JPCS"]);
  assert.equal(noIntersectionMatches.length, 0);

  // 11. Count calculation logic test
  const statusOptions = [
    { value: "Submitted", label: "Submitted", count: sampleProposals.filter((p) => normalizeProposalStatus(p.status) === "Submitted").length },
    { value: "Under Review", label: "Under Review", count: sampleProposals.filter((p) => normalizeProposalStatus(p.status) === "Under Review").length },
    { value: "Needs Revision", label: "Needs Revision", count: sampleProposals.filter((p) => normalizeProposalStatus(p.status) === "Needs Revision").length },
    { value: "Approved", label: "Approved", count: sampleProposals.filter((p) => normalizeProposalStatus(p.status) === "Approved").length },
    { value: "Declined", label: "Declined", count: sampleProposals.filter((p) => normalizeProposalStatus(p.status) === "Declined").length },
  ];
  for (const opt of statusOptions) {
    assert.equal(opt.count, 1, `Expected count of 1 for status ${opt.value}`);
  }
});
