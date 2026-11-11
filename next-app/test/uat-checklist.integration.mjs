// Run against a freshly migrated and seeded disposable local UAT instance.
import assert from "node:assert/strict";
import { createHash, randomInt, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import test, { after, before } from "node:test";
import AdmZip from "adm-zip";
import { decodeJwt } from "jose";
import { degrees, PDFDocument } from "pdf-lib";
import puppeteer from "puppeteer-core";
import { rotateOcrPages } from "../src/lib/ocrClient.js";

const database = new URL(process.env.DATABASE_URL || "postgres://localhost/missing");
const origin = new URL(process.env.TEST_BASE_URL || "http://localhost:3000");
assert.match(database.pathname, /^\/pupsj_uat_[a-z0-9_]+$/);
assert.ok(["127.0.0.1", "localhost"].includes(database.hostname));
assert.ok(["127.0.0.1", "localhost"].includes(origin.hostname));
assert.ok(process.env.LOCAL_DATA_DIR, "Use a disposable data directory");
assert.equal(process.env.EXTERNAL_BACKUP_SIMULATE, "true", "Use simulated backup storage");
assert.ok(process.env.TEST_CHROME_EXECUTABLE, "Set TEST_CHROME_EXECUTABLE to a Chromium executable");

const { pool, query, queryOne } = await import("../src/lib/postgres.js");
const { createIngestItem, getIngestFilePath } = await import("../src/lib/ingestQueueRepo.js");
const { decryptBackupBuffer, getBackupFilePath } = await import("../src/lib/backupsRepo.js");
const { checkAndRunScheduledBackups } = await import("../src/lib/backupScheduler.js");
const staffEmail = "staff.registrar@pup.local";
const staffId = "PUPREGISTRAR-002";
const password = process.env.DEFAULT_STAFF_PASSWORD || "pupstaff";
const studentNo = `2026-${randomInt(10000, 99999)}-SJ-0`;
const checksum = (bytes) => createHash("sha256").update(bytes).digest("hex");
let staff;
let student;

async function request(path, { method = "GET", body, session } = {}) {
  const headers = { Origin: origin.origin };
  if (session) {
    headers.Cookie = session.cookie;
    headers["X-CSRF-Token"] = session.csrf;
  }
  if (body && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
  const response = await fetch(new URL(path, origin), {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  return { status: response.status, payload, cookies: response.headers.getSetCookie() };
}

async function login(username, value = password) {
  const result = await request("/api/auth/login", { method: "POST", body: { username, password: value } });
  assert.equal(result.status, 200, `Demo login failed: ${result.status}`);
  const pairs = result.cookies.map((cookie) => cookie.split(";")[0]);
  const csrf = pairs.find((pair) => pair.startsWith("pup_csrf="))?.slice("pup_csrf=".length);
  assert.ok(csrf && pairs.some((pair) => pair.startsWith("pup_session=")));
  return { cookie: pairs.join("; "), csrf: decodeURIComponent(csrf) };
}

before(async () => {
  staff = await login(staffEmail);
  const accessToken = staff.cookie.match(/(?:^|; )pup_session=([^;]+)/)[1];
  const { jti } = decodeJwt(accessToken);
  assert.ok(await queryOne("SELECT jti FROM auth_sessions WHERE jti = $1", [jti]),
    "The app must be connected to the same disposable UAT database");
  const layout = await request("/api/storage-layout", { session: staff });
  assert.equal(layout.status, 200);
  const room = layout.payload.data.rooms[0];
  const cabinet = room.cabinets[0];
  student = {
    studentNo,
    name: "Uat Sample Student",
    courseCode: "BSIT",
    yearLevel: 2026,
    section: "BSIT-4A",
    room: Number(room.id),
    cabinet: cabinet.id,
    drawer: Number(cabinet.drawerIds[0]),
    status: "Active",
  };
});
after(() => pool.end());

test("2.1–2.3, 5.1 and 6.2: persisted student lifecycle, normalization, duplicate, location and audit", async () => {
  const started = Date.now();
  const create = (body) => request("/api/students", { method: "POST", session: staff, body });
  const invalid = await create({ ...student, room: 99999 });
  assert.equal(invalid.status, 400);
  assert.match(invalid.payload.error, /room/i);
  const invalidCabinet = await create({ ...student, cabinet: "99999" });
  assert.equal(invalidCabinet.status, 400);
  assert.match(invalidCabinet.payload.error, /cabinet/i);
  const invalidDrawer = await create({ ...student, drawer: 99999 });
  assert.equal(invalidDrawer.status, 400);
  assert.match(invalidDrawer.payload.error, /drawer/i);

  const created = await create({ ...student, studentNo: `  ${studentNo.toLowerCase()}  `, name: "  Uat   Sample Student  " });
  assert.equal(created.status, 201, created.payload.error);
  assert.equal(created.payload.data.student_no, studentNo);
  assert.equal(created.payload.data.name, "UAT SAMPLE STUDENT");
  assert.equal((await create({ ...student, name: "Different Student" })).status, 409);

  const path = `/api/students/${studentNo}`;
  const updated = await request(path, { method: "PATCH", session: staff, body: { name: "Updated Sample Student" } });
  assert.equal(updated.status, 200, updated.payload.error);
  const fetched = await request(path, { session: staff });
  assert.equal(fetched.status, 200);
  const row = fetched.payload.data;
  assert.equal(row.name, "UPDATED SAMPLE STUDENT");
  assert.equal(Number(row.room), student.room);
  assert.equal(String(row.cabinet), String(student.cabinet));
  assert.equal(Number(row.drawer), student.drawer);
  const audit = await queryOne(
    "SELECT actor, actor_id, action, created_at FROM global_audit_logs WHERE action = 'Created student' AND details = $1 ORDER BY id DESC LIMIT 1",
    [studentNo],
  );
  assert.equal(audit.actor, "Marcus Reyes");
  assert.equal(audit.actor_id, staffId);
  assert.equal(audit.action, "Created student");
  assert.ok(audit.created_at.getTime() >= started && audit.created_at.getTime() <= Date.now());
});

async function uploadOcr(name, type, bytes) {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type }), name);
  return request("/api/ingest/ocr", { method: "POST", session: staff, body: form });
}

test("3.5: native OCR preserves text and displayed boxes at all right-angle PDF rotations", async () => {
  const fixture = await readFile(new URL("./fixtures/ocr-baseline/pdfs/canonical-01-Q1.pdf", import.meta.url));
  const upright = await uploadOcr("upright.pdf", "application/pdf", fixture);
  assert.equal(upright.status, 200);
  assert.match(upright.payload.text, /SANTOS, MARA I\./);
  for (const rotation of [90, 180, 270]) {
    const pdf = await PDFDocument.load(fixture);
    pdf.getPage(0).setRotation(degrees(rotation));
    const result = await uploadOcr("rotated.pdf", "application/pdf", await pdf.save());
    assert.equal(result.status, 200);
    assert.equal(result.payload.text, upright.payload.text);
    const [expected] = rotateOcrPages(upright.payload.pages, rotation);
    const [actual] = result.payload.pages;
    assert.equal(actual.width, expected.width);
    assert.equal(actual.height, expected.height);
    assert.equal(actual.observations.length, expected.observations.length);
    for (const [index, observation] of actual.observations.entries()) {
      const reference = expected.observations[index];
      assert.equal(observation.text, reference.text);
      for (const key of ["x", "y", "width", "height"]) {
        assert.ok(Math.abs(observation[key] - reference[key]) < 0.002, `${rotation}° ${key}`);
      }
    }
  }
});

test("3.7: malformed OCR uploads return actionable client errors and leave the API healthy", async () => {
  const files = [
    ["empty.pdf", "application/pdf", "", 400],
    ["invalid.txt", "text/plain", "synthetic text", 415],
    ["corrupt.png", "image/png", Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10), 422],
  ];
  for (const [name, type, bytes, expected] of files) {
    const result = await uploadOcr(name, type, bytes);
    assert.equal(result.status, expected, `${name}: ${result.payload.error}`);
    assert.equal(result.payload.ok, false);
    assert.ok(result.payload.error);
  }
  assert.equal((await request("/api/auth/login-options")).status, 200);
});

