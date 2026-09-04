"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function BackupPagination({
  page,
  setPage,
  totalPages,
  startItem,
  endItem,
  totalCount = 0,
  itemsPerPage,
  handleItemsPerPageChange,
}) {
  const displayedCount = totalCount > 0 ? Math.max(0, endItem - startItem + 1) : 0

  return (
    <div className="flex items-center justify-between border-t border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] p-4 px-6 rounded-b-2xl">
      <div className="flex items-center gap-6 text-xs text-gray-500 dark:text-zinc-400 select-none">
        <span>
          Showing {displayedCount} of {totalCount.toLocaleString()}
        </span>
        <div className="flex items-center gap-2">
          <span>Rows:</span>
          {[10, 20, 50, 100].map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => handleItemsPerPageChange?.({ target: { value: size } })}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                itemsPerPage === size
                  ? "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 select-none">
        <Button
          variant="ghost"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="text-xs text-gray-500 dark:text-zinc-400 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
        >
          Prev
        </Button>

        <div className="h-8 w-8 rounded-xl border border-[#e5e5ea] dark:border-zinc-800 flex items-center justify-center text-xs font-bold text-gray-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
          {page}
        </div>

        <Button
          variant="ghost"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="text-xs text-gray-500 dark:text-zinc-400 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
        >
          Next
        </Button>
      </div>
    </div>
  )
}
