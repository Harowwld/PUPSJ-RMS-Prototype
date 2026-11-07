"use client"

import { useEffect, useState } from "react"

export default function useCmsDraft(data, onDirtyChange) {
  const [savedData, setSavedData] = useState(null)
  const isDirty = savedData !== null && JSON.stringify(data) !== JSON.stringify(savedData)

  useEffect(() => { onDirtyChange?.(isDirty) }, [isDirty, onDirtyChange])

  useEffect(() => {
    if (!isDirty) return
    const warnBeforeLeaving = (event) => { event.preventDefault() }
    window.addEventListener("beforeunload", warnBeforeLeaving)
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving)
  }, [isDirty])

  return { isDirty, savedData, markSaved: setSavedData }
}
