import { DEFAULT_REPORT_FONT, getReportFont } from "./reportFontOptions.js"

export const DEFAULT_BRANDING_LOGO = "/assets/pup-logo.webp"
export const OFFICIAL_FALLBACK_LOGO = "/assets/branding/black-icon.png"
export const BRANDING_CACHE_KEY = "institution_branding_cache"

export const BRANDING_UPLOAD_LIMITS = Object.freeze({
  maxFileSize: 3 * 1024 * 1024,
  maxBase64Length: 4 * 1024 * 1024,
  allowedMimeTypes: Object.freeze(["image/png", "image/webp", "image/jpeg", "image/svg+xml"]),
  acceptedExtensionsDescription: "PNG, JPEG, WebP, SVG (max 3 MB)",
})

export const DEFAULT_BRANDING = Object.freeze({
  institutionName: "Polytechnic University of the Philippines",
  campusName: "San Juan City Campus",
  tagline: "OFFICIAL ACADEMIC ARCHIVES & RECORDS",
  jurisdictionHeader: "Republic of the Philippines",
  documentCodePrefix: "PUPSJ",
  brandColor: "#7A1E28",
  reportFont: DEFAULT_REPORT_FONT,
  logoUrl: DEFAULT_BRANDING_LOGO,
  fallbackLogoUrl: OFFICIAL_FALLBACK_LOGO,
  logoBase64: null,
  secondaryLogoUrl: null,
  secondaryLogoBase64: null,
  signatoryPreparerTitle: "",
  signatoryRegistrarTitle: "",
  signatoryHeadTitle: "",
})

export function deriveDocumentPrefix(institutionName = "", campusName = "") {
  const initials = (value) => {
    const words = String(value || "").replace(/[^a-zA-Z0-9\s]/g, " ").split(/\s+/).filter(Boolean)
    const stop = new Set(["of", "the", "and", "in", "at", "for", "ng", "mga", "city", "campus", "branch"])
    const significant = words.filter((word) => !stop.has(word.toLowerCase()))
    return (significant.length ? significant : words).map((word) => word[0]).join("").toUpperCase().slice(0, 5)
  }
  return `${initials(institutionName) || "RMS"}${initials(campusName)}`.slice(0, 8)
}

export function resolveBranding(value = {}) {
  const branding = { ...DEFAULT_BRANDING, ...Object.fromEntries(Object.entries(value || {}).filter(([, field]) => field !== undefined)) }
  branding.institutionName = branding.institutionName || DEFAULT_BRANDING.institutionName
  branding.documentCodePrefix = deriveDocumentPrefix(branding.institutionName, branding.campusName)
  branding.reportFont = getReportFont(branding.reportFont).value
  return branding
}

export async function getInstitutionalBranding() {
  if (typeof window === "undefined") return resolveBranding()
  try {
    const response = await fetch("/api/system/branding", { cache: "no-store" })
    if (response.ok) {
      const result = await response.json()
      if (result.ok && result.data) {
        const branding = resolveBranding(result.data)
        try { localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(branding)) } catch {}
        return branding
      }
    }
  } catch {}
  try {
    const cached = JSON.parse(localStorage.getItem(BRANDING_CACHE_KEY))
    if (cached && typeof cached === "object") return resolveBranding(cached)
  } catch {}
  return resolveBranding()
}

export function hexToRgb(value) {
  let hex = String(value || "").replace(/^#/, "")
  if (/^[0-9a-f]{3}$/i.test(hex)) hex = [...hex].map((char) => char + char).join("")
  if (!/^[0-9a-f]{6}$/i.test(hex)) return [122, 30, 40]
  return [0, 2, 4].map((start) => parseInt(hex.slice(start, start + 2), 16))
}

export async function getLogoAsPng(source, fallbackToDefault = true) {
  if (!source && !fallbackToDefault) return null
  if (typeof window === "undefined" || typeof Image === "undefined") {
    return source?.startsWith("data:image/png") ? source : null
  }
  const candidates = [...new Set([source, ...(fallbackToDefault ? [DEFAULT_BRANDING_LOGO, OFFICIAL_FALLBACK_LOGO] : [])].filter(Boolean))]
  for (const candidate of candidates) {
    const result = await new Promise((resolve) => {
      const image = new Image()
      image.crossOrigin = "anonymous"
      image.onload = () => {
        try {
          const canvas = document.createElement("canvas")
          canvas.width = image.naturalWidth || 192
          canvas.height = image.naturalHeight || 192
          canvas.getContext("2d").drawImage(image, 0, 0)
          resolve(canvas.toDataURL("image/png"))
        } catch { resolve(null) }
      }
      image.onerror = () => resolve(null)
      image.src = candidate
    })
    if (result) return result
  }
  return null
}
