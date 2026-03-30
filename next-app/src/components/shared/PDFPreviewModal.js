"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function PDFPreviewModal({
  open,
  onClose,
  preview,
}) {
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 flex flex-col overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
        <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full border border-blue-100 bg-blue-50 text-blue-700 shadow-sm flex items-center justify-center shrink-0">
              <i className="ph-duotone ph-info text-2xl"></i>
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-black tracking-tight text-gray-900 text-left">
                Preview Document: {preview.docType}
              </DialogTitle>
              <p className="text-sm font-medium mt-1 text-gray-600 text-left">
                Reviewing {preview.docType} for {preview.studentName}. Ensure the content is legible and correct.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 bg-gray-100 p-0 flex flex-col overflow-hidden relative">
          <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between gap-3">
            <div className="text-xs font-bold text-gray-600 uppercase tracking-widest">
              REF: <span className="font-mono">{preview.refId}</span>
            </div>
            {preview.docId ? (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="font-bold text-xs text-gray-700 border-gray-300 hover:text-pup-maroon hover:bg-red-50 shadow-sm h-11 px-5 rounded-brand"
              >
                <a
                  href={`/api/documents/${preview.docId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <i className="ph-bold ph-arrow-square-out mr-1.5 text-sm"></i> Open in New Tab
                </a>
              </Button>
            ) : null}
          </div>

          {preview.docId ? (
            <iframe
              title="PDF Preview"
              src={`/api/documents/${preview.docId}`}
              className="w-full flex-1 bg-gray-200"
            />
          ) : (
            <div className="flex-1 p-6 flex items-center justify-center">
              <div className="max-w-lg text-center text-sm text-gray-600 font-medium">
                No PDF is linked to this preview.
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
