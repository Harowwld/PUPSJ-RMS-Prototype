"use client"

import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function BackupPagination({
  page,
  setPage,
  totalPages,
  startItem,
  endItem,
  totalCount,
  itemsPerPage,
  jumpPage,
  setJumpPage,
  handleJumpPage,
  handleItemsPerPageChange,
}) {
  return (
    <div className="flex items-center justify-between border-t border-gray-100 bg-white p-6 px-8 rounded-b-2xl dark:border-white/10 dark:bg-card">
      <div className="flex items-center gap-8 select-none cursor-default">
        <div className="flex items-center gap-6 text-[11px] font-black text-gray-400 uppercase tracking-widest dark:text-zinc-500">
          <span>
            SHOWING <strong className="text-gray-900 dark:text-zinc-50">{endItem - startItem + 1}</strong> OUT OF <strong className="text-gray-900 dark:text-zinc-50">{totalCount.toLocaleString()}</strong> ENTRIES
          </span>

          <div className="flex items-center gap-3 border-l border-gray-200 pl-6 dark:border-white/10">
            <span className="text-[10px] opacity-60">ROWS:</span>
            <Select
              className="h-8 w-16 cursor-pointer rounded-brand border border-gray-300 bg-white px-2 text-[10px] font-bold text-gray-700 focus:ring-1 focus:ring-pup-maroon focus:outline-none transition-all hover:bg-gray-50 dark:bg-card dark:text-zinc-200 dark:hover:bg-white/10 dark:border-white/10"
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 select-none">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="h-10 rounded-brand border border-gray-300 bg-white px-5 text-[10px] font-black tracking-widest text-gray-600 uppercase shadow-sm transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-30 dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
        >
          <i className="ph-bold ph-caret-left mr-2 text-base"></i>
          PREV
        </Button>
        
        <div className="flex h-9 min-w-[48px] cursor-default items-center justify-center rounded-brand border border-gray-200 bg-white px-3 text-[11px] font-black text-gray-900 shadow-sm dark:border-white/10 dark:bg-card dark:text-zinc-50 dark:shadow-none">
          {page}
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="h-10 rounded-brand border border-gray-300 bg-white px-5 text-[10px] font-black tracking-widest text-gray-500 uppercase shadow-sm transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-30 dark:bg-card dark:text-zinc-400 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
        >
          NEXT
          <i className="ph-bold ph-caret-right ml-2 text-base"></i>
        </Button>
      </div>
    </div>
  )
}

