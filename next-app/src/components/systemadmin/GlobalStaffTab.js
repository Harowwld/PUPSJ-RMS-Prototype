"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import KpiStatCardsSkeleton from "@/components/systemadmin/skeletons/KpiStatCardsSkeleton"
import DirectoryTableSkeleton from "@/components/systemadmin/skeletons/DirectoryTableSkeleton"
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
import { RefreshButton } from "@/components/shared/RefreshButton"
import ConfirmModal from "@/components/shared/ConfirmModal"
import FloatingActionBar from "@/components/shared/FloatingActionBar"
import { Select } from "@/components/ui/select"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"
import { getCachedData, setCachedData, invalidateDataCache } from "@/lib/dataCache"

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return <i className="ph-bold ph-caret-up-down ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"></i>
  }
  return sortOrder === "ASC" ? (
    <i className="ph-bold ph-caret-up ml-1 text-[12px] text-gray-400"></i>
  ) : (
    <i className="ph-bold ph-caret-down ml-1 text-[12px] text-gray-400"></i>
  )
}

export default function GlobalStaffTab({ authUser, showToast }) {
  const router = useRouter()
  const [staff, setStaff] = useState([])
  const [offices, setOffices] = useState([])
  const [loading, setLoading] = useState(true)
  const [isManualLoading, setIsManualLoading] = useState(false)
  
  // Filters & Search
  const [search, setSearch] = useState("")
  const [officeFilter, setOfficeFilter] = useState("All")
  const [roleFilter, setRoleFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("Active")
  
  // Sorting
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState("ASC")

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"))
    } else {
      setSortBy(column)
      setSortOrder("ASC")
    }
  }

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Reset page and selection when search or filters change
  useEffect(() => {
    setPage(1)
    setSelectedIds(new Set())
    setLastSelectedId(null)
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

  // Archive & Restore Confirmation Modals
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [isArchiving, setIsArchiving] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState(null)
  const [isRestoring, setIsRestoring] = useState(false)

  // Multi-Selection State & Batch Actions
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [lastSelectedId, setLastSelectedId] = useState(null)
  const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false)
  const [bulkArchiveLoading, setBulkArchiveLoading] = useState(false)
  const [bulkRestoreOpen, setBulkRestoreOpen] = useState(false)
  const [bulkRestoreLoading, setBulkRestoreLoading] = useState(false)

  const fetchData = useCallback(async () => {
    // SWR Cache-first: instant render from cache if available
    const cachedStaff = getCachedData("systemadmin_staff")
    const cachedOffices = getCachedData("systemadmin_offices")
    if (Array.isArray(cachedStaff) && Array.isArray(cachedOffices)) {
      setStaff(cachedStaff)
      setOffices(cachedOffices)
      setLoading(false)
    }

    try {
      const [resStaff, resOffices] = await Promise.all([
        fetch("/api/staff?limit=500"),
        fetch("/api/offices")
      ])
      
      const jsonStaff = await resStaff.json()
      const jsonOffices = await resOffices.json()
      
      if (resStaff.ok && jsonStaff.ok && Array.isArray(jsonStaff.data)) {
        setStaff(jsonStaff.data)
        setCachedData("systemadmin_staff", jsonStaff.data, 60000)
      }
      if (resOffices.ok && jsonOffices.ok && Array.isArray(jsonOffices.data)) {
        setOffices(jsonOffices.data)
        setCachedData("systemadmin_offices", jsonOffices.data, 120000)
      }
    } catch (err) {
      if (!cachedStaff) {
        showToast("Failed to load directory data", true)
      }
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const handleManualRefresh = useCallback(async () => {
    setIsManualLoading(true)
    try {
      await fetchData()
    } finally {
      setIsManualLoading(false)
    }
  }, [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const handleSwitch = (e) => {
      if (e.detail?.officeId) {
        setOfficeFilter(e.detail.officeId)
      } else if (e.detail?.view === "staff") {
        setOfficeFilter("All")
      }
    }
    window.addEventListener("switch-view", handleSwitch)
    return () => window.removeEventListener("switch-view", handleSwitch)
  }, [])

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
    if (member.status === "Inactive" || member.status === "Archived") {
      showToast("Archived accounts cannot be edited. Please restore the account first.", true)
      return
    }
    setIsEditing(true)
    setSelectedStaffId(member.id)
    setForm({
      id: member.id,
      office_id: member.office_id || offices[0]?.id || "",
      fname: member.fname,
      lname: member.lname,
      role: member.role === "SystemAdmin" || member.role === "SuperAdmin" ? "Admin" : member.role,
      section: member.section || "",
      email: member.email,
      status: member.status
    })
    setFormOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.office_id) {
      showToast("Please select an assigned office/department", true)
      return
    }
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
        invalidateDataCache("systemadmin_staff")
        invalidateDataCache("systemadmin_offices_stats")
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

  const confirmArchivePersonnel = async () => {
    if (!archiveTarget) return
    setIsArchiving(true)
    try {
      const res = await fetch(`/api/staff/${archiveTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Inactive" })
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setSelectedIds((prev) => {
          if (!prev.has(archiveTarget.id)) return prev
          const next = new Set(prev)
          next.delete(archiveTarget.id)
          return next
        })
        showToast(`Personnel account for ${archiveTarget.fname} ${archiveTarget.lname} has been archived.`)
        setArchiveTarget(null)
        invalidateDataCache("systemadmin_staff")
        invalidateDataCache("systemadmin_offices_stats")
        fetchData()
      } else {
        showToast(json.error || "Failed to archive personnel account", true)
      }
    } catch (err) {
      showToast("Network error archiving personnel account", true)
    } finally {
      setIsArchiving(false)
    }
  }

  const confirmRestorePersonnel = async () => {
    if (!restoreTarget) return
    setIsRestoring(true)
    try {
      const res = await fetch(`/api/staff/${restoreTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Active" })
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setSelectedIds((prev) => {
          if (!prev.has(restoreTarget.id)) return prev
          const next = new Set(prev)
          next.delete(restoreTarget.id)
          return next
        })
        showToast(`Personnel account for ${restoreTarget.fname} ${restoreTarget.lname} has been restored to Active.`)
        setRestoreTarget(null)
        invalidateDataCache("systemadmin_staff")
        invalidateDataCache("systemadmin_offices_stats")
        fetchData()
      } else {
        showToast(json.error || "Failed to restore personnel account", true)
      }
    } catch (err) {
      showToast("Network error restoring personnel account", true)
    } finally {
      setIsRestoring(false)
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

    list.sort((a, b) => {
      let valA = ""
      let valB = ""
      if (sortBy === "name") {
        valA = `${a.fname} ${a.lname}`.toLowerCase()
        valB = `${b.fname} ${b.lname}`.toLowerCase()
      } else if (sortBy === "id") {
        valA = (a.id || "").toLowerCase()
        valB = (b.id || "").toLowerCase()
      } else if (sortBy === "office") {
        const offList = Array.isArray(offices) ? offices : []
        const offA = offList.find((o) => o.id === a.office_id)?.short_name || "Platform Level"
        const offB = offList.find((o) => o.id === b.office_id)?.short_name || "Platform Level"
        valA = offA.toLowerCase()
        valB = offB.toLowerCase()
      } else if (sortBy === "role") {
        valA = (a.role || "").toLowerCase()
        valB = (b.role || "").toLowerCase()
      }

      if (valA < valB) return sortOrder === "ASC" ? -1 : 1
      if (valA > valB) return sortOrder === "ASC" ? 1 : -1
      return 0
    })

    return list
  }, [staff, search, officeFilter, roleFilter, statusFilter, sortBy, sortOrder, offices])

  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedStaff = filteredStaff.slice(startIndex, endIndex)

  // Clear selection when changing tabs, page, or filters
  useEffect(() => {
    setSelectedIds(new Set())
    setLastSelectedId(null)
  }, [statusFilter, page, pageSize, search, officeFilter, roleFilter])

  // Prune stale selected IDs when filtered staff updates
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev
      const validIds = new Set(filteredStaff.map((s) => s.id))
      let needsPruning = false
      for (const id of prev) {
        if (!validIds.has(id)) {
          needsPruning = true
          break
        }
      }
      if (!needsPruning) return prev
      const next = new Set()
      for (const id of prev) {
        if (validIds.has(id)) next.add(id)
      }
      return next
    })
  }, [filteredStaff])

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(
        new Set(
          paginatedStaff
            .filter((s) => s.id !== authUser?.id)
            .map((s) => s.id)
        )
      )
    } else {
      setSelectedIds(new Set())
    }
    setLastSelectedId(null)
  }

  const toggleSelect = (id, event) => {
    const isSelected = selectedIds.has(id)

    if (event?.shiftKey && lastSelectedId) {
      if (isSelected) {
        if (selectedIds.size > 1) {
          setSelectedIds(new Set([id]))
          setLastSelectedId(id)
        } else {
          setSelectedIds(new Set())
          setLastSelectedId(null)
        }
        return
      }

      const currentIdx = paginatedStaff.findIndex((s) => s.id === id)
      const lastIdx = paginatedStaff.findIndex((s) => s.id === lastSelectedId)

      if (currentIdx !== -1 && lastIdx !== -1) {
        const start = Math.min(currentIdx, lastIdx)
        const end = Math.max(currentIdx, lastIdx)
        const idsInRange = paginatedStaff
          .slice(start, end + 1)
          .filter((s) => s.id !== authUser?.id)
          .map((s) => s.id)

        const next = new Set(selectedIds)
        idsInRange.forEach((rangeId) => next.add(rangeId))
        
        setSelectedIds(next)
        setLastSelectedId(id)
        return
      }
    }

    const next = new Set(selectedIds)
    if (isSelected) {
      next.delete(id)
      setLastSelectedId(null)
    } else {
      next.add(id)
      setLastSelectedId(id)
    }
    setSelectedIds(next)
  }

  const confirmBulkArchive = async () => {
    if (bulkArchiveLoading || selectedIds.size === 0) return
    setBulkArchiveLoading(true)
    try {
      let successCount = 0
      let failCount = 0
      const idsToArchive = Array.from(selectedIds)

      for (const id of idsToArchive) {
        if (id === authUser?.id) {
          failCount++
          continue
        }
        const res = await fetch(`/api/staff/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Inactive" })
        })
        const json = await res.json()
        if (res.ok && json.ok) {
          setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, status: "Inactive" } : s)))
          successCount++
        } else {
          failCount++
        }
      }

      showToast(`Archived ${successCount} personnel account(s)${failCount > 0 ? ` (${failCount} failed)` : ""}`)
      setBulkArchiveOpen(false)
      setSelectedIds(new Set())
      invalidateDataCache("systemadmin_staff")
      invalidateDataCache("systemadmin_offices_stats")
      fetchData()
    } catch (err) {
      showToast("Network error archiving selected accounts", true)
    } finally {
      setBulkArchiveLoading(false)
    }
  }

  const confirmBulkRestore = async () => {
    if (bulkRestoreLoading || selectedIds.size === 0) return
    setBulkRestoreLoading(true)
    try {
      let successCount = 0
      let failCount = 0
      const idsToRestore = Array.from(selectedIds)

      for (const id of idsToRestore) {
        const res = await fetch(`/api/staff/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Active" })
        })
        const json = await res.json()
        if (res.ok && json.ok) {
          setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, status: "Active" } : s)))
          successCount++
        } else {
          failCount++
        }
      }

      showToast(`Restored ${successCount} personnel account(s)${failCount > 0 ? ` (${failCount} failed)` : ""}`)
      setBulkRestoreOpen(false)
      setSelectedIds(new Set())
      invalidateDataCache("systemadmin_staff")
      invalidateDataCache("systemadmin_offices_stats")
      fetchData()
    } catch (err) {
      showToast("Network error restoring selected accounts", true)
    } finally {
      setBulkRestoreLoading(false)
    }
  }

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
    },
    {
      key: "active",
      label: "Active Personnel",
      value: stats.active,
      sublabel: `${stats.inactive} suspended or archived`,
      color: "emerald",
    },
    {
      key: "admins",
      label: "Administrators",
      value: stats.admins,
      sublabel: `${stats.regular} standard records staff`,
      color: "amber",
    },
  ]

  return (
    <div className="animate-fade-up font-inter flex flex-1 flex-col h-full min-h-0 w-full gap-6">
      {/* ONE Single Card Container encapsulating Header, Metrics, Toolbar, Table & Pagination */}
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none isolate font-inter mb-4 min-h-0 flex-1">
        <PageHeader
          icon="ph-users"
          title={
            <div className="flex items-center gap-[6px]">
              <span>Global Personnel Directory</span>
              {statusFilter === "Inactive" && (
                <span className="text-[12px] font-normal text-emerald-600 dark:text-emerald-400">
                  · Restore Mode
                </span>
              )}
            </div>
          }
          description="Manage system access, office assignments, and authorization settings for all administrators and records staff."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex items-center gap-6">
              <RefreshButton
                onRefresh={handleManualRefresh}
                isLoading={isManualLoading}
                title="Refresh Staff Directory"
              />

              <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />

              <Button
                onClick={handleOpenCreate}
                className="flex h-10 items-center justify-center rounded-xl! btn-brand-red text-white font-semibold text-xs active:scale-95 transition-all cursor-pointer px-5 shadow-xs"
              >
                Register
              </Button>
            </div>
          }
        />

        {/* Stat Cards */}
        {loading ? (
          <div className="px-6 pb-6">
            <KpiStatCardsSkeleton count={3} />
          </div>
        ) : (
          <div className="px-6 pb-6">
            <div
              ref={statCardsRef}
              className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 items-start relative z-20 transition-all duration-500"
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
                      "relative overflow-hidden rounded-xl border p-4 cursor-pointer select-none transition-all",
                      "border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-900/30 hover:border-gray-200 dark:hover:border-white/10",
                      selectedKpi === stat.key && (
                        stat.color === "blue" ? "border-blue-500/40 ring-1 ring-blue-500/20" :
                        stat.color === "emerald" ? "border-emerald-500/40 ring-1 ring-emerald-500/20" :
                        "border-amber-500/40 ring-1 ring-amber-500/20"
                      )
                    )}
                  >
                    <div className="relative z-10">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                          {stat.label}
                        </span>
                        <i className={cn("ph-bold ph-caret-down text-xs text-gray-400 transition-transform duration-300", selectedKpi === stat.key && "rotate-180")} />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-gray-900 dark:text-zinc-50 tracking-tight">
                          {stat.value.toLocaleString()}
                        </span>
                        <span className={cn("text-xs font-medium", 
                          stat.color === "blue" ? "text-blue-600 dark:text-blue-400" :
                          stat.color === "emerald" ? "text-emerald-600 dark:text-emerald-400" :
                          "text-amber-600 dark:text-amber-400"
                        )}>
                          {stat.sublabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Absolute details container */}
                  <div
                    className={cn(
                      "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                      selectedKpi === stat.key ? "scale-y-100 opacity-100 translate-y-0" : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {stat.key === "total" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">
                            <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Total Accounts</span>
                            <span className="text-lg font-black text-gray-900 dark:text-zinc-50">{stats.total}</span>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/30">
                            <span className="block text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Offices Covered</span>
                            <span className="text-lg font-black text-blue-700 dark:text-blue-400">{stats.assignedOffices}</span>
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5 text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                          Directory registry of all personnel across all campus partitions and centralized administrative systems.
                        </div>
                      </div>
                    )}
                    {stat.key === "active" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">
                            <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Active Staff</span>
                            <span className="text-lg font-black text-gray-900 dark:text-zinc-50">{stats.active}</span>
                          </div>
                          <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                            <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Suspended</span>
                            <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">{stats.inactive}</span>
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5 text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                          Personnel in good standing with active operational privileges and live credentials.
                        </div>
                      </div>
                    )}
                    {stat.key === "admins" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">
                            <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Admin Level</span>
                            <span className="text-lg font-black text-gray-900 dark:text-zinc-50">{stats.admins}</span>
                          </div>
                          <div className="bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30">
                            <span className="block text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Regular Staff</span>
                            <span className="text-lg font-black text-amber-700 dark:text-amber-400">{stats.regular}</span>
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5 text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                          Staff members holding elevated administrator or system administrator privileges.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Toolbar */}
        <div className="border-t border-gray-100 dark:border-white/10 p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
          {/* Left: Active vs Archived Tabs */}
          <div className="flex items-center gap-6 shrink-0 select-none">
            <button
              type="button"
              onClick={() => setStatusFilter("Active")}
              className={cn(
                "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
                statusFilter === "Active"
                  ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                  : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
              )}
            >
              Active Personnel ({stats.active})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("Inactive")}
              className={cn(
                "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
                statusFilter === "Inactive"
                  ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                  : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
              )}
            >
              Archived ({stats.inactive})
            </button>
          </div>

          {/* Right: Search Input & Dropdown Popovers Group */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="w-full sm:w-[260px] lg:w-[300px] relative group shrink-0">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <i className="ph-bold ph-magnifying-glass text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-sm"></i>
              </div>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, ID or email..."
                className="h-9 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 pl-8 pr-16 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
              />
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[11px] text-gray-400 dark:text-zinc-500 font-mono">
                {filteredStaff.length}
              </div>
            </div>

            {/* Office Partition Select */}
            <div className="w-full sm:w-[165px] shrink-0">
              <Select
                value={officeFilter}
                onChange={(e) => setOfficeFilter(e.target.value)}
                className="h-9 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-normal text-[#111111] dark:text-zinc-200 cursor-pointer shadow-none"
                menuClassName="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl p-1.5"
                optionClassName="rounded-lg text-xs font-normal py-1.5 px-2.5 hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                <option value="All">All Offices</option>
                {(Array.isArray(offices) ? offices : []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.short_name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Role Select */}
            <div className="w-full sm:w-[145px] shrink-0">
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-9 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-normal text-[#111111] dark:text-zinc-200 cursor-pointer shadow-none"
                menuClassName="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl p-1.5"
                optionClassName="rounded-lg text-xs font-normal py-1.5 px-2.5 hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                <option value="All">All Roles</option>
                <option value="Admin">Administrator</option>
                <option value="Staff">Regular Staff</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Active Filter Chips Row */}
        {hasActiveFilters && (
          <div className="flex-none border-t border-gray-100 dark:border-white/10 bg-white dark:bg-card px-6 py-2.5 animate-in fade-in slide-in-from-top-1 duration-normal">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500">
                Active filters:
              </span>
              {search && (
                <div className="flex items-center gap-[6px] rounded-lg bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
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
                <div className="flex items-center gap-[6px] rounded-lg bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                  Office: {(Array.isArray(offices) ? offices : []).find((o) => o.id === officeFilter)?.short_name || officeFilter}
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
                <div className="flex items-center gap-[6px] rounded-lg bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                  Role: {roleFilter === "Admin" ? "Administrator" : roleFilter === "Staff" ? "Regular Staff" : roleFilter}
                  <button
                    onClick={() => {
                      setRoleFilter("All")
                      setPage(1)
                    }}
                    className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-350 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
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

        {/* Content Section: Directory Table inside the single Card */}
        <div className="overflow-hidden rounded-b-2xl border-t border-gray-200 dark:border-white/10 bg-white dark:bg-card flex flex-col flex-1">
          {loading ? (
            <DirectoryTableSkeleton rowCount={8} />
          ) : filteredStaff.length === 0 ? (
            <div className="flex h-[380px] flex-col items-center justify-center p-6 text-center rounded-b-2xl">
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
                  Clear
                </Button>
              ) : statusFilter === "Active" ? (
                <Button
                  onClick={handleOpenCreate}
                  className="mt-6 flex h-10 items-center justify-center rounded-xl! btn-brand-red text-white px-5 text-xs font-semibold shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Register
                </Button>
              ) : null}
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 border-b-[0.5px] border-black/10 dark:border-white/10 bg-white dark:bg-card">
              <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500 h-11 select-none">
                <th className="w-12 py-0 px-4 text-center align-middle">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer rounded border border-gray-300 dark:border-white/10"
                    checked={
                      paginatedStaff.length > 0 &&
                      paginatedStaff
                        .filter((s) => s.id !== authUser?.id)
                        .every((s) => selectedIds.has(s.id))
                    }
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    disabled={
                      paginatedStaff.length === 0 ||
                      paginatedStaff.every((s) => s.id === authUser?.id)
                    }
                  />
                </th>
                <th className="p-4 min-w-[260px]">
                  <button
                    onClick={() => handleSort("name")}
                    className={cn(
                      "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                      sortBy === "name" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                    )}
                  >
                    Staff Name / Contact{" "}
                    <SortIndicator column="name" sortBy={sortBy} sortOrder={sortOrder} />
                  </button>
                </th>
                <th className="p-4 w-44">
                  <button
                    onClick={() => handleSort("id")}
                    className={cn(
                      "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                      sortBy === "id" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                    )}
                  >
                    Staff ID{" "}
                    <SortIndicator column="id" sortBy={sortBy} sortOrder={sortOrder} />
                  </button>
                </th>
                <th className="p-4 w-48">
                  <button
                    onClick={() => handleSort("office")}
                    className={cn(
                      "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                      sortBy === "office" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                    )}
                  >
                    Office Partition{" "}
                    <SortIndicator column="office" sortBy={sortBy} sortOrder={sortOrder} />
                  </button>
                </th>
                <th className="p-4 w-44">
                  <button
                    onClick={() => handleSort("role")}
                    className={cn(
                      "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                      sortBy === "role" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                    )}
                  >
                    Privilege Level{" "}
                    <SortIndicator column="role" sortBy={sortBy} sortOrder={sortOrder} />
                  </button>
                </th>
                <th className="p-4 pr-6 text-right text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                  Actions
                </th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-medium text-gray-900 dark:text-zinc-100 bg-white dark:bg-[#1c1c1e]">
              {paginatedStaff.map((member) => {
                const office = (Array.isArray(offices) ? offices : []).find(o => o.id === member.office_id)
                const isSelf = member.id === authUser?.id
                const isSelected = selectedIds.has(member.id)
                
                return (
                  <tr 
                    key={member.id}
                    onClick={(e) => !isSelf && toggleSelect(member.id, e)}
                    className={cn(
                      "group h-[52px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0 transition-all duration-200 hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 select-none",
                      !isSelf && "cursor-pointer",
                      isSelected && "bg-blue-50/60 dark:bg-blue-950/20"
                    )}
                  >
                    <td className="py-0 px-4 align-middle text-center">
                      {!isSelf && (
                        <input
                          type="checkbox"
                          className={cn(
                            "h-4 w-4 cursor-pointer rounded border border-gray-300 dark:border-white/10 transition-opacity",
                            isSelected ? "opacity-100" : "opacity-50 group-hover:opacity-80"
                          )}
                          checked={isSelected}
                          onChange={() => {}}
                        />
                      )}
                    </td>
                    <td className="py-2 px-4 align-middle">
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
                        <span 
                          className="rms-office-accent inline-flex w-fit items-center justify-center rounded-full px-[10px] py-[2.5px] text-[11px] font-semibold tracking-[0.04em] border-0 select-none"
                          data-color={office.accent_color || "#800000"}
                          style={{
                            color: office.accent_color || "#800000",
                            backgroundColor: `color-mix(in srgb, ${office.accent_color || "#800000"} 12%, transparent)`,
                          }}
                        >
                          {office.short_name}
                        </span>
                      ) : (
                        <span className="inline-flex w-fit items-center justify-center rounded-full px-[10px] py-[2.5px] text-[11px] font-semibold tracking-[0.04em] bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-950 select-none">
                          Platform Level
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4 align-middle">
                      <div 
                        className={cn(
                          "inline-flex w-fit items-center justify-center rounded-full px-[10px] py-[2.5px] text-[11px] font-medium tracking-[0.04em]",
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
                    <td className="py-0 px-4 pr-6 align-middle text-right">
                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isSelf ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => router.push("/account")}
                                aria-label="My Account Settings"
                                className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                              >
                                <i className="ph-bold ph-gear-six text-[16px]"></i>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>My Account Settings</TooltipContent>
                          </Tooltip>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {statusFilter === "Active" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleOpenEdit(member)}
                                    aria-label="Edit Staff Member"
                                    className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                                  >
                                    <i className="ph-bold ph-pencil-simple text-[16px]"></i>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Edit Staff</TooltipContent>
                              </Tooltip>
                            )}

                            {statusFilter === "Inactive" || member.status === "Inactive" || member.status === "Archived" ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => setRestoreTarget(member)}
                                    aria-label="Restore Staff Member"
                                    className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                                  >
                                    <i className="ph-bold ph-archive-restore text-[16px]"></i>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Restore</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => setArchiveTarget(member)}
                                    aria-label="Archive Staff Member"
                                    className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                                  >
                                    <i className="ph-bold ph-archive text-[16px]"></i>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Archive</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/10 bg-gray-50/30 dark:bg-zinc-900/20 p-4 px-6 rounded-b-2xl">
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
      </>
    )}
    </div>
  </Card>

      {/* Register / Edit Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl w-full rounded-2xl bg-white border border-gray-200 dark:bg-zinc-900 dark:border-white/10 p-0 shadow-2xl overflow-hidden">
          <form onSubmit={handleSubmit}>
            <DialogHeader className="p-6 pb-0 bg-white dark:bg-card border-none text-left">
              <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                {isEditing ? "Edit Personnel Profile" : "Register Personnel Account"}
              </DialogTitle>
              <DialogDescription className="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-1">
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
                    Assigned Office / Department *
                  </label>
                  <Select
                    value={form.office_id}
                    onChange={(e) => setForm(prev => ({ ...prev, office_id: e.target.value }))}
                    className="h-10 rounded-xl bg-white border border-gray-200 text-xs font-normal focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 dark:bg-zinc-950 dark:border-white/10 dark:text-white shadow-none cursor-pointer"
                    menuClassName="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl p-1.5"
                    optionClassName="rounded-lg text-xs font-normal py-2.5 px-3 hover:bg-gray-100 dark:hover:bg-zinc-800"
                    required
                  >
                    <option value="" disabled>Select Office / Department</option>
                    {(Array.isArray(offices) ? offices : []).map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </Select>
                </div>

                {/* Role Level */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Privilege Level *
                  </label>
                  <Select
                    value={form.role}
                    onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
                    className="h-10 rounded-xl bg-white border border-gray-200 text-xs font-normal focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 dark:bg-zinc-950 dark:border-white/10 dark:text-white shadow-none cursor-pointer"
                    menuClassName="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl p-1.5"
                    optionClassName="rounded-lg text-xs font-normal py-2.5 px-3 hover:bg-gray-100 dark:hover:bg-zinc-800"
                    required
                  >
                    <option value="Admin">Administrator</option>
                    <option value="Staff">Records Staff</option>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                className="h-10 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitLoading}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl h-10 px-5 cursor-pointer dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs"
              >
                {submitLoading ? "Saving..." : isEditing ? "Save" : "Register"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Temporary Password Dialog */}
      <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white border border-gray-200 dark:bg-zinc-900 dark:border-white/10 p-6 shadow-2xl">
          <DialogHeader className="p-0 border-none text-left">
            <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
              Staff Credentials Generated
            </DialogTitle>
            <DialogDescription className="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-1">
              Please share this temporary password securely with the user. They will be prompted to change it upon first login.
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-5 p-4 rounded-xl border border-dashed border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-zinc-950/20 text-center">
            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Temporary Password</span>
            <div className="text-xl font-bold text-pup-maroon dark:text-red-400 mt-1 select-all tracking-wider">
              {tempPassword}
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2.5 pt-0 border-none bg-transparent">
            <Button
              onClick={() => {
                navigator.clipboard.writeText(tempPassword)
                showToast("Password copied to clipboard")
              }}
              variant="outline"
              className="text-xs border-gray-200 dark:border-white/10 h-10 px-4 font-semibold rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5"
            >
              Copy
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

      {/* Archive Personnel Confirmation Modal */}
      <ConfirmModal
        open={!!archiveTarget}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={confirmArchivePersonnel}
        isLoading={isArchiving}
        title="Archive Personnel Account"
        message="This account will be restricted immediately but can be restored later."
        confirmLabel="Archive"
        variant="warning"
        icon="ph-duotone ph-archive"
        buttonIcon="ph-bold ph-archive"
        selectedItems={[
          archiveTarget ? `${archiveTarget.fname} ${archiveTarget.lname}` : "",
        ]}
        isPersonnelModal={true}
        isAppleStyled={true}
        isArchiveModal={true}
      />

      {/* Restore Personnel Confirmation Modal */}
      <ConfirmModal
        open={!!restoreTarget}
        onCancel={() => setRestoreTarget(null)}
        onConfirm={confirmRestorePersonnel}
        isLoading={isRestoring}
        title="Restore Personnel Account"
        message="This account will be reactivated and the personnel will be able to log in again."
        confirmLabel="Restore"
        variant="success"
        icon="ph-duotone ph-archive-restore"
        buttonIcon="ph-bold ph-archive-restore"
        selectedItems={[
          restoreTarget ? `${restoreTarget.fname} ${restoreTarget.lname}` : "",
        ]}
        isPersonnelModal={true}
        isAppleStyled={true}
        isRestoreModal={true}
      />

      {/* Batch Archive Confirmation Modal */}
      <ConfirmModal
        open={bulkArchiveOpen}
        onCancel={() => setBulkArchiveOpen(false)}
        onConfirm={confirmBulkArchive}
        isLoading={bulkArchiveLoading}
        title="Batch Archive Personnel"
        message={`${selectedIds.size} personnel profiles will be archived and their system access revoked immediately.`}
        confirmLabel="Archive"
        variant="warning"
        icon="ph-duotone ph-archive"
        buttonIcon="ph-bold ph-archive"
        selectedItems={Array.from(selectedIds).map((id) => {
          const s = staff.find((x) => x.id === id)
          return s ? `${s.fname} ${s.lname}` : id
        })}
        isPersonnelModal={true}
        isAppleStyled={true}
        isArchiveModal={true}
      />

      {/* Batch Restore Confirmation Modal */}
      <ConfirmModal
        open={bulkRestoreOpen}
        onCancel={() => setBulkRestoreOpen(false)}
        onConfirm={confirmBulkRestore}
        isLoading={bulkRestoreLoading}
        title="Batch Restore Personnel"
        message={`${selectedIds.size} personnel profiles will be reactivated and able to log in again.`}
        confirmLabel="Restore"
        variant="success"
        icon="ph-duotone ph-archive-restore"
        buttonIcon="ph-bold ph-archive-restore"
        selectedItems={Array.from(selectedIds).map((id) => {
          const s = staff.find((x) => x.id === id)
          return s ? `${s.fname} ${s.lname}` : id
        })}
        isPersonnelModal={true}
        isAppleStyled={true}
        isRestoreModal={true}
      />

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedCount={selectedIds.size}
        onCancel={() => setSelectedIds(new Set())}
        onAction={() => {
          if (statusFilter === "Active") {
            setBulkArchiveOpen(true)
          } else {
            setBulkRestoreOpen(true)
          }
        }}
        actionLabel={statusFilter === "Active" ? "Archive" : "Restore"}
        actionVariant={statusFilter === "Active" ? "danger" : "success"}
      />
    </div>
  )
}
