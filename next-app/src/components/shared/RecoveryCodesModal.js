"use client";

import { useState } from "react";
import HugeIcon from "@/components/shared/HugeIcon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function RecoveryCodesModal({
  open,
  onOpenChange,
  onClose,
  recoveryCodes = [],
  onCopy,
  onDownload,
}) {
  const [copied, setCopied] = useState(false);

  const handleClose = () => {
    onOpenChange?.(false);
    onClose?.();
  };

  const handleCopy = () => {
    if (onCopy) {
      onCopy();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    const text = recoveryCodes.join("\n");
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied to Clipboard", {
        description: "Recovery codes have been saved to your clipboard.",
      });
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    const text = `PUPSJ Records Keeping System - Recovery Codes\nGenerated on: ${new Date().toLocaleString()}\n\n${recoveryCodes.join(
      "\n"
    )}\n\nKeep these codes safe. Each code can only be used once.`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pupsj-recovery-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Recovery Codes Downloaded", {
      description: "Saved as pupsj-recovery-codes.txt",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent
        hideClose={true}
        className="overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-2xl sm:max-w-lg dark:border-border dark:bg-card gap-0 flex flex-col"
      >
        <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                Recovery Codes
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px] font-normal text-gray-900 dark:text-zinc-300">
                Emergency single-use codes for two-factor authentication recovery.
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors focus:outline-none cursor-pointer shrink-0"
              title="Close"
            >
              <HugeIcon className="ph-bold ph-x text-sm" />
            </button>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {/* Security Alert Banner */}
          <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <HugeIcon className="ph-bold ph-warning-circle text-amber-600 dark:text-amber-400 text-lg shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                Store these codes safely
              </p>
              <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-normal">
                Each recovery code can only be used once. If you lose access to your authenticator app, these are the only way to recover account access.
              </p>
            </div>
          </div>

          {/* Recovery Codes Grid */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                Backup Codes ({recoveryCodes.length})
              </span>
              <span className="text-[11px] font-medium text-gray-400 dark:text-zinc-500">
                Single-Use Only
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50/70 dark:bg-white/[0.02] border border-border dark:border-white/10 rounded-xl">
              {recoveryCodes.map((code, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3 py-2 bg-white dark:bg-card border border-border dark:border-white/10 rounded-lg shadow-2xs select-all group hover:border-gray-300 dark:hover:border-white/20 transition-colors"
                >
                  <span className="font-mono text-[11px] font-medium text-gray-400 dark:text-zinc-500 select-none">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="font-mono text-xs font-semibold tracking-wider text-gray-900 dark:text-zinc-100 select-all">
                    {code}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
              className="flex-1 h-9 px-3 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all inline-flex items-center justify-center gap-1.5"
            >
              <HugeIcon
                className={
                  copied
                    ? "ph-bold ph-check text-emerald-600 dark:text-emerald-400"
                    : "ph-bold ph-copy"
                }
              />
              {copied ? "Copied" : "Copy Codes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDownload}
              className="flex-1 h-9 px-3 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all inline-flex items-center justify-center gap-1.5"
            >
              <HugeIcon className="ph-bold ph-download-simple" />
              Download (.txt)
            </Button>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end">
          <Button
            type="button"
            onClick={handleClose}
            className="h-10 px-6 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
