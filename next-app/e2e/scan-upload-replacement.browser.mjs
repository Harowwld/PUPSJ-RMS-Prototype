// Run from next-app against the local dev server with demo sign-in enabled.
// Uses Apple Vision and leaves two clearly named synthetic student/document fixtures.
// BROWSER_PATH=/path/to/chrome node e2e/scan-upload-replacement.browser.mjs
import puppeteer from "puppeteer-core"
import fs from "node:fs/promises"
import assert from "node:assert/strict"
import { PDFDocument } from "pdf-lib"
import { execFileSync } from "node:child_process"
const origin = process.env.TEST_ORIGIN || "http://localhost:3000"
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname))
assert.equal(
  process.platform,
  "darwin",
  "This flow verifies persisted files using Apple Vision."
)
await fs.mkdir(".local/replace-qa", { recursive: true })
const browser = await puppeteer.launch({
  executablePath: process.env.BROWSER_PATH || "/opt/brave-bin/brave",
  headless: true,
})
const page = await browser.newPage()
page.setDefaultTimeout(40000)
await page.setViewport({ width: 1600, height: 1100 })
const logs = []
let ocrResponses = []
let matchRequests = []
let failOcr = false
let failSave = false
let nextOcr = null
let holdNextMatch = false
let heldMatch = null
page.on("console", (m) => {
  if (m.text().includes("OCR")) logs.push(m.text())
})
page.on("response", async (r) => {
  if (r.url().endsWith("/api/ingest/ocr"))
    ocrResponses.push(await r.json().catch(() => ({})))
})
await page.setRequestInterception(true)
page.on("request", async (r) => {
  const u = new URL(r.url())
  if (u.pathname === "/api/recognition/student-match")
    matchRequests.push(JSON.parse(r.postData() || (await r.fetchPostData())))
  if (holdNextMatch && u.pathname === "/api/recognition/student-match") {
    holdNextMatch = false
    heldMatch = r
    return
  }
  if (nextOcr && u.pathname === "/api/ingest/ocr") {
    const result = nextOcr
    nextOcr = null
    return r.respond({ contentType: "application/json", body: JSON.stringify(result) })
  }
  if (failOcr && u.pathname === "/api/ingest/ocr")
    return r.respond({
      status: 503,
      contentType: "application/json",
      body: '{"ok":false,"error":"Synthetic OCR outage"}',
    })
  if (failSave && u.pathname === "/api/documents" && r.method() === "POST")
    return r.respond({
      status: 503,
      contentType: "application/json",
      body: '{"ok":false,"error":"Synthetic save outage"}',
    })
  return r.continue()
})
async function api(path, body) {
  return page.evaluate(
    async (path, body) => {
      const csrf = decodeURIComponent(
        document.cookie.match(/(?:^|;\s*)pup_csrf=([^;]+)/)?.[1] || ""
      )
      const r = await fetch(
        path,
        body
          ? {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": csrf,
              },
              body: JSON.stringify(body),
            }
          : { cache: "no-store" }
      )
      return { status: r.status, ...(await r.json()) }
    },
    path,
    body
  )
}
async function open() {
  await page.goto(`${origin}/staff?view=upload`, {
    waitUntil: "domcontentloaded",
  })
  await page.waitForSelector("#view-upload input[type=file]")
}
async function idle() {
  await page.waitForFunction(
    () => !document.body.innerText.includes("Processing scanned information...")
  )
}
async function pick(file, replace = false) {
  const response = page.waitForResponse((r) =>
    r.url().endsWith("/api/ingest/ocr")
  )
  if (replace) {
    const chooser = page.waitForFileChooser()
    await page.locator("text/Replace File").click()
    await (
      await chooser
    ).accept([
      `.local/replace-qa/${/\.(png|pdf)$/.test(file) ? file : file + ".png"}`,
    ])
  } else {
    await (
      await page.$("#view-upload input[type=file]:not(.hidden)")
    ).uploadFile(
      ...[]
        .concat(file)
        .map(
          (f) => `.local/replace-qa/${/\.(png|pdf)$/.test(f) ? f : f + ".png"}`
        )
    )
  }
  await response
  await idle()
}
async function text() {
  return page.$eval("#view-upload", (e) => e.innerText)
}
async function save() {
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/api/documents") && r.request().method() === "POST"
  )
  const enable = await page.$("#view-upload button::-p-text(Replace Document)")
  if (enable) await enable.click()
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("#view-upload button")].find((b) =>
      ["Upload Document", "Replace Existing Document"].includes(
        b.textContent.trim()
      )
    )
    b.click()
  })
  const confirm = await page
    .waitForSelector(
      "[role=dialog] button::-p-text(Upload to Selected Student)",
      { timeout: 1200 }
    )
    .catch(() => null)
  if (confirm) await confirm.click()
  const r = await response
  const j = await r.json()
  console.log("save", r.status(), JSON.stringify(j).slice(0, 250))
  return j
}
async function saved(id, label, pages, reload = true) {
  if (reload) await page.reload({ waitUntil: "domcontentloaded" })
  const bytes = await page.evaluate(
    async (id) =>
      Array.from(
        new Uint8Array(
          await (
            await fetch(`/api/documents/${id}`, { cache: "no-store" })
          ).arrayBuffer()
        )
      ),
    id
  )
  const b = Buffer.from(bytes)
  await fs.writeFile(`.local/replace-qa/${label}.pdf`, b)
  assert.equal((await PDFDocument.load(b)).getPageCount(), pages)
  const native = JSON.parse(
    execFileSync("./bin/apple-vision-ocr", [`.local/replace-qa/${label}.pdf`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
  )
  console.log("persistent PDF", label, pages, native.text)
  return native
}
try {
  await page.goto(`${origin}/login`, { waitUntil: "domcontentloaded" })
  await page.locator("text/Demo Accounts").click()
  await page.locator("text/staff.registrar@pup.com").click()
  await page.waitForFunction(() => location.pathname.startsWith("/staff"))
  await open()
  const roster = await api("/api/students?limit=1")
  const base = roster.data[0]
  const layout = (await api("/api/storage-layout")).data
  const room = layout.rooms[0],
    cabinet = room.cabinets[0]
  base.room = room.id
  base.cabinet = cabinet.id
  base.drawer = cabinet.drawerIds[0]
  const students = [
    {
      studentNo: "2026-99001-SJ-0",
      firstName: "ALINA",
      lastName: "QATESTALPHA",
    },
    {
      studentNo: "2026-99002-SJ-0",
      firstName: "BRUNO",
      lastName: "QATESTBETA",
    },
  ]
  for (const s of students) {
    const result = await api("/api/students", {
      ...s,
      middleName: "",
      name: `${s.lastName}, ${s.firstName}`,
      courseCode: base.course_code || base.courseCode,
      yearLevel: 2026,
      section: base.section,
      room: base.room,
      cabinet: base.cabinet,
      drawer: base.drawer,
      status: "Active",
    })
    assert.ok(result.ok || result.status === 409, JSON.stringify(result))
    if (result.status === 409) {
      const existing = (await api(`/api/students?q=${s.studentNo}`)).data.find(
        (student) => student.student_no === s.studentNo
      )
      assert.equal(existing?.name, `${s.lastName}, ${s.firstName}`, "Fixture ID belongs to another student")
    }
  }
  for (const [file, name, marker] of [
    ["original", "ALINA QATESTALPHA", "ORIGINAL ALPHA"],
    ["replacement", "BRUNO QATESTBETA", "REPLACEMENT BETA"],
    ["third", "ALINA QATESTALPHA", "UNCHANGED THIRD"],
  ]) {
    await page.setContent(
      `<body style="background:white;font:32px Arial;padding:60px"><h1>FORM 137</h1><p>SECONDARY PERMANENT RECORD</p><p>NAME: ${name}</p><p>SYNTHETIC ${marker} CONTENT</p></body>`
    )
    await page.screenshot({
      path: `.local/replace-qa/${/\.(png|pdf)$/.test(file) ? file : file + ".png"}`,
    })
  }
  const replacementPdf = await PDFDocument.create()
  const image = await replacementPdf.embedPng(
    await fs.readFile(".local/replace-qa/replacement.png")
  )
  const pdfPage = replacementPdf.addPage([image.width, image.height])
  pdfPage.drawImage(image, {
    x: 0,
    y: 0,
    width: image.width,
    height: image.height,
  })
  await fs.writeFile(
    ".local/replace-qa/replacement.pdf",
    await replacementPdf.save()
  )
  await page.setContent(
    '<body style="background:white;font:32px Arial;padding:60px">SYNTHETIC UNMATCHED CONTENT</body>'
  )
  await page.screenshot({ path: ".local/replace-qa/unknown.png" })
  await fs.writeFile(".local/replace-qa/bad.png", "corrupt synthetic image")
  await open()
  await pick("original")
  const initial = await save()
  assert.ok(initial.ok)
  const originalId = initial.data.id
  await open()
  await pick("original")
  assert.match(await page.$eval('[aria-label="Suggested student matches"]', el => el.innerText), /QATESTALPHA, ALINA/)
  // Make this assignment explicit before checking that replacement preserves it.
  await page.locator('#view-upload button[title="Switch to new student"]').click()
  await page.locator('[aria-label="Suggested student matches"] button').click()
  const duplicateCancel = await page.waitForSelector('[role="dialog"] button::-p-text(Cancel)', { timeout: 1200 }).catch(() => null)
  if (duplicateCancel) {
    await page.locator('[role="dialog"] button::-p-text(Cancel)').click()
    await page.waitForSelector('[role="dialog"]', { hidden: true })
  }

  await page.screenshot({ path: ".local/replace-qa/first.png" })
  await pick("replacement", true)
  assert.ok(!(await text()).includes("Scan Pages (2)"))
  assert.match(ocrResponses.at(-1).text, /REPLACEMENT BETA/)
  assert.match(matchRequests.at(-1).ocrText, /REPLACEMENT BETA/)
  const suggested = () => page.$eval('[aria-label="Suggested student matches"]', el => el.innerText)
  assert.match(await suggested(), /QATESTBETA, BRUNO/)
  assert.doesNotMatch(await suggested(), /QATESTALPHA, ALINA/)
  console.log("single replacement and visible suggestion A to B pass")
  const before = ocrResponses.length
  const rescanResponse = page.waitForResponse((r) =>
    r.url().endsWith("/api/ingest/ocr")
  )
  await page.locator("text/Re-scan").click()
  await rescanResponse
  await idle()
  assert.equal(ocrResponses.length, before + 1)
  assert.match(matchRequests.at(-1).ocrText, /REPLACEMENT BETA/)
  assert.ok(!(await text()).includes("Scan Pages (2)"))
  assert.match(await text(), /while QATESTALPHA, ALINA/)
  console.log("manual re-scan and preserved student pass")
  // Reproduce a corrected OCR reading of the same file; the real matcher still runs.
  const alphaOcr = ocrResponses.find(result => result.text?.includes("ORIGINAL ALPHA"))
  assert.ok(alphaOcr)
  nextOcr = alphaOcr
  let correctedResponse = page.waitForResponse(r => r.url().endsWith("/api/ingest/ocr"))
  await page.locator("text/Re-scan").click()
  await correctedResponse
  await idle()
  assert.equal(matchRequests.at(-1).ocrText, alphaOcr.text)
  assert.match(await suggested(), /QATESTALPHA, ALINA/)
  assert.doesNotMatch(await suggested(), /QATESTBETA, BRUNO/)
  nextOcr = { ok: true, text: "SYNTHETIC UNMATCHED CONTENT", pages: [], engine: "synthetic" }
  correctedResponse = page.waitForResponse(r => r.url().endsWith("/api/ingest/ocr"))
  await page.locator("text/Re-scan").click()
  await correctedResponse
  await idle()
  assert.equal(matchRequests.at(-1).ocrText, "SYNTHETIC UNMATCHED CONTENT")
  assert.equal(await page.$('[aria-label="Suggested student matches"]'), null)
  assert.match(await text(), /No student match found/)
  assert.equal(await page.$eval('#view-upload input[value="2026-99001-SJ-0"]', el => el.value), "2026-99001-SJ-0")
  correctedResponse = page.waitForResponse(r => r.url().endsWith("/api/ingest/ocr"))
  await page.locator("text/Re-scan").click()
  await correctedResponse
  await idle()
  assert.match(await suggested(), /QATESTBETA, BRUNO/)
  console.log("re-scan uses corrected fresh OCR: B to A to no match to B, selected assignment preserved pass")

  holdNextMatch = true
  await page.locator("text/Re-scan").click()
  const heldDeadline = Date.now() + 10000
  while (!heldMatch && Date.now() < heldDeadline) await new Promise(resolve => setTimeout(resolve, 30))
  assert.ok(heldMatch, "Old matching request should be pending")
  // A picker can already be open when an earlier scan starts; deliver that selection late.
  await (await page.$('input[data-replace-file]')).uploadFile(".local/replace-qa/original.png")
  await page.waitForFunction(() => document.querySelector('[aria-label="Suggested student matches"]')?.innerText.includes("QATESTALPHA, ALINA"))
  await idle()
  const oldResponse = page.waitForResponse(r => r.url().endsWith("/api/recognition/student-match") && r.request() === heldMatch)
  await heldMatch.continue()
  await oldResponse
  await new Promise(resolve => setTimeout(resolve, 300))
  assert.match(await suggested(), /QATESTALPHA, ALINA/)
  assert.doesNotMatch(await suggested(), /QATESTBETA, BRUNO/)
  await pick("replacement", true)
  assert.match(await suggested(), /QATESTBETA, BRUNO/)
  console.log("late matching result cannot overwrite the current replacement pass")

  failOcr = true
  let response = page.waitForResponse((r) =>
    r.url().endsWith("/api/ingest/ocr")
  )
  await page.locator("text/Re-scan").click()
  await response
  await idle()
  assert.match(await text(), /OCR failed/)
  assert.match(await text(), /replacement.png/)
  failOcr = false
  response = page.waitForResponse((r) => r.url().endsWith("/api/ingest/ocr"))
  await page.locator("text/Re-scan").click()
  await response
  await idle()
  assert.ok(!(await text()).includes("OCR failed"))
  console.log("OCR failure and recovery pass")
  const chooser = page.waitForFileChooser()
  await page.locator("text/Replace File").click()
  await (await chooser).accept([".local/replace-qa/bad.png"])
  await page.waitForFunction(() =>
    document.body.innerText.includes("Replacement Failed")
  )
  assert.match(await text(), /replacement.png/)
  console.log("invalid replacement retained original pass")
  failSave = true
  assert.equal((await save()).ok, false)
  const old = await saved(originalId, "failed-save-original", 1, false)
  assert.match(old.text, /ORIGINAL ALPHA/)
  assert.match(await text(), /replacement.png/)
  failSave = false
  const replacement = await save()
  assert.ok(replacement.ok)
  assert.equal(replacement.data.id, originalId)
  assert.equal(replacement.data.student_no, students[0].studentNo)
  const current = await saved(originalId, "single-replacement", 1)
  assert.match(current.text, /REPLACEMENT BETA/)
  assert.doesNotMatch(current.text, /ORIGINAL ALPHA/)
  console.log(
    "single saved replacement, same associations, failed-save recovery pass"
  )
  await open()
  await pick(["replacement", "original", "third"])
  await page.locator("#view-upload ::-p-text(Page 2)").click()
  await pick("replacement", true)
  assert.match(await text(), /Scan Pages \(3\)/)
  const list = await page.$$eval('#view-upload [title="Move Up"]', (bs) =>
    bs.map((b) => b.closest(".group").innerText)
  )
  console.log("page list", list)
  assert.match(list[0], /replacement.png/)
  assert.match(list[1], /replacement.png/)
  assert.match(list[2], /third.png/)
  assert.ok(!list.some((t) => t.includes("original.png")))
  response = page.waitForResponse((r) => r.url().endsWith("/api/ingest/ocr"))
  await page.locator("text/Re-scan").click()
  await response
  await idle()
  assert.match(await text(), /Scan Pages \(3\)/)
  const multi = await save()
  assert.ok(multi.ok)
  assert.equal(multi.data.student_no, students[1].studentNo)
  const persisted = await saved(multi.data.id, "multi-replacement", 3)
  assert.doesNotMatch(persisted.text, /ORIGINAL ALPHA/)
  assert.match(JSON.stringify(persisted.pages[2]), /UNCHANGED THIRD/)
  console.log("multi-page persistence pass")
  await open()
  await pick(["replacement", "original", "third"])
  await page.locator("#view-upload ::-p-text(Page 2)").click()
  await pick("replacement.pdf", true)
  assert.match(await text(), /Scan Pages \(3\)/)
  const mixed = await save()
  assert.ok(mixed.ok)
  assert.equal(mixed.data.id, multi.data.id)
  const mixedSaved = await saved(mixed.data.id, "mixed-replacement", 3)
  assert.doesNotMatch(mixedSaved.text, /ORIGINAL ALPHA/)
  assert.match(mixedSaved.text, /UNCHANGED THIRD/)
  console.log("mixed image/PDF replacement preserves other pages pass")
  const docsBefore = (await api("/api/documents?limit=1000")).data.length
  const inboxBefore = (await api("/api/ingest/hot-folder?limit=100")).data.rows
    .length
  await open()
  await pick("unknown")
  assert.match(await text(), /No student match found/)
  response = page.waitForResponse((r) => r.url().endsWith("/api/ingest/ocr"))
  await page.locator("text/Re-scan").click()
  await response
  await idle()
  assert.match(await text(), /No student match found/)
  assert.equal((await api("/api/documents?limit=1000")).data.length, docsBefore)
  assert.equal(
    (await api("/api/ingest/hot-folder?limit=100")).data.rows.length,
    inboxBefore
  )
  console.log("no-match re-scan adds no document or review entry pass")
  for (const width of [320, 390])
    for (const theme of ["light", "dark"]) {
      await page.setViewport({ width, height: 900 })
      await page.evaluate(
        (theme) =>
          document.documentElement.classList.toggle("dark", theme === "dark"),
        theme
      )
      await page.locator("text/Replace File").scroll()
      const bounds = await page.$eval(
        "#view-upload button::-p-text(Replace File)",
        (el) => {
          const header = el.parentElement.parentElement
          return { scroll: header.scrollWidth, width: header.clientWidth }
        }
      )
      assert.ok(bounds.scroll <= bounds.width + 1, JSON.stringify(bounds))
      await page.screenshot({
        path: `.local/replace-qa/mobile-${width}-${theme}.png`,
      })
    }
  console.log("320px/390px action toolbar light/dark pass")
  await page.screenshot({ path: ".local/replace-qa/after.png" })
  await fs.writeFile(
    ".local/replace-qa/log.json",
    JSON.stringify({ ocrResponses, matchRequests, logs }, null, 2)
  )
} finally {
  await browser.close()
}
