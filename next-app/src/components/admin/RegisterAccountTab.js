"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RegisterAccountTab({
  createForm,
  setCreateForm,
  onResetForm,
  onCreateAccount,
  onSwitchView,
}) {
  return (
    <div className="flex-1 bg-white rounded-brand border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden animate-fade-in font-inter">
      <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-red-50 text-pup-maroon flex items-center justify-center shrink-0 border border-red-100 shadow-sm">
            <i className="ph-duotone ph-user-plus text-lg"></i>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">
              New Account Creation
            </h3>
            <p className="text-xs font-medium text-gray-500 mt-0.5">
              Establish secure access credentials for new directory personnel.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSwitchView("directory")}
          className="h-9 gap-2 text-gray-600 font-bold border-gray-200 shadow-sm"
        >
          <i className="ph-bold ph-arrow-left text-base"></i> Back to Directory
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50/50">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-blue-50/50 border-blue-100 shadow-sm rounded-brand">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <i className="ph-fill ph-shield-check text-blue-600 text-lg"></i>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-blue-900">
                    Role-Based Access
                  </h4>
                  <p className="text-xs font-medium text-blue-700 mt-1 leading-relaxed">
                    Assign precise System Roles to enforce strict access scopes
                    across records operations.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-amber-50/50 border-amber-100 shadow-sm rounded-brand">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <i className="ph-fill ph-key text-amber-600 text-lg"></i>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900">
                    Default Credentials
                  </h4>
                  <p className="text-xs font-medium text-amber-700 mt-1 leading-relaxed">
                    New accounts are initialized with a temporary password:
                    <strong className="font-mono bg-amber-200/50 px-1 rounded mx-1">
                      pupstaff
                    </strong>
                    .{" "}Users will be prompted to change it upon first login.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-gray-200 shadow-sm rounded-brand overflow-hidden">
            <CardHeader className="border-b border-gray-100 bg-white p-6">
              <CardTitle className="text-base font-bold text-gray-900">
                Registration Form
              </CardTitle>
              <CardDescription className="text-xs font-medium text-gray-500">
                Ensure exact detail mapping to the employee HR profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 bg-white">
              <form onSubmit={onCreateAccount} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                      Employee ID <span className="text-pup-maroon">*</span>
                    </label>
                    <Input
                      type="text"
                      required
                      className="font-mono bg-white shadow-sm"
                      placeholder="e.g. 2023-001"
                      value={createForm.id}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, id: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                      System Role <span className="text-pup-maroon">*</span>
                    </label>
                    <select
                      required
                      className="flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={createForm.role}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, role: e.target.value }))
                      }
                    >
                      <option value="" disabled>
                        Select Authorized Role...
                      </option>
                      <option value="Admin">System Administrator</option>
                      <option value="Staff">Records Staff</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                      First Name <span className="text-pup-maroon">*</span>
                    </label>
                    <Input
                      type="text"
                      required
                      className="bg-white shadow-sm"
                      placeholder="Juan"
                      value={createForm.fname}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, fname: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                      Last Name <span className="text-pup-maroon">*</span>
                    </label>
                    <Input
                      type="text"
                      required
                      className="bg-white shadow-sm"
                      placeholder="Dela Cruz"
                      value={createForm.lname}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, lname: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    Institutional Username / Email{" "}
                    <span className="text-pup-maroon">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    className="bg-white shadow-sm"
                    placeholder="username@pup.edu.ph"
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </div>

                <div className="border-t border-gray-100 pt-6 mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onResetForm}
                    className="w-full sm:w-auto font-bold text-gray-600"
                  >
                    Clear Form
                  </Button>
                  <Button
                    type="submit"
                    className="w-full sm:w-auto bg-pup-maroon text-white hover:bg-red-900 shadow-md font-bold gap-2"
                  >
                    <i className="ph-bold ph-check text-lg"></i> Provision
                    Account
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
