"use client";

export default function RegisterAccountTab({
  createForm,
  setCreateForm,
  onResetForm,
  onCreateAccount,
  onSwitchView,
}) {
  return (
    <div className="flex-1 bg-white rounded-brand border border-gray-300 shadow-sm flex flex-col h-full overflow-hidden animate-fade-in">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/30">
        <div>
          <h3 className="font-bold text-pup-maroon text-lg flex items-center gap-2">
            <i className="ph-duotone ph-user-plus"></i> New Account Creation
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Create secure access credentials for Registrar Staff.
          </p>
        </div>
        <button
          onClick={() => onSwitchView("directory")}
          className="text-xs font-bold text-gray-500 hover:text-pup-maroon flex items-center gap-2 transition-colors"
        >
          <i className="ph-bold ph-arrow-left"></i> Back to Directory
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-brand border border-blue-100 flex items-start gap-3">
              <i className="ph-fill ph-shield-check text-blue-600 text-xl mt-0.5"></i>
              <div>
                <h4 className="text-sm font-bold text-blue-800">
                  Role-Based Access
                </h4>
                <p className="text-xs text-blue-600 mt-1">
                  Assign permissions as either Admin or Staff to keep access
                  scoped to responsibilities.
                </p>
              </div>
            </div>
            <div className="bg-amber-50 p-4 rounded-brand border border-amber-100 flex items-start gap-3">
              <i className="ph-fill ph-key text-amber-600 text-xl mt-0.5"></i>
              <div>
                <h4 className="text-sm font-bold text-amber-800">
                  Default Credentials
                </h4>
                <p className="text-xs text-amber-600 mt-1">
                  New accounts are initialized with a temporary password:
                  <span className="font-mono font-bold"> pupstaff</span>. Users
                  will be prompted to change it upon first login.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={onCreateAccount} className="space-y-6">
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
                  value={createForm.id}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, id: e.target.value }))
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
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, role: e.target.value }))
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
                  value={createForm.fname}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, fname: e.target.value }))
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
                  value={createForm.lname}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, lname: e.target.value }))
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
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>

            <div className="border-t border-gray-200 pt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onResetForm}
                className="px-5 py-2.5 border border-gray-300 rounded-brand text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Reset Form
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-pup-maroon text-white rounded-brand text-sm font-bold hover:bg-red-900 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <i className="ph-bold ph-check"></i> Create Account
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
