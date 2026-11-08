import test from "node:test";
import assert from "node:assert/strict";
import { matchStudentsByConfiguredOcrName } from "../src/lib/studentNameMatcher.js";

test("configured OCR-name matcher honors exact normalized-distance boundaries", () => {
  const cases = [
    { label: "0%", target: "A".repeat(20), observed: "A".repeat(20), include: true, distance: 0 },
    { label: "5%", target: "A".repeat(20), observed: `${"A".repeat(19)}B`, include: true, distance: 1 },
    { label: "8%", target: "A".repeat(25), observed: `${"A".repeat(23)}BB`, include: true, distance: 2 },
    { label: "exactly 10%", target: "A".repeat(20), observed: `${"A".repeat(18)}BB`, include: true, distance: 2 },
    { label: "above 10%", target: "A".repeat(20), observed: `${"A".repeat(17)}BBB`, include: false, distance: 3 },
  ];

  for (const { label, target, observed, include, distance } of cases) {
    const roster = [{ studentNo: "SYNTH-1", name: target }];
    const candidates = matchStudentsByConfiguredOcrName(observed, roster);
    assert.equal(candidates.some((candidate) => candidate.studentNo === "SYNTH-1"), include, label);
    if (include) {
      assert.equal(candidates[0].mismatchRatio, distance / target.length, `${label} actual ratio`);
    }
  }
});

test("configured OCR-name matcher rejects seven normalized letters and accepts eight", () => {
  assert.deepEqual(matchStudentsByConfiguredOcrName("ABCDEFG", [{ studentNo: "S7", name: "ABCDEFG" }]), []);
  assert.deepEqual(
    matchStudentsByConfiguredOcrName("ABCDEFGH", [{ studentNo: "S8", name: "ABCDEFGH" }]).map(({ studentNo, mismatchRatio }) => ({ studentNo, mismatchRatio })),
    [{ studentNo: "S8", mismatchRatio: 0 }],
  );
});
