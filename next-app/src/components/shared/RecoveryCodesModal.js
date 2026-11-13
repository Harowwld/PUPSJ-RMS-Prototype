"use client";

import NoticeBanner from "@/components/shared/NoticeBanner";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/shared/CopyButton";
import { toast } from "sonner";
import { Cancel01Icon, Download01Icon, SecurityCheckIcon } from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
export default function RecoveryCodesModal({
  open,
  onOpenChange,
  onClose,
  recoveryCodes = [],
  onCopy,
  onDownload,
}) {
  const handleClose = () => {
    onOpenChange?.(false);
    onClose?.();
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
        <DialogHeader className="p-6 pb-0 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <DialogTitle>
                Recovery Codes
              </DialogTitle>
              <DialogDescription className="mt-1">
                Emergency single-use codes for two-factor authentication recovery.
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="size-7 rounded-full bg-black/[0.05] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-all flex items-center justify-center cursor-pointer border-0 shrink-0"
              title="Close"
            >
              <Cancel01Icon size="1em" className="text-sm" />
            </button>
          </div>
        </DialogHeader>

        <NoticeBanner tone="warning" title="Store these codes safely">
          Each recovery code can only be used once. If you lose access to your authenticator app, these are the only way to recover account access.
        </NoticeBanner>

        <div className="p-6 space-y-4">
          {/* Recovery Codes Grid */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                Backup Codes ({recoveryCodes.length})
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none">
                <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900 dark:text-zinc-100">
                  <SecurityCheckIcon size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Recovery</span>
                </span>
                <span className="h-3.5 w-px bg-black/[0.1] dark:bg-white/15 shrink-0" aria-hidden="true" />
                <span className="font-medium text-gray-500 dark:text-zinc-400">
                  Single-Use Only
                </span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50/70 dark:bg-white/[0.02] border border-border dark:border-white/10 rounded-xl">
              {recoveryCodes.map((code, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3 py-2 bg-white dark:bg-card border border-border dark:border-white/10 rounded-lg shadow-2xs select-all group hover:border-gray-300 dark:hover:border-white/20 transition-colors"
                >
                  <span className="font-sans tabular-nums text-[11px] font-medium text-gray-400 dark:text-zinc-500 select-none">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="font-sans tabular-nums text-xs font-semibold tracking-wider text-gray-900 dark:text-zinc-100 select-all">
                    {code}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex items-center gap-2 pt-1">
            <CopyButton
              textToCopy={recoveryCodes.join("\n")}
              entityName="Recovery Codes"
              idleLabel="Copy Codes"
              copiedLabel="Codes Copied!"
              size="sm"
              className="flex-1 h-9"
              onClick={onCopy}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleDownload}
              className="flex-1 h-9 px-3 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all inline-flex items-center justify-center gap-1.5"
            >
              <Download01Icon size={16} />
              Download Codes
            </Button>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 flex items-center justify-end">
          <Button
            type="button"
            size="sm"
            onClick={handleClose}
            className="h-9 px-4 cursor-pointer"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
