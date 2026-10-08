import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ZOOM_SCALES, ZOOM_PERCENTAGES, DEFAULT_ZOOM_NODE } from "../src/hooks/useLayoutZoom.js";

async function loadRouteHandler(path, method, bindings) {
  const source = await readFile(new URL(`../src/app/api/auth/${path}/route.js`, import.meta.url), "utf8");
  const code = source
    .replace(/^import\s+[\s\S]*?\s+from\s+["'][^"']+["'];\s*/gm, "")
    .replace(/^export\s+const\s+runtime\s*=\s*["'][^"']+["'];\s*/gm, "")
    .replace(/^export /gm, "");
  return new Function(...Object.keys(bindings), `${code}\nreturn ${method};`)(...Object.values(bindings));
}

test("ZOOM_SCALES has 75% at node 0 and 100% at node 3", () => {
  assert.equal(ZOOM_SCALES.length, 7);
  assert.equal(ZOOM_SCALES[0], 0.75, "Node 0 must be 0.75 (75%)");
  assert.equal(ZOOM_SCALES[1], 0.83);
  assert.equal(ZOOM_SCALES[2], 0.92);
  assert.equal(ZOOM_SCALES[3], 1.0, "Node 3 must be 1.0 (100% default)");
  assert.equal(ZOOM_SCALES[4], 1.08);
  assert.equal(ZOOM_SCALES[5], 1.17);
  assert.equal(ZOOM_SCALES[6], 1.25);

  assert.equal(ZOOM_PERCENTAGES[0], 75);
  assert.equal(ZOOM_PERCENTAGES[3], 100);
  assert.equal(DEFAULT_ZOOM_NODE, 3);
});

test("/api/auth/preferences GET returns zoom_node default (3)", async () => {
  const mockStaff = { id: "staff-1", preferences: "{}" };
  const getHandler = await loadRouteHandler("preferences", "GET", {
    NextResponse: { json: (data, init) => ({ status: init?.status || 200, json: async () => data }) },
    requireAuth: async () => ({ user: { id: "staff-1", principalType: "staff" } }),
    createAuthErrorResponse: (msg, status) => ({ status, error: msg }),
    getStaffById: async () => mockStaff,
    parseStaffPreferences: (val) => (typeof val === "string" ? JSON.parse(val || "{}") : val || {}),
    updateStaffPreferences: async () => ({}),
    writeAuditLog: async () => {},
  });

  const req = new Request("http://localhost:3000/api/auth/preferences");
  const res = await getHandler(req);
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.ok, true);
  assert.equal(data.data.zoom_node, 3);
});

test("/api/auth/preferences POST accepts valid zoom_node (0 to 6) and rejects invalid", async () => {
  let savedPreferences = null;
  const postHandler = await loadRouteHandler("preferences", "POST", {
    NextResponse: { json: (data, init) => ({ status: init?.status || 200, json: async () => data }) },
    requireAuth: async () => ({ user: { id: "staff-1", principalType: "staff" } }),
    createAuthErrorResponse: (msg, status) => ({ status, error: msg }),
    getStaffById: async () => ({ id: "staff-1", preferences: "{}" }),
    parseStaffPreferences: (val) => (typeof val === "string" ? JSON.parse(val || "{}") : val || {}),
    updateStaffPreferences: async (userId, prefs) => {
      savedPreferences = prefs;
      return { zoom_node: prefs.zoom_node };
    },
    writeAuditLog: async () => {},
  });

  // Valid: zoom_node = 0 (75% zoom level)
  const req0 = new Request("http://localhost:3000/api/auth/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferences: { zoom_node: 0 } }),
  });
  const res0 = await postHandler(req0);
  const data0 = await res0.json();
  assert.equal(res0.status, 200);
  assert.equal(data0.ok, true);
  assert.equal(savedPreferences.zoom_node, 0);

  // Valid: zoom_node = 6 (125% zoom level)
  const req6 = new Request("http://localhost:3000/api/auth/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferences: { zoom_node: 6 } }),
  });
  const res6 = await postHandler(req6);
  const data6 = await res6.json();
  assert.equal(res6.status, 200);
  assert.equal(data6.ok, true);
  assert.equal(savedPreferences.zoom_node, 6);

  // Invalid: negative (-1)
  const reqNeg = new Request("http://localhost:3000/api/auth/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferences: { zoom_node: -1 } }),
  });
  const resNeg = await postHandler(reqNeg);
  assert.equal(resNeg.status, 400);

  // Invalid: out of bounds (7)
  const reqOut = new Request("http://localhost:3000/api/auth/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferences: { zoom_node: 7 } }),
  });
  const resOut = await postHandler(reqOut);
  assert.equal(resOut.status, 400);

  // Invalid: float (2.5)
  const reqFloat = new Request("http://localhost:3000/api/auth/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferences: { zoom_node: 2.5 } }),
  });
  const resFloat = await postHandler(reqFloat);
  assert.equal(resFloat.status, 400);

  // Invalid: string ("3")
  const reqStr = new Request("http://localhost:3000/api/auth/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferences: { zoom_node: "3" } }),
  });
  const resStr = await postHandler(reqStr);
  assert.equal(resStr.status, 400);
});
