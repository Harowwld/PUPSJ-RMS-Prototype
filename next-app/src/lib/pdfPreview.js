export const PDF_PREVIEW_ZOOM = 100
export const PDF_PREVIEW_COMPACT_WIDTH = 820

export function getPdfPreviewSrc(src, compact = false) {
  if (!src) return ""
  const [url, fragment = ""] = String(src).split("#", 2)
  const params = new URLSearchParams(fragment)
  params.delete("zoom")
  params.delete("view")
  params.set("toolbar", "0")
  params.set("navpanes", "0")
  if (compact) params.set("view", "Fit")
  else params.set("zoom", String(PDF_PREVIEW_ZOOM))
  return `${url}#${params}`
}
