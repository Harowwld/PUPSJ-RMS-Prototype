"use client"

import HugeIcon from "@/components/shared/HugeIcon";
import useUrlPage from "@/hooks/useUrlPage"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia, EmptyContent } from "@/components/ui/empty"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { cn, formatTitleCase } from "@/lib/utils"
import { matchesSearchQuery } from "@/lib/searchUtils"

function getYear(document) {
  const year = Number(String(document?.student_no || "").split("-")[0])
  return Number.isInteger(year) && year >= 1900 && year <= 2200 ? year : null
}

function getSelectedYear(breadcrumbs) {
  const label = breadcrumbs?.find((item) => item.level === "students")?.label || ""
  const match = String(label).match(/\b(\d{4})\b/)
  return match ? Number(match[1]) : null
}

export default function OfficeDocumentsTable({
  documents = [],
  officeLabel = "Office",
  breadcrumbs,
  onPreviewDocument,
  onRescan,
  embedded = true,
}) {
  const [query, setQuery] = useState("")
  const [page, setPage] = useUrlPage()
  const [pageSize, setPageSize] = useState(10)
  const selectedYear = getSelectedYear(breadcrumbs)

  const rows = useMemo(() => {
    return documents
      .filter((document) => selectedYear == null || getYear(document) === selectedYear)
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
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <HugeIcon className="ph-bold ph-magnifying-glass text-sm text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400" />
          </div>
          <Input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1) }}
            placeholder="Search this office's documents"
            className="h-9 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 pl-8 pr-16 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
          />
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[11px] font-mono text-gray-400 dark:text-zinc-500">
            {rows.length.toLocaleString()}
          </div>
        </div>
      </div>

      {visibleRows.length === 0 ? (
        <div className="py-16 rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[360px] w-full">
          <Empty className="flex h-full flex-col items-center justify-center border-0 bg-transparent text-center text-gray-900 dark:text-zinc-300">
            <EmptyHeader className="flex flex-col items-center gap-0">
              <div className="relative mb-6">
                <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card" />
                <EmptyMedia className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-white shadow-md dark:border-border dark:bg-card dark:shadow-none">
                  <HugeIcon className="ph-duotone ph-files text-3xl text-pup-maroon dark:text-red-400" />
                </EmptyMedia>
              </div>
              <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                No {officeLabel} Documents
              </EmptyTitle>
              <EmptyDescription className="max-w-xs text-xs font-medium text-gray-900 dark:text-zinc-300 mt-1">
                {query.trim()
                  ? "No documents match your active search terms. Try clearing your query."
                  : "Documents from other offices are intentionally excluded from this table."}
              </EmptyDescription>
            </EmptyHeader>
            {query.trim() && (
              <EmptyContent>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuery("")}
                  title="Clear Search"
                  className="h-10 px-5 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer active:scale-95 transition-all shadow-xs"
                >
                  Clear Search
                </Button>
              </EmptyContent>
            )}
          </Empty>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed min-w-[960px]">
              <thead className="sticky top-0 z-10 border-b border-border dark:border-border bg-white dark:bg-card">
                <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-gray-500 dark:text-zinc-400">
                  <th className="w-[16%] p-4 font-medium">{officeLabel === "OSAS" ? "Organization" : "Student No."}</th>
                  <th className="w-[26%] p-4 font-medium">{officeLabel === "OSAS" ? "Officer / Submitter" : "Full Name"}</th>
                  <th className="w-[28%] p-4 font-medium">Document</th>
                  <th className="w-[10%] p-4 font-medium">Year</th>
                  <th className="w-[12%] p-4 font-medium">Status</th>
                  <th className="w-24 p-4 pr-6 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border bg-transparent">
                {visibleRows.map((document) => (
                  <tr key={document.id} className="transition-colors hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 select-none">
                    <td className="p-4 align-middle overflow-hidden whitespace-nowrap">
                      {officeLabel === "OSAS" ? (
                        <span
                          className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 truncate inline-block max-w-full"
                          title={document.organization_name || document.verified_org_name || document.org_acronym || document.student_no || "N/A"}
                        >
                          {document.organization_name || document.verified_org_name || document.org_acronym || document.student_no || "N/A"}
                        </span>
                      ) : (
                        <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200">
                          {document.student_no || "N/A"}
                        </span>
                      )}
                    </td>
                    <td className="p-4 align-middle overflow-hidden">
                      <div className="font-semibold text-gray-900 dark:text-zinc-100 truncate" title={formatTitleCase(document.student_name)}>
                        {formatTitleCase(document.student_name) || "N/A"}
                      </div>
                    </td>
                    <td className="p-4 align-middle overflow-hidden">
                      <div className="font-semibold text-xs text-gray-900 dark:text-zinc-100 truncate" title={document.doc_type}>{document.doc_type}</div>
                      <div className="truncate text-xs text-gray-500 dark:text-zinc-400 mt-0.5" title={document.original_filename}>{document.original_filename}</div>
                    </td>
                    <td className="p-4 align-middle text-xs font-normal text-gray-700 dark:text-zinc-300 whitespace-nowrap">
                      {getYear(document) || "N/A"}
                    </td>
                    <td className="p-4 align-middle whitespace-nowrap">
                      <Badge variant="outline" className={cn(
                        "rounded-full text-[10px] font-medium px-2.5 py-0.5",
                        document.approval_status === "Approved"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      )}>{document.approval_status || "Pending"}</Badge>
                    </td>
                    <td className="p-4 pr-6 align-middle text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {onRescan && !document.source_type && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() =>
                                  onRescan?.(
                                    document.student_no,
                                    document.doc_type,
                                    document.id,
                                    document.original_filename,
                                    document.mime_type
                                  )
                                }
                                aria-label="Re-scan Document"
                                className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                              >
                                <HugeIcon className="ph-bold ph-arrows-counter-clockwise text-[15px]" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Re-scan Document</TooltipContent>
                          </Tooltip>
                        )}
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
