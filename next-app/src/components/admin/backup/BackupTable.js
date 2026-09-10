"use client"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatPHDateTime } from "@/lib/timeFormat"
import { formatBytes } from "@/lib/utils"
import BackupPagination from "./BackupPagination"
import { cn } from "@/lib/utils"

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return <i className="ph-bold ph-caret-up-down ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"></i>
  }
  return sortOrder === "ASC" ? (
    <i className="ph-bold ph-caret-up ml-1 text-[12px] text-gray-400"></i>
  ) : (
    <i className="ph-bold ph-caret-down ml-1 text-[12px] text-gray-400"></i>
  )
}

export default function BackupTable({
  backups,
  sortedAndPaginatedBackups,
  selectedBackupIds,
  handleToggleRow,
  handleSelectAll,
  handleSort,
  sortBy,
  sortOrder,
  localLoading,
  handleSyncExternal,
  onDownloadBackup,
  onDeleteBackup,
  handleGenerateBackup,
  isFilterActive,
  onClearFilters,
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
    <>
      <div
        className={cn(
          "flex-1 overflow-hidden overflow-x-auto overflow-y-auto select-none min-h-[400px] isolate"
        )}
      >
        <table className={cn("min-w-full text-sm", sortedAndPaginatedBackups.length === 0 && "h-full")}>
          <thead className="sticky top-0 z-10 border-b-[0.5px] border-black/10 dark:border-white/10 bg-white dark:bg-card">
            <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500 h-11 select-none">
              <th className="w-12 py-0 px-4 text-center align-middle">
                <input
                  type="checkbox"
                  className={cn(
                    "h-4 w-4 cursor-pointer rounded border border-gray-300 dark:border-white/10 transition-opacity",
                    backups.length > 0 && backups.every((b) => selectedBackupIds.includes(b.id)) ? "opacity-100" : "opacity-50 hover:opacity-85"
                  )}
                  checked={
                    backups.length > 0 &&
                    backups.every((b) => selectedBackupIds.includes(b.id))
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  disabled={backups.length === 0}
                />
              </th>
              <th className="p-4 min-w-[280px]">
                <button
                  onClick={() => handleSort("filename")}
                  className={cn(
                    "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                    sortBy === "filename" ? "text-[#111111] dark:text-white font-semibold" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                  )}
                >
                  Backup Archive{" "}
                  <SortIndicator
                    column="filename"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                  />
                </button>
              </th>
              <th className="p-4 w-32 text-center">
                <button
                  onClick={() => handleSort("size_bytes")}
                  className={cn(
                    "group mx-auto flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                    sortBy === "size_bytes" ? "text-[#111111] dark:text-white font-semibold" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                  )}
                >
                  Size{" "}
                  <SortIndicator
                    column="size_bytes"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                  />
                </button>
              </th>
              <th className="p-4 w-56">
                <button
                  onClick={() => handleSort("created_at")}
                  className={cn(
                    "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                    sortBy === "created_at" ? "text-[#111111] dark:text-white font-semibold" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                  )}
                >
                  Creation Date{" "}
                  <SortIndicator
                    column="created_at"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                  />
                </button>
              </th>
              <th className="p-4 w-36 text-center text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                Status
              </th>
              <th className="p-4 pr-6 w-32 text-right text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                Action
              </th>
            </tr>
          </thead>
          <tbody className={cn("divide-y divide-gray-100 dark:divide-white/10", sortedAndPaginatedBackups.length === 0 && "h-full")}>
            {sortedAndPaginatedBackups.length === 0 ? (
              <tr className="border-0 hover:bg-transparent h-full">
                <td colSpan={6} className="border-0 p-0 h-full">
                  <Empty className="flex h-full flex-col items-center justify-center border-0 bg-transparent text-center">
                    <EmptyHeader className="flex flex-col items-center gap-0">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                        <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                          <i className={cn("ph-duotone text-xl text-gray-300 dark:text-zinc-650", isFilterActive ? "ph-magnifying-glass" : "ph-database")}></i>
                        </EmptyMedia>
                      </div>
                      <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                        {isFilterActive ? "No matches found" : "No backups detected"}
                      </EmptyTitle>
                      <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                        {isFilterActive 
                          ? "Adjust your search parameters or date range to locate specific historical records." 
                          : "There are no local database backups in the history log yet."}
                      </EmptyDescription>
                      {isFilterActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onClearFilters}
                          className="mt-6 flex h-10 items-center gap-2 rounded-brand border border-gray-300 bg-white px-6 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 tracking-wide dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                        >
                          <i className="ph-bold ph-arrow-counter-clockwise"></i>
                          Clear Search
                        </Button>
                      ) : (
                        <Button
                          onClick={handleGenerateBackup}
                          className="mt-6 flex h-10 items-center gap-2 rounded-brand btn-brand-red hover:from-red-700 hover:to-red-900 hover:shadow-md px-8 font-semibold tracking-widest text-white shadow-lg active:scale-95 transition-all dark:shadow-none"
                        >
                          <i className="ph-bold ph-lightning"></i>
                          Create Full Backup
                        </Button>
                      )}
                    </EmptyHeader>
                  </Empty>
                </td>
              </tr>
            ) : (
              sortedAndPaginatedBackups.map((b) => {
                if (!b) return null;
                const isSelected = selectedBackupIds.includes(b.id);
                return (
                  <tr
                    key={b.id}
                    className={cn(
                        "group h-[52px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0 transition-all duration-fast hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 select-none cursor-pointer",
                        isSelected && "bg-blue-50/60 dark:bg-blue-950/20"
                    )}
                    onClick={(e) => {
                      if (e.target.closest("button") || e.target.closest("input")) return
                      handleToggleRow(b.id)
                    }}
                  >
                    <td className="py-0 px-4 align-middle text-center">
                      <input
                        type="checkbox"
                        className={cn(
                          "h-4 w-4 cursor-pointer rounded border border-gray-300 dark:border-white/10 transition-opacity",
                          isSelected ? "opacity-100" : "opacity-50 group-hover:opacity-80"
                        )}
                        checked={isSelected}
                        onChange={() => handleToggleRow(b.id)}
                      />
                    </td>
                    <td className="py-2 px-4 align-middle">
                      <div className="flex items-center gap-3">
                        <span className="text-[13px] font-medium text-[#111111] dark:text-zinc-50 max-w-[280px] truncate" title={b.filename}>
                          {b.filename}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-4 align-middle text-center text-[13px] font-normal text-[#111111] dark:text-zinc-300">
                      {formatBytes(b.size_bytes)}
                    </td>
                    <td className="py-2 px-4 align-middle">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-[#111111] dark:text-zinc-50 leading-tight">
                          {formatPHDateTime(b.created_at).split(' at ')[0]}
                        </span>
                        <span className="text-[12px] font-normal text-[#8E8E93] dark:text-zinc-500 mt-[2px] leading-tight">
                          {formatPHDateTime(b.created_at).split(' at ')[1]}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-4 align-middle text-center">
                      <div className="inline-flex w-fit items-center justify-center rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium tracking-[0.04em] select-none bg-[#D1FAE5] text-[#065F46] dark:bg-emerald-950/40 dark:text-emerald-400">
                        Ready
                      </div>
                    </td>
                    <td className="py-0 px-4 pr-6 text-right align-middle">
                      <div className="inline-flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onDownloadBackup(b.id, b.filename)}
                              aria-label="Download Backup"
                              className="w-7 h-7 rounded-[6px] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/10 border-0 bg-transparent text-[#C7C7CC] dark:text-zinc-650 transition-colors hover:text-blue-500 dark:hover:text-blue-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center"
                            >
                              <i className="ph-bold ph-download-simple text-[16px]"></i>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-zinc-900 text-white border-zinc-800">
                            <p className="text-[10px]">Download to computer</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onDeleteBackup(b.id)}
                              aria-label="Delete Backup"
                              className="w-7 h-7 rounded-[6px] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/10 border-0 bg-transparent text-[#C7C7CC] dark:text-zinc-650 transition-colors hover:text-red-600 dark:hover:text-red-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center"
                            >
                              <i className="ph-bold ph-trash text-[16px]"></i>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-zinc-900 text-white border-zinc-800">
                            <p className="text-[10px]">Delete backup</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {backups.length > 0 && (
        <BackupPagination
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          startItem={startItem}
          endItem={endItem}
          totalCount={backups.length}
          itemsPerPage={itemsPerPage}
          jumpPage={jumpPage}
          setJumpPage={setJumpPage}
          handleJumpPage={handleJumpPage}
          handleItemsPerPageChange={handleItemsPerPageChange}
        />
      )}
    </>
  )
}
