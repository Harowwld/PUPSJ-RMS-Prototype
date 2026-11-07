"use client"

import { useEffect, useRef, useState } from "react"
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";
import { toast } from "sonner"
import { Search01Icon, AlertCircleIcon } from "hugeicons-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import PDFPreviewModal from "@/components/shared/PDFPreviewModal"
import { generateComplianceRosterPdf } from "@/lib/complianceRosterPdf"
import { generateExportFilename } from "@/lib/exportHelpers"
import { formatPHDateTime } from "@/lib/timeFormat"
import SheetPagination from "@/components/shared/SheetPagination"
import ComplianceStudentsList from "@/components/shared/ComplianceStudentsList"

const endpoint = "/api/analytics/digitization-compliance/missing-students"

function download(blob, extension) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = generateExportFilename("COMPLIANCE", "INCOMPLETE", extension)
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function ComplianceStudentsSheet({
  open,
  onClose,
  documentType,
  filters = {},
}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value))
      value.forEach((entry) => params.append(key, entry))
    else if (value !== undefined && value !== null)
      params.set(key, String(value))
  }
  if (documentType?.documentTypeId)
    params.set("documentTypeId", documentType.documentTypeId)
  params.set("complianceStatus", "incomplete")
  const query = params.toString()
  return (
    <ComplianceStudentsSheetContent
      key={query}
      {...{ open, onClose, documentType, query }}
    />
  )
}

function ComplianceStudentsSheetContent({
  open,
  onClose,
  documentType,
  query,
}) {
  const [data, setData] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [offset, setOffset] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [retry, setRetry] = useState(0)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(null)
  const actionController = useRef(null)
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setLoading(true)
      setError("")
      fetch(`${endpoint}?${query}&offset=${offset}&limit=${pageSize}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const json = await response.json()
          if (!response.ok || !json.ok)
            throw new Error(json.error || "Unable to load incomplete records")
          if (!controller.signal.aborted) setData({ ...json.data, query })
        })
        .catch((failure) => {
          if (!controller.signal.aborted) {
            setData(null)
            setError(failure.message)
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 0)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [open, query, offset, pageSize, retry])

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url)
    },
    [preview]
  )
  useEffect(() => () => actionController.current?.abort(), [])

  const close = () => {
    actionController.current?.abort()
    setBusy(false)
    setPreview(null)
    setOffset(0)
    setData(null)
    setError("")
    onClose()
  }

  const exportRoster = async (format) => {
    const controller = new AbortController()
    actionController.current = controller
    setBusy(true)
    try {
      const response = await fetch(
        `${endpoint}?${query}&${format === "csv" ? "format=csv" : "export=1"}`,
        {
          cache: "no-store",
          signal: controller.signal,
        }
      )
      if (!response.ok) {
        const json = await response.json()
        throw new Error(json.error || "Unable to export incomplete records")
      }
      if (format === "csv") download(await response.blob(), "csv")
      else {
        const json = await response.json()
        const blob = await generateComplianceRosterPdf(json.data)
        if (controller.signal.aborted) return
        setPreview({
          url: URL.createObjectURL(blob),
          total: json.data.total,
          generatedAt: json.data.meta.generatedAt,
        })
      }
    } catch (failure) {
      if (!controller.signal.aborted)
        toast.error("Report Export Failed", { description: failure.message })
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }
  const current =
    data?.query === query && data.offset === offset && data.limit === pageSize
      ? data
      : null
  const disabled = busy || loading || !current?.total || !!error

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(value) => {
          if (!value) close()
        }}
      >
        <SheetContent
          side="right"
          size="default"
          className="overflow-hidden p-0"
        >
          <SheetHeader className="shrink-0 px-6 py-4 pr-16">
            <SheetTitle>Incomplete Records</SheetTitle>
            <SheetDescription>
              {documentType?.documentType || "All compliance requirements"}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-2 pb-6">
            {loading || (!current && !error) ? (
              <div
                className="divide-y divide-border"
                aria-label="Loading incomplete records"
                role="status"
              >
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-5"
                    aria-hidden="true"
                  >
                    <div className="space-y-2.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-8 w-20 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <EmptyState
                variant="compact"
                icon={AlertCircleIcon}
                title="Could Not Load Incomplete Records"
                description={error}
              >
                <Button
                  variant="outline"
                  onClick={() => setRetry((value) => value + 1)}
                >
                  Retry Loading
                </Button>
              </EmptyState>
            ) : !current?.meta.configured ? (
              <EmptyState
                variant="compact"
                icon={Search01Icon}
                title="No Requirements Configured"
                description="Configure compliance document types before generating a report."
              />
            ) : !current?.total ? (
              <EmptyState
                variant="compact"
                icon={Search01Icon}
                title="No Incomplete Records"
                description="No outstanding requirements match these filters."
              />
            ) : (
              <>
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 text-[12px] text-gray-500 dark:text-zinc-400">
                  <p>
                    <span className="mr-1.5 text-[18px] font-semibold tracking-[-0.02em] text-gray-900 tabular-nums dark:text-zinc-50">
                      {current.total.toLocaleString()}
                    </span>{" "}
                    {current.total === 1 ? "student" : "students"}
                  </p>
                  <span>
                    {current.meta.requireApproved
                      ? "Approved evidence required"
                      : "Pending uploads count as submitted"}
                  </span>
                </div>
                <ComplianceStudentsList
                  key={`${query}:${offset}:${pageSize}`}
                  students={current.students}
                  singleDocument={Boolean(documentType?.documentTypeId)}
                />
              </>
            )}
          </div>
          {data?.query === query && data.total > 0 && (
            <SheetPagination
              label="Incomplete records pages"
              page={Math.floor(offset / pageSize) + 1}
              totalPages={Math.ceil(data.total / pageSize)}
              totalCount={data.total}
              displayCount={current?.students.length ?? data.students.length}
              pageSize={pageSize}
              disabled={loading || !current}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setOffset(0)
              }}
              onPrevious={() => setOffset(Math.max(0, offset - pageSize))}
              onNext={() => setOffset(offset + pageSize)}
            />
          )}
          <SheetFooter className="shrink-0 flex-wrap justify-between px-6 py-4">
            <Button size="sm" variant="outline" className="h-9 px-4" onClick={close}>
              Close
            </Button>
            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
              <Button
                size="sm"
                variant="outline"
                className="h-9 px-4"
                disabled={disabled}
                onClick={() => exportRoster("csv")}
              >
                Export CSV
              </Button>
              <Button size="sm" className="h-9 px-4" disabled={disabled} onClick={() => exportRoster("pdf")}>
                {busy ? "Preparing PDF…" : PDF_ACTION_LABELS.preview}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <PDFPreviewModal
        open={open && !!preview}
        onClose={() => setPreview(null)}
        title="Incomplete Records Report Preview"
        description={preview ? `${preview.total} students · ${formatPHDateTime(preview.generatedAt)}` : ""}
        pdfUrl={preview?.url}
        downloadFilename={generateExportFilename("COMPLIANCE", "INCOMPLETE", "pdf")}
      />
    </>
  )
}
