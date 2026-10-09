import dotenv from "dotenv";
dotenv.config({ path: ".env" });

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

async function run() {
  console.log("=== Testing Failed Documents Clearance ===");

  // 1. Log in as Registrar Staff
  console.log("\n[1] Logging in as staff.registrar@pup.local...");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "staff.registrar@pup.local",
      password: STAFF_PASSWORD,
    }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
  }
  const auth = extractCookies(loginRes);
  console.log("✓ Logged in successfully");

  // 2. Fetch Failed documents
  console.log("\n[2] Fetching failed review documents (GET /api/ingest/review?status=Failed)...");
  const getRes = await fetch(`${BASE_URL}/api/ingest/review?status=Failed`, {
    headers: {
      cookie: auth.cookieHeader,
    },
  });
  const getJson = await getRes.json();
  console.log(`Response status: ${getRes.status}, ok: ${getJson.ok}, total: ${getJson.data?.total}`);
  console.log(`Found ${getJson.data?.rows?.length || 0} failed rows.`);
  const failedRows = getJson.data?.rows || [];

  if (failedRows.length === 0) {
    console.log("No failed rows currently. Inserting mock failed items to verify...");
    const { dbRun } = await import("../src/lib/postgresCompat.js");
    await dbRun(
      `INSERT INTO ingest_queue (office_id, original_filename, storage_filename, mime_type, size_bytes, status, review_status, last_error)
       VALUES ('registrar', 'test-failed-1.pdf', 'fake-path-1.pdf', 'application/pdf', 1024, 'failed', 'Failed', 'Test OCR failure 1'),
              ('registrar', 'test-failed-2.pdf', 'fake-path-2.pdf', 'application/pdf', 2048, 'failed', 'Failed', 'Test OCR failure 2')`
    );
    console.log("Inserted 2 mock failed items.");
  }

  // Refetch
  const getRes2 = await fetch(`${BASE_URL}/api/ingest/review?status=Failed`, {
    headers: { cookie: auth.cookieHeader },
  });
  const getJson2 = await getRes2.json();
  const rowsToTest = getJson2.data?.rows || [];
  console.log(`Now testing with ${rowsToTest.length} failed rows.`);
  if (rowsToTest.length === 0) {
    throw new Error("Expected at least 1 failed row to test");
  }

  // 3. Test single dismiss DELETE /api/ingest/review/:id
  const itemToDismiss = rowsToTest[0];
  console.log(`\n[3] Testing single dismiss: DELETE /api/ingest/review/${itemToDismiss.id}...`);
  const dismissRes = await fetch(`${BASE_URL}/api/ingest/review/${itemToDismiss.id}`, {
    method: "DELETE",
    headers: { cookie: auth.cookieHeader },
  });
  const text = await dismissRes.text();
  console.log(`Dismiss status: ${dismissRes.status}, text: "${text}"`);
  const dismissJson = JSON.parse(text);
  if (!dismissRes.ok || !dismissJson.ok) {
    throw new Error(`Dismiss failed: ${JSON.stringify(dismissJson)}`);
  }
  console.log(`✓ Single dismiss succeeded for ID ${itemToDismiss.id}`);

  // 4. Test bulk clear DELETE /api/ingest/review?status=Failed
  console.log("\n[4] Testing bulk clear: DELETE /api/ingest/review?status=Failed...");
  const clearRes = await fetch(`${BASE_URL}/api/ingest/review?status=Failed`, {
    method: "DELETE",
    headers: { cookie: auth.cookieHeader },
  });
  const clearJson = await clearRes.json();
  console.log("Clear all response:", clearJson);
  if (!clearRes.ok || !clearJson.ok) {
    throw new Error(`Clear all failed: ${JSON.stringify(clearJson)}`);
  }
  console.log(`✓ Clear all succeeded: cleared ${clearJson.data?.clearedCount} item(s)`);

  // 5. Verify queue is now empty for Failed status
  console.log("\n[5] Verifying queue status after clearance...");
  const verifyRes = await fetch(`${BASE_URL}/api/ingest/review?status=Failed`, {
    headers: { cookie: auth.cookieHeader },
  });
  const verifyJson = await verifyRes.json();
  console.log(`Total remaining failed items: ${verifyJson.data?.total}`);
  if (verifyJson.data?.total !== 0) {
    throw new Error(`Expected 0 failed items, but found ${verifyJson.data?.total}`);
  }
  console.log("✓ All failed documents cleared successfully!");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
