"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
      <DialogContent className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-md dark:border-white/10 dark:bg-card">
        <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-pup-maroon dark:text-primary shadow-sm dark:bg-red-950/30">
              <i className="ph-duotone ph-key text-xl"></i>
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
              <i className="ph-bold ph-user text-lg text-pup-maroon dark:text-primary"></i>
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
                <i
                  className={`ph-bold ${copied ? "ph-check" : "ph-copy"} text-sm`}
                ></i>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-xs font-medium text-amber-700">
              <i className="ph-bold ph-warning-circle mr-1"></i>
              User must change this password on first login.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2.5 border-none bg-white p-6 pt-0 sm:flex-row sm:justify-end dark:bg-card">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="h-10 px-4 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-white/5 rounded-xl cursor-pointer border-none shadow-none"
          >
            Close
          </Button>
          <Button
            onClick={onClose}
            className="btn-brand-red h-10 px-5 text-xs font-semibold text-white rounded-xl shadow-none cursor-pointer flex items-center gap-1.5"
          >
            <i className="ph-bold ph-check text-base"></i>
            I&apos;ve Recorded This
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

