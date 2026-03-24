"use client";

export default function EditUserModal({
  open,
  editForm,
  setEditForm,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center animate-fade-in">
      <div className="bg-white rounded-brand shadow-lg w-full max-w-2xl overflow-hidden transform scale-95 transition-transform duration-200">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/30">
          <div>
            <h3 className="font-bold text-pup-maroon text-lg flex items-center gap-2">
              <i className="ph-duotone ph-pencil-simple"></i> Edit Account
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Update staff details and permissions.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50"
          >
            <i className="ph-bold ph-x text-lg"></i>
          </button>
        </div>
        <div className="p-8">
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
                  Employee ID *
                </label>
                <input
                  type="text"
                  required
                  className="form-input font-mono"
                  placeholder="e.g. 2023-001"
                  value={editForm.id}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, id: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
                  System Role *
                </label>
                <select
                  required
                  className="form-select"
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, role: e.target.value }))
                  }
                >
                  <option value="" disabled>
                    Select Role...
                  </option>
                  <option value="Admin">Admin</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Juan"
                  value={editForm.fname}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, fname: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Dela Cruz"
                  value={editForm.lname}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, lname: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
                Username *
              </label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="username"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>

            <div className="border-t border-gray-200 pt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 rounded-brand text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-pup-maroon text-white rounded-brand text-sm font-bold hover:bg-red-900 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <i className="ph-bold ph-floppy-disk"></i> Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
