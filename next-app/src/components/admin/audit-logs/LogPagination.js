"use client"

import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function LogPagination({
  logTotal,
  logPage,
  setLogPage,
  itemsPerPage,
  logsPerPage,
  handleItemsPerPageChange,
  jumpPage,
  setJumpPage,
  handleJumpPage,
}) {
  const startItem = (logPage - 1) * itemsPerPage + 1
  const endItem = Math.min(logPage * itemsPerPage, logTotal)
  const totalPages = Math.max(1, Math.ceil(logTotal / logsPerPage))

  return (
    <div className="-mx-6 mt-4 -mb-6 flex items-center justify-between border-t border-gray-100 bg-white p-6 px-8 rounded-b-brand dark:border-white/10 dark:bg-card">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-6 text-[11px] font-black text-gray-400 uppercase tracking-widest dark:text-zinc-500">
          <span>
            Showing <strong className="text-gray-900 dark:text-zinc-50">{endItem - startItem + 1}</strong> out of <strong className="text-gray-900 dark:text-zinc-50">{logTotal}</strong> Entries
          </span>

          <div className="flex items-center gap-3 border-l border-gray-200 pl-6 dark:border-white/10">
            <span className="text-[10px] opacity-60">Rows:</span>
            <Select
              className="h-8 w-16 cursor-pointer rounded-brand border border-gray-200 bg-white px-2 text-[10px] font-black text-gray-700 shadow-xs focus:ring-1 focus:ring-pup-maroon focus:outline-none transition-all hover:bg-gray-50 dark:border-white/10 dark:bg-card dark:text-zinc-200 dark:hover:bg-white/10"
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
          disabled={logPage <= 1}
          onClick={() => setLogPage((p) => p - 1)}
          className="h-9 rounded-brand border-gray-200 bg-white px-4 text-[10px] font-black tracking-widest text-gray-500 uppercase shadow-sm transition-all hover:border-pup-maroon hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-20 dark:border-white/10 dark:bg-card dark:text-zinc-400 dark:shadow-none"
        >
          <i className="ph-bold ph-caret-left mr-2 text-base"></i>
          PREV
        </Button>
        
        <div className="flex h-9 min-w-[36px] cursor-default items-center justify-center rounded-brand border border-gray-200 bg-white px-3 text-[11px] font-black text-gray-900 shadow-sm dark:border-white/10 dark:bg-card dark:text-zinc-50 dark:shadow-none">
          {logPage}
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={logPage >= totalPages}
          onClick={() => setLogPage((p) => p + 1)}
          className="h-9 rounded-brand border-gray-200 bg-white px-4 text-[10px] font-black tracking-widest text-gray-500 uppercase shadow-sm transition-all hover:border-pup-maroon hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-20 dark:border-white/10 dark:bg-card dark:text-zinc-400 dark:shadow-none"
        >
          NEXT
          <i className="ph-bold ph-caret-right ml-2 text-base"></i>
        </Button>
      </div>
    </div>
  )
}

