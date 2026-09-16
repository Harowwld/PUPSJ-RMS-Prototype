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
import { toast } from "sonner"

export default function RegisterAccountTab({
  open,
  onClose,
  authUser,
  createForm,
  setCreateForm,
  staffCount = 0,
  isLoading = false,
  onResetForm,
  onCreateAccount,
}) {
  const [lastAutoFilled, setLastAutoFilled] = useState({ id: false, email: false })
  const fnameRef = useRef(null)

  const [isIdManual, setIsIdManual] = useState(false)
  const [isEmailManual, setIsEmailManual] = useState(false)

  const defaultPassword =
    process.env.NEXT_PUBLIC_DEFAULT_STAFF_PASSWORD || "pupstaff"

  const suggestedId = useMemo(() => {
    if (!createForm.fname && !createForm.lname) return ""
    const nextId = (staffCount + 1).toString().padStart(3, "0")
    return `PUPREGISTRAR-${nextId}`
  }, [createForm.fname, createForm.lname, staffCount])

  const suggestedEmail = useMemo(() => {
    if (!createForm.lname || !createForm.role) return ""
    const role = createForm.role.toLowerCase()
    const name = createForm.lname.toLowerCase().replace(/[^a-z0-9]/g, "")
    return `${role}.${name}@pup.local`
  }, [createForm.lname, createForm.role])

  // Auto-fill ID
  useEffect(() => {
    if (!isIdManual && suggestedId && createForm.id !== suggestedId) {
      const timer = setTimeout(() => {
        setCreateForm(f => ({ ...f, id: suggestedId }))
        setLastAutoFilled(prev => ({ ...prev, id: true }))
      }, 0)
      const resetTimer = setTimeout(() => {
        setLastAutoFilled(prev => ({ ...prev, id: false }))
      }, 1000)
      return () => {
        clearTimeout(timer)
        clearTimeout(resetTimer)
      }
    }
    if (!isIdManual && !suggestedId && createForm.id !== "") {
      const timer = setTimeout(() => {
        setCreateForm(f => ({ ...f, id: "" }))
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [suggestedId, isIdManual, createForm.id, setCreateForm])

  // Auto-fill Email
  useEffect(() => {
    if (!isEmailManual && suggestedEmail && createForm.email !== suggestedEmail) {
      const timer = setTimeout(() => {
        setCreateForm(f => ({ ...f, email: suggestedEmail }))
        setLastAutoFilled(prev => ({ ...prev, email: true }))
      }, 0)
      const resetTimer = setTimeout(() => {
        setLastAutoFilled(prev => ({ ...prev, email: false }))
      }, 1000)
      return () => {
        clearTimeout(timer)
        clearTimeout(resetTimer)
      }
    }
    if (!isEmailManual && !suggestedEmail && createForm.email !== "") {
      const timer = setTimeout(() => {
        setCreateForm(f => ({ ...f, email: "" }))
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [suggestedEmail, isEmailManual, createForm.email, setCreateForm])

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        fnameRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [open])

  const handleClearForm = () => {
    onResetForm()
    setLastAutoFilled({ id: false, email: false })
    toast.success("Form cleared successfully", {
      description: "All registration fields have been reset.",
    })
    setTimeout(() => {
        setIsIdManual(false)
        setIsEmailManual(false)
        fnameRef.current?.focus()
    }, 50)
  }

  return (
    <TooltipProvider delay={200}>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-2xl dark:border-white/10 dark:bg-card">
          <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none">
            <div className="flex items-start gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                  Register Account
                </DialogTitle>
                <DialogDescription className="mt-1 text-[13px] font-normal text-gray-500 dark:text-zinc-400">
                  Create new user credentials for registrar personnel and administrators.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={onCreateAccount}>
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
                    ref={fnameRef}
                    disabled={isLoading}
                    className="h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon shadow-xs"
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
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                    Last Name <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    disabled={isLoading}
                    className="h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon shadow-xs"
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

              {/* Part 2: Role Selection */}
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                <label className="block text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  System Role <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
                </label>
                <div className="inline-flex w-fit items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-gray-200/60 dark:border-white/5">
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
                    Registrar Staff
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
                    required
                    disabled={isLoading}
                    className={cn(
                      "h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon shadow-xs",
                      lastAutoFilled.id && "border-emerald-500 dark:border-emerald-500"
                    )}
                    placeholder={suggestedId || "PUPREGISTRAR-[XXX]"}
                    value={createForm.id}
                    onChange={(e) => {
                      const val = e.target.value
                      setIsIdManual(val !== "")
                      setCreateForm((f) => ({
                        ...f,
                        id: val,
                      }))
                    }}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                    Email Address <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
                  </label>
                  <Input
                    type="email"
                    required
                    disabled={isLoading}
                    className={cn(
                      "h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon shadow-xs",
                      lastAutoFilled.email && "border-emerald-500 dark:border-emerald-500"
                    )}
                    placeholder={suggestedEmail || "[role].[name]@pup.local"}
                    value={createForm.email}
                    onChange={(e) => {
                      const val = e.target.value
                      setIsEmailManual(val !== "")
                      setCreateForm((f) => ({
                        ...f,
                        email: val,
                      }))
                    }}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="m-0 p-6 pt-0 bg-white dark:bg-card border-none flex flex-row items-center justify-between sm:justify-between w-full">
              <Button
                type="button"
                variant="outline"
                onClick={handleClearForm}
                disabled={isLoading}
                className="h-10 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Reset
              </Button>
              <div className="flex items-center gap-2.5">
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
                  {isLoading ? "Registering..." : "Register"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
