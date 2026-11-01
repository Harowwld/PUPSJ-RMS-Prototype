export const REPORT_FONT = "Plus Jakarta Sans"

let fontPromise

async function loadReportFont() {
  if (!fontPromise) {
    fontPromise = fetch("/assets/fonts/jakarta/PlusJakartaSans-VariableFont_wght.ttf")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load the report font")
        const bytes = new Uint8Array(await response.arrayBuffer())
        let binary = ""
        for (let start = 0; start < bytes.length; start += 8192) {
          binary += String.fromCharCode(...bytes.subarray(start, start + 8192))
        }
        return btoa(binary)
      })
      .catch((error) => {
        fontPromise = null
        throw error
      })
  }
  return fontPromise
}

export async function registerReportFont(doc) {
  doc.addFileToVFS("PlusJakartaSans.ttf", await loadReportFont())
  doc.addFont("PlusJakartaSans.ttf", REPORT_FONT, "normal")
  doc.setFont(REPORT_FONT, "normal")
}
