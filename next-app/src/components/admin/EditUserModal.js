"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"

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
      <DialogContent className="w-full max-w-3xl overflow-hidden rounded-brand border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-3xl dark:border-white/10 dark:bg-card">
        <DialogHeader className="border-b border-gray-100 bg-gray-50/50 p-6 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-pup-maroon shadow-sm dark:bg-red-950/30 dark:border-white/10">
              <i className="ph-duotone ph-user-gear text-2xl"></i>
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg leading-tight font-black tracking-tight text-gray-900 dark:text-zinc-50">
                Update Personnel Profile
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm leading-relaxed font-medium text-gray-600 dark:text-zinc-300">
                Modify staff credentials and role assignments. Changes will sync
                across the repository immediately after saving.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="space-y-6 p-6">
            {/* Part 1: Full name */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold tracking-wide text-gray-700 dark:text-zinc-200">
                  First Name <span className="text-pup-maroon dark:text-primary">*</span>
                </label>
                <Input
                  type="text"
                  required
                  className="h-11 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none dark:bg-card dark:border-white/10"
                  placeholder="Juan"
                  value={editForm.fname}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, fname: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold tracking-wide text-gray-700 dark:text-zinc-200">
                  Last Name <span className="text-pup-maroon dark:text-primary">*</span>
                </label>
                <Input
                  type="text"
                  required
                  className="h-11 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none dark:bg-card dark:border-white/10"
                  placeholder="Dela Cruz"
                  value={editForm.lname}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, lname: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Part 2: Role Selection */}
            <div>
              <label className="mb-2 block text-xs font-bold tracking-wide text-gray-700 dark:text-zinc-200">
                System Role <span className="text-pup-maroon dark:text-primary">*</span>
              </label>
              <Select
                required
                className="h-11 w-full rounded-brand border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition-colors focus:border-gray-300 focus:ring-2 focus:ring-pup-maroon focus:outline-none dark:bg-card dark:text-zinc-50 dark:shadow-none dark:focus:border-zinc-700 dark:border-white/10"
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
              </Select>
            </div>

            {/* Part 3: System Identifiers */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold tracking-wide text-gray-700 dark:text-zinc-200">
                  Employee ID <span className="text-pup-maroon dark:text-primary">*</span>
                </label>
                <Input
                  type="text"
                  readOnly
                  className="h-11 cursor-not-allowed rounded-brand border border-gray-200 bg-gray-50 font-mono text-sm text-gray-500 focus-visible:outline-none dark:border-white/10 dark:bg-card dark:text-zinc-400"
                  placeholder="e.g. 2023-001"
                  value={editForm.id}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold tracking-wide text-gray-700 dark:text-zinc-200">
                  Institutional Email
                </label>
                <Input
                  type="email"
                  readOnly
                  className="h-11 cursor-not-allowed rounded-brand border border-gray-200 bg-gray-50 text-sm text-gray-500 focus-visible:outline-none dark:border-white/10 dark:bg-card dark:text-zinc-400"
                  placeholder="username@pup.edu.ph"
                  value={editForm.email}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2.5 border-t border-gray-100 bg-white p-4 sm:flex-row sm:justify-end dark:border-white/10 dark:bg-card">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="h-11 rounded-brand border-gray-300 px-6 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:text-zinc-200 dark:hover:bg-white/10 dark:bg-card dark:border-white/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex h-11 items-center gap-2 rounded-brand btn-brand-red hover:from-red-700 hover:to-red-900 hover:shadow-md transition-all px-6 font-black text-white shadow-sm dark:shadow-none"
            >
              <i className="ph-bold ph-floppy-disk"></i>
              {isLoading ? "Saving Changes..." : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}



