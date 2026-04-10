"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RegisterAccountTab({
  createForm,
  setCreateForm,
  onResetForm,
  onCreateAccount,
}) {
  const [showDefaultPw, setShowDefaultPw] = useState(false);
  const defaultPassword = process.env.NEXT_PUBLIC_DEFAULT_STAFF_PASSWORD || "pupstaff";

  return (
    <div className="flex flex-col w-full h-full gap-4 animate-fade-in font-inter">
      <div className="flex-1 bg-white rounded-brand border border-gray-200 shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-linear-to-br from-blue-50 to-white border-blue-200 shadow-sm rounded-brand">
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <i className="ph-fill ph-shield-check text-blue-600 text-xl"></i>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-blue-900">
                      Role-Based Access
                    </h4>
                    <p className="text-xs font-medium text-blue-700 mt-1 leading-relaxed">
                      Choose a role based on required permissions before account activation.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-bold text-amber-800">
                        Admin: full system control
                      </span>
                      <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 font-bold text-sky-800">
                        Staff: records operations only
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-linear-to-br from-amber-50 to-white border-amber-200 shadow-sm rounded-brand">
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <i className="ph-fill ph-key text-amber-600 text-xl"></i>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">
                      Default Credentials
                    </h4>
                    <div className="text-xs font-medium text-amber-700 mt-1 leading-relaxed space-y-2">
                      <p>
                        New accounts are created with a temporary password.
                      </p>
                      <p className="flex items-center gap-1.5">
                        Password:
                        <strong className="bg-amber-200/50 px-2 py-0.5 rounded font-mono text-[11px] border border-amber-300/30">
                          {showDefaultPw ? defaultPassword : "••••••••"}
                        </strong>
                        <button
                          type="button"
                          onClick={() => setShowDefaultPw(!showDefaultPw)}
                          className="w-6 h-6 inline-flex items-center justify-center rounded-md hover:bg-amber-100 text-amber-800 transition-colors"
                          title={showDefaultPw ? "Hide password" : "Show password"}
                        >
                          <i className={`ph-bold ${showDefaultPw ? "ph-eye-slash" : "ph-eye"} text-xs`}></i>
                        </button>
                      </p>
                      <p className="font-semibold text-amber-800">
                        Require users to change password on first login.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Registration Form */}
            <Card className="border-gray-200 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="border-b border-gray-100 bg-linear-to-r from-red-50/80 via-white to-red-50/60 px-5 py-4">
                <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="inline-flex items-center gap-2">
                    <i className="ph-duotone ph-user-plus text-pup-maroon text-xl"></i>
                    Account Registration
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 bg-white">
                <form onSubmit={onCreateAccount} className="space-y-6">
                  {/* Employee ID & Role Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                        Employee ID <span className="text-pup-maroon">*</span>
                      </label>
                      <Input
                        type="text"
                        required
                        className="h-10 font-mono bg-white border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                        placeholder="e.g. 2023-001"
                        value={createForm.id}
                        onChange={(e) =>
                          setCreateForm((f) => ({ ...f, id: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                        System Role <span className="text-pup-maroon">*</span>
                      </label>
                      <select
                        required
                        className="h-10 w-full rounded-brand border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon"
                        value={createForm.role}
                        onChange={(e) =>
                          setCreateForm((f) => ({ ...f, role: e.target.value }))
                        }
                      >
                        <option value="" disabled>
                          Select Authorized Role...
                        </option>
                        <option value="Admin">Admin</option>
                        <option value="Staff">Staff</option>
                      </select>
                    </div>
                  </div>

                  {/* Name Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                        First Name <span className="text-pup-maroon">*</span>
                      </label>
                      <Input
                        type="text"
                        required
                        className="h-10 bg-white border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
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
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                        Last Name <span className="text-pup-maroon">*</span>
                      </label>
                      <Input
                        type="text"
                        required
                        className="h-10 bg-white border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
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

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Institutional Username / Email{" "}
                      <span className="text-pup-maroon">*</span>
                    </label>
                    <Input
                      type="email"
                      required
                      className="h-10 bg-white border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                      placeholder="username@pup.edu.ph"
                      value={createForm.email}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, email: e.target.value }))
                      }
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onResetForm}
                      className="w-full sm:w-auto h-11 px-6 font-bold text-gray-600 border-gray-300 rounded-brand hover:bg-gray-50"
                    >
                      <i className="ph-bold ph-arrow-counter-clockwise mr-2"></i>
                      Clear Form
                    </Button>
                    <Button
                      type="submit"
                      className="w-full sm:w-auto h-11 px-6 bg-pup-maroon text-white hover:bg-red-900 shadow-md font-bold rounded-brand gap-2"
                    >
                      <i className="ph-bold ph-check-circle text-lg"></i>
                      Create Account
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
