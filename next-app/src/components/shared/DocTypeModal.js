"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white rounded-brand border-gray-200 shadow-2xl">
        <DialogHeader className="p-5 border-b border-gray-200 bg-gray-50/60 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="font-bold text-pup-maroon">Add Document Type</DialogTitle>
        </DialogHeader>

        <div className="p-5">
          <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
            Document Type
          </label>
          <input
            type="text"
            className="form-input"
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

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-11 rounded-brand bg-white border border-gray-300 text-gray-700 font-bold text-sm hover:border-pup-maroon"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              className={`px-4 h-11 rounded-brand bg-pup-maroon text-white font-bold text-sm hover:bg-red-900 ${
                isLoading ? "opacity-75 cursor-not-allowed" : ""
              }`}
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
