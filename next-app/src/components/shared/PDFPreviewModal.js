"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PDFPreviewModal({
  open,
  onClose,
  preview,
}) {
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 flex flex-col overflow-hidden rounded-brand border-none shadow-2xl">
        <DialogHeader className="p-4 border-b border-gray-200 bg-gray-50 flex flex-row items-center space-y-0">
          <div className="flex items-center gap-3">
            <div className="bg-red-50 p-2 rounded-brand border border-red-100">
              <i className="ph-fill ph-file-pdf text-2xl text-pup-maroon"></i>
            </div>
            <div>
              <DialogTitle className="font-bold text-pup-maroon text-lg leading-tight text-left">
                {preview.docType}
              </DialogTitle>
              <p className="text-sm text-gray-700 font-medium text-left">
                {preview.studentName}
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
              <a
                className="px-3 py-2 rounded-brand bg-white border border-gray-300 text-gray-700 font-bold text-xs hover:border-pup-maroon"
                href={`/api/documents/${preview.docId}`}
                target="_blank"
                rel="noreferrer"
              >
                Open in New Tab
              </a>
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
