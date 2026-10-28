"use client"

import HugeIcon from "@/components/shared/HugeIcon";
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import ModuleConfigSkeleton from "@/components/systemadmin/skeletons/ModuleConfigSkeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import MultiCriteriaFilter from "@/components/shared/MultiCriteriaFilter"
import ActiveFilterChips from "@/components/shared/ActiveFilterChips"
import PageHeader from "@/components/shared/PageHeader"
import { RefreshButton } from "@/components/shared/RefreshButton"
import ConfirmModal from "@/components/shared/ConfirmModal"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"
import { getCachedData, setCachedData, invalidateDataCache } from "@/lib/dataCache"
import useTableScroll from "@/hooks/useTableScroll"
import TableScrollControls from "@/components/shared/TableScrollControls"

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
  if (m?.id === "document_requests") return "ph-bold ph-tray-arrow-up"
  if (m?.id === "student_directory") return "ph-bold ph-users"
  if (m?.id === "scan_upload") return "ph-bold ph-scan"
  if (m?.id === "documents") return "ph-bold ph-file-text"
  if (m?.id === "notifications") return "ph-bold ph-bell"
  if (m?.id === "records_archive") return "ph-bold ph-archive-box"
  if (m?.id === "storage_explorer") return "ph-bold ph-folder-open"
  if (m?.id === "student_organizations") return "ph-bold ph-buildings"
  return "ph-bold ph-cube"
}

function getModuleTargetText(m) {
  if (m?.is_system) return "Required System Feature"
  if (m?.id === "student_organizations") return "OSAS Student Organizations & Officer Access"
  if (m?.id === "scan_upload") return "Document Scanning Station"
  if (m?.id === "documents") return "Student Records Search"
  if (m?.id === "records_review") return "Document Approvals"
  if (m?.id === "document_requests") return "Student Document Requests"
  if (m?.id === "student_directory") return "Student Master Records & Profiles"
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
        "rounded-full px-[10px] py-[2.5px] text-[11px] font-medium tracking-[0.04em] select-none inline-flex items-center",
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
    return <HugeIcon  className="ph-bold ph-caret-up-down ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"></HugeIcon>
  }
  return sortOrder === "ASC" ? (
    <HugeIcon  className="ph-bold ph-caret-up ml-1 text-[12px] text-gray-400"></HugeIcon>
  ) : (
    <HugeIcon  className="ph-bold ph-caret-down ml-1 text-[12px] text-gray-400"></HugeIcon>
  )
}

