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
    <div className="-mx-5 mt-4 -mb-5 flex items-center justify-between border-t border-gray-100 bg-white p-6 px-8 rounded-b-brand">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-6 text-[11px] font-black text-gray-400 uppercase tracking-widest">
          <span>
            Showing <strong className="text-gray-900">{endItem - startItem + 1}</strong> out of <strong className="text-gray-900">{totalCount}</strong> Entries
          </span>

          <div className="flex items-center gap-3 border-l border-gray-200/50 pl-6">
            <span className="text-[10px] opacity-60">Rows:</span>
            <Select
              className="h-8 w-16 cursor-pointer rounded-brand border border-gray-200 bg-white px-2 text-[10px] font-black text-gray-700 shadow-xs focus:ring-1 focus:ring-pup-maroon focus:outline-none transition-all hover:bg-gray-50"
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

      <div className="flex shrink-0 items-center gap-2 select-none">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="h-9 rounded-brand border-gray-200 bg-white px-4 text-[10px] font-black tracking-widest text-gray-500 uppercase shadow-sm transition-all hover:border-pup-maroon hover:text-pup-maroon active:scale-95 disabled:opacity-20"
        >
          <i className="ph-bold ph-caret-left mr-2 text-base"></i>
          PREV
        </Button>
        
        <div className="flex h-9 min-w-[36px] cursor-default items-center justify-center rounded-brand border border-gray-200 bg-white px-3 text-[11px] font-black text-gray-900 shadow-sm">
          {page}
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="h-9 rounded-brand border-gray-200 bg-white px-4 text-[10px] font-black tracking-widest text-gray-500 uppercase shadow-sm transition-all hover:border-pup-maroon hover:text-pup-maroon active:scale-95 disabled:opacity-20"
        >
          NEXT
          <i className="ph-bold ph-caret-right ml-2 text-base"></i>
        </Button>
      </div>
    </div>
  )
}
