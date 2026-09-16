"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
      <DialogContent className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-2xl dark:border-white/10 dark:bg-card">
        <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none">
          <div className="flex items-start gap-4">
            <div className="min-w-0">
              <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                Update Personnel Profile
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px] font-normal text-gray-500 dark:text-zinc-400">
                Changes will sync across the repository immediately after saving.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="space-y-5 p-6 pb-4">
            {/* Part 1: Full name */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  First Name <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
                </label>
                <Input
                  type="text"
                  required
                  className="h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon shadow-xs"
                  placeholder="Juan"
                  value={editForm.fname}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, fname: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Last Name <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
                </label>
                <Input
                  type="text"
                  required
                  className="h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon shadow-xs"
                  placeholder="Dela Cruz"
                  value={editForm.lname}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, lname: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Part 2: Role Selection */}
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
              <label className="block text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                System Role <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
              </label>
              <div className="inline-flex w-fit items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-gray-200/60 dark:border-white/5">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setEditForm((f) => ({ ...f, role: "Staff" }))}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                    editForm.role === "Staff"
                      ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                  )}
                >
                  Registrar Staff
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setEditForm((f) => ({ ...f, role: "Admin" }))}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                    editForm.role === "Admin"
                      ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                  )}
                >
                  Administrator
                </button>
              </div>
            </div>

            {/* Part 3: System Identifiers */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Employee ID <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
                </label>
                <Input
                  type="text"
                  readOnly
                  className="h-10 cursor-not-allowed rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 text-xs font-normal text-gray-500 dark:text-zinc-400 shadow-xs focus-visible:outline-none"
                  placeholder="e.g. 2023-001"
                  value={editForm.id}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Institutional Email
                </label>
                <Input
                  type="email"
                  readOnly
                  className="h-10 cursor-not-allowed rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 text-xs font-normal text-gray-500 dark:text-zinc-400 shadow-xs focus-visible:outline-none"
                  placeholder="username@pup.edu.ph"
                  value={editForm.email}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="h-10 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white shadow-xs cursor-pointer active:scale-95 disabled:opacity-50 transition-all border-0"
            >
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
