"use client"

import { useState } from "react"
import {
  Archive01Icon,
  Copy01Icon,
  MoreHorizontalIcon,
  MoreVerticalIcon,
  ReloadIcon,
  Settings01Icon,
  ViewIcon,
} from "hugeicons-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export default function OfficeActionsMenu({
  office,
  onViewDetails,
  onConfigure,
  onCopyStoragePath,
  onArchive,
  onRestore,
  triggerVariant = "card",
}) {
  const [open, setOpen] = useState(false)
  const isActive = String(office.status || "").trim().toLowerCase() === "active"
  const isTableTrigger = triggerVariant === "table"
  const TriggerIcon = isTableTrigger ? MoreHorizontalIcon : MoreVerticalIcon

  const runAction = (event, callback) => {
    event.stopPropagation()
    setOpen(false)
    callback?.(office)
  }

  const actionClassName = "flex min-h-8 w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:text-zinc-300 dark:hover:bg-zinc-800/70 dark:focus-visible:ring-red-400"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(event) => event.stopPropagation()}
          aria-label={`More actions for ${office.short_name || "department"}`}
          aria-expanded={open}
          className={isTableTrigger
            ? "table-action-button"
            : "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-white/10 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white active:scale-95"}
        >
          <TriggerIcon size={16} aria-hidden="true" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={6}
        className="max-h-[calc(100dvh-2rem)] w-[min(12.5rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-2xl"
      >
        <div className="max-h-[min(55vh,18rem)] space-y-0.5 overflow-y-auto p-1">
          <button type="button" onClick={(event) => runAction(event, onViewDetails)} className={actionClassName}>
            <ViewIcon size={14} aria-hidden="true" className="shrink-0 text-gray-500 dark:text-zinc-400" />
            <span>View Details</span>
          </button>

          {isActive && (
            <button type="button" onClick={(event) => runAction(event, onConfigure)} className={actionClassName}>
              <Settings01Icon size={14} aria-hidden="true" className="shrink-0 text-gray-500 dark:text-zinc-400" />
              <span>Configure Department</span>
            </button>
          )}

          <button type="button" onClick={(event) => runAction(event, onCopyStoragePath)} className={actionClassName}>
            <Copy01Icon size={14} aria-hidden="true" className="shrink-0 text-gray-500 dark:text-zinc-400" />
            <span>Copy Storage Path</span>
          </button>

          <div aria-hidden="true" className="my-1 h-px bg-border dark:bg-white/10" />

          {isActive ? (
            <button
              type="button"
              onClick={(event) => runAction(event, onArchive)}
              className="flex min-h-8 w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <Archive01Icon size={14} aria-hidden="true" className="shrink-0" />
              <span>Archive Department</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={(event) => runAction(event, onRestore)}
              className="flex min-h-8 w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-600 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            >
              <ReloadIcon size={14} aria-hidden="true" className="shrink-0" />
              <span>Restore Department</span>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
