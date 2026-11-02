"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { getPdfPreviewSrc, PDF_PREVIEW_COMPACT_WIDTH } from "@/lib/pdfPreview"

export default function PDFPreview({ src, title = "PDF Preview", className, style, ref, onLoad, onReadyChange, ...props }) {
  const containerRef = useRef(null)
  const [compact, setCompact] = useState(null)
  const previewSrc = compact === null ? "" : getPdfPreviewSrc(src, compact)

  useEffect(() => { onReadyChange?.(false) }, [previewSrc, onReadyChange])

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) {
        setCompact(entry.contentRect.width < PDF_PREVIEW_COMPACT_WIDTH)
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className={cn("relative h-full min-h-0 w-full min-w-0 flex-1", className)} style={style} data-pdf-preview>
      {compact !== null && src && (
        <iframe
          {...props}
          key={previewSrc}
          ref={ref}
          src={previewSrc}
          title={title}
          className="absolute inset-0 h-full w-full border-0"
          data-pdf-zoom={compact ? "fit-page" : "100"}
          onLoad={(event) => {
            onReadyChange?.(true)
            onLoad?.(event)
          }}
        />
      )}
    </div>
  )
}
