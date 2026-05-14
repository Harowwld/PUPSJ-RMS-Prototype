"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"

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
  const [error, setError] = useState("")

  useEffect(() => {
    console.log("[TOTP MODAL] open changed to:", open)
    if (!open) {
      setToken("")

      setError("")
    }
  }, [open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    console.log("[TOTP MODAL] handleSubmit called, token:", token)
    if (!token || token.length !== 6) {
      console.log("[TOTP MODAL] Invalid token length")
      setError("Please enter a 6-digit code")
      return
    }
    console.log("[TOTP MODAL] Calling onConfirm...")
    try {
      await onConfirm(token)
      console.log("[TOTP MODAL] onConfirm succeeded")
    } catch (err) {
      console.log("[TOTP MODAL] onConfirm error:", err.message)
      const msg = err?.message || "Invalid verification code"
      setError(msg)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onOpenChange(false)
      }}
    >
      <DialogContent className="overflow-hidden rounded-brand border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-md">
        <DialogHeader className="border-b border-gray-100 bg-gray-50/50 p-6 text-left">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm">
              <i className="ph-duotone ph-shield-check text-2xl"></i>
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg leading-tight font-black tracking-tight text-gray-900">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm leading-relaxed font-medium text-gray-600">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-6">
            {error && (
              <div className="animate-in fade-in slide-in-from-top-1 flex items-center gap-2 rounded-brand border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">
                <i className="ph-bold ph-warning-circle text-lg"></i>
                {error}
              </div>
            )}

            <div className="space-y-3">
              <label className="ml-1 text-[10px] font-black tracking-widest text-gray-400 uppercase">
                Security Verification Code
              </label>
              <Input
                type="text"
                maxLength={6}
                className="h-14 rounded-brand border-gray-300 bg-white text-center text-2xl font-black tracking-[0.5em] text-gray-900 shadow-sm focus:ring-pup-maroon"
                placeholder="000000"
                value={token}
                onChange={(e) =>
                  setToken(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                autoFocus
                inputMode="numeric"
                pattern="[0-9]*"
              />
              <p className="text-center text-[11px] font-medium text-gray-500 italic">
                Verify identity via your linked authenticator app
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2.5 border-t border-gray-100 bg-white p-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="h-11 rounded-brand border-gray-300 px-6 text-sm font-bold tracking-wider text-gray-700 uppercase hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || token.length !== 6}
              className="flex h-11 items-center gap-2 rounded-brand bg-pup-maroon px-8 font-black tracking-widest text-white uppercase shadow-lg shadow-red-900/20 hover:bg-red-900"
            >
              {isLoading ? (
                <>
                  <i className="ph-bold ph-spinner animate-spin text-lg"></i>
                  Verifying...
                </>
              ) : (
                <>
                  <i className="ph-bold ph-check text-lg"></i>
                  {actionLabel}
                </>
              )}
            </Button>
          </div>
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
