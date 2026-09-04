"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import { cn } from "@/lib/utils"

function getYear(document) {
  const year = Number(String(document?.student_no || "").split("-")[0])
  return Number.isInteger(year) && year >= 1900 && year <= 2200 ? year : null
}

export default function OfficeDocumentsTable({ documents = [], officeLabel = "Office", breadcrumbs, onPreviewDocument }) {
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 10
  const selectedYear = Number(breadcrumbs?.find((item) => item.level === "students")?.label?.split(" ")[1])

  const rows = useMemo(() => {
    const search = query.trim().toLowerCase()
    return documents
      .filter((document) => Number.isFinite(selectedYear) ? getYear(document) === selectedYear : true)
      .filter((document) => {
        if (!search) return true
        return [document.student_no, document.student_name, document.doc_type, document.original_filename]
          .some((value) => String(value || "").toLowerCase().includes(search))
      })
      .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
  }, [documents, query, selectedYear])

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const visibleRows = rows.slice((page - 1) * pageSize, page * pageSize)

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-6 py-4 dark:border-white/10">
        <div>
          <h2 className="text-[15px] font-bold text-gray-900 dark:text-zinc-50">{officeLabel} Documents</h2>
          <p className="mt-1 text-[13px] text-[#8E8E93] dark:text-zinc-400">
            {rows.length} document{rows.length === 1 ? "" : "s"} in the current archive scope
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <i className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
          <Input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1) }}
            placeholder="Search this office's documents"
            className="h-9 rounded-brand pl-9 text-sm"
          />
        </div>
      </div>

      {visibleRows.length === 0 ? (
        <Empty className="flex min-h-[260px] flex-col items-center justify-center border-0 text-center text-gray-500 dark:text-zinc-400">
          <EmptyHeader className="flex flex-col items-center gap-0">
            <EmptyMedia className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-zinc-900">
              <i className="ph-duotone ph-files text-2xl text-gray-300 dark:text-zinc-600" />
            </EmptyMedia>
            <EmptyTitle className="text-base font-semibold text-gray-900 dark:text-zinc-50">No {officeLabel} documents</EmptyTitle>
            <EmptyDescription className="max-w-sm text-sm text-gray-500 dark:text-zinc-400">
              Documents from other offices are intentionally excluded from this table.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50/70 dark:border-white/10 dark:bg-white/5">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-[#8E8E93] dark:text-zinc-500">
                  <th className="px-6 py-3">Student No.</th>
                  <th className="px-6 py-3">Student Name</th>
                  <th className="px-6 py-3">Document</th>
                  <th className="px-6 py-3">Year</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                {visibleRows.map((document) => (
                  <tr key={document.id} className="transition-colors hover:bg-gray-50/70 dark:hover:bg-white/5">
                    <td className="px-6 py-3 font-mono text-xs text-gray-700 dark:text-zinc-300">{document.student_no || "—"}</td>
                    <td className="px-6 py-3 font-medium text-gray-900 dark:text-zinc-50">{document.student_name || "—"}</td>
                    <td className="px-6 py-3">
                      <div className="font-medium text-gray-800 dark:text-zinc-200">{document.doc_type}</div>
                      <div className="max-w-[260px] truncate text-xs text-gray-500 dark:text-zinc-500">{document.original_filename}</div>
                    </td>
                    <td className="px-6 py-3 text-gray-600 dark:text-zinc-400">{getYear(document) || "—"}</td>
                    <td className="px-6 py-3">
                      <Badge variant="outline" className={cn(
                        "rounded-full text-[10px]",
                        document.approval_status === "Approved"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-700"
                      )}>{document.approval_status || "Pending"}</Badge>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-brand text-xs"
                        onClick={() => onPreviewDocument?.(document.doc_type, document.student_name, document.student_no, document.id)}
                      >
                        <i className="ph-bold ph-eye mr-1" /> Preview
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3 text-xs text-gray-500 dark:border-white/10 dark:text-zinc-500">
            <span>Showing {visibleRows.length} of {rows.length}</span>
            <div className="flex items-center gap-3">
              <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="disabled:opacity-40">Prev</button>
              <span className="font-medium text-gray-800 dark:text-zinc-200">{page} / {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="disabled:opacity-40">Next</button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
