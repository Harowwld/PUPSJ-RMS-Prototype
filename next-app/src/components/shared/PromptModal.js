"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export default function PromptModal({
  open,
  title,
  message,
  value,
  onChange,
  onConfirm,
  onCancel,
  onOpenChange,
  onClose,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  placeholder = "",
  isLoading = false,
  confirmDisabled = false,
  multiline = false,
  itemsList = [], // Array of strings to display as a list
  inputLabel = "", // Text to display above the input
  variant = "default", // 'default' | 'danger' | 'warning'
  buttonIcon: customButtonIcon,
  isDeclineModal = false,
}) {
  const variantClasses = {
    danger: {
      headerIcon: "ph-duotone ph-warning-circle",
      headerIconWrap: "bg-red-50 dark:bg-red-950/30 border-red-100 text-red-600 shadow-sm dark:border-white/10",
      buttonIcon: "ph-bold ph-trash",
      listDot: "bg-red-500",
      confirmVariant: "destructive",
    },
    brand: {
      headerIcon: "ph-duotone ph-user-gear",
      headerIconWrap: "bg-red-50 dark:bg-red-950/30 border-red-100 text-pup-maroon shadow-sm dark:border-white/10",
      buttonIcon: "ph-bold ph-check",
      listDot: "bg-pup-maroon",
      confirmVariant: "default",
    },
    warning: {
      headerIcon: "ph-duotone ph-warning",
      headerIconWrap: "bg-amber-50 dark:bg-amber-950/30 border-amber-100 text-amber-600 shadow-sm dark:border-white/10",
      buttonIcon: "ph-bold ph-warning",
      listDot: "bg-amber-500",
      confirmVariant: "default",
      confirmStyle: "bg-orange-600 hover:bg-orange-700 border-0! border-none! shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-1px_0_rgba(0,0,0,0.4),0_1px_3px_rgba(0,0,0,0.2),0_1px_2px_-1px_rgba(0,0,0,0.1)]! text-white",
    },
    success: {
      headerIcon: "ph-duotone ph-arrow-counter-clockwise",
      headerIconWrap: "bg-green-50 border-green-100 text-green-600 shadow-sm dark:bg-emerald-950/30 dark:border-white/10",
      buttonIcon: "ph-bold ph-check",
      listDot: "bg-emerald-500",
      confirmVariant: "default",
    },
    default: {
      headerIcon: "ph-duotone ph-info",
      headerIconWrap: "bg-blue-50 dark:bg-blue-950/30 border-blue-100 text-blue-600 shadow-sm dark:border-white/10",
      buttonIcon: "ph-bold ph-check-circle",
      listDot: "bg-blue-500",
      confirmVariant: "default",
    },
  }

  const v = variantClasses[variant] || variantClasses.default

  const handleCancel = () => {
    if (typeof onCancel === "function") onCancel();
    if (typeof onClose === "function") onClose();
    if (typeof onOpenChange === "function") onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-lg dark:border-white/10 dark:bg-card gap-0">
        <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none min-w-0">
          <div className="flex items-start gap-4 w-full">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50 truncate">
                {title}
              </DialogTitle>
              {message ? (
                <DialogDescription className="mt-1 text-[13px] font-normal text-gray-500 dark:text-zinc-400">
                  {message}
                </DialogDescription>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        <div className={cn("space-y-5 p-6 min-w-0 bg-white dark:bg-card", isDeclineModal && "pb-4")}>
          {itemsList && itemsList.length > 0 && (
            <div className="relative w-full">
              <p className="text-[10px] font-semibold text-gray-400 tracking-widest mb-1.5 dark:text-zinc-500">
                Impacted Items ({itemsList.length})
              </p>
              <div className="max-h-[120px] overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2 space-y-1 custom-scrollbar w-full dark:border-white/10 dark:bg-white/5">
                {itemsList.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-2 px-2 py-1.5 rounded bg-white border border-gray-100 shadow-sm overflow-hidden w-full dark:bg-card dark:border-white/10"
                  >
                    <div className={cn("h-1.5 w-1.5 shrink-0 rounded-full", v.listDot)} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[11px] font-semibold text-gray-700 dark:text-zinc-200">
                        {item}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {inputLabel && (
              <label className={cn(
                "block text-[11px] font-semibold text-gray-700 tracking-wide dark:text-zinc-400 mb-1.5",
                isDeclineModal && "mb-1 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-400"
              )}>
                {inputLabel}
              </label>
            )}
            {multiline ? (
              <textarea
                className={cn(
                  "flex min-h-[100px] w-full rounded-brand border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm transition-all placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon dark:border-white/10 dark:bg-card dark:text-zinc-300 dark:focus:border-zinc-700",
                  isDeclineModal && "rounded-[8px] border-[0.5px] border-gray-300 text-[13px] font-normal tracking-[-0.01em] focus:border-gray-500 focus:ring-0"
                )}
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoFocus
              />
            ) : (
              <Input
                type="text"
                className={cn(
                  "h-11 rounded-brand border border-gray-300 bg-white px-4 text-sm shadow-sm transition-all placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon dark:border-white/10 dark:bg-card dark:text-zinc-300",
                  isDeclineModal && "h-[36px] rounded-[8px] border-[0.5px] border-gray-300 text-[13px] font-normal tracking-[-0.01em] focus-visible:border-gray-500 focus-visible:ring-0 focus:border-gray-500 focus:ring-0 focus-visible:ring-offset-0 focus:outline-none"
                )}
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoFocus
              />
            )}
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="h-10 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={v.confirmVariant}
            onClick={onConfirm}
            disabled={isLoading || confirmDisabled}
            className={cn(
              "flex h-10 items-center justify-center rounded-xl! text-xs font-semibold shadow-none! border-none! py-0 px-5 cursor-pointer active:scale-95 disabled:opacity-30 disabled:grayscale-[0.5] disabled:cursor-not-allowed",
              variant === "success" && "btn-brand-green text-white",
              variant === "warning" && (v.confirmStyle || "bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white"),
              (variant === "danger" || isDeclineModal) && "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white",
              (variant === "brand" || (!variant || variant === "default")) && "btn-brand-red"
            )}
          >
            {isLoading ? "Processing..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
