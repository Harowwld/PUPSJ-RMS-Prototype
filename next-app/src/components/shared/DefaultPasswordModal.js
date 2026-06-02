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
      <DialogContent className="overflow-hidden rounded-brand border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-md dark:border-white/10 dark:bg-card">
        <DialogHeader className="border-b border-gray-100 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-pup-maroon dark:text-primary shadow-sm dark:bg-red-950/30">
              <i className="ph-duotone ph-key text-2xl"></i>
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg leading-tight font-black tracking-tight text-gray-900 dark:text-zinc-50">
                Account Credentials Ready
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm leading-relaxed font-medium text-gray-600 dark:text-zinc-300">
                The staff account has been created. Securely share these
                temporary credentials with the user.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 p-6">
          {/* User info */}
          <div className="flex items-center gap-3 rounded-brand border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-card">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pup-maroon/10">
              <i className="ph-bold ph-user text-lg text-pup-maroon dark:text-primary"></i>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-wider text-gray-500 dark:text-zinc-400">
                New Account
              </p>
              <p className="truncate text-sm font-bold text-gray-900 dark:text-zinc-50">
                {userName}
              </p>
            </div>
          </div>

          {/* Password display - prominent style */}
          <div className="space-y-2">
            <label className="block text-xs font-bold tracking-wide text-gray-700 dark:text-zinc-200">
              Temporary Password
            </label>
            <div className="relative">
              <div className="rounded-brand border-2 border-amber-200 bg-amber-50 p-4 dark:bg-amber-950/30">
                <p className="text-center font-mono text-xl font-black tracking-wider break-all text-amber-900">
                  {password}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className={`absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1.5 rounded-brand px-3 py-1.5 text-xs font-bold transition-all ${ copied ? "border-2 border-green-200 bg-green-100 text-green-700" : "border-red-200 bg-white text-pup-maroon dark:text-primary shadow-sm hover:bg-red-50" } dark:bg-card`}
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

        <div className="flex flex-col-reverse gap-2.5 border-t border-gray-100 bg-white p-4 sm:flex-row sm:justify-end dark:border-white/10 dark:bg-card">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-11 rounded-brand border-gray-300 px-6 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/10 dark:bg-card"
          >
            Close
          </Button>
          <Button
            onClick={onClose}
            className="btn-brand-red px-6 shadow-sm dark:shadow-none"
          >
            <i className="ph-bold ph-check text-lg"></i>
            I&apos;ve Recorded This
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

