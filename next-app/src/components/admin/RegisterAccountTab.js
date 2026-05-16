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
import { cn } from "@/lib/utils"

export default function RegisterAccountTab({
  createForm,
  setCreateForm,
  onResetForm,
  onCreateAccount,
}) {
  const [showDefaultPw, setShowDefaultPw] = useState(false)
  const [showGuidelines, setShowGuidelines] = useState(false)
  const fnameRef = useRef(null)
  
  const defaultPassword =
    process.env.NEXT_PUBLIC_DEFAULT_STAFF_PASSWORD || "pupstaff"

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

  // Auto-generation logic: Suggest values as they type if fields are empty
  useEffect(() => {
    if (createForm.fname && createForm.lname && createForm.role) {
        setCreateForm(prev => {
            const next = { ...prev }
            let changed = false
            if (!prev.id && suggestedId) {
                next.id = suggestedId
                changed = true
            }
            if (!prev.email && suggestedEmail) {
                next.email = suggestedEmail
                changed = true
            }
            return changed ? next : prev
        })
    }
  }, [createForm.fname, createForm.lname, createForm.role, suggestedId, suggestedEmail, setCreateForm])

  return (
    <TooltipProvider delay={200}>
      <div className="animate-fade-in font-inter flex h-full w-full flex-col">
        <Card className="flex flex-1 flex-col overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm">
          <PageHeader
            icon="ph-user-plus"
            title="Account Registration"
            description="Provision new network credentials for registrar personnel and administrators."
            actions={
              <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowGuidelines(!showGuidelines)}
                    className={cn(
                        "h-10 rounded-brand px-4 text-xs font-black tracking-widest uppercase transition-all",
                        showGuidelines 
                          ? "bg-pup-maroon text-white hover:bg-red-900 hover:text-white" 
                          : "text-gray-500 hover:bg-gray-100"
                    )}
                >
                    <i className={cn("ph-bold mr-2 text-sm", showGuidelines ? "ph-info" : "ph-info")} />
                    {showGuidelines ? "HIDE GUIDELINES" : "SHOW GUIDELINES"}
                </Button>
                <Separator orientation="vertical" className="h-6 bg-gray-200" />
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearForm}
                    className="h-10 rounded-brand border-gray-300 px-5 text-xs font-black text-gray-700 shadow-sm transition-all hover:border-pup-maroon hover:bg-red-50 hover:text-pup-maroon uppercase tracking-widest"
                >
                    <i className="ph-bold ph-arrow-counter-clockwise mr-1.5 text-sm"></i>
                    CLEAR FORM
                </Button>
              </div>
            }
          />

          <CardContent className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
            <div className="mx-auto max-w-5xl space-y-6">
              
              {/* Collapsible Guidelines Section */}
              {showGuidelines && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {/* Registration Guidelines — Maroon Accent Card */}
                    <div className="group relative overflow-hidden rounded-xl border border-[#5c1520] bg-[#7a1e28] p-5 shadow-sm transition-all lg:col-span-2">
                    <i className="ph-duotone ph-identification-card pointer-events-none absolute -right-4 -bottom-4 rotate-12 text-[72px] text-white opacity-20" />
                    <div className="relative z-10 flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white">
                        <i className="ph-duotone ph-identification-card text-xl"></i>
                        </div>
                        <div className="min-w-0 flex-1">
                        <h4 className="mb-2 text-sm font-black tracking-wider text-[#f7c9ce] uppercase">
                            Registration Guidelines
                        </h4>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                            <p className="text-[10px] font-black tracking-widest text-[#f7c9ce]/70 uppercase">
                                ID Convention
                            </p>
                            <code className="block w-full rounded border border-white/10 bg-black/20 p-2 font-mono text-[10px] text-white">
                                PUPREGISTRAR-[XXX]
                            </code>
                            </div>
                            <div className="space-y-2">
                            <p className="text-[10px] font-black tracking-widest text-[#f7c9ce]/70 uppercase">
                                Email Policy
                            </p>
                            <div className="space-y-1">
                                <code className="block rounded border border-white/10 bg-black/20 px-2 py-1 font-mono text-[9px] text-white/80">
                                admin.[name]@pup.local
                                </code>
                                <code className="block rounded border border-white/10 bg-black/20 px-2 py-1 font-mono text-[9px] text-white/80">
                                staff.[name]@pup.local
                                </code>
                            </div>
                            </div>
                        </div>
                        </div>
                    </div>
                    </div>

                    {/* Temporary Access — Light Card */}
                    <div className="group relative overflow-hidden rounded-xl border border-[#7a1e28]/15 bg-[#fdf6f6] p-5 shadow-sm transition-all">
                    <i className="ph-duotone ph-lock-key pointer-events-none absolute -right-3 -bottom-3 rotate-12 text-[60px] text-[#7a1e28] opacity-10" />
                    <div className="relative z-10 flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#7a1e28]/10 bg-[#7a1e28]/5 text-[#7a1e28]">
                        <i className="ph-duotone ph-lock-key text-xl"></i>
                        </div>
                        <div className="min-w-0 flex-1">
                        <h4 className="mb-2 text-sm font-black tracking-wider text-[#9e5a62] uppercase">
                            Temporary Access
                        </h4>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between rounded border border-[#7a1e28]/10 bg-white/50 p-2">
                            <span className="text-[10px] font-bold text-[#b07078]">
                                Password
                            </span>
                            <div className="flex items-center gap-1.5">
                                <code className="font-mono text-[11px] font-black text-[#7a1e28]">
                                {showDefaultPw ? defaultPassword : "••••••••"}
                                </code>
                                <button
                                type="button"
                                onClick={() => setShowDefaultPw(!showDefaultPw)}
                                className="text-[#7a1e28] transition-colors hover:text-[#5c1520]"
                                >
                                <i
                                    className={`ph-bold ${showDefaultPw ? "ph-eye-slash" : "ph-eye"} text-xs`}
                                ></i>
                                </button>
                            </div>
                            </div>
                            <p className="text-[10px] leading-tight font-bold text-[#b07078]">
                            <i className="ph-fill ph-warning-circle mr-1 text-[#7a1e28]" />
                            Personnel are required to update these credentials
                            upon initial system entry.
                            </p>
                        </div>
                        </div>
                    </div>
                    </div>
                </div>
              )}

              {/* Main Registration Form */}
              <Card className="overflow-hidden rounded-brand border-gray-200 bg-white shadow-md">
                <div className="border-b border-gray-100 bg-gray-50/50 p-5">
                  <h3 className="flex items-center gap-2 text-sm font-black tracking-widest text-gray-900 uppercase">
                    <i className="ph-bold ph-list-plus text-pup-maroon"></i>{" "}
                    Enrollment Form
                  </h3>
                </div>
                <CardContent className="bg-white p-8">
                  <form onSubmit={onCreateAccount} className="space-y-8">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="block text-[11px] font-black tracking-wider text-gray-600 uppercase">
                          Employee Identification{" "}
                          <span className="text-pup-maroon" aria-label="Required">*</span>
                        </label>
                        <div className="flex gap-2">
                            <Input
                            type="text"
                            required
                            className="h-11 rounded-brand border-gray-300 bg-white font-mono text-sm transition-all focus-visible:ring-pup-maroon"
                            placeholder="PUPREGISTRAR-[XXX]"
                            value={createForm.id}
                            onChange={(e) =>
                                setCreateForm((f) => ({ ...f, id: e.target.value }))
                            }
                            />
                            {suggestedId && createForm.id !== suggestedId && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setCreateForm(f => ({ ...f, id: suggestedId }))}
                                            className="h-11 border-dashed border-pup-maroon/40 px-3 text-[10px] font-black text-pup-maroon hover:bg-red-50 shrink-0 uppercase tracking-widest"
                                        >
                                            <i className="ph-bold ph-magic-wand mr-1.5 text-sm" />
                                            APPLY
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Apply Convention: {suggestedId}</TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                        <p className="text-[10px] font-medium text-gray-400 italic px-1">
                            Convention: PUPREGISTRAR-[INITIALS][NUM]
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[11px] font-black tracking-wider text-gray-600 uppercase">
                          Assigned System Role{" "}
                          <span className="text-pup-maroon" aria-label="Required">*</span>
                        </label>
                        <div className="relative">
                          <select
                            required
                            className="h-11 w-full rounded-brand border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-900 shadow-sm transition-all focus:border-pup-maroon focus:ring-2 focus:ring-pup-maroon focus:outline-none"
                            value={createForm.role}
                            onChange={(e) =>
                              setCreateForm((f) => ({
                                ...f,
                                role: e.target.value,
                              }))
                            }
                          >
                            <option value="" disabled>
                              Select Authorization Level...
                            </option>
                            <option value="Admin">Administrator</option>
                            <option value="Staff">Registrar Staff</option>
                          </select>
                        </div>
                        {createForm.role && (
                          <div className="flex flex-col gap-1.5 px-1 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-tight shadow-sm",
                                createForm.role === "Admin" 
                                  ? "bg-pup-maroon text-white border border-red-900" 
                                  : "bg-blue-600 text-white border border-blue-700"
                              )}>
                                <i className={cn("ph-fill mr-1", createForm.role === "Admin" ? "ph-shield-star" : "ph-user-gear")} />
                                {createForm.role === "Admin" ? "Full Control" : "Standard Access"}
                              </span>
                              <span className="text-[10px] font-bold text-gray-500 italic">
                                {createForm.role === "Admin" 
                                  ? "High-privilege account." 
                                  : "Operational personnel account."}
                              </span>
                            </div>
                            <p className="text-[10px] leading-relaxed font-medium text-gray-400">
                              {createForm.role === "Admin" 
                                ? "Can manage system configs, backups, audits, and user accounts." 
                                : "Can process documents, manage students, and view layouts."}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="block text-[11px] font-black tracking-wider text-gray-600 uppercase">
                          First Name <span className="text-pup-maroon" aria-label="Required">*</span>
                        </label>
                        <Input
                          type="text"
                          required
                          ref={fnameRef}
                          className="h-11 rounded-brand border-gray-300 bg-white text-sm transition-all focus-visible:ring-pup-maroon"
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
                          Last Name <span className="text-pup-maroon" aria-label="Required">*</span>
                        </label>
                        <Input
                          type="text"
                          required
                          className="h-11 rounded-brand border-gray-300 bg-white text-sm transition-all focus-visible:ring-pup-maroon"
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

                    <div className="space-y-2">
                      <label className="block text-[11px] font-black tracking-wider text-gray-600 uppercase">
                        Institutional Identifier / Email{" "}
                        <span className="text-pup-maroon" aria-label="Required">*</span>
                      </label>
                      <div className="flex gap-2">
                        <Input
                            type="email"
                            required
                            className="h-11 rounded-brand border-gray-300 bg-white text-sm transition-all focus-visible:ring-pup-maroon"
                            placeholder="[role].[name]@pup.local"
                            value={createForm.email}
                            onChange={(e) =>
                            setCreateForm((f) => ({
                                ...f,
                                email: e.target.value,
                            }))
                            }
                        />
                        {suggestedEmail && createForm.email !== suggestedEmail && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setCreateForm(f => ({ ...f, email: suggestedEmail }))}
                                        className="h-11 border-dashed border-pup-maroon/40 px-3 text-[10px] font-black text-pup-maroon hover:bg-red-50 shrink-0 uppercase tracking-widest"
                                    >
                                        <i className="ph-bold ph-magic-wand mr-1.5 text-sm" />
                                        APPLY
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Apply Policy: {suggestedEmail}</TooltipContent>
                            </Tooltip>
                        )}
                      </div>
                      <p className="text-[10px] font-medium text-gray-400 italic px-1">
                        Policy: [role].[lastname]@pup.local
                      </p>
                    </div>

                    <div className="flex flex-col-reverse items-center justify-end gap-3 border-t border-gray-100 pt-6 sm:flex-row">
                      <Button
                        type="submit"
                        className="h-12 w-full gap-2 rounded-brand bg-pup-maroon px-8 text-xs font-black tracking-widest text-white uppercase shadow-lg transition-all hover:bg-red-900 active:scale-95 sm:w-auto"
                      >
                        <i className="ph-bold ph-user-circle-plus text-lg"></i>
                        REGISTER ACCOUNT
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
