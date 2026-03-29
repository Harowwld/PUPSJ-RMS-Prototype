"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white sm:rounded-sm rounded-sm border-gray-200 shadow-xl">
        <DialogHeader className="p-5 border-b border-gray-200 bg-gray-50/60 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="font-bold text-pup-maroon">{title}</DialogTitle>
        </DialogHeader>
        <div className="p-5">
          {message ? <p className="text-sm text-gray-600 mb-3">{message}</p> : null}
          {multiline ? (
            <textarea
              className="flex w-full rounded-brand border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon/50 disabled:cursor-not-allowed disabled:opacity-50 min-h-[96px]"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              autoFocus
            />
          ) : (
            <Input
              type="text"
              className="bg-white shadow-sm h-10"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              autoFocus
            />
          )}
          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="h-10 px-5 text-sm border-gray-300 text-gray-700 hover:bg-gray-50 font-bold"
              disabled={isLoading}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              className="h-10 px-5 bg-pup-maroon text-white hover:bg-red-900 font-bold shadow-sm"
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
