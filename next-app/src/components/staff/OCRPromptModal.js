"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function OCRPromptModal({
  open,
  onClose,
  ocrSuggestion,
  onApplyToExisting,
  onApplyToNew,
}) {
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md p-6 bg-white sm:rounded-sm rounded-sm border-gray-300 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-pup-maroon">Detected from PDF</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-gray-700 font-medium">
            Review the detected info and choose where to apply it.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <div className="text-gray-600 font-bold">Student No</div>
            <div className="text-gray-900 font-mono font-bold text-right break-all">
              {ocrSuggestion?.studentNo || "(not detected)"}
            </div>
          </div>
          <div className="flex justify-between gap-4">
            <div className="text-gray-600 font-bold">Name</div>
            <div className="text-gray-900 font-bold text-right wrap-break-word">
              {ocrSuggestion?.name || "(not detected)"}
            </div>
          </div>
          <div className="flex justify-between gap-4">
            <div className="text-gray-600 font-bold">Document Type</div>
            <div className="text-gray-900 font-bold text-right wrap-break-word">
              {ocrSuggestion?.docType || "(not detected)"}
            </div>
          </div>
          <div className="pt-2 border-t border-gray-200">
            {ocrSuggestion?.matchedStudent ? (
              <div className="text-xs font-bold text-green-700">
                Student found in database: {ocrSuggestion.matchedStudent.name}
              </div>
            ) : (
              <div className="text-xs font-bold text-gray-600">
                No exact student match found (by Student No).
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <Button
            type="button"
            onClick={onApplyToExisting}
            disabled={!ocrSuggestion?.matchedStudent}
            className="w-full h-11 bg-pup-maroon text-white hover:bg-red-900 font-bold shadow-sm"
          >
            Apply to Existing Student
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onApplyToNew}
            className="w-full h-11 border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-pup-maroon font-bold"
          >
            Use as New Student Prefill
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="w-full h-11 text-gray-500 hover:bg-gray-100 hover:text-gray-900 font-bold"
          >
            Dismiss
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
