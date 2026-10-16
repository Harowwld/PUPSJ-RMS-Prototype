import test from "node:test";
import assert from "node:assert/strict";

test("Platform Audit Trail - API search and pagination semantics", async () => {
  const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

  const password = process.env.DEFAULT_STAFF_PASSWORD || "pupstaff";

  // 1. Authenticate as SuperAdmin
  let loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "superadmin@pup.local", password }),
  });

  const loginJson = await loginRes.json();
  if (loginJson.requires2FA) {
    const rawCookies = loginRes.headers.getSetCookie();
    const cookieHeader = rawCookies.map((c) => c.split(";")[0]).join("; ");
    // Verify 2FA
    loginRes = await fetch(`${BASE_URL}/api/auth/login/verify-2fa`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: cookieHeader },
      body: JSON.stringify({ token: "000000" }),
    });
  }
  assert.equal(loginRes.status, 200, `SuperAdmin login should succeed: ${JSON.stringify(loginJson)}`);

  const rawCookies = loginRes.headers.getSetCookie();
  const cookieHeader = rawCookies.map((c) => c.split(";")[0]).join("; ");

  // 2. Fetch page 1 with no search
  const resAll = await fetch(`${BASE_URL}/api/audit-logs/global?limit=10&offset=0`, {
    headers: { cookie: cookieHeader },
  });
  assert.equal(resAll.status, 200);
  const jsonAll = await resAll.json();
  assert.equal(jsonAll.ok, true);
  const totalAll = Number(jsonAll.total || 0);
  assert.ok(typeof totalAll === "number" && totalAll > 0);

  // 3. Fetch with search filter (e.g. "Admin")
  const resSearch = await fetch(`${BASE_URL}/api/audit-logs/global?limit=10&offset=0&search=Admin`, {
    headers: { cookie: cookieHeader },
  });
  assert.equal(resSearch.status, 200);
  const jsonSearch = await resSearch.json();
  assert.equal(jsonSearch.ok, true);
  const totalSearch = Number(jsonSearch.total || 0);
  assert.ok(totalSearch <= totalAll, "Filtered total must be <= total unfiltered logs");

  // 4. Verify cleared search restores full results at page 1
  const resCleared = await fetch(`${BASE_URL}/api/audit-logs/global?limit=10&offset=0&search=`, {
    headers: { cookie: cookieHeader },
  });
  assert.equal(resCleared.status, 200);
  const jsonCleared = await resCleared.json();
  assert.equal(jsonCleared.ok, true);
  assert.ok(Number(jsonCleared.total) >= totalAll, "Clearing search parameter must return total records");

  // 5. Verify high offset beyond search results behavior (illustrates why client clamps page to 1)
  const resHighOffset = await fetch(`${BASE_URL}/api/audit-logs/global?limit=10&offset=10000&search=Admin`, {
    headers: { cookie: cookieHeader },
  });
  assert.equal(resHighOffset.status, 200);
  const jsonHighOffset = await resHighOffset.json();
  assert.equal(jsonHighOffset.ok, true);
  assert.equal(jsonHighOffset.data.length, 0, "High offset returns 0 rows, necessitating client page-clamp");
});

test("Platform Audit Trail - URL param builder cleans up search and page=1", () => {
  function simulateUpdateUrl(currentSearch, newPage, newSearch) {
    const params = new URLSearchParams(currentSearch);

    const cleanSearch = typeof newSearch === "string" ? newSearch.trim() : "";
    if (cleanSearch) {
      params.set("search", cleanSearch);
    } else {
      params.delete("search");
    }

    const cleanPage = Number(newPage) || 1;
    if (cleanPage > 1) {
      params.set("page", String(cleanPage));
    } else {
      params.delete("page");
    }

    return params.toString();
  }

  // Initial state with page=2 and search=Marcus
  const initial = "view=logs&page=2&search=Marcus";

  // Clearing search resets page to 1
  const cleared = simulateUpdateUrl(initial, 1, "");
  assert.equal(cleared, "view=logs", "Clearing search must completely remove search and page params");

  // Paginating to page 3 without search
  const paged = simulateUpdateUrl("view=logs", 3, "");
  assert.equal(paged, "view=logs&page=3");

  // Typing a search query while on page 3 resets page to 1
  const searched = simulateUpdateUrl(paged, 1, "test");
  assert.equal(searched, "view=logs&search=test", "Searching must set search and delete page param");

  // Paginating to page 2 while searching
  const searchedPage2 = simulateUpdateUrl(searched, 2, "test");
  assert.equal(searchedPage2, "view=logs&search=test&page=2");

  // Clearing search while on page 2
  const clearedFromPage2 = simulateUpdateUrl(searchedPage2, 1, "");
  assert.equal(clearedFromPage2, "view=logs", "Clearing search while on page 2 removes both search and page");
});