export default function ModuleConfigTab({ showToast }) {
  const [matrix, setMatrix] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isManualLoading, setIsManualLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [moduleFilters, setModuleFilters] = useState({
    category: [],
    status: [],
  })
  const [officeFilter, setOfficeFilter] = useState("Active") // "Active" | "Archived"
  const [selectedOfficeId, setSelectedOfficeId] = useState("")
  const [viewMode, setViewMode] = useState("office") // "office" | "matrix"
  const [confirmModalState, setConfirmModalState] = useState(null)
  const [toggling, setToggling] = useState({})
  
  // Matrix Table Sorting
  const [matrixSortBy, setMatrixSortBy] = useState("name")
  const [matrixSortOrder, setMatrixSortOrder] = useState("ASC")

  // Horizontal scroll hook for Compare Features (Matrix view)
  const {
    tableContainerRef: matrixTableContainerRef,
    canScrollLeft,
    canScrollRight,
    isScrolled,
    scrollLeft,
    scrollRight,
    resetScroll: resetMatrixScroll,
  } = useTableScroll([filteredOffices?.length, modules?.length]);

  useEffect(() => {
    resetMatrixScroll();
  }, [viewMode, searchQuery, moduleFilters, officeFilter, matrixSortBy, matrixSortOrder, resetMatrixScroll]);

  // Dismissed Archived Department Notice Alerts
  const [dismissedArchivedAlerts, setDismissedArchivedAlerts] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("pupsj_dismissed_archived_dept_alerts")
        return stored ? JSON.parse(stored) : []
      } catch {
        return []
      }
    }
    return []
  })

  const handleDismissArchivedAlert = (officeId) => {
    setDismissedArchivedAlerts((prev) => {
      const updated = prev.includes(officeId) ? prev : [...prev, officeId]
      try {
        sessionStorage.setItem("pupsj_dismissed_archived_dept_alerts", JSON.stringify(updated))
      } catch {}
      return updated
    })
  }

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
    } catch {
      if (!getCachedData("systemadmin_module_matrix")) {
        showToast("Network error fetching module matrix", true)
      }
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const handleManualRefresh = useCallback(async () => {
    setIsManualLoading(true)
    try {
      await fetchMatrix(true)
    } finally {
      setIsManualLoading(false)
    }
  }, [fetchMatrix])

  useEffect(() => {
    const timer = setTimeout(() => fetchMatrix(), 0)
    return () => clearTimeout(timer)
  }, [fetchMatrix])

  useEffect(() => {
    const timer = setTimeout(() => {
      const urlOffice = new URLSearchParams(window.location.search).get("office")
      if (urlOffice) setSelectedOfficeId(urlOffice)
    }, 0)

    const handleSwitch = (e) => {
      if (e.detail?.officeId) {
        setSelectedOfficeId(e.detail.officeId)
      }
    }
    window.addEventListener("switch-view", handleSwitch)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("switch-view", handleSwitch)
    }
  }, [])

  // Optimistic Toggle with Rollback on Error
  const handleToggle = async (officeId, moduleId, currentEnabled, isSystem) => {
    if (isSystem) return

    const targetOffice = matrix?.offices?.find((o) => o.id === officeId)
    if (targetOffice && (targetOffice.status === "Inactive" || targetOffice.status === "Archived")) {
      showToast("Archived departments cannot be modified. Please restore the department first.", true)
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
    } catch {
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
    } catch {
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
      showToast("Archived departments cannot be modified. Please restore the department first.", true)
      return
    }

    if (!enable) {
      const isAll = category === "all"
      // Build selectedItems list: the affected office
      const affectedItems = targetOffice
        ? [`${targetOffice.short_name} (${targetOffice.id})`]
        : []
      setConfirmModalState({
        open: true,
        title: isAll ? "Reset to Core Features Only?" : `Turn Off Optional ${category === "admin" ? "Supervisor" : "Staff"} Features?`,
        message: isAll
          ? `Are you sure you want to turn off all optional features for ${targetOffice?.short_name || "this department"}? Department staff will no longer be able to use tools like document scanning, file uploads, and student records review. Required core features will remain available.`
          : `Are you sure you want to turn off all optional ${category === "admin" ? "supervisor and department head" : "staff"} features for ${targetOffice?.short_name || "this department"}?`,
        confirmLabel: isAll ? "Reset to Core" : "Disable Features",
        variant: "warning",
        icon: "ph-duotone ph-toggle-left",
        buttonIcon: "ph-bold ph-arrow-counter-clockwise",
        selectedItems: affectedItems,
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
      const timer = setTimeout(() => setSelectedOfficeId(filteredOffices[0].id), 0)
      return () => clearTimeout(timer)
    }
  }, [filteredOffices, selectedOfficeId])

  // Track horizontal scroll state on the matrix container
  useEffect(() => {
    const el = matrixTableContainerRef.current
    if (!el) return
    const handleScroll = () => {
      setIsScrolledX(el.scrollLeft > 20)
    }
    el.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()
    return () => el.removeEventListener("scroll", handleScroll)
  }, [loading, viewMode, filteredOffices.length])

  // Auto reset scroll to start when filters or view change
  useEffect(() => {
    if (matrixTableContainerRef.current) {
      matrixTableContainerRef.current.scrollTo({ left: 0, behavior: "smooth" })
    }
  }, [officeFilter, searchQuery, moduleFilters, viewMode])

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

  const moduleFilterGroups = useMemo(() => {
    const modules = matrix?.modules || []

    const catOptions = [
      {
        value: "admin",
        label: "Supervisors & Heads",
        dotColor: "bg-purple-500",
        count: modules.filter((m) => m.category === "admin").length,
      },
      {
        value: "staff",
        label: "Staff Tools",
        dotColor: "bg-blue-500",
        count: modules.filter((m) => m.category === "staff").length,
      },
    ]

    const statusOptions = [
      {
        value: "enabled",
        label: "Enabled",
        dotColor: "bg-emerald-500",
      },
      {
        value: "disabled",
        label: "Disabled",
        dotColor: "bg-amber-500",
      },
    ]

    return [
      {
        id: "category",
        label: "Target Role",
        options: catOptions,
      },
      {
        id: "status",
        label: "Module Status",
        options: statusOptions,
      },
    ]
  }, [matrix])

  const filteredModules = useMemo(() => {
    if (!matrix?.modules) return []
    const selectedCats = moduleFilters.category || []
    const selectedStatuses = moduleFilters.status || []

    const list = matrix.modules.filter((m) => {
      const matchesSearch =
        !searchQuery ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description || "").toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCat = selectedCats.length === 0 || selectedCats.includes(m.category)

      let matchesState = true
      if (selectedStatuses.length > 0) {
        let isEnabled = false
        if (viewMode === "office" && currentOffice) {
          isEnabled = Boolean(m.is_system) || Boolean(matrix.assignments[currentOffice.id]?.[m.id]?.enabled)
        } else {
          isEnabled = Boolean(m.is_system) || (matrix.offices || []).some((o) => matrix.assignments[o.id]?.[m.id]?.enabled)
        }
        const stateKey = isEnabled ? "enabled" : "disabled"
        matchesState = selectedStatuses.includes(stateKey)
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
  }, [matrix, searchQuery, moduleFilters, viewMode, currentOffice, matrixSortOrder])

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

  const hasActiveChips = useMemo(() => {
    return Boolean(searchQuery?.trim()) || (moduleFilters.category?.length > 0) || (moduleFilters.status?.length > 0)
  }, [searchQuery, moduleFilters])

  const handleClearFilters = () => {
    setSearchQuery("")
    setModuleFilters({ category: [], status: [] })
  }

  if (loading) {
    return <ModuleConfigSkeleton viewMode={viewMode} />
  }

  // Empty State if No Offices exist in the system (Matches OfficeManagementTab design)
  if (!matrix?.offices || matrix.offices.length === 0) {
    return (
      <div className="flex flex-[1_0_auto] flex-col gap-6 w-full animate-fade-up font-jakarta">
        <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
          <PageHeader
            icon="ph-bold ph-squares-four"
            title="Department Features & Permissions"
            description="Turn system features on or off for each department."
            showBorder={true}
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          />
          <div className="flex flex-[1_0_auto] min-h-[420px] flex-col items-center justify-center rounded-b-2xl bg-white dark:bg-card text-center py-16">
            <Empty className="flex flex-col items-center justify-center border-0 bg-transparent text-center">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <div className="relative mb-6">
                  <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                  <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-border bg-white shadow-xl dark:border-border dark:bg-card dark:shadow-none">
                    <HugeIcon className="ph-duotone ph-buildings text-3xl text-gray-400 dark:text-zinc-500"></HugeIcon>
                  </EmptyMedia>
                </div>
                <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                  No Departments Found
                </EmptyTitle>
                <EmptyDescription className="max-w-xs text-sm font-medium text-gray-900 dark:text-zinc-300 mt-1">
                  There are currently no campus departments or administrative offices configured in the system.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  onClick={() => window.dispatchEvent(new CustomEvent("switch-view", { detail: { view: "offices" } }))}
                  title="Manage Departments"
                  className="mt-6 flex h-10 items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 text-xs font-semibold shadow-xs dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 cursor-pointer active:scale-95 transition-all"
                >
                  Manage Departments
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        </Card>
      </div>
    )
  }
  const { modules } = matrix

  return (
    <div className="flex flex-[1_0_auto] flex-col gap-6 w-full animate-fade-up font-jakarta">
      {/* Main Card with Header, Toolbar & Active Filter Chips */}
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        <PageHeader
          icon="ph-bold ph-squares-four"
          title={
            <div className="flex items-center gap-[6px]">
              Department Features & Permissions
              
            </div>
          }
          description="Turn system features on or off for each department."
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-border dark:border-border">
                <button
                  type="button"
                  onClick={() => setViewMode("office")}
                  title="Show features grouped by department"
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border-0",
                    viewMode === "office"
                      ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white bg-transparent"
                  )}
                >
                  <HugeIcon className="ph-bold ph-buildings text-sm" />
                  <span>By Department</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("matrix")}
                  title="Compare features across departments"
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border-0",
                    viewMode === "matrix"
                      ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white bg-transparent"
                  )}
                >
                  <HugeIcon className="ph-bold ph-table text-sm" />
                  <span>Compare Features</span>
                </button>
              </div>

              <RefreshButton
                onRefresh={handleManualRefresh}
                isLoading={isManualLoading}
                title="Refresh Module Configuration"
              />
            </div>
          }
        />

        {/* Navigation Toolbar */}
        <div className="border-t border-border dark:border-border p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
          {/* Left: Active vs Archived Segmented Control */}
          <div className="flex items-center p-1 bg-gray-100/80 dark:bg-zinc-800/60 rounded-xl border border-border/60 shrink-0 select-none">
            <button
              type="button"
              onClick={() => setOfficeFilter("Active")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border-0",
                officeFilter === "Active"
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white bg-transparent"
              )}
            >
              <span>Active</span>
              <span className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium",
                officeFilter === "Active"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "bg-gray-200/70 text-gray-600 dark:bg-zinc-700 dark:text-zinc-400"
              )}>
                {officeFilterCounts.active}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setOfficeFilter("Archived")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border-0",
                officeFilter === "Archived"
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white bg-transparent"
              )}
            >
              <span>Archived</span>
              <span className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium",
                officeFilter === "Archived"
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                  : "bg-gray-200/70 text-gray-600 dark:bg-zinc-700 dark:text-zinc-400"
              )}>
                {officeFilterCounts.archived}
              </span>
            </button>
          </div>

          {/* Right: Search Input & Dropdown Popovers Group */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="w-full sm:w-[280px] lg:w-[340px] relative group shrink-0">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <HugeIcon  className="ph-bold ph-magnifying-glass text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-sm"></HugeIcon>
              </div>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search features by name, description..."
                className="h-9 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 pl-8 pr-20 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
              />
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[11px] text-gray-400 dark:text-zinc-500 font-mono">
                {filteredModules.length}
              </div>
            </div>

            {/* Multi-Criteria Filter Dropdown */}
            <div className="w-full sm:w-auto shrink-0">
              <MultiCriteriaFilter
                title="Filter Features"
                groups={moduleFilterGroups}
                selected={moduleFilters}
                onChange={setModuleFilters}
                totalCount={modules.length}
                matchingCount={filteredModules.length}
                onReset={() => setModuleFilters({ category: [], status: [] })}
              />
            </div>
          </div>
        </div>

        {/* Active Filter Chips & Horizontal Scroll Controls Bar */}
        {(hasActiveChips || viewMode === "matrix") && (
          <div className="border-t border-border dark:border-border px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-card">
            <div className="flex-1 min-w-0">
              <ActiveFilterChips
                groups={moduleFilterGroups}
                selected={moduleFilters}
                onRemove={(groupId, val) => {
                  setModuleFilters((prev) => ({
                    ...prev,
                    [groupId]: (prev[groupId] || []).filter((v) => v !== val),
                  }))
                }}
                searchQuery={searchQuery}
                onClearSearch={() => setSearchQuery("")}
                onClearAll={handleClearFilters}
                className="p-0 border-0 bg-transparent px-0 py-0"
              />
            </div>

            {viewMode === "matrix" && filteredOffices.length > 0 && (
              <div className="flex items-center gap-2 shrink-0 select-none self-end sm:self-auto ml-auto">
                <TableScrollControls
                  canScrollLeft={canScrollLeft}
                  canScrollRight={canScrollRight}
                  isScrolled={isScrolled}
                  onScrollLeft={scrollLeft}
                  onScrollRight={scrollRight}
                  onResetScroll={resetMatrixScroll}
                />
              </div>
            )}
          </div>
        )}

        {/* Content Section: By Office or Matrix inside the single Card */}
        <div className="flex-[1_0_auto] overflow-hidden rounded-b-2xl border-t border-border dark:border-border bg-white dark:bg-card flex flex-col">
          {/* VIEW 1: BY OFFICE */}
          {viewMode === "office" && (
            <div className="flex flex-col flex-[1_0_auto]">
              {filteredOffices.length === 0 ? (
                <div className="py-16 rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                  <Empty className="flex h-full flex-col items-center justify-center border-0 bg-transparent text-center">
                    <EmptyHeader className="flex flex-col items-center gap-0">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                        <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-border bg-white shadow-xl dark:border-border dark:bg-card dark:shadow-none">
                          <HugeIcon className={cn(
                            officeFilter === "Archived" ? "ph-archive" : "ph-buildings",
                            "ph-duotone text-3xl text-gray-400 dark:text-zinc-500"
                          )}></HugeIcon>
                        </EmptyMedia>
                      </div>
                      <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                        {officeFilter === "Archived" ? "No Archived Departments Found" : "No Departments Found"}
                      </EmptyTitle>
                      <EmptyDescription className="max-w-xs text-sm font-medium text-gray-900 dark:text-zinc-300 mt-1">
                        {officeFilter === "Archived"
                          ? "There are currently no archived departments in the system."
                          : "No departments matching your current filter were found."}
                      </EmptyDescription>
                    </EmptyHeader>
                    {officeFilter === "Archived" && (
                      <EmptyContent>
                        <Button
                          variant="outline"
                          onClick={() => setOfficeFilter("Active")}
                          title="View Active Departments"
                          className="mt-6 flex h-10 items-center justify-center rounded-xl border border-border bg-white px-5 text-xs font-semibold text-gray-700 shadow-xs transition-colors hover:bg-gray-50 dark:bg-zinc-900 dark:border-border dark:text-zinc-300 cursor-pointer active:scale-95"
                        >
                          View Active Departments
                        </Button>
                      </EmptyContent>
                    )}
                  </Empty>
                </div>
          ) : (
            <>
              {/* Department Selector Bar */}
              <div className="p-5 border-b border-border dark:border-border bg-gray-50/40 dark:bg-zinc-900/30">
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-semibold text-gray-900 dark:text-zinc-300 px-1 gap-1">
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
                          "p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-3 cursor-pointer group select-none shadow-2xs",
                          isSelected
                            ? "bg-white dark:bg-zinc-900 shadow-sm ring-2 ring-slate-900/10 dark:ring-white/20 border-slate-900/40 dark:border-white/20"
                            : "bg-white/80 dark:bg-zinc-900/60 border-border/80 dark:border-border hover:border-gray-400 dark:hover:border-zinc-600 hover:bg-white dark:hover:bg-zinc-900",
                          isOfficeArchived && !isSelected && "opacity-75"
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="h-9 w-9 rounded-xl flex items-center justify-center text-sm shadow-2xs shrink-0 border"
                              style={{
                                backgroundColor: `${accent}14`,
                                color: accent,
                                borderColor: `${accent}28`,
                              }}
                            >
                              <HugeIcon  className={cn(officeIconClass, "text-base")}></HugeIcon>
                            </div>
                            <div>
                              <div className="text-xs font-bold text-gray-900 dark:text-zinc-50 group-hover:text-pup-maroon transition-colors">
                                {o.short_name}
                              </div>
                              <div className="text-[10px] text-gray-400 font-mono">
                                #{o.id}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isOfficeArchived ? (
                              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium tracking-[0.04em] bg-gray-100 text-[#8E8E93] dark:bg-zinc-800 dark:text-zinc-400">
                                Archived
                              </span>
                            ) : (
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-[10px] px-2 py-0.5 rounded-full border-0 font-bold font-mono",
                                  isSelected
                                    ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                                    : "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300"
                                )}
                              >
                                {activeCount}/{modules.length}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-zinc-300 truncate w-full pt-1 border-t border-border/40">
                          <span className="truncate">{o.name || o.short_name}</span>
                          {isOfficeArchived && (
                            <span className="text-[10px] text-gray-400 ml-1 shrink-0 font-mono font-medium">
                              {activeCount} active
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Active Department Banner & Module Grid */}
            {currentOffice && (
              <div
                key={currentOffice.id}
                className="flex flex-col flex-[1_0_auto] overflow-hidden bg-white dark:bg-card motion-safe:animate-in motion-safe:fade-in-50 motion-safe:slide-in-from-bottom-1 duration-200 ease-out"
              >
              <div className="p-5 border-b border-border dark:border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-950/20">
                <div className="flex items-center gap-3.5">
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center text-xl shadow-xs shrink-0 border"
                    style={{
                      backgroundColor: `${currentOffice.accent_color || "#800000"}14`,
                      color: currentOffice.accent_color || "#800000",
                      borderColor: `${currentOffice.accent_color || "#800000"}28`,
                    }}
                  >
                    <HugeIcon  className={cn(getOfficeIcon(currentOffice), "text-xl")}></HugeIcon>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50">
                        {currentOffice.name || currentOffice.short_name} ({currentOffice.short_name})
                      </h3>
                      <StatusChip status={currentOffice.status} />
                    </div>
                    <p className="text-xs text-gray-900 dark:text-zinc-300 mt-0.5">
                      {isCurrentArchived
                        ? `This department is currently archived. Its features cannot be changed while it is inactive.`
                        : `Customize the features and tools available to ${currentOffice.short_name} staff and supervisors.`}
                    </p>
                  </div>
                </div>

                {/* Quick Batch Actions for this department */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    disabled={isCurrentArchived || Boolean(toggling[`${currentOffice.id}-all-batch`])}
                    onClick={() => handleBatchToggle(currentOffice.id, "all", true)}
                    title={isCurrentArchived ? "Archived departments cannot be modified" : "Enable all workspace features for this department"}
                    className="h-9 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 cursor-pointer flex items-center justify-center px-4 disabled:cursor-not-allowed disabled:opacity-50 shadow-xs active:scale-95 transition-all"
                  >
                    Enable All Features
                  </Button>
                  <Button
                    variant="outline"
                    disabled={isCurrentArchived || Boolean(toggling[`${currentOffice.id}-all-batch`])}
                    onClick={() => handleBatchToggle(currentOffice.id, "all", false)}
                    title={isCurrentArchived ? "Archived departments cannot be modified" : "Turn off optional features and keep required system tools only"}
                    className="h-9 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer flex items-center justify-center px-4 disabled:cursor-not-allowed disabled:opacity-50 shadow-2xs active:scale-95 transition-all"
                  >
                    Reset to Core
                  </Button>
                </div>
              </div>

              {/* Archived Office Warning Notice Banner (Attached edge-to-edge dismissable alert) */}
              {isCurrentArchived && !dismissedArchivedAlerts.includes(currentOffice.id) && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/90 bg-amber-50/90 dark:border-amber-900/40 dark:bg-amber-950/25 px-5 sm:px-6 py-2.5 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in transition-all">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <HugeIcon className="ph-bold ph-warning-circle text-[16px] shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="font-medium text-[11.5px] sm:text-xs leading-normal">
                      <strong className="font-semibold text-amber-950 dark:text-amber-100">Archived Department Notice:</strong> This department is currently archived. Its features cannot be modified while it is archived. Restore this department in <strong className="font-semibold text-amber-950 dark:text-amber-100">Departments & Stations</strong> to change feature access.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent("switch-view", { detail: { view: "offices", officeId: currentOffice.id } }))}
                      title="Restore Department in Departments & Stations"
                      className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 text-[11px] font-semibold shrink-0 cursor-pointer transition-colors shadow-2xs flex items-center justify-center active:scale-95"
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismissArchivedAlert(currentOffice.id)}
                      className="shrink-0 p-1 rounded-lg text-amber-700 hover:text-amber-950 hover:bg-amber-100/80 dark:text-amber-400 dark:hover:text-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                      aria-label="Dismiss notice"
                      title="Dismiss notice"
                    >
                      <HugeIcon className="ph-bold ph-x text-sm" />
                    </button>
                  </div>
                </div>
              )}

              {/* Module Cards Content Area */}
              <CardContent className="p-6 space-y-8 flex flex-col flex-[1_0_auto] rounded-b-2xl">
                {/* Empty State when no modules match filters */}
                {filteredModules.length === 0 ? (
                  <div className="py-16 rounded-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full border border-dashed border-border dark:border-border bg-white/40 dark:bg-zinc-900/20 text-center my-2">
                    <Empty className="flex flex-col items-center justify-center border-0 bg-transparent text-center">
                      <EmptyHeader className="flex flex-col items-center gap-0">
                        <div className="relative mb-6">
                          <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                          <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-border bg-white shadow-xl dark:border-border dark:bg-card dark:shadow-none">
                            <HugeIcon className="ph-duotone ph-magnifying-glass text-3xl text-gray-400 dark:text-zinc-500"></HugeIcon>
                          </EmptyMedia>
                        </div>
                        <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                          No Features Found
                        </EmptyTitle>
                        <EmptyDescription className="max-w-xs text-sm font-medium text-gray-900 dark:text-zinc-300 mt-1">
                          We couldn&apos;t find any features matching your search or filter criteria. Try clearing filters or adjusting your keywords.
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button
                          variant="outline"
                          onClick={handleClearFilters}
                          title="Reset Filters"
                          className="mt-6 flex h-10 items-center justify-center gap-2 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-5 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                        >
                          Reset Filters
                        </Button>
                      </EmptyContent>
                    </Empty>
                  </div>
                ) : (
                  <>
                    {/* ROLE OPERATION GROUP 1: SUPERVISOR & HEAD TOOLS */}
                    {groupedModules.admin.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-border dark:border-border gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-red-50 text-pup-maroon dark:bg-red-950/30 dark:text-red-400 flex items-center justify-center text-sm">
                              <HugeIcon  className="ph-bold ph-shield-check"></HugeIcon>
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
                              <p className="text-[11px] text-gray-900 dark:text-zinc-300">
                                Management dashboards, turnaround reports, compliance tracking, and department settings.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isCurrentArchived}
                              onClick={() => handleBatchToggle(currentOffice.id, "admin", true)}
                              title={isCurrentArchived ? "Archived departments cannot be modified" : "Enable all supervisor features"}
                              className={cn(
                                "h-7 px-2.5 rounded-lg text-xs font-semibold border border-border/80 dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-2xs transition-all cursor-pointer active:scale-95 inline-flex items-center gap-1",
                                isCurrentArchived && "opacity-40 cursor-not-allowed pointer-events-none"
                              )}
                            >
                              <HugeIcon className="ph-bold ph-check text-[11px]" />
                              <span>Enable All</span>
                            </button>
                            <button
                              type="button"
                              disabled={isCurrentArchived}
                              onClick={() => handleBatchToggle(currentOffice.id, "admin", false)}
                              title={isCurrentArchived ? "Archived departments cannot be modified" : "Turn off optional supervisor features"}
                              className={cn(
                                "h-7 px-2.5 rounded-lg text-xs font-semibold border border-border/80 dark:border-border bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/20 shadow-2xs transition-all cursor-pointer active:scale-95 inline-flex items-center gap-1",
                                isCurrentArchived && "opacity-40 cursor-not-allowed pointer-events-none"
                              )}
                            >
                              <HugeIcon className="ph-bold ph-x text-[11px]" />
                              <span>Turn Off All</span>
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
                    {groupedModules.staff.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-border dark:border-border gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 flex items-center justify-center text-sm">
                              <HugeIcon  className="ph-bold ph-identification-badge"></HugeIcon>
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
                              <p className="text-[11px] text-gray-900 dark:text-zinc-300">
                                Document scanning, text recognition (OCR), student records search, and request processing.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isCurrentArchived}
                              onClick={() => handleBatchToggle(currentOffice.id, "staff", true)}
                              title={isCurrentArchived ? "Archived departments cannot be modified" : "Enable all staff tools"}
                              className={cn(
                                "h-7 px-2.5 rounded-lg text-xs font-semibold border border-border/80 dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-2xs transition-all cursor-pointer active:scale-95 inline-flex items-center gap-1",
                                isCurrentArchived && "opacity-40 cursor-not-allowed pointer-events-none"
                              )}
                            >
                              <HugeIcon className="ph-bold ph-check text-[11px]" />
                              <span>Enable All</span>
                            </button>
                            <button
                              type="button"
                              disabled={isCurrentArchived}
                              onClick={() => handleBatchToggle(currentOffice.id, "staff", false)}
                              title={isCurrentArchived ? "Archived departments cannot be modified" : "Turn off optional staff tools"}
                              className={cn(
                                "h-7 px-2.5 rounded-lg text-xs font-semibold border border-border/80 dark:border-border bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/20 shadow-2xs transition-all cursor-pointer active:scale-95 inline-flex items-center gap-1",
                                isCurrentArchived && "opacity-40 cursor-not-allowed pointer-events-none"
                              )}
                            >
                              <HugeIcon className="ph-bold ph-x text-[11px]" />
                              <span>Turn Off All</span>
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
            </div>
          )}
            </>
          )}
        </div>
      )}

      {/* VIEW 2: MATRIX OVERVIEW TABLE (Bird's-eye cross-office audit) */}
      {viewMode === "matrix" && (
        <>
          {filteredOffices.length === 0 ? (
            <div className="py-16 rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
              <Empty className="flex h-full flex-col items-center justify-center border-0 bg-transparent text-center">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                    <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-border bg-white shadow-xl dark:border-border dark:bg-card dark:shadow-none">
                      <HugeIcon className={cn(
                        officeFilter === "Archived" ? "ph-archive" : "ph-buildings",
                        "ph-duotone text-3xl text-gray-400 dark:text-zinc-500"
                      )}></HugeIcon>
                    </EmptyMedia>
                  </div>
                  <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                    {officeFilter === "Archived" ? "No Archived Departments Found" : "No Departments Found"}
                  </EmptyTitle>
                  <EmptyDescription className="max-w-xs text-sm font-medium text-gray-900 dark:text-zinc-300 mt-1">
                    {officeFilter === "Archived"
                      ? "There are currently no archived departments in the system."
                      : "No departments matching your current filter were found."}
                  </EmptyDescription>
                </EmptyHeader>
                {officeFilter === "Archived" && (
                  <EmptyContent>
                    <Button
                      variant="outline"
                      onClick={() => setOfficeFilter("Active")}
                      title="View Active Departments"
                      className="mt-6 flex h-10 items-center justify-center rounded-xl border border-border bg-white px-5 text-xs font-semibold text-gray-700 shadow-xs transition-colors hover:bg-gray-50 dark:bg-zinc-900 dark:border-border dark:text-zinc-300 cursor-pointer active:scale-95"
                    >
                      View Active Departments
                    </Button>
                  </EmptyContent>
                )}
              </Empty>
            </div>
          ) : filteredModules.length === 0 ? (
            <div className="py-16 rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
              <Empty className="flex h-full flex-col items-center justify-center border-0 bg-transparent text-center">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                    <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-border bg-white shadow-xl dark:border-border dark:bg-card dark:shadow-none">
                      <HugeIcon className="ph-duotone ph-magnifying-glass text-3xl text-gray-400 dark:text-zinc-500"></HugeIcon>
                    </EmptyMedia>
                  </div>
                  <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                    No Features Found
                  </EmptyTitle>
                  <EmptyDescription className="max-w-xs text-sm font-medium text-gray-900 dark:text-zinc-300 mt-1">
                    We couldn&apos;t find any features matching your search or filter criteria in the summary table.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    variant="outline"
                    onClick={handleClearFilters}
                    title="Reset Filters"
                    className="mt-6 flex h-10 items-center justify-center gap-2 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-5 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                  >
                    Reset Filters
                  </Button>
                </EmptyContent>
              </Empty>
            </div>
          ) : (
            <div
              ref={matrixTableContainerRef}
              className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2 motion-safe:animate-in motion-safe:fade-in-50 duration-200 ease-out select-none"
            >
              <table className="w-full border-collapse text-left min-w-max">
                <thead className="sticky top-0 z-20 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                  <tr className="text-left text-[11px] font-semibold tracking-wider text-gray-500 dark:text-zinc-400 uppercase select-none">
                    <th className="p-4 pl-6 w-[340px] min-w-[340px] max-w-[340px] sticky left-0 bg-gray-50/95 dark:bg-zinc-900/95 z-30 border-r border-border/80 dark:border-border">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleMatrixSort("name")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-[11px] font-semibold tracking-wider uppercase",
                            matrixSortBy === "name" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          <span>System Feature</span>
                          <SortIndicator column="name" sortBy={matrixSortBy} sortOrder={matrixSortOrder} />
                        </button>
                      </div>
                    </th>
                    {filteredOffices.map((o) => {
                      const isArchived = o.status === "Inactive" || o.status === "Archived"
                      return (
                        <th
                          key={o.id}
                          className={cn(
                            "p-4 text-center w-[150px] min-w-[150px] border-r border-border/80 dark:border-border last:border-r-0 select-none",
                            isArchived && "opacity-75"
                          )}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span 
                              className="text-xs font-semibold tracking-tight truncate max-w-[130px]"
                              style={{ color: o.accent_color || "#800000" }}
                              title={o.name}
                            >
                              {o.short_name}
                            </span>
                            {isArchived ? (
                              <span className="rounded-full px-2 py-0.5 text-[9.5px] font-medium bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400">
                                Archived
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-gray-400 dark:text-zinc-500">
                                {officeCounts[o.id] || 0}/{modules.length}
                              </span>
                            )}
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-border dark:divide-border">
                  {/* Head / Admin Group Row */}
                  {groupedModules.admin.length > 0 && (
                    <>
                      <tr className="bg-gray-100/70 dark:bg-zinc-950/60">
                        <td
                          colSpan={filteredOffices.length + 1}
                          className="px-4 pl-6 py-2.5 text-xs font-semibold text-gray-800 dark:text-zinc-200 sticky left-0 bg-gray-100/90 dark:bg-zinc-950/90 backdrop-blur-xs border-y border-border/50"
                        >
                          <div className="flex items-center gap-2">
                            <HugeIcon className="ph-bold ph-shield-check text-pup-maroon dark:text-red-400 text-xs" />
                            <span>Supervisor & Department Head Tools ({groupedModules.admin.length})</span>
                          </div>
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
                  {groupedModules.staff.length > 0 && (
                    <>
                      <tr className="bg-gray-100/70 dark:bg-zinc-950/60">
                        <td
                          colSpan={filteredOffices.length + 1}
                          className="px-4 pl-6 py-2.5 text-xs font-semibold text-gray-800 dark:text-zinc-200 sticky left-0 bg-gray-100/90 dark:bg-zinc-950/90 backdrop-blur-xs border-y border-border/50"
                        >
                          <div className="flex items-center gap-2">
                            <HugeIcon className="ph-bold ph-identification-badge text-blue-600 dark:text-blue-400 text-xs" />
                            <span>Staff & Frontline Tools ({groupedModules.staff.length})</span>
                          </div>
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
      </div>
    </Card>

      {/* Confirmation Modal for Destructive Batch Actions */}
      {confirmModalState && (
        <ConfirmModal
          open={confirmModalState.open}
          title={confirmModalState.title}
          message={confirmModalState.message}
          confirmLabel={confirmModalState.confirmLabel}
          variant={confirmModalState.variant || "danger"}
          icon={confirmModalState.icon}
          buttonIcon={confirmModalState.buttonIcon}
          selectedItems={confirmModalState.selectedItems || []}
          onConfirm={confirmModalState.action}
          onCancel={() => setConfirmModalState(null)}
          isLoading={confirmModalState.isLoading}
          isAppleStyled={true}
          isPersonnelModal={true}
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
          ? "bg-white dark:bg-zinc-900 border-border dark:border-border shadow-2xs hover:shadow-sm"
          : "bg-gray-50/50 dark:bg-zinc-950/40 border-border dark:border-border opacity-70 hover:opacity-100"
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
              <HugeIcon className={cn(moduleIconClass, "text-base")}></HugeIcon>
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
                <span className="text-[10px] font-medium text-gray-900 dark:text-zinc-300">
                  {getModuleTargetText(m)}
                </span>
              </div>
            </div>
          </div>

          {isSystem ? (
            <Badge className="bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300 text-[9px] font-semibold border-0 rounded-full px-2 py-0.5">
              Required
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className={cn(
                "text-[9px] font-semibold border-0 rounded-full px-2 py-0.5",
                isEnabled
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                  : "bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400"
              )}
            >
              {isEnabled ? "Active" : "Disabled"}
            </Badge>
          )}
        </div>

        <p className="text-[11px] text-gray-900 dark:text-zinc-300 line-clamp-2 leading-relaxed">
          {m.description || "Standard system feature."}
        </p>
      </div>

      <div className="pt-3 border-t border-border dark:border-border flex items-center justify-between">
        <span className="text-[11px] font-medium text-gray-600 dark:text-zinc-400">
          {isSystem ? "Always Active (Required)" : isOfficeArchived ? "Locked (Archived Department)" : isEnabled ? "Available to Staff" : "Turned Off"}
        </span>

        {isToggling ? (
          <div className="w-10 h-6 flex items-center justify-center">
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
                "w-10 h-6 bg-gray-200 dark:bg-zinc-700 rounded-full transition-colors relative",
                "after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-xs",
                "peer-checked:after:translate-x-4",
                isSystem
                  ? "peer-checked:bg-slate-700 dark:peer-checked:bg-zinc-600 cursor-not-allowed"
                  : isOfficeArchived
                  ? "peer-checked:bg-gray-400 dark:peer-checked:bg-zinc-600 cursor-not-allowed"
                  : "peer-checked:bg-slate-900 dark:peer-checked:bg-zinc-100 dark:after:bg-zinc-900"
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
    <tr className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors group select-none">
      <td className="p-4 pl-6 align-top sticky left-0 bg-white/95 dark:bg-zinc-900/95 z-10 border-r border-border/70 dark:border-border/70 w-[340px] min-w-[340px] max-w-[340px]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-7 w-7 rounded-lg bg-gray-100 dark:bg-zinc-800/80 flex items-center justify-center text-gray-700 dark:text-zinc-300 text-xs shrink-0">
            <HugeIcon className={cn(moduleIconClass, "text-sm")}></HugeIcon>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-xs text-gray-900 dark:text-zinc-100">
                {m.name}
              </span>
              {isSystem && (
                <span className="bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  Required
                </span>
              )}
              <span className="text-[10px] font-medium text-gray-400 dark:text-zinc-500">
                ({getModuleTargetText(m)})
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 line-clamp-2 leading-relaxed">
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
          <td key={o.id} className="p-4 text-center align-middle w-[150px] min-w-[150px] border-r border-border/70 dark:border-border/70 last:border-r-0">
            <div className="inline-flex items-center justify-center">
              {isToggling ? (
                <div className="w-9 h-5 flex items-center justify-center">
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
                      "w-9 h-5 bg-gray-200 dark:bg-zinc-700 rounded-full transition-colors relative",
                      "after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-xs",
                      "peer-checked:after:translate-x-4",
                      isSystem
                        ? "peer-checked:bg-slate-700 dark:peer-checked:bg-zinc-600 cursor-not-allowed"
                        : isOfficeArchived
                        ? "peer-checked:bg-gray-400 dark:peer-checked:bg-zinc-600 cursor-not-allowed"
                        : "peer-checked:bg-slate-900 dark:peer-checked:bg-zinc-100 dark:after:bg-zinc-900"
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
