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
  if (sortBy !== column)
    return <i className="ph-bold ph-caret-up-down ml-1 opacity-30 text-[10px]"></i>
  return sortOrder === "ASC" ? (
    <i className="ph-bold ph-caret-up ml-1 text-pup-maroon dark:text-primary text-[10px] dark:text-primary"></i>
  ) : (
    <i className="ph-bold ph-caret-down ml-1 text-pup-maroon dark:text-primary text-[10px] dark:text-primary"></i>
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
          "flex-1 overflow-hidden overflow-x-auto overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm select-none dark:border-white/10 dark:bg-card min-h-[400px]"
        )}
      >
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 backdrop-blur-sm dark:border-white/10 dark:bg-muted">
            <tr className="text-left text-[10px] font-black tracking-widest text-gray-600 uppercase dark:text-zinc-300">
              <th className="w-16 p-4 text-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded border border-gray-300 text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon disabled:cursor-not-allowed disabled:opacity-20 dark:text-primary dark:border-white/10"
                  checked={
                    backups.length > 0 &&
                    backups.every((b) => selectedBackupIds.includes(b.id))
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  disabled={backups.length === 0}
                />
              </th>
              <th className="w-1/3 p-4">
                <button
                  onClick={() => handleSort("filename")}
                  className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none"
                >
                  BACKUP ARCHIVE{" "}
                  <SortIndicator
                    column="filename"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                  />
                </button>
              </th>
              <th className="p-4 text-center">
                <button
                  onClick={() => handleSort("size_bytes")}
                  className="group mx-auto flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none"
                >
                  SIZE{" "}
                  <SortIndicator
                    column="size_bytes"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                  />
                </button>
              </th>
              <th className="p-4">
                <button
                  onClick={() => handleSort("created_at")}
                  className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none"
                >
                  CREATION DATE{" "}
                  <SortIndicator
                    column="created_at"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                  />
                </button>
              </th>
              <th className="p-4 text-center font-bold whitespace-nowrap">
                STORAGE LOCATIONS
              </th>
              <th className="p-4 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/10">
            {sortedAndPaginatedBackups.length === 0 ? (
              <tr className="border-0 hover:bg-transparent">
                <td colSpan={6} className="border-0 p-0">
                  <Empty className="flex h-[450px] flex-col items-center justify-center border-0 bg-transparent text-center">
                    <EmptyHeader className="flex flex-col items-center gap-0">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                        <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                          <i className={cn("ph-duotone text-5xl text-gray-300 dark:text-zinc-600", isFilterActive ? "ph-magnifying-glass" : "ph-database")}></i>
                        </EmptyMedia>
                      </div>
                      <EmptyTitle className="text-xl font-black text-gray-900 dark:text-zinc-50">
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
                          className="mt-6 flex h-10 items-center gap-2 rounded-brand border border-gray-300 bg-white px-6 text-xs font-bold text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 uppercase tracking-wide dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                        >
                          <i className="ph-bold ph-arrow-counter-clockwise"></i>
                          CLEAR SEARCH
                        </Button>
                      ) : (
                        <Button
                          onClick={handleGenerateBackup}
                          className="mt-6 flex h-10 items-center gap-2 rounded-brand btn-brand-red hover:from-red-700 hover:to-red-900 hover:shadow-md px-8 font-black tracking-widest text-white shadow-lg active:scale-95 transition-all dark:shadow-none uppercase"
                        >
                          <i className="ph-bold ph-lightning"></i>
                          CREATE FULL BACKUP
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
                        "group transition-all duration-200 hover:bg-gray-50/80 dark:bg-card dark:hover:bg-white/5 select-none cursor-pointer",
                        isSelected && "bg-amber-50 dark:bg-amber-950/40"
                    )}
                    onClick={(e) => {
                      if (e.target.closest("button") || e.target.closest("input")) return
                      handleToggleRow(b.id)
                    }}
                  >
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer rounded border border-gray-300 text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon dark:border-white/10"
                        checked={isSelected}
                        onChange={() => handleToggleRow(b.id)}
                      />
                    </td>
                    <td className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xs font-black text-gray-500 shadow-xs dark:bg-white/5 dark:text-zinc-500 group-hover:bg-white dark:group-hover:bg-zinc-800 group-hover:text-pup-maroon dark:group-hover:text-primary group-hover:shadow-sm transition-all">
                                <i className="ph-duotone ph-file-zip text-lg"></i>
                            </div>
                            <span className="text-xs font-bold text-gray-900 dark:text-zinc-50 max-w-[280px] truncate" title={b.filename}>
                                {b.filename}
                            </span>
                        </div>
                    </td>
                    <td className="p-4 text-center text-xs font-black text-gray-700 dark:text-zinc-200">
                      {formatBytes(b.size_bytes)}
                    </td>
                    <td className="p-4">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-900 dark:text-zinc-50">
                                {formatPHDateTime(b.created_at).split(' at ')[0]}
                            </span>
                            <span className="text-[10px] font-medium text-gray-500 dark:text-zinc-400">
                                {formatPHDateTime(b.created_at).split(' at ')[1]}
                            </span>
                        </div>
                    </td>
                    <td className="p-4">
                      <div className="flex mx-auto w-fit items-center gap-2">
                        {/* Local Node */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 shadow-xs transition-all",
                                  b.status_local === "Success" ? "border-green-200 bg-green-50 text-green-700 dark:bg-green-950/20 dark:border-green-800/20 dark:text-green-400" : "border-gray-200 bg-gray-50 text-gray-500 dark:bg-white/5 dark:border-white/10 dark:text-zinc-500"
                              )}
                            >
                              <i
                                className={cn("ph-bold text-[10px]", b.status_local === "Success" ? "ph-check-circle" : "ph-warning-circle")}
                              ></i>
                              <span className="text-[9px] font-black tracking-wider uppercase">
                                Local
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-zinc-900 text-white border-zinc-800">
                            <p className="text-[10px] font-bold">Local Storage Status</p>
                            <p className="text-[9px] opacity-80">
                              {b.status_local === "Success"
                                ? "Verified and secured on primary server"
                                : "Pending / Check node health"}
                            </p>
                          </TooltipContent>
                        </Tooltip>

                        {/* External Node */}
                        {b.status_external === "Success" ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-700 shadow-xs transition-all dark:bg-blue-950/20 dark:border-blue-800/20 dark:text-blue-400">
                                <i className="ph-bold ph-hard-drives text-[10px]"></i>
                                <span className="text-[9px] font-black tracking-wider uppercase">
                                  External
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-zinc-900 text-white border-zinc-800">
                                <p className="text-[10px] font-bold">Institutional Redundancy</p>
                                <p className="text-[9px] opacity-80">Verified on secondary off-site volume</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleSyncExternal(b.id)}
                                disabled={localLoading.syncingId === b.id}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black tracking-wider uppercase shadow-xs transition-all active:scale-95 disabled:opacity-50",
                                    b.status_external === "Failed" ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:border-amber-800/30" : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50 dark:bg-card dark:border-white/10 dark:text-zinc-400 dark:hover:bg-zinc-800"
                                )}
                              >
                                <i
                                  className={cn("ph-bold text-[10px]", localLoading.syncingId === b.id ? "ph-arrows-clockwise animate-spin" : b.status_external === "Failed" ? "ph-warning" : "ph-share-network")}
                                ></i>
                                <span>
                                  {localLoading.syncingId === b.id
                                    ? localLoading.syncStatus || "..."
                                    : b.status_external === "Failed"
                                      ? "RETRY SYNC"
                                      : "SYNC"}
                                </span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-zinc-900 text-white border-zinc-800">
                                <p className="text-[10px] font-bold">Mirroring Sync</p>
                                <p className="text-[9px] opacity-80">Send backup copy to external storage node</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onDownloadBackup(b.id, b.filename)}
                          className="h-9 w-9 rounded-xl border-gray-200 bg-white p-0 text-gray-400 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-pup-maroon dark:hover:text-red-500 dark:bg-white/5 dark:border-white/10 dark:text-zinc-500 dark:hover:text-primary dark:hover:bg-zinc-800"
                        >
                          <i className="ph-bold ph-download-simple text-lg"></i>
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => onDeleteBackup(b.id)}
                          className="h-9 w-9 rounded-xl border-gray-200 bg-white p-0 text-red-400 shadow-sm transition-all hover:border-red-600 hover:bg-red-50 dark:bg-white/5 dark:border-white/10 dark:text-red-400/90 dark:hover:bg-red-400/10"
                        >
                          <i className="ph-bold ph-trash text-lg"></i>
                        </Button>
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
