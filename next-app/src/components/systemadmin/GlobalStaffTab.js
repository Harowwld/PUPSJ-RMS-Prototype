"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
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
import { Select } from "@/components/ui/select"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"

export default function GlobalStaffTab({ authUser, showToast }) {
  const router = useRouter()
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
        section: (form.section && form.section.trim()) || "Administration",
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
      const matchesStatus = statusFilter === "Active" 
        ? member.status === "Active" 
        : (member.status === "Inactive" || member.status === "Archived")

      return matchesSearch && matchesOffice && matchesRole && matchesStatus
    })
  }, [staff, search, officeFilter, roleFilter, statusFilter])

  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedStaff = filteredStaff.slice(startIndex, endIndex)

  const [selectedKpi, setSelectedKpi] = useState(null)
  const statCardsRef = useRef(null)

  useEffect(() => {
    if (!selectedKpi) return
    const handleClickOutside = (e) => {
      if (statCardsRef.current && !statCardsRef.current.contains(e.target)) {
        setSelectedKpi(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [selectedKpi])

  const stats = useMemo(() => {
    const total = staff.length
    const active = staff.filter((s) => s.status === "Active").length
    const inactive = staff.filter((s) => s.status !== "Active").length
    const admins = staff.filter(
      (s) => s.role === "Admin" || s.role === "SystemAdmin" || s.role === "SuperAdmin"
    ).length
    const regular = staff.filter((s) => s.role === "Staff").length
    const assignedOffices = new Set(staff.map((s) => s.office_id).filter(Boolean)).size
    return {
      total,
      active,
      inactive,
      admins,
      regular,
      assignedOffices,
    }
  }, [staff])

  const hasActiveFilters = search !== "" || officeFilter !== "All" || roleFilter !== "All"

  const handleClearFilters = () => {
    setSearch("")
    setOfficeFilter("All")
    setRoleFilter("All")
    setPage(1)
  }

  const statCardsData = [
    {
      key: "total",
      label: "Total Personnel",
      value: stats.total,
      sublabel: `${stats.assignedOffices} campus partitions represented`,
      color: "blue",
      shape1: "from-[#0055FF]/40 to-[#007AFF]/0",
      shape2: "from-[#14C8FF]/30 to-[#007AFF]/0",
      bg: "from-[#14C8FF] via-[#007AFF] to-[#0055FF] dark:from-[#007AFF] dark:to-[#0033aa]",
      glass: "glass-stat-card-blue",
    },
    {
      key: "active",
      label: "Active Personnel",
      value: stats.active,
      sublabel: `${stats.inactive} suspended or archived`,
      color: "emerald",
      shape1: "from-[#047857]/40 to-[#059669]/0",
      shape2: "from-[#34d399]/30 to-[#059669]/0",
      bg: "from-[#34d399] via-[#059669] to-[#047857] dark:from-[#059669] dark:to-[#024e37]",
      glass: "glass-stat-card-green",
    },
    {
      key: "admins",
      label: "Administrators",
      value: stats.admins,
      sublabel: `${stats.regular} standard records staff`,
      color: "amber",
      shape1: "from-[#b45309]/40 to-[#d97706]/0",
      shape2: "from-[#fbbf24]/30 to-[#d97706]/0",
      bg: "from-[#fbbf24] via-[#d97706] to-[#b45309] dark:from-[#d97706] dark:to-[#78350f]",
      glass: "glass-stat-card-orange",
    },
  ]

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up font-inter">
      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-muted" />
          ))}
        </div>
      ) : (
        <div
          ref={statCardsRef}
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 items-start relative z-20 transition-all duration-500"
        >
          {statCardsData.map((stat) => (
            <div
              key={stat.key}
              className={cn(
                "relative group rounded-xl",
                selectedKpi === stat.key ? "z-30" : "z-10"
              )}
            >
              <div
                onClick={() => setSelectedKpi(selectedKpi === stat.key ? null : stat.key)}
                className={cn(
                  "relative overflow-hidden rounded-xl border-none p-5 cursor-pointer bg-gradient-to-br select-none",
                  stat.bg,
                  stat.glass
                )}
              >
                <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none z-0">
                  <div
                    className={cn("absolute bottom-0 left-0 w-[70%] h-[80%] bg-gradient-to-tr pointer-events-none", stat.shape1)}
                    style={{ clipPath: "polygon(0% 100%, 100% 100%, 0% 0%)" }}
                  />
                  <div
                    className={cn("absolute bottom-0 left-0 w-[50%] h-[60%] bg-gradient-to-tr pointer-events-none", stat.shape2)}
                    style={{ clipPath: "polygon(0% 100%, 100% 100%, 0% 25%)" }}
                  />
                </div>

                <div className="relative z-10">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="mb-1 flex items-center gap-1.5 text-[14px] font-medium text-white">
                        {stat.label}
                      </div>
                      <div className="text-[48px] font-semibold text-white tracking-tight">
                        {stat.value.toLocaleString()}
                      </div>
                      <div className="mt-1 text-[13px] font-normal text-white">
                        {stat.sublabel}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Absolute details container */}
              <div
                className={cn(
                  "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl bg-gradient-to-br p-5 shadow-2xl transition-all duration-300 ease-in-out origin-top",
                  stat.bg,
                  selectedKpi === stat.key ? "scale-y-100 opacity-100 translate-y-0" : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {stat.key === "total" && (
                  <div className="space-y-3 text-white">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Total Accounts</span>
                        <span className="text-lg font-black">{stats.total}</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Offices Covered</span>
                        <span className="text-lg font-black">{stats.assignedOffices}</span>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-xs text-white/90 leading-relaxed">
                      Directory registry of all personnel across all campus partitions and centralized administrative systems.
                    </div>
                  </div>
                )}
                {stat.key === "active" && (
                  <div className="space-y-3 text-white">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Active Staff</span>
                        <span className="text-lg font-black">{stats.active}</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Suspended</span>
                        <span className="text-lg font-black">{stats.inactive}</span>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-xs text-white/90 leading-relaxed">
                      Personnel in good standing with active operational privileges and live credentials.
                    </div>
                  </div>
                )}
                {stat.key === "admins" && (
                  <div className="space-y-3 text-white">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Admin Level</span>
                        <span className="text-lg font-black">{stats.admins}</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Regular Staff</span>
                        <span className="text-lg font-black">{stats.regular}</span>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-xs text-white/90 leading-relaxed">
                      Staff members holding elevated administrator or system administrator privileges.
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Table Card with Header, Active Filter Chips & Toolbar */}
      <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none overflow-hidden">
        <PageHeader
          icon="ph-users"
          title="Global Personnel Directory"
          description="Manage system access, office assignments, and authorization settings for all administrators and records staff."
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <Button
              onClick={handleOpenCreate}
              className="flex h-10 items-center justify-center rounded-xl! btn-brand-red text-white font-semibold text-xs active:scale-95 transition-all cursor-pointer px-5 shadow-xs"
            >
              <i className="ph-bold ph-user-plus mr-1.5 text-[14px]"></i>
              Register Staff
            </Button>
          }
        />

        {/* Active Filter Chips Row */}
        {hasActiveFilters && (
          <div className="flex-none border-b border-gray-100 bg-white px-6 py-3 animate-in fade-in slide-in-from-top-1 duration-normal dark:border-white/10 dark:bg-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500">
                Active filters:
              </span>
              {search && (
                <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                  Search: {search}
                  <button
                    onClick={() => {
                      setSearch("")
                      setPage(1)
                    }}
                    className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                  >
                    ×
                  </button>
                </div>
              )}
              {officeFilter !== "All" && (
                <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                  Office: {officeFilter === "global" ? "System Administration" : offices.find((o) => o.id === officeFilter)?.short_name || officeFilter}
                  <button
                    onClick={() => {
                      setOfficeFilter("All")
                      setPage(1)
                    }}
                    className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                  >
                    ×
                  </button>
                </div>
              )}
              {roleFilter !== "All" && (
                <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                  Role: {roleFilter === "SystemAdmin" ? "System Admin" : roleFilter}
                  <button
                    onClick={() => {
                      setRoleFilter("All")
                      setPage(1)
                    }}
                    className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                  >
                    ×
                  </button>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-auto text-[12px] font-medium text-gray-400 dark:text-zinc-500 border-0 bg-transparent hover:bg-transparent shadow-none p-0 hover:text-red-600 dark:hover:text-red-500 transition-colors cursor-pointer"
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        <CardContent className="font-inter bg-white p-[24px] dark:bg-card/50 backdrop-blur-md flex flex-col gap-5">
          {/* Tabs list Active vs Archived */}
          <div className="flex w-full gap-[24px] select-none">
            <button
              type="button"
              onClick={() => setStatusFilter("Active")}
              className={cn(
                "relative pb-2 text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer",
                statusFilter === "Active"
                  ? "text-black after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-black dark:text-zinc-50 dark:after:bg-zinc-50"
                  : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
              )}
            >
              Active ({staff.filter((s) => s.status === "Active").length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("Inactive")}
              className={cn(
                "relative pb-2 text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer",
                statusFilter === "Inactive"
                  ? "text-black after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-black dark:text-zinc-50 dark:after:bg-zinc-50"
                  : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
              )}
            >
              Archived ({staff.filter((s) => s.status === "Inactive" || s.status === "Archived").length})
            </button>
          </div>

          {/* Toolbar / Search Row */}
          <div className="flex flex-row items-center gap-[12px] w-full select-none">
            {/* Search */}
            <div className="flex-1 min-w-0 relative group">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <i className="ph-bold ph-magnifying-glass text-gray-400 transition-colors group-focus-within:text-pup-maroon dark:text-zinc-500 text-sm"></i>
              </div>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, ID or email..."
                className="h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white pl-9 pr-20 text-xs font-normal placeholder:text-[#8E8E93] dark:bg-card focus-visible:ring-pup-maroon shadow-none"
              />
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                {filteredStaff.length > 0 ? `${filteredStaff.length} results` : "0 results"}
              </div>
            </div>

            {/* Office Partition Select */}
            <div className="shrink-0 w-[190px]">
              <Select
                value={officeFilter}
                onChange={(e) => setOfficeFilter(e.target.value)}
                className="h-10 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-normal text-[#111111] dark:text-zinc-200 cursor-pointer shadow-none"
                menuClassName="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl p-1.5"
                optionClassName="rounded-lg text-xs font-medium py-2 px-3 hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                <option value="All">All Offices</option>
                <option value="global">System Administration</option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.short_name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Role Select */}
            <div className="shrink-0 w-[170px]">
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-10 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-normal text-[#111111] dark:text-zinc-200 cursor-pointer shadow-none"
                menuClassName="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl p-1.5"
                optionClassName="rounded-lg text-xs font-medium py-2 px-3 hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                <option value="All">All Roles</option>
                <option value="SystemAdmin">System Admin</option>
                <option value="Admin">Administrator</option>
                <option value="Staff">Regular Staff</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Directory Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="flex h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-white/40 dark:bg-zinc-900/20 text-center">
          <Empty className="flex flex-col items-center justify-center border-0 bg-transparent text-center">
            <EmptyHeader className="flex flex-col items-center gap-0">
              <div className="relative mb-6">
                <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                  <i className={cn(
                    hasActiveFilters ? "ph-magnifying-glass" : (statusFilter === "Inactive" ? "ph-archive" : "ph-users"),
                    "text-3xl text-gray-400 dark:text-zinc-500"
                  )}></i>
                </EmptyMedia>
              </div>
              <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                {hasActiveFilters 
                  ? "No Results Found" 
                  : (statusFilter === "Inactive" ? "No Archived Personnel Found" : "No Personnel Found")}
              </EmptyTitle>
              <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400 mt-1">
                {hasActiveFilters
                  ? "We couldn't find any personnel matching your search criteria. Try adjusting your partition filters or keywords."
                  : (statusFilter === "Inactive"
                    ? "There are currently no archived or deactivated personnel accounts in the system."
                    : "There are currently no personnel accounts registered in the directory.")}
              </EmptyDescription>
              {hasActiveFilters ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="mt-6 flex h-10 items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 text-xs font-semibold text-gray-700 shadow-xs transition-colors hover:bg-gray-50 dark:bg-zinc-900 dark:border-white/10 dark:text-zinc-300 cursor-pointer"
                >
                  <i className="ph-bold ph-arrow-counter-clockwise"></i>
                  Clear Filters
                </Button>
              ) : statusFilter === "Active" ? (
                <Button
                  onClick={handleOpenCreate}
                  className="mt-6 flex h-10 items-center gap-2 rounded-xl btn-brand-red text-white px-5 text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <i className="ph-bold ph-plus"></i>
                  Register First Staff
                </Button>
              ) : null}
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <div className="overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card flex flex-col flex-1">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 border-b-[0.5px] border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e]">
              <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-550 h-11 select-none">
                <th className="p-4 pl-6">Staff Name / Contact</th>
                <th className="p-4">Staff ID</th>
                <th className="p-4">Office Partition</th>
                <th className="p-4">Privilege Level</th>
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
                        <span className="inline-flex w-fit items-center justify-center rounded-[4px] px-[8px] py-[3px] text-[11px] font-semibold tracking-[0.04em] bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-950 select-none">
                          Platform Level
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4 align-middle">
                      <div 
                        className={cn(
                          "inline-flex w-fit items-center justify-center rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium tracking-[0.04em]",
                          member.role === "SystemAdmin" || member.role === "SuperAdmin"
                            ? "bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                            : member.role === "Admin"
                              ? "bg-[#FEE2E2] text-[#991B1B] dark:bg-red-950/40 dark:text-red-400"
                              : "bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/40 dark:text-amber-400"
                        )}
                      >
                        {member.role === "SuperAdmin" || member.role === "SystemAdmin" ? "System Admin" : member.role}
                      </div>
                    </td>
                    <td className="py-2 px-4 pr-6 align-middle text-right">
                      {isSelf ? (
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => router.push("/account")}
                            title="Manage My Profile"
                            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold text-gray-700 hover:text-pup-maroon dark:text-zinc-200 dark:hover:text-white bg-gray-100 hover:bg-gray-200/80 dark:bg-white/10 dark:hover:bg-white/15 transition-all cursor-pointer active:scale-95 border-0"
                          >
                            <i className="ph-bold ph-user-circle text-[15px] text-pup-maroon dark:text-red-400"></i>
                            <span>My Profile</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(member)}
                            title="Edit Personnel"
                            className="w-7 h-7 rounded-lg hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/10 text-[#C7C7CC] dark:text-zinc-600 transition-colors hover:text-amber-500 dark:hover:text-amber-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center"
                          >
                            <i className="ph-bold ph-pencil-simple text-[16px]"></i>
                          </button>
                          <button
                            onClick={() => handleToggleStatus(member)}
                            title={member.status === "Active" ? "Archive Personnel" : "Restore Personnel"}
                            className="w-7 h-7 rounded-lg hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/10 text-[#C7C7CC] dark:text-zinc-600 transition-colors hover:text-red-600 dark:hover:text-red-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center"
                          >
                            <i className="ph-bold ph-archive text-[16px]"></i>
                          </button>
                        </div>
                      )}
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
                      "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
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
            <div className="flex items-center gap-2 select-none">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="text-xs text-gray-500 dark:text-zinc-400 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
              >
                Prev
              </Button>
              <div className="h-8 w-8 rounded-xl border border-[#e5e5ea] dark:border-zinc-800 flex items-center justify-center text-xs font-bold text-gray-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                {page}
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={endIndex >= filteredStaff.length}
                onClick={() => setPage(p => p + 1)}
                className="text-xs text-gray-500 dark:text-zinc-400 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Register / Edit Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl w-full rounded-2xl bg-white border border-gray-200 dark:bg-zinc-900 dark:border-white/10 p-0 shadow-2xl overflow-hidden">
          <form onSubmit={handleSubmit}>
            <DialogHeader className="p-6 pb-4 border-b border-gray-100 dark:border-white/5">
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-zinc-50 tracking-tight">
                {isEditing ? "Edit Personnel Profile" : "Register Personnel Account"}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mt-1 dark:text-zinc-400">
                Define the authorization scope, profile metadata, and security settings for the account.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-4">
              {/* Staff ID */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Staff ID / Username *
                  </label>
                  {isEditing && (
                    <span className="text-[10px] font-medium text-gray-400 dark:text-zinc-500">
                      Read-only
                    </span>
                  )}
                </div>
                <Input
                  value={form.id}
                  onChange={(e) => setForm(prev => ({ ...prev, id: e.target.value }))}
                  disabled={isEditing}
                  placeholder="e.g. PUPREGISTRAR-004"
                  className="h-10 rounded-xl bg-white border border-gray-200 text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-white/10 dark:text-white disabled:bg-gray-100/80 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-zinc-900/80 dark:disabled:text-zinc-400"
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Official Email Address *
                  </label>
                  {isEditing && (
                    <span className="text-[10px] font-medium text-gray-400 dark:text-zinc-500">
                      Read-only
                    </span>
                  )}
                </div>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  disabled={isEditing}
                  placeholder="email@pup.local"
                  className="h-10 rounded-xl bg-white border border-gray-200 text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-white/10 dark:text-white disabled:bg-gray-100/80 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-zinc-900/80 dark:disabled:text-zinc-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Office Scope Selection */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Assigned Office / Department
                  </label>
                  <Select
                    value={form.office_id}
                    onChange={(e) => setForm(prev => ({ ...prev, office_id: e.target.value }))}
                    className="h-10 rounded-xl bg-white border border-gray-200 text-xs font-normal focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 dark:bg-zinc-950 dark:border-white/10 dark:text-white shadow-none cursor-pointer"
                    menuClassName="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl p-1.5"
                    optionClassName="rounded-lg text-xs font-medium py-2.5 px-3 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  >
                    <option value="">SystemAdmin / Global (No Office Scope)</option>
                    {offices.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </Select>
                </div>

                {/* Role Level */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Privilege Level
                  </label>
                  <Select
                    value={form.role}
                    onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
                    className="h-10 rounded-xl bg-white border border-gray-200 text-xs font-normal focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 dark:bg-zinc-950 dark:border-white/10 dark:text-white shadow-none cursor-pointer"
                    menuClassName="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl p-1.5"
                    optionClassName="rounded-lg text-xs font-medium py-2.5 px-3 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  >
                    <option value="SystemAdmin">System Admin</option>
                    <option value="Admin">Administrator</option>
                    <option value="Staff">Records Staff</option>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 bg-gray-50 dark:bg-zinc-950/40 border-t border-gray-100 dark:border-white/5 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setFormOpen(false)}
                className="text-xs text-gray-500 dark:text-zinc-400 font-semibold cursor-pointer h-10 px-4 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl border-none shadow-none"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitLoading}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl h-10 px-5 cursor-pointer dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs"
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
            <div className="text-xl font-bold text-pup-maroon dark:text-red-400 mt-1 select-all tracking-wider">
              {tempPassword}
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              onClick={() => {
                navigator.clipboard.writeText(tempPassword)
                showToast("Password copied to clipboard")
              }}
              variant="outline"
              className="text-xs border-gray-200 dark:border-white/10 h-10 px-4 font-semibold rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5"
            >
              Copy Password
            </Button>
            <Button
              onClick={() => setPwDialogOpen(false)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl h-10 px-5 cursor-pointer dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs"
            >
              Acknowledge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
