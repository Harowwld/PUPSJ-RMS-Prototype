"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useState } from "react";

function PDFFrame({ docId }) {
  const [frameReady, setFrameReady] = useState(false);

  return (
    <div className="relative flex-1 min-h-0 min-w-0">
      {!frameReady ? (
        <div className="absolute inset-0 p-6 bg-white">
          <div className="space-y-4">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-80" />
            <Skeleton className="h-[55vh] w-full" />
          </div>
        </div>
      ) : null}
      <iframe
        title="PDF Preview"
        src={`/api/documents/${docId}#zoom=100`}
        className="absolute inset-0 w-full h-full bg-gray-200"
        style={{ border: "none" }}
        onLoad={() => setFrameReady(true)}
      />
    </div>
  );
}

export default function PDFPreviewModal({ open, onClose, preview }) {
  if (!open) return null;

  const docId = preview?.docId;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="w-[96vw] max-w-[96vw] xl:max-w-[1400px] h-[90vh] p-0 flex flex-col overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
        <DialogHeader className="bg-gray-50/50 border-b border-gray-100 p-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-pup-maroon shadow-sm shrink-0">
              <i className="ph-duotone ph-file-pdf text-2xl"></i>
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-black text-gray-900 tracking-tight leading-none text-left">
                Document Preview: {preview.docType}
              </DialogTitle>
              <p className="text-sm font-medium text-gray-500 mt-1.5 text-left">
                Reviewing digitized record for {preview.studentName}. Ensure all identifiers and data are clearly legible.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 bg-gray-100 p-0 flex flex-col overflow-hidden relative">
          {docId ? (
            <PDFFrame key={docId} docId={docId} />
          ) : (
            <div className="flex-1 p-6 flex items-center justify-center bg-white">
              <div className="max-w-lg text-center">
                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4 border border-gray-200">
                   <i className="ph-bold ph-file-x text-3xl text-gray-300"></i>
                </div>
                <p className="text-sm text-gray-600 font-bold">No digital file attached</p>
                <p className="text-xs text-gray-400 mt-1">This record is metadata-only or the file was removed.</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-11 px-6 text-sm font-bold text-gray-600 border-gray-300 hover:bg-gray-50 uppercase tracking-wide"
          >
            Close Preview
          </Button>
          {docId ? (
            <a
              href={`/api/documents/${docId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-brand border border-pup-maroon bg-white h-11 px-6 text-sm font-bold text-pup-maroon shadow-sm hover:bg-red-50 transition-colors uppercase tracking-wide"
            >
              <i className="ph-bold ph-arrow-square-out mr-2 text-lg"></i>
              Open Full View
            </a>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
