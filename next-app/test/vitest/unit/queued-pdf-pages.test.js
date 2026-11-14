import { describe, expect, it } from "vitest"
import { PDFDocument } from "pdf-lib"
import { mergeFilesToPdf } from "@/lib/imageToPdf"

async function file(name, widths) {
  const pdf = await PDFDocument.create()
  widths.forEach((width) => pdf.addPage([width, 400]))
  return new File([await pdf.save()], name, { type: "application/pdf" })
}

describe("queued PDF pages", () => {
  it("saves every page in displayed file order, including multi-page replacements", async () => {
    const files = [
      await file("first.pdf", [100]),
      await file("replacement.pdf", [200, 210]),
      await file("last.pdf", [300]),
    ]
    const merged = await mergeFilesToPdf(files)
    const pdf = await PDFDocument.load(await merged.arrayBuffer())
    expect(pdf.getPages().map((page) => page.getWidth())).toEqual([
      100, 200, 210, 300,
    ])
    expect(files.map((item) => item.name)).toEqual([
      "first.pdf",
      "replacement.pdf",
      "last.pdf",
    ])
  })

  it("rejects unreadable pages instead of silently saving only the selected file", async () => {
    const first = await file("first.pdf", [100])
    const broken = new File(["invalid PDF"], "bad.pdf", {
      type: "application/pdf",
    })
    await expect(mergeFilesToPdf([first, broken])).rejects.toThrow()
    expect(
      (await PDFDocument.load(await first.arrayBuffer())).getPageCount()
    ).toBe(1)
  })
})
