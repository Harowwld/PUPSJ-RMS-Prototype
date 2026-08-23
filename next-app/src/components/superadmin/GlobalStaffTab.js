"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import PageHeader from "@/components/shared/PageHeader"
import { cn } from "@/lib/utils"

export default function GlobalStaffTab({ authUser, showToast }) {
  const [staff, setStaff] = useState([])
  const [offices, setOffices] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [search, setSearch] = useState("")
  const [officeFilter, setOfficeFilter] = useState("All")
  const [roleFilter, setRoleFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("Active") // "Active" | "Inactive"

  // Pagination states
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Reset page when search or filters change
  useEffect(() => {
    setPage(1)
  }, [search, officeFilter, roleFilter, statusFilter])

  // Dialogs
  const [formOpen, setFormOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedStaffId, setSelectedStaffId] = useState(null)
  
  const [form, setForm] = useState({
    id: "",
    office_id: "",
    fname: "",
    lname: "",
    role: "Staff",
    section: "",
    email: "",
    status: "Active"
  })
  
  const [submitLoading, setSubmitLoading] = useState(false)
  const [tempPassword, setTempPassword] = useState(null)
  const [pwDialogOpen, setPwDialogOpen] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [resStaff, resOffices] = await Promise.all([
        fetch("/api/staff?limit=500"),
        fetch("/api/offices")
      ])
      
      const jsonStaff = await resStaff.json()
      const jsonOffices = await resOffices.json()
      
      if (resStaff.ok && jsonStaff.ok) {
        setStaff(jsonStaff.data)
      }
      if (resOffices.ok && jsonOffices.ok) {
        setOffices(jsonOffices.data)
      }
    } catch (err) {
      showToast("Failed to load directory data", true)
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleOpenCreate = () => {
    setIsEditing(false)
    setSelectedStaffId(null)
    setForm({
      id: "",
      office_id: offices[0]?.id || "",
      fname: "",
      lname: "",
      role: "Staff",
      section: "Administration",
      email: "",
      status: "Active"
    })
    setFormOpen(true)
  }

  const handleOpenEdit = (member) => {
    setIsEditing(true)
    setSelectedStaffId(member.id)
    setForm({
      id: member.id,
      office_id: member.office_id || "",
      fname: member.fname,
      lname: member.lname,
      role: member.role,
      section: member.section || "",
      email: member.email,
      status: member.status
    })
    setFormOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitLoading(true)
    
    try {
      const url = isEditing ? `/api/staff/${selectedStaffId}` : "/api/staff"
      const method = isEditing ? "PATCH" : "POST"
      
      const payload = {
        id: form.id.trim(),
        fname: form.fname.trim(),
        lname: form.lname.trim(),
        role: form.role,
        section: form.section.trim(),
        email: form.email.trim(),
        office_id: form.office_id || null,
        status: form.status
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const json = await res.json()
      if (res.ok && json.ok) {
        showToast(isEditing ? "Personnel updated successfully" : "Personnel account created")
        setFormOpen(false)
        fetchData()
        
        if (!isEditing && json.defaultPassword) {
          setTempPassword(json.defaultPassword)
          setPwDialogOpen(true)
        }
      } else {
        showToast(json.error || "Failed to save personnel profile", true)
      }
    } catch (err) {
      showToast("Network error saving personnel", true)
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleToggleStatus = async (member) => {
    const nextStatus = member.status === "Active" ? "Inactive" : "Active"
    try {
      const res = await fetch(`/api/staff/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        showToast(`Personnel status set to ${nextStatus}`)
        fetchData()
      } else {
        showToast(json.error || "Failed to update status", true)
      }
    } catch (err) {
      showToast("Network error updating status", true)
    }
  }

  const filteredStaff = useMemo(() => {
    return staff.filter(member => {
      // Search query filter
      const matchesSearch = 
        member.fname.toLowerCase().includes(search.toLowerCase()) ||
        member.lname.toLowerCase().includes(search.toLowerCase()) ||
        member.email.toLowerCase().includes(search.toLowerCase()) ||
        member.id.toLowerCase().includes(search.toLowerCase())
      
      // Office filter
      const matchesOffice = 
        officeFilter === "All" ||
        (officeFilter === "global" && !member.office_id) ||
        member.office_id === officeFilter

      // Role filter
      const matchesRole =
        roleFilter === "All" ||
        member.role === roleFilter

      // Status filter
      const matchesStatus = member.status === statusFilter

      return matchesSearch && matchesOffice && matchesRole && matchesStatus
    })
  }, [staff, search, officeFilter, roleFilter, statusFilter])

  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedStaff = filteredStaff.slice(startIndex, endIndex)

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      <PageHeader
        title="Global Personnel Directory"
        description="Manage system access, tenant scoping, and authorization settings for all administrators and records staff."
        actions={
          <Button 
            onClick={handleOpenCreate}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl h-10 px-4 flex items-center gap-2 cursor-pointer dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900"
          >
            <i className="ti ti-user-plus text-base"></i>
            Register Staff
          </Button>
        }
      />

      {/* Tabs list Active vs Archived */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-1">
        <div className="flex gap-4">
          <button
            onClick={() => setStatusFilter("Active")}
            className={cn(
              "pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer outline-none",
              statusFilter === "Active"
                ? "border-slate-950 text-slate-950 dark:border-white dark:text-white"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-zinc-300"
            )}
          >
            Active Personnel ({staff.filter(s => s.status === "Active").length})
          </button>
          <button
            onClick={() => setStatusFilter("Inactive")}
            className={cn(
              "pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer outline-none",
              statusFilter === "Inactive"
                ? "border-slate-950 text-slate-950 dark:border-white dark:text-white"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-zinc-300"
            )}
          >
            Suspended/Archived ({staff.filter(s => s.status === "Inactive").length})
          </button>
        </div>
      </div>

      {/* Toolbar / Search */}
      <div className="flex items-center justify-between bg-white/40 dark:bg-zinc-900/30 p-3 rounded-2xl border border-gray-200/50 dark:border-white/5 backdrop-blur-xs">
        <div className="relative w-72">
          <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500"></i>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID or email..."
            className="pl-9 h-9 w-full bg-white/70 dark:bg-zinc-900/40 border border-gray-200 dark:border-white/5 rounded-xl text-xs"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={officeFilter}
            onChange={(e) => setOfficeFilter(e.target.value)}
            className="h-9 px-3 text-xs bg-white/70 dark:bg-zinc-900/40 border border-gray-200 dark:border-white/5 rounded-xl outline-none focus:border-slate-900 dark:text-white cursor-pointer"
          >
            <option value="All">All Offices</option>
            <option value="global">Super Administration (No Office)</option>
            {offices.map(o => (
              <option key={o.id} value={o.id}>{o.short_name}</option>
            ))}
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 px-3 text-xs bg-white/70 dark:bg-zinc-900/40 border border-gray-200 dark:border-white/5 rounded-xl outline-none focus:border-slate-900 dark:text-white cursor-pointer"
          >
            <option value="All">All Roles</option>
            <option value="SuperAdmin">Super Administrator</option>
            <option value="Admin">Administrator</option>
            <option value="Staff">Records Staff</option>
          </select>
        </div>
      </div>

      {/* Directory Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredStaff.length === 0 ? (
        <Card className="border border-dashed border-gray-200 dark:border-white/5 bg-white/10 rounded-2xl">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/5 flex items-center justify-center mb-3 shadow-xs">
              <i className="ti ti-users text-xl text-gray-400"></i>
            </div>
            <span className="font-semibold text-gray-800 dark:text-zinc-200">No personnel matches found</span>
            <span className="text-xs text-gray-500 mt-1">Try resetting the search terms or filters above.</span>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card flex flex-col flex-1">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 border-b-[0.5px] border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e]">
              <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-550 h-11 select-none">
                <th className="p-4 pl-6">Staff Name / Contact</th>
                <th className="p-4">Staff ID</th>
                <th className="p-4">Office Partition</th>
                <th className="p-4">Privilege Level</th>
                <th className="p-4">Active Section</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-medium text-gray-900 dark:text-zinc-100 bg-white dark:bg-[#1c1c1e]">
              {paginatedStaff.map((member) => {
                const office = offices.find(o => o.id === member.office_id)
                const isSelf = member.id === authUser?.id
                
                return (
                  <tr 
                    key={member.id}
                    className="group h-[52px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0 transition-all duration-200 hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 select-none"
                  >
                    <td className="py-2 px-4 pl-6 align-middle">
                      <div className="flex flex-col min-w-0">
                        <span className={cn("text-[14px] font-medium text-[#111111] dark:text-zinc-50 truncate", isSelf && "font-semibold")}>
                          {member.fname} {member.lname} {isSelf && "(You)"}
                        </span>
                        <span className="truncate text-[12px] font-normal text-[#8E8E93] dark:text-zinc-500 mt-[2px]">
                          {member.email}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-4 align-middle text-[13px] font-normal text-[#111111] dark:text-zinc-300">
                      {member.id}
                    </td>
                    <td className="py-2 px-4 align-middle">
                      {office ? (
                        <div 
                          className="inline-flex w-fit items-center justify-center rounded-[4px] px-[8px] py-[3px] text-[11px] font-semibold tracking-[0.04em] border-0 select-none"
                          style={{
                            backgroundColor: `${office.accent_color || "#800000"}15`,
                            color: office.accent_color || "#800000"
                          }}
                        >
                          {office.short_name}
                        </div>
                      ) : (
                        <span className="inline-flex w-fit items-center justify-center rounded-[4px] px-[8px] py-[3px] text-[11px] font-semibold tracking-[0.04em] bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 select-none">
                          Platform Level
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4 align-middle">
                      <div 
                        className={cn(
                          "inline-flex w-fit items-center justify-center rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium tracking-[0.04em]",
                          member.role === "SuperAdmin" || member.role === "Admin"
                            ? "bg-[#FEE2E2] text-[#991B1B] dark:bg-red-950/40 dark:text-red-400"
                            : "bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/40 dark:text-amber-400"
                        )}
                      >
                        {member.role}
                      </div>
                    </td>
                    <td className="py-2 px-4 align-middle text-[13px] font-normal text-[#111111] dark:text-zinc-300">
                      {member.section || "—"}
                    </td>
                    <td className="py-2 px-4 pr-6 align-middle text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(member)}
                          className="w-7 h-7 rounded-[6px] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/10 text-[#C7C7CC] dark:text-zinc-600 transition-colors hover:text-amber-500 dark:hover:text-amber-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center"
                        >
                          <i className="ph-bold ph-pencil-simple text-[16px]"></i>
                        </button>
                        {!isSelf && (
                          <button
                            onClick={() => handleToggleStatus(member)}
                            className="w-7 h-7 rounded-[6px] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/10 text-[#C7C7CC] dark:text-zinc-600 transition-colors hover:text-red-600 dark:hover:text-red-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center"
                          >
                            <i className="ph-bold ph-archive text-[16px]"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between border-t border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] p-4 px-6 rounded-b-2xl">
            <div className="flex items-center gap-6 text-xs text-gray-500 dark:text-zinc-400 select-none">
              <span>Showing {paginatedStaff.length} of {filteredStaff.length}</span>
              <div className="flex items-center gap-2">
                <span>Rows:</span>
                {[10, 20, 50, 100].map(sz => (
                  <button
                    key={sz}
                    onClick={() => {
                      setPageSize(sz)
                      setPage(1)
                    }}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                      pageSize === sz 
                        ? "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100" 
                        : "text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
                    )}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 select-none">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="text-xs text-gray-500 dark:text-zinc-400 disabled:opacity-40 cursor-pointer"
              >
                Prev
              </Button>
              <div className="h-8 w-8 rounded-lg border border-[#e5e5ea] dark:border-zinc-800 flex items-center justify-center text-xs font-bold text-gray-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                {page}
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={endIndex >= filteredStaff.length}
                onClick={() => setPage(p => p + 1)}
                className="text-xs text-gray-500 dark:text-zinc-400 disabled:opacity-40 cursor-pointer"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Register / Edit Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white border border-gray-200 dark:bg-zinc-900 dark:border-white/10 p-0 shadow-2xl overflow-hidden">
          <form onSubmit={handleSubmit}>
            <DialogHeader className="p-6 pb-4 border-b border-gray-100 dark:border-white/5">
              <DialogTitle className="text-lg font-bold text-gray-900 dark:text-zinc-50">
                {isEditing ? "Edit Personnel Profile" : "Register Personnel Account"}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mt-1 dark:text-zinc-400">
                Define the authorization scope, profile metadata, and security settings for the account.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-4">
              {/* Staff ID */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Staff ID / Username *
                </label>
                <Input
                  value={form.id}
                  onChange={(e) => setForm(prev => ({ ...prev, id: e.target.value }))}
                  disabled={isEditing}
                  placeholder="e.g. PUPREGISTRAR-004"
                  className="h-10 rounded-xl bg-white border border-gray-200 text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-white/10 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    First Name *
                  </label>
                  <Input
                    value={form.fname}
                    onChange={(e) => setForm(prev => ({ ...prev, fname: e.target.value }))}
                    placeholder="Elias"
                    className="h-10 rounded-xl bg-white border border-gray-200 text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-white/10 dark:text-white"
                    required
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Last Name *
                  </label>
                  <Input
                    value={form.lname}
                    onChange={(e) => setForm(prev => ({ ...prev, lname: e.target.value }))}
                    placeholder="Austria"
                    className="h-10 rounded-xl bg-white border border-gray-200 text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-white/10 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Official Email Address *
                </label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@pup.local"
                  className="h-10 rounded-xl bg-white border border-gray-200 text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-white/10 dark:text-white"
                  required
                />
              </div>

              {/* Office Scope Selection */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Office Partition / Tenant Scope
                </label>
                <select
                  value={form.office_id}
                  onChange={(e) => setForm(prev => ({ ...prev, office_id: e.target.value }))}
                  className="h-10 w-full px-3 text-xs bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-xl outline-none focus:border-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="">SuperAdmin / Global (No Office Scope)</option>
                  {offices.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Role Level */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Privilege Level
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
                    className="h-10 w-full px-3 text-xs bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-xl outline-none focus:border-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="SuperAdmin">SuperAdmin</option>
                    <option value="Admin">Administrator</option>
                    <option value="Staff">Records Staff</option>
                  </select>
                </div>

                {/* Section Tag */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Department Section
                  </label>
                  <Input
                    value={form.section}
                    onChange={(e) => setForm(prev => ({ ...prev, section: e.target.value }))}
                    placeholder="e.g. OSAS, Registrar"
                    className="h-10 rounded-xl bg-white border border-gray-200 text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-white/10 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 bg-gray-50 dark:bg-zinc-950/40 border-t border-gray-100 dark:border-white/5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setFormOpen(false)}
                className="text-xs text-gray-500 dark:text-zinc-400 font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitLoading}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl h-9 px-4 cursor-pointer dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900"
              >
                {submitLoading ? "Saving..." : isEditing ? "Save Changes" : "Register Personnel"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Temporary Password Dialog */}
      <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white border border-gray-200 dark:bg-zinc-900 dark:border-white/10 p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-zinc-50">
              Staff Credentials Generated
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
              Please share this temporary password securely with the user. They will be prompted to change it upon first login.
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-6 p-4 rounded-xl border border-dashed border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-zinc-950/20 text-center">
            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Temporary Password</span>
            <div className="font-mono text-xl font-bold text-pup-maroon dark:text-red-400 mt-1 select-all">
              {tempPassword}
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(tempPassword)
                showToast("Password copied to clipboard")
              }}
              variant="outline"
              className="text-xs border-gray-200 dark:border-white/10 h-9 font-semibold rounded-xl cursor-pointer"
            >
              Copy Password
            </Button>
            <Button
              onClick={() => setPwDialogOpen(false)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl h-9 px-4 cursor-pointer dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900"
            >
              Acknowledge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
