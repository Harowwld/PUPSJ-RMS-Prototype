"use client"
import { Table } from "@/components/ui/table";

import { Button } from "@/components/ui/button"
import TableScrollControls from "@/components/shared/TableScrollControls"
import DataViewToolbar from "@/components/shared/DataViewToolbar"
import useTableScroll from "@/hooks/useTableScroll"
import { Fragment, useEffect } from "react"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
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
import { BADGE_BASE, BADGE_PALETTES } from "@/lib/badgeStyles"
import { Database01Icon as EmptyDatabase01Icon, Search01Icon as EmptySearch01Icon, ArrowDown01Icon, ArrowUp01Icon, ArrowUpDownIcon, CheckmarkCircle01Icon, CovidInfoIcon, Delete01Icon, Download01Icon, HardDriveIcon, Plug01Icon, RefreshIcon } from "hugeicons-react";
import AuditActorAvatar from "@/components/shared/AuditActorAvatar"
import { SYSTEM_BACKUP_COLUMNS, BackupActionsMenu } from "@/components/systemadmin/PlatformBackupTable"
import AppIcon from "@/components/ui/app-icon";

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return <ArrowUpDownIcon size="1em" className="ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
  }
  return sortOrder === "ASC" ? (
    <ArrowUp01Icon size="1em" className="ml-1 text-[12px] text-gray-400" />
  ) : (
    <ArrowDown01Icon size="1em" className="ml-1 text-[12px] text-gray-400" />
  )
}

