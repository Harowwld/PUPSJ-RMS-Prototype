"use client"


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
import { Alert01Icon, UserIcon } from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
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
      <DialogContent className="overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-2xl sm:max-w-md dark:border-border dark:bg-card gap-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start gap-4">
            <div className="min-w-0">
              <DialogTitle>
                Account Credentials Ready
              </DialogTitle>
              <DialogDescription className="mt-1">
                The staff account has been created. Securely share these
                temporary credentials with the user.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 p-6">
          {/* User info */}
          <div className="flex items-center gap-3 rounded-brand border border-border bg-transparent p-3 dark:border-border dark:bg-transparent">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pup-maroon/10">
              <UserIcon size="1em"  className="text-lg text-pup-maroon dark:text-primary"></UserIcon>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wider text-gray-900 dark:text-zinc-300">
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
                <AppIcon
                  className={` ${copied ? "Tick01Icon" : "Copy01Icon"} text-sm`}
                ></AppIcon>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-xs font-medium text-amber-700">
              <Alert01Icon size={16}  className="mr-1"></Alert01Icon>
              User must change this password on first login.
            </p>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-10 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={onClose}
            className="h-10 px-5 cursor-pointer border-0"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

