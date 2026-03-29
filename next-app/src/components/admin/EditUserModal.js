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
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-50 p-0 overflow-hidden border-gray-200 sm:rounded-sm rounded-sm">
        <DialogHeader className="p-6 bg-white border-b border-gray-200 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-red-50 text-pup-maroon flex items-center justify-center border border-red-100 shadow-sm shrink-0">
              <i className="ph-duotone ph-pencil-simple text-xl"></i>
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight">
                Edit Account Details
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-gray-500 mt-0.5">
                Update staff details and access permissions.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Employee ID <span className="text-pup-maroon">*</span>
                </label>
                <Input
                  type="text"
                  required
                  className="font-mono bg-white shadow-sm"
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
                  className="w-full flex h-9 rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="bg-white shadow-sm"
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
                  className="bg-white shadow-sm"
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
                Username / Email <span className="text-pup-maroon">*</span>
              </label>
              <Input
                type="text"
                required
                className="bg-white shadow-sm"
                placeholder="username@pup.edu.ph"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-pup-maroon text-white hover:bg-red-900 shadow-md flex items-center gap-2"
            >
              <i className="ph-bold ph-floppy-disk text-lg"></i> Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
