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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatPHDateTime } from "@/lib/timeFormat"
import { formatBytes } from "@/lib/utils"

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column)
    return <i className="ph-bold ph-caret-up-down ml-1 opacity-30"></i>
  return sortOrder === "ASC" ? (
    <i className="ph-bold ph-caret-up ml-1 text-pup-maroon"></i>
  ) : (
    <i className="ph-bold ph-caret-down ml-1 text-pup-maroon"></i>
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
}) {
  return (
    <div
      className={`min-h-[450px] w-full overflow-auto rounded-brand transition-all duration-300 ${
        backups.length === 0 ? "" : "border border-gray-200 shadow-inner"
      }`}
    >
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
          <tr className="text-left text-xs tracking-wider text-gray-600 uppercase">
            <th className="w-16 p-3 text-center">
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer rounded border-gray-300 text-pup-maroon accent-pup-maroon focus:ring-pup-maroon disabled:cursor-not-allowed disabled:opacity-20"
                checked={
                  backups.length > 0 &&
                  backups.every((b) => selectedBackupIds.includes(b.id))
                }
                onChange={(e) => handleSelectAll(e.target.checked)}
                disabled={backups.length === 0}
              />
            </th>
            <th className="w-1/3 p-3 font-bold">
              <button
                onClick={() => handleSort("filename")}
                className="group flex items-center rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100 focus:outline-none"
              >
                Backup Archive{" "}
                <SortIndicator
                  column="filename"
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                />
              </button>
            </th>
            <th className="p-3 text-center font-bold">
              <div className="flex justify-center">
                <button
                  onClick={() => handleSort("size_bytes")}
                  className="group flex items-center rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100 focus:outline-none"
                >
                  Size{" "}
                  <SortIndicator
                    column="size_bytes"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                  />
                </button>
              </div>
            </th>
            <th className="p-3 font-bold">
              <button
                onClick={() => handleSort("created_at")}
                className="group flex items-center rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100 focus:outline-none"
              >
                Creation Date{" "}
                <SortIndicator
                  column="created_at"
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                />
              </button>
            </th>
            <th className="p-3 text-center font-bold whitespace-nowrap">
              Storage Locations
            </th>
            <th className="p-3 text-right font-bold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sortedAndPaginatedBackups.length === 0 ? (
            <tr className="border-0 hover:bg-transparent">
              <td colSpan={6} className="border-0 p-0">
                <Empty className="flex h-[400px] flex-col items-center justify-center border-0 text-center text-gray-500">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                      <i className={`ph-duotone ${isFilterActive ? "ph-magnifying-glass" : "ph-database"} text-3xl text-pup-maroon`}></i>
                    </EmptyMedia>
                    <EmptyTitle className="text-lg font-bold text-gray-900">
                      {isFilterActive ? "No matches found" : "No snapshots detected"}
                    </EmptyTitle>
                    <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600">
                      {isFilterActive 
                        ? "Adjust your search parameters or date range to locate specific historical records." 
                        : "There are no local database backups in the history log yet."}
                    </EmptyDescription>
                    {isFilterActive ? (
                      <Button
                        variant="outline"
                        onClick={onClearFilters}
                        className="mt-4 flex h-9 items-center gap-2 rounded-brand border-gray-300 bg-white px-4 text-xs font-bold text-gray-600 shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95"
                      >
                        <i className="ph-bold ph-x-circle"></i>
                        CLEAR ALL FILTERS
                      </Button>
                    ) : (
                      <Button
                        onClick={handleGenerateBackup}
                        className="mt-4 flex h-10 items-center gap-2 rounded-brand bg-pup-maroon px-6 text-xs font-bold text-white shadow-md transition-all hover:bg-red-900 active:scale-95"
                      >
                        <i className="ph-bold ph-lightning"></i>
                        CREATE INITIAL SNAPSHOT
                      </Button>
                    )}
                  </EmptyHeader>
                </Empty>
              </td>
            </tr>
          ) : (
            sortedAndPaginatedBackups.map((b) => (
              <tr
                key={b.id}
                className={`group cursor-default transition-all hover:bg-gray-50/80 ${
                  selectedBackupIds.includes(b.id) ? "bg-red-50/20" : ""
                }`}
              >
                <td className="p-3 text-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-pup-maroon focus:ring-pup-maroon"
                    checked={selectedBackupIds.includes(b.id)}
                    onChange={() => handleToggleRow(b.id)}
                  />
                </td>
                <td className="max-w-[280px] p-3 text-xs font-bold text-pup-maroon">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="block w-full truncate">
                        {b.filename}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="max-w-[400px] rounded-brand break-all"
                    >
                      {b.filename}
                    </TooltipContent>
                  </Tooltip>
                </td>
                <td className="p-3 text-center text-xs font-black text-gray-700">
                  {formatBytes(b.size_bytes)}
                </td>
                <td className="p-3 text-[11px] font-medium whitespace-nowrap text-gray-500">
                  {formatPHDateTime(b.created_at)}
                </td>
                <td className="p-3">
                  <div className="flex min-w-[140px] items-center gap-2">
                    {/* Local Node */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`flex items-center gap-1.5 rounded-md border px-2 py-1 shadow-sm transition-all ${
                            b.status_local === "Success"
                              ? "border-green-200 bg-green-50/50 text-green-700"
                              : "border-gray-200 bg-gray-50 text-gray-500"
                          }`}
                        >
                          <i
                            className={`ph-bold ph-hard-drive text-xs ${
                              b.status_local === "Success"
                                ? "text-green-600"
                                : "text-gray-400"
                            }`}
                          ></i>
                          <span className="text-[10px] font-black tracking-tighter uppercase">
                            Local
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="rounded-brand">
                        <div className="text-xs font-bold">Local Storage</div>
                        <div className="text-[10px] opacity-80">
                          {b.status_local === "Success"
                            ? "Backup secured on this server"
                            : "Failed / Pending"}
                        </div>
                      </TooltipContent>
                    </Tooltip>

                    {/* External Node */}
                    {b.status_external === "Success" ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50/50 px-2 py-1 text-blue-700 shadow-sm transition-all">
                            <i className="ph-bold ph-hard-drives text-xs text-blue-600"></i>
                            <span className="text-[10px] font-black tracking-tighter uppercase">
                              External
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="rounded-brand">
                          <div className="text-xs font-bold">
                            External Storage
                          </div>
                          <div className="text-[10px] opacity-80">
                            Verified on secondary drive
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleSyncExternal(b.id)}
                            disabled={localLoading.syncingId === b.id}
                            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-black tracking-tight uppercase shadow-sm transition-all active:scale-95 disabled:opacity-50 ${
                              b.status_external === "Failed"
                                ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                : "border-pup-maroon/30 bg-white text-pup-maroon hover:bg-red-50"
                            }`}
                          >
                            <i
                              className={`ph-bold ${
                                localLoading.syncingId === b.id
                                  ? "ph-arrows-clockwise animate-spin"
                                  : b.status_external === "Failed"
                                    ? "ph-warning-circle"
                                    : "ph-share-network"
                              } text-xs`}
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
                        <TooltipContent className="rounded-brand">
                          {b.status_external === "Failed" 
                            ? `Previous attempt failed. Click to retry institutional redundancy sync.`
                            : "Distribute snapshot to external node"}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDownloadBackup(b.id, b.filename)}
                      className="flex h-8 items-center gap-1.5 rounded-brand border-gray-300 bg-white px-3 text-[10px] font-bold text-gray-600 shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95"
                    >
                      <i className="ph-bold ph-file-zip text-xs"></i>
                      DOWNLOAD
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDeleteBackup(b.id)}
                      className="flex h-8 items-center gap-1.5 rounded-brand border-gray-300 bg-white px-3 text-[10px] font-bold text-gray-600 shadow-sm transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 active:scale-95"
                    >
                      <i className="ph-bold ph-trash text-xs"></i>
                      DELETE
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
