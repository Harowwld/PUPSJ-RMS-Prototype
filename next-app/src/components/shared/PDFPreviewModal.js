"use client";

export default function PDFPreviewModal({
  open,
  onClose,
  preview,
}) {
  if (!open) return null;

  return (
    <div
      id="previewModal"
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center animate-fade-in"
      onClick={(e) => {
        if (e.target.id === "previewModal") onClose();
      }}
    >
      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-brand shadow-2xl overflow-hidden flex flex-col animate-scale-in">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-red-50 p-2 rounded-brand border border-red-100">
              <i className="ph-fill ph-file-pdf text-2xl text-pup-maroon"></i>
            </div>
            <div>
              <h3 className="font-bold text-pup-maroon text-lg leading-tight">
                {preview.docType}
              </h3>
              <p className="text-sm text-gray-700 font-medium">
                {preview.studentName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-pup-maroon transition-colors p-2 rounded-brand"
          >
            <i className="ph-bold ph-x text-xl"></i>
          </button>
        </div>

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
      </div>
    </div>
  );
}
