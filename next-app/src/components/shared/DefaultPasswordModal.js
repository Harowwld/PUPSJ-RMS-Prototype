"use client"

import HugeIcon from "@/components/shared/HugeIcon";
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export default function DefaultPasswordModal({
  open,
  onClose,
  userName,
  password,
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore copy errors
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-md dark:border-white/10 dark:bg-card gap-0">
        <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-pup-maroon dark:text-primary shadow-sm dark:bg-red-950/30">
              <HugeIcon  className="ph-duotone ph-key text-xl"></HugeIcon>
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                Account Credentials Ready
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px] font-normal text-gray-500 dark:text-zinc-400">
                The staff account has been created. Securely share these
                temporary credentials with the user.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 p-6">
          {/* User info */}
          <div className="flex items-center gap-3 rounded-brand border border-gray-200 bg-transparent p-3 dark:border-white/10 dark:bg-transparent">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pup-maroon/10">
              <HugeIcon  className="ph-bold ph-user text-lg text-pup-maroon dark:text-primary"></HugeIcon>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wider text-gray-500 dark:text-zinc-400">
                New Account
              </p>
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-zinc-50">
                {userName}
              </p>
            </div>
          </div>

          {/* Password display - prominent style */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold tracking-wide text-gray-700 dark:text-zinc-200">
              Temporary Password
            </label>
            <div className="relative">
              <div className="rounded-brand border-2 border-amber-200 bg-amber-50 p-4 dark:bg-amber-950/30">
                <p className="text-center text-xl font-semibold tracking-wider break-all text-amber-900">
                  {password}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className={`absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1.5 rounded-brand px-3 py-1.5 text-xs font-semibold transition-all ${ copied ? "border-2 border-green-200 bg-green-100 text-green-700" : "border-red-200 bg-white text-pup-maroon dark:text-primary shadow-sm hover:bg-red-50" } dark:bg-card`}
              >
                <HugeIcon 
                  className={`ph-bold ${copied ? "ph-check" : "ph-copy"} text-sm`}
                ></HugeIcon>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-xs font-medium text-amber-700">
              <HugeIcon  className="ph-bold ph-warning-circle mr-1"></HugeIcon>
              User must change this password on first login.
            </p>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-10 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={onClose}
            className="h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white shadow-xs cursor-pointer active:scale-95 transition-all border-0"
          >
            Acknowledge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

