"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import PageHeader from "@/components/shared/PageHeader"
import ConfirmModal from "@/components/shared/ConfirmModal"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"
import { getCachedData, setCachedData, invalidateDataCache } from "@/lib/dataCache"

function getOfficeIcon(office) {
  if (office?.icon && office.icon.trim()) return office.icon
  const id = (office?.id || office?.short_name || "").toLowerCase()
  if (id.includes("reg")) return "ph-bold ph-certificate"
  if (id.includes("osas") || id.includes("student")) return "ph-bold ph-student"
  if (id.includes("admiss")) return "ph-bold ph-user-check"
  if (id.includes("lib")) return "ph-bold ph-books"
  if (id.includes("acc") || id.includes("cash") || id.includes("fin")) return "ph-bold ph-banknote"
  return "ph-bold ph-building"
}

function getModuleIcon(m) {
  if (m?.icon && m.icon.trim()) return m.icon
  if (m?.id === "osas_monitoring") return "ph-bold ph-student"
  if (m?.id === "records_review") return "ph-bold ph-seal-check"
  if (m?.id === "compliance_analytics") return "ph-bold ph-chart-bar"
  if (m?.id === "request_analytics") return "ph-bold ph-trend-up"
  if (m?.id === "staff_directory") return "ph-bold ph-users"
  if (m?.id === "storage_layout") return "ph-bold ph-warehouse"
  if (m?.id === "system_config") return "ph-bold ph-gear"
  if (m?.id === "backup") return "ph-bold ph-database-backup"
  if (m?.id === "audit_logs") return "ph-bold ph-shield-check"
  if (m?.id === "alumni_requests") return "ph-bold ph-tray-arrow-up"
  if (m?.id === "scan_upload") return "ph-bold ph-scan"
  if (m?.id === "documents") return "ph-bold ph-file-text"
  if (m?.id === "notifications") return "ph-bold ph-bell"
  if (m?.id === "records_archive") return "ph-bold ph-archive-box"
  if (m?.id === "storage_explorer") return "ph-bold ph-folder-open"
  return "ph-bold ph-cube"
}

function getModuleTargetText(m) {
  if (m?.is_system) return "Required System Feature"
  if (m?.id === "scan_upload") return "Document Scanning Station"
  if (m?.id === "documents") return "Student Records Search"
  if (m?.id === "records_review") return "Document Approvals"
  if (m?.id === "alumni_requests") return "Student Document Requests"
  if (m?.id === "compliance_analytics") return "Digitization Progress Reports"
  if (m?.id === "request_analytics") return "Request Turnaround Reports"
  if (m?.id === "records_archive" || m?.id === "storage_explorer") return "Physical File Archive Finder"
  if (m?.id === "osas_monitoring") return "Student Conduct & Clearance"
  if (m?.id === "staff_directory") return "Department Staff List"
  if (m?.id === "backup") return "Data Backup Copies"
  if (m?.id === "audit_logs") return "Staff Activity History"
  if (m?.category === "admin") return "Supervisor Tool"
  return "Staff Tool"
}

function StatusChip({ status }) {
  const isInactive = status === "Inactive" || status === "Archived"
  return (
    <span
      className={cn(
        "rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium tracking-[0.04em] select-none inline-flex items-center",
        isInactive
          ? "bg-gray-100 text-[#8E8E93] dark:bg-zinc-800 dark:text-zinc-400"
          : "bg-[#D1FAE5] text-[#065F46] dark:bg-emerald-950/40 dark:text-emerald-400"
      )}
    >
      {isInactive ? "Archived" : "Active"}
    </span>
  )
}

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

