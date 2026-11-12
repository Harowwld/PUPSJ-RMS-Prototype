import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";

// Run against a local dev server with demo accounts. Creation responses are mocked;
// unexpected mutations are blocked so this check cannot create or edit records.
const origin = process.env.TEST_ORIGIN || "http://localhost:3000";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
const browser = await puppeteer.launch({
  executablePath: process.env.BROWSER_PATH || "/opt/brave-bin/brave",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1100 });
page.setDefaultTimeout(20000);
let target = "";
let fail = false;
let posts = [];
let nextId = 990;
await page.setRequestInterception(true);
page.on("request", async (request) => {
  const url = new URL(request.url());
  if (url.pathname === "/api/staff/next-id") {
    return request.respond({ contentType: "application/json", body: JSON.stringify({ ok: true, nextId: `PUPREGISTRAR-${nextId}` }) });
  }
  if (request.method() === "POST" && url.pathname === target) {
    posts.push(request.postData() || await request.fetchPostData());
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (!fail) nextId++;
    return request.respond({
      status: fail ? 409 : 200,
      contentType: "application/json",
      body: JSON.stringify(fail ? { ok: false, error: "Test duplicate entry" } : {
        ok: true,
        data: { id: `PUPREGISTRAR-${nextId - 1}`, fname: "Browser", lname: "Test", role: "Staff", status: "Active" },
        credentialEmail: { sent: true },
        defaultPassword: "browser-test-only",
      }),
    });
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method()) && !url.pathname.startsWith("/api/auth/")) {
    return request.respond({ status: 200, contentType: "application/json", body: '{"ok":true}' });
  }
  return request.continue();
});

async function login(email) {
  const context = page.browserContext();
  const cookies = await context.cookies();
  if (cookies.length) await context.deleteCookie(...cookies);
  await page.goto(`${origin}/login`, { waitUntil: "networkidle2" });
  await page.locator("text/Demo Accounts").click();
  await page.locator(`text/${email}`).click();
  await page.waitForFunction(() => !location.pathname.startsWith("/login"));
}

async function open(path, button, endpoint) {
  target = endpoint;
  posts = [];
  fail = false;
  await page.goto(`${origin}${path}`, { waitUntil: "networkidle2" });
  await page.locator(`text/${button}`).click();
  await page.waitForSelector('[role="dialog"] form');
  assert.equal(await page.$eval('[role="dialog"] [role="switch"]', (el) => el.getAttribute("aria-checked")), "false");
}

async function fill(index, value, selector = '[role="dialog"] input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"])') {
  const inputs = await page.$$(selector);
  assert.ok(inputs[index], `Missing input ${index}`);
  await inputs[index].click({ clickCount: 3 });
  await inputs[index].type(value);
}

async function choose(index = 0) {
  const buttons = await page.$$('[role="dialog"] button:has(> span.text-left)');
  assert.ok(buttons[index], `Missing dropdown ${index}`);
  await buttons[index].click();
  await page.waitForSelector('body > div[style*="position: fixed"] button');
  const options = await page.$$('body > div[style*="position: fixed"] button');
  for (const option of options) {
    if (await option.evaluate((el) => !el.disabled && !/select|choose/i.test(el.textContent))) {
      await option.click();
      return;
    }
  }
  throw new Error("No selectable option");
}

