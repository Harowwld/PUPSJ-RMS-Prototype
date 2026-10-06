import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";

dotenv.config({ path: ".env" });

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const { pool, query, queryOne } = await import("../src/lib/postgres.js");
const sections = ["hero", "bento", "workflow", "catalog", "faq", "footer"];

async function login() {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "superadmin@pup.local",
      password: process.env.DEFAULT_STAFF_PASSWORD || "pupstaff",
    }),
  });
  assert.equal(response.status, 200, "System administrator login must succeed");
  const cookie = response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  const cookies = Object.fromEntries(cookie.split("; ").map((part) => part.split("=")));
  return {
    cookie,
    csrfToken: cookies.pup_csrf || "",
    sessionCookie: cookie.split("; ").find((part) => part.startsWith("pup_session=")) || "",
  };
}

test("landing CMS content and media support authorized CRUD and reject invalid sessions", async (t) => {
  const auth = await login();
  const headers = {
    "Content-Type": "application/json",
    cookie: auth.cookie,
    "x-csrf-token": auth.csrfToken,
  };
  const auditStart = Number((await queryOne("SELECT COALESCE(MAX(id), 0) AS id FROM global_audit_logs"))?.id || 0);
  const snapshots = new Map();
  let uploadedFilename = null;

  t.after(async () => {
    for (const [section, content] of snapshots) {
      await fetch(`${BASE_URL}/api/landing/${section}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(content),
      }).catch(() => {});
    }
    const actions = sections.map((section) => `Update Landing Page ${section[0].toUpperCase()}${section.slice(1)} CMS`);
    await query(
      "DELETE FROM global_audit_logs WHERE id > $1 AND entity_type = 'LandingCMS' AND action = ANY($2::text[])",
      [auditStart, actions],
    );
    if (uploadedFilename) {
      await fs.unlink(path.join(process.cwd(), "public", "assets", "landing", uploadedFilename)).catch(() => {});
      await query("DELETE FROM global_audit_logs WHERE entity_type = 'LandingMedia' AND entity_id = $1", [uploadedFilename]);
    }
    await pool.end();
  });

  for (const section of sections) {
    const response = await fetch(`${BASE_URL}/api/landing/${section}`);
    assert.equal(response.status, 200, `${section} should be readable publicly`);
    const json = await response.json();
    assert.equal(json.ok, true);
    snapshots.set(section, json.data);
  }

  const heroOriginal = snapshots.get("hero");
  const missingCsrf = await fetch(`${BASE_URL}/api/landing/hero`, {
    method: "PUT",
    headers: { ...headers, "x-csrf-token": "invalid-token" },
    body: JSON.stringify(heroOriginal),
  });
  assert.equal(missingCsrf.status, 401, "A signed-in system admin must still provide a valid CSRF token");

  for (const section of sections) {
    const original = snapshots.get(section);
    const field = Object.keys(original).find((key) => typeof original[key] === "string" && key !== "brandName");
    assert.ok(field, `${section} should have a text field that can be updated`);
    const changed = { ...original, [field]: `CRUD-${section}-${Date.now()}` };

    const update = await fetch(`${BASE_URL}/api/landing/${section}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(changed),
    });
    assert.equal(update.status, 200, `${section} update should succeed`);
    assert.equal((await update.json()).data[field], changed[field]);

    const readback = await fetch(`${BASE_URL}/api/landing/${section}`);
    assert.equal((await readback.json()).data[field], changed[field]);

    const restore = await fetch(`${BASE_URL}/api/landing/${section}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(original),
    });
    assert.equal(restore.status, 200, `${section} should restore its original content`);
    assert.deepEqual((await restore.json()).data, original);
  }

  const uploadForm = new FormData();
  uploadForm.append("file", new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], { type: "image/png" }), "csrf-test.png");
  const invalidCsrfUpload = await fetch(`${BASE_URL}/api/landing/upload`, {
    method: "POST",
    headers: { cookie: auth.cookie, "x-csrf-token": "invalid-token" },
    body: uploadForm,
  });
  assert.equal(invalidCsrfUpload.status, 401, "Landing media upload must validate CSRF before reading or writing the file");

  const pngBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/8e4AAAAASUVORK5CYII=", "base64");
  const authorizedUploadForm = new FormData();
  authorizedUploadForm.append("file", new Blob([pngBytes], { type: "image/png" }), "landing-crud-check.png");
  const upload = await fetch(`${BASE_URL}/api/landing/upload`, {
    method: "POST",
    headers: { cookie: auth.cookie, "x-csrf-token": auth.csrfToken },
    body: authorizedUploadForm,
  });
  assert.equal(upload.status, 200);
  const uploadBody = await upload.json();
  assert.equal(uploadBody.ok, true);
  uploadedFilename = uploadBody.data.filename;
  const publicImage = await fetch(`${BASE_URL}${uploadBody.data.url}`);
  assert.equal(publicImage.status, 200);
  assert.deepEqual(Buffer.from(await publicImage.arrayBuffer()), pngBytes);

  const linkedHero = {
    ...heroOriginal,
    slides: [...heroOriginal.slides, { src: uploadBody.data.url, alt: "CRUD media fixture", label: "CRUD media fixture" }],
  };
  const linkImage = await fetch(`${BASE_URL}/api/landing/hero`, {
    method: "PUT",
    headers,
    body: JSON.stringify(linkedHero),
  });
  assert.equal(linkImage.status, 200);

  const mediaUrl = `${BASE_URL}/api/landing/upload?filename=${encodeURIComponent(uploadedFilename)}`;
  const blockedDelete = await fetch(mediaUrl, { method: "DELETE", headers });
  assert.equal(blockedDelete.status, 409, "Referenced hero media cannot be deleted");

  const unlinkImage = await fetch(`${BASE_URL}/api/landing/hero`, {
    method: "PUT",
    headers,
    body: JSON.stringify(heroOriginal),
  });
  assert.equal(unlinkImage.status, 200);

  const deletedMedia = await fetch(mediaUrl, { method: "DELETE", headers });
  assert.equal(deletedMedia.status, 200);
  const missingImage = await fetch(`${BASE_URL}${uploadBody.data.url}`);
  assert.equal(missingImage.status, 404, "Deleted media should no longer be publicly readable");

  const logout = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: { cookie: auth.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(logout.status, 200);

  const revokedSession = await fetch(`${BASE_URL}/api/landing/hero`, {
    method: "PUT",
    headers: { ...headers, cookie: auth.sessionCookie },
    body: JSON.stringify(heroOriginal),
  });
  assert.equal(revokedSession.status, 401, "A revoked session must not update CMS content");

  const revokedUpload = await fetch(`${BASE_URL}/api/landing/upload`, {
    method: "POST",
    headers: { cookie: auth.sessionCookie, "x-csrf-token": auth.csrfToken },
    body: uploadForm,
  });
  assert.equal(revokedUpload.status, 401, "A revoked session must not upload landing media");
});
