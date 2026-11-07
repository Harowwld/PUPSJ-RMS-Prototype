"use client"

import { useEffect, useState } from "react"
import { createPdfPreviewSession } from "@/lib/pdfPreviewSession"

export default function usePdfPreviewSession() {
  const [session] = useState(createPdfPreviewSession)
  useEffect(() => () => session.cancel(), [session])
  return session
}
