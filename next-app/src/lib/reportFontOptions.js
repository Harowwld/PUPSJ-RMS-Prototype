export const DEFAULT_REPORT_FONT = "jakarta"

export const REPORT_FONT_OPTIONS = Object.freeze([
  { value: "jakarta", label: "Plus Jakarta Sans", family: "Plus Jakarta Sans", file: "PlusJakartaSans" },
  { value: "arial", label: "Arial-compatible (Liberation Sans)", family: "Liberation Sans", file: "LiberationSans" },
  { value: "times-new-roman", label: "Times New Roman-compatible (Liberation Serif)", family: "Liberation Serif", file: "LiberationSerif" },
  { value: "noto-sans", label: "Noto Sans", family: "Noto Sans", file: "NotoSans" },
  { value: "noto-serif", label: "Noto Serif", family: "Noto Serif", file: "NotoSerif" },
  { value: "inter", label: "Inter", family: "Inter", file: "Inter" },
  { value: "open-sans", label: "Open Sans", family: "Open Sans", file: "OpenSans" },
  { value: "dejavu-serif", label: "DejaVu Serif", family: "DejaVu Serif", file: "DejaVuSerif" },
  { value: "dejavu-sans", label: "DejaVu Sans", family: "DejaVu Sans", file: "DejaVuSans" },
])

export function getReportFont(value) {
  return REPORT_FONT_OPTIONS.find((font) => font.value === value) || REPORT_FONT_OPTIONS[0]
}

export function isReportFont(value) {
  return REPORT_FONT_OPTIONS.some((font) => font.value === value)
}
