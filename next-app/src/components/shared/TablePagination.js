"use client";
import { BADGE_BASE } from "@/lib/badgeStyles";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { paginationRange, TABLE_PAGE_SIZES } from "@/lib/tablePresentation";

export function PageControls({
  page = 1,
  totalPages = 1,
  onPrevious,
  onNext,
  previousDisabled,
  nextDisabled,
  disabled = false,
  previousLabel = "Previous page",
  nextLabel = "Next page",
}) {
  return (
    <div className="table-page-controls flex items-center gap-1.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={previousLabel}
        disabled={disabled || (previousDisabled ?? page <= 1)}
        onClick={onPrevious}
        className="h-8 rounded-full px-3 text-xs disabled:opacity-40 active:scale-95 transition-all"
      >
        Prev
      </Button>
      <span
        aria-current="page"
        aria-label={`Page ${page} of ${totalPages}`}
        title={`Page ${page} of ${totalPages}`}
        className={cn("min-w-8 bg-black/[0.02] dark:bg-white/[0.04] tabular-nums text-gray-900 dark:text-zinc-100", BADGE_BASE)}
      >
        {page}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={nextLabel}
        disabled={disabled || (nextDisabled ?? page >= totalPages)}
        onClick={onNext}
        className="h-8 rounded-full px-3 text-xs disabled:opacity-40 active:scale-95 transition-all"
      >
        Next
      </Button>
    </div>
  );
}

export function PageSizeControls({
  pageSize = 10,
  onPageSizeChange,
  disabled = false,
  label = "Rows per page",
}) {
  if (!onPageSizeChange) return null;
  return (
    <div role="group" aria-label={label} className="table-page-sizes flex flex-wrap items-center gap-1.5">
      <span className="text-gray-500 dark:text-zinc-400 text-xs">Rows:</span>
      <div className="inline-flex items-center gap-0.5 p-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08]">
        {TABLE_PAGE_SIZES.map((size) => (
          <button
            key={size}
            type="button"
            disabled={disabled}
            aria-label={`${size} rows per page`}
            aria-pressed={Number(pageSize) === size}
            onClick={() => onPageSizeChange(size)}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-40 active:scale-95",
              Number(pageSize) === size
                ? "bg-white text-gray-950 font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.8)] dark:bg-zinc-800 dark:text-white dark:shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
                : "text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            )}
          >
            {size}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function TablePagination({
  page = 1,
  pageSize = 10,
  totalCount = 0,
  displayedCount,
  onPageChange,
  onPageSizeChange,
  loading = false,
  label = "Table pages",
  className,
  borderless = false,
}) {
  const range = paginationRange({ page, pageSize, totalCount, displayedCount });
  useEffect(() => {
    if (!loading && Number(page) !== range.page) onPageChange?.(range.page);
  }, [page, range.page, loading, onPageChange]);

  if (Number(totalCount) <= 0 && !loading) {
    return null;
  }

  return (
    <nav
      data-slot="table-pagination"
      aria-label={label}
      aria-busy={loading || undefined}
      className={cn(
        "mt-auto flex min-w-0 shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 bg-white px-6 py-4 text-xs text-gray-700 dark:bg-card dark:text-zinc-200",
        !borderless && "border-t border-border",
        className
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3">
        <span className="tabular-nums text-gray-600 dark:text-zinc-400" aria-live="polite">
          Showing <span className="font-semibold text-gray-900 dark:text-zinc-100">{range.start.toLocaleString()}</span>
          {range.end > 0 ? `–${range.end.toLocaleString()}` : ""} of{" "}
          <span className="font-semibold text-gray-900 dark:text-zinc-100">{range.total.toLocaleString()}</span>
        </span>
        <PageSizeControls
          pageSize={pageSize}
          disabled={loading}
          onPageSizeChange={
            onPageSizeChange
              ? (size) => {
                  onPageChange?.(1);
                  onPageSizeChange(size);
                }
              : undefined
          }
        />
      </div>
      <PageControls
        page={range.page}
        totalPages={range.totalPages}
        disabled={loading}
        onPrevious={() => onPageChange?.(range.page - 1)}
        onNext={() => onPageChange?.(range.page + 1)}
        previousLabel={`Previous page of ${label}`}
        nextLabel={`Next page of ${label}`}
      />
    </nav>
  );
}
