"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { paginationRange, TABLE_PAGE_SIZES } from "@/lib/tablePresentation";

export function PageControls({ page = 1, totalPages = 1, onPrevious, onNext, previousDisabled, nextDisabled, disabled = false, previousLabel = "Previous page", nextLabel = "Next page" }) {
  return <div className="table-page-controls flex items-center gap-2">
    <Button type="button" variant="ghost" size="sm" aria-label={previousLabel} disabled={disabled || (previousDisabled ?? page <= 1)} onClick={onPrevious} className="h-8 rounded-xl px-3 text-xs disabled:opacity-40">Prev</Button>
    <span aria-current="page" aria-label={`Page ${page} of ${totalPages}`} title={`Page ${page} of ${totalPages}`} className="flex h-8 min-w-8 items-center justify-center rounded-xl border border-border bg-white px-2 text-xs font-semibold tabular-nums dark:bg-zinc-900">{page}</span>
    <Button type="button" variant="ghost" size="sm" aria-label={nextLabel} disabled={disabled || (nextDisabled ?? page >= totalPages)} onClick={onNext} className="h-8 rounded-xl px-3 text-xs disabled:opacity-40">Next</Button>
  </div>;
}

export function PageSizeControls({ pageSize = 10, onPageSizeChange, disabled = false, label = "Rows per page" }) {
  if (!onPageSizeChange) return null;
  return <div role="group" aria-label={label} className="table-page-sizes flex flex-wrap items-center gap-1">
    <span className="mr-1">Rows:</span>
    {TABLE_PAGE_SIZES.map((size) => <button key={size} type="button" disabled={disabled} aria-label={`${size} rows per page`} aria-pressed={Number(pageSize) === size} onClick={() => onPageSizeChange(size)} className={cn("rounded-lg px-2.5 py-1 text-xs font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-40", Number(pageSize) === size ? "bg-gray-100 text-gray-900 dark:bg-zinc-800 dark:text-zinc-100" : "text-gray-600 hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-800")}>{size}</button>)}
  </div>;
}

export default function TablePagination({ page = 1, pageSize = 10, totalCount = 0, displayedCount, onPageChange, onPageSizeChange, loading = false, label = "Table pages", className, borderless = false }) {
  const range = paginationRange({ page, pageSize, totalCount, displayedCount });
  useEffect(() => {
    if (!loading && Number(page) !== range.page) onPageChange?.(range.page);
  }, [page, range.page, loading, onPageChange]);
  return <nav data-slot="table-pagination" aria-label={label} aria-busy={loading || undefined} className={cn("mt-auto flex min-w-0 shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 bg-white px-6 py-4 text-xs text-gray-700 dark:bg-card dark:text-zinc-200", !borderless && "border-t border-border", className)}>
    <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3">
      <span className="tabular-nums" aria-live="polite">Showing {range.start.toLocaleString()}{range.end > 0 ? `–${range.end.toLocaleString()}` : ""} of {range.total.toLocaleString()}</span>
      <PageSizeControls pageSize={pageSize} disabled={loading} onPageSizeChange={onPageSizeChange ? (size) => { onPageChange?.(1); onPageSizeChange(size); } : undefined} />
    </div>
    <PageControls page={range.page} totalPages={range.totalPages} disabled={loading} onPrevious={() => onPageChange?.(range.page - 1)} onNext={() => onPageChange?.(range.page + 1)} previousLabel={`Previous page of ${label}`} nextLabel={`Next page of ${label}`} />
  </nav>;
}