export function getBackupTypeBadge(backup) {
  const type = String(backup?.backup_type || "").trim().toLowerCase();
  const badgeStyle = cn(
    BADGE_BASE,
    "max-w-none w-max px-3.5 py-1 min-h-[26px] h-auto text-xs font-semibold leading-normal shrink-0"
  );
  if (type === "pre-restore safety" || type === "safety snapshot") {
    return (
      <span className={cn(BADGE_PALETTES.emerald, badgeStyle)}>
        Safety Snapshot
      </span>
    );
  }
  if (type === "manual") {
    return (
      <span className={cn(BADGE_PALETTES.amber, badgeStyle)}>
        Manual
      </span>
    );
  }
  if (type === "scheduled" || type === "automated") {
    return (
      <span className={cn(BADGE_PALETTES.blue, badgeStyle)}>
        Scheduled
      </span>
    );
  }
  if (type === "governance") {
    return (
      <span className={cn(BADGE_PALETTES.purple, badgeStyle)}>
        Governance
      </span>
    );
  }
  return null;
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
  groupBy = "none",
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
  itemsPerPage,
  handleItemsPerPageChange,
  scope = "office",
  externalDriveConnected = false,
  visibleColumns = SYSTEM_BACKUP_COLUMNS.filter(({ defaultHidden }) => !defaultHidden).map(({ key }) => key),
  tableScrollRef,
  isScrolledX = false,
  resetScroll,
}) {
  const internalScroll = useTableScroll([sortedAndPaginatedBackups.length]);
  const containerRef = tableScrollRef || internalScroll.containerRef;
  const scrolledX = tableScrollRef ? isScrolledX : internalScroll.isScrolledX;
  const doResetScroll = resetScroll || internalScroll.resetScroll;

  useEffect(() => {
    doResetScroll?.();
  }, [page, sortBy, sortOrder, doResetScroll]);

  const showColumn = (key) => !visibleColumns || visibleColumns.includes(key);
  const columnCount = SYSTEM_BACKUP_COLUMNS.filter(({ key }) => showColumn(key)).length + 2;

  return (
    <>
      {sortedAndPaginatedBackups.length === 0 ? (
        <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
          <Empty>
            <EmptyHeader>
              <EmptyMedia>{isFilterActive ? <EmptySearch01Icon size="1em" /> : <EmptyDatabase01Icon size="1em" />}</EmptyMedia>
              <EmptyTitle>
                {isFilterActive ? "No matches found" : "No backups detected"}
              </EmptyTitle>
              <EmptyDescription>
                {isFilterActive 
                  ? "Adjust your search parameters or date range to locate specific historical records." 
                  : "There are no local database backups in the history log yet."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              {isFilterActive ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearFilters}
                  title="Reset Filters"
                  className="flex h-9 items-center justify-center gap-2 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-4 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                >
                  Reset Filters
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleGenerateBackup}
                  className="h-9 px-4 cursor-pointer"
                >
                  Create Backup
                </Button>
              )}
            </EmptyContent>
          </Empty>
        </div>
      ) : (
        <div className="w-full flex-[1_0_auto] flex flex-col">
          {!tableScrollRef && (
            <DataViewToolbar label="Backup table controls" className="justify-between gap-4 px-6 py-2.5 bg-white dark:bg-card border-b border-border dark:border-border">
              <span className="text-[11px] font-sans tabular-nums text-gray-400 dark:text-zinc-500">
                Showing {sortedAndPaginatedBackups.length} of {backups.length} {backups.length === 1 ? "backup" : "backups"}
              </span>
              <TableScrollControls scrollContainerRef={containerRef}
                onScrollLeft={internalScroll.scrollLeft}
                onScrollRight={internalScroll.scrollRight}
                onResetScroll={internalScroll.resetScroll}
                isScrolled={internalScroll.isScrolledX}
              />
            </DataViewToolbar>
          )}

          <div
            ref={containerRef}
            className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2 select-none isolate"
          >
            <Table
              columns={[
                "selection",
                ...(showColumn("filename") ? [{ kind: "text", growthWeight: 3 }] : []),
                ...(showColumn("actor") ? [{ kind: "text", growthWeight: 1 }] : []),
                ...(showColumn("type") ? [{ kind: "category", width: 160 }] : []),
                ...(showColumn("size") ? ["number"] : []),
                ...(showColumn("created") ? ["date"] : []),
                ...(scope === "office" ? (showColumn("status") ? [{ kind: "category", width: 220 }] : []) : (showColumn("status") ? ["status"] : [])),
                "actions",
              ]}
              className="min-w-[1240px]"
            >
              <thead className="sticky top-0 z-10 border-b border-border bg-white dark:bg-card select-none">
                <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none">
                  <th className="w-12 p-4 text-center align-middle sticky left-0 z-20 bg-white dark:bg-card border-r border-border/70 dark:border-border/70">
                    <input
                      type="checkbox"
                      aria-label="Select all backups on this page"
                      className={cn(
                        "h-4 w-4 m-0 align-middle shrink-0 cursor-pointer rounded border border-border dark:border-border transition-opacity",
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
                  {showColumn("filename") && <th className={cn(
                    "p-4 w-[34%] sticky left-12 z-20 bg-white dark:bg-card border-r border-border/70 dark:border-border/70 transition-shadow duration-200",
                    scrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                  )}>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleSort("filename")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                          sortBy === "filename" ? "text-gray-900 dark:text-white font-semibold" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                        )}
                      >
                        Backup Archive{" "}
                        <SortIndicator
                          column="filename"
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                        />
                      </button>
                    </div>
                  </th>}
                  {showColumn("actor") && (
                    <th className="p-4 w-[15%] border-r border-border/70 dark:border-border/70">
                      <button
                        onClick={() => handleSort("actor")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                          sortBy === "actor" ? "text-gray-900 dark:text-white font-semibold" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                        )}
                      >
                        Actor{" "}
                        <SortIndicator
                          column="actor"
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                        />
                      </button>
                    </th>
                  )}
                  {showColumn("type") && (
                    <th className="p-4 w-[13%] min-w-[150px] text-center border-r border-border/70 dark:border-border/70">
                      <button
                        onClick={() => handleSort("backup_type")}
                        className={cn(
                          "group mx-auto flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                          sortBy === "backup_type" ? "text-gray-900 dark:text-white font-semibold" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                        )}
                      >
                        Type{" "}
                        <SortIndicator
                          column="backup_type"
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                        />
                      </button>
                    </th>
                  )}
                  {showColumn("size") && (
                    <th className="p-4 w-[10%] text-center border-r border-border/70 dark:border-border/70">
                      <button
                        onClick={() => handleSort("size_bytes")}
                        className={cn(
                          "group mx-auto flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                          sortBy === "size_bytes" ? "text-gray-900 dark:text-white font-semibold" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
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
                  )}
                  {showColumn("created") && (
                    <th className="p-4 w-[14%] border-r border-border/70 dark:border-border/70">
                      <button
                        onClick={() => handleSort("created_at")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                          sortBy === "created_at" ? "text-gray-900 dark:text-white font-semibold" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
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
                  )}
                  {showColumn("status") && (
                    scope === "office" ? (
                      <th className="p-4 w-[16%] min-w-[200px] text-center text-xs font-semibold text-gray-500 dark:text-zinc-400 border-r border-border/70 dark:border-border/70">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <span>Backup Copies</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <CovidInfoIcon size="1em" className="text-[13px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs font-normal">
                              Shows where this backup is safely stored: on Internal Storage and an External Drive.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </th>
                    ) : (
                      <th className="p-4 w-[16%] min-w-[140px] text-center text-xs font-semibold text-gray-500 dark:text-zinc-400 border-r border-border/70 dark:border-border/70">
                        Status
                      </th>
                    )
                  )}
                  <th className="p-4 w-20 text-center text-xs font-semibold text-gray-500 dark:text-zinc-400 sticky right-0 z-20 bg-white dark:bg-card border-l border-border/70 dark:border-border/70">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
                {sortedAndPaginatedBackups.map((b, index) => {
                  if (!b) return null;
                  const isSelected = selectedBackupIds.includes(b.id);
                  const showGroup = groupBy !== "none" &&
                    (index === 0 || b[groupBy] !== sortedAndPaginatedBackups[index - 1]?.[groupBy]);
                  return (
                    <Fragment key={b.id}>
                    {showGroup && (
                      <tr>
                        <td colSpan={columnCount} className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-700 dark:bg-zinc-900 dark:text-zinc-200">
                          {b[groupBy] || "Unspecified"}
                        </td>
                      </tr>
                    )}
                    <tr
                      className={cn(
                        "group hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors select-none cursor-pointer",
                        isSelected && "bg-blue-50/60 dark:bg-blue-950/20"
                      )}
                      onClick={(e) => {
                        if (e.target.closest("button") || e.target.closest("input")) return
                        handleToggleRow(b.id)
                      }}
                    >
                      <td className={cn(
                        "w-12 p-4 align-middle text-center border-r border-border/70 dark:border-border/70 sticky left-0 z-10 transition-colors",
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950"
                          : "bg-white group-hover:bg-gray-50/70 dark:bg-card dark:group-hover:bg-zinc-800/40"
                      )}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${b.filename}`}
                          className={cn(
                            "h-4 w-4 m-0 align-middle shrink-0 cursor-pointer rounded border border-border dark:border-border transition-opacity",
                            isSelected ? "opacity-100" : "opacity-50 group-hover:opacity-80"
                          )}
                          checked={isSelected}
                          onChange={() => handleToggleRow(b.id)}
                        />
                      </td>
                      {showColumn("filename") && <td className={cn(
                        "p-4 align-middle overflow-hidden border-r border-border/70 dark:border-border/70 sticky left-12 z-10 transition-all duration-200",
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950"
                          : "bg-white group-hover:bg-gray-50/70 dark:bg-card dark:group-hover:bg-zinc-800/40",
                        scrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                      )}>
                        <span
                          className="font-sans tabular-nums text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate block max-w-[380px] md:max-w-[520px]"
                          title={b.filename}
                        >
                          {b.filename}
                        </span>
                      </td>}
                      {showColumn("actor") && (
                        <td className="p-4 align-middle border-r border-border/70 dark:border-border/70 text-xs text-gray-700 dark:text-zinc-300">
                          <div className="flex items-center gap-2 min-w-0">
                            <AuditActorAvatar
                              log={{
                                actor: b.actor || (b.created_by ? "Administrator" : "System"),
                                actor_id: b.actor_id || b.created_by,
                                role: b.role || "Admin",
                                avatar_filename: b.avatar_filename,
                              }}
                              className="size-6 border-0"
                              fallbackClassName="text-[9px] font-semibold"
                            />
                            <span className="truncate max-w-[140px] font-medium text-xs text-gray-900 dark:text-zinc-100" title={b.actor}>
                              {b.actor || (b.created_by ? "Administrator" : "System")}
                            </span>
                          </div>
                        </td>
                      )}
                      {showColumn("type") && (
                        <td className="p-4 align-middle text-center border-r border-border/70 dark:border-border/70 whitespace-nowrap">
                          <div className="flex items-center justify-center">
                            {getBackupTypeBadge(b) || (
                              <span className={cn(BADGE_PALETTES.slate, BADGE_BASE, "max-w-none w-max px-3.5 py-1 min-h-[26px] h-auto text-xs font-semibold leading-normal shrink-0")}>
                                {b.backup_type || "—"}
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      {showColumn("size") && (
                        <td className="p-4 align-middle text-center text-xs font-medium text-gray-900 dark:text-zinc-100 border-r border-border/70 dark:border-border/70 tabular-nums">
                          {formatBytes(b.size_bytes)}
                        </td>
                      )}
                      {showColumn("created") && (
                        <td className="p-4 align-middle border-r border-border/70 dark:border-border/70">
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-gray-900 dark:text-zinc-100 leading-tight">
                              {formatPHDateTime(b.created_at).split(' at ')[0]}
                            </span>
                            <span className="text-xs font-normal text-gray-500 dark:text-zinc-400 mt-0.5 leading-tight">
                              {formatPHDateTime(b.created_at).split(' at ')[1]}
                            </span>
                          </div>
                        </td>
                      )}
                      {showColumn("status") && (
                        scope === "office" ? (
                          <td className="p-4 align-middle text-center border-r border-border/70 dark:border-border/70">
                            <div className="flex mx-auto w-fit items-center justify-center gap-1.5 flex-nowrap whitespace-nowrap">
                              {/* Node 1: Internal Storage */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn(
                                      b.status_local === "Success"
                                        ? BADGE_PALETTES.emerald
                                        : BADGE_PALETTES.gray,
                                      "gap-1 select-none border-0 text-[11px] px-2 py-0.5",
                                      BADGE_BASE
                                    )}
                                  >
                                    <HardDriveIcon size="1em" className="text-[11px]" />
                                    <span>Internal</span>
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
                                    <div className={cn(BADGE_PALETTES.blue, "gap-1 select-none text-[11px] px-2 py-0.5", BADGE_BASE)}>
                                      <CheckmarkCircle01Icon size="1em" className="text-[11px]" />
                                      <span>External</span>
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
                                    <div className={cn(BADGE_PALETTES.gray, "gap-1 select-none cursor-not-allowed text-[11px] px-2 py-0.5", BADGE_BASE)}>
                                      <Plug01Icon size="1em" className="text-[11px]" />
                                      <span>Offline</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs">
                                    <p className="font-semibold">External Drive Disconnected</p>
                                    <p className="text-[11px] opacity-80">
                                      Connect an external USB drive and click &quot;Detect&quot; to copy this backup.
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
                                        BADGE_BASE,
                                        "active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1 border-0 text-[11px] px-2.5 py-0.5",
                                        b.status_external === "Failed"
                                          ? BADGE_PALETTES.amber
                                          : BADGE_PALETTES.blue
                                      )}
                                    >
                                      {localLoading?.syncingId === b.id ? (
                                        <>
                                          <RefreshIcon size="1em" className="animate-spin text-[11px]" />
                                          <span>Copying...</span>
                                        </>
                                      ) : (
                                        <span>{b.status_external === "Failed" ? "Retry" : "Copy"}</span>
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
                          <td className="p-4 align-middle text-center border-r border-border/70 dark:border-border/70">
                            <div className={cn("inline-flex w-fit items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide select-none bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400", BADGE_BASE)}>
                              Ready
                            </div>
                          </td>
                        )
                      )}
                      <td className={cn(
                        "p-4 text-center align-middle whitespace-nowrap sticky right-0 z-10 border-l border-border/70 dark:border-border/70 transition-colors",
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950"
                          : "bg-white group-hover:bg-gray-50/70 dark:bg-card dark:group-hover:bg-zinc-800/40"
                      )}>
                        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                          <BackupActionsMenu
                            backup={b}
                            onDownload={onDownloadBackup}
                            onDelete={onDeleteBackup}
                          />
                        </div>
                      </td>
                    </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </div>
      )}

      {backups.length > 0 && (
        <BackupPagination
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          startItem={startItem}
          endItem={endItem}
          totalCount={backups.length}
          itemsPerPage={itemsPerPage}
          handleItemsPerPageChange={handleItemsPerPageChange}
        />
      )}
    </>
  )
}
