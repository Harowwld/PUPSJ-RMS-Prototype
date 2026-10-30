"use client";
import HugeIcon from "@/components/shared/HugeIcon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRef, useEffect } from "react";

export default function ConfirmModal({
  open,
  title,
  message,
  description,
  confirmLabel,
  confirmText,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  onClose,
  onOpenChange,
  isLoading = false,
  disabled = false,
  variant,
  confirmVariant,
  selectedItems = [],
  note,
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
  isDeleteModal = false,
  isAppleStyled: isAppleStyledProp = true,
}) {
  const input0Ref = useRef(null);
  const input1Ref = useRef(null);
  const input2Ref = useRef(null);
  const input3Ref = useRef(null);
  const inputRefs = [input0Ref, input1Ref, input2Ref, input3Ref];

  // Focus first input when verification modal opens
  useEffect(() => {
    if (open && verificationTarget) {
      const timer = setTimeout(() => {
        input0Ref.current?.focus();
      }, 350); // Wait for fade-in animation
      return () => clearTimeout(timer);
    }
  }, [open, verificationTarget]);

  const displayConfirmLabel = confirmLabel || confirmText || "Confirm";
  const displayMessage = message || description;

  // Resolve effective variant with semantic priority
  let resolvedVariant = variant || (confirmVariant === "destructive" ? "danger" : confirmVariant === "default" ? "brand" : confirmVariant);

  if (isRestoreModal) {
    resolvedVariant = "success";
  } else if (isArchiveModal) {
    resolvedVariant = "warning";
  } else if (isDeleteModal || isDeleteBackup) {
    resolvedVariant = "danger";
  } else if (isUnsavedChangesModal) {
    resolvedVariant = "warning";
  } else if (!resolvedVariant) {
    const labelLower = displayConfirmLabel.toLowerCase();
    const titleLower = (title || "").toLowerCase();
    if (labelLower === "restore" || titleLower.includes("restore")) {
      resolvedVariant = "success";
    } else if (labelLower.includes("delete") || titleLower.includes("delete") || labelLower.includes("remove") || titleLower.includes("remove") || labelLower.includes("purge") || titleLower.includes("purge") || labelLower.includes("decline") || titleLower.includes("decline")) {
      resolvedVariant = "danger";
    } else {
      resolvedVariant = "brand";
    }
  }

  const normalizedVariant = resolvedVariant === "destructive" ? "danger" : (resolvedVariant || "danger");

  const handleCancel = () => {
    if (typeof onCancel === "function") {
      onCancel();
    }
    if (typeof onClose === "function") {
      onClose();
    }
    if (typeof onOpenChange === "function") {
      onOpenChange(false);
    }
  };

  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      handleCancel();
    } else {
      if (typeof onOpenChange === "function") {
        onOpenChange(true);
      }
    }
  };

  const isVerificationEnabled = !!verificationTarget;
  const isVerified = !isVerificationEnabled || verificationValue === verificationTarget;

  const handleAutoFill = () => {
    if (!verificationTarget) return;
    onVerificationChange?.(verificationTarget);
    if (typeof document !== "undefined" && document.activeElement?.blur) {
      document.activeElement.blur();
    }
  };

  const handlePaste = (e, index) => {
    e.preventDefault();
    const pastedText = e.clipboardData?.getData("text") || "";
    const digits = pastedText.replace(/\D/g, "");
    if (!digits) return;

    if (digits.length >= 4) {
      // Full 4-digit code (or longer) pasted: fill all 4 boxes
      const code = digits.slice(0, 4);
      onVerificationChange?.(code);
      if (typeof document !== "undefined" && document.activeElement?.blur) {
        document.activeElement.blur();
      }
    } else {
      // Partial code: fill sequentially starting from active box
      const currentArr = (verificationValue || "").padEnd(4, " ").split("");
      for (let i = 0; i < digits.length && index + i < 4; i++) {
        currentArr[index + i] = digits[i];
      }
      const code = currentArr.join("").trimEnd();
      onVerificationChange?.(code);
      const nextIdx = Math.min(index + digits.length, 3);
      inputRefs[nextIdx]?.current?.focus();
    }
  };

  const handleInputChange = (index, val) => {
    const digitsOnly = val.replace(/\D/g, "");
    if (!digitsOnly && val !== "") return;

    if (digitsOnly.length >= 4) {
      // Handle mobile or browser auto-fill multi-digit injection
      const code = digitsOnly.slice(0, 4);
      onVerificationChange?.(code);
      inputRefs[3]?.current?.focus();
      return;
    }

    const currentVal = verificationValue || "";
    let newVal = digitsOnly;
    if (digitsOnly.length === 2 && currentVal[index]) {
      if (digitsOnly.startsWith(currentVal[index])) {
        newVal = digitsOnly.slice(1);
      } else if (digitsOnly.endsWith(currentVal[index])) {
        newVal = digitsOnly.slice(0, -1);
      } else {
        newVal = digitsOnly.slice(-1);
      }
    } else {
      newVal = digitsOnly.slice(-1);
    }

    const valueArray = currentVal.split("");
    while (valueArray.length < 4) valueArray.push("");
    valueArray[index] = newVal;

    const finalString = valueArray.join("").slice(0, 4);
    onVerificationChange?.(finalString);

    if (newVal && index < 3) {
      inputRefs[index + 1]?.current?.focus();
    }
  };

  const handleKeyDownLocal = (index, e) => {
    if (e.key === "Backspace") {
      const currentVal = verificationValue || "";
      if (!currentVal[index] && index > 0) {
        e.preventDefault();
        const valueArray = currentVal.split("");
        while (valueArray.length < 4) valueArray.push("");
        valueArray[index - 1] = "";
        onVerificationChange?.(valueArray.join("").trimEnd());
        inputRefs[index - 1]?.current?.focus();
      } else if (currentVal[index]) {
        const valueArray = currentVal.split("");
        while (valueArray.length < 4) valueArray.push("");
        valueArray[index] = "";
        onVerificationChange?.(valueArray.join("").trimEnd());
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs[index - 1]?.current?.focus();
    } else if (e.key === "ArrowRight" && index < 3) {
      e.preventDefault();
      inputRefs[index + 1]?.current?.focus();
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

  const isAppleStyled = isAppleStyledProp || isDeleteBackup || isArchiveModal || isRestoreModal || isPersonnelModal || isRegistrationModal || isUnsavedChangesModal || isDeleteModal;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-lg p-0 overflow-hidden bg-white border border-border shadow-2xl rounded-2xl dark:bg-card dark:border-border gap-0"
        )}
      >
        <DialogHeader className={cn(
          "p-6 border-b border-border dark:border-border bg-gray-50 dark:bg-white/5 min-w-0",
          isAppleStyled && "bg-white dark:bg-card border-none pb-0",
          (!selectedItems.length && !isVerificationEnabled) && "pb-5 border-b-0"
        )}>
          <div className="flex items-start gap-4 w-full">
            <div className="min-w-0 flex-1">
              <DialogTitle className={cn(
                "text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50 truncate"
              )}>
                {title}
              </DialogTitle>
              <DialogDescription className={cn(
                "text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-1"
              )}>
                {displayMessage}
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
                    <HugeIcon  className="ph-bold ph-info text-amber-600 shrink-0" />
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
          <div className={cn("p-6 space-y-5 bg-white min-w-0 dark:bg-card", isAppleStyled && "px-6 pt-2 pb-4")}>
            {selectedItems.length > 0 && (
              <div>
                <p className={cn(
                  "text-[10px] font-semibold text-gray-400 tracking-widest mb-1.5 dark:text-zinc-500",
                  isAppleStyled && "text-[11px] font-medium uppercase tracking-[0.04em] text-gray-900 dark:text-zinc-300"
                )}>
                  Selected Items ({selectedItems.length})
                </p>
                <div className="relative w-full">
                  {isAppleStyled ? (
                    isPersonnelModal ? (
                      <div
                        className={cn(
                          "border-[0.5px] border-gray-250 dark:border-border rounded-[8px] p-0 bg-white dark:bg-card overflow-y-auto",
                          selectedItems.length > 5 ? "max-h-[220px]" : ""
                        )}
                      >
                        {selectedItems.map((item, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "text-[13px] font-normal px-[14px] py-[10px] truncate",
                              idx < selectedItems.length - 1 && "border-b-[0.5px] border-solid border-black/5",
                              normalizedVariant === "success" 
                                ? "text-emerald-700 dark:text-emerald-400 font-medium"
                                : normalizedVariant === "warning"
                                ? "text-amber-800 dark:text-amber-400 font-medium"
                                : "text-pup-maroon dark:text-red-400"
                            )}
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        className="border-[0.5px] border-gray-250 dark:border-border rounded-[8px] p-[10px_14px] bg-white dark:bg-card max-h-32 overflow-y-auto space-y-1.5"
                      >
                        {selectedItems.map((item, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              normalizedVariant === "success"
                                ? "text-[13px] font-medium text-emerald-700 dark:text-emerald-400 truncate"
                                : normalizedVariant === "warning"
                                ? "text-[13px] font-medium text-amber-800 dark:text-amber-400 truncate"
                                : normalizedVariant === "danger"
                                ? "text-[13px] font-normal text-pup-maroon dark:text-red-400 truncate"
                                : "text-[12px] font-normal text-gray-900 dark:text-zinc-300 truncate"
                            )}
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="max-h-32 overflow-y-auto rounded-lg border border-border bg-gray-50 p-2 space-y-1 custom-scrollbar pb-6 w-full dark:border-border dark:bg-white/5">
                      {selectedItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-2 py-1.5 rounded bg-white border border-border shadow-sm overflow-hidden w-full dark:bg-card dark:border-border"
                        >
                          <div className={cn(
                            "w-1.5 h-1.5 shrink-0 rounded-full",
                            normalizedVariant === "success" ? "bg-emerald-500" : normalizedVariant === "warning" ? "bg-amber-500" : "bg-red-500"
                          )} />
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
                <div className="bg-white dark:bg-card p-0 flex flex-col items-center gap-4">
                  <div className="text-center w-full flex flex-col items-center">
                    <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.06em] text-gray-500 dark:text-zinc-400 text-center">
                      Security Authorization Code
                    </label>
                    <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-xl border border-gray-200/80 bg-gray-50/80 dark:bg-zinc-800/60 dark:border-zinc-700/80 shadow-2xs">
                      <span className="font-mono text-[26px] font-bold tracking-[0.25em] text-pup-maroon dark:text-red-400 pl-1 select-all">
                        {verificationTarget}
                      </span>
                    </div>
                  </div>

                  <div className="w-full">
                    <div className="flex items-center justify-between mb-2.5 px-1">
                      <label className="text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-400">
                        Input Matching Digits
                      </label>
                      <div className="flex items-center gap-2.5">
                        {verificationValue && (
                          <button
                            type="button"
                            onClick={() => {
                              onVerificationChange?.("");
                              inputRefs[0]?.current?.focus();
                            }}
                            className="text-[11px] font-medium text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleAutoFill}
                          className="text-[11px] font-semibold text-pup-maroon dark:text-red-400 hover:underline cursor-pointer transition-colors"
                          title="Auto-fill the 4-digit code"
                        >
                          Auto-fill
                        </button>
                      </div>
                    </div>
                    <div
                      className="flex justify-center gap-2.5"
                      onPaste={(e) => handlePaste(e, 0)}
                    >
                      {[0, 1, 2, 3].map((i) => {
                        const hasDigit = Boolean(verificationValue && verificationValue[i]);
                        const isMatch = hasDigit && verificationTarget && verificationTarget[i] === verificationValue[i];
                        return (
                          <input
                            key={i}
                            ref={inputRefs[i]}
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            className={cn(
                              "h-[46px] w-[46px] rounded-xl border bg-white dark:bg-card text-center text-[19px] font-mono font-bold transition-all duration-150 caret-transparent shadow-2xs",
                              "focus:outline-none focus:ring-2 focus:ring-pup-maroon/20 focus:border-pup-maroon dark:focus:ring-red-500/20 dark:focus:border-red-500",
                              hasDigit
                                ? isMatch
                                  ? "border-emerald-500 text-gray-900 dark:text-zinc-50 bg-emerald-50/20 dark:bg-emerald-950/20"
                                  : "border-red-400 text-red-600 dark:text-red-400 bg-red-50/20"
                                : "border-border dark:border-border text-gray-900 dark:text-zinc-50 hover:border-gray-400 dark:hover:border-zinc-600"
                            )}
                            placeholder="•"
                            value={verificationValue[i] || ""}
                            onChange={(e) => handleInputChange(i, e.target.value)}
                            onKeyDown={(e) => handleKeyDownLocal(i, e)}
                            onPaste={(e) => handlePaste(e, i)}
                            onFocus={(e) => e.target.select()}
                            autoFocus={i === 0}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-[11px] font-normal text-gray-500 dark:text-zinc-400 text-center">
                    {isVerified
                      ? "Code verified. Click Delete to confirm."
                      : "Enter the 4-digit code above or click Auto-fill to authorize deletion."}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-red-100 bg-red-50/80 p-5 shadow-xs dark:bg-red-950/30 dark:border-border">
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-center w-full flex flex-col items-center">
                      <label className="mb-2 block text-[9px] font-semibold tracking-widest text-red-800/70 dark:text-red-500/70 uppercase">
                        Security Authorization Code
                      </label>
                      <div className="flex h-12 items-center justify-center rounded-xl border-2 border-dashed border-red-200 bg-white px-6 dark:bg-card dark:border-border shadow-inner">
                        <span className="font-mono text-[22px] font-bold tracking-[0.25em] text-red-700 dark:text-red-400 pl-1 select-all">
                          {verificationTarget}
                        </span>
                      </div>
                    </div>

                    <div className="w-full">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <label className="text-[9px] font-semibold tracking-widest text-red-800/70 dark:text-red-500/70 uppercase">
                          Input Matching Digits
                        </label>
                        <div className="flex items-center gap-2">
                          {verificationValue && (
                            <button
                              type="button"
                              onClick={() => {
                                onVerificationChange?.("");
                                inputRefs[0]?.current?.focus();
                              }}
                              className="text-[10px] font-semibold text-red-700/60 hover:text-red-800 dark:text-red-400/60 dark:hover:text-red-400 cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleAutoFill}
                            className="text-[10px] font-semibold text-red-700 dark:text-red-400 hover:underline cursor-pointer"
                          >
                            Auto-fill
                          </button>
                        </div>
                      </div>
                      <div
                        className="flex justify-center gap-2.5"
                        onPaste={(e) => handlePaste(e, 0)}
                      >
                        {[0, 1, 2, 3].map((i) => {
                          const hasDigit = Boolean(verificationValue && verificationValue[i]);
                          const isMatch = hasDigit && verificationTarget && verificationTarget[i] === verificationValue[i];
                          return (
                            <input
                              key={i}
                              ref={inputRefs[i]}
                              type="text"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              className={cn(
                                "h-14 w-12 rounded-xl border-2 bg-white text-center text-xl font-mono font-bold text-gray-900 shadow-sm transition-all focus:scale-105 focus:border-red-500 focus:ring-4 focus:ring-red-100 focus:outline-none caret-transparent dark:bg-card dark:text-zinc-50 dark:focus:ring-red-900/20",
                                hasDigit
                                  ? isMatch
                                    ? "border-emerald-500 bg-emerald-50/20 text-gray-900 dark:text-zinc-50"
                                    : "border-red-500 text-red-600 dark:text-red-400 bg-red-50/20"
                                  : "border-red-200 dark:border-border hover:border-red-300"
                              )}
                              placeholder="•"
                              value={verificationValue[i] || ""}
                              onChange={(e) => handleInputChange(i, e.target.value)}
                              onKeyDown={(e) => handleKeyDownLocal(i, e)}
                              onPaste={(e) => handlePaste(e, i)}
                              onFocus={(e) => e.target.select()}
                              autoFocus={i === 0}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-[10px] font-semibold text-red-700/70 text-center dark:text-red-500/70">
                    {isVerified
                      ? "Code verified. You may proceed with deletion."
                      : "Enter the 4-digit code above or click Auto-fill to enable deletion."}
                  </p>
                </div>
              )
            )}
          </div>
        )}

        <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="h-10 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading || disabled || !isVerified}
            className={cn(
              "h-10 px-5 text-xs font-semibold rounded-xl! shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-30 disabled:grayscale-[0.5] disabled:cursor-not-allowed",
              normalizedVariant === "success" && "btn-brand-green text-white",
              (normalizedVariant === "warning" && !isUnsavedChangesModal) && "bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white border-0",
              normalizedVariant === "brand" && "btn-brand-red",
              normalizedVariant === "danger" && "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border-0",
              isUnsavedChangesModal && "bg-[#FF6410] hover:bg-[#e55300] active:bg-[#cc4a00] text-white border-0",
              isRegistrationModal && "w-[120px]",
              confirmClassName
            )}
          >
            {isLoading ? "Processing..." : displayConfirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
