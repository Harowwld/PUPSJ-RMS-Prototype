"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { getOfficePrefix } from "@/lib/roleUtils"

export default function RegisterAccountTab({
  open,
  onClose,
  authUser,
  officeId,
  officeShortName,
  offices,
  createForm,
  setCreateForm,
  staffCount = 0,
  isLoading = false,
  onResetForm,
  onCreateAccount,
}) {
  const fnameRef = useRef(null)
  const [nextIdPreview, setNextIdPreview] = useState("")

  const officePrefix = getOfficePrefix(officeShortName || officeId || authUser?.office_short_name || authUser?.office_id || "registrar", offices)

  // Fetch next available staff ID from the system
  useEffect(() => {
    let active = true
    if (open) {
      const off = officeId || authUser?.office_id || "registrar"
      const r = createForm.role || "Staff"
      fetch(`/api/staff/next-id?officeId=${encodeURIComponent(off)}&role=${encodeURIComponent(r)}`)
        .then((res) => res.json())
        .then((json) => {
          if (active && json.ok && json.nextId) {
            setNextIdPreview(json.nextId)
            setCreateForm((f) => ({ ...f, id: json.nextId }))
          }
        })
        .catch(() => {})
    }
    return () => {
      active = false
    }
  }, [open, officeId, authUser?.office_id, createForm.role, setCreateForm])

  const suggestedEmail = useMemo(() => {
    if (!createForm.lname || !createForm.role) return ""
    const role = createForm.role.toLowerCase()
    const name = createForm.lname.toLowerCase().replace(/[^a-z0-9]/g, "")
    return `${role}.${name}@pup.local`
  }, [createForm.lname, createForm.role])

  // Auto-fill Email
  useEffect(() => {
    if (suggestedEmail && createForm.email !== suggestedEmail) {
      const timer = setTimeout(() => {
        setCreateForm(f => ({ ...f, email: suggestedEmail }))
      }, 0)
      return () => clearTimeout(timer)
    }
    if (!suggestedEmail && createForm.email !== "") {
      const timer = setTimeout(() => {
        setCreateForm(f => ({ ...f, email: "" }))
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [suggestedEmail, createForm.email, setCreateForm])

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        fnameRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [open])

  return (
    <TooltipProvider delay={200}>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-2xl sm:max-w-2xl dark:border-border dark:bg-card">
          <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none">
            <div className="flex items-start gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                  Register Account
                </DialogTitle>
                <DialogDescription className="mt-1 text-[13px] font-normal text-gray-900 dark:text-zinc-300">
                  Create new user credentials for {officePrefix} personnel and administrators.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={onCreateAccount}>
            <div className="space-y-5 p-6 pb-4">
              {/* Row 1: Editable Full Name */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    First Name *
                  </label>
                  <Input
                    type="text"
                    required
                    ref={fnameRef}
                    disabled={isLoading}
                    className="h-10 rounded-xl border border-border bg-white text-xs font-normal text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon shadow-xs dark:border-border dark:bg-zinc-950 dark:text-white dark:placeholder:text-zinc-500"
                    placeholder="Juan"
                    value={createForm.fname}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        fname: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Last Name *
                  </label>
                  <Input
                    type="text"
                    required
                    disabled={isLoading}
                    className="h-10 rounded-xl border border-border bg-white text-xs font-normal text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon shadow-xs dark:border-border dark:bg-zinc-950 dark:text-white dark:placeholder:text-zinc-500"
                    placeholder="Dela Cruz"
                    value={createForm.lname}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        lname: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Row 2: Role Selection */}
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Privilege Level *
                </label>
                <div className="inline-flex w-fit items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-border/60 dark:border-border">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setCreateForm((f) => ({ ...f, role: "Staff" }))}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                      createForm.role === "Staff"
                        ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                        : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                    )}
                  >
                    {officePrefix} Staff
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setCreateForm((f) => ({ ...f, role: "Admin" }))}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                      createForm.role === "Admin"
                        ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                        : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                    )}
                  >
                    {officePrefix ? `${officePrefix} Admin` : "Administrator"}
                  </button>
                </div>
              </div>

              {/* Row 3: System-Generated Identifiers (Grouped Read-Only Section) */}
              <div className="p-4 rounded-2xl border border-border dark:border-border bg-gray-50/50 dark:bg-zinc-950/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                    System-Generated Credentials
                  </span>
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/40">
                    Auto-assigned
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-gray-500 dark:text-zinc-400">
                      Employee ID
                    </label>
                    <div className="flex h-10 items-center justify-between rounded-xl border border-border/80 bg-white/80 px-3.5 text-xs text-gray-700 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-300 shadow-2xs select-none">
                      <span className="font-mono text-xs font-semibold tracking-wide truncate">
                        {nextIdPreview || `PUP${officePrefix.toUpperCase()}-[AUTO]`}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-gray-500 dark:text-zinc-400">
                      Official Email Address
                    </label>
                    <div className="flex h-10 items-center justify-between rounded-xl border border-border/80 bg-white/80 px-3.5 text-xs text-gray-700 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-300 shadow-2xs select-none">
                      <span className="font-mono text-xs font-semibold tracking-wide truncate">
                        {createForm.email || suggestedEmail || `${(createForm.role || "staff").toLowerCase()}.[lastname]@pup.local`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="h-10 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="h-10 px-5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50 transition-all border-0"
              >
                {isLoading ? "Registering..." : "Register Staff"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
