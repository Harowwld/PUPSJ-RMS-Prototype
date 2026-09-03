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
      <DialogContent className="w-full max-w-2xl overflow-hidden rounded-brand border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-2xl dark:border-white/10 dark:bg-card">
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
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-400">
                  First Name <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
                </label>
                <Input
                  type="text"
                  required
                  className="h-[36px] rounded-[8px] border-[0.5px] border-gray-300 bg-white text-[13px] font-normal tracking-[-0.01em] text-gray-900 focus-visible:border-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0 focus:border-gray-500 dark:bg-card dark:border-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus-visible:border-zinc-600"
                  style={{ borderWidth: '0.5px', borderStyle: 'solid' }}
                  placeholder="Juan"
                  value={editForm.fname}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, fname: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-400">
                  Last Name <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
                </label>
                <Input
                  type="text"
                  required
                  className="h-[36px] rounded-[8px] border-[0.5px] border-gray-300 bg-white text-[13px] font-normal tracking-[-0.01em] text-gray-900 focus-visible:border-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0 focus:border-gray-500 dark:bg-card dark:border-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus-visible:border-zinc-600"
                  style={{ borderWidth: '0.5px', borderStyle: 'solid' }}
                  placeholder="Dela Cruz"
                  value={editForm.lname}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, lname: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Part 2: Role Selection */}
            <div className="flex flex-col gap-1">
              <label className="block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-400">
                System Role <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
              </label>
              <div className="flex items-center gap-6 border-b border-gray-100 dark:border-white/5 pb-0">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setEditForm(f => ({ ...f, role: "Staff" }))}
                  className={cn(
                    "text-[13px] pb-1.5 bg-transparent rounded-none h-auto px-0 w-auto hover:bg-transparent cursor-pointer focus:outline-none focus-visible:outline-none border-b-[1.5px] border-transparent transition-all font-medium",
                    editForm.role === "Staff"
                      ? "text-pup-maroon dark:text-red-400 border-pup-maroon dark:border-red-400"
                      : "text-gray-500 dark:text-zinc-500"
                  )}
                >
                  Registrar Staff
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setEditForm(f => ({ ...f, role: "Admin" }))}
                  className={cn(
                    "text-[13px] pb-1.5 bg-transparent rounded-none h-auto px-0 w-auto hover:bg-transparent cursor-pointer focus:outline-none focus-visible:outline-none border-b-[1.5px] border-transparent transition-all font-medium",
                    editForm.role === "Admin"
                      ? "text-pup-maroon dark:text-red-400 border-pup-maroon dark:border-red-400"
                      : "text-gray-500 dark:text-zinc-500"
                  )}
                >
                  Administrator
                </button>
              </div>
            </div>

            {/* Part 3: System Identifiers */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-400">
                  Employee ID <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
                </label>
                <Input
                  type="text"
                  readOnly
                  className="h-[36px] cursor-not-allowed rounded-[8px] border-[0.5px] border-gray-300 bg-gray-50/50 text-[13px] font-normal tracking-[-0.01em] text-gray-500 focus-visible:outline-none dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400"
                  style={{ borderWidth: '0.5px', borderStyle: 'solid' }}
                  placeholder="e.g. 2023-001"
                  value={editForm.id}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-400">
                  Institutional Email
                </label>
                <Input
                  type="email"
                  readOnly
                  className="h-[36px] cursor-not-allowed rounded-[8px] border-[0.5px] border-gray-300 bg-gray-50/50 text-[13px] font-normal tracking-[-0.01em] text-gray-500 focus-visible:outline-none dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400"
                  style={{ borderWidth: '0.5px', borderStyle: 'solid' }}
                  placeholder="username@pup.edu.ph"
                  value={editForm.email}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-row justify-end gap-2 bg-white p-6 dark:bg-card border-none">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
              className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 bg-transparent hover:bg-transparent border-none shadow-none p-0 h-auto cursor-pointer focus:outline-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex h-[36px] items-center justify-center rounded-[8px] btn-brand-red text-[13px] font-medium text-white shadow-none border-none py-0 px-4 cursor-pointer"
            >
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
