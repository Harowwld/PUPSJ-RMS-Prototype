"use client"

import { useState } from "react"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableText, TableStatus } from "@/components/ui/table"
import TablePagination from "@/components/shared/TablePagination"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatPHDateTime } from "@/lib/timeFormat"
import { formatBytes } from "@/lib/utils"
import { Database01Icon, Search01Icon, Download01Icon, Delete01Icon, MoreHorizontalIcon, ArrowDown01Icon, ArrowUp01Icon, ArrowUpDownIcon } from "hugeicons-react"
import { cn } from "@/lib/utils"

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

export const PLATFORM_BACKUP_COLUMNS = [
  { key: "size", label: "Size", kind: "number" },
  { key: "created", label: "Created", kind: "date" },
  { key: "type", label: "Type", kind: "category" },
  { key: "status", label: "Storage status", kind: "status" },
]

export function platformBackupSchema(visibleColumns) {
  return [
    "selection",
    { kind: "text", growthWeight: visibleColumns.length ? 2 : 1 },
    ...PLATFORM_BACKUP_COLUMNS
      .filter(({ key }) => visibleColumns.includes(key))
      .map(({ kind }) => ({ kind, growthWeight: 1 })),
    "actions",
  ]
}

function BackupActionsMenu({ backup, onDownload, onDelete }) {
  const [open, setOpen] = useState(false)

  const runAction = (event, callback) => {
    event.stopPropagation()
    setOpen(false)
    callback?.()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(event) => event.stopPropagation()}
          aria-label={`Actions for ${backup.filename}`}
          aria-expanded={open}
          className="table-action-button"
        >
          <MoreHorizontalIcon size={16} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="max-h-[calc(100dvh-2rem)] w-[min(12.5rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-2xl"
      >
        <div className="max-h-[min(55vh,18rem)] space-y-0.5 overflow-y-auto p-1">
          <button
            type="button"
            onClick={(event) => runAction(event, () => onDownload(backup.id, backup.filename))}
            className="flex min-h-8 w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:text-zinc-300 dark:hover:bg-zinc-800/70 dark:focus-visible:ring-red-400"
          >
            <Download01Icon size={14} aria-hidden="true" className="shrink-0 text-gray-500 dark:text-zinc-400" />
            <span>Download Backup</span>
          </button>
          <div aria-hidden="true" className="my-1 h-px bg-border dark:bg-white/10" />
          <button
            type="button"
            onClick={(event) => runAction(event, () => onDelete(backup.id))}
            className="flex min-h-8 w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <Delete01Icon size={14} aria-hidden="true" className="shrink-0" />
            <span>Delete Backup</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default function PlatformBackupTable({ backups, rows, visibleColumns, selectedIds, onSelectAll, onToggle, onSort, sortBy, sortOrder, onDownload, onDelete, onCreate, isFilterActive, onClearFilters, page, pageSize, onPageChange, onPageSizeChange, scrollRef, groups }) {
  const allVisibleSelected = rows.length > 0 && rows.every((backup) => selectedIds.includes(backup.id))
  const heading = (key, label) => (
    <button
      type="button"
      onClick={() => onSort(key)}
      className={cn(
        "group inline-flex items-center text-xs font-semibold transition-colors focus:outline-none cursor-pointer",
        key === "backup_type" || key === "status_local" ? "justify-center" : "",
        sortBy === key ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
      )}
    >
      {label}
      <SortIndicator column={key} sortBy={sortBy} sortOrder={sortOrder} />
    </button>
  )
  return <>
    <div ref={scrollRef} className="flex min-h-0 w-full flex-1 flex-col overflow-x-auto show-scrollbar">
      {rows.length > 0 && <Table columns={platformBackupSchema(visibleColumns)}>
        <TableHeader><TableRow>
          <TableHead><input type="checkbox" aria-label="Select all backups on this page" checked={allVisibleSelected} onChange={(event) => onSelectAll(event.target.checked, rows)} disabled={!rows.length} /></TableHead>
          <TableHead aria-sort={sortBy === "filename" ? (sortOrder === "ASC" ? "ascending" : "descending") : "none"}>{heading("filename", "Backup archive")}</TableHead>
          {PLATFORM_BACKUP_COLUMNS.filter(({ key }) => visibleColumns.includes(key)).map(({ key, label }) => {
            const sortKey = key === "size" ? "size_bytes" : key === "created" ? "created_at" : key === "type" ? "backup_type" : "status_local"
            return <TableHead key={key} aria-sort={sortBy === sortKey ? (sortOrder === "ASC" ? "ascending" : "descending") : "none"}>{heading(sortKey, label)}</TableHead>
          })}
          <TableHead><span className="sr-only">Actions</span></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {groups.length ? groups.flatMap(({ label, items }) => [<TableRow key={`group-${label}`}><TableCell colSpan={visibleColumns.length + 3} className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-700 dark:bg-zinc-900 dark:text-zinc-200">{label} <span className="ml-1.5 font-normal text-gray-400 dark:text-zinc-500 tabular-nums">{items.length}</span></TableCell></TableRow>, ...items.map(renderRow)]) : rows.map(renderRow)}
        </TableBody>
      </Table>}
      {!rows.length && <EmptyState
        className="flex-1"
        icon={isFilterActive ? Search01Icon : Database01Icon}
        title={isFilterActive ? "No matching backups" : "No backups yet"}
        description={isFilterActive ? "Change your search or filters to see other backups." : "Create a platform backup to begin the archive history."}
      >
        <Button variant="outline" onClick={isFilterActive ? onClearFilters : onCreate}>
          {isFilterActive ? "Reset Filters" : "Create Backup"}
        </Button>
      </EmptyState>}
    </div>
    {backups.length > 0 && <TablePagination label="Platform backup pages" page={page} pageSize={pageSize} totalCount={backups.length} displayedCount={rows.length} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />}
  </>

  function renderRow(backup) {
    const selected = selectedIds.includes(backup.id)
    const cells = {
      size: <TableCell key="size" kind="number" className="text-xs text-gray-700 dark:text-zinc-300 tabular-nums">{formatBytes(backup.size_bytes)}</TableCell>,
      created: <TableCell key="created" kind="date" className="text-xs text-gray-600 dark:text-zinc-300 tabular-nums">{formatPHDateTime(backup.created_at)}</TableCell>,
      type: <TableCell key="type" kind="category" className="text-center text-xs text-gray-700 dark:text-zinc-300">{backup.backup_type || "—"}</TableCell>,
      status: <TableCell key="status" kind="status"><TableStatus value={backup.status_local || "Pending"} className="text-[11px]" /></TableCell>,
    }
    return <TableRow key={backup.id} selected={selected} onClick={(event) => { if (!event.target.closest("button, input")) onToggle(backup.id) }}>
      <TableCell><input type="checkbox" aria-label={`Select ${backup.filename}`} checked={selected} onChange={() => onToggle(backup.id)} /></TableCell>
      <TableCell><TableText title={backup.filename} className="text-[13px] font-semibold text-gray-900 dark:text-zinc-100">{backup.filename}</TableText></TableCell>
      {PLATFORM_BACKUP_COLUMNS.filter(({ key }) => visibleColumns.includes(key)).map(({ key }) => cells[key])}
      <TableCell><BackupActionsMenu backup={backup} onDownload={onDownload} onDelete={onDelete} /></TableCell>
    </TableRow>
  }
}