async function submit(expectedCount) {
  await page.click('[role="dialog"] button[type="submit"]');
  await page.waitForFunction(() => document.querySelector('[role="dialog"] button[type="submit"]')?.disabled === true);
  assert.equal(await page.$eval('[role="dialog"] [role="switch"]', (el) => el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true"), true);
  await page.keyboard.press("Escape");
  assert.ok(await page.$('[role="dialog"] form'), "Saving must keep the form open");
  await page.waitForFunction(() => document.querySelector('[role="dialog"] button[type="submit"]')?.disabled === false);
  assert.equal(posts.length, expectedCount);
}

async function toggle() {
  await page.click('[role="dialog"] [role="switch"]');
}

async function checkReady(firstValue = "") {
  await page.waitForFunction(() => document.querySelector('[role="dialog"] [role="status"]')?.textContent.includes("Ready for another"));
  assert.equal(await page.$eval('[role="dialog"] [role="switch"]', (el) => el.getAttribute("aria-checked")), "true");
  assert.equal(await page.evaluate(() => document.activeElement?.value), firstValue);
}

async function checkLayout(name) {
  for (const width of [1440, 390]) {
    await page.setViewport({ width, height: width === 390 ? 844 : 1100 });
    for (const dark of [false, true]) {
      await page.evaluate((value) => document.documentElement.classList.toggle("dark", value), dark);
      await new Promise((resolve) => setTimeout(resolve, 350));
      assert.ok(await page.$eval('[role="dialog"]', (dialog) => {
        const rect = dialog.getBoundingClientRect();
        const controls = [...dialog.querySelectorAll('[data-slot="dialog-footer"] button, [data-slot="dialog-footer"] label')];
        return rect.left >= 0 && rect.right <= innerWidth + 1 && rect.top >= 0 && rect.bottom <= innerHeight + 1 && controls.every((el) => {
          const bounds = el.getBoundingClientRect();
          return bounds.left >= rect.left - 1 && bounds.right <= rect.right + 1;
        });
      }), `${name}: footer overflow at ${width}px (${dark ? "dark" : "light"})`);
      if ((width === 1440 && !dark) || (width === 390 && dark)) {
        await page.screenshot({ path: `/tmp/create-another-${name.toLowerCase().replaceAll(" ", "-")}-${width}.png` });
      }
    }
  }
  await page.setViewport({ width: 1440, height: 1100 });
}

try {
  if (process.env.BROWSER_START !== "students") {
  await login("admin.registrar@pup.com");
  await open("/admin?view=system_data&subtab=document-types", "Add Document Type", "/api/doc-types");
  await checkLayout("Document type");
  await toggle();
  await fill(0, "Browser Test Document");
  fail = true;
  await submit(1);
  assert.equal(await page.$eval('[role="dialog"] input[type="text"]', (el) => el.value), "Browser Test Document");
  fail = false;
  await submit(2);
  await checkReady();
  await fill(0, "Browser Test Document Two");
  await submit(3);
  await checkReady();
  await page.keyboard.press("Escape");
  await page.waitForSelector('[role="dialog"]', { hidden: true });
  await page.locator("text/Add Document Type").click();
  assert.equal(await page.$eval('[role="dialog"] [role="switch"]', (el) => el.getAttribute("aria-checked")), "false");
  await fill(0, "Browser Test Single");
  await page.click('[role="dialog"] button[type="submit"]');
  await page.waitForSelector('[role="dialog"] form', { hidden: true });
  console.log("PASS document types: failure retention, repeated saves, focus, default-off close, reopen reset, mobile/dark layout");

  await open("/admin?view=system_data&subtab=degree-programs", "Add Program", "/api/courses");
  await toggle();
  await fill(0, "BTEST");
  await fill(1, "Browser Test Program");
  await fill(2, "Browser Test Block");
  await submit(1);
  await checkReady();
  assert.deepEqual(await page.$$eval('[role="dialog"] input[type="text"]', (els) => els.map((el) => el.value)), ["", "", ""]);
  console.log("PASS programs: clears program and block rows");

  await open("/admin?view=system_data&subtab=course-blocks", "Add Block", "/api/sections");
  await choose();
  const program = await page.$eval('[role="dialog"] button:has(> span.text-left)', (el) => el.textContent);
  await toggle();
  await fill(0, "Browser Test Block");
  await submit(1);
  await checkReady();
  assert.equal(await page.$eval('[role="dialog"] button:has(> span.text-left)', (el) => el.textContent), program);
  console.log("PASS blocks: clears block, retains program and focuses block name");

  await open("/admin?view=directory", "Register Staff", "/api/staff");
  await toggle();
  await fill(0, "Browser");
  await fill(1, "Test");
  await page.locator("#register-staff-email").fill("browser.test@example.com");
  await submit(1);
  await checkReady();
  await page.waitForFunction((id) => document.querySelector('[role="dialog"]').innerText.includes(id), {}, `PUPREGISTRAR-${nextId}`);
  await fill(0, "Browser");
  await fill(1, "Second");
  await page.locator("#register-staff-email").fill("browser.second@example.com");
  await submit(2);
  await checkReady();
  assert.notEqual(JSON.parse(posts[0]).id, JSON.parse(posts[1]).id);
  assert.equal(JSON.parse(posts[1]).email, "browser.second@example.com");
  console.log("PASS staff accounts: clears personal details and generates a fresh ID for each entry");
  }

  await login("staff.registrar@pup.com");
  await open("/staff?view=students", "Register Student", "/api/students");
  await toggle();
  await fill(0, "2024-99999-SJ-0");
  await fill(1, "TEST, BROWSER");
  const dropdowns = await page.$$('[role="dialog"] button:has(> span.text-left)');
  if (dropdowns.length > 4) await choose(1);
  else await fill(3, "1");
  const retained = await page.$$eval('[role="dialog"] button:has(> span.text-left)', (els) => els.map((el) => el.textContent));
  await submit(1);
  await checkReady();
  assert.equal(await page.$eval('[role="dialog"] input[type="number"]', (el) => el.value), String(new Date().getFullYear()));
  assert.deepEqual(await page.$$eval('[role="dialog"] button:has(> span.text-left)', (els) => els.map((el) => el.textContent)), retained);
  await checkLayout("Student");
  console.log("PASS students: clears identity, resets derived year, retains program/block/storage, mobile/dark layout");

  await open("/staff?view=requests", "Create Request", "/api/document-requests");
  await toggle();
  await page.locator("text/Alumni / Former Student").click();
  await fill(0, "Browser Test Requester");
  await choose(0);
  await choose(1);
  await fill(0, "Browser test purpose", '[role="dialog"] textarea');
  await submit(1);
  await checkReady();
  assert.ok(await page.$eval('[role="dialog"]', (el) => el.innerText.includes("Academic Program")));
  assert.ok((await page.$$eval('[role="dialog"] input:not([type="hidden"]):not([type="checkbox"]):not([type="file"]), [role="dialog"] textarea', (els) => els.map((el) => el.value))).every((value) => value === ""));
  await checkLayout("Request");
  console.log("PASS requests: clears requester, document and purpose, retains Alumni category");

  await login("staff.osas@pup.com");
  await open("/staff?view=organizations", "Register Organization", "/api/osas/organizations");
  await toggle();
  await fill(0, "Browser Test Organization");
  await fill(1, "BTO");
  await submit(1);
  await checkReady();
  assert.ok((await page.$$eval('[role="dialog"] input[type="text"], [role="dialog"] textarea', (els) => els.map((el) => el.value))).every((value) => value === ""));
  console.log("PASS organizations: clears organization identity, adviser and description");

  await login("superadmin@pup.com");
  await open("/systemadmin?view=staff", "Register Personnel", "/api/staff");
  await toggle();
  await fill(0, "Browser");
  await fill(1, "Test");
  await page.locator("#personnel-email").fill("browser.personnel@example.com");
  await submit(1);
  await page.locator("text/Staff Credentials Generated").wait();
  const doneButtons = await page.$$('[role="dialog"] button');
  for (const button of doneButtons) {
    if (await button.evaluate((el) => el.textContent.trim() === "Done")) { await button.click(); break; }
  }
  await checkReady();
  await page.waitForFunction((id) => document.querySelector('[role="dialog"] form')?.innerText.includes(id), {}, `PUPREGISTRAR-${nextId}`);
  await checkLayout("Personnel");
  console.log("PASS personnel: credentials dialog returns focus to the empty form, fresh ID, mobile/dark layout");
} catch (error) {
  console.error("Browser check failed at", page.url());
  await page.screenshot({ path: "/tmp/create-another-failure.png" });
  console.error(await page.$$eval('[role="dialog"]', (dialogs) => dialogs.map((dialog) => ({ rect: dialog.getBoundingClientRect().toJSON(), maxHeight: getComputedStyle(dialog).maxHeight, footer: dialog.querySelector('[data-slot="dialog-footer"]')?.getBoundingClientRect().toJSON() }))));
  console.error(await page.$$eval('[role="dialog"]', (dialogs) => dialogs.map((dialog) => ({ text: dialog.innerText, inputs: [...dialog.querySelectorAll("input")].map((el) => ({ type: el.type, placeholder: el.placeholder, value: el.value })) }))));
  throw error;
} finally {
  await browser.close();
}
