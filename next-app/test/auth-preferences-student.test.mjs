import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function handler(method, bindings) {
  const source = await readFile(new URL(`../src/app/api/auth/preferences/route.js`, import.meta.url), "utf8");
  const code = source.replace(/^import\s+[\s\S]*?\s+from\s+["'][^"']+["'];\s*/gm, "").replace(/^export /gm, "");
  return new Function(...Object.keys(bindings), `${code}\nreturn ${method};`)(...Object.values(bindings));
}

const defaultBindings = {
  NextResponse: {
    json: (body, init) => Response.json(body, init),
  },
  getStaffById: async () => ({ id: "staff-1", preferences: JSON.stringify({ zoom_node: 2 }) }),
  parseStaffPreferences: (value) => {
    if (!value) return {};
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  },
  updateStaffPreferences: async (_, prefs) => prefs,
  writeAuditLog: async () => {},
  requireAuth: async () => ({
    user: {
      id: "STU-123",
      principalType: "student",
      role: "Student",
      email: "student@example.com",
    },
  }),
  createAuthErrorResponse: (error, status) => Response.json({ ok: false, error }, { status }),
};

test("student preferences can be retrieved and updated without staff-only restriction", async () => {
  const getRoute = await handler("GET", defaultBindings);
  const getResponse = await getRoute(new Request("http://localhost:3000/api/auth/preferences"));
  assert.equal(getResponse.status, 200);
  const getJson = await getResponse.json();
  assert.equal(getJson.ok, true);
  assert.equal(getJson.data.zoom_node, 3);

  const postRoute = await handler("POST", defaultBindings);
  const postResponse = await postRoute(new Request("http://localhost:3000/api/auth/preferences", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ preferences: { zoom_node: 5 } }),
  }));
  assert.equal(postResponse.status, 200, "student should be allowed to update zoom preference");
  const postJson = await postResponse.json();
  assert.equal(postJson.ok, true);
  assert.equal(postJson.data.zoom_node, 5);
});
