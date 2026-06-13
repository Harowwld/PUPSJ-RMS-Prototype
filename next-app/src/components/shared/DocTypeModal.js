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

export default function DocTypeModal({
  open,
  onClose,
  value,
  setValue,
  error,
  setError,
  onSave,
  isLoading,
}) {
  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="overflow-hidden rounded-brand border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-md dark:border-white/10 dark:bg-card">
        <DialogHeader className="border-b border-gray-100 bg-transparent p-6 dark:border-white/10 dark:bg-transparent">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-pup-maroon dark:text-primary shadow-sm dark:bg-red-950/30">
              <i className="ph-duotone ph-pencil-line text-2xl"></i>
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-black tracking-tight text-gray-900 dark:text-zinc-50">
                Create Document Type
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm font-medium text-gray-600 dark:text-zinc-300">
                Create a new document type to categorize uploaded records.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6">
          <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-zinc-200">
            Document Type
          </label>
          <Input
            type="text"
            className="h-11 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none dark:border-white/10 dark:bg-card"
            placeholder="Enter new document type..."
            value={value}
            onChange={(e) => {
              setError("")
              setValue(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                onSave()
              }
            }}
            autoFocus
          />

          {error ? (
            <div className="mt-3 rounded-brand border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800 dark:bg-red-950/30">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-white p-4 sm:flex-row sm:justify-end dark:border-white/10 dark:bg-card">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-11 rounded-brand border-gray-300 px-5 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/10 dark:bg-card"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSave}
            className="btn-brand-red px-5 shadow-sm dark:shadow-none"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

