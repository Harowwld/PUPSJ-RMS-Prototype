"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function EditUserModal({
  open,
  editForm,
  setEditForm,
  onClose,
  onSubmit,
  isLoading = false,
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
     <DialogContent className="sm:max-w-3xl max-w-3xl w-full p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
        <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm flex items-center justify-center shrink-0">
              <i className="ph-duotone ph-user-gear text-2xl"></i>
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-black tracking-tight text-gray-900 leading-tight">
                Update Personnel Profile
              </DialogTitle>
              <DialogDescription className="text-sm font-medium mt-1.5 text-gray-600 leading-relaxed">
                Modify staff credentials and role assignments. Changes will sync across the repository immediately after saving.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Employee ID <span className="text-pup-maroon">*</span>
                </label>
                <Input
                  type="text"
                  required
                  className="h-12 font-mono bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                  placeholder="e.g. 2023-001"
                  value={editForm.id}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, id: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  System Role <span className="text-pup-maroon">*</span>
                </label>
                <select
                  required
                  className="h-12 w-full rounded-brand border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon"
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
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  First Name <span className="text-pup-maroon">*</span>
                </label>
                <Input
                  type="text"
                  required
                  className="h-12 bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                  placeholder="Juan"
                  value={editForm.fname}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, fname: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Last Name <span className="text-pup-maroon">*</span>
                </label>
                <Input
                  type="text"
                  required
                  className="h-12 bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                  placeholder="Dela Cruz"
                  value={editForm.lname}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, lname: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                Institutional Username / Email
              </label>
              <Input
                type="email"
                readOnly
                className="h-12 bg-gray-50 border border-gray-200 text-gray-500 rounded-brand text-sm cursor-not-allowed focus-visible:outline-none"
                placeholder="username@pup.edu.ph"
                value={editForm.email}
              />
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="h-11 px-6 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="h-11 px-6 bg-pup-maroon text-white hover:bg-red-900 shadow-sm font-bold flex items-center gap-2 rounded-brand"
            >
              <i className="ph-bold ph-floppy-disk"></i>
              {isLoading ? "Saving Changes..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
