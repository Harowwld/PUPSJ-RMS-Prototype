"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white sm:rounded-sm rounded-sm border-gray-200 shadow-2xl">
        <DialogHeader className="p-5 border-b border-gray-200 bg-gray-50/60 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="font-bold text-pup-maroon">Add Document Type</DialogTitle>
        </DialogHeader>

        <div className="p-5">
          <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
            Document Type
          </label>
          <Input
            type="text"
            className="bg-white shadow-sm h-10"
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

          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 px-5 text-sm border-gray-300 text-gray-700 hover:bg-gray-50 font-bold"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onSave}
              className="h-10 px-5 bg-pup-maroon text-white hover:bg-red-900 font-bold shadow-sm"
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
