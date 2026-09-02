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
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
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
  isDeleteBackup = false,
  isArchiveModal = false,
  isRestoreModal = false,
  isPersonnelModal = false,
  isRegistrationModal = false,
  isUnsavedChangesModal = false,
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
    brand: {
      icon: "ph-duotone ph-user-gear",
      iconWrap: "bg-red-50 dark:bg-red-950/30 border-red-100 text-pup-maroon shadow-sm dark:border-white/10",
      title: "text-gray-900 dark:text-zinc-50",
      description: "text-gray-600 dark:text-zinc-300",
      confirmVariant: "default",
      buttonIcon: "ph-bold ph-check",
    },
    warning: {
      icon: "ph-duotone ph-warning",
      iconWrap: "bg-amber-50 dark:bg-amber-950/30 border-amber-100 text-amber-600 shadow-sm dark:border-white/10",
      title: "text-gray-900 dark:text-zinc-50",
      description: "text-gray-600 dark:text-zinc-300",
      confirmVariant: "default",
      buttonIcon: "ph-bold ph-warning",
      confirmStyle: "bg-orange-600 hover:bg-orange-700 border-0! border-none! shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-1px_0_rgba(0,0,0,0.4),0_1px_3px_rgba(0,0,0,0.2),0_1px_2px_-1px_rgba(0,0,0,0.1)]! text-white",
    },
    success: {
      icon: "ph-duotone ph-archive-restore",
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

  const isAppleStyled = isDeleteBackup || isArchiveModal || isRestoreModal || isPersonnelModal || isRegistrationModal || isUnsavedChangesModal;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent 
        className="sm:max-w-lg p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand dark:bg-card dark:border-white/10"
      >
        <DialogHeader className={cn(
          "p-6 border-b border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 min-w-0",
          isAppleStyled && "bg-white dark:bg-card border-none pb-0",
          (!selectedItems.length && !isVerificationEnabled) && "pb-5 border-b-0"
        )}>
          <div className="flex items-start gap-4 w-full">
            {!isAppleStyled && (
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${v.iconWrap}`}>
                <i className={`${displayIcon} text-xl`}></i>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <DialogTitle className={cn(
                `text-lg font-semibold tracking-tight ${v.title} truncate`,
                isAppleStyled && "text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
              )}>
                {title}
              </DialogTitle>
              <DialogDescription className={cn(
                `text-sm font-medium mt-1.5 ${v.description}`,
                isAppleStyled && "text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-1"
              )}>
                {message}
              </DialogDescription>
              {note && (
                isRegistrationModal ? (
                  <div className="mt-3 p-0 border-none bg-transparent">
                    <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-450 p-0">
                      {note}
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/30">
                    <i className="ph-bold ph-info text-amber-600 shrink-0" />
                    <p className="text-[11px] font-semibold text-amber-700">
                      {note}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        </DialogHeader>

        {(selectedItems.length > 0 || isVerificationEnabled) && (
          <div className={cn("p-6 space-y-5 bg-white min-w-0 dark:bg-card", isAppleStyled && "py-4")}>
            {selectedItems.length > 0 && (
              <div>
                <p className={cn(
                  "text-[10px] font-semibold text-gray-400 tracking-widest mb-1.5 dark:text-zinc-500",
                  isAppleStyled && "text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-400"
                )}>
                  Selected Items ({selectedItems.length})
                </p>
                <div className="relative w-full">
                  {isAppleStyled ? (
                    isPersonnelModal ? (
                      <div 
                        className={cn(
                          "border-[0.5px] border-gray-250 dark:border-white/10 rounded-[8px] p-0 bg-white dark:bg-card overflow-y-auto",
                          selectedItems.length > 5 ? "max-h-[220px]" : ""
                        )}
                        style={{ borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.1)' }}
                      >
                        {selectedItems.map((item, idx) => (
                          <div 
                            key={idx} 
                            className="text-[13px] font-normal text-pup-maroon dark:text-red-400 px-[14px] py-[10px] truncate"
                            style={{
                              borderBottomWidth: idx < selectedItems.length - 1 ? '0.5px' : '0px',
                              borderBottomStyle: 'solid',
                              borderBottomColor: 'rgba(0,0,0,0.06)'
                            }}
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div 
                        className="border-[0.5px] border-gray-250 dark:border-white/10 rounded-[8px] p-[10px_14px] bg-white dark:bg-card max-h-32 overflow-y-auto space-y-1.5"
                        style={{ borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.1)' }}
                      >
                        {selectedItems.map((item, idx) => (
                          <div 
                            key={idx} 
                            className={cn(
                              (isArchiveModal || isRestoreModal)
                                ? "text-[13px] font-normal text-pup-maroon dark:text-red-400 truncate"
                                : "text-[12px] font-normal text-gray-500 dark:text-zinc-400 font-sans truncate"
                            )}
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2 space-y-1 custom-scrollbar pb-6 w-full dark:border-white/10 dark:bg-white/5">
                      {selectedItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-2 py-1.5 rounded bg-white border border-gray-100 shadow-sm overflow-hidden w-full dark:bg-card dark:border-white/10"
                        >
                          <div className={`w-1.5 h-1.5 shrink-0 rounded-full ${variant === "success" ? "bg-emerald-500" : (variant === "warning" ? "bg-amber-500" : "bg-red-500")}`} />
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-[11px] font-semibold text-gray-700 dark:text-zinc-200">
                              {item}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {isVerificationEnabled && (
              isDeleteBackup ? (
                <div className="bg-white dark:bg-card p-0 flex flex-col items-center gap-5">
                  <div className="text-center w-full">
                    <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-400 text-center">
                      Security Authorization Code
                    </label>
                    <div className="text-[28px] font-semibold tracking-[0.08em] text-pup-maroon dark:text-red-400 text-center">
                      {verificationTarget}
                    </div>
                  </div>

                  <div className="w-full">
                    <label className="mb-3 block text-center text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-400 text-center">
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
                          className="h-[44px] w-[44px] rounded-[8px] border-[0.5px] border-gray-300 dark:border-zinc-800 bg-white text-center font-sans text-[18px] font-semibold text-gray-900 transition-all focus:border-[#e30000] focus:ring-0 focus:outline-none focus-visible:outline-none focus:border-[1.5px] caret-transparent dark:bg-card dark:text-zinc-50"
                          style={{ borderWidth: '0.5px', borderStyle: 'solid' }}
                          placeholder="0"
                          value={verificationValue[i] || ""}
                          onChange={(e) => handleInputChange(i, e.target.value)}
                          onKeyDown={(e) => handleKeyDownLocal(i, e)}
                          autoFocus={i === 0}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] font-normal text-gray-500 dark:text-zinc-400 text-center">
                    Enter the code above to confirm deletion.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-red-100 bg-red-50 p-5 shadow-xs dark:bg-red-950/30 dark:border-zinc-800">
                  <div className="flex flex-col items-center gap-5">
                    <div className="text-center">
                      <label className="mb-2 block text-[9px] font-semibold tracking-widest text-red-800/60 dark:text-red-500/60">
                        Security Authorization Code
                      </label>
                      <div className="flex h-12 items-center justify-center rounded-xl border-2 border-dashed border-red-200 bg-white px-8 font-sans text-xl font-semibold text-red-700 shadow-inner dark:bg-card dark:shadow-none dark:border-zinc-800 dark:text-red-400">
                        {verificationTarget}
                      </div>
                    </div>

                    <div className="w-full">
                      <label className="mb-3 block text-center text-[9px] font-semibold tracking-widest text-red-800/60 dark:text-red-500/60">
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
                            className="h-16 w-14 rounded-xl border-2 border-red-200 bg-white text-center font-sans text-xl font-semibold text-gray-900 shadow-sm transition-all focus:scale-105 focus:border-red-500 focus:ring-4 focus:ring-red-100 focus:outline-none caret-transparent dark:bg-card dark:text-zinc-50 dark:border-zinc-800 dark:focus:border-red-500/50 dark:focus:ring-red-900/20"
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
                  <p className="mt-5 text-[10px] font-semibold text-red-700/70 text-center dark:text-red-500/70">
                    For security, please enter the code shown above to enable the deletion button.
                  </p>
                </div>
              )
            )}
          </div>
        )}

        <div className={cn(
          "p-4 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-card flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5",
          isAppleStyled && "border-none pt-0 gap-2 justify-end flex-row",
          (!selectedItems.length && !isVerificationEnabled) && "pt-0 border-t-0"
        )}>
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className={cn(
              "h-11 rounded-brand px-6 text-sm font-semibold text-gray-500 hover:bg-transparent hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors",
              isAppleStyled && "text-[13px] font-medium text-gray-500 dark:text-zinc-400 bg-transparent hover:bg-transparent border-none shadow-none p-0 h-auto"
            )}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <LiquidGlassButton
            type="button"
            onClick={onConfirm}
            disabled={isLoading || disabled || !isVerified}
            themeColor={!(variant === "success" || variant === "warning" || isRestoreModal || isUnsavedChangesModal || v.confirmVariant === "destructive")}
            height={((isDeleteBackup || isArchiveModal || isPersonnelModal || isRegistrationModal) || isRestoreModal || isUnsavedChangesModal) ? 36 : 44}
            radius={((isDeleteBackup || isArchiveModal || isPersonnelModal || isRegistrationModal) || isRestoreModal || isUnsavedChangesModal) ? 18 : 22}
            glassColor="rgba(10, 132, 255, 0.15)"
            className={cn(
              "px-6 text-sm font-semibold gap-2 flex items-center transition-all active:scale-95 disabled:opacity-30 disabled:grayscale-[0.5] disabled:cursor-not-allowed",
              !isAppleStyled && "shadow-sm",
              variant === "success" && "btn-brand-green",
              (variant === "warning" && !isAppleStyled) && (v.confirmStyle || "bg-amber-600 hover:bg-amber-700 text-white"),
              (variant === "brand") && "btn-brand-red hover:from-red-700 hover:to-red-900",
              (v.confirmVariant === "destructive" && !isAppleStyled) && "btn-brand-red",
              (v.confirmVariant === "default" && !["success", "warning", "brand"].includes(variant) && !isAppleStyled) && "bg-gray-900 hover:bg-gray-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-50 dark:border-white/10",
              ((isDeleteBackup || isArchiveModal || isPersonnelModal || isRegistrationModal) && !isRestoreModal) && "text-[13px] font-medium text-white shadow-none! border-none! py-0 px-4 cursor-pointer",
              isRestoreModal && "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-none! border-none! py-0 px-4 cursor-pointer text-[13px] font-medium",
              isUnsavedChangesModal && "bg-[#FF6410] hover:bg-[#e55300] active:bg-[#cc4a00] text-white shadow-none! border-none! py-0 px-4 cursor-pointer text-[13px] font-medium",
              isRegistrationModal && "w-[120px]",
              confirmClassName
            )}
          >
            {!isAppleStyled && <i className={`${displayButtonIcon} text-lg`}></i>}
            {isLoading ? "Processing..." : confirmLabel}
          </LiquidGlassButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
