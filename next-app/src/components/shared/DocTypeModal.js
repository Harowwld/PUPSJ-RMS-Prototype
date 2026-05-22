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
      <DialogContent className="overflow-hidden rounded-brand border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-md">
        <DialogHeader className="border-b border-gray-100 bg-gray-50/50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm">
              <i className="ph-duotone ph-pencil-line text-2xl"></i>
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-black tracking-tight text-gray-900">
                Create Document Type
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm font-medium text-gray-600">
                Create a new document type to categorize uploaded records.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6">
          <label className="mb-1 block text-xs font-bold text-gray-700 uppercase">
            Document Type
          </label>
          <Input
            type="text"
            className="h-11 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none"
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
            <div className="mt-3 rounded-brand border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-white p-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-11 rounded-brand border-gray-300 px-5 text-sm font-bold text-gray-700 hover:bg-gray-50"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSave}
            className="h-11 rounded-brand bg-linear-to-b from-red-800 to-pup-maroon border-[3px] border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md transition-all px-5 font-bold text-white shadow-sm"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
