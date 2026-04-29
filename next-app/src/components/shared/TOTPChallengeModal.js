"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function TOTPChallengeModal({
  open,
  onOpenChange,
  onConfirm,
  title = "Verify Your Identity",
  description = "Enter the 6-digit code from your authenticator app to confirm this action.",
  actionLabel = "Confirm",
  isLoading = false,
}) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    console.log("[TOTP MODAL] open changed to:", open);
    if (!open) {
      setToken("");

      setError("");
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("[TOTP MODAL] handleSubmit called, token:", token);
    if (!token || token.length !== 6) {
      console.log("[TOTP MODAL] Invalid token length");
      setError("Please enter a 6-digit code");
      return;
    }
    console.log("[TOTP MODAL] Calling onConfirm...");
    try {
      await onConfirm(token);
      console.log("[TOTP MODAL] onConfirm succeeded");
    } catch (err) {
      console.log("[TOTP MODAL] onConfirm error:", err.message);
      const msg = err?.message || "Invalid verification code";
      setError(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) onOpenChange(false);
    }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
        <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50 text-left">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm flex items-center justify-center shrink-0">
              <i className="ph-duotone ph-shield-check text-2xl"></i>
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-black tracking-tight text-gray-900 leading-tight">
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm font-medium mt-1.5 text-gray-600 leading-relaxed">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm font-bold rounded-brand flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                <i className="ph-bold ph-warning-circle text-lg"></i>
                {error}
              </div>
            )}

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Security Verification Code
              </label>
              <Input
                type="text"
                maxLength={6}
                className="h-14 bg-white border-gray-300 rounded-brand focus:ring-pup-maroon font-black text-gray-900 text-center tracking-[0.5em] text-2xl shadow-sm"
                placeholder="000000"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoFocus
                inputMode="numeric"
                pattern="[0-9]*"
              />
              <p className="text-[11px] text-gray-500 font-medium text-center italic">
                Verify identity via your linked authenticator app
              </p>
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="h-11 px-6 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand uppercase tracking-wider"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || token.length !== 6}
              className="h-11 px-8 bg-pup-maroon hover:bg-red-900 text-white font-black uppercase tracking-widest shadow-lg shadow-red-900/20 flex items-center gap-2 rounded-brand"
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
  );
}

export async function verifyTOTPWithRetry(token, maxRetries = 1) {
  let lastError = null;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const res = await fetch("/api/auth/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate", token }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok || !json?.data?.valid) {
        lastError = new Error(json?.error || "Invalid verification code");
        continue;
      }
      return true;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Verification failed");
}
