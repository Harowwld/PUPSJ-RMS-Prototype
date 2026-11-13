import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";

const origin = process.env.TEST_ORIGIN || "http://localhost:3000";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
const browser = await puppeteer.launch({
  executablePath: process.env.BROWSER_PATH || "/opt/brave-bin/brave",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const open = async (view) => {
  await page.goto(`${origin}/systemadmin?view=${view}`, { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForSelector("main");
};
const clickText = async (text) => {
  await page.evaluate((label) => {
    const button = [...document.querySelectorAll("button")].find((element) => element.textContent.trim() === label);
    if (!button) throw new Error(`Missing button: ${label}`);
    button.click();
  }, text);
};
const key = (userId, scope, field) => `pup_superadmin_view_v2:${encodeURIComponent(userId)}:${scope}:${field}`;

try {
  await page.goto(`${origin}/login`, { waitUntil: "networkidle2" });
  const user = await page.evaluate(async () => {
    const response = await fetch("/api/auth/demo-login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "superadmin@pup.local" }) });
    const body = await response.json();
    if (!body.ok) throw new Error(body.error);
    return body.data;
  });
  // This test changes browser preferences only; application writes are blocked.
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method()) && !url.pathname.startsWith("/api/auth/")) {
      return request.respond({ status: 403, contentType: "application/json", body: '{"ok":false,"error":"Read-only preference check"}' });
    }
    return request.continue();
  });
  const cases = [
    ["offices", "offices", "Date Added", "created_at"],
    ["staff", "staff", "Last Updated", "updated_at"],
    ["health", "operations", "Last Updated", "updatedAt"],
    ["logs", "logs", "IP Address", "ip"],
    ["backups", "backups", "External Copy", "external"],
  ];
  for (const [view, scope, label, column] of cases) {
    await open(view);
    if (view === "offices") await clickText("Table");
    await clickText("Columns");
    await page.waitForFunction((label) => [...document.querySelectorAll("label")].some((element) => element.textContent.trim() === label && element.querySelector('input[type="checkbox"]')), {}, label);
    await page.evaluate((label) => {
      const checkbox = [...document.querySelectorAll("label")].find((element) => element.textContent.trim() === label).querySelector("input");
      if (!checkbox.checked) checkbox.click();
    }, label);
    await page.waitForFunction((storageKey, column) => JSON.parse(localStorage.getItem(storageKey) || "[]").includes(column), {}, key(user.id, scope, "visibleColumns"), column);
    await page.keyboard.press("Escape");
    await page.waitForFunction((label) => [...document.querySelectorAll("main thead th")].some((element) => element.textContent.includes(label)), {}, label);
    await open("settings");
    await open(view);
    await page.waitForFunction((label) => [...document.querySelectorAll("main thead th")].some((element) => element.textContent.includes(label)), {}, label);
    await page.reload({ waitUntil: "networkidle2" });
    await page.waitForFunction((label) => [...document.querySelectorAll("main thead th")].some((element) => element.textContent.includes(label)), {}, label);
    const geometry = await page.evaluate(() => {
      const table = document.querySelector("main table");
      return { header: table.tHead.rows[0].cells.length, body: table.tBodies[0].rows[0]?.cells.length };
    });
    if (geometry.body) assert.equal(geometry.header, geometry.body, `${view}: column schema and cells`);
    console.log(`PASS ${view}: optional ${label}, navigation, reload, column geometry`);
  }

  await open("staff");
  const input = 'input[aria-label="Search personnel"]';
  await page.type(input, "Registrar");
  await page.waitForFunction((storageKey) => JSON.parse(localStorage.getItem(storageKey)) === "Registrar", {}, key(user.id, "staff", "search"));
  await open("offices");
  assert.equal(await page.$eval('input[aria-label="Search departments"]', (element) => element.value), "");
  await open("staff");
  assert.equal(await page.$eval(input, (element) => element.value), "Registrar");
  const sibling = await browser.newPage();
  await sibling.goto(origin);
  await sibling.evaluate((storageKey) => localStorage.setItem(storageKey, JSON.stringify("OSAS")), key(user.id, "staff", "search"));
  await page.waitForFunction(() => document.querySelector('input[aria-label="Search personnel"]')?.value === "OSAS");
  await sibling.close();
  await page.click('[aria-label="Clear search personnel"]');
  await page.reload({ waitUntil: "networkidle2" });
  assert.equal(await page.$eval(input, (element) => element.value), "");
  console.log("PASS search: per-page isolation, cross-tab synchronization, persistent clearing");

  const filterCases = [
    ["modules", "modules", "searchQuery", "input[aria-label='Search features']"],
    ["security", "security", "search", "input[aria-label='Search security questions']"],
    ["landing&section=faq", "cms-faq", "questionSearch", "input[aria-label='Search questions and answers']"],
    ["activity", "activity", "localSearch", "input[placeholder^='Search']"],
  ];
  for (const [view, scope, field, selector] of filterCases) {
    await open(view);
    await page.waitForSelector(selector);
    await page.type(selector, "records", { delay: 40 });
    await page.waitForFunction((storageKey) => JSON.parse(localStorage.getItem(storageKey)) === "records", {}, key(user.id, scope, field));
    await open("settings");
    await open(view);
    await page.waitForFunction((selector) => document.querySelector(selector)?.value === "records", {}, selector);
    console.log(`PASS ${scope}: filter restoration`);
  }
  await open("security");
  await page.evaluate(() => [...document.querySelectorAll('[aria-label="Question scope"] button')].find((button) => button.textContent.startsWith("Optional")).click());
  await page.reload({ waitUntil: "networkidle2" });
  await page.waitForFunction(() => [...document.querySelectorAll('[aria-label="Question scope"] button')].some((button) => button.textContent.startsWith("Optional") && button.getAttribute("aria-pressed") === "true"));
  assert.equal(await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)), key(user.id, "security", "scope")), "optional");
  console.log("PASS security: scope restoration alongside saved search");

  await open("staff");
  await clickText("Filter");
  await page.evaluate(() => [...document.querySelectorAll('[data-slot="popover-footer"] button')].find((button) => button.textContent.trim() === "Role").click());
  await page.waitForFunction((storageKey) => JSON.parse(localStorage.getItem(storageKey))?.length === 1, {}, key(user.id, "staff", "filterRules"));
  await page.reload({ waitUntil: "networkidle2" });
  await page.waitForFunction(() => [...document.querySelectorAll("main button")].some((button) => button.textContent.startsWith("Filter") && button.textContent.includes("1")));
  await page.evaluate(() => [...document.querySelectorAll("main button")].find((button) => button.textContent.startsWith("Filter")).click());
  await page.evaluate(() => [...document.querySelectorAll('[data-slot="popover-footer"] button')].find((button) => button.textContent.trim() === "Role").click());
  const rules = await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)), key(user.id, "staff", "filterRules"));
  assert.equal(rules.length, 2);
  assert.equal(new Set(rules.map((rule) => rule.id)).size, 2);
  console.log("PASS rule filters: restoration and unique IDs after adding another rule");
  await page.evaluate((userId) => {
    localStorage.setItem(`pup_superadmin_view_v2:OTHER:staff:search`, '"Another account"');
    localStorage.setItem(`pup_superadmin_view_v2:${encodeURIComponent(userId)}:staff:visibleColumns`, "{invalid json");
  }, user.id);
  await open("staff");
  await page.waitForFunction(() => document.querySelector("main thead")?.textContent.includes("Staff Name"));
  assert.equal(await page.$eval(input, (element) => element.value), "");
  console.log("PASS malformed preferences and account-key isolation");
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
