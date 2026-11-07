import test from "node:test"
import assert from "node:assert/strict"
import { downloadDocument } from "../src/lib/documentDownload.js"

test("document downloads save the received bytes with the supplied filename", async (t) => {
  const nativeFetch = globalThis.fetch
  const originalDocument = globalThis.document
  const bytes = "%PDF-1.7\nDownload validation"
  let appended = false
  let removed = false
  let clickedUrl
  const link = {
    click() { clickedUrl = this.href },
    remove() { removed = true },
  }
  globalThis.document = { createElement: () => link, body: { appendChild() { appended = true } } }
  t.after(() => { globalThis.document = originalDocument })
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "/api/documents/42")
    assert.equal(options.credentials, "same-origin")
    assert.equal(options.cache, "no-store")
    return new Response(bytes, { headers: { "Content-Type": "application/pdf" } })
  })
  await downloadDocument("/api/documents/42", "Archived-Credential.pdf")
  assert.equal(link.download, "Archived-Credential.pdf")
  assert.equal(appended, true)
  assert.equal(removed, true)
  assert.ok(clickedUrl.startsWith("blob:"))
  assert.equal(await (await nativeFetch(clickedUrl)).text(), bytes)
  await new Promise((resolve) => setTimeout(resolve, 1050))
  await assert.rejects(nativeFetch(clickedUrl))
})

test("a failed download does not create or click a misleading file", async (t) => {
  const originalDocument = globalThis.document
  let created = false
  globalThis.document = { createElement() { created = true } }
  t.after(() => { globalThis.document = originalDocument })
  t.mock.method(globalThis, "fetch", async () => new Response("Unavailable", { status: 403 }))
  await assert.rejects(downloadDocument("/api/documents/42"), /Unable to download/)
  assert.equal(created, false)
})
