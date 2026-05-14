"use client"

import { useState } from "react"
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
import PageHeader from "@/components/shared/PageHeader"

export default function RegisterAccountTab({
  createForm,
  setCreateForm,
  onResetForm,
  onCreateAccount,
}) {
  const [showDefaultPw, setShowDefaultPw] = useState(false)
  const defaultPassword =
    process.env.NEXT_PUBLIC_DEFAULT_STAFF_PASSWORD || "pupstaff"

  return (
    <TooltipProvider delay={200}>
      <div className="animate-fade-in font-inter flex h-full w-full flex-col">
        <Card className="flex flex-1 flex-col overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm">
          <PageHeader
            icon="ph-user-plus"
            title="Account Registration"
            description="Provision new network credentials for registrar personnel and administrators."
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={onResetForm}
                className="h-10 rounded-brand border-gray-300 px-5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:border-pup-maroon hover:bg-red-50 hover:text-pup-maroon"
              >
                <i className="ph-bold ph-arrow-counter-clockwise mr-1.5"></i>
                CLEAR FORM
              </Button>
            }
          />

          <CardContent className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
            <div className="mx-auto max-w-5xl space-y-6">
              {/* Comprehensive Info Cards */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
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
                          <span className="text-pup-maroon">*</span>
                        </label>
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
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[11px] font-black tracking-wider text-gray-600 uppercase">
                          Assigned System Role{" "}
                          <span className="text-pup-maroon">*</span>
                        </label>
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
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="block text-[11px] font-black tracking-wider text-gray-600 uppercase">
                          First Name <span className="text-pup-maroon">*</span>
                        </label>
                        <Input
                          type="text"
                          required
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
                          Last Name <span className="text-pup-maroon">*</span>
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
                        <span className="text-pup-maroon">*</span>
                      </label>
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
