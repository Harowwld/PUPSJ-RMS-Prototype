"use client";

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
    <div
      id="docTypeModal"
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target.id === "docTypeModal") onClose();
      }}
    >
      <div className="w-full max-w-md bg-white rounded-brand border border-gray-200 shadow-2xl overflow-hidden animate-scale-in">
        <div className="p-5 border-b border-gray-200 bg-gray-50/60 flex items-center justify-between">
          <h3 className="font-bold text-pup-maroon">Add Document Type</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-pup-maroon transition-colors p-2 rounded-brand"
          >
            <i className="ph-bold ph-x text-lg"></i>
          </button>
        </div>

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
      </div>
    </div>
  );
}
