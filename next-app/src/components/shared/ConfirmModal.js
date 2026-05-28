"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useMemo, useRef, useEffect } from "react";

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isLoading = false,
  disabled = false,
  variant = "danger",
  selectedItems = [],
  note,
  icon: customIcon,
  buttonIcon: customButtonIcon,
  confirmClassName,
  verificationValue = "",
  verificationTarget = "",
  onVerificationChange,
}) {
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];

  // Reset and focus when modal opens
  useEffect(() => {
    if (open && verificationTarget) {
      onVerificationChange?.("");
      setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 350); // Wait for fade-in animation
    }
  }, [open, verificationTarget]);

  const variantClasses = {
    danger: {
      icon: "ph-duotone ph-warning-circle",
      iconWrap: "bg-red-50 dark:bg-red-950/30 border-red-100 text-red-600 shadow-sm dark:border-white/10",
      title: "text-gray-900 dark:text-zinc-50",
      description: "text-gray-600 dark:text-zinc-300",
      confirmVariant: "destructive",
      buttonIcon: "ph-bold ph-trash",
    },
    warning: {
      icon: "ph-duotone ph-warning",
      iconWrap: "bg-amber-50 dark:bg-amber-950/30 border-amber-100 text-amber-600 shadow-sm dark:border-white/10",
      title: "text-gray-900 dark:text-zinc-50",
      description: "text-gray-600 dark:text-zinc-300",
      confirmVariant: "default",
      buttonIcon: "ph-bold ph-warning",
      confirmStyle: "bg-linear-to-b from-orange-700 to-orange-500 border-4 border-orange-900 hover:from-orange-600 hover:to-orange-800 text-white shadow-lg shadow-orange-900/20",
    },
    success: {
      icon: "ph-duotone ph-arrow-counter-clockwise",
      iconWrap: "bg-green-50 border-green-100 text-green-600 shadow-sm dark:bg-emerald-950/30 dark:border-white/10",
      title: "text-gray-900 dark:text-zinc-50",
      description: "text-gray-600 dark:text-zinc-300",
      confirmVariant: "default",
      buttonIcon: "ph-bold ph-check",
    },
    default: {
      icon: "ph-duotone ph-info",
      iconWrap: "bg-blue-50 dark:bg-blue-950/30 border-blue-100 text-blue-600 shadow-sm dark:border-white/10",
      title: "text-gray-900 dark:text-zinc-50",
      description: "text-gray-600 dark:text-zinc-300",
      confirmVariant: "default",
      buttonIcon: "ph-bold ph-check",
    },
  };

  const v = variantClasses[variant] || variantClasses.default;
  const displayIcon = customIcon || v.icon;
  const displayButtonIcon = customButtonIcon || v.buttonIcon;

  const isVerificationEnabled = !!verificationTarget;
  const isVerified = !isVerificationEnabled || verificationValue === verificationTarget;

  const handleInputChange = (index, val) => {
    const newVal = val.replace(/\D/g, "").slice(-1);
    if (!newVal && val !== "") return; // only digits

    const valueArray = verificationValue.split("");
    while (valueArray.length < 4) valueArray.push("");
    valueArray[index] = newVal;
    
    const finalString = valueArray.join("").slice(0, 4);
    onVerificationChange?.(finalString);

    if (newVal && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDownLocal = (index, e) => {
    if (e.key === "Backspace" && !verificationValue[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  // Global key listener for Enter when modal is open
  useEffect(() => {
    if (!open) return;
    const handleGlobalKey = (e) => {
      if (e.key === "Enter" && !isLoading && !disabled && isVerified) {
        e.preventDefault();
        e.stopPropagation();
        onConfirm();
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [open, isLoading, disabled, isVerified, onConfirm]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent 
        className="sm:max-w-lg p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand dark:bg-card dark:border-white/10"
      >
        <DialogHeader className={cn(
          "p-6 border-b border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 min-w-0",
          (!selectedItems.length && !isVerificationEnabled) && "pb-5 border-b-0"
        )}>
          <div className="flex items-start gap-4 w-full">
            <div className={`w-12 h-12 rounded-full border flex items-center justify-center shrink-0 ${v.iconWrap}`}>
              <i className={`${displayIcon} text-2xl`}></i>
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className={`text-lg font-black tracking-tight leading-tight ${v.title} truncate`}>
                {title}
              </DialogTitle>
              <DialogDescription className={`text-sm font-medium mt-1.5 leading-relaxed ${v.description}`}>
                {message}
              </DialogDescription>
              {note && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/30">
                  <i className="ph-bold ph-info text-amber-600 shrink-0" />
                  <p className="text-[11px] font-bold text-amber-700 leading-tight">
                    {note}
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {(selectedItems.length > 0 || isVerificationEnabled) && (
          <div className="p-6 space-y-5 bg-white min-w-0 dark:bg-card">
            {selectedItems.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 dark:text-zinc-500">
                  Selected Items ({selectedItems.length})
                </p>
                <div className="relative w-full">
                  <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2 space-y-1 custom-scrollbar pb-6 w-full dark:border-white/10 dark:bg-white/5">
                    {selectedItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-2 py-1.5 rounded bg-white border border-gray-100 shadow-sm overflow-hidden w-full dark:bg-card dark:border-white/10"
                      >
                        <div className={`w-1.5 h-1.5 shrink-0 rounded-full ${variant === "success" ? "bg-emerald-500" : (variant === "warning" ? "bg-amber-500" : "bg-red-500")}`} />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-[11px] font-bold text-gray-700 dark:text-zinc-200">
                            {item}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  </div>
                  </div>
                  )}

            {isVerificationEnabled && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-5 shadow-xs dark:bg-red-950/30 dark:border-zinc-800">
                <div className="flex flex-col items-center gap-5">
                  <div className="text-center">
                    <label className="mb-2 block text-[9px] font-black tracking-widest text-red-800/60 uppercase dark:text-red-500/60">
                      Security Authorization Code
                    </label>
                    <div className="flex h-12 items-center justify-center rounded-xl border-2 border-dashed border-red-200 bg-white px-8 font-mono text-2xl font-black tracking-[0.5em] text-red-700 shadow-inner dark:bg-card dark:shadow-none dark:border-zinc-800 dark:text-red-400">
                      {verificationTarget}
                    </div>
                  </div>

                  <div className="w-full">
                    <label className="mb-3 block text-center text-[9px] font-black tracking-widest text-red-800/60 uppercase dark:text-red-500/60">
                      Input Matching Digits
                    </label>
                    <div className="flex justify-center gap-3">
                      {[0, 1, 2, 3].map((i) => (
                        <input
                          key={i}
                          ref={inputRefs[i]}
                          type="text"
                          maxLength={1}
                          inputMode="numeric"
                          className="h-16 w-14 rounded-xl border-2 border-red-200 bg-white text-center font-mono text-3xl font-black text-gray-900 shadow-sm transition-all focus:scale-105 focus:border-red-500 focus:ring-4 focus:ring-red-100 focus:outline-none caret-transparent dark:bg-card dark:text-zinc-50 dark:border-zinc-800 dark:focus:border-red-500/50 dark:focus:ring-red-900/20"
                          placeholder="0"
                          value={verificationValue[i] || ""}
                          onChange={(e) => handleInputChange(i, e.target.value)}
                          onKeyDown={(e) => handleKeyDownLocal(i, e)}
                          autoFocus={i === 0}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="mt-5 text-[10px] font-bold text-red-700/70 text-center leading-tight dark:text-red-500/70">
                  For security, please enter the code shown above to enable the deletion button.
                </p>
              </div>
            )}
          </div>
        )}

        <div className={cn(
          "p-4 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-card flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5",
          (!selectedItems.length && !isVerificationEnabled) && "pt-0 border-t-0"
        )}>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-11 rounded-brand border-gray-300 px-6 text-sm font-bold text-gray-600 uppercase hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 shadow-sm transition-colors dark:border-white/10 dark:text-zinc-300 dark:hover:border-zinc-700 dark:bg-red-950/30"
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={v.confirmVariant}
            onClick={onConfirm}
            disabled={isLoading || disabled || !isVerified}
            className={cn(
              "h-11 px-6 text-sm font-black shadow-sm rounded-brand gap-2 flex items-center transition-all active:scale-95 disabled:opacity-30 disabled:grayscale-[0.5] disabled:cursor-not-allowed uppercase",
              variant === "success" && "bg-green-600 hover:bg-green-700 text-white",
              variant === "warning" && (v.confirmStyle || "bg-amber-600 hover:bg-amber-700 text-white"),
              v.confirmVariant === "destructive" && "btn-brand-red",
              (v.confirmVariant === "default" && !["success", "warning"].includes(variant)) && "bg-gray-900 hover:bg-gray-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-50 dark:border-white/10",
              confirmClassName
            )}
          >
            <i className={`${displayButtonIcon} text-lg`}></i>
            {isLoading ? "Processing..." : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

