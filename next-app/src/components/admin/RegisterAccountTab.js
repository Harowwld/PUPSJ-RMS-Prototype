"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function RegisterAccountTab({
  createForm,
  setCreateForm,
  onResetForm,
  onCreateAccount,
}) {
  const [showDefaultPw, setShowDefaultPw] = useState(false);
  const defaultPassword = process.env.NEXT_PUBLIC_DEFAULT_STAFF_PASSWORD || "pupstaff";

  return (
    <TooltipProvider delay={200}>
      <div className="flex flex-col w-full h-full gap-4 animate-fade-in font-inter">
        <Card className="flex-1 bg-white rounded-brand border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-pup-maroon shadow-sm shrink-0">
                <i className="ph-duotone ph-user-plus text-2xl"></i>
              </div>
              <div>
                <CardTitle className="text-xl font-black text-gray-900 tracking-tight">
                  Account Registration
                </CardTitle>
                <CardDescription className="font-medium text-gray-500">
                  Provision new network credentials for registrar personnel and administrators.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={onResetForm}
                className="h-10 px-5 font-bold text-sm border-gray-300 text-gray-700 hover:text-pup-maroon hover:bg-red-50 hover:border-pup-maroon rounded-brand shadow-sm transition-all"
              >
                <i className="ph-bold ph-arrow-counter-clockwise mr-1.5"></i>
                CLEAR FORM
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Comprehensive Info Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Registration Guidelines — Maroon Accent Card */}
                <div className="lg:col-span-2 relative rounded-xl p-5 overflow-hidden border border-[#5c1520] bg-[#7a1e28] shadow-sm group transition-all">
                  <i className="ph-duotone ph-identification-card absolute -right-4 -bottom-4 text-[72px] opacity-20 text-white rotate-12 pointer-events-none" />
                  <div className="relative z-10 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0 border border-white/20">
                      <i className="ph-duotone ph-identification-card text-xl"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black text-[#f7c9ce] uppercase tracking-wider mb-2">Registration Guidelines</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-[#f7c9ce]/70 uppercase tracking-widest">ID Convention</p>
                          <code className="block w-full bg-black/20 p-2 rounded border border-white/10 font-mono text-[10px] text-white">PUPREGISTRAR-[XXX]</code>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-[#f7c9ce]/70 uppercase tracking-widest">Email Policy</p>
                          <div className="space-y-1">
                            <code className="block bg-black/20 px-2 py-1 rounded border border-white/10 font-mono text-[9px] text-white/80">admin.[name]@pup.local</code>
                            <code className="block bg-black/20 px-2 py-1 rounded border border-white/10 font-mono text-[9px] text-white/80">staff.[name]@pup.local</code>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Temporary Access — Light Card */}
                <div className="relative rounded-xl p-5 overflow-hidden border border-[#7a1e28]/15 bg-[#fdf6f6] shadow-sm group transition-all">
                  <i className="ph-duotone ph-lock-key absolute -right-3 -bottom-3 text-[60px] opacity-10 text-[#7a1e28] rotate-12 pointer-events-none" />
                  <div className="relative z-10 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#7a1e28]/5 text-[#7a1e28] flex items-center justify-center shrink-0 border border-[#7a1e28]/10">
                      <i className="ph-duotone ph-lock-key text-xl"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black text-[#9e5a62] uppercase tracking-wider mb-2">Temporary Access</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between bg-white/50 p-2 rounded border border-[#7a1e28]/10">
                          <span className="text-[10px] font-bold text-[#b07078]">Password</span>
                          <div className="flex items-center gap-1.5">
                            <code className="font-mono text-[11px] font-black text-[#7a1e28]">
                              {showDefaultPw ? defaultPassword : "••••••••"}
                            </code>
                            <button
                              type="button"
                              onClick={() => setShowDefaultPw(!showDefaultPw)}
                              className="text-[#7a1e28] hover:text-[#5c1520] transition-colors"
                            >
                              <i className={`ph-bold ${showDefaultPw ? "ph-eye-slash" : "ph-eye"} text-xs`}></i>
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] font-bold text-[#b07078] leading-tight">
                          <i className="ph-fill ph-warning-circle mr-1 text-[#7a1e28]" />
                          Personnel are required to update these credentials upon initial system entry.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Registration Form */}
              <Card className="border-gray-200 shadow-md rounded-brand overflow-hidden bg-white">
                <div className="bg-gray-50/50 border-b border-gray-100 p-5">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <i className="ph-bold ph-list-plus text-pup-maroon"></i> Enrollment Form
                  </h3>
                </div>
                <CardContent className="p-8 bg-white">
                  <form onSubmit={onCreateAccount} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-[11px] font-black text-gray-600 uppercase tracking-wider">
                          Employee Identification <span className="text-pup-maroon">*</span>
                        </label>
                        <Input
                          type="text"
                          required
                          className="font-mono bg-white border-gray-300 rounded-brand text-sm h-11 focus-visible:ring-pup-maroon transition-all"
                          placeholder="PUPREGISTRAR-[XXX]"
                          value={createForm.id}
                          onChange={(e) =>
                            setCreateForm((f) => ({ ...f, id: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[11px] font-black text-gray-600 uppercase tracking-wider">
                          Assigned System Role <span className="text-pup-maroon">*</span>
                        </label>
                        <select
                          required
                          className="h-11 w-full rounded-brand border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-900 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon"
                          value={createForm.role}
                          onChange={(e) =>
                            setCreateForm((f) => ({ ...f, role: e.target.value }))
                          }
                        >
                          <option value="" disabled>Select Authorization Level...</option>
                          <option value="Admin">Administrator</option>
                          <option value="Staff">Registrar Staff</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-[11px] font-black text-gray-600 uppercase tracking-wider">
                          First Name <span className="text-pup-maroon">*</span>
                        </label>
                        <Input
                          type="text"
                          required
                          className="bg-white border-gray-300 rounded-brand text-sm h-11 focus-visible:ring-pup-maroon transition-all"
                          placeholder="Juan"
                          value={createForm.fname}
                          onChange={(e) =>
                            setCreateForm((f) => ({ ...f, fname: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[11px] font-black text-gray-600 uppercase tracking-wider">
                          Last Name <span className="text-pup-maroon">*</span>
                        </label>
                        <Input
                          type="text"
                          required
                          className="bg-white border-gray-300 rounded-brand text-sm h-11 focus-visible:ring-pup-maroon transition-all"
                          placeholder="Dela Cruz"
                          value={createForm.lname}
                          onChange={(e) =>
                            setCreateForm((f) => ({ ...f, lname: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[11px] font-black text-gray-600 uppercase tracking-wider">
                        Institutional Identifier / Email <span className="text-pup-maroon">*</span>
                      </label>
                      <Input
                        type="email"
                        required
                        className="bg-white border-gray-300 rounded-brand text-sm h-11 focus-visible:ring-pup-maroon transition-all"
                        placeholder="[role].[name]@pup.local"
                        value={createForm.email}
                        onChange={(e) =>
                          setCreateForm((f) => ({ ...f, email: e.target.value }))
                        }
                      />
                    </div>

                    <div className="pt-6 border-t border-gray-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                      <Button
                        type="submit"
                        className="w-full sm:w-auto h-12 px-8 bg-pup-maroon text-white hover:bg-red-900 shadow-lg font-black text-xs uppercase tracking-widest rounded-brand gap-2 transition-all active:scale-95"
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
  );
}
