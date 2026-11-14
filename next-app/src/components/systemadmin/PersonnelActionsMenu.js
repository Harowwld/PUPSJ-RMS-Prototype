"use client"

import { useState } from "react"
import { Archive01Icon, Mail01Icon, MoreHorizontalIcon, PencilEdit01Icon, ReloadIcon, Settings01Icon, ViewIcon } from "hugeicons-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import StaffPasswordResetAction, { canManageStaffPasswordReset, staffPasswordResetBlockReason } from "@/components/shared/StaffPasswordResetAction"

const actionClassName = "flex min-h-8 w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:text-zinc-300 dark:hover:bg-zinc-800/70 dark:focus-visible:ring-red-400"

export default function PersonnelActionsMenu({
  member,
  name,
  isSelf,
  entityName = "Personnel",
  onViewProfile,
  onEdit,
  onSettings,
  onArchive,
  onRestore,
  allowGlobalPasswordReset = false,
}) {
  const [open, setOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const email = member.email?.startsWith("enc:v1:") ? "" : member.email
  const showReset = !isSelf && canManageStaffPasswordReset(member, allowGlobalPasswordReset)
  const resetBlockReason = staffPasswordResetBlockReason(member, email)
  const isActive = member.status === "Active" || (member.status !== "Archived" && member.status !== "Inactive")

  const runAction = (event, callback) => {
    event.stopPropagation()
    setOpen(false)
    callback?.(member)
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(event) => event.stopPropagation()}
            aria-label={`More actions for ${name}`}
            aria-expanded={open}
            className="table-action-button rounded-lg active:scale-95 cursor-pointer"
          >
            <MoreHorizontalIcon size={16} aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={6} className="max-h-[calc(100dvh-2rem)] w-[min(12.5rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-2xl">
          <div className="max-h-[min(55vh,18rem)] space-y-0.5 overflow-y-auto p-1">
            <button type="button" onClick={(event) => runAction(event, onViewProfile)} className={actionClassName}>
              <ViewIcon size={14} aria-hidden="true" className="shrink-0 text-gray-500 dark:text-zinc-400" /><span>View Profile</span>
            </button>
            {isSelf ? (
              <button type="button" onClick={(event) => runAction(event, onSettings)} className={actionClassName}>
                <Settings01Icon size={14} aria-hidden="true" className="shrink-0 text-gray-500 dark:text-zinc-400" /><span>My Account Settings</span>
              </button>
            ) : isActive && (
              <button type="button" onClick={(event) => runAction(event, onEdit)} className={actionClassName}>
                <PencilEdit01Icon size={14} aria-hidden="true" className="shrink-0 text-gray-500 dark:text-zinc-400" /><span>Edit {entityName}</span>
              </button>
            )}
            {showReset && (
              <div>
                <button
                  type="button"
                  disabled={Boolean(resetBlockReason)}
                  onClick={(event) => runAction(event, () => setResetOpen(true))}
                  className={`${actionClassName} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <Mail01Icon size={14} aria-hidden="true" className="shrink-0 text-gray-500 dark:text-zinc-400" />
                  <span>Send Password Reset</span>
                </button>
                {resetBlockReason && <p className="px-2 pb-1 pl-8 text-[11px] text-muted-foreground">{resetBlockReason}</p>}
              </div>
            )}
            {!isSelf && <>
              <div aria-hidden="true" className="-mx-1 my-1.5 h-px bg-gray-200 dark:bg-white/10" />
              {isActive ? (
                <button type="button" onClick={(event) => runAction(event, onArchive)} className="flex min-h-8 w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500 dark:text-red-400 dark:hover:bg-red-950/30">
                  <Archive01Icon size={14} aria-hidden="true" className="shrink-0" /><span>Archive {entityName}</span>
                </button>
              ) : (
                <button type="button" onClick={(event) => runAction(event, onRestore)} className="flex min-h-8 w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-600 dark:text-emerald-400 dark:hover:bg-emerald-950/30">
                  <ReloadIcon size={14} aria-hidden="true" className="shrink-0" /><span>Restore {entityName}</span>
                </button>
              )}
            </>}
          </div>
        </PopoverContent>
      </Popover>
      {resetOpen && showReset && !resetBlockReason && (
        <StaffPasswordResetAction
          account={member}
          email={email}
          global={allowGlobalPasswordReset}
          dialogOnly
          onClose={() => setResetOpen(false)}
        />
      )}
    </>
  )
}
