"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-400">
                    First Name <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    ref={fnameRef}
                    disabled={isLoading}
                    className="h-[36px] rounded-[8px] border-[0.5px] border-gray-300 bg-white text-[13px] font-normal tracking-[-0.01em] text-gray-900 focus-visible:border-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0 focus:border-gray-500 dark:bg-card dark:border-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus-visible:border-zinc-600"
                    style={{ borderWidth: '0.5px', borderStyle: 'solid' }}
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
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-400">
                    Last Name <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    disabled={isLoading}
                    className="h-[36px] rounded-[8px] border-[0.5px] border-gray-300 bg-white text-[13px] font-normal tracking-[-0.01em] text-gray-900 focus-visible:border-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0 focus:border-gray-500 dark:bg-card dark:border-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus-visible:border-zinc-600"
                    style={{ borderWidth: '0.5px', borderStyle: 'solid' }}
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

              {/* Part 2: Role Selection (right side of the card, no separator) */}
              <div className="flex flex-row items-center justify-between pb-1">
                <label className="block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-400">
                  System Role <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
                </label>
                <div className="flex items-center gap-6">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setCreateForm(f => ({ ...f, role: "Staff" }))}
                    className={cn(
                      "text-[13px] pb-1 bg-transparent rounded-none h-auto px-0 w-auto hover:bg-transparent cursor-pointer focus:outline-none focus-visible:outline-none border-b-[1.5px] border-transparent transition-all font-medium",
                      createForm.role === "Staff"
                        ? "text-[#edbb00] border-[#edbb00]"
                        : "text-gray-500 dark:text-zinc-500"
                    )}
                  >
                    Registrar Staff
                  </button>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setCreateForm(f => ({ ...f, role: "Admin" }))}
                    className={cn(
                      "text-[13px] pb-1 bg-transparent rounded-none h-auto px-0 w-auto hover:bg-transparent cursor-pointer focus:outline-none focus-visible:outline-none border-b-[1.5px] border-transparent transition-all font-medium",
                      createForm.role === "Admin"
                        ? "text-[#e30000] border-[#e30000]"
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
                    required
                    disabled={isLoading}
                    className={cn(
                      "h-[36px] rounded-[8px] border-[0.5px] border-gray-300 bg-white text-[13px] font-normal tracking-[-0.01em] text-gray-900 focus-visible:border-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0 focus:border-gray-500 dark:bg-card dark:border-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus-visible:border-zinc-600",
                      lastAutoFilled.id && "border-emerald-500 dark:border-emerald-500"
                    )}
                    style={{ borderWidth: '0.5px', borderStyle: 'solid' }}
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
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-400">
                    Email Address <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">*</span>
                  </label>
                  <Input
                    type="email"
                    required
                    disabled={isLoading}
                    className={cn(
                      "h-[36px] rounded-[8px] border-[0.5px] border-gray-300 bg-white text-[13px] font-normal tracking-[-0.01em] text-gray-900 focus-visible:border-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0 focus:border-gray-500 dark:bg-card dark:border-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus-visible:border-zinc-600",
                      lastAutoFilled.email && "border-emerald-500 dark:border-emerald-500"
                    )}
                    style={{ borderWidth: '0.5px', borderStyle: 'solid' }}
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

            <div className="flex flex-row justify-between bg-white p-6 dark:bg-card border-none items-center">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClearForm}
                disabled={isLoading}
                className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 bg-transparent hover:bg-transparent border-none shadow-none p-0 h-auto cursor-pointer focus:outline-none"
              >
                Reset Form
              </Button>
              <div className="flex items-center gap-6">
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
                  className="flex h-[36px] items-center justify-center rounded-[8px] btn-brand-red text-white font-medium text-[13px] active:scale-95 disabled:opacity-50 transition-all dark:shadow-none px-[20px] cursor-pointer"
                >
                  {isLoading ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
