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
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSwitchView?.("directory")}
                  className="h-9 rounded-md border-gray-300 bg-white px-4 text-[10px] font-semibold tracking-widest text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 active:scale-95 dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                >
                  <i className="ph-bold ph-arrow-left mr-1.5 text-xs"></i>
                  Back to Directory
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  onClick={handleClearForm}
                  className="h-9 rounded-md border-gray-300 bg-white px-4 text-[10px] font-semibold tracking-widest text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                >
                  <i className="ph-bold ph-arrow-counter-clockwise mr-1.5 text-xs"></i>
                  Reset Form
                </Button>
              </div>
            }
          />
          <CardContent className="bg-white p-8 dark:bg-card">
            <form onSubmit={handleOpenConfirm} className="space-y-6">
              {/* Part 1: Full name */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold tracking-wider text-gray-600 dark:text-zinc-300">
                    First Name
                  </label>
                  <Input
                    type="text"
                    required
                    ref={fnameRef}
                    disabled={isLoading}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm transition-all focus-visible:border-pup-maroon focus-visible:ring-2 focus-visible:ring-pup-maroon/30 focus-visible:outline-none text-gray-900 dark:bg-card dark:text-zinc-50 dark:border-white/10 dark:focus-visible:ring-red-500/30 dark:focus-visible:border-red-500"
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
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold tracking-wider text-gray-600 dark:text-zinc-300">
                    Last Name
                  </label>
                  <Input
                    type="text"
                    required
                    disabled={isLoading}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm transition-all focus-visible:border-pup-maroon focus-visible:ring-2 focus-visible:ring-pup-maroon/30 focus-visible:outline-none text-gray-900 dark:bg-card dark:text-zinc-50 dark:border-white/10 dark:focus-visible:ring-red-500/30 dark:focus-visible:border-red-500"
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
              <div className="space-y-3">
                <label className="block text-[11px] font-semibold tracking-wider text-gray-600 dark:text-zinc-300">
                  Assigned Role
                </label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => setCreateForm(f => ({ ...f, role: f.role === "Staff" ? "" : "Staff" }))}
                    className={cn(
                      "h-12 w-full rounded-md border-2 text-[11px] font-semibold tracking-widest transition-all flex items-center justify-between gap-2 px-4",
                      createForm.role === "Staff"
                        ? "border-amber-600 bg-amber-600 text-white dark:border-amber-500 dark:bg-amber-600 shadow-md"
                        : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-500 hover:border-amber-200 hover:bg-amber-50 dark:bg-transparent dark:hover:bg-amber-500/5"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <i className={cn("text-base", createForm.role === "Staff" ? "ph-bold ph-check-circle" : "ph-bold ph-user")} />
                      <span>Registrar Staff</span>
                    </div>
                    {createForm.role === "Staff" && (
                      <span className="inline-flex items-center rounded-full border border-amber-500 bg-amber-800/50 px-2 py-0.5 text-[9px] font-semibold tracking-tight text-white shadow-sm">
                        <i className="ph-fill ph-user-gear mr-1 text-xs" />
                        Standard
                      </span>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => setCreateForm(f => ({ ...f, role: f.role === "Admin" ? "" : "Admin" }))}
                    className={cn(
                      "flex h-12 w-full items-center justify-between rounded-md border-2 text-[11px] font-semibold tracking-widest transition-all gap-2 px-4",
                      createForm.role === "Admin"
                        ? "border-pup-maroon bg-pup-maroon text-white dark:border-[#b94642] dark:bg-pup-darkMaroon shadow-md"
                        : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-500 hover:border-red-200 hover:bg-red-50 dark:bg-transparent dark:hover:bg-red-500/5"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <i className={cn("text-base", createForm.role === "Admin" ? "ph-bold ph-check-circle" : "ph-bold ph-shield")} />
                      <span>Administrator</span>
                    </div>
                    {createForm.role === "Admin" && (
                      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-900/50 dark:bg-red-950/80 px-2 py-0.5 text-[9px] font-semibold tracking-tight text-white dark:text-primary shadow-sm">
                        <i className="ph-fill ph-shield-star mr-1 text-xs" />
                        Full Control
                      </span>
                    )}
                  </Button>
                </div>
              </div>

              <Separator className="bg-gray-100 dark:bg-muted" />

              {/* Part 3: System Identifiers */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <i className="ph-bold ph-info cursor-help text-sm text-gray-400 hover:text-pup-maroon dark:hover:text-red-500 dark:text-zinc-500" />
                      </TooltipTrigger>
                      <TooltipContent 
                        side="right" 
                        sideOffset={10}
                        className="max-w-xs rounded-md border-red-900 bg-[#7a1e28] p-4 text-white shadow-2xl"
                      >
                        <p className="mb-1 text-[10px] font-semibold tracking-widest text-red-100">ID Convention</p>
                        <code className="block rounded-md border border-white/10 bg-white/5 p-2 font-mono text-[10px] text-white">
                          PUPREGISTRAR-[INITIALS][NUM]
                        </code>
                        <p className="mt-2 text-[9px] font-medium text-red-100/70">
                          Example: PUPREGISTRAR-JD101
                        </p>
                      </TooltipContent>
                    </Tooltip>
                    <label className="block text-[11px] font-semibold tracking-wider text-gray-600 dark:text-zinc-300">
                      Employee ID
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      required
                      disabled={isLoading}
                      className={cn(
                        "h-10 w-full rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-card px-3 text-sm transition-all focus-visible:border-pup-maroon focus-visible:ring-2 focus-visible:ring-pup-maroon/30 focus-visible:outline-none text-gray-900 dark:text-zinc-50 dark:text-zinc-100 dark:focus-visible:ring-red-500/30 dark:focus-visible:border-red-500",
                        lastAutoFilled.id &&
                          "border-emerald-500 ring-2 ring-emerald-500/20"
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
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <i className="ph-bold ph-info cursor-help text-sm text-gray-400 hover:text-pup-maroon dark:hover:text-red-500 dark:text-zinc-500" />
                      </TooltipTrigger>
                      <TooltipContent 
                        side="right" 
                        sideOffset={10}
                        className="max-w-xs rounded-md border-red-900 bg-[#7a1e28] p-4 text-white shadow-2xl"
                      >
                        <p className="mb-1 text-[10px] font-semibold tracking-widest text-red-100">Email Policy</p>
                        <div className="space-y-1">
                          <code className="block rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[9px] text-white/80">
                            admin.[lastname]@pup.local
                          </code>
                          <code className="block rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[9px] text-white/80">
                            staff.[lastname]@pup.local
                          </code>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                    <label className="block text-[11px] font-semibold tracking-wider text-gray-600 dark:text-zinc-300">
                      Email Address
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      required
                      disabled={isLoading}
                      className={cn(
                        "h-10 w-full rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-card px-3 text-sm transition-all focus-visible:border-pup-maroon focus-visible:ring-2 focus-visible:ring-pup-maroon/30 focus-visible:outline-none text-gray-900 dark:text-zinc-50 dark:text-zinc-100 dark:focus-visible:ring-red-500/30 dark:focus-visible:border-red-500",
                        lastAutoFilled.email &&
                          "border-emerald-500 ring-2 ring-emerald-500/20"
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
              <div className="flex items-center justify-end border-t border-gray-100 pt-6 dark:border-white/10">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-12 w-auto gap-2 rounded-md btn-brand-red hover:from-red-700 hover:to-red-900 hover:shadow-md px-16 text-xs font-semibold tracking-widest text-white shadow-lg active:scale-95 transition-all dark:shadow-none"
                >
                  {isLoading ? (
                    <>
                      <i className="ph-bold ph-circle-notch animate-spin text-lg"></i>
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="ph-bold ph-user-circle-plus text-lg"></i>
                      Create Account
                    </>
                  )}
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



