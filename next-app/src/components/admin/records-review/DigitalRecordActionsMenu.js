"use client"

import { useState } from "react"
import {
  Cancel01Icon,
  MoreHorizontalIcon,
  RotateLeft01Icon,
  Tick01Icon,
  ViewIcon,
} from "hugeicons-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const actionClassName =
  "flex min-h-8 w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:text-zinc-300 dark:hover:bg-zinc-800/70 dark:focus-visible:ring-red-400 cursor-pointer"

export default function DigitalRecordActionsMenu({
  record,
  onPreview,
  onApprove,
  onDecline,
  onSetStatus,
}) {
  const [open, setOpen] = useState(false)
  const isPending = record.approval_status === "Pending"

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
          aria-label={`More actions for record ${record.student_no}`}
          aria-expanded={open}
          className="table-action-button rounded-lg active:scale-95 cursor-pointer"
        >
          <MoreHorizontalIcon size={16} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="max-h-[calc(100dvh-2rem)] w-[min(13.5rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-2xl"
      >
        <div className="max-h-[min(55vh,18rem)] space-y-0.5 overflow-y-auto p-1">
          <button
            type="button"
            onClick={(event) => runAction(event, () => onPreview?.(record))}
            className={actionClassName}
          >
            <ViewIcon
              size={14}
              aria-hidden="true"
              className="shrink-0 text-gray-500 dark:text-zinc-400"
            />
            <span>Preview Document</span>
          </button>

          {isPending ? (
            <>
              <div aria-hidden="true" className="-mx-1 my-1.5 h-px bg-gray-200 dark:bg-white/10" />
              <button
                type="button"
                onClick={(event) => runAction(event, () => onApprove?.(record.id))}
                className="flex min-h-8 w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-600 dark:text-emerald-400 dark:hover:bg-emerald-950/30 cursor-pointer"
              >
                <Tick01Icon
                  size={14}
                  aria-hidden="true"
                  className="shrink-0 text-emerald-600 dark:text-emerald-400"
                />
                <span>Approve Document</span>
              </button>

              <button
                type="button"
                onClick={(event) => runAction(event, () => onDecline?.(record.id))}
                className="flex min-h-8 w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500 dark:text-red-400 dark:hover:bg-red-950/30 cursor-pointer"
              >
                <Cancel01Icon
                  size={14}
                  aria-hidden="true"
                  className="shrink-0 text-red-600 dark:text-red-400"
                />
                <span>Decline Document</span>
              </button>
            </>
          ) : onSetStatus ? (
            <>
              <div aria-hidden="true" className="-mx-1 my-1.5 h-px bg-gray-200 dark:bg-white/10" />
              <button
                type="button"
                onClick={(event) =>
                  runAction(event, () =>
                    onSetStatus?.(
                      record.id,
                      "Pending",
                      "Moved back to review queue from table actions"
                    )
                  )
                }
                className="flex min-h-8 w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-600 dark:text-amber-400 dark:hover:bg-amber-950/30 cursor-pointer"
              >
                <RotateLeft01Icon
                  size={14}
                  aria-hidden="true"
                  className="shrink-0 text-amber-600 dark:text-amber-400"
                />
                <span>Move back to Pending Review</span>
              </button>
            </>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}
