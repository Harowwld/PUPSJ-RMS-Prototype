"use client"
import { Textarea } from "@/components/ui/textarea";

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
  isDeclineModal = false,
}) {
  const variantClasses = {
    danger: {
      headerIcon: " Alert01Icon",
      headerIconWrap: "bg-red-50 dark:bg-red-950/30 border-red-100 text-red-600 shadow-sm dark:border-border",
      buttonIcon: " Delete01Icon",
      listDot: "bg-red-500",
      confirmVariant: "danger",
    },
    brand: {
      headerIcon: " UserSettings01Icon",
      headerIconWrap: "bg-red-50 dark:bg-red-950/30 border-red-100 text-pup-maroon shadow-sm dark:border-border",
      buttonIcon: " Tick01Icon",
      listDot: "bg-pup-maroon",
      confirmVariant: "default",
    },
    warning: {
      headerIcon: " Alert02Icon",
      headerIconWrap: "bg-amber-50 dark:bg-amber-950/30 border-amber-100 text-amber-600 shadow-sm dark:border-border",
      buttonIcon: " Alert02Icon",
      listDot: "bg-amber-500",
      confirmVariant: "warning",
    },
    success: {
      headerIcon: " ReloadIcon",
      headerIconWrap: "bg-green-50 border-green-100 text-green-600 shadow-sm dark:bg-emerald-950/30 dark:border-border",
      buttonIcon: " Tick01Icon",
      listDot: "bg-emerald-500",
      confirmVariant: "success",
    },
    default: {
      headerIcon: " CovidInfoIcon",
      headerIconWrap: "bg-blue-50 dark:bg-blue-950/30 border-blue-100 text-blue-600 shadow-sm dark:border-border",
      buttonIcon: " CheckmarkCircle01Icon",
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
      <DialogContent className="overflow-hidden rounded-[22px] border border-black/[0.08] dark:border-white/10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl shadow-[0_24px_54px_rgba(0,0,0,0.18),inset_0_1px_0_0_rgba(255,255,255,0.85)] dark:shadow-[0_28px_64px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.12)] p-0 sm:max-w-lg gap-0">
        <DialogHeader className="px-5 pt-5 pb-0 min-w-0">
          <div className="flex items-start gap-4 w-full">
            <div className="min-w-0 flex-1">
              <DialogTitle>
                {title}
              </DialogTitle>
              {message ? (
                <DialogDescription className="mt-1.5">
                  {message}
                </DialogDescription>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        <div className={cn("space-y-4 px-5 py-3.5 min-w-0", isDeclineModal && "pb-3")}>
          {itemsList && itemsList.length > 0 && (
            <div className="relative w-full">
              <p className="text-[10px] font-semibold text-gray-400 tracking-widest mb-1.5 dark:text-zinc-500">
                Impacted Items ({itemsList.length})
              </p>
              <div className="max-h-[120px] overflow-y-auto rounded-lg border border-border bg-gray-50 p-2 space-y-1 custom-scrollbar w-full dark:border-border dark:bg-white/5">
                {itemsList.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-2 px-2 py-1.5 rounded bg-white border border-border shadow-sm overflow-hidden w-full dark:bg-card dark:border-border"
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
                isDeclineModal && "mb-1 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-900 dark:text-zinc-300"
              )}>
                {inputLabel}
              </label>
            )}
            {multiline ? (
              <Textarea
                className="min-h-[100px]"
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoFocus
              />
            ) : (
              <Input
                type="text"
                className={cn(
                  "h-11 rounded-brand border border-border bg-white px-4 text-sm shadow-sm transition-all placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon dark:border-border dark:bg-card dark:text-zinc-300",
                  isDeclineModal && "h-[36px] rounded-[8px] border-[0.5px] border-border text-[13px] font-normal tracking-[-0.01em] focus-visible:border-gray-500 focus-visible:ring-0 focus:border-gray-500 focus:ring-0 focus-visible:ring-offset-0 focus:outline-none"
                )}
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoFocus
              />
            )}
          </div>
        </div>

        <DialogFooter className="px-5 pb-5 pt-1.5 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="h-9 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={isDeclineModal ? "danger" : v.confirmVariant}
            onClick={onConfirm}
            disabled={isLoading || confirmDisabled}
            className="h-9 px-4"
          >
            {isLoading ? "Processing..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
