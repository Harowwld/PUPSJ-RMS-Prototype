"use client"
import useViewPreference from "@/hooks/useViewPreference"
import DashboardSearch from "@/components/systemadmin/DashboardSearch"
import { Table, TableRow } from "@/components/ui/table";
import NoticeBanner from "@/components/shared/NoticeBanner";


import { Fragment, useState, useEffect, useCallback, useMemo, useRef } from "react"
import ModuleConfigSkeleton from "@/components/systemadmin/skeletons/ModuleConfigSkeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
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
import DataViewToolbar from "@/components/shared/DataViewToolbar"
import { FilterPopover, SortPopover, GroupPopover, ColumnsPopover } from "@/components/systemadmin/OfficeTableControls"
import { Archive01Icon as EmptyArchive01Icon, Building03Icon as EmptyBuilding03Icon, Search01Icon as EmptySearch01Icon , ArrowDown01Icon, ArrowLeft01Icon, ArrowRight01Icon, ArrowUp01Icon, ArrowUpDownIcon, Building01Icon, Cancel01Icon, Contact01Icon, Shield01Icon, TableIcon, Tick01Icon, UserSwitchIcon, Search01Icon} from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
function getOfficeIcon(office) {
  if (office?.icon && office.icon.trim()) return office.icon
  const id = (office?.id || office?.short_name || "").toLowerCase()
  if (id.includes("reg")) return " Certificate01Icon"
  if (id.includes("osas") || id.includes("student")) return " StudentIcon"
  if (id.includes("admiss")) return " UserCheck01Icon"
  if (id.includes("lib")) return " LibraryIcon"
  if (id.includes("acc") || id.includes("cash") || id.includes("fin")) return " BankIcon"
  return " Building02Icon"
}

function getModuleIcon(m) {
  if (m?.id === "osas_monitoring") return " StudentIcon"
  if (m?.id === "records_review") return " CheckmarkBadge01Icon"
  if (m?.id === "compliance_analytics") return " Analytics01Icon"
  if (m?.id === "request_analytics") return " ChartLineData01Icon"
  if (m?.id === "staff_directory") return " UserSearch01Icon"
  if (m?.id === "storage_layout") return " WarehouseIcon"
  if (m?.id === "system_config") return " Settings01Icon"
  if (m?.id === "backup") return " DatabaseIcon"
  if (m?.id === "audit_logs") return " Time01Icon"
  if (m?.id === "document_requests") return " FileUploadIcon"
  if (m?.id === "student_directory") return " StudentIcon"
  if (m?.id === "scan_upload") return " FingerPrintScanIcon"
  if (m?.id === "documents") return " File02Icon"
  if (m?.id === "notifications") return " Notification01Icon"
  if (m?.id === "records_archive") return " Archive02Icon"
  if (m?.id === "storage_explorer") return " FolderOpenIcon"
  if (m?.id === "student_organizations") return " Building01Icon"
  if (m?.icon && m.icon.trim()) return m.icon
  return " AlignBoxBottomCenterIcon"
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
    return <ArrowUpDownIcon size="1em"  className="ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"></ArrowUpDownIcon>
  }
  return sortOrder === "ASC" ? (
    <ArrowUp01Icon size="1em"  className="ml-1 text-[12px] text-gray-400"></ArrowUp01Icon>
  ) : (
    <ArrowDown01Icon size="1em"  className="ml-1 text-[12px] text-gray-400"></ArrowDown01Icon>
  )
}

