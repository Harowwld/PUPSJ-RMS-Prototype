"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
        <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm flex items-center justify-center shrink-0">
              <i className="ph-duotone ph-pencil-line text-2xl"></i>
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-black tracking-tight text-gray-900">
                Create Document Type
              </DialogTitle>
              <DialogDescription className="text-sm font-medium mt-1 text-gray-600">
                Create a new document type to categorize uploaded records.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6">
          <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
            Document Type
          </label>
          <Input
            type="text"
            className="bg-white shadow-sm h-11 rounded-brand"
            placeholder="Enter new document type..."
            value={value}
            onChange={(e) => {
              setError("");
              setValue(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSave();
              }
            }}
            autoFocus
          />

          {error ? (
            <div className="mt-3 p-3 rounded-brand border border-red-200 bg-red-50 text-red-800 text-sm font-bold">
              {error}
            </div>
          ) : null}
        </div>

        <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-11 px-5 text-sm border-gray-300 text-gray-700 hover:bg-gray-50 font-bold rounded-brand"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSave}
            className="h-11 px-5 bg-pup-maroon text-white hover:bg-red-900 font-bold shadow-sm rounded-brand"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
