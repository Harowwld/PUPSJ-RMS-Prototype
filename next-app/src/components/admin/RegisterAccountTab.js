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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import PageHeader from "@/components/shared/PageHeader"
import { cn } from "@/lib/utils"

export default function RegisterAccountTab({
  createForm,
  setCreateForm,
  isLoading = false,
  onResetForm,
  onCreateAccount,
}) {
  const [showDefaultPw, setShowDefaultPw] = useState(false)
  const [lastAutoFilled, setLastAutoFilled] = useState({ id: false, email: false })
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const fnameRef = useRef(null)

  const defaultPassword =
    process.env.NEXT_PUBLIC_DEFAULT_STAFF_PASSWORD || "pupstaff"

  useEffect(() => {
    let timer
    if (showConfirmModal && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [showConfirmModal, countdown])

  const handleOpenConfirm = (e) => {
    e.preventDefault()
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
    // Small timeout to ensure state update has triggered before focusing
    setTimeout(() => {
        fnameRef.current?.focus()
    }, 0)
  }

  const suggestedId = useMemo(() => {
    if (!createForm.fname || !createForm.lname) return ""
    const initials = (createForm.fname[0] || "").toUpperCase() + (createForm.lname[0] || "").toUpperCase()
    return `PUPREGISTRAR-${initials}101`
  }, [createForm.fname, createForm.lname])

  const suggestedEmail = useMemo(() => {
    if (!createForm.lname || !createForm.role) return ""
    const role = createForm.role.toLowerCase()
    const name = createForm.lname.toLowerCase().replace(/[^a-z0-9]/g, "")
    return `${role}.${name}@pup.local`
  }, [createForm.lname, createForm.role])

  // Removed implicit auto-generation logic to improve UX control
  // Values are now suggested via placeholders and manual "Apply" buttons

  return (
    <TooltipProvider delay={200}>
      <div className="animate-fade-in font-inter flex h-full w-full flex-col">
        <Card className="flex flex-1 flex-col overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm">
          <PageHeader
            icon="ph-user-plus"
            title="Register Account"
            description="Create new user credentials for registrar personnel and administrators."
          />

          <CardContent className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
            <div className="mx-auto max-w-6xl space-y-6">
              {/* Main Registration Form */}
              <Card className="overflow-hidden rounded-brand border-gray-200 bg-white shadow-md">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 p-5 px-8">
                  <h3 className="flex items-center gap-2 text-sm font-black tracking-widest text-gray-900 uppercase">
                    <i className="ph-bold ph-list-plus text-pup-maroon"></i>{" "}
                    Registration Form
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    onClick={handleClearForm}
                    className="h-9 rounded-brand border-gray-300 bg-white px-4 text-[10px] font-black tracking-widest text-gray-600 uppercase shadow-sm transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon active:scale-95"
                  >
                    <i className="ph-bold ph-arrow-counter-clockwise mr-1.5 text-xs"></i>
                    RESET FORM
                  </Button>
                </div>
                <CardContent className="bg-white p-8">
                  <form onSubmit={handleOpenConfirm} className="space-y-8">
                    {/* Part 1: Full Name */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="block text-[11px] font-black tracking-wider text-gray-600 uppercase">
                          First Name
                        </label>
                        <Input
                          type="text"
                          required
                          ref={fnameRef}
                          disabled={isLoading}
                          className="h-10 w-full rounded-brand border border-gray-300 bg-white px-3 text-sm transition-all focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none text-gray-900"
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
                        <label className="block text-[11px] font-black tracking-wider text-gray-600 uppercase">
                          Last Name
                        </label>
                        <Input
                          type="text"
                          required
                          disabled={isLoading}
                          className="h-10 w-full rounded-brand border border-gray-300 bg-white px-3 text-sm transition-all focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none text-gray-900"
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
                      <label className="block text-[11px] font-black tracking-wider text-gray-600 uppercase">
                        Assigned Role
                      </label>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-3">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={isLoading}
                            onClick={() => setCreateForm(f => ({ ...f, role: f.role === "Staff" ? "" : "Staff" }))}
                            className={cn(
                              "h-12 w-full rounded-brand border-2 text-[11px] font-black tracking-widest uppercase transition-all",
                              createForm.role === "Staff"
                                ? "border-amber-600 bg-amber-50 text-amber-700 shadow-sm"
                                : "border-gray-200 text-gray-500 hover:border-amber-200 hover:bg-amber-50/30"
                            )}
                          >
                            <i className={cn("ph-bold mr-2 text-base", createForm.role === "Staff" ? "ph-user-gear" : "ph-user")} />
                            Registrar Staff
                          </Button>
                          {createForm.role === "Staff" && (
                            <div className="animate-in fade-in flex flex-col gap-1.5 px-1 duration-200">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black tracking-tight text-amber-700 uppercase shadow-sm">
                                  <i className="ph-fill ph-user-gear mr-1 text-xs" />
                                  Standard
                                </span>
                                <span className="text-[10px] font-bold text-gray-500">
                                  General operational access.
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="space-y-3">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={isLoading}
                            onClick={() => setCreateForm(f => ({ ...f, role: f.role === "Admin" ? "" : "Admin" }))}
                            className={cn(
                              "flex h-12 w-full items-center justify-center rounded-brand border-2 text-[11px] font-black tracking-widest uppercase transition-all",
                              createForm.role === "Admin"
                                ? "border-gray-300 bg-red-50 text-pup-maroon shadow-sm"
                                : "border-gray-200 text-gray-500 hover:border-red-200 hover:bg-red-50/30"
                            )}
                          >
                            <i className={cn("ph-bold mr-2 text-base", createForm.role === "Admin" ? "ph-shield-star" : "ph-shield")} />
                            Administrator
                          </Button>
                          {createForm.role === "Admin" && (
                            <div className="animate-in fade-in flex flex-col gap-1.5 px-1 duration-200">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-black tracking-tight text-pup-maroon uppercase shadow-sm">
                                  <i className="ph-fill ph-shield-star mr-1 text-xs" />
                                  Full Control
                                </span>
                                <span className="text-[10px] font-bold text-gray-500">
                                  Complete management access.
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-gray-100" />

                    {/* Part 3: System Identifiers */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <i className="ph-bold ph-info cursor-help text-sm text-gray-400 hover:text-pup-maroon" />
                            </TooltipTrigger>
                            <TooltipContent 
                              side="right" 
                              sideOffset={10}
                              className="max-w-xs rounded-[25px] border-red-900 bg-[#7a1e28] p-4 text-white shadow-2xl"
                            >
                              <p className="mb-1 text-[10px] font-black tracking-widest text-red-100 uppercase">ID Convention</p>
                              <code className="block rounded-xl border border-white/10 bg-black/20 p-2 font-mono text-[10px] text-white">
                                PUPREGISTRAR-[INITIALS][NUM]
                              </code>
                              <p className="mt-2 text-[9px] font-medium text-red-100/70">
                                Example: PUPREGISTRAR-JD101
                              </p>
                            </TooltipContent>
                          </Tooltip>
                          <label className="block text-[11px] font-black tracking-wider text-gray-600 uppercase">
                            Employee ID
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            required
                            disabled={isLoading}
                            className={cn(
                              "h-10 w-full rounded-brand border border-gray-300 bg-white px-3 text-sm transition-all focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none text-gray-900",
                              lastAutoFilled.id &&
                                "animate-pulse border-emerald-500 ring-2 ring-emerald-500/30"
                            )}
                            placeholder={suggestedId || "PUPREGISTRAR-[XXX]"}
                            value={createForm.id}
                            onChange={(e) =>
                              setCreateForm((f) => ({
                                ...f,
                                id: e.target.value,
                              }))
                            }
                          />
                          {suggestedId && createForm.id !== suggestedId && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={isLoading}
                                  onClick={() => {
                                    setCreateForm((f) => ({
                                      ...f,
                                      id: suggestedId,
                                    }))
                                    setLastAutoFilled(prev => ({ ...prev, id: true }))
                                    setTimeout(() => setLastAutoFilled(prev => ({ ...prev, id: false })), 1000)
                                  }}
                                  className="h-10 shrink-0 border-dashed border-gray-300/40 px-3 text-[10px] font-black tracking-widest text-pup-maroon uppercase hover:bg-red-50"
                                >
                                  <i className="ph-bold ph-magic-wand mr-1.5 text-sm" />
                                  APPLY
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent 
                                side="top" 
                                sideOffset={8}
                                className="rounded-[25px] border-red-900 bg-[#7a1e28] px-4 py-2 text-white shadow-xl"
                              >
                                Apply suggested ID
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <i className="ph-bold ph-info cursor-help text-sm text-gray-400 hover:text-pup-maroon" />
                            </TooltipTrigger>
                            <TooltipContent 
                              side="right" 
                              sideOffset={10}
                              className="max-w-xs rounded-[25px] border-red-900 bg-[#7a1e28] p-4 text-white shadow-2xl"
                            >
                              <p className="mb-1 text-[10px] font-black tracking-widest text-red-100 uppercase">Email Policy</p>
                              <div className="space-y-1">
                                <code className="block rounded-xl border border-white/10 bg-black/20 px-2 py-1 font-mono text-[9px] text-white/80">
                                  admin.[lastname]@pup.local
                                </code>
                                <code className="block rounded-xl border border-white/10 bg-black/20 px-2 py-1 font-mono text-[9px] text-white/80">
                                  staff.[lastname]@pup.local
                                </code>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                          <label className="block text-[11px] font-black tracking-wider text-gray-600 uppercase">
                            Email Address
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            type="email"
                            required
                            disabled={isLoading}
                            className={cn(
                              "h-10 w-full rounded-brand border border-gray-300 bg-white px-3 text-sm transition-all focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none text-gray-900",
                              lastAutoFilled.email &&
                                "animate-pulse border-emerald-500 ring-2 ring-emerald-500/30"
                            )}
                            placeholder={suggestedEmail || "[role].[name]@pup.local"}
                            value={createForm.email}
                            onChange={(e) =>
                              setCreateForm((f) => ({
                                ...f,
                                email: e.target.value,
                              }))
                            }
                          />
                          {suggestedEmail &&
                            createForm.email !== suggestedEmail && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    disabled={isLoading}
                                    onClick={() => {
                                      setCreateForm((f) => ({
                                        ...f,
                                        email: suggestedEmail,
                                      }))
                                      setLastAutoFilled(prev => ({ ...prev, email: true }))
                                      setTimeout(() => setLastAutoFilled(prev => ({ ...prev, email: false })), 1000)
                                    }}
                                    className="h-10 shrink-0 border-dashed border-gray-300/40 px-3 text-[10px] font-black tracking-widest text-pup-maroon uppercase hover:bg-red-50"
                                  >
                                    <i className="ph-bold ph-magic-wand mr-1.5 text-sm" />
                                    APPLY
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent 
                                  side="top" 
                                  sideOffset={8}
                                  className="rounded-[25px] border-red-900 bg-[#7a1e28] px-4 py-2 text-white shadow-xl"
                                >
                                  Apply suggested email
                                </TooltipContent>
                              </Tooltip>
                            )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center border-t border-gray-100 pt-8">
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="h-12 w-full gap-2 rounded-brand bg-linear-to-b from-red-800 to-pup-maroon border-4 border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md px-16 text-xs font-black tracking-widest text-white uppercase shadow-lg active:scale-95 sm:w-auto transition-all"
                      >
                        {isLoading ? (
                          <>
                            <i className="ph-bold ph-circle-notch animate-spin text-lg"></i>
                            CREATING...
                          </>
                        ) : (
                          <>
                            <i className="ph-bold ph-user-circle-plus text-lg"></i>
                            CREATE ACCOUNT
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Confirmation Modal */}
        <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
          <DialogContent className="sm:max-w-md rounded-[20px] border-gray-200 p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-black text-gray-900">
                <i className="ph-fill ph-warning-circle text-pup-maroon"></i>
                Confirm Registration
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm font-medium text-gray-500">
                Are you sure you want to register this account? Please review the provisioning details below.
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white font-bold text-pup-maroon shadow-sm">
                  {((createForm.fname?.[0] || "") + (createForm.lname?.[0] || "")).toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-[10px] font-black tracking-wider text-gray-400 uppercase">Full Name</p>
                  <p className="text-sm font-bold text-gray-900">{createForm.fname} {createForm.lname}</p>
                </div>
              </div>

              <Separator className="bg-gray-200" />

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <p className="text-[10px] font-black tracking-wider text-gray-400 uppercase">Employee ID</p>
                    <p className="mt-1 text-xs font-bold text-gray-900">{createForm.id}</p>
                 </div>
                 <div className="min-w-0">
                    <p className="text-[10px] font-black tracking-wider text-gray-400 uppercase">Institutional Email</p>
                    <p className="mt-1 truncate text-xs font-bold text-gray-900" title={createForm.email}>{createForm.email}</p>
                 </div>
              </div>

              <Separator className="bg-gray-200" />
              
              <div>
                <p className="mb-2 text-[10px] font-black tracking-wider text-gray-400 uppercase">Access Level</p>
                <div className="flex items-start gap-2">
                  <span className={cn(
                    "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-black tracking-tight uppercase shadow-sm",
                    createForm.role === "Admin" ? "border-red-200 bg-red-50 text-pup-maroon" : "border-amber-200 bg-amber-50 text-amber-700"
                  )}>
                    <i className={cn("ph-fill mr-1 text-xs", createForm.role === "Admin" ? "ph-shield-star" : "ph-user-gear")} />
                    {createForm.role === "Admin" ? "Administrator" : "Registrar Staff"}
                  </span>
                  <p className="text-[10px] leading-tight font-medium text-gray-600">
                    {createForm.role === "Admin" 
                      ? "Can manage system configs, backups, audits, and user accounts." 
                      : "Can process documents, manage students, and view layouts."}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4 flex items-center justify-end gap-3 px-0 pb-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
                className="h-10 flex-1 rounded-brand text-[10px] font-black tracking-widest text-gray-500 uppercase transition-all hover:bg-gray-100 sm:flex-none sm:px-8"
              >
                RETURN
              </Button>
              <Button
                type="button"
                disabled={countdown > 0 || isLoading}
                onClick={handleConfirmAction}
                className="h-10 flex-1 rounded-brand bg-linear-to-b from-red-800 to-pup-maroon border-4 border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md text-[10px] font-black tracking-widest text-white uppercase shadow-lg disabled:opacity-50 sm:flex-none sm:px-10 transition-all"
              >
                {countdown > 0 ? `CONFIRM (${countdown}s)` : "CONFIRM"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
