// Local browser verification. Leaves three clearly named synthetic roster fixtures.
import puppeteer from "puppeteer-core"
import fs from "node:fs/promises"
import assert from "node:assert/strict"
import { PDFDocument } from "pdf-lib"
const origin = process.env.TEST_ORIGIN || "http://localhost:3000"
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname))
const dir = ".local/autofill-qa"
await fs.mkdir(dir, { recursive: true })
const browser = await puppeteer.launch({
  executablePath: process.env.BROWSER_PATH || "/opt/brave-bin/brave",
  headless: true,
})
const page = await browser.newPage()
page.setDefaultTimeout(30000)
await page.setViewport({ width: 1600, height: 1100 })
let nextOcr = null,
  failMatch = false
const requests = [],
  matches = [],
  ocr = []
page.on("response", async (r) => {
  if (r.url().endsWith("/api/recognition/student-match"))
    matches.push(await r.json())
  if (r.url().endsWith("/api/ingest/ocr")) ocr.push(await r.json())
})
await page.setRequestInterception(true)
page.on("request", async (r) => {
  const path = new URL(r.url()).pathname
  if (path === "/api/recognition/student-match") {
    requests.push(JSON.parse(r.postData() || (await r.fetchPostData())))
    if (failMatch)
      return r.respond({
        status: 503,
        contentType: "application/json",
        body: '{"ok":false,"error":"Synthetic matcher outage"}',
      })
  }
  if (path === "/api/ingest/ocr" && nextOcr) {
    const text = nextOcr
    nextOcr = null
    return r.respond({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        text,
        pages: [],
        engine: "synthetic-corrected-reading",
      }),
    })
  }
  return r.continue()
})
async function api(path, body) {
  return page.evaluate(
    async (path, body) => {
      const token = decodeURIComponent(
        document.cookie.match(/(?:^|;\s*)pup_csrf=([^;]+)/)?.[1] || ""
      )
      const r = await fetch(
        path,
        body
          ? {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": token,
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
    await page.locator("#view-upload button::-p-text(Replace File)").click()
    await (await chooser).accept([file])
  } else
    await (
      await page.$("#view-upload input[type=file]:not(.hidden)")
    ).uploadFile(file)
  await response
  await idle()
}
async function rescan(text) {
  nextOcr = text
  const response = page.waitForResponse((r) =>
    r.url().endsWith("/api/ingest/ocr")
  )
  await page.locator("#view-upload button::-p-text(Re-scan)").click()
  await response
  await idle()
}
async function values() {
  return page.evaluate(() => {
    const root = document.querySelector("#view-upload")
    const control = (label) =>
      [...root.querySelectorAll("label")]
        .find((el) => el.textContent.trim() === label)
        ?.parentElement.querySelector("[data-slot=select-trigger]")
    const input = root.querySelector('input[placeholder="202X-XXXXX-SJ-0"]')
    return {
      studentNo: input?.value,
      locked: input?.disabled,
      firstName: root.querySelector("#scan-student-firstName")?.value,
      lastName: root.querySelector("#scan-student-lastName")?.value,
      inputs: [...root.querySelectorAll("input:not([type=file])")].map(
        (el) => el.value
      ),
      docType: control("Document Type")?.textContent.trim(),
      course: control("Course / Program")?.textContent.trim(),
      section: control("Section")?.textContent.trim(),
      room: control("Room")?.textContent.trim(),
      cabinet: control("Cabinet")?.textContent.trim(),
      drawer: control("Drawer")?.textContent.trim(),
    }
  })
}
async function selectType(type) {
  await page.evaluate(() =>
    [...document.querySelectorAll("#view-upload label")]
      .find((el) => el.textContent.trim() === "Document Type")
      .parentElement.querySelector("[data-slot=select-trigger]")
      .click()
  )
  await page.waitForSelector("[role=option]")
  await page.evaluate((type) => {
    const option = [...document.querySelectorAll("[role=option]")].find(
      (el) => el.textContent.trim() === type
    )
    if (!option) throw new Error(`Missing type ${type}`)
    option.click()
  }, type)
}
function blank(v) {
  assert.equal(v.studentNo, "")
  assert.equal(v.firstName, "")
  assert.equal(v.lastName, "")
  assert.equal(v.locked, false)
  assert.ok(!v.inputs.some((x) => /SEX|MALE/.test(x)), JSON.stringify(v))
  assert.ok(!v.inputs.includes("BSIT"))
}
try {
  await page.goto(`${origin}/login`, { waitUntil: "domcontentloaded" })
  await page.locator("text/Demo Accounts").click()
  await page.locator("text/staff.registrar@pup.com").click()
  await page.waitForFunction(() => location.pathname.startsWith("/staff"))
  await open()
  const base = (await api("/api/students?limit=1")).data[0],
    layout = (await api("/api/storage-layout")).data,
    room = layout.rooms[0],
    cabinet = room.cabinets[0]
  for (const [studentNo, firstName, lastName] of [
    ["2026-99005-SJ-0", "NORA LUZ", "QAAUTOFILL"],
    ["2026-99006-SJ-0", "LINA", "QAAMBIGUOUS"],
    ["2026-99007-SJ-0", "LINA", "QAAMBIGUOUS"],
  ]) {
    const body = {
      studentNo,
      firstName,
      middleName: "E.",
      lastName,
      name: `${lastName}, ${firstName} E.`,
      courseCode: base.course_code || base.courseCode,
      yearLevel: 2026,
      section: base.section,
      room: room.id,
      cabinet: cabinet.id,
      drawer: cabinet.drawerIds[0],
      status: "Active",
    }
    const result = await api("/api/students", body)
    assert.ok(result.ok || result.status === 409, JSON.stringify(result))
    if (result.status === 409)
      assert.equal(
        (await api(`/api/students?q=${studentNo}`)).data.find(
          (s) => s.student_no === studentNo
        )?.name,
        body.name
      )
  }
  const fixtures = {
    health:
      "HEALTH INFORMATION FORM FOR STUDENTS\nName: NORA LUZ ENRIQUEZ QAAUTOFILL\nSex Male",
    permanent:
      "FORM 137\nSECONDARY PERMANENT RECORD\nName: NORA LUZ ENRIQUEZ QAAUTOFILL",
    untyped: "Name: NORA LUZ ENRIQUEZ QAAUTOFILL\nSYNTHETIC UNTITLED PAGE",
    unmatched: "HEALTH INFORMATION FORM FOR STUDENTS\nSex Male",
    ambiguous:
      "HEALTH INFORMATION FORM FOR STUDENTS\nName: LINA ELENA QAAMBIGUOUS\nSex Male",
  }
  for (const [name, text] of Object.entries(fixtures)) {
    await page.setContent(
      `<body style="background:white;font:32px Arial;padding:60px">${text
        .split("\n")
        .map((line) => `<p>${line}</p>`)
        .join("")}</body>`
    )
    await page.screenshot({ path: `${dir}/${name}.png` })
  }
  await open()
  await pick(
    "../Student Portal Demo PDFs/Harold Prince Entienza dela Pena - PDFs by Document/02 - Student Health Information Form.pdf"
  )
  let v = await values()
  assert.ok(
    !v.inputs.some((x) => x === "SEX" || x === "MALE"),
    JSON.stringify(v)
  )
  assert.match(v.docType, /Health/i)
  console.log(
    "provided Harold health PDF",
    v.studentNo,
    v.docType,
    "matches",
    matches.at(-1)?.data?.length
  )
  const healthStudent = v.studentNo
  const nativeHealthType = v.docType
  await rescan()
  v = await values()
  assert.equal(v.studentNo, healthStudent)
  assert.equal(v.docType, nativeHealthType)
  assert.ok(!v.inputs.some((value) => value === "SEX" || value === "MALE"))
  console.log("native Re-scan of provided health PDF keeps roster autofill and current type")

  await open()
  await pick(`${dir}/unmatched.png`)
  v = await values()
  blank(v)
  assert.match(v.docType, /Health/i)
  console.log("initial no-match health form: type only, no Sex Male")
  await open()
  await pick(`${dir}/ambiguous.png`)
  v = await values()
  blank(v)
  assert.equal(matches.at(-1).data.length, 2)
  assert.match(v.docType, /Health/i)
  console.log("initial ambiguous health form: type only")
  await open()
  await pick(`${dir}/health.png`)
  v = await values()
  assert.equal(v.studentNo, "2026-99005-SJ-0")
  assert.match(v.docType, /Health/i)
  const healthType = v.docType
  console.log("initial full middle name: unique roster autofill")
  await pick(`${dir}/permanent.png`, true)
  v = await values()
  assert.equal(v.studentNo, "2026-99005-SJ-0")
  assert.match(v.docType, /SF10|137/)
  const permanentType = v.docType
  console.log("Replace File: same student, new document type")
  await pick(`${dir}/untyped.png`, true)
  v = await values()
  assert.equal(v.studentNo, "2026-99005-SJ-0")
  assert.equal(v.docType, "Select Document type")
  console.log("Replace File: missing type clears previous detected type")
  await rescan(fixtures.health)
  v = await values()
  assert.equal(v.docType, healthType)
  assert.equal(v.studentNo, "2026-99005-SJ-0")
  assert.equal(requests.at(-1).ocrText, fixtures.health)
  console.log("Re-scan: fresh type updates on same student")
  await rescan(fixtures.untyped)
  v = await values()
  assert.equal(v.studentNo, "2026-99005-SJ-0")
  assert.equal(v.docType, "Select Document type")
  console.log("Re-scan: missing type clears previous detected type")
  await rescan(fixtures.ambiguous)
  v = await values()
  blank(v)
  assert.match(v.docType, /Health/i)
  assert.equal(matches.at(-1).data.length, 2)
  console.log("Re-scan: ambiguous clears prior OCR student")
  await pick(`${dir}/health.png`, true)
  assert.equal((await values()).studentNo, "2026-99005-SJ-0")
  await pick(`${dir}/unmatched.png`, true)
  v = await values()
  blank(v)
  assert.match(v.docType, /Health/i)
  console.log("Replace File: no match clears prior OCR student")
  await page.type("#scan-student-firstName", "MANUAL")
  await page.type("#scan-student-lastName", "PERSON")
  await selectType(permanentType)
  await rescan(fixtures.health)
  v = await values()
  assert.equal(v.firstName, "MANUAL")
  assert.equal(v.lastName, "PERSON")
  assert.equal(v.studentNo, "")
  assert.equal(v.docType, permanentType)
  assert.equal(v.locked, false)
  console.log("Re-scan: manual identity and document type preserved")
  await pick(`${dir}/unmatched.png`, true)
  v = await values()
  assert.equal(v.firstName, "MANUAL")
  assert.equal(v.lastName, "PERSON")
  assert.equal(v.docType, permanentType)
  console.log("Replace File: manual values preserved")
  await open()
  await pick(`${dir}/health.png`)
  await page
    .locator('#view-upload button[title="Switch to new student"]')
    .click()
  await page.locator('[aria-label="Suggested student matches"] button').click()
  const duplicateCancel = await page
    .waitForSelector('[role="dialog"] button::-p-text(Cancel)', {
      timeout: 1200,
    })
    .catch(() => null)
  if (duplicateCancel) {
    await page.locator('[role="dialog"] button::-p-text(Cancel)').click()
    await page.waitForSelector('[role="dialog"]', { hidden: true })
  }
  await rescan(fixtures.unmatched)
  v = await values()
  assert.equal(v.studentNo, "2026-99005-SJ-0")
  assert.equal(v.locked, true)
  assert.equal(v.docType, healthType)
  console.log("explicit selected student survives no-match Re-scan")
  await rescan(fixtures.untyped)
  v = await values()
  assert.equal(v.studentNo, "2026-99005-SJ-0")
  assert.equal(v.docType, "Select Document type")
  console.log("explicit student selection does not freeze OCR-owned type")
  await open()
  await pick(`${dir}/health.png`)
  failMatch = true
  await rescan(fixtures.permanent)
  v = await values()
  blank(v)
  assert.equal(v.docType, permanentType)
  failMatch = false
  console.log("matcher failure: clears auto student, applies fresh type")
  await open()
  failMatch = true
  await pick(`${dir}/health.png`)
  v = await values()
  blank(v)
  assert.match(v.docType, /Health/i)
  failMatch = false
  console.log("initial matcher failure: type only")

  const pdf = await PDFDocument.create()
  const image = await pdf.embedPng(await fs.readFile(`${dir}/health.png`))
  pdf
    .addPage([image.width, image.height])
    .drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
  const fixtureResult = await page.evaluate(
    async (bytes, docType) => {
      const form = new FormData()
      form.append(
        "file",
        new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
        "synthetic-autofill-health.pdf"
      )
      form.append("studentNo", "2026-99005-SJ-0")
      form.append("docType", docType)
      const res = await fetch("/api/documents", { method: "POST", body: form })
      return { status: res.status, ...(await res.json()) }
    },
    Array.from(await pdf.save()),
    healthType
  )
  assert.ok(
    fixtureResult.ok || fixtureResult.status === 409,
    JSON.stringify(fixtureResult)
  )
  await page.goto(`${origin}/staff?view=documents`, {
    waitUntil: "domcontentloaded",
  })
  await page.waitForSelector(
    'input[placeholder="Search student no., name, or section..."]'
  )
  const search = await page.$(
    'input[placeholder="Search student no., name, or section..."]'
  )
  await search.click({ clickCount: 3 })
  await search.type("2026-99005-SJ-0")
  await page.waitForFunction(() =>
    [...document.querySelectorAll("#view-documents tr")].some(
      (row) =>
        row.textContent.includes("2026-99005-SJ-0") &&
        [...row.querySelectorAll("button")].some(
          (button) => button.textContent.trim() === "Pending"
        )
    )
  )
  await page.evaluate(() => {
    const row = [...document.querySelectorAll("#view-documents tr")].find(
      (row) => row.textContent.includes("2026-99005-SJ-0")
    )
    ;[...row.querySelectorAll("button")]
      .find((button) => button.textContent.trim() === "Pending")
      .click()
  })
  await page.locator("[role=dialog] button::-p-text(Update Document)").click()
  await page.waitForSelector("#view-upload input[type=file]")
  await pick(`${dir}/permanent.png`)
  v = await values()
  assert.equal(v.studentNo, "2026-99005-SJ-0")
  assert.equal(v.docType, healthType)
  assert.equal(v.locked, true)
  await rescan(fixtures.untyped)
  v = await values()
  assert.equal(v.docType, healthType)
  assert.equal(v.studentNo, "2026-99005-SJ-0")
  console.log(
    "record Update Document workflow preserves locked student and type on scan and Re-scan"
  )
  await page.screenshot({ path: `${dir}/desktop.png` })
  for (const theme of ["light", "dark"]) {
    await page.setViewport({ width: 390, height: 900 })
    await page.evaluate(
      (theme) =>
        document.documentElement.classList.toggle("dark", theme === "dark"),
      theme
    )
    await page.locator("#view-upload button::-p-text(Replace File)").scroll()
    await page.screenshot({ path: `${dir}/mobile-${theme}.png` })
  }
  await fs.writeFile(
    `${dir}/evidence.json`,
    JSON.stringify({ requests, matches, ocr }, null, 2)
  )
  console.log("AUTOFILL FLOW PASS")
} catch (error) {
  await page.screenshot({ path: `${dir}/failure.png` })
  console.log(
    "failure state",
    await values(),
    await page.$$eval('[role="dialog"]', (els) => els.map((e) => e.innerText))
  )
  throw error
} finally {
  await browser.close()
}
