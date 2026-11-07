import test from "node:test"
import assert from "node:assert/strict"
import { createPdfPreviewSession } from "../src/lib/pdfPreviewSession.js"

test("closing a preview rejects late generation and releases the current PDF", async () => {
  const session = createPdfPreviewSession()
  const first = session.begin()
  const url = session.createUrl(new Blob(["first PDF"]), first)
  assert.equal(await (await fetch(url)).text(), "first PDF")
  const pending = session.begin()
  session.cancel()
  assert.equal(session.isCurrent(pending), false)
  assert.equal(session.createUrl(new Blob(["late PDF"]), pending), null)
  await assert.rejects(fetch(url))
})

test("report switching keeps the latest generation and releases replaced object URLs", async () => {
  const session = createPdfPreviewSession()
  const first = session.createUrl(new Blob(["SLA"]), session.begin())
  const outdated = session.begin()
  const latest = session.begin()
  assert.equal(session.createUrl(new Blob(["outdated CSM"]), outdated), null)
  assert.equal(await (await fetch(first)).text(), "SLA")
  const replacement = session.createUrl(new Blob(["Combined"]), latest)
  await assert.rejects(fetch(first))
  assert.equal(await (await fetch(replacement)).text(), "Combined")
  session.cancel()
  await assert.rejects(fetch(replacement))
})
