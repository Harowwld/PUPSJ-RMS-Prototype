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
}) {
  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="overflow-hidden rounded-brand border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-md">
        <DialogHeader className="border-b border-gray-100 bg-gray-50/50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm">
              <i className="ph-duotone ph-warning-circle text-2xl"></i>
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg leading-tight font-black tracking-tight text-gray-900">
                {title}
              </DialogTitle>
              {message ? (
                <DialogDescription className="mt-1.5 text-sm leading-relaxed font-medium text-gray-600">
                  {message}
                </DialogDescription>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 p-6">
          {itemsList && itemsList.length > 0 && (
            <div className="max-h-[120px] overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-3 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
              <ul className="space-y-1.5">
                {itemsList.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-[10px] font-bold text-gray-700">
                    <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-pup-maroon/40" />
                    <span className="truncate">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-1.5">
            {inputLabel && (
              <p className="px-1 text-[10px] font-black tracking-widest text-gray-400 uppercase">
                {inputLabel}
              </p>
            )}
            {multiline ? (
              <textarea
                className="flex h-24 min-h-[96px] w-full rounded-brand border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm transition-all placeholder:text-gray-400 focus:border-pup-maroon focus:ring-2 focus:ring-pup-maroon focus:outline-none"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoFocus
              />
            ) : (
              <Input
                type="text"
                className="h-11 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-pup-maroon focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoFocus
              />
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2.5 border-t border-gray-100 bg-white p-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-11 rounded-brand border-gray-300 px-6 text-sm font-bold text-gray-700 hover:bg-gray-50"
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="flex h-11 items-center gap-2 rounded-brand bg-pup-maroon px-6 text-sm font-bold text-white shadow-sm hover:bg-red-900 disabled:opacity-50"
            disabled={isLoading || confirmDisabled}
          >
            <i className="ph-bold ph-check-circle text-lg"></i>
            {isLoading ? "Processing..." : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
