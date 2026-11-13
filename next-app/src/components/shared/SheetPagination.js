"use client";

import { PageControls, PageSizeControls } from "@/components/shared/TablePagination";
import { paginationRange } from "@/lib/tablePresentation";
import { cn } from "@/lib/utils";

export default function SheetPagination({ page = 1, totalPages = 1, onPrevious, onNext, previousDisabled, nextDisabled, disabled = false, compact = false, totalCount = 0, displayCount = 0, pageSize, onPageSizeChange, label = "Record pages", previousLabel = "Previous page", nextLabel = "Next page" }) {
  if (Number(totalCount) <= 0) return null;
  const lastPage = Math.max(1, totalPages);
  const currentPage = Math.min(Math.max(1, page), lastPage);
  const range = paginationRange({ page: currentPage, pageSize: pageSize || displayCount || 10, totalCount, displayedCount: displayCount });
  return <nav aria-label={label} className={cn("flex min-w-0 shrink-0 flex-wrap items-center gap-4 text-xs text-gray-700 dark:text-zinc-200", !compact && "justify-between px-6 py-4")}>
    {!compact && <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3">
      <span className="tabular-nums">Showing {range.start}{range.end ? `–${range.end}` : ""} of {totalCount.toLocaleString()}</span>
      <PageSizeControls pageSize={pageSize} onPageSizeChange={onPageSizeChange} disabled={disabled} />
    </div>}
    <PageControls page={currentPage} totalPages={lastPage} onPrevious={onPrevious} onNext={onNext} previousDisabled={previousDisabled} nextDisabled={nextDisabled} disabled={disabled} previousLabel={previousLabel} nextLabel={nextLabel} />
  </nav>;
}
