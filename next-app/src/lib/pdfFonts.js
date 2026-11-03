import { getReportFont } from "./reportFontOptions.js"

const fonts = new Map()

async function loadFont(path) {
  if (!fonts.has(path)) {
    fonts.set(path, fetch(path, { cache: "force-cache" }).then(async (response) => {
      if (!response.ok) throw new Error("Unable to load the report font. Please retry the PDF preview.")
      const bytes = new Uint8Array(await response.arrayBuffer())
      let binary = ""
      for (let start = 0; start < bytes.length; start += 8192) {
        binary += String.fromCharCode(...bytes.subarray(start, start + 8192))
      }
      return btoa(binary)
    }).catch((error) => {
      fonts.delete(path)
      throw error
    }))
  }
  return fonts.get(path)
}

export async function registerReportFont(doc, value) {
  const font = getReportFont(value)
  await Promise.all(["normal", "bold"].map(async (style) => {
    const filename = `${font.file}-${style === "bold" ? "Bold" : "Regular"}.ttf`
    doc.addFileToVFS(filename, await loadFont(`/assets/fonts/reports/${filename}`))
    doc.addFont(filename, font.family, style)
  }))
  doc.setFont(font.family, "normal")
  return font.family
}
