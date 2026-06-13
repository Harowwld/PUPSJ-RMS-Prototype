"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import PageHeader from "@/components/shared/PageHeader"
import ConfirmModal from "@/components/shared/ConfirmModal"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export default function RegisterAccountTab({
  authUser,
  createForm,
  setCreateForm,
  staffCount = 0,
  isLoading = false,
  onResetForm,
  onCreateAccount,
  onSwitchView,
}) {
  const [showDefaultPw, setShowDefaultPw] = useState(false)
  const [lastAutoFilled, setLastAutoFilled] = useState({ id: false, email: false })
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [countdown, setCountdown] = useState(3)
  
  const skipConfirmation = !!authUser?.preferences?.skip_registration_confirmation
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
    // If name is cleared, also clear the non-manual ID
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
    // If name/role is cleared, also clear the non-manual email
    if (!isEmailManual && !suggestedEmail && createForm.email !== "") {
      const timer = setTimeout(() => {
        setCreateForm(f => ({ ...f, email: "" }))
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [suggestedEmail, isEmailManual, createForm.email, setCreateForm])

  useEffect(() => {
    let timer
    if (showConfirmModal && !skipConfirmation && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [showConfirmModal, countdown, skipConfirmation])

  const handleOpenConfirm = (e) => {
    e.preventDefault()
    if (skipConfirmation) {
      onCreateAccount(e)
      return
    }
    setCountdown(3)
    setShowConfirmModal(true)
  }

  const handleConfirmAction = (e) => {
    setShowConfirmModal(false)
    onCreateAccount(e)
  }

  useEffect(() => {
    // Auto-focus the first field when the component mounts (tab switched)
    const timer = setTimeout(() => {
      fnameRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const handleClearForm = () => {
    onResetForm()
    setLastAutoFilled({ id: false, email: false })
    toast.success("Form cleared successfully", {
      description: "All registration fields have been reset.",
    })
    // Delay resetting manual flags to ensure the form values have cleared first,
    // preventing the auto-fill effect from re-triggering.
    setTimeout(() => {
        setIsIdManual(false)
        setIsEmailManual(false)
        fnameRef.current?.focus()
    }, 50)
  }

  return (
    <TooltipProvider delay={200}>
      <div className="animate-fade-up font-inter flex w-full flex-1 flex-col gap-6 min-h-0">
        {/* Main Registration Form - merged with header */}
        <Card className="overflow-hidden rounded-brand border border-gray-200 bg-white shadow-md dark:border-white/10 dark:bg-card dark:shadow-none w-full h-fit">
          <PageHeader
            icon="ph-user-plus"
            title="Register Account"
            description="Create new user credentials for registrar personnel and administrators."
            showBorder={true}
            titleClassName="text-[15px] font-semibold tracking-[-0.01em] text-[#111111] dark:text-zinc-50 mb-[4px]"
            descriptionClassName="text-[13px] font-normal text-[#8E8E93] dark:text-zinc-400 m-0"
            actions={
              <div className="flex items-center gap-[8px]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSwitchView?.("directory")}
                  className="h-10 px-3 font-semibold text-sm text-gray-600 hover:text-gray-900 hover:bg-transparent dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors flex items-center gap-2 rounded-brand shadow-none! border-0!"
                >
                  <i className="ph-bold ph-arrow-left"></i>
                  Directory
                </Button>
              </div>
            }
          />
          <CardContent className="bg-white p-[28px] dark:bg-card">
            <form onSubmit={handleOpenConfirm} className="flex flex-col gap-[20px]">
              {/* Part 1: Full name */}
              <div className="grid grid-cols-1 gap-[16px] md:grid-cols-2">
                <div className="flex flex-col gap-[4px]">
                  <label className="block text-[12px] font-medium text-[#8E8E93] dark:text-zinc-500">
                    First Name
                  </label>
                  <Input
                    type="text"
                    required
                    ref={fnameRef}
                    disabled={isLoading}
                    className={cn(
                      "h-[36px] w-full rounded-[8px] border-[0.5px] border-black/15 bg-white px-3 py-0 leading-[36px] text-[13px] font-normal placeholder:text-[#C7C7CC] text-[#111111] focus-visible:border-black/35 focus-visible:ring-0 focus-visible:outline-none dark:bg-card dark:text-zinc-50 dark:border-white/15 dark:focus-visible:border-white/35 transition-all shadow-none"
                    )}
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
                <div className="flex flex-col gap-[4px]">
                  <label className="block text-[12px] font-medium text-[#8E8E93] dark:text-zinc-500">
                    Last Name
                  </label>
                  <Input
                    type="text"
                    required
                    disabled={isLoading}
                    className={cn(
                      "h-[36px] w-full rounded-[8px] border-[0.5px] border-black/15 bg-white px-3 py-0 leading-[36px] text-[13px] font-normal placeholder:text-[#C7C7CC] text-[#111111] focus-visible:border-black/35 focus-visible:ring-0 focus-visible:outline-none dark:bg-card dark:text-zinc-50 dark:border-white/15 dark:focus-visible:border-white/35 transition-all shadow-none"
                    )}
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
              <div className="flex flex-col gap-[4px]">
                <label className="block text-[12px] font-medium text-[#8E8E93] dark:text-zinc-500">
                  Assigned Role
                </label>
                <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setCreateForm(f => ({ ...f, role: f.role === "Staff" ? "" : "Staff" }))}
                    className={cn(
                      "h-[36px] w-full rounded-[8px] border-[0.5px] text-[13px] transition-all flex items-center justify-center px-4 py-0 cursor-pointer focus:outline-none",
                      createForm.role === "Staff"
                        ? "border-orange-500 bg-orange-50 text-orange-600 font-medium dark:border-orange-500 dark:bg-orange-950/20 dark:text-orange-400"
                        : "border-black/15 dark:border-white/10 text-[#8E8E93] dark:text-zinc-500 bg-white dark:bg-card font-normal"
                    )}
                  >
                    <span>Registrar Staff</span>
                  </button>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setCreateForm(f => ({ ...f, role: f.role === "Admin" ? "" : "Admin" }))}
                    className={cn(
                      "h-[36px] w-full rounded-[8px] border-[0.5px] text-[13px] transition-all flex items-center justify-center px-4 py-0 cursor-pointer focus:outline-none",
                      createForm.role === "Admin"
                        ? "border-[#E5484D] bg-[#FFF5F5] text-[#E5484D] font-medium dark:border-red-500 dark:bg-red-950/20 dark:text-red-400"
                        : "border-black/15 dark:border-white/10 text-[#8E8E93] dark:text-zinc-500 bg-white dark:bg-card font-normal"
                    )}
                  >
                    <span>Administrator</span>
                  </button>
                </div>
              </div>

              {/* Part 3: System Identifiers */}
              <div className="grid grid-cols-1 gap-[16px] md:grid-cols-2">
                <div className="flex flex-col gap-[4px]">
                  <label className="block text-[12px] font-medium text-[#8E8E93] dark:text-zinc-500">
                    Employee ID
                  </label>
                  <Input
                    type="text"
                    required
                    disabled={isLoading}
                    className={cn(
                      "h-[36px] w-full rounded-[8px] border-[0.5px] border-black/15 bg-white px-3 py-0 leading-[36px] text-[13px] font-normal placeholder:text-[#C7C7CC] text-[#111111] focus-visible:border-black/35 focus-visible:ring-0 focus-visible:outline-none dark:bg-card dark:text-zinc-50 dark:border-white/15 dark:focus-visible:border-white/35 transition-all shadow-none",
                      lastAutoFilled.id && "border-emerald-500"
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

                <div className="flex flex-col gap-[4px]">
                  <label className="block text-[12px] font-medium text-[#8E8E93] dark:text-zinc-500">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    required
                    disabled={isLoading}
                    className={cn(
                      "h-[36px] w-full rounded-[8px] border-[0.5px] border-black/15 bg-white px-3 py-0 leading-[36px] text-[13px] font-normal placeholder:text-[#C7C7CC] text-[#111111] focus-visible:border-black/35 focus-visible:ring-0 focus-visible:outline-none dark:bg-card dark:text-zinc-50 dark:border-white/15 dark:focus-visible:border-white/35 transition-all shadow-none",
                      lastAutoFilled.email && "border-emerald-500"
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
              <div className="flex items-center justify-end border-t border-gray-100 pt-6 dark:border-white/10 mt-[8px] gap-[8px]">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isLoading}
                  onClick={handleClearForm}
                  className="h-[36px] px-3 font-normal text-[13px] text-[#8E8E93] hover:text-[#111111] hover:bg-transparent dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors flex items-center justify-center rounded-[8px] shadow-none! border-0!"
                >
                  Reset Form
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex h-[36px] items-center justify-center rounded-[8px] btn-brand-red text-white font-medium text-[13px] active:scale-95 disabled:opacity-50 transition-all dark:shadow-none px-[20px] cursor-pointer"
                >
                  {isLoading ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <ConfirmModal
          open={showConfirmModal}
          onCancel={() => setShowConfirmModal(false)}
          title="Confirm Registration"
          variant="brand"
          message="Review the provisioning details below before creating the new system credentials."
          confirmLabel={countdown > 0 ? `Confirm (${countdown}s)` : "Confirm Registration"}
          confirmClassName="bg-pup-maroon hover:bg-red-900 text-white"
          buttonIcon={countdown > 0 ? "ph-bold ph-clock" : "ph-bold ph-check-circle"}
          disabled={countdown > 0}
          onConfirm={handleConfirmAction}
          isLoading={isLoading}
          note={createForm.role === "Admin" 
            ? "Granted full administrative control over system configurations, user accounts, and audit logs." 
            : "Granted operational access to process document requests, student records, and room layouts."}
        >
          <div className="mt-4 space-y-4 rounded-xl border border-gray-200 bg-gray-50/50 p-5 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white font-semibold text-pup-maroon dark:text-primary shadow-sm dark:border-white/10 dark:bg-card">
                {((createForm.fname?.[0] || "") + (createForm.lname?.[0] || "")).toUpperCase() || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold tracking-wider text-gray-400 dark:text-zinc-500 mb-1">Full name</p>
                <p className="text-base font-semibold text-gray-900 dark:text-zinc-50 truncate">
                  {createForm.fname} {createForm.lname}
                </p>
              </div>
            </div>

            <Separator className="bg-gray-200 dark:bg-zinc-700/50" />

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-semibold tracking-wider text-gray-400 dark:text-zinc-500 mb-1">Employee ID</p>
                <p className="text-xs font-semibold text-gray-900 dark:text-zinc-50">{createForm.id}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-wider text-gray-400 dark:text-zinc-500 mb-1">Institutional Email</p>
                <p className="truncate text-xs font-semibold text-gray-900 dark:text-zinc-50" title={createForm.email}>
                  {createForm.email}
                </p>
              </div>
            </div>

            <Separator className="bg-gray-200 dark:bg-zinc-700/50" />
            
            <div>
              <p className="mb-2 text-[10px] font-semibold tracking-wider text-gray-400 dark:text-zinc-500">Access Level</p>
              <div className="flex items-start gap-3">
                <span className={cn(
                  "inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-[10px] font-semibold tracking-tight  shadow-sm dark:shadow-none",
                  createForm.role === "Admin" 
                    ? "border-red-200 bg-red-50 dark:bg-red-950/20 text-pup-maroon dark:text-primary" 
                    : "border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-amber-700"
                )}>
                  <i className={cn("ph-fill mr-1.5 text-xs", createForm.role === "Admin" ? "ph-shield-star" : "ph-user-gear")} />
                  {createForm.role === "Admin" ? "Administrator" : "Registrar Staff"}
                </span>
              </div>
            </div>
          </div>
        </ConfirmModal>
      </div>
    </TooltipProvider>
  )
}



