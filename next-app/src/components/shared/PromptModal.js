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
}) {
  const variantClasses = {
    danger: {
      headerIcon: "ph-duotone ph-warning-circle",
      headerIconWrap: "bg-red-50 border-red-100 text-red-600",
      buttonIcon: "ph-bold ph-trash",
      listDot: "bg-red-500",
    },
    warning: {
      headerIcon: "ph-duotone ph-warning",
      headerIconWrap: "bg-amber-50 border-amber-100 text-amber-600",
      buttonIcon: "ph-bold ph-warning",
      listDot: "bg-amber-500",
    },
    default: {
      headerIcon: "ph-duotone ph-info",
      headerIconWrap: "bg-blue-50 border-blue-100 text-blue-600",
      buttonIcon: "ph-bold ph-check-circle",
      listDot: "bg-blue-500",
    },
  }

  const v = variantClasses[variant] || variantClasses.default

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="overflow-hidden rounded-brand border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-md">
        <DialogHeader className="border-b border-gray-100 bg-gray-50/50 p-4">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm", v.headerIconWrap)}>
              <i className={cn(v.headerIcon, "text-xl")}></i>
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base leading-tight font-black tracking-tight text-gray-900">
                {title}
              </DialogTitle>
              {message ? (
                <DialogDescription className="mt-0.5 text-[11px] leading-snug font-medium text-gray-500">
                  {message}
                </DialogDescription>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 p-4">
          {itemsList && itemsList.length > 0 && (
            <div className="relative w-full">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                Impacted Items ({itemsList.length})
              </p>
              <div className="max-h-[100px] overflow-y-auto rounded-lg border border-gray-200 bg-gray-50/50 p-1.5 space-y-1 custom-scrollbar">
                {itemsList.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-2 px-2 py-1 rounded bg-white border border-gray-100 shadow-xs overflow-hidden w-full"
                  >
                    <div className={cn("h-1 w-1 shrink-0 rounded-full", v.listDot)} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[10px] font-bold text-gray-700">
                        {item}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1">
            {inputLabel && (
              <p className="px-1 text-[9px] font-black tracking-widest text-gray-400 uppercase">
                {inputLabel}
              </p>
            )}
            {multiline ? (
              <textarea
                className="flex h-20 min-h-[80px] w-full rounded-brand border border-gray-300 bg-white px-3 py-2 text-xs shadow-sm transition-all placeholder:text-gray-400 focus:border-gray-300 focus:ring-2 focus:ring-pup-maroon focus:outline-none"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoFocus
              />
            ) : (
              <Input
                type="text"
                className="h-10 rounded-brand border border-gray-300 bg-white text-xs focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none shadow-sm"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoFocus
              />
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-white p-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-10 rounded-brand border-gray-300 px-5 text-[11px] font-bold text-gray-600 uppercase hover:border-gray-300 hover:bg-red-50/30 hover:text-pup-maroon shadow-sm transition-colors"
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className={cn(
              "flex h-10 items-center gap-2 rounded-brand px-5 text-[11px] font-black text-white shadow-md transition-all active:scale-95 disabled:opacity-50",
              "bg-linear-to-b from-red-800 to-pup-maroon border-4 border-pup-darkMaroon hover:from-red-700 hover:to-red-900 shadow-lg shadow-red-900/20"
            )}
            disabled={isLoading || confirmDisabled}
          >
            <i className={cn(v.buttonIcon, "text-base")}></i>
            {isLoading ? "Processing..." : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
