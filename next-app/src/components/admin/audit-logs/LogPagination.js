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
    <div className="flex items-center justify-between border-t border-gray-100 bg-white p-6 px-8 rounded-b-brand dark:border-white/10 dark:bg-card">
      <div className="flex items-center gap-8 select-none cursor-default">
        <div className="flex items-center gap-6 text-[12px] font-normal text-gray-400 dark:text-zinc-500">
          <span>
            Showing {endItem - startItem + 1} of {logTotal}
          </span>

          <div className="flex items-center gap-1.5 border-l border-gray-200 pl-6 dark:border-white/10">
            <span className="text-[12px] text-gray-400 dark:text-zinc-500">Rows:</span>
            <div className="flex items-center gap-1">
              {[10, 20, 50, 100].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleItemsPerPageChange({ target: { value: size } })}
                  className={`px-2 py-0.5 rounded-[4px] text-[12px] font-normal cursor-pointer transition-colors border-0 ${
                    itemsPerPage === size
                      ? "bg-gray-100 text-[#111111] font-medium dark:bg-white/10 dark:text-zinc-50"
                      : "bg-transparent text-gray-450 dark:text-zinc-550 hover:text-gray-700 dark:hover:text-zinc-300"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 select-none">
        <button
          disabled={logPage <= 1}
          onClick={() => setLogPage((p) => Math.max(1, p - 1))}
          className="h-8 bg-transparent text-[12px] font-normal text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
        >
          Prev
        </button>

        <div className="flex h-8 min-w-[32px] items-center justify-center rounded-[6px] border border-gray-200/80 bg-white px-2.5 text-[12px] font-medium text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-100">
          {logPage}
        </div>

        <button
          disabled={logPage >= totalPages}
          onClick={() => setLogPage((p) => p + 1)}
          className="h-8 bg-transparent text-[12px] font-normal text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
        >
          Next
        </button>
      </div>
    </div>
  )
}

