"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  multiline = false,
}) {
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white rounded-brand border-gray-200 shadow-xl">
        <DialogHeader className="p-5 border-b border-gray-200 bg-gray-50/60 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="font-bold text-pup-maroon">{title}</DialogTitle>
        </DialogHeader>
        <div className="p-5">
          {message ? <p className="text-sm text-gray-600 mb-3">{message}</p> : null}
          {multiline ? (
            <textarea
              className="form-input min-h-[96px]"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              autoFocus
            />
          ) : (
            <input
              type="text"
              className="form-input"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              autoFocus
            />
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 h-11 rounded-brand bg-white border border-gray-300 text-gray-700 font-bold text-sm hover:border-pup-maroon"
              disabled={isLoading}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 h-11 rounded-brand bg-pup-maroon text-white font-bold text-sm hover:bg-red-900 disabled:opacity-60"
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : confirmLabel}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
