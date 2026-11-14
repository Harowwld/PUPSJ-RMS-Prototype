"use client"

import { useEffect, useState } from "react"
import PDFPreviewModal from "@/components/shared/PDFPreviewModal"

function StudentRecordsReportSession({ onClose, studentNo, officeId }) {
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState("")
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    let objectUrl

    async function generateReport() {
      try {
        const params = new URLSearchParams({ officeId: officeId || "registrar" })
        const response = await fetch(
          `/api/students/${encodeURIComponent(studentNo)}/report?${params}`,
          { cache: "no-store", signal: controller.signal }
        )
        const result = await response.json()
        if (!response.ok || !result.ok) {
          throw new Error(result.error || "Unable to load this student's report.")
        }
        const { generateStudentRecordsReportPdf } = await import("@/lib/studentRecordsReportPdf")
        const blob = await generateStudentRecordsReportPdf(result.data)
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setPreview({
          url: objectUrl,
          subtitle: `${result.data.student.name} · ${result.data.student.studentNo}. Review the report before printing or downloading.`,
        })
      } catch (failure) {
        if (active) setError(failure.message || "Unable to generate the report PDF.")
      }
    }

    generateReport()
    return () => {
      active = false
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [studentNo, officeId, attempt])

  return (
    <PDFPreviewModal
      open
      onClose={onClose}
      title="Student Records Report Preview"
      description={preview?.subtitle || "Review the generated document before printing or downloading."}
      pdfUrl={preview?.url}
      preparedPdf
      isPreparing={!preview && !error}
      error={error}
      onRetry={() => {
        setError("")
        setAttempt((value) => value + 1)
      }}
      downloadFilename={`student-records-${String(studentNo).replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`}
    />
  )
}

export default function StudentRecordsReportDialog({ open, onClose, studentNo, officeId }) {
  return open ? (
    <StudentRecordsReportSession
      key={`${studentNo}:${officeId}`}
      onClose={onClose}
      studentNo={studentNo}
      officeId={officeId}
    />
  ) : null
}