export default function ModuleConfigTab({ showToast, initialOfficeId }) {
  const [matrix, setMatrix] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useViewPreference("modules", "searchQuery", "")
  const [filterClauses, setFilterClauses] = useViewPreference("modules", "filterClauses", [])
  const [officeFilter, setOfficeFilter] = useViewPreference("modules", "officeFilter", "Active") // "Active" | "Archived"
  const [selectedOfficeId, setSelectedOfficeId] = useViewPreference("modules", "selectedOfficeId", initialOfficeId || "")
  const [viewMode, setViewMode] = useViewPreference("modules", "viewMode", "office") // "office" | "matrix"
  const [confirmModalState, setConfirmModalState] = useState(null)
  const [toggling, setToggling] = useState({})

  useEffect(() => {
    if (initialOfficeId) {
      const timer = setTimeout(() => {
        setSelectedOfficeId(initialOfficeId)
        setViewMode("office")
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [initialOfficeId, setSelectedOfficeId, setViewMode])

  // System-Wide Demo Accounts Setting
  const [demoAccountsEnabled, setDemoAccountsEnabled] = useState(true)
  const [demoSettingLoading, setDemoSettingLoading] = useState(true)
  const [demoSettingSaving, setDemoSettingSaving] = useState(false)
  
  // Matrix Table Sorting
  const [matrixSortBy, setMatrixSortBy] = useViewPreference("modules", "matrixSortBy", "name")
  const [matrixSortOrder, setMatrixSortOrder] = useViewPreference("modules", "matrixSortOrder", "ASC")
  const [matrixGroupBy, setMatrixGroupBy] = useViewPreference("modules", "matrixGroupBy", "category")
  const [hiddenOfficeIds, setHiddenOfficeIds] = useViewPreference("modules", "hiddenOfficeIds", [])

  const deptCardsScrollRef = useRef(null)
  const [deptScrollState, setDeptScrollState] = useState({ overflow: false, left: false, right: false })
  const [matrixViewportWidth, setMatrixViewportWidth] = useState(0)

  const scrollDeptCards = useCallback((direction) => {
    if (deptCardsScrollRef.current) {
      const amount = direction === "left" ? -300 : 300
      deptCardsScrollRef.current.scrollBy({ left: amount, behavior: "smooth" })
    }
  }, [])

  useEffect(() => {
    if (selectedOfficeId && deptCardsScrollRef.current) {
      const card = deptCardsScrollRef.current.querySelector(
        `[data-office-id="${String(selectedOfficeId).toLowerCase()}"]`
      )
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" })
      }
    }
  }, [selectedOfficeId])

  const currentOffice = useMemo(() => {
    if (!matrix?.offices || matrix.offices.length === 0) return null
    return (
      matrix.offices.find(
        (o) => String(o.id).toLowerCase() === String(selectedOfficeId).toLowerCase()
      ) || matrix.offices[0]
    )
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
    if (loading || viewMode !== "office" || filteredOffices.length === 0) return
    const element = deptCardsScrollRef.current
    if (!element) return
    const measure = () => {
      const remaining = element.scrollWidth - element.clientWidth
      setDeptScrollState({ overflow: remaining > 5, left: element.scrollLeft > 5, right: remaining - element.scrollLeft > 5 })
    }
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null
    observer?.observe(element)
    Array.from(element.children).forEach((child) => observer?.observe(child))
    element.addEventListener("scroll", measure, { passive: true })
    window.addEventListener("resize", measure, { passive: true })
    measure()
    return () => {
      observer?.disconnect()
      element.removeEventListener("scroll", measure)
      window.removeEventListener("resize", measure)
    }
  }, [loading, viewMode, filteredOffices])

  const selectOfficeScope = (scope) => {
    const firstOffice = matrix?.offices?.find((office) => {
      const archived = office.status === "Inactive" || office.status === "Archived"
      return scope === "Archived" ? archived : !archived
    })
    setOfficeFilter(scope)
    setSelectedOfficeId(firstOffice?.id || "")
  }

  useEffect(() => {
    if (filteredOffices.length > 0 && !filteredOffices.some((o) => o.id === selectedOfficeId)) {
      const inOther = matrix?.offices?.find((o) => o.id === selectedOfficeId)
      if (inOther) {
        const isArchived = inOther.status === "Inactive" || inOther.status === "Archived"
        const timer = setTimeout(() => setOfficeFilter(isArchived ? "Archived" : "Active"), 0)
        return () => clearTimeout(timer)
      }
      const timer = setTimeout(() => setSelectedOfficeId(filteredOffices[0].id), 0)
      return () => clearTimeout(timer)
    }
  }, [filteredOffices, selectedOfficeId, matrix, setOfficeFilter, setSelectedOfficeId])

  // Horizontal scroll hook for Compare Features (Matrix view)
  const {
    tableContainerRef: matrixTableContainerRef,
    canScrollLeft,
    canScrollRight,
    isScrolled,
    scrollLeft,
    scrollRight,
    resetScroll: resetMatrixScroll,
  } = useTableScroll([filteredOffices?.length, hiddenOfficeIds.length, matrix?.modules?.length]);

  useEffect(() => {
    if (loading || viewMode !== "matrix") return
    const element = matrixTableContainerRef.current
    if (!element) return
    const measure = () => setMatrixViewportWidth(element.clientWidth)
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null
    observer?.observe(element)
    window.addEventListener("resize", measure, { passive: true })
    measure()
    return () => {
      observer?.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [loading, viewMode, matrixTableContainerRef])

  useEffect(() => {
    resetMatrixScroll();
  }, [viewMode, searchQuery, filterClauses, officeFilter, matrixSortBy, matrixSortOrder, matrixGroupBy, hiddenOfficeIds, resetMatrixScroll]);

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
    if (isSilent) setRefreshing(true)
    try {
      const cached = getCachedData("systemadmin_module_matrix")
      if (cached && !isSilent) {
        setMatrix(cached)
        if (cached.offices?.length > 0) {
          setSelectedOfficeId((prev) => prev || initialOfficeId || cached.offices[0].id)
        }
        setLoading(false)
      }

      const res = await fetch("/api/modules/matrix")
      const json = await res.json()
      if (res.ok && json.ok && json.data) {
        setMatrix(json.data)
        setCachedData("systemadmin_module_matrix", json.data, 60000)
        if (json.data.offices?.length > 0) {
          setSelectedOfficeId((prev) => prev || initialOfficeId || json.data.offices[0].id)
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
      if (isSilent) setRefreshing(false)
    }
  }, [setSelectedOfficeId, initialOfficeId, showToast])

  const loadDemoAccountSetting = useCallback(async () => {
    try {
      const response = await fetch("/api/system/settings", { cache: "no-store" })
      const result = await response.json()
      if (!response.ok || !result?.ok) throw new Error(result?.error || "Failed to load login settings")
      setDemoAccountsEnabled(String(result.data?.login_demo_accounts_enabled ?? "true").toLowerCase() !== "false")
    } catch (error) {
      showToast?.({ title: "Load Failed", description: error.message || "Could not load demo account visibility." }, true)
    } finally {
      setDemoSettingLoading(false)
    }
  }, [showToast])

  const handleDemoAccountsToggle = async (enabled) => {
    setDemoSettingSaving(true)
    try {
      const response = await fetch("/api/system/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "login_demo_accounts_enabled", value: String(enabled) }),
      })
      const result = await response.json()
      if (!response.ok || !result?.ok) throw new Error(result?.error || "Failed to save login setting")
      setDemoAccountsEnabled(enabled)
      showToast?.({ title: "Saved", description: `Demo Accounts button ${enabled ? "shown" : "hidden"} on the login page.` })
    } catch (error) {
      showToast?.({ title: "Save Failed", description: error.message || "Could not update demo account visibility." }, true)
    } finally {
      setDemoSettingSaving(false)
    }
  }

  useEffect(() => {
    queueMicrotask(loadDemoAccountSetting)
  }, [loadDemoAccountSetting])

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
        if (e.detail?.viewMode) {
          setViewMode(e.detail.viewMode)
        } else {
          setViewMode("office")
        }
      }
    }
    window.addEventListener("switch-view", handleSwitch)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("switch-view", handleSwitch)
    }
  }, [setSelectedOfficeId, setViewMode])

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

  // Confirm the exact optional features this batch action will change.
  const handleBatchToggle = (officeId, category, enable) => {
    const targetOffice = matrix?.offices?.find((o) => o.id === officeId)
    if (targetOffice && (targetOffice.status === "Inactive" || targetOffice.status === "Archived")) {
      showToast("Archived departments cannot be modified. Please restore the department first.", true)
      return
    }

    const officeAssignments = matrix?.assignments?.[officeId] || {}
    const scopedFeatures = (matrix?.modules || [])
      .filter((module) => !module.is_system && (category === "all" || module.category === category))
    const affectedFeatures = scopedFeatures
      .filter((module) => Boolean(officeAssignments[module.id]?.enabled) !== enable)
      .map((module) => module.name)
    const hasChanges = affectedFeatures.length > 0

    const isAll = category === "all"
    const categoryName = category === "admin" ? "Supervisor" : "Staff"
    setConfirmModalState({
      open: true,
      title: enable
        ? isAll ? "Enable All Features?" : `Enable All ${categoryName} Features?`
        : isAll ? "Reset to Core Features Only?" : `Turn Off Optional ${categoryName} Features?`,
      message: hasChanges
        ? enable
          ? `Enable these features for ${targetOffice?.short_name || "this department"}? Staff will gain access to the tools listed below.`
          : `Turn off these optional features for ${targetOffice?.short_name || "this department"}? Required system features will remain available.`
        : `These optional features are already ${enable ? "enabled" : "turned off"} for ${targetOffice?.short_name || "this department"}. Confirm to reapply this setting.`,
      confirmLabel: enable ? "Enable Features" : isAll ? "Reset Core Features" : "Turn Off Features",
      variant: enable ? "success" : "warning",
      selectedItemsLabel: hasChanges ? enable ? "Features to Enable" : "Features to Turn Off" : "Features in This Group",
      selectedItems: hasChanges ? affectedFeatures : scopedFeatures.map((module) => module.name),
      action: () => executeBatchToggle(officeId, category, enable),
    })
  }

  // Auto reset scroll to start when filters or view change
  useEffect(() => {
    if (matrixTableContainerRef.current) {
      matrixTableContainerRef.current.scrollTo({ left: 0, behavior: "smooth" })
    }
  }, [officeFilter, searchQuery, filterClauses, viewMode, matrixTableContainerRef])

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

  const totalDepartments = officeFilterCounts.active + officeFilterCounts.archived

  const moduleFilterFields = useMemo(() => [
    { key: "category", label: "Target role", icon: Contact01Icon, options: [{ value: "admin", label: "Supervisors & Heads" }, { value: "staff", label: "Staff Tools" }] },
    { key: "status", label: "Feature status", icon: Tick01Icon, options: [{ value: "enabled", label: viewMode === "matrix" ? "Enabled in a department" : "Enabled" }, { value: "disabled", label: viewMode === "matrix" ? "Disabled in all departments" : "Disabled" }] },
    { key: "required", label: "Requirement", icon: Shield01Icon, options: [{ value: "required", label: "Required" }, { value: "optional", label: "Optional" }] },
  ], [viewMode])

  const filteredModules = useMemo(() => {
    if (!matrix?.modules) return []
    const list = matrix.modules.filter((m) => {
      const matchesSearch =
        !searchQuery ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description || "").toLowerCase().includes(searchQuery.toLowerCase())

      const matchesClauses = filterClauses.every(({ fieldKey, operator, value }) => {
        let actual
        if (fieldKey === "category") actual = m.category
        else if (fieldKey === "required") actual = m.is_system ? "required" : "optional"
        else if (fieldKey === "status") {
          const enabled = m.is_system || (viewMode === "office" && currentOffice
            ? Boolean(matrix.assignments[currentOffice.id]?.[m.id]?.enabled)
            : filteredOffices.some((office) => matrix.assignments[office.id]?.[m.id]?.enabled))
          actual = enabled ? "enabled" : "disabled"
        } else return true
        return operator === "is_not" ? actual !== value : actual === value
      })

      return matchesSearch && matchesClauses
    })

    list.sort((a, b) => {
      const nameComparison = (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
      const comparison = matrixSortBy === "required"
        ? Number(Boolean(b.is_system)) - Number(Boolean(a.is_system)) || nameComparison
        : nameComparison
      return comparison * (matrixSortOrder === "ASC" ? 1 : -1)
    })

    return list
  }, [matrix, searchQuery, filterClauses, viewMode, currentOffice, filteredOffices, matrixSortBy, matrixSortOrder])

  const groupedModules = useMemo(() => {
    const admin = filteredModules.filter((m) => m.category === "admin")
    const staff = filteredModules.filter((m) => m.category === "staff")
    return { admin, staff }
  }, [filteredModules])

  const matrixGroups = useMemo(() => {
    if (matrixGroupBy === "none") return [{ key: "all", label: null, modules: filteredModules }]
    if (matrixGroupBy === "required") return [
      { key: "required", label: "Required System Features", modules: filteredModules.filter((m) => m.is_system) },
      { key: "optional", label: "Optional Features", modules: filteredModules.filter((m) => !m.is_system) },
    ].filter((group) => group.modules.length)
    return [
      { key: "admin", label: "Supervisor & Department Head Tools", modules: groupedModules.admin },
      { key: "staff", label: "Staff & Frontline Tools", modules: groupedModules.staff },
    ].filter((group) => group.modules.length)
  }, [filteredModules, groupedModules, matrixGroupBy])

  const visibleMatrixOffices = useMemo(() => filteredOffices.filter((office) => !hiddenOfficeIds.includes(office.id)), [filteredOffices, hiddenOfficeIds])

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

  const hasActiveChips = Boolean(searchQuery?.trim()) || filterClauses.length > 0

  const handleClearFilters = () => {
    setSearchQuery("")
    setFilterClauses([])
  }

  if (loading) {
    return <ModuleConfigSkeleton viewMode={viewMode} officeFilter={officeFilter} groupBy={matrixGroupBy} officeCount={visibleMatrixOffices.length || 4} />
  }

  // Empty State if No Offices exist in the system (Matches OfficeManagementTab design)
  if (!matrix?.offices || matrix.offices.length === 0) {
    return (
      <div className="flex flex-[1_0_auto] flex-col gap-6 w-full animate-fade-up font-jakarta">
        <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
          <PageHeader
            icon=" LayoutGridIcon"
            title="Department Features & Permissions"
            description="Turn system features on or off for each department."
            showBorder={true}
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          />
          <div className="flex flex-[1_0_auto] min-h-[420px] flex-col items-center justify-center rounded-b-2xl bg-white dark:bg-card text-center ">
            <Empty>
              <EmptyHeader>
                <EmptyMedia><EmptyBuilding03Icon size="1em" /></EmptyMedia>
                <EmptyTitle>
                  No Departments Found
                </EmptyTitle>
                <EmptyDescription>
                  There are currently no campus departments or administrative offices configured in the system.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  onClick={() => window.dispatchEvent(new CustomEvent("switch-view", { detail: { view: "offices" } }))}
                  title="Manage Departments"
                  className="flex h-10 items-center justify-center px-5 cursor-pointer"
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
  const matrixFeatureWidth = visibleMatrixOffices.length === 0
    ? Math.max(420, matrixViewportWidth)
    : Math.max(420, Math.min(matrixViewportWidth * 0.6, matrixViewportWidth - visibleMatrixOffices.length * 180))
  const matrixOfficeWidth = Math.max(180, (matrixViewportWidth - matrixFeatureWidth) / Math.max(1, visibleMatrixOffices.length))

  return (
    <div className="flex flex-[1_0_auto] flex-col gap-6 w-full animate-fade-up font-jakarta">
      {/* Main Card with Header, Toolbar & Active Filter Chips */}
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        <PageHeader
          icon=" LayoutGridIcon"
          title={<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span>Department Features &amp; Permissions</span>
            <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400">
              {modules.length.toLocaleString()} features · {totalDepartments.toLocaleString()} departments
            </span>
          </div>}
          description="Turn system features on or off for each department."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            <RefreshButton onRefresh={() => { fetchMatrix(true); loadDemoAccountSetting() }} isLoading={refreshing} title="Refresh Features & Permissions" className="h-9 w-9" />
          }
        />

        <div className="flex items-end gap-x-5 overflow-x-auto border-b border-border px-6 scrollbar-none dark:border-white/10">
          <div role="group" aria-label="Department status" className="flex h-9 shrink-0 items-stretch">
            {[{ key: "Active", count: officeFilterCounts.active }, { key: "Archived", count: officeFilterCounts.archived }].map(({ key, count }) => (
              <button key={key} type="button" onClick={() => selectOfficeScope(key)} aria-pressed={officeFilter === key}
                className={cn("relative inline-flex items-center gap-2 px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-pup-maroon dark:focus-visible:ring-red-400", officeFilter === key ? "text-pup-maroon dark:text-red-400" : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white")}>
                {key}<span className="text-[10px] font-normal tabular-nums text-gray-400 dark:text-zinc-500">{count}</span>
                {officeFilter === key && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-pup-maroon dark:bg-red-400" />}
              </button>
            ))}
          </div>
          <div role="group" aria-label="Feature display" className="flex h-9 shrink-0 items-stretch">
            {[{ mode: "office", label: "By Department", icon: Building01Icon }, { mode: "matrix", label: "Compare Features", icon: TableIcon }].map(({ mode, label, icon: Icon }) => (
              <button key={mode} type="button" onClick={() => setViewMode(mode)} aria-pressed={viewMode === mode}
                className={cn("relative inline-flex items-center gap-1.5 px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-pup-maroon dark:focus-visible:ring-red-400", viewMode === mode ? "text-pup-maroon dark:text-red-400" : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white")}>
                <Icon size={14} aria-hidden="true" />{label}
                {viewMode === mode && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-pup-maroon dark:bg-red-400" />}
              </button>
            ))}
          </div>
        </div>

        <DataViewToolbar label="Feature search and filters" className="gap-2 bg-gray-50/40 p-4 dark:bg-zinc-900/30 sm:px-5 sm:py-3">
          <div className="flex min-w-0 items-center gap-2">
            <DashboardSearch value={searchQuery} onChange={setSearchQuery} count={filteredModules.length} label="Search features" placeholder="Search features by name, description..." />
            {viewMode === "matrix" && visibleMatrixOffices.length > 0 && <TableScrollControls scrollContainerRef={matrixTableContainerRef} canScrollLeft={canScrollLeft} canScrollRight={canScrollRight} isScrolled={isScrolled} onScrollLeft={scrollLeft} onScrollRight={scrollRight} onResetScroll={resetMatrixScroll} />}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <FilterPopover fields={moduleFilterFields} filters={filterClauses} onFiltersChange={setFilterClauses} entityLabel="features" />
            {viewMode === "matrix" && <>
              <SortPopover
                options={[{ key: "name", label: "Feature name", icon: Search01Icon }, { key: "required", label: "Requirement", icon: Shield01Icon }]}
                sortBy={matrixSortBy}
                onSortByChange={(key) => { setMatrixSortBy(key); setMatrixSortOrder("ASC") }}
                sortOrder={matrixSortOrder}
                onSortOrderChange={setMatrixSortOrder}
              />
              <GroupPopover
                options={[{ key: "category", label: "Target role", icon: Contact01Icon }, { key: "required", label: "Requirement", icon: Shield01Icon }, { key: "none", label: "No grouping" }]}
                groupBy={matrixGroupBy}
                onGroupByChange={setMatrixGroupBy}
              />
              {filteredOffices.length > 1 && <ColumnsPopover
                columns={filteredOffices.map((office) => ({ key: office.id, label: office.short_name || office.name || office.id }))}
                visibleColumns={visibleMatrixOffices.map((office) => office.id)}
                minVisible={0}
                onVisibleColumnsChange={(visibleIds) => {
                  setHiddenOfficeIds(filteredOffices.filter((office) => !visibleIds.includes(office.id)).map((office) => office.id))
                }}
              />}
            </>}
          </div>
        </DataViewToolbar>

        <div className="border-t border-border px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40 shadow-2xs">
              <UserSwitchIcon size="1em" className="text-lg" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                  Public Login Demo Accounts
                </p>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-100/80 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                  Prototype Access
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                Show or hide the 1-click demo persona switcher on the public login page. Disabling also blocks demo sign-in requests.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
            <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">
              {demoAccountsEnabled ? "Enabled" : "Disabled"}
            </span>
            <Switch
              checked={demoAccountsEnabled}
              onCheckedChange={handleDemoAccountsToggle}
              disabled={demoSettingLoading || demoSettingSaving}
              aria-label="Show Demo Accounts button on login page"
            />
          </div>
        </div>

        {/* Active Filter Chips & Horizontal Scroll Controls Bar */}
        {hasActiveChips && (
          <div className="border-t border-border dark:border-border px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-card">
            <div className="flex-1 min-w-0">
              <ActiveFilterChips
                chips={filterClauses.map((clause) => {
                  const field = moduleFilterFields.find((item) => item.key === clause.fieldKey)
                  const value = field?.options?.find((item) => item.value === clause.value)?.label || clause.value
                  return { id: clause.id, label: `${field?.label || clause.fieldKey} ${clause.operator === "is_not" ? "is not" : "is"} ${value}`, onRemove: () => setFilterClauses((prev) => prev.filter((item) => item.id !== clause.id)) }
                })}
                searchQuery={searchQuery}
                onClearSearch={() => setSearchQuery("")}
                onClearAll={handleClearFilters}
                className="p-0 border-0 bg-transparent px-0 py-0"
              />
            </div>

          </div>
        )}

        {/* Content Section: By Office or Matrix inside the single Card */}
        <div className="flex-[1_0_auto] overflow-hidden rounded-b-2xl border-t border-border dark:border-border bg-white dark:bg-card flex flex-col">
          {/* VIEW 1: BY OFFICE */}
          {viewMode === "office" && (
            <div className="flex flex-col flex-[1_0_auto]">
              {filteredOffices.length === 0 ? (
                <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia>{officeFilter === "Archived" ? <EmptyArchive01Icon size="1em" /> : <EmptyBuilding03Icon size="1em" />}</EmptyMedia>
                      <EmptyTitle>
                        {officeFilter === "Archived" ? "No Archived Departments Found" : "No Departments Found"}
                      </EmptyTitle>
                      <EmptyDescription>
                        {officeFilter === "Archived"
                          ? "There are currently no archived departments in the system."
                          : "No departments matching your current filter were found."}
                      </EmptyDescription>
                    </EmptyHeader>
                    {officeFilter === "Archived" && (
                      <EmptyContent>
                        <Button
                          variant="outline"
                          onClick={() => selectOfficeScope("Active")}
                          title="View Active Departments"
                          className="flex h-10 items-center justify-center px-5"
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
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-900 dark:text-zinc-300 px-1">
                    <div className="flex items-center gap-2">
                      <span>Select Department ({filteredOffices.length}):</span>
                      <span className="text-[11px] font-normal text-gray-400 hidden sm:inline">
                        Click a department to customize its features
                      </span>
                    </div>

                    {deptScrollState.overflow && <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => scrollDeptCards("left")}
                        disabled={!deptScrollState.left}
                        title="Scroll left"
                        aria-label="Scroll departments left"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer border border-border/60 dark:border-border/60 bg-white dark:bg-zinc-800 shadow-2xs active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ArrowLeft01Icon size="1em" className="text-xs" />
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollDeptCards("right")}
                        disabled={!deptScrollState.right}
                        title="Scroll right"
                        aria-label="Scroll departments right"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer border border-border/60 dark:border-border/60 bg-white dark:bg-zinc-800 shadow-2xs active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ArrowRight01Icon size="1em" className="text-xs" />
                      </button>
                    </div>}
                  </div>

                  <div
                    ref={deptCardsScrollRef}
                    className="flex items-stretch gap-3 overflow-x-auto show-scrollbar pb-2 pt-0.5 select-none scroll-smooth"
                  >
                  {filteredOffices.map((o) => {
                    const isSelected = String(o.id).toLowerCase() === String(selectedOfficeId).toLowerCase()
                    const isOfficeArchived = o.status === "Inactive" || o.status === "Archived"
                    const activeCount = officeCounts[o.id] || 0
                    const accent = o.accent_color || "#800000"
                    const officeIconClass = getOfficeIcon(o)

                    return (
                      <button
                        key={o.id}
                        type="button"
                        data-office-id={String(o.id).toLowerCase()}
                        onClick={() => setSelectedOfficeId(o.id)}
                        className={cn(
                          "p-4 rounded-xl border text-left transition-colors relative flex flex-col justify-between gap-3 cursor-pointer group select-none w-[240px] min-w-[240px] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-400",
                          isSelected
                            ? "bg-red-50/60 dark:bg-red-950/20 border-pup-maroon dark:border-red-500"
                            : "bg-white dark:bg-zinc-900/60 border-border dark:border-border hover:border-gray-400 dark:hover:border-zinc-600",
                          isOfficeArchived && !isSelected && "border-dashed bg-gray-50/60 dark:bg-zinc-900/40"
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div
                              className={cn(
                                "h-9 w-9 rounded-xl flex items-center justify-center text-sm shrink-0 border",
                              )}
                              style={{
                                backgroundColor: `${accent}18`,
                                color: accent,
                                borderColor: isSelected ? accent : `${accent}30`,
                              }}
                            >
                              <AppIcon  className={cn(officeIconClass, "text-base")} fallback="Building02Icon"></AppIcon>
                            </div>
                            <div className="min-w-0">
                              <div title={o.short_name}
                                className={cn(
                                  "truncate text-xs font-bold transition-colors",
                                  isSelected
                                    ? "text-pup-maroon dark:text-red-400"
                                    : "text-gray-900 dark:text-zinc-50 group-hover:text-pup-maroon"
                                )}
                              >
                                {o.short_name}
                              </div>
                              <div className="text-[10px] text-gray-400 font-sans tabular-nums">
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
                                  "text-[10px] px-2 py-0.5 rounded-full border-0 font-semibold font-sans tabular-nums transition-colors",
                                  isSelected
                                    ? "bg-pup-maroon text-white dark:bg-red-500 dark:text-white"
                                    : "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300"
                                )}
                              >
                                {activeCount}/{modules.length}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div
                          className={cn(
                            "flex items-center justify-between text-[11px] truncate w-full pt-1 border-t transition-colors",
                            isSelected
                              ? "border-pup-maroon/20 dark:border-red-500/20 text-gray-900 dark:text-zinc-200 font-medium"
                              : "border-border/40 text-gray-600 dark:text-zinc-300"
                          )}
                        >
                          <span className="truncate" title={o.name || o.short_name}>{o.name || o.short_name}</span>
                          {isOfficeArchived && (
                            <span className="text-[10px] text-gray-400 ml-1 shrink-0 font-sans tabular-nums font-medium">
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
                className="flex flex-col flex-[1_0_auto] overflow-hidden bg-white dark:bg-card"
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
                    <AppIcon  className={cn(getOfficeIcon(currentOffice), "text-xl")} fallback="Building02Icon"></AppIcon>
                  </div>
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <h3 className="min-w-0 truncate text-base font-bold text-gray-900 dark:text-zinc-50" title={currentOffice.name || currentOffice.short_name}>
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
                    className="h-9 cursor-pointer flex items-center justify-center px-4 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Enable All Features
                  </Button>
                  <Button
                    variant="outline"
                    disabled={isCurrentArchived || Boolean(toggling[`${currentOffice.id}-all-batch`])}
                    onClick={() => handleBatchToggle(currentOffice.id, "all", false)}
                    title={isCurrentArchived ? "Archived departments cannot be modified" : "Turn off optional features and keep required system tools only"}
                    className="h-9 flex items-center justify-center px-4"
                  >
                    Reset to Core
                  </Button>
                </div>
              </div>

              {/* Archived Office Warning Notice Banner (Attached edge-to-edge dismissable alert) */}
              {isCurrentArchived && !dismissedArchivedAlerts.includes(currentOffice.id) && (
                <NoticeBanner tone="warning" onDismiss={() => handleDismissArchivedAlert(currentOffice.id)} action={
                  <Button size="sm" onClick={() => window.dispatchEvent(new CustomEvent("switch-view", { detail: { view: "offices", officeId: currentOffice.id } }))} title="Restore Department in Departments & Stations">Restore</Button>
                }>
                  <strong className="font-semibold">Archived Department Notice:</strong> This department is currently archived. Its features cannot be modified while it is archived. Restore this department in <strong className="font-semibold">Departments &amp; Stations</strong> to change feature access.
                </NoticeBanner>
              )}

              {/* Module Cards Content Area */}
              <CardContent className="p-6 space-y-8 flex flex-col flex-[1_0_auto] rounded-b-2xl">
                {/* Empty State when no modules match filters */}
                {filteredModules.length === 0 ? (
                  <div className="rounded-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full border border-dashed border-border dark:border-border bg-white/40 dark:bg-zinc-900/20 text-center my-2">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia><EmptySearch01Icon size="1em" /></EmptyMedia>
                        <EmptyTitle>
                          No Features Found
                        </EmptyTitle>
                        <EmptyDescription>
                          We couldn&apos;t find any features matching your search or filter criteria. Try clearing filters or adjusting your keywords.
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button
                          variant="outline"
                          onClick={handleClearFilters}
                          title="Reset Filters"
                          className="flex h-10 items-center justify-center gap-2 px-5"
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
                              <Shield01Icon size={16}  ></Shield01Icon>
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
                              <Tick01Icon size="1em" className="text-[11px]" />
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
                              <Cancel01Icon size="1em" className="text-[11px]" />
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
                              <Contact01Icon size={16}  ></Contact01Icon>
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
                              <Tick01Icon size="1em" className="text-[11px]" />
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
                              <Cancel01Icon size="1em" className="text-[11px]" />
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
            <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia>{officeFilter === "Archived" ? <EmptyArchive01Icon size="1em" /> : <EmptyBuilding03Icon size="1em" />}</EmptyMedia>
                  <EmptyTitle>
                    {officeFilter === "Archived" ? "No Archived Departments Found" : "No Departments Found"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {officeFilter === "Archived"
                      ? "There are currently no archived departments in the system."
                      : "No departments matching your current filter were found."}
                  </EmptyDescription>
                </EmptyHeader>
                {officeFilter === "Archived" && (
                  <EmptyContent>
                    <Button
                      variant="outline"
                      onClick={() => selectOfficeScope("Active")}
                      title="View Active Departments"
                      className="flex h-10 items-center justify-center px-5"
                    >
                      View Active Departments
                    </Button>
                  </EmptyContent>
                )}
              </Empty>
            </div>
          ) : filteredModules.length === 0 ? (
            <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia><EmptySearch01Icon size="1em" /></EmptyMedia>
                  <EmptyTitle>
                    No Features Found
                  </EmptyTitle>
                  <EmptyDescription>
                    We couldn&apos;t find any features matching your search or filter criteria in the summary table.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    variant="outline"
                    onClick={handleClearFilters}
                    title="Reset Filters"
                    className="flex h-10 items-center justify-center gap-2 px-5"
                  >
                    Reset Filters
                  </Button>
                </EmptyContent>
              </Empty>
            </div>
          ) : (
            <div
              ref={matrixTableContainerRef}
              className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2 select-none"
            >
              <Table layout="matrix" columns={[{ kind: "text", width: matrixFeatureWidth, maxWidth: matrixFeatureWidth }, ...visibleMatrixOffices.map(() => ({ kind: "category", width: matrixOfficeWidth }))]}>
                <thead className="sticky top-0 z-20 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                  <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none">
                    <th aria-sort={matrixSortBy === "name" ? matrixSortOrder === "ASC" ? "ascending" : "descending" : "none"} className="p-4 pl-6 min-w-[420px] sticky left-0 bg-gray-50/95 dark:bg-zinc-900/95 z-30">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleMatrixSort("name")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                            matrixSortBy === "name" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          <span>System Feature</span>
                          <SortIndicator column="name" sortBy={matrixSortBy} sortOrder={matrixSortOrder} />
                        </button>
                      </div>
                    </th>
                    {visibleMatrixOffices.map((o) => {
                      const isArchived = o.status === "Inactive" || o.status === "Archived"
                      return (
                        <th
                          key={o.id}
                          className={cn(
                            "p-4 text-center min-w-[150px] select-none",
                            isArchived && "opacity-75"
                          )}
                        >
                          <div className="flex items-center justify-center">
                            <span 
                              className="systemadmin-office-label text-xs font-semibold tracking-tight truncate max-w-[130px]"
                              style={{ "--office-accent": o.accent_color || "#800000" }}
                              title={o.name}
                            >
                              {o.short_name}
                            </span>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-border dark:divide-border">
                  {matrixGroups.map((group) => (
                    <Fragment key={group.key}>
                      {group.label && <tr className="bg-gray-50/90 dark:bg-zinc-900/80">
                        <td colSpan={visibleMatrixOffices.length + 1} className="sticky left-0 border-y border-border/50 bg-gray-50/90 px-4 py-2 pl-6 text-xs font-semibold text-gray-700 dark:bg-zinc-900/80 dark:text-zinc-200">
                          <div className="flex items-center gap-2">
                            {group.key === "staff" ? <Contact01Icon size={14} aria-hidden="true" className="text-blue-600 dark:text-blue-400" /> : <Shield01Icon size={14} aria-hidden="true" className="text-pup-maroon dark:text-red-400" />}
                            <span>{group.label}</span>
                            <span className="font-sans font-normal tabular-nums text-gray-400 dark:text-zinc-500">{group.modules.length}</span>
                          </div>
                        </td>
                      </tr>}
                      {group.modules.map((feature) => <MatrixTableRow
                        key={feature.id}
                        m={feature}
                        offices={visibleMatrixOffices}
                        assignments={matrix.assignments}
                        toggling={toggling}
                        onToggle={handleToggle}
                      />)}
                    </Fragment>
                  ))}
                </tbody>
              </Table>
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
          selectedItemsLabel={confirmModalState.selectedItemsLabel}
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
        "min-h-[172px] p-4 rounded-2xl border flex flex-col justify-between gap-4 select-none transition-colors",
        isEnabled
          ? "bg-white dark:bg-zinc-900 border-border dark:border-border"
          : "bg-gray-50/70 dark:bg-zinc-950/40 border-border dark:border-border"
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center text-sm shrink-0",
                isEnabled
                  ? "bg-pup-maroon/10 text-pup-maroon dark:bg-white/10 dark:text-zinc-100"
                  : "bg-gray-200/60 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400"
              )}
            >
              <AppIcon className={cn(moduleIconClass, "text-base")}></AppIcon>
            </div>
            <div className="min-w-0">
              <h5 className="truncate text-[13px] font-semibold text-gray-900 dark:text-zinc-50 leading-5" title={m.name}>
                {m.name}
              </h5>
              <div className="flex min-w-0 items-center gap-1.5 mt-1">
                <span className="min-w-0 truncate text-[10px] text-gray-400" title={m.id}>
                  {m.id}
                </span>
                <span className="text-gray-300 dark:text-zinc-700 text-[10px]">·</span>
                <span className="min-w-0 truncate text-[10px] font-medium text-gray-900 dark:text-zinc-300" title={getModuleTargetText(m)}>
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

        <p className="text-xs text-gray-600 dark:text-zinc-300 line-clamp-2 leading-5" title={m.description || "Standard system feature."}>
          {m.description || "Standard system feature."}
        </p>
      </div>

      <div className="pt-3 border-t border-border/80 dark:border-border flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium text-gray-600 dark:text-zinc-400">
          {isSystem ? "Always Active (Required)" : isOfficeArchived ? "Locked (Archived Department)" : isEnabled ? "Available to Staff" : "Turned Off"}
        </span>

        {isToggling ? (
          <div className="w-10 h-6 flex items-center justify-center">
            <div className="w-3.5 h-3.5 border-2 border-pup-maroon border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <Switch
            checked={isEnabled}
            onCheckedChange={() => onToggle(office.id, m.id, isEnabled, isSystem)}
            aria-label={`${m.name} for ${office.short_name || office.name}`}
            disabled={isLocked}
            title={isOfficeArchived ? "Reactivate this department to change feature access" : isSystem ? "This is a required system tool and cannot be turned off" : undefined}
          />
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
    <TableRow className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors group select-none">
      <td className="p-4 pl-6 align-top sticky left-0 bg-white/95 dark:bg-zinc-900/95 z-10 border-r border-border/70 dark:border-border/70 min-w-[420px] overflow-hidden">
        <div className="flex w-full min-w-0 items-start gap-3">
          <div className="mt-0.5 h-7 w-7 rounded-lg bg-gray-100 dark:bg-zinc-800/80 flex items-center justify-center text-gray-700 dark:text-zinc-300 text-xs shrink-0">
            <AppIcon className={cn(moduleIconClass, "text-sm")}></AppIcon>
          </div>
          <div className="w-full min-w-0 flex-1 overflow-hidden">
            <div className="flex w-full min-w-0 items-center justify-between gap-3">
              <span className="min-w-0 flex-1 truncate font-semibold text-[13px] text-gray-900 dark:text-zinc-100" title={m.name}>
                {m.name}
              </span>
              <span className="flex min-w-0 max-w-[55%] shrink-0 items-center justify-end gap-2">
                {isSystem && (
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-zinc-800 dark:text-zinc-300">
                    Required
                  </span>
                )}
                <span className="min-w-0 truncate text-[11px] font-normal text-gray-400 dark:text-zinc-500" title={getModuleTargetText(m)}>
                  ({getModuleTargetText(m)})
                </span>
              </span>
            </div>
            <p className="min-w-0 truncate text-[11px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed" title={m.description || "Standard system feature."}>
              {m.description || "Standard system feature."}
            </p>
          </div>
        </div>
      </td>

      {offices.map((o, idx) => {
        const toggleKey = `${o.id}-${m.id}`
        const isToggling = toggling[toggleKey]
        const enabled = isSystem || Boolean(assignments[o.id]?.[m.id]?.enabled)
        const isOfficeArchived = o.status === "Inactive" || o.status === "Archived"
        const isLocked = isSystem || isOfficeArchived

        return (
          <td
            key={o.id}
            className={cn(
              "p-4 text-center align-middle min-w-[150px]",
              idx < offices.length - 1 && "border-r border-border/70 dark:border-border/70"
            )}
          >
            <div className="inline-flex items-center justify-center">
              {isToggling ? (
                <div className="w-9 h-5 flex items-center justify-center">
                  <div className="w-3.5 h-3.5 border-2 border-pup-maroon border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <Switch
                  size="sm"
                  checked={enabled}
                  onCheckedChange={() => onToggle(o.id, m.id, enabled, isSystem)}
                  aria-label={`${m.name} for ${o.short_name || o.name}`}
                  disabled={isLocked}
                  title={isOfficeArchived ? `Reactivate ${o.short_name} to change feature access` : isSystem ? "This is a required system tool and cannot be turned off" : undefined}
                />
              )}
            </div>
          </td>
        )
      })}
    </TableRow>
  )
}