test("4.3: confirm and reject every selected review item and preserve an unselected item", async () => {
  const types = await query("SELECT name FROM document_types WHERE office_id = 'registrar' AND status = 'Active' ORDER BY id LIMIT 2");
  assert.equal(types.length, 2);
  const fixtures = [];
  const filenames = [];
  for (let index = 0; index < 5; index += 1) {
    const pdf = await PDFDocument.create();
    pdf.addPage([612, 792 + index]);
    const bytes = await pdf.save();
    const filename = `uat-${randomUUID()}.pdf`;
    const row = await createIngestItem({
      officeId: "registrar", originalFilename: filename, storageFilename: filename,
      mimeType: "application/pdf", sizeBytes: bytes.length, contentSha256: checksum(bytes),
    });
    await writeFile(getIngestFilePath(filename), bytes, { flag: "wx" });
    await query(
      "UPDATE ingest_queue SET review_status = 'Needs Review', ocr_status = 'completed', staff_selected_student_no = $2, proposed_doc_type = $3 WHERE id = $1",
      [row.id, studentNo, types[index % types.length].name],
    );
    fixtures.push(row.id);
    filenames.push(filename);
  }

  const browser = await puppeteer.launch({ executablePath: process.env.TEST_CHROME_EXECUTABLE, headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setCookie(...staff.cookie.split("; ").map((pair) => {
      const separator = pair.indexOf("=");
      return { name: pair.slice(0, separator), value: pair.slice(separator + 1), url: origin.origin };
    }));
    await page.goto(new URL("/staff?view=batch_review", origin).href, { waitUntil: "domcontentloaded" });

    async function selectPair(pair) {
      for (const [index, filename] of pair.entries()) {
        const row = await page.waitForSelector(`[data-review-row]:has([title="${filename}"])`, { timeout: 15000 });
        await row.evaluate((element, extend) => {
          element.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: extend }));
        }, index > 0);
      }
    }

    async function clickButton(label) {
      const handle = await page.waitForFunction((text) => [...document.querySelectorAll("button")]
        .find((element) => element.textContent.trim() === text && !element.disabled), { timeout: 15000 }, label);
      await handle.asElement().click();
      await handle.dispose();
    }
    const done = () => page.waitForFunction(() => document.querySelector("[role=dialog]")?.textContent.includes("2 completed · 0 skipped · 0 failed"));
    await selectPair(filenames.slice(0, 2));
    await clickButton("Confirm Selection");
    await done();
    await clickButton("Done");
    await page.waitForFunction(() => !document.querySelector("[role=dialog]"));

    await selectPair(filenames.slice(2, 4));
    await clickButton("Dismiss Selection");
    await clickButton("Dismiss Selected Files");
    await done();
  } finally {
    await browser.close();
  }
  const reviewed = await query(
    "SELECT review_status, promoted_document_id, reviewed_by FROM ingest_queue WHERE id = ANY($1::bigint[]) ORDER BY id",
    [fixtures],
  );
  assert.deepEqual(reviewed.map((row) => row.review_status), ["Confirmed", "Confirmed", "Rejected", "Rejected", "Needs Review"]);
  assert.ok(reviewed.slice(0, 2).every((row) => row.promoted_document_id));
  assert.ok(reviewed.slice(2).every((row) => !row.promoted_document_id));
  assert.ok(reviewed.slice(0, 4).every((row) => row.reviewed_by === staffId));
});

