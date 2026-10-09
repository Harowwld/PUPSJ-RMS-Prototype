"use client"

import HugeIcon from "@/components/shared/HugeIcon";
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { cn, formatTitleCase } from "@/lib/utils"
import { matchesSearchQuery } from "@/lib/searchUtils"

function getYear(document) {
  const year = Number(String(document?.student_no || "").split("-")[0])
  return Number.isInteger(year) && year >= 1900 && year <= 2200 ? year : null
}

export default function OfficeDocumentsTable({
  documents = [],
  officeLabel = "Office",
  breadcrumbs,
  onPreviewDocument,
  embedded = true,
}) {
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const selectedYear = Number(breadcrumbs?.find((item) => item.level === "students")?.label?.split(" ")[1])

  const rows = useMemo(() => {
    return documents
      .filter((document) => Number.isFinite(selectedYear) ? getYear(document) === selectedYear : true)
      .filter((document) =>
        matchesSearchQuery(
          [document.student_no, document.student_name, document.doc_type, document.original_filename],
          query
        )
      )
      .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
  }, [documents, query, selectedYear])

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const visibleRows = rows.slice((page - 1) * pageSize, page * pageSize)

  const containerClasses = embedded
    ? "border-t border-border dark:border-border w-full bg-white dark:bg-card flex flex-col rounded-b-2xl overflow-hidden"
    : "rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none overflow-hidden"

  return (
    <div className={containerClasses}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4 bg-gray-50/40 dark:bg-zinc-900/30 dark:border-border">
        <div>
          <h2 className="text-[15px] font-bold text-gray-900 dark:text-zinc-50">{officeLabel} Documents</h2>
          <p className="mt-1 text-[13px] text-[#8E8E93] dark:text-zinc-400">
            {rows.length} document{rows.length === 1 ? "" : "s"} in the current archive scope
          </p>
        </div>
        <div className="relative w-full max-w-xs group">
          <HugeIcon  className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 pointer-events-none" />
          <Input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1) }}
            placeholder="Search this office's documents"
            className="h-9 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 pl-9 pr-4 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
          />
        </div>
      </div>

      {visibleRows.length === 0 ? (
        <Empty className="flex min-h-[200px] flex-col items-center justify-center border-0 text-center text-gray-900 dark:text-zinc-300 rounded-b-2xl">
          <EmptyHeader className="flex flex-col items-center gap-0">
            <EmptyMedia className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-gray-50 dark:border-border dark:bg-zinc-900">
              <HugeIcon  className="ph-duotone ph-files text-3xl text-gray-400 dark:text-zinc-500" />
            </EmptyMedia>
            <EmptyTitle className="text-base font-semibold text-gray-900 dark:text-zinc-50">No {officeLabel} documents</EmptyTitle>
            <EmptyDescription className="max-w-sm text-sm text-gray-900 dark:text-zinc-300">
              Documents from other offices are intentionally excluded from this table.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 border-b border-border dark:border-border bg-white dark:bg-card">
                <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-gray-500 dark:text-zinc-400">
                  <th className="w-44 p-4 font-medium">{officeLabel === "OSAS" ? "Organization" : "Student No."}</th>
                  <th className="p-4 min-w-[200px] max-w-[260px] font-medium">{officeLabel === "OSAS" ? "Officer / Submitter" : "Full Name"}</th>
                  <th className="p-4 min-w-[180px] font-medium">Document</th>
                  <th className="w-24 p-4 font-medium">Year</th>
                  <th className="w-28 p-4 font-medium">Status</th>
                  <th className="w-24 p-4 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border bg-transparent">
                {visibleRows.map((document) => (
                  <tr key={document.id} className="transition-colors hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 select-none">
                    <td className="w-44 p-4 whitespace-nowrap align-middle">
                      {officeLabel === "OSAS" ? (
                        <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200">
                          {document.organization_name || document.verified_org_name || document.org_acronym || document.student_no || "—"}
                        </span>
                      ) : (
                        <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200">
                          {document.student_no || "—"}
                        </span>
                      )}
                    </td>
                    <td className="p-4 min-w-[200px] max-w-[260px] align-middle">
                      <div className="font-semibold text-gray-900 dark:text-zinc-100 truncate" title={formatTitleCase(document.student_name)}>
                        {formatTitleCase(document.student_name) || "—"}
                      </div>
                    </td>
                    <td className="p-4 min-w-[180px] align-middle">
                      <div className="font-semibold text-xs text-gray-900 dark:text-zinc-100">{document.doc_type}</div>
                      <div className="max-w-[260px] truncate text-xs text-gray-500 dark:text-zinc-400 mt-0.5" title={document.original_filename}>{document.original_filename}</div>
                    </td>
                    <td className="w-24 p-4 align-middle text-xs font-normal text-gray-700 dark:text-zinc-300 whitespace-nowrap">
                      {getYear(document) || "—"}
                    </td>
                    <td className="w-28 p-4 align-middle">
                      <Badge variant="outline" className={cn(
                        "rounded-full text-[10px] font-medium px-2.5 py-0.5",
                        document.approval_status === "Approved"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      )}>{document.approval_status || "Pending"}</Badge>
                    </td>
                    <td className="w-24 p-4 align-middle text-right">
                      <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => onPreviewDocument?.(document.doc_type, document.student_name, document.student_no, document.id)}
                              aria-label="Preview Document"
                              className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                            >
                              <HugeIcon className="ph-bold ph-eye text-[16px]" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Preview Document</TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border bg-white p-4 px-6 dark:border-border dark:bg-card mt-auto select-none rounded-b-2xl">
            <div className="flex items-center gap-6 text-xs text-gray-900 dark:text-zinc-300">
              <span>
                Showing {visibleRows.length} of {rows.length.toLocaleString()}
              </span>
              <div className="flex items-center gap-2">
                <span>Rows:</span>
                <div className="flex items-center gap-1">
                  {[10, 20, 50, 100].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setPageSize(size)
                        setPage(1)
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                        pageSize === size
                          ? "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
                          : "text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="text-xs text-gray-900 dark:text-zinc-300 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
              >
                Prev
              </Button>
              <div className="h-8 w-8 rounded-xl border border-[#e5e5ea] dark:border-border flex items-center justify-center text-xs font-bold text-gray-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                {page}
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                className="text-xs text-gray-900 dark:text-zinc-300 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
