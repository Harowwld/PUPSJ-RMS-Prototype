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
    if (!open) {
      setToken("");
      setError("");
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token || token.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }
    setError("");
    try {
      await onConfirm(token);
    } catch (err) {
      const msg = err?.message || "Invalid verification code";
      setError(msg);
      toast.error("Verification Failed", { description: msg });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-brand">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-gray-900 flex items-center gap-2">
            <i className="ph-bold ph-shield-check text-pup-maroon text-2xl"></i>
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 font-medium">
            {description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm font-bold rounded-brand flex items-center gap-2">
              <i className="ph-bold ph-warning-circle"></i>
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Input
              type="text"
              maxLength={6}
              className="h-14 bg-white border-gray-300 rounded-brand focus:ring-pup-maroon font-bold text-gray-900 text-center tracking-widest text-2xl"
              placeholder="000000"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
            />
            <p className="text-xs text-gray-500 text-center">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="h-11 font-black uppercase tracking-widest rounded-brand"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || token.length !== 6}
              className="h-11 px-6 bg-pup-maroon hover:bg-red-900 text-white font-black uppercase tracking-widest shadow-lg shadow-red-900/20 flex items-center gap-2 rounded-brand"
            >
              {isLoading ? (
                <>
                  <i className="ph-bold ph-spinner animate-spin"></i>
                  Verifying...
                </>
              ) : (
                <>
                  <i className="ph-bold ph-check"></i>
                  {actionLabel}
                </>
              )}
            </Button>
          </DialogFooter>
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
