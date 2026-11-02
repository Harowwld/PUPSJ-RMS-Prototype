import test from "node:test"
import assert from "node:assert/strict"
import { getPdfPreviewSrc } from "../src/lib/pdfPreview.js"

test("desktop PDF previews open at 100 percent instead of stretching to the viewport width", () => {
  const preview = new URL(getPdfPreviewSrc("/api/documents/42"), "http://localhost")
  const params = new URLSearchParams(preview.hash.slice(1))
  assert.equal(params.get("zoom"), "100")
  assert.equal(params.has("view"), false)
  assert.equal(params.get("toolbar"), "0")
  assert.equal(params.get("navpanes"), "0")
})

test("compact PDF panels fit the whole paper without retaining a fixed desktop zoom", () => {
  const preview = getPdfPreviewSrc("/api/documents/42#page=3&zoom=250&view=FitH", true)
  const params = new URLSearchParams(preview.split("#")[1])
  assert.equal(params.get("page"), "3")
  assert.equal(params.get("view"), "Fit")
  assert.equal(params.has("zoom"), false)
})

test("existing URL fragments cannot override the standard preview zoom", () => {
  const preview = getPdfPreviewSrc("blob:http://localhost/report#view=FitH&zoom=300&page=2")
  assert.equal(preview.split("#")[0], "blob:http://localhost/report")
  const params = new URLSearchParams(preview.split("#")[1])
  assert.equal(params.get("zoom"), "100")
  assert.equal(params.get("page"), "2")
  assert.equal(params.has("view"), false)
  assert.equal(getPdfPreviewSrc(null), "")
})
