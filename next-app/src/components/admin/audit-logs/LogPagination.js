"use client"

import { Button } from "@/components/ui/button"
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
    <div className="-mx-6 mt-4 -mb-6 flex items-center justify-between border-t border-gray-100 bg-gray-50/50 p-4 px-6">
      <div className="flex items-center gap-6">
        {logTotal > 0 && (
          <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
            <span>
              {startItem}-{endItem} of{" "}
              <strong className="text-gray-900">
                {logTotal.toLocaleString()}
              </strong>{" "}
              entries
            </span>

            <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase">
                Rows:
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <select
                    className="h-7 w-16 cursor-pointer rounded-brand border border-gray-300 bg-white px-1 text-[10px] font-bold text-gray-700 focus:ring-1 focus:ring-pup-maroon focus:outline-none"
                    value={itemsPerPage}
                    onChange={handleItemsPerPageChange}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </TooltipTrigger>
                <TooltipContent side="top" className="rounded-brand">
                  Items per page
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}
      </div>

      {logTotal > 0 && (
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={logPage <= 1}
            onClick={() => setLogPage((p) => p - 1)}
            className="h-8 rounded-brand border border-gray-300 bg-white px-3 text-[10px] font-black tracking-widest text-gray-600 uppercase shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95 disabled:opacity-30"
          >
            <i className="ph-bold ph-caret-left mr-1"></i> PREV
          </Button>
          <div className="flex h-8 min-w-[32px] items-center justify-center rounded-md border border-gray-200 bg-white px-2 text-[11px] font-bold text-gray-700 shadow-xs focus-within:border-pup-maroon focus-within:ring-1 focus-within:ring-pup-maroon">
            <input
              type="text"
              className="w-6 bg-transparent text-center focus:outline-none"
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              onKeyDown={handleJumpPage}
              onBlur={handleJumpPage}
            />
            <span className="mx-0.5 text-gray-400">/</span>
            <span>{totalPages}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={logPage >= totalPages}
            onClick={() => setLogPage((p) => p + 1)}
            className="h-8 rounded-brand border border-gray-300 bg-white px-3 text-[10px] font-black tracking-widest text-gray-600 uppercase shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95 disabled:opacity-30"
          >
            NEXT <i className="ph-bold ph-caret-right ml-1"></i>
          </Button>
        </div>
      )}
    </div>
  )
}
