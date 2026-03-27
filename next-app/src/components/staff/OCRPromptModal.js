"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
      <DialogContent className="sm:max-w-lg p-6 bg-white rounded-brand border-gray-300 shadow-lg">
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

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onApplyToExisting}
            disabled={!ocrSuggestion?.matchedStudent}
            className={`w-full h-11 rounded-brand font-bold text-sm border ${
              ocrSuggestion?.matchedStudent
                ? "bg-pup-maroon text-white hover:bg-red-900"
                : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
            }`}
          >
            Apply to Existing Student
          </button>
          <button
            type="button"
            onClick={onApplyToNew}
            className="w-full h-11 rounded-brand font-bold text-sm bg-white border border-gray-300 text-gray-700 hover:border-pup-maroon"
          >
            Use as New Student Prefill
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-brand font-bold text-sm bg-white text-gray-600 hover:text-gray-900"
          >
            Dismiss
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
