"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="overflow-hidden rounded-brand border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-lg dark:border-white/10 dark:bg-card">
        <DialogHeader className="border-b border-gray-100 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/5 min-w-0">
          <div className="flex items-start gap-4 w-full">
            <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border shadow-sm", v.headerIconWrap)}>
              <i className={cn(v.headerIcon, "text-2xl")}></i>
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-black tracking-tight text-gray-900 leading-tight dark:text-zinc-50 truncate">
                {title}
              </DialogTitle>
              {message ? (
                <DialogDescription className="mt-1.5 text-sm font-medium leading-relaxed text-gray-600 dark:text-zinc-300">
                  {message}
                </DialogDescription>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 p-6 min-w-0 bg-white dark:bg-card">
          {itemsList && itemsList.length > 0 && (
            <div className="relative w-full">
              <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-1.5 dark:text-zinc-500">
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
                      <p className="truncate text-[11px] font-bold text-gray-700 dark:text-zinc-200">
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
              <label className="block text-[11px] font-bold text-gray-700 tracking-wide dark:text-zinc-400 mb-1.5">
                {inputLabel}
              </label>
            )}
            {multiline ? (
              <textarea
                className="flex min-h-[100px] w-full rounded-brand border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm transition-all placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon dark:border-white/10 dark:bg-card dark:text-zinc-300 dark:focus:border-zinc-700"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoFocus
              />
            ) : (
              <Input
                type="text"
                className="h-11 rounded-brand border border-gray-300 bg-white px-4 text-sm shadow-sm transition-all placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon dark:border-white/10 dark:bg-card dark:text-zinc-300"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoFocus
              />
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2.5 border-t border-gray-100 bg-white p-4 sm:flex-row sm:justify-end dark:border-white/10 dark:bg-card">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="h-11 rounded-brand px-6 text-sm font-bold text-gray-500 hover:bg-transparent hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors"
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
              "h-11 px-6 text-sm font-black shadow-sm rounded-brand gap-2 flex items-center transition-all active:scale-95 disabled:opacity-30 disabled:grayscale-[0.5] disabled:cursor-not-allowed",
              variant === "success" && "bg-green-600 hover:bg-green-700 text-white",
              variant === "warning" && (v.confirmStyle || "bg-amber-600 hover:bg-amber-700 text-white"),
              (variant === "brand") && "btn-brand-red hover:from-red-700 hover:to-red-900",
              v.confirmVariant === "destructive" && "btn-brand-red",
              (v.confirmVariant === "default" && !["success", "warning", "brand"].includes(variant)) && "bg-gray-900 hover:bg-gray-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-50 dark:border-white/10"
            )}
          >
            <i className={cn(customButtonIcon || v.buttonIcon, "text-lg")}></i>
            {isLoading ? "Processing..." : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

