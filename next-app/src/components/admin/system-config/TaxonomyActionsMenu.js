"use client"

import { useState } from "react"
import { Archive01Icon, Archive02Icon, MoreHorizontalIcon, PencilEdit01Icon } from "hugeicons-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const actionClassName = "flex min-h-8 w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:text-zinc-300 dark:hover:bg-zinc-800/70 dark:focus-visible:ring-red-400 cursor-pointer border-0 bg-transparent select-none active:scale-[0.98]"

export default function TaxonomyActionsMenu({
  item,
  name,
  entityName = "Item",
  isArchived = false,
  onEdit,
  onArchive,
  onRestore,
}) {
  const [open, setOpen] = useState(false)

  const runAction = (event, callback) => {
    event.stopPropagation()
    setOpen(false)
    callback?.(item)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(event) => event.stopPropagation()}
          aria-label={`Actions for ${name}`}
          aria-expanded={open}
          className="table-action-button rounded-lg active:scale-95 cursor-pointer"
        >
          <MoreHorizontalIcon size={16} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="max-h-[calc(100dvh-2rem)] w-[min(13.5rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-2xl">
        <div className="max-h-[min(55vh,18rem)] space-y-0.5 overflow-y-auto p-1">
          {!isArchived && onEdit && (
            <button
              type="button"
              onClick={(event) => runAction(event, onEdit)}
              className={actionClassName}
            >
              <PencilEdit01Icon size={14} aria-hidden="true" className="shrink-0 text-gray-500 dark:text-zinc-400" />
              <span>Edit {entityName}</span>
            </button>
          )}

          {!isArchived && onEdit && (onArchive || onRestore) && (
            <div aria-hidden="true" className="my-1 h-px bg-border dark:bg-white/10" />
          )}

          {!isArchived ? (
            onArchive && (
              <button
                type="button"
                onClick={(event) => runAction(event, onArchive)}
                className="flex min-h-8 w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500 dark:text-red-400 dark:hover:bg-red-950/30 cursor-pointer border-0 bg-transparent select-none active:scale-[0.98]"
              >
                <Archive01Icon size={14} aria-hidden="true" className="shrink-0" />
                <span>Archive {entityName}</span>
              </button>
            )
          ) : (
            onRestore && (
              <button
                type="button"
                onClick={(event) => runAction(event, onRestore)}
                className="flex min-h-8 w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-600 dark:text-emerald-400 dark:hover:bg-emerald-950/30 cursor-pointer border-0 bg-transparent select-none active:scale-[0.98]"
              >
                <Archive02Icon size={14} aria-hidden="true" className="shrink-0" />
                <span>Restore {entityName}</span>
              </button>
            )
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