test("5.2 and 5.4: scheduled archive checksums and real pruning in disposable storage", async () => {
  const key = "auto_backup_schedule_registrar";
  const now = new Date();
  const time = [now.getHours(), now.getMinutes()].map((n) => String(n).padStart(2, "0")).join(":");
  const expired = `uat-expired-${randomUUID()}.zip.enc`;
  await writeFile(getBackupFilePath(expired), "expired synthetic backup", { flag: "wx" });
  const { id } = await queryOne(
    `INSERT INTO backups (filename, size_bytes, checksum, status_local, scope, office_id, backup_type, created_at)
     VALUES ($1, $2, $3, 'Success', 'office', 'registrar', 'Scheduled', NOW() - interval '400 days') RETURNING id`,
    [expired, Buffer.byteLength("expired synthetic backup"), checksum("expired synthetic backup")],
  );
  await query("INSERT INTO settings (key, value) VALUES ($1, $2)", [
    key, JSON.stringify({ enabled: true, frequency: "daily", time, retention: { daily: 1, weekly: 0, monthly: 0 } }),
  ]);
  try {
    await checkAndRunScheduledBackups();
    const { value } = await queryOne("SELECT value FROM settings WHERE key = $1", [key]);
    const schedule = JSON.parse(value);
    assert.equal(schedule.lastRunStatus, "success", schedule.lastRunError);
    const row = await queryOne("SELECT * FROM backups WHERE filename = $1", [schedule.lastRunFilename]);
    assert.equal(row.backup_type, "Scheduled");
    const archive = await readFile(getBackupFilePath(row.filename));
    assert.equal(archive.length, Number(row.size_bytes));
    assert.equal(checksum(archive), row.checksum);
    const zip = new AdmZip(decryptBackupBuffer(archive));
    const manifest = JSON.parse(zip.readAsText("manifest.json"));
    assert.equal(manifest.officeId, "registrar");
    assert.ok(zip.getEntry("db.sql"));
    assert.ok(manifest.records.length >= 2);
    for (const record of manifest.records) {
      assert.equal(checksum(zip.readFile(record.archivePath)), record.sha256);
    }
    assert.equal(await queryOne("SELECT id FROM backups WHERE id = $1", [id]), null);
    await assert.rejects(readFile(getBackupFilePath(expired)), { code: "ENOENT" });
  } finally {
    await query("DELETE FROM settings WHERE key = $1", [key]);
  }
});
