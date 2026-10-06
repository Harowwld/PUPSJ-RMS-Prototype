import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import assert from "node:assert/strict";

const { getRequestCharterStatus, formatCharterDeadline } = await import("../src/lib/citizenCharter.js");
const { formatPHDateTime, formatPHDateTimeParts, formatRelativeTime } = await import("../src/lib/timeFormat.js");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const STAFF_PASSWORD = process.env.DEFAULT_STAFF_PASSWORD || "pupstaff";

function extractCookies(res) {
  const setCookies = res.headers.getSetCookie();
  const cookies = {};
  for (const sc of setCookies) {
    const [pair] = sc.split(";");
    const [k, v] = pair.split("=");
    if (k && v) cookies[k.trim()] = v.trim();
  }
  return {
    cookieHeader: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; "),
    csrfToken: cookies["pup_csrf"] || "",
  };
}

async function runTests() {
  console.log("=== STARTING DOCUMENT REQUESTS ANALYTICS & DATES TEST ===");

  // 1. Authenticate as Registrar Admin
  console.log("\n[Test 1] Authenticating as Registrar Admin...");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin.registrar@pup.local", password: STAFF_PASSWORD }),
  });
  assert.equal(loginRes.status, 200);
  const auth = extractCookies(loginRes);
  console.log("✓ Authenticated successfully.");

  // 2. Fetch default request analytics (no date filter)
  console.log("\n[Test 2] Fetching request analytics without date filter...");
  const defaultRes = await fetch(`${BASE_URL}/api/analytics/document-requests`, {
    headers: { cookie: auth.cookieHeader },
  });
  assert.equal(defaultRes.status, 200);
  const defaultJson = await defaultRes.json();
  assert.equal(defaultJson.ok, true);

  const { trends, totalRequests } = defaultJson.data;
  console.log(`✓ Total requests found: ${totalRequests}`);
  assert.ok(totalRequests > 0, "Should have requests returned");

  // Verify daily trend items have no "undefined" or "NaN"
  console.log(`Checking ${trends.daily.length} daily trend items...`);
  assert.ok(trends.daily.length > 0);
  for (const item of trends.daily) {
    assert.doesNotMatch(item.name, /undefined/i, `Daily trend item should not contain undefined: ${item.name}`);
    assert.doesNotMatch(item.name, /NaN/i, `Daily trend item should not contain NaN: ${item.name}`);
    assert.ok(Number.isInteger(item.count) && item.count >= 0);
  }
  console.log("Sample daily trend items:", trends.daily.slice(0, 3));

  // Verify weekly trend items
  console.log(`Checking ${trends.weekly.length} weekly trend items...`);
  assert.ok(trends.weekly.length > 0);
  for (const item of trends.weekly) {
    assert.doesNotMatch(item.name, /undefined/i, `Weekly trend item should not contain undefined: ${item.name}`);
    assert.doesNotMatch(item.name, /NaN/i, `Weekly trend item should not contain NaN: ${item.name}`);
    assert.ok(Number.isInteger(item.count) && item.count >= 0);
  }
  console.log("Sample weekly trend items:", trends.weekly.slice(0, 3));

  // Verify monthly trend items
  console.log(`Checking ${trends.monthly.length} monthly trend items...`);
  assert.ok(trends.monthly.length > 0);
  for (const item of trends.monthly) {
    assert.doesNotMatch(item.name, /undefined/i, `Monthly trend item should not contain undefined: ${item.name}`);
    assert.doesNotMatch(item.name, /NaN/i, `Monthly trend item should not contain NaN: ${item.name}`);
    assert.ok(Number.isInteger(item.count) && item.count >= 0);
  }
  console.log("Sample monthly trend items:", trends.monthly);

  // 3. Date range filter
  console.log("\n[Test 3] Fetching with date range: 2026-09-10 to 2026-09-15...");
  const rangeRes = await fetch(`${BASE_URL}/api/analytics/document-requests?startDate=2026-09-10&endDate=2026-09-15`, {
    headers: { cookie: auth.cookieHeader },
  });
  assert.equal(rangeRes.status, 200);
  const rangeJson = await rangeRes.json();
  assert.equal(rangeJson.ok, true);
  assert.equal(rangeJson.data.totalRequests, 18, "Should find exactly 18 requests in the 2026-09-10..2026-09-15 range");
  console.log(`✓ Date range filter returned ${rangeJson.data.totalRequests} requests`);

  for (const item of rangeJson.data.trends.daily) {
    assert.doesNotMatch(item.name, /undefined/i);
    assert.doesNotMatch(item.name, /NaN/i);
  }

  // 4. Single-day filter
  console.log("\n[Test 4] Fetching with single-day filter: 2026-09-10...");
  const singleRes = await fetch(`${BASE_URL}/api/analytics/document-requests?startDate=2026-09-10&endDate=2026-09-10`, {
    headers: { cookie: auth.cookieHeader },
  });
  assert.equal(singleRes.status, 200);
  const singleJson = await singleRes.json();
  assert.equal(singleJson.ok, true);
  assert.equal(singleJson.data.totalRequests, 9, "Should find 9 requests on 2026-09-10");
  assert.equal(singleJson.data.trends.daily.length, 1);
  assert.equal(singleJson.data.trends.daily[0].name, "Sep 10");
  assert.equal(singleJson.data.trends.daily[0].count, 9);
  console.log("✓ Single-day filter returned exactly 9 requests with clean label 'Sep 10'");

  // 5. Inverted start/end date
  console.log("\n[Test 5] Fetching with inverted dates (startDate > endDate)...");
  const invertedRes = await fetch(`${BASE_URL}/api/analytics/document-requests?startDate=2026-09-15&endDate=2026-09-10`, {
    headers: { cookie: auth.cookieHeader },
  });
  assert.equal(invertedRes.status, 200);
  const invertedJson = await invertedRes.json();
  assert.equal(invertedJson.ok, true);
  assert.equal(invertedJson.data.totalRequests, 18, "Inverted dates should be normalized and return 18");
  console.log("✓ Inverted date range handled gracefully.");

  // 6. Test citizenCharter and timeFormat unit checks
  console.log("\n[Test 6] Testing citizenCharter and timeFormat edge cases...");
  const charterDate = getRequestCharterStatus({
    doc_type: "Certificate of Grades",
    created_at: new Date("2026-09-10T08:00:00Z"),
    status: "Pending",
  });
  assert.doesNotMatch(charterDate.label, /undefined|NaN/i);
  assert.doesNotMatch(charterDate.deadlineFormatted, /undefined|NaN/i);

  const charterInvalid = getRequestCharterStatus({
    doc_type: "Transcript of Records",
    created_at: "invalid-date",
    status: "Completed",
    updated_at: "also-invalid",
  });
  assert.doesNotMatch(charterInvalid.label, /undefined|NaN/i);
  assert.doesNotMatch(charterInvalid.deadlineFormatted, /undefined|NaN/i);

  const formattedDate = formatPHDateTime(new Date("2026-09-10T01:49:55.520Z"));
  assert.ok(formattedDate.includes("2026") || formattedDate.includes("09"), "Date should format properly");
  assert.doesNotMatch(formattedDate, /undefined|NaN/i);

  console.log("✓ citizenCharter and timeFormat edge cases all verified.");
  console.log("\n=== ALL DOCUMENT REQUESTS ANALYTICS & DATE TESTS PASSED ===");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
