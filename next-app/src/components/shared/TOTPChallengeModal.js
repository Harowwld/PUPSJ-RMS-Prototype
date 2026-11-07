"use client"


import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { formatErrorMessage } from "@/lib/errorUtils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Loading01Icon } from "hugeicons-react";


export function TOTPChallengeModal({
  open,
  onOpenChange,
  onConfirm,
  title = "Verify Your Identity",
  description = "Enter the 6-digit code from your authenticator app to confirm this action.",
  actionLabel = "Confirm",
  isLoading = false,
}) {
  const [token, setToken] = useState("")

  if (!open && token !== "") {
    setToken("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = token.trim()
    if (!trimmed || (trimmed.length !== 6 && trimmed.length !== 8)) {
      toast.error("Invalid Code", {
        description: "Please enter a 6-digit verification code or 8-character recovery code.",
      })
      return
    }
    try {
      await onConfirm(trimmed)
    } catch (err) {
      const errInfo = formatErrorMessage(err, "Verification Failed")
      toast.error(errInfo.title, {
        description: errInfo.description,
        action: errInfo.action,
      })
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onOpenChange(false)
      }}
    >
      <DialogContent className="overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-2xl sm:max-w-md dark:border-border dark:bg-card gap-0">
        <DialogHeader className="p-6 pb-0 text-left">
          <div className="flex items-start gap-4">
            <div className="min-w-0">
              <DialogTitle>
                {title}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-6">

            <div className="space-y-3">
              <label className="ml-1 text-[10px] font-semibold tracking-widest text-gray-400 dark:text-zinc-500">
                Security Verification Code
              </label>
              <Input
                type="text"
                maxLength={8}
                className="h-14 rounded-xl border border-border dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] text-center font-sans tabular-nums text-2xl font-semibold tracking-[0.25em] text-gray-900 dark:text-zinc-50 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:bg-white dark:focus:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon/30 dark:focus-visible:ring-red-500/40 transition-all"
                placeholder="000000"
                value={token}
                onChange={(e) =>
                  setToken(e.target.value.trim().slice(0, 8))
                }
                autoFocus
              />
              <p className="text-center text-[11px] font-medium text-gray-500 italic dark:text-zinc-400">
                Verify identity via authenticator app or recovery code
              </p>
            </div>
          </div>

          <DialogFooter className="p-6 pt-0 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || (token.trim().length !== 6 && token.trim().length !== 8)}
              className="h-9 px-4 cursor-pointer disabled:opacity-50 border-0"
            >
              {isLoading ? (
                <>
                  <Loading01Icon size="1em"  className="animate-spin text-sm mr-1.5"></Loading01Icon>
                  Verifying...
                </>
              ) : (
                actionLabel
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export async function verifyTOTPWithRetry(token, maxRetries = 1) {
  let lastError = null
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const res = await fetch("/api/auth/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate", token }),
      })
      const json = await res.json()
      if (!res.ok || !json?.ok || !json?.data?.valid) {
        lastError = new Error(json?.error || "Invalid verification code")
        continue
      }
      return true
    } catch (err) {
      lastError = err
    }
  }
  throw lastError || new Error("Verification failed")
}
