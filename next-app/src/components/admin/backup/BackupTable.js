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
  scope = "office",
  externalDriveConnected = false,
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
              {scope === "office" ? (
                <th className="p-4 w-64 text-center text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                  <div className="inline-flex items-center justify-center gap-1.5">
                    <span>Backup Copies</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <i className="ph-bold ph-info text-[13px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs font-normal">
                        Shows where this backup is safely stored: on Internal Storage and an External Drive.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>
              ) : (
                <th className="p-4 w-36 text-center text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                  Status
                </th>
              )}
              <th className="p-4 pr-6 w-32 text-right text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                Actions
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
                          className="mt-6 h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-6 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                        >
                          Clear
                        </Button>
                      ) : (
                        <Button
                          onClick={handleGenerateBackup}
                          className="mt-6 h-10 rounded-xl btn-brand-red px-6 text-xs font-semibold text-white shadow-xs active:scale-95 transition-all cursor-pointer border-0"
                        >
                          Create
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
                    {scope === "office" ? (
                      <td className="py-2 px-4 align-middle text-center">
                        <div className="flex mx-auto w-fit items-center justify-center gap-2">
                          {/* Node 1: Internal Storage */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium tracking-[0.04em] select-none",
                                  b.status_local === "Success"
                                    ? "bg-[#D1FAE5] text-[#065F46] dark:bg-emerald-950/40 dark:text-emerald-400"
                                    : "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-400"
                                )}
                              >
                                <i className="ph-bold ph-hard-drive text-[11px]" />
                                <span>Internal Storage</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              <p className="font-semibold">Internal Storage</p>
                              <p className="text-[11px] opacity-80">
                                {b.status_local === "Success"
                                  ? "Backup safely saved on internal system storage"
                                  : "Preparing backup"}
                              </p>
                            </TooltipContent>
                          </Tooltip>

                          {/* Node 2: External Hard Drive */}
                          {b.status_external === "Success" ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="inline-flex items-center gap-1 rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium tracking-[0.04em] select-none bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/40">
                                  <i className="ph-bold ph-check-circle text-[11px]" />
                                  <span>External Drive</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                <p className="font-semibold">External Hard Drive</p>
                                <p className="text-[11px] opacity-80">
                                  Backup copy verified on your connected external drive
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          ) : !externalDriveConnected ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="inline-flex items-center gap-1 rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium tracking-[0.04em] select-none bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-500 border border-gray-200 dark:border-white/10 cursor-not-allowed">
                                  <i className="ph-bold ph-plugs text-[11px]" />
                                  <span>Drive Offline</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                <p className="font-semibold">External Drive Disconnected</p>
                                <p className="text-[11px] opacity-80">
                                  Connect an external USB drive and click &quot;Detect Drive&quot; to copy this backup.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleSyncExternal?.(b.id)
                                  }}
                                  disabled={localLoading?.syncingId === b.id}
                                  className={cn(
                                    "h-[22px] px-2 rounded-[4px] text-[11px] font-medium tracking-[0.04em] active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1 border",
                                    b.status_external === "Failed"
                                      ? "border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100"
                                      : "border-blue-200 dark:border-blue-800/60 bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                  )}
                                >
                                  {localLoading?.syncingId === b.id ? (
                                    <>
                                      <i className="ph-bold ph-arrows-clockwise animate-spin text-[11px]" />
                                      <span>Copying...</span>
                                    </>
                                  ) : (
                                    <>
                                      <i className="ph-bold ph-hard-drives text-[11px]" />
                                      <span>{b.status_external === "Failed" ? "Retry Copy" : "Copy to Drive"}</span>
                                    </>
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                <p className="font-semibold">Save to External Drive</p>
                                <p className="text-[11px] opacity-80">
                                  Copy this backup to your external hard drive for safekeeping
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                    ) : (
                      <td className="py-2 px-4 align-middle text-center">
                        <div className="inline-flex w-fit items-center justify-center rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium tracking-[0.04em] select-none bg-[#D1FAE5] text-[#065F46] dark:bg-emerald-950/40 dark:text-emerald-400">
                          Ready
                        </div>
                      </td>
                    )}
                    <td className="py-0 px-4 pr-6 text-right align-middle">
                      <div className="inline-flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onDownloadBackup(b.id, b.filename)}
                              aria-label="Download Backup"
                              className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 border-0 bg-transparent text-gray-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors"
                            >
                              <i className="ph-bold ph-download-simple text-[16px]"></i>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Download to computer
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onDeleteBackup(b.id)}
                              aria-label="Delete Backup"
                              className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 border-0 bg-transparent text-gray-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors"
                            >
                              <i className="ph-bold ph-trash text-[16px]"></i>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Delete backup
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
