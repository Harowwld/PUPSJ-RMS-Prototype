import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_SLA_STANDARDS,
  buildSlaTiers,
  calculateDeadline,
  countDaysBetween,
  getArtaClassification,
  getRequestCharterStatus,
} from "../src/lib/citizenCharter.js";

test("DEFAULT_SLA_STANDARDS matches ARTA 3-7-20 standard", () => {
  assert.equal(DEFAULT_SLA_STANDARDS.frameworkName, "Citizen's Charter (ARTA RA 11032)");
  assert.equal(DEFAULT_SLA_STANDARDS.frameworkType, "ARTA");
  assert.equal(DEFAULT_SLA_STANDARDS.simpleDays, 3);
  assert.equal(DEFAULT_SLA_STANDARDS.complexDays, 7);
  assert.equal(DEFAULT_SLA_STANDARDS.highlyTechnicalDays, 20);
  assert.equal(DEFAULT_SLA_STANDARDS.workingDaysOnly, true);
});

test("buildSlaTiers constructs correct tier definitions with default standards", () => {
  const tiers = buildSlaTiers();
  assert.equal(tiers.SIMPLE.days, 3);
  assert.equal(tiers.SIMPLE.shortLabel, "Simple · 3d");
  assert.equal(tiers.COMPLEX.days, 7);
  assert.equal(tiers.COMPLEX.shortLabel, "Complex · 7d");
  assert.equal(tiers.HIGHLY_TECHNICAL.days, 20);
  assert.equal(tiers.HIGHLY_TECHNICAL.shortLabel, "Technical · 20d");
});

test("buildSlaTiers supports custom university SLA targets (e.g. 1-3-5 calendar days)", () => {
  const custom = {
    frameworkName: "Fast-Track Digital SLA",
    frameworkType: "FAST_TRACK",
    simpleDays: 1,
    complexDays: 3,
    highlyTechnicalDays: 5,
    workingDaysOnly: false,
  };
  const tiers = buildSlaTiers(custom);
  assert.equal(tiers.SIMPLE.days, 1);
  assert.equal(tiers.SIMPLE.shortLabel, "Simple · 1cd");
  assert.equal(tiers.COMPLEX.days, 3);
  assert.equal(tiers.COMPLEX.shortLabel, "Complex · 3cd");
  assert.equal(tiers.HIGHLY_TECHNICAL.days, 5);
  assert.equal(tiers.HIGHLY_TECHNICAL.shortLabel, "Technical · 5cd");
});

test("calculateDeadline skips weekends when workingDaysOnly is true", () => {
  // Friday 2026-09-04
  const friday = new Date("2026-09-04T08:00:00Z");
  // 1 working day after Friday should be Monday 2026-09-07
  const deadline1 = calculateDeadline(friday, 1, true);
  assert.equal(deadline1.toISOString().substring(0, 10), "2026-09-07");

  // 3 working days after Friday should be Wednesday 2026-09-09
  const deadline3 = calculateDeadline(friday, 3, true);
  assert.equal(deadline3.toISOString().substring(0, 10), "2026-09-09");
});

test("calculateDeadline counts consecutive days when workingDaysOnly is false", () => {
  // Friday 2026-09-04
  const friday = new Date("2026-09-04T08:00:00Z");
  // 1 calendar day after Friday should be Saturday 2026-09-05
  const deadline1 = calculateDeadline(friday, 1, false);
  assert.equal(deadline1.toISOString().substring(0, 10), "2026-09-05");

  // 3 calendar days after Friday should be Monday 2026-09-07
  const deadline3 = calculateDeadline(friday, 3, false);
  assert.equal(deadline3.toISOString().substring(0, 10), "2026-09-07");
});

test("getRequestCharterStatus respects dynamic standards for overdue status", () => {
  // Created 5 days ago (consecutive)
  const createdDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const request = {
    id: 101,
    doc_type: "Certificate of Enrollment",
    status: "Pending",
    created_at: createdDate,
  };

  // Under fast-track 1-day standard, it should be Overdue
  const fastTrackStandards = {
    frameworkName: "Fast-Track SLA",
    simpleDays: 1,
    complexDays: 2,
    highlyTechnicalDays: 4,
    workingDaysOnly: false,
  };
  const fastStatus = getRequestCharterStatus(request, fastTrackStandards);
  assert.equal(fastStatus.status, "Overdue");
  assert.equal(fastStatus.isOverdue, true);
  assert.equal(fastStatus.isCompliant, false);

  // Under generous standard of 15 days, it should NOT be overdue
  const generousStandards = {
    frameworkName: "Extended Academic SLA",
    simpleDays: 15,
    complexDays: 30,
    highlyTechnicalDays: 60,
    workingDaysOnly: false,
  };
  const generousStatus = getRequestCharterStatus(request, generousStandards);
  assert.notEqual(generousStatus.status, "Overdue");
  assert.equal(generousStatus.isOverdue, false);
  assert.equal(generousStatus.isCompliant, true);
});

test("getRequestCharterStatus marks completed requests as Compliant or Delayed based on custom SLA", () => {
  const startDate = "2026-09-01T08:00:00Z";
  // Completed on 2026-09-04 (3 days later)
  const completedDate = "2026-09-04T08:00:00Z";
  const request = {
    id: 102,
    doc_type: "Good Moral Certificate",
    status: "Completed",
    created_at: startDate,
    updated_at: completedDate,
  };

  // Standard ARTA (3 working days): Completed within 3 days -> Compliant
  const defaultStatus = getRequestCharterStatus(request);
  assert.equal(defaultStatus.status, "Compliant");
  assert.equal(defaultStatus.isCompliant, true);

  // Strict 1-day SLA: Completed in 3 days -> Delayed
  const strictStandards = {
    frameworkName: "Strict SLA",
    simpleDays: 1,
    complexDays: 2,
    highlyTechnicalDays: 3,
    workingDaysOnly: false,
  };
  const strictStatus = getRequestCharterStatus(request, strictStandards);
  assert.equal(strictStatus.status, "Delayed");
  assert.equal(strictStatus.isCompliant, false);
  assert.equal(strictStatus.isOverdue, true);
});