export default function ModuleConfigTab({ showToast }) {
  const [matrix, setMatrix] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState({}) // { [key]: boolean }
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("All") // "All" | "admin" | "staff"
  const [moduleStatusFilter, setModuleStatusFilter] = useState("All") // "All" | "enabled" | "disabled"
  const [officeFilter, setOfficeFilter] = useState("Active") // "Active" | "Archived"
  const [selectedOfficeId, setSelectedOfficeId] = useState("")
  const [viewMode, setViewMode] = useState("office") // "office" | "matrix"
  const [confirmModalState, setConfirmModalState] = useState(null)
  
  // Matrix Table Sorting
  const [matrixSortBy, setMatrixSortBy] = useState("name")
  const [matrixSortOrder, setMatrixSortOrder] = useState("ASC")

  const handleMatrixSort = (column) => {
    if (matrixSortBy === column) {
      setMatrixSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"))
    } else {
      setMatrixSortBy(column)
      setMatrixSortOrder("ASC")
    }
  }

  const fetchMatrix = useCallback(async (isSilent = false) => {
    try {
      const cached = getCachedData("systemadmin_module_matrix")
      if (cached && !isSilent) {
        setMatrix(cached)
        if (cached.offices?.length > 0) {
          setSelectedOfficeId((prev) => prev || cached.offices[0].id)
        }
        setLoading(false)
      }

      const res = await fetch("/api/modules/matrix")
      const json = await res.json()
      if (res.ok && json.ok && json.data) {
        setMatrix(json.data)
        setCachedData("systemadmin_module_matrix", json.data, 60000)
        if (json.data.offices?.length > 0) {
          setSelectedOfficeId((prev) => prev || json.data.offices[0].id)
        }
      } else if (!cached) {
        showToast(json.error || "Failed to fetch module matrix", true)
      }
    } catch (err) {
      if (!getCachedData("systemadmin_module_matrix")) {
        showToast("Network error fetching module matrix", true)
      }
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchMatrix()
  }, [fetchMatrix])

  useEffect(() => {
    const urlOffice = new URLSearchParams(window.location.search).get("office")
    if (urlOffice) setSelectedOfficeId(urlOffice)

    const handleSwitch = (e) => {
      if (e.detail?.officeId) {
        setSelectedOfficeId(e.detail.officeId)
      }
    }
    window.addEventListener("switch-view", handleSwitch)
    return () => window.removeEventListener("switch-view", handleSwitch)
  }, [])

  // Optimistic Toggle with Rollback on Error
  const handleToggle = async (officeId, moduleId, currentEnabled, isSystem) => {
    if (isSystem) return

    const targetOffice = matrix?.offices?.find((o) => o.id === officeId)
    if (targetOffice && (targetOffice.status === "Inactive" || targetOffice.status === "Archived")) {
      showToast("Archived offices cannot be modified. Please reactivate the office first.", true)
      return
    }

    const toggleKey = `${officeId}-${moduleId}`
    setToggling((prev) => ({ ...prev, [toggleKey]: true }))

    // Optimistic local state update
    const previousAssignments = matrix.assignments
    setMatrix((prev) => {
      const nextAssignments = { ...prev.assignments }
      nextAssignments[officeId] = {
        ...nextAssignments[officeId],
        [moduleId]: {
          ...nextAssignments[officeId]?.[moduleId],
          enabled: !currentEnabled,
        },
      }
      return { ...prev, assignments: nextAssignments }
    })

    try {
      const officeAssignments = previousAssignments[officeId] || {}
      const currentEnabledIds = Object.keys(officeAssignments).filter(
        (modId) => officeAssignments[modId]?.enabled
      )

      let nextEnabledIds = []
      if (currentEnabled) {
        nextEnabledIds = currentEnabledIds.filter((id) => id !== moduleId)
      } else {
        nextEnabledIds = [...currentEnabledIds, moduleId]
      }

      matrix.modules.forEach((m) => {
        if (m.is_system && !nextEnabledIds.includes(m.id)) {
          nextEnabledIds.push(m.id)
        }
      })

      const res = await fetch(`/api/offices/${officeId}/modules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleIds: nextEnabledIds }),
      })

      const json = await res.json()
      if (res.ok && json.ok) {
        showToast("Feature settings saved")
        invalidateDataCache("systemadmin_module_matrix")
      } else {
        // Rollback on server failure
        setMatrix((prev) => ({ ...prev, assignments: previousAssignments }))
        showToast(json.error || "Failed to update feature settings", true)
      }
    } catch (err) {
      // Rollback on network failure
      setMatrix((prev) => ({ ...prev, assignments: previousAssignments }))
      showToast("Network error updating feature", true)
    } finally {
      setToggling((prev) => {
        const next = { ...prev }
        delete next[toggleKey]
        return next
      })
    }
  }

  // Execute Batch Toggle
  const executeBatchToggle = async (officeId, category, enable) => {
    setConfirmModalState(null)
    const toggleKey = `${officeId}-${category}-batch`
    setToggling((prev) => ({ ...prev, [toggleKey]: true }))

    try {
      const officeAssignments = matrix.assignments[officeId] || {}
      const currentEnabledIds = new Set(
        Object.keys(officeAssignments).filter((modId) => officeAssignments[modId]?.enabled)
      )

      matrix.modules.forEach((m) => {
        if (m.is_system) {
          currentEnabledIds.add(m.id)
        } else if (category === "all" || m.category === category) {
          if (enable) currentEnabledIds.add(m.id)
          else currentEnabledIds.delete(m.id)
        }
      })

      const res = await fetch(`/api/offices/${officeId}/modules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleIds: Array.from(currentEnabledIds) }),
      })

      const json = await res.json()
      if (res.ok && json.ok) {
        const groupName = category === "all" ? "all" : category === "admin" ? "supervisor" : "staff"
        showToast(`Updated ${groupName} features successfully`)
        invalidateDataCache("systemadmin_module_matrix")
        setMatrix((prev) => {
          const nextAssignments = { ...prev.assignments }
          const officeMap = { ...(nextAssignments[officeId] || {}) }
          matrix.modules.forEach((m) => {
            const isEnabled = currentEnabledIds.has(m.id)
            officeMap[m.id] = { ...(officeMap[m.id] || {}), enabled: isEnabled }
          })
          nextAssignments[officeId] = officeMap
          return { ...prev, assignments: nextAssignments }
        })
      } else {
        showToast(json.error || "Failed to update features", true)
      }
    } catch (err) {
      showToast("Network error updating features", true)
    } finally {
      setToggling((prev) => {
        const next = { ...prev }
        delete next[toggleKey]
        return next
      })
    }
  }

  // Intercept Batch Action with Confirmation Modal for Destructive Operations
  const handleBatchToggle = (officeId, category, enable) => {
    const targetOffice = matrix?.offices?.find((o) => o.id === officeId)
    if (targetOffice && (targetOffice.status === "Inactive" || targetOffice.status === "Archived")) {
      showToast("Archived departments cannot be modified. Please reactivate the department first.", true)
      return
    }

    if (!enable) {
      const isAll = category === "all"
      setConfirmModalState({
        open: true,
        title: isAll ? "Keep Essential Features Only?" : `Turn Off Optional ${category === "admin" ? "Supervisor" : "Staff"} Features?`,
        message: isAll
          ? `Are you sure you want to turn off all optional features for ${targetOffice?.short_name || "this department"}? Department staff will no longer be able to use tools like document scanning, file uploads, and student records review. Required core features will remain available.`
          : `Are you sure you want to turn off all optional ${category === "admin" ? "supervisor and department head" : "staff"} features for ${targetOffice?.short_name || "this department"}?`,
        confirmLabel: isAll ? "Keep Essentials Only" : "Turn Off Features",
        variant: "danger",
        action: () => executeBatchToggle(officeId, category, false),
      })
    } else {
      executeBatchToggle(officeId, category, true)
    }
  }

  const currentOffice = useMemo(() => {
    if (!matrix?.offices || matrix.offices.length === 0) return null
    return matrix.offices.find((o) => o.id === selectedOfficeId) || matrix.offices[0]
  }, [matrix, selectedOfficeId])

  const isCurrentArchived = currentOffice?.status === "Inactive" || currentOffice?.status === "Archived"

  const filteredOffices = useMemo(() => {
    if (!matrix?.offices) return []
    return matrix.offices.filter((o) => {
      const isArchived = o.status === "Inactive" || o.status === "Archived"
      if (officeFilter === "Archived") return isArchived
      return !isArchived
    })
  }, [matrix, officeFilter])

  useEffect(() => {
    if (filteredOffices.length > 0 && !filteredOffices.some((o) => o.id === selectedOfficeId)) {
      setSelectedOfficeId(filteredOffices[0].id)
    }
  }, [filteredOffices, selectedOfficeId])

  const officeFilterCounts = useMemo(() => {
    if (!matrix?.offices) return { active: 0, archived: 0 }
    let active = 0
    let archived = 0
    matrix.offices.forEach((o) => {
      if (o.status === "Inactive" || o.status === "Archived") archived++
      else active++
    })
    return { active, archived }
  }, [matrix])

  const filteredModules = useMemo(() => {
    if (!matrix?.modules) return []
    return matrix.modules.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description || "").toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCat = categoryFilter === "All" || m.category === categoryFilter

      let matchesState = true
      if (moduleStatusFilter !== "All") {
        if (viewMode === "office" && currentOffice) {
          const isEnabled = Boolean(m.is_system) || Boolean(matrix.assignments[currentOffice.id]?.[m.id]?.enabled)
          matchesState = moduleStatusFilter === "enabled" ? isEnabled : !isEnabled
        } else {
          const anyEnabled = Boolean(m.is_system) || (matrix.offices || []).some((o) => matrix.assignments[o.id]?.[m.id]?.enabled)
          matchesState = moduleStatusFilter === "enabled" ? anyEnabled : !anyEnabled
        }
      }

      return matchesSearch && matchesCat && matchesState
    })

    list.sort((a, b) => {
      let valA = (a.name || "").toLowerCase()
      let valB = (b.name || "").toLowerCase()
      if (valA < valB) return matrixSortOrder === "ASC" ? -1 : 1
      if (valA > valB) return matrixSortOrder === "ASC" ? 1 : -1
      return 0
    })

    return list
  }, [matrix, searchQuery, categoryFilter, moduleStatusFilter, viewMode, currentOffice, matrixSortOrder])

  const groupedModules = useMemo(() => {
    const admin = filteredModules.filter((m) => m.category === "admin")
    const staff = filteredModules.filter((m) => m.category === "staff")
    return { admin, staff }
  }, [filteredModules])

  const officeCounts = useMemo(() => {
    if (!matrix?.offices || !matrix?.assignments) return {}
    const counts = {}
    matrix.offices.forEach((o) => {
      const officeMap = matrix.assignments[o.id] || {}
      let active = 0
      matrix.modules.forEach((m) => {
        if (m.is_system || officeMap[m.id]?.enabled) active++
      })
      counts[o.id] = active
    })
    return counts
  }, [matrix])

  const hasActiveFilters =
    searchQuery !== "" ||
    categoryFilter !== "All" ||
    moduleStatusFilter !== "All"

  const handleClearFilters = () => {
    setSearchQuery("")
    setCategoryFilter("All")
    setModuleStatusFilter("All")
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 w-full animate-fade-up font-inter">
        <Skeleton className="h-10 w-64 rounded-md" />
        <Skeleton className="h-4 w-96 rounded-md" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    )
  }

  // Empty State if No Offices exist in the system (Matches OfficeManagementTab design)
  if (!matrix?.offices || matrix.offices.length === 0) {
    return (
      <div className="flex flex-col gap-6 w-full animate-fade-up font-inter">
        <PageHeader
          icon="ph-bold ph-squares-four"
          title="Department Features & Permissions"
          description="Turn system features on or off for each department."
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
        />
        <div className="flex h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-white/40 dark:bg-zinc-900/20 text-center">
          <Empty className="flex flex-col items-center justify-center border-0 bg-transparent text-center">
            <EmptyHeader className="flex flex-col items-center gap-0">
              <div className="relative mb-6">
                <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                  <i className="ph-bold ph-buildings text-3xl text-gray-400 dark:text-zinc-500"></i>
                </EmptyMedia>
              </div>
              <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                No Departments Found
              </EmptyTitle>
              <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400 mt-1">
                There are currently no campus departments or administrative offices configured in the system.
              </EmptyDescription>
              <Button
                onClick={() => window.dispatchEvent(new CustomEvent("switch-view", { detail: { view: "offices" } }))}
                className="mt-6 flex h-10 items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 text-xs font-semibold shadow-xs dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 cursor-pointer"
              >
                <i className="ph-bold ph-plus"></i>
                Go to Departments & Stations
              </Button>
            </EmptyHeader>
          </Empty>
        </div>
      </div>
    )
  }

  const { offices, modules } = matrix

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up font-inter">
      {/* Main Card with Header, Active Filter Chips & Toolbar (Matches Department & Stations) */}
      <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none overflow-hidden">
        <PageHeader
          icon="ph-bold ph-squares-four"
          title={
            <div className="flex items-center gap-[6px]">
              Department Features & Permissions
              {officeFilter === "Archived" && (
                <span className="text-[12px] font-normal text-emerald-600 dark:text-emerald-400">
                  · Restore Mode
                </span>
              )}
            </div>
          }
          description="Turn system features on or off for each department. Tools are organized by who uses them: supervisors or frontline staff."
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-zinc-800/70 p-1 rounded-xl border border-gray-200/60 dark:border-white/5">
              <button
                type="button"
                onClick={() => setViewMode("office")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border-0",
                  viewMode === "office"
                    ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-50 shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 bg-transparent"
                )}
              >
                <i className="ph-bold ph-buildings text-sm"></i>
                By Department
              </button>
              <button
                type="button"
                onClick={() => setViewMode("matrix")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border-0",
                  viewMode === "matrix"
                    ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-50 shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 bg-transparent"
                )}
              >
                <i className="ph-bold ph-table text-sm"></i>
                Summary Table
              </button>
            </div>
          }
        />

        {/* Active Filter Chips Row (Matches Department & Stations Chip Style) */}
        {hasActiveFilters && (
          <div className="flex-none border-b border-gray-100 bg-white px-6 py-3 animate-in fade-in slide-in-from-top-1 duration-normal dark:border-white/10 dark:bg-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500">
                Active filters:
              </span>
              {searchQuery && (
                <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                  Search: {searchQuery}
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                  >
                    ×
                  </button>
                </div>
              )}
              {categoryFilter !== "All" && (
                <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                  Role: {categoryFilter === "admin" ? "Supervisors & Heads" : "Staff Tools"}
                  <button
                    onClick={() => setCategoryFilter("All")}
                    className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                  >
                    ×
                  </button>
                </div>
              )}
              {moduleStatusFilter !== "All" && (
                <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                  Feature: {moduleStatusFilter === "enabled" ? "Enabled Only" : "Disabled Only"}
                  <button
                    onClick={() => setModuleStatusFilter("All")}
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

        {/* Toolbar with Department Tabs, Search Input & Dropdown Filters inside CardContent */}
        <CardContent className="font-inter bg-white p-[24px] dark:bg-card/50 backdrop-blur-md flex flex-col gap-5">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 w-full select-none">
            {/* Left: Active vs Archived Underline Tabs */}
            <div className="flex items-center gap-6 shrink-0 h-10 px-1 self-start lg:self-auto">
              <button
                type="button"
                onClick={() => setOfficeFilter("Active")}
                className={cn(
                  "relative h-full flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
                  officeFilter === "Active"
                    ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                    : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
                )}
              >
                Active ({officeFilterCounts.active})
              </button>
              <button
                type="button"
                onClick={() => setOfficeFilter("Archived")}
                className={cn(
                  "relative h-full flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
                  officeFilter === "Archived"
                    ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                    : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
                )}
              >
                Archived ({officeFilterCounts.archived})
              </button>
            </div>

            {/* Right: Search Input & Dropdown Popovers Group */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full lg:w-auto">
              {/* Search Input with increased width */}
              <div className="w-full sm:w-[360px] lg:w-[420px] relative group shrink-0">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <i className="ph-bold ph-magnifying-glass text-gray-400 transition-colors group-focus-within:text-pup-maroon dark:text-zinc-500 text-sm"></i>
                </div>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search features by name, description, or keyword..."
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-24 text-xs font-normal placeholder:text-gray-400 dark:border-white/10 dark:bg-card focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5"
                />
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                  {filteredModules.length > 0 ? `${filteredModules.length} features` : "0 features"}
                </div>
              </div>

              {/* Role Select Popover */}
              <div className="w-full sm:w-[185px] shrink-0">
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-10 rounded-xl border border-gray-200 text-xs font-normal bg-white dark:bg-card dark:border-white/10"
                >
                  <option value="All">All Roles ({modules.length})</option>
                  <option value="admin">Supervisors & Heads ({modules.filter((m) => m.category === "admin").length})</option>
                  <option value="staff">Staff Tools ({modules.filter((m) => m.category === "staff").length})</option>
                </Select>
              </div>

              {/* Status Select Popover */}
              <div className="w-full sm:w-[145px] shrink-0">
                <Select
                  value={moduleStatusFilter}
                  onChange={(e) => setModuleStatusFilter(e.target.value)}
                  className="h-10 rounded-xl border border-gray-200 text-xs font-normal bg-white dark:bg-card dark:border-white/10"
                >
                  <option value="All">All Status</option>
                  <option value="enabled">Enabled Only</option>
                  <option value="disabled">Disabled Only</option>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* VIEW 1: BY OFFICE */}
      {viewMode === "office" && (
        <div className="flex flex-col gap-6">
          {filteredOffices.length === 0 ? (
            <div className="flex h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-white/40 dark:bg-zinc-900/20 text-center">
              <Empty className="flex flex-col items-center justify-center border-0 bg-transparent text-center">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                    <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                      <i className={cn(
                        officeFilter === "Archived" ? "ph-archive" : "ph-buildings",
                        "text-3xl text-gray-400 dark:text-zinc-500"
                      )}></i>
                    </EmptyMedia>
                  </div>
                  <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                    {officeFilter === "Archived" ? "No Archived Departments Found" : "No Departments Found"}
                  </EmptyTitle>
                  <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400 mt-1">
                    {officeFilter === "Archived"
                      ? "There are currently no archived or deactivated departments in the system."
                      : "No departments matching your current filter were found."}
                  </EmptyDescription>
                  {officeFilter === "Archived" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOfficeFilter("Active")}
                      className="mt-6 flex h-10 items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 text-xs font-semibold text-gray-700 shadow-xs transition-colors hover:bg-gray-50 dark:bg-zinc-900 dark:border-white/10 dark:text-zinc-300 cursor-pointer"
                    >
                      <i className="ph-bold ph-arrow-counter-clockwise"></i>
                      View Active Departments
                    </Button>
                  )}
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <>
              {/* Department Selector Carousel */}
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-semibold text-gray-500 dark:text-zinc-400 px-1 gap-1">
                  <span>Select Department ({filteredOffices.length}):</span>
                  <span className="text-[11px] font-normal text-gray-400">
                    Click a department to customize the features its staff can use
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredOffices.map((o) => {
                  const isSelected = o.id === selectedOfficeId
                  const isOfficeArchived = o.status === "Inactive" || o.status === "Archived"
                  const activeCount = officeCounts[o.id] || 0
                  const accent = o.accent_color || "#800000"
                  const officeIconClass = getOfficeIcon(o)

                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setSelectedOfficeId(o.id)}
                      className={cn(
                        "p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-3 cursor-pointer group select-none",
                        isSelected
                          ? "bg-white dark:bg-zinc-900 shadow-md ring-2 ring-pup-maroon/20 dark:ring-white/20 border-pup-maroon dark:border-white/30"
                          : "bg-white/60 dark:bg-zinc-900/40 border-gray-200/80 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 hover:bg-white dark:hover:bg-zinc-900",
                        isOfficeArchived && !isSelected && "opacity-75"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-8 w-8 rounded-lg flex items-center justify-center text-sm shadow-2xs shrink-0"
                            style={{
                              backgroundColor: `${accent}15`,
                              color: accent,
                            }}
                          >
                            <i className={cn(officeIconClass, "text-base")}></i>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-gray-900 dark:text-zinc-50 group-hover:text-pup-maroon transition-colors">
                              {o.short_name}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              ID: {o.id}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isOfficeArchived ? (
                            <span className="rounded-[4px] px-[6px] py-[2px] text-[10px] font-medium tracking-[0.04em] bg-gray-100 text-[#8E8E93] dark:bg-zinc-800 dark:text-zinc-400">
                              Archived
                            </span>
                          ) : (
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full border-0 font-bold",
                                isSelected
                                  ? "bg-pup-maroon text-white dark:bg-zinc-100 dark:text-zinc-900"
                                  : "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300"
                              )}
                            >
                              {activeCount}/{modules.length}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400 truncate w-full">
                        <span className="truncate">{o.name || o.short_name}</span>
                        {isOfficeArchived && (
                          <span className="text-[10px] text-gray-400 ml-1 shrink-0 font-medium">
                            {activeCount} active
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
          </div>

          {/* Active Office Banner & Module Grid */}
          {currentOffice && (
            <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card overflow-hidden">
              <div className="p-5 border-b border-gray-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-950/20">
                <div className="flex items-center gap-3.5">
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center text-xl shadow-xs shrink-0"
                    style={{
                      backgroundColor: `${currentOffice.accent_color || "#800000"}15`,
                      color: currentOffice.accent_color || "#800000",
                    }}
                  >
                    <i className={cn(getOfficeIcon(currentOffice), "text-xl")}></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50">
                        {currentOffice.name || currentOffice.short_name} ({currentOffice.short_name})
                      </h3>
                      <StatusChip status={currentOffice.status} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                      {isCurrentArchived
                        ? `This department is currently archived. Its features cannot be changed while it is inactive.`
                        : `Customize the features and tools available to ${currentOffice.short_name} staff and supervisors.`}
                    </p>
                  </div>
                </div>

                {/* Quick Batch Actions for this office */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isCurrentArchived || Boolean(toggling[`${currentOffice.id}-all-batch`])}
                    onClick={() => handleBatchToggle(currentOffice.id, "all", true)}
                    title={isCurrentArchived ? "Archived departments cannot be modified" : undefined}
                    className="h-8 text-xs font-semibold rounded-xl border-gray-200 dark:border-white/10 cursor-pointer flex items-center gap-1.5 px-3 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <i className="ph-bold ph-checks text-sm text-emerald-600 dark:text-emerald-400"></i>
                    <span>Turn On All</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isCurrentArchived || Boolean(toggling[`${currentOffice.id}-all-batch`])}
                    onClick={() => handleBatchToggle(currentOffice.id, "all", false)}
                    title={isCurrentArchived ? "Archived departments cannot be modified" : "Turn off optional features and keep required system tools only"}
                    className="h-8 text-xs font-semibold rounded-xl border-gray-200 dark:border-white/10 text-gray-600 hover:text-red-600 cursor-pointer flex items-center gap-1.5 px-3 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <i className="ph-bold ph-arrow-counter-clockwise text-sm"></i>
                    <span>Essentials Only</span>
                  </Button>
                </div>
              </div>

              {/* Archived Office Warning Notice Banner with Direct Action */}
              {isCurrentArchived && (
                <div className="mx-5 my-3.5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-800 dark:text-amber-300 text-xs">
                  <div className="flex items-center gap-3">
                    <i className="ph-bold ph-warning-circle text-base text-amber-600 dark:text-amber-400 shrink-0"></i>
                    <span className="leading-relaxed">
                      <strong>Archived Department Notice:</strong> This department is currently inactive. Its features cannot be modified while it is archived. Reactivate this department in <strong>Departments & Stations</strong> to change feature access.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent("switch-view", { detail: { view: "offices", officeId: currentOffice.id } }))}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 text-xs font-semibold shrink-0 cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <span>Reactivate Department</span>
                    <i className="ph-bold ph-arrow-right text-xs"></i>
                  </button>
                </div>
              )}

              {/* Module Cards Content Area */}
              <CardContent className="p-6 space-y-8">
                {/* Empty State when no modules match filters */}
                {filteredModules.length === 0 ? (
                  <div className="flex h-[380px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-white/40 dark:bg-zinc-900/20 text-center my-2">
                    <Empty className="flex flex-col items-center justify-center border-0 bg-transparent text-center">
                      <EmptyHeader className="flex flex-col items-center gap-0">
                        <div className="relative mb-6">
                          <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                          <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                            <i className="ph-bold ph-magnifying-glass text-3xl text-gray-400 dark:text-zinc-500"></i>
                          </EmptyMedia>
                        </div>
                        <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                          No Features Found
                        </EmptyTitle>
                        <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400 mt-1">
                          We couldn&apos;t find any features matching your search or filter criteria. Try clearing filters or adjusting your keywords.
                        </EmptyDescription>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClearFilters}
                          className="mt-6 flex h-10 items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 text-xs font-semibold text-gray-700 shadow-xs transition-colors hover:bg-gray-50 dark:bg-zinc-900 dark:border-white/10 dark:text-zinc-300 cursor-pointer"
                        >
                          <i className="ph-bold ph-arrow-counter-clockwise"></i>
                          Clear Search & Filters
                        </Button>
                      </EmptyHeader>
                    </Empty>
                  </div>
                ) : (
                  <>
                    {/* ROLE OPERATION GROUP 1: SUPERVISOR & HEAD TOOLS */}
                    {(categoryFilter === "All" || categoryFilter === "admin") && (
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-gray-100 dark:border-white/5 gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-red-50 text-pup-maroon dark:bg-red-950/30 dark:text-red-400 flex items-center justify-center text-sm">
                              <i className="ph-bold ph-shield-check"></i>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-50">
                                  Supervisor & Department Head Tools
                                </h4>
                                <span className="text-[10px] px-2 py-0.2 rounded-full bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400 font-bold">
                                  {groupedModules.admin.filter(
                                    (m) =>
                                      m.is_system ||
                                      matrix.assignments[currentOffice.id]?.[m.id]?.enabled
                                  ).length}{" "}
                                  / {groupedModules.admin.length} active
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                                Management dashboards, turnaround reports, compliance tracking, and department settings.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <button
                              type="button"
                              disabled={isCurrentArchived}
                              onClick={() => handleBatchToggle(currentOffice.id, "admin", true)}
                              title={isCurrentArchived ? "Archived departments cannot be modified" : undefined}
                              className={cn(
                                "text-[11px] font-semibold text-pup-maroon hover:underline dark:text-red-400 cursor-pointer inline-flex items-center gap-1",
                                isCurrentArchived && "opacity-40 cursor-not-allowed hover:no-underline"
                              )}
                            >
                              <i className="ph-bold ph-check text-[10px]"></i>
                              Turn On All
                            </button>
                            <span className="text-gray-300 dark:text-zinc-700">·</span>
                            <button
                              type="button"
                              disabled={isCurrentArchived}
                              onClick={() => handleBatchToggle(currentOffice.id, "admin", false)}
                              title={isCurrentArchived ? "Archived departments cannot be modified" : undefined}
                              className={cn(
                                "text-[11px] font-semibold text-gray-500 hover:underline dark:text-zinc-400 cursor-pointer inline-flex items-center gap-1",
                                isCurrentArchived && "opacity-40 cursor-not-allowed hover:no-underline"
                              )}
                            >
                              <i className="ph-bold ph-x text-[10px]"></i>
                              Turn Off Optional
                            </button>
                          </div>
                        </div>

                        {groupedModules.admin.length === 0 ? (
                          <div className="p-6 text-center text-xs text-gray-400">
                            No supervisor tools match your current filters.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                            {groupedModules.admin.map((m) => (
                              <ModuleCard
                                key={m.id}
                                m={m}
                                office={currentOffice}
                                assignments={matrix.assignments}
                                toggling={toggling}
                                onToggle={handleToggle}
                                isOfficeArchived={isCurrentArchived}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ROLE OPERATION GROUP 2: STAFF & FRONTLINE TOOLS */}
                    {(categoryFilter === "All" || categoryFilter === "staff") && (
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-gray-100 dark:border-white/5 gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 flex items-center justify-center text-sm">
                              <i className="ph-bold ph-identification-badge"></i>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-50">
                                  Staff & Frontline Tools
                                </h4>
                                <span className="text-[10px] px-2 py-0.2 rounded-full bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400 font-bold">
                                  {groupedModules.staff.filter(
                                    (m) =>
                                      m.is_system ||
                                      matrix.assignments[currentOffice.id]?.[m.id]?.enabled
                                  ).length}{" "}
                                  / {groupedModules.staff.length} active
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                                Document scanning, text recognition (OCR), student records search, and request processing.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <button
                              type="button"
                              disabled={isCurrentArchived}
                              onClick={() => handleBatchToggle(currentOffice.id, "staff", true)}
                              title={isCurrentArchived ? "Archived departments cannot be modified" : undefined}
                              className={cn(
                                "text-[11px] font-semibold text-pup-maroon hover:underline dark:text-red-400 cursor-pointer inline-flex items-center gap-1",
                                isCurrentArchived && "opacity-40 cursor-not-allowed hover:no-underline"
                              )}
                            >
                              <i className="ph-bold ph-check text-[10px]"></i>
                              Turn On All
                            </button>
                            <span className="text-gray-300 dark:text-zinc-700">·</span>
                            <button
                              type="button"
                              disabled={isCurrentArchived}
                              onClick={() => handleBatchToggle(currentOffice.id, "staff", false)}
                              title={isCurrentArchived ? "Archived departments cannot be modified" : undefined}
                              className={cn(
                                "text-[11px] font-semibold text-gray-500 hover:underline dark:text-zinc-400 cursor-pointer inline-flex items-center gap-1",
                                isCurrentArchived && "opacity-40 cursor-not-allowed hover:no-underline"
                              )}
                            >
                              <i className="ph-bold ph-x text-[10px]"></i>
                              Turn Off Optional
                            </button>
                          </div>
                        </div>

                        {groupedModules.staff.length === 0 ? (
                          <div className="p-6 text-center text-xs text-gray-400">
                            No staff tools match your current filters.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                            {groupedModules.staff.map((m) => (
                              <ModuleCard
                                key={m.id}
                                m={m}
                                office={currentOffice}
                                assignments={matrix.assignments}
                                toggling={toggling}
                                onToggle={handleToggle}
                                isOfficeArchived={isCurrentArchived}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
            </>
          )}
        </div>
      )}

      {/* VIEW 2: MATRIX OVERVIEW TABLE (Bird's-eye cross-office audit) */}
      {viewMode === "matrix" && (
        <>
          {filteredOffices.length === 0 ? (
            <div className="flex h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-white/40 dark:bg-zinc-900/20 text-center">
              <Empty className="flex flex-col items-center justify-center border-0 bg-transparent text-center">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                    <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                      <i className={cn(
                        officeFilter === "Archived" ? "ph-archive" : "ph-buildings",
                        "text-3xl text-gray-400 dark:text-zinc-500"
                      )}></i>
                    </EmptyMedia>
                  </div>
                  <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                    {officeFilter === "Archived" ? "No Archived Departments Found" : "No Departments Found"}
                  </EmptyTitle>
                  <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400 mt-1">
                    {officeFilter === "Archived"
                      ? "There are currently no archived or deactivated departments in the system."
                      : "No departments matching your current filter were found."}
                  </EmptyDescription>
                  {officeFilter === "Archived" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOfficeFilter("Active")}
                      className="mt-6 flex h-10 items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 text-xs font-semibold text-gray-700 shadow-xs transition-colors hover:bg-gray-50 dark:bg-zinc-900 dark:border-white/10 dark:text-zinc-300 cursor-pointer"
                    >
                      <i className="ph-bold ph-arrow-counter-clockwise"></i>
                      View Active Departments
                    </Button>
                  )}
                </EmptyHeader>
              </Empty>
            </div>
          ) : filteredModules.length === 0 ? (
            <div className="flex h-[380px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-white/40 dark:bg-zinc-900/20 text-center">
              <Empty className="flex flex-col items-center justify-center border-0 bg-transparent text-center">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                    <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                      <i className="ph-bold ph-magnifying-glass text-3xl text-gray-400 dark:text-zinc-500"></i>
                    </EmptyMedia>
                  </div>
                  <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                    No Features Found
                  </EmptyTitle>
                  <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400 mt-1">
                    We couldn&apos;t find any features matching your search or filter criteria in the summary table.
                  </EmptyDescription>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearFilters}
                    className="mt-6 flex h-10 items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 text-xs font-semibold text-gray-700 shadow-xs transition-colors hover:bg-gray-50 dark:bg-zinc-900 dark:border-white/10 dark:text-zinc-300 cursor-pointer"
                  >
                    <i className="ph-bold ph-arrow-counter-clockwise"></i>
                    Clear Search & Filters
                  </Button>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200/80 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-sm">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 z-20 border-b-[0.5px] border-black/10 dark:border-white/10 bg-white dark:bg-card">
                  <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500 select-none">
                    <th className="p-4 min-w-[280px] sticky left-0 bg-white dark:bg-zinc-900 z-30 border-r border-gray-200/80 dark:border-white/10 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.06)]">
                      <button
                        onClick={() => handleMatrixSort("name")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                          matrixSortBy === "name" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                        )}
                      >
                        System Feature{" "}
                        <SortIndicator column="name" sortBy={matrixSortBy} sortOrder={matrixSortOrder} />
                      </button>
                    </th>
                    {filteredOffices.map((o) => {
                      const isArchived = o.status === "Inactive" || o.status === "Archived"
                      return (
                        <th
                          key={o.id}
                          className={cn(
                            "p-4 text-center min-w-[120px]",
                            isArchived && "opacity-75"
                          )}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <span 
                              className="text-[13px] font-semibold tracking-tight"
                              style={{ color: o.accent_color || "#800000" }}
                            >
                              {o.short_name}
                            </span>
                            {isArchived ? (
                              <span className="rounded-[4px] px-[6px] py-[1.5px] text-[9.5px] font-medium tracking-[0.04em] bg-gray-100 text-[#8E8E93] dark:bg-zinc-800 dark:text-zinc-400 normal-case">
                                Archived
                              </span>
                            ) : (
                              <span className="text-[10px] font-normal text-gray-400 dark:text-zinc-500">
                                {officeCounts[o.id] || 0}/{modules.length}
                              </span>
                            )}
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {/* Head / Admin Group Row */}
                  {(categoryFilter === "All" || categoryFilter === "admin") && groupedModules.admin.length > 0 && (
                    <>
                      <tr className="bg-gray-100/60 dark:bg-zinc-950/40">
                        <td
                          colSpan={filteredOffices.length + 1}
                          className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 sticky left-0 bg-gray-100/90 dark:bg-zinc-950/80 backdrop-blur-xs"
                        >
                          Supervisor & Department Head Tools ({groupedModules.admin.length})
                        </td>
                      </tr>
                      {groupedModules.admin.map((m) => (
                        <MatrixTableRow
                          key={m.id}
                          m={m}
                          offices={filteredOffices}
                          assignments={matrix.assignments}
                          toggling={toggling}
                          onToggle={handleToggle}
                        />
                      ))}
                    </>
                  )}

                  {/* Staff Workspace Group Row */}
                  {(categoryFilter === "All" || categoryFilter === "staff") && groupedModules.staff.length > 0 && (
                    <>
                      <tr className="bg-gray-100/60 dark:bg-zinc-950/40">
                        <td
                          colSpan={filteredOffices.length + 1}
                          className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 sticky left-0 bg-gray-100/90 dark:bg-zinc-950/80 backdrop-blur-xs"
                        >
                          Staff & Frontline Tools ({groupedModules.staff.length})
                        </td>
                      </tr>
                      {groupedModules.staff.map((m) => (
                        <MatrixTableRow
                          key={m.id}
                          m={m}
                          offices={filteredOffices}
                          assignments={matrix.assignments}
                          toggling={toggling}
                          onToggle={handleToggle}
                        />
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Confirmation Modal for Destructive Batch Actions */}
      {confirmModalState && (
        <ConfirmModal
          open={confirmModalState.open}
          title={confirmModalState.title}
          message={confirmModalState.message}
          confirmLabel={confirmModalState.confirmLabel}
          variant={confirmModalState.variant || "danger"}
          onConfirm={confirmModalState.action}
          onCancel={() => setConfirmModalState(null)}
          isLoading={confirmModalState.isLoading}
          isAppleStyled={true}
        />
      )}
    </div>
  )
}

/**
 * Clean, interactive card for an individual module in the By-Office view
 */
function ModuleCard({ m, office, assignments, toggling, onToggle, isOfficeArchived }) {
  const toggleKey = `${office.id}-${m.id}`
  const isToggling = toggling[toggleKey]
  const isSystem = Boolean(m.is_system)
  const isEnabled = isSystem || Boolean(assignments[office.id]?.[m.id]?.enabled)
  const moduleIconClass = getModuleIcon(m)
  const isLocked = isSystem || isOfficeArchived

  return (
    <div
      className={cn(
        "p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 select-none",
        isEnabled
          ? "bg-white dark:bg-zinc-900 border-gray-200 dark:border-white/10 shadow-2xs hover:shadow-sm"
          : "bg-gray-50/50 dark:bg-zinc-950/40 border-gray-200/60 dark:border-white/5 opacity-70 hover:opacity-100"
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center text-sm shrink-0",
                isEnabled
                  ? "bg-pup-maroon/10 text-pup-maroon dark:bg-white/10 dark:text-zinc-100"
                  : "bg-gray-200/60 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400"
              )}
            >
              <i className={cn(moduleIconClass, "text-base")}></i>
            </div>
            <div>
              <h5 className="text-xs font-bold text-gray-900 dark:text-zinc-50 leading-tight">
                {m.name}
              </h5>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-gray-400">
                  {m.id}
                </span>
                <span className="text-gray-300 dark:text-zinc-700 text-[10px]">·</span>
                <span className="text-[10px] font-medium text-gray-500 dark:text-zinc-400">
                  {getModuleTargetText(m)}
                </span>
              </div>
            </div>
          </div>

          {isSystem ? (
            <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 text-[9px] font-bold border-0 tracking-wider uppercase">
              Required
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className={cn(
                "text-[9px] font-semibold border-0",
                isEnabled
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                  : "bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400"
              )}
            >
              {isEnabled ? "Active" : "Disabled"}
            </Badge>
          )}
        </div>

        <p className="text-[11px] text-gray-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
          {m.description || "Standard system feature."}
        </p>
      </div>

      <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
        <span className="text-[11px] font-medium text-gray-600 dark:text-zinc-400">
          {isSystem ? "Always Active (Required)" : isOfficeArchived ? "Locked (Archived Department)" : isEnabled ? "Available to Staff" : "Turned Off"}
        </span>

        {isToggling ? (
          <div className="w-8 h-4 flex items-center justify-center">
            <div className="w-3.5 h-3.5 border-2 border-pup-maroon border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <label 
            title={isOfficeArchived ? "Reactivate this department to change feature access" : isSystem ? "This is a required system tool and cannot be turned off" : undefined}
            className={cn("relative inline-flex items-center select-none", isLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer")}
          >
            <input
              type="checkbox"
              checked={isEnabled}
              disabled={isLocked}
              onChange={() => onToggle(office.id, m.id, isEnabled, isSystem)}
              className="sr-only peer"
            />
            <div
              className={cn(
                "w-9 h-5 bg-gray-200 peer-focus:outline-hidden dark:bg-zinc-700 rounded-full peer",
                "peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:bg-zinc-900 dark:after:border-zinc-700",
                isSystem
                  ? "peer-checked:bg-blue-500 cursor-not-allowed"
                  : isOfficeArchived
                  ? "peer-checked:bg-gray-400 dark:peer-checked:bg-zinc-600 cursor-not-allowed"
                  : "peer-checked:bg-pup-maroon dark:peer-checked:bg-zinc-100"
              )}
            ></div>
          </label>
        )}
      </div>
    </div>
  )
}

/**
 * Matrix table row used in Matrix Overview view
 */
function MatrixTableRow({ m, offices, assignments, toggling, onToggle }) {
  const isSystem = Boolean(m.is_system)
  const moduleIconClass = getModuleIcon(m)

  return (
    <tr className="hover:bg-gray-50/40 dark:hover:bg-white/2 transition-colors">
      <td className="p-4 align-top sticky left-0 bg-white dark:bg-zinc-900 z-10 border-r border-gray-200/80 dark:border-white/10 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.06)]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-7 w-7 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 dark:text-zinc-400 text-xs shrink-0">
            <i className={cn(moduleIconClass, "text-sm")}></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-gray-900 dark:text-zinc-50">
                {m.name}
              </span>
              {isSystem && (
                <span className="bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-sm">
                  Required
                </span>
              )}
              <span className="text-[10px] font-medium text-gray-400 dark:text-zinc-500">
                ({getModuleTargetText(m)})
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 max-w-md">
              {m.description || "Standard system feature."}
            </p>
          </div>
        </div>
      </td>

      {offices.map((o) => {
        const toggleKey = `${o.id}-${m.id}`
        const isToggling = toggling[toggleKey]
        const enabled = isSystem || Boolean(assignments[o.id]?.[m.id]?.enabled)
        const isOfficeArchived = o.status === "Inactive" || o.status === "Archived"
        const isLocked = isSystem || isOfficeArchived

        return (
          <td key={o.id} className="p-4 text-center align-middle">
            <div className="inline-flex items-center justify-center">
              {isToggling ? (
                <div className="w-8 h-4 flex items-center justify-center">
                  <div className="w-3.5 h-3.5 border-2 border-pup-maroon border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <label 
                  title={isOfficeArchived ? `Reactivate ${o.short_name} to change feature access` : isSystem ? "This is a required system tool and cannot be turned off" : undefined}
                  className={cn("relative inline-flex items-center select-none", isLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer")}
                >
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={isLocked}
                    onChange={() => onToggle(o.id, m.id, enabled, isSystem)}
                    className="sr-only peer"
                  />
                  <div
                    className={cn(
                      "w-8 h-4 bg-gray-200 peer-focus:outline-hidden dark:bg-zinc-700 rounded-full peer",
                      "peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:after:bg-zinc-900 dark:after:border-zinc-700",
                      isSystem
                        ? "peer-checked:bg-blue-500 cursor-not-allowed"
                        : isOfficeArchived
                        ? "peer-checked:bg-gray-400 dark:peer-checked:bg-zinc-600 cursor-not-allowed"
                        : "peer-checked:bg-pup-maroon dark:peer-checked:bg-zinc-100"
                    )}
                  ></div>
                </label>
              )}
            </div>
          </td>
        )
      })}
    </tr>
  )
}

