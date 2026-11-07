"use client"
import useViewPreference from "@/hooks/useViewPreference"
import { formatPHDateTime } from "@/lib/timeFormat"
import { Table } from "@/components/ui/table";
import TablePagination from "@/components/shared/TablePagination";
import { Textarea } from "@/components/ui/textarea";


import { Fragment, useState, useEffect, useCallback, useMemo, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter, useSearchParams } from "next/navigation"
import { useAppReducedMotion, EASE_OUT } from "@/lib/motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import OfficeGridSkeleton from "@/components/systemadmin/skeletons/OfficeGridSkeleton"
import OfficeManagementPageSkeleton from "@/components/systemadmin/skeletons/OfficeManagementPageSkeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import PageHeader from "@/components/shared/PageHeader"
import { RefreshButton } from "@/components/shared/RefreshButton"
import ViewModeIcon from "@/components/shared/ViewModeIcon"
import { SegmentedControl } from "@/components/ui/tabs"
import ActiveFilterChips from "@/components/shared/ActiveFilterChips"
import ConfirmModal from "@/components/shared/ConfirmModal"
import FloatingActionBar from "@/components/shared/FloatingActionBar"
import { Badge } from "@/components/ui/badge"
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
import { fetchJsonOnce } from "@/lib/clientRequest"
import OfficeDetailSheet from "@/components/systemadmin/OfficeDetailSheet"
import useTableScroll from "@/hooks/useTableScroll"
import OfficeTableControls from "@/components/systemadmin/OfficeTableControls"
import OfficeActionsMenu from "@/components/systemadmin/OfficeActionsMenu"
import { Add01Icon, Archive01Icon as EmptyArchive01Icon, Building01Icon, Building02Icon, Building03Icon as EmptyBuilding03Icon, Search01Icon as EmptySearch01Icon, ArrowDown01Icon, ArrowUp01Icon, ArrowUpDownIcon, CheckmarkCircle01Icon, ComputerIcon, Copy01Icon, Folder01Icon, LayoutGridIcon, UserSearch01Icon, Search01Icon, Tick01Icon } from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
import ColorSelector, { REFERENCE_ACCENT_COLORS } from "@/components/ui/color-selector";
// Stored icons may use either the " Cancel01Icon" or " Cancel01Icon" prefix, so compare by bare icon name.
const iconKey = (value = "") => String(value).trim().split(/\s+/).pop().replace(/^(|ph)-/, "")

// Expanded predefined icon palette so SuperAdmins have rich choices for campus offices
const PRESET_ICONS = [
  { value: " Building02Icon", label: "Building" },
  { value: " Building01Icon", label: "Institution" },
  { value: " SchoolIcon", label: "College" },
  { value: " GraduationScrollIcon", label: "Graduation" },
  { value: " Certificate01Icon", label: "Registrar" },
  { value: " ScrollIcon", label: "Diploma" },
  { value: " PassportIcon", label: "Credentials" },
  { value: " Award01Icon", label: "Honors" },
  { value: " Shield01Icon", label: "Clearance" },
  { value: " UserSearch01Icon", label: "Personnel" },
  { value: " UserCheck01Icon", label: "Admissions" },
  { value: " UserIcon", label: "Student Affairs" },
  { value: " ClipboardIcon", label: "Records" },
  { value: " CheckListIcon", label: "Evaluations" },
  { value: " File02Icon", label: "Documents" },
  { value: " Folder01Icon", label: "Folders" },
  { value: " Archive02Icon", label: "Archive Folder" },
  { value: " Book01Icon", label: "Library" },
  { value: " BookOpen01Icon", label: "Textbooks" },
  { value: " LibraryIcon", label: "Catalog" },
  { value: " Calendar01Icon", label: "Schedules" },
  { value: " Mail01Icon", label: "Communications" },
  { value: " BankIcon", label: "Accounting" },
  { value: " Wallet01Icon", label: "Cashier" },
  { value: " CreditCardIcon", label: "Finance" },
  { value: " CalculatorIcon", label: "Budget" },
  { value: " StethoscopeIcon", label: "Clinic" },
  { value: " HeartCheckIcon", label: "Health Services" },
  { value: " Chemistry01Icon", label: "Laboratory" },
  { value: " Database01Icon", label: "IT & Systems" },
  { value: " CloudServerIcon", label: "Infrastructure" },
  { value: " LaptopIcon", label: "Computing" },
  { value: " Briefcase01Icon", label: "Career & Placement" },
  { value: " Message01Icon", label: "Guidance & Counseling" },
  { value: " TeacherIcon", label: "Faculty" },
  { value: " Presentation01Icon", label: "Seminars" },
  { value: " CustomerService01Icon", label: "Help Desk" },
  { value: " Megaphone01Icon", label: "Announcements" },
  { value: " PrinterIcon", label: "Printing" },
  { value: " Stamp01Icon", label: "Authentication" },
  { value: " IdIcon", label: "ID Services" },
  { value: " Hospital01Icon", label: "Medical" },
  { value: " Bus01Icon", label: "Transport" },
  { value: " Store01Icon", label: "Supply" },
  { value: " Key01Icon", label: "Access Keys" },
  { value: " GlobeIcon", label: "International Affairs" },
  { value: " SecurityCheckIcon", label: "Safety & Security" },
  { value: " JusticeScale01Icon", label: "Legal Affairs" },
]

// Expanded institutional branding colors palette
const OFFICE_COLOR_PRESETS = [
  { name: "PUP Maroon", hex: "#800000" },
  { name: "Crimson Red", hex: "#b91c1c" },
  { name: "Ruby Rose", hex: "#e11d48" },
  { name: "Deep Coral", hex: "#ea580c" },
  { name: "Amber Gold", hex: "#b45309" },
  { name: "Warm Yellow", hex: "#ca8a04" },
  { name: "Emerald Green", hex: "#15803d" },
  { name: "Forest Green", hex: "#166534" },
  { name: "Teal Cyan", hex: "#0f766e" },
  { name: "Ocean Blue", hex: "#0284c7" },
  { name: "PUP Accent Blue", hex: "#1d4ed8" },
  { name: "Royal Navy", hex: "#1e3a8a" },
  { name: "Indigo", hex: "#4338ca" },
  { name: "Violet Purple", hex: "#6d28d9" },
  { name: "Deep Berry", hex: "#7e22ce" },
  { name: "Plum Pink", hex: "#a21caf" },
  { name: "Slate Charcoal", hex: "#334155" },
  { name: "Midnight Black", hex: "#0f172a" },
]

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return <ArrowUpDownIcon size="1em" className="ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"></ArrowUpDownIcon>
  }
  return sortOrder === "ASC" ? (
    <ArrowUp01Icon size="1em" className="ml-1 text-[12px] text-gray-400"></ArrowUp01Icon>
  ) : (
    <ArrowDown01Icon size="1em" className="ml-1 text-[12px] text-gray-400"></ArrowDown01Icon>
  )
}

function formatMiddleTruncate(str, maxLength = 26) {
  if (!str || str.length <= maxLength) return str
  const startChars = Math.ceil((maxLength - 3) / 2)
  const endChars = Math.floor((maxLength - 3) / 2)
  return str.slice(0, startChars) + "..." + str.slice(str.length - endChars)
}

function matchesOfficeFilters(office, filters, fields) {
  return filters.every((filter) => {
    const field = fields.find((candidate) => candidate.key === filter.fieldKey)
    if (!field) return true

    if (field.type === "number") {
      if (String(filter.value).trim() === "") return true
      const actual = Number(office[field.key] || 0)
      const expected = Number(filter.value)
      if (!Number.isFinite(expected)) return true
      if (filter.operator === "greater_than") return actual > expected
      if (filter.operator === "less_than") return actual < expected
      if (filter.operator === "is_not") return actual !== expected
      return actual === expected
    }

    const rawActual = field.key === "station_name" ? (office.station_name?.trim() || "__unassigned") : office[field.key]
    const actual = String(rawActual || "").toLocaleLowerCase()
    const expected = String(filter.value || "").toLocaleLowerCase()
    return filter.operator === "is_not" ? actual !== expected : actual === expected
  })
}

function OfficeStatusBadge({ isActive }) {
  const label = isActive ? "Active" : "Archived"

  return (
    <span
      data-slot="table-status"
      data-tone={isActive ? "success" : "neutral"}
      className="inline-flex min-h-6 max-w-full items-center justify-center rounded-full border border-transparent px-2.5 py-1 text-[11px] font-medium"
    >
      {label}
    </span>
  )
}

export default function OfficeManagementTab({ showToast, onSwitchTab }) {
  const shouldReduceMotion = useAppReducedMotion()
  const [offices, setOffices] = useState([])
  const [storageRoot, setStorageRoot] = useState(".local")
  const [scannerHostRoot, setScannerHostRoot] = useState(".local/hot-folder")
  const [availableModules, setAvailableModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [isManualLoading, setIsManualLoading] = useState(false)
  // Filters & Search
  const [searchQuery, setSearchQuery] = useViewPreference("offices", "searchQuery", "")
  const [statusFilter, setStatusFilter] = useViewPreference("offices", "statusFilter", "Active") // "Active" | "Inactive"
  const [filterClauses, setFilterClauses] = useViewPreference("offices", "filterClauses", [])
  const [archiveOfficeTarget, setArchiveOfficeTarget] = useState(null)
  const [isArchiving, setIsArchiving] = useState(false)
  const [restoreOfficeTarget, setRestoreOfficeTarget] = useState(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [selectedOfficeIdForDetail, setSelectedOfficeIdForDetail] = useState(null)
  const [confirmMatrixLeaveOpen, setConfirmMatrixLeaveOpen] = useState(false)
  const [layoutView, setLayoutView] = useViewPreference("offices", "layoutView", "grid")
  const [visibleColumns, setVisibleColumns] = useViewPreference("offices", "visibleColumns", ["department", "office", "station", "staff", "modules", "status"])
  const [groupBy, setGroupBy] = useViewPreference("offices", "groupBy", "none")
  const [copiedStorageId, setCopiedStorageId] = useState(null)

  const handleCopyStoragePath = useCallback((path, officeId) => {
    if (!path) return
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(path)
      showToast("Storage path copied to clipboard")
      setCopiedStorageId(officeId)
      setTimeout(() => setCopiedStorageId((curr) => (curr === officeId ? null : curr)), 2000)
    }
  }, [showToast])

  // Multi-Selection State & Batch Actions
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [lastSelectedId, setLastSelectedId] = useState(null)
  const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false)
  const [bulkArchiveLoading, setBulkArchiveLoading] = useState(false)
  const [bulkRestoreOpen, setBulkRestoreOpen] = useState(false)
  const [bulkRestoreLoading, setBulkRestoreLoading] = useState(false)

  // Table Sorting state
  const [sortBy, setSortBy] = useViewPreference("offices", "sortBy", "short_name")
  const [sortOrder, setSortOrder] = useViewPreference("offices", "sortOrder", "ASC")

  const router = useRouter()
  const searchParams = useSearchParams()

  // Table Pagination state
  const initialPageFromUrl = parseInt(searchParams?.get("page") || "1", 10)
  const [page, setPage] = useState(!isNaN(initialPageFromUrl) && initialPageFromUrl >= 1 ? initialPageFromUrl : 1)
  const [pageSize, setPageSize] = useViewPreference("offices", "pageSize", 20)

  useEffect(() => {
    const pageFromUrl = parseInt(searchParams?.get("page") || "1", 10)
    const validPage = !isNaN(pageFromUrl) && pageFromUrl >= 1 ? pageFromUrl : 1
    if (validPage !== page) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPage(validPage)
    }
  }, [searchParams, page])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1)
    setSelectedIds(new Set())
    setLastSelectedId(null)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      if (params.has("page")) {
        params.delete("page")
        router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false })
      }
    }
  }, [searchQuery, statusFilter, filterClauses, router])

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"))
    } else {
      setSortBy(column)
      setSortOrder("ASC")
    }
  }

  // Form State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedOfficeId, setSelectedOfficeId] = useState(null)
  const [modulesAccordionOpen, setModulesAccordionOpen] = useState(false)

  const [form, setForm] = useState({
    id: "",
    name: "",
    short_name: "",
    description: "",
    icon: " Building02Icon",
    accent_color: "#800000",
    status: "Active",
    station_name: "",
    storage_path: "",
    inbound_path: "",
    adminEmail: "",
    selectedModules: [],
  })

  const [submitLoading, setSubmitLoading] = useState(false)
  const fetchOffices = useCallback(async (isSilent = false) => {
    try {
      const cached = getCachedData("systemadmin_offices_stats")
      if (Array.isArray(cached) && !isSilent) {
        setOffices(cached)
        setLoading(false)
      }

      const result = await fetchJsonOnce("/api/offices?stats=true")
      if (result.ok && Array.isArray(result.data)) {
        setOffices(result.data)
        if (result.storageRoot) setStorageRoot(result.storageRoot)
        if (result.scannerHostRoot) setScannerHostRoot(result.scannerHostRoot)
        setCachedData("systemadmin_offices_stats", result.data, 60000)
      } else if (!cached) {
        showToast(result.error || "Failed to fetch offices", true)
      }
    } catch {
      if (!getCachedData("systemadmin_offices_stats")) {
        showToast("Network error fetching offices", true)
      }
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const fetchModules = useCallback(async () => {
    try {
      const cached = getCachedData("systemadmin_modules")
      if (Array.isArray(cached)) {
        setAvailableModules(cached)
      }

      const result = await fetchJsonOnce("/api/modules")
      if (result.ok && Array.isArray(result.data)) {
        setAvailableModules(result.data)
        setCachedData("systemadmin_modules", result.data, 120000)
      }
    } catch (err) {
      console.error("Failed to fetch available modules", err)
    }
  }, [])

  const handleManualRefresh = useCallback(async () => {
    setIsManualLoading(true)
    try {
      await Promise.all([fetchOffices(true), fetchModules()])
    } finally {
      setIsManualLoading(false)
    }
  }, [fetchOffices, fetchModules])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOffices()
    fetchModules()
  }, [fetchOffices, fetchModules])

  const handleOpenCreate = () => {
    setIsEditing(false)
    setSelectedOfficeId(null)
    setModulesAccordionOpen(false)
    const defaultSelected = availableModules.map(m => m.id)
    setForm({
      id: "",
      name: "",
      short_name: "",
      description: "",
      icon: " Building02Icon",
      accent_color: "#800000",
      status: "Active",
      station_name: "",
      storage_path: "",
      inbound_path: "",
      adminEmail: "",
      selectedModules: defaultSelected,
    })
    setDialogOpen(true)
  }

  const handleOpenEdit = (office) => {
    if (office.status !== "Active") return
    setIsEditing(true)
    setSelectedOfficeId(office.id)
    const icon = office.icon || " Building02Icon"
    setModulesAccordionOpen(false)
    setForm({
      id: office.id,
      name: office.name,
      short_name: office.short_name,
      description: office.description || "",
      icon,
      accent_color: office.accent_color || "#800000",
      status: office.status || "Active",
      station_name: office.station_name || "",
      storage_path: office.storage_path || "",
      inbound_path: office.scanner_host_path || office.inbound_path || "",
      adminEmail: "",
      selectedModules: [],
    })
    setDialogOpen(true)
  }

  const handleModuleToggle = (modId) => {
    setForm(prev => {
      const exists = prev.selectedModules.includes(modId)
      return {
        ...prev,
        selectedModules: exists
          ? prev.selectedModules.filter(id => id !== modId)
          : [...prev.selectedModules, modId]
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const cleanId = form.id.trim().toLowerCase().replace(/^-+|-+$/g, "")
    const cleanAdminEmail = (form.adminEmail.trim() || (cleanId ? `admin.${cleanId}@pup.local` : "")).toLowerCase()
    if (!cleanId || !form.name.trim() || !form.short_name.trim() || (!isEditing && !cleanAdminEmail)) {
      showToast("Please fill in all required fields", true)
      return
    }

    setSubmitLoading(true)
    try {
      const url = isEditing ? `/api/offices/${selectedOfficeId}` : "/api/offices"
      const method = isEditing ? "PATCH" : "POST"

      const payload = {
        id: cleanId,
        name: form.name.trim(),
        short_name: form.short_name.trim(),
        description: form.description.trim(),
        icon: form.icon.trim(),
        accent_color: form.accent_color,
        status: form.status,
        station_name: form.station_name.trim() || undefined,
        adminEmail: !isEditing ? cleanAdminEmail : undefined,
      }

      if (!isEditing) {
        payload.moduleIds = form.selectedModules
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (res.ok && json.ok) {
        if (isEditing) {
          showToast("Office updated successfully")
        } else {
          showToast(
            json.credentialEmail?.sent
              ? "Office created. Admin credentials were emailed."
              : "Office created, but the admin credential email could not be sent. Check SMTP settings.",
            !json.credentialEmail?.sent,
          )
        }
        setDialogOpen(false)
        invalidateDataCache("systemadmin_offices")
        fetchOffices(true)
      } else {
        showToast(json.error || "Failed to save office", true)
      }
    } catch {
      showToast("Network error saving office", true)
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleToggleStatus = async (office) => {
    const nextStatus = office.status === "Active" ? "Inactive" : "Active"
    try {
      const res = await fetch(`/api/offices/${office.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        showToast(
          nextStatus === "Active"
            ? "Department restored successfully"
            : "Department archived successfully"
        )
        invalidateDataCache("systemadmin_offices")
        fetchOffices(true)
      } else {
        showToast(json.error || "Failed to toggle status", true)
      }
    } catch {
      showToast("Network error toggling status", true)
    }
  }

  const stats = useMemo(() => {
    const total = offices.length
    const active = offices.filter((o) => o.status === "Active").length
    const inactive = offices.filter((o) => o.status !== "Active").length
    const totalStaff = offices.reduce((acc, o) => acc + (o.staff_count || 0), 0)
    const totalModules = offices.reduce((acc, o) => acc + (o.module_count || 0), 0)
    const avgModules = total > 0 ? Math.round(totalModules / total) : 0
    const avgStaff = total > 0 ? Math.round(totalStaff / total) : 0
    return {
      total,
      active,
      inactive,
      totalStaff,
      avgStaff,
      avgModules,
    }
  }, [offices])

  const filterFields = useMemo(() => {
    const uniqueOptions = (field, fallback = "") => [...new Map(offices.map((office) => {
      const value = office[field] || fallback
      return [String(value), { value: String(value), label: String(value) }]
    })).values()].filter((option) => option.value)
    const stationOptions = uniqueOptions("station_name")
    stationOptions.push({ value: "__unassigned", label: "No station assigned" })

    return [
      { key: "short_name", label: "Department", icon: Building02Icon, options: uniqueOptions("short_name") },
      { key: "name", label: "Office name", icon: Building01Icon, options: uniqueOptions("name") },
      { key: "station_name", label: "Station", icon: ComputerIcon, options: stationOptions },
      { key: "staff_count", label: "Staff", icon: UserSearch01Icon, type: "number" },
      { key: "module_count", label: "Modules", icon: LayoutGridIcon, type: "number" },
    ]
  }, [offices])

  const activeFilterChips = useMemo(() => filterClauses.map((filter) => {
    const field = filterFields.find((candidate) => candidate.key === filter.fieldKey)
    if (!field) return null
    const option = field.options?.find((candidate) => String(candidate.value) === String(filter.value))
    const value = option?.label || (String(filter.value ?? "").trim() || "Any value")
    const operator = ({
      is: "is",
      is_not: "is not",
      greater_than: "is greater than",
      less_than: "is less than",
    })[filter.operator] || "is"

    return {
      id: filter.id,
      groupLabel: field.label,
      label: `${operator} ${value}`,
      onRemove: () => setFilterClauses((current) => current.filter((clause) => clause.id !== filter.id)),
    }
  }).filter(Boolean), [filterClauses, filterFields, setFilterClauses])

  const clearOfficeFilters = () => {
    setSearchQuery("")
    setFilterClauses([])
    setPage(1)
  }

  const confirmArchiveOffice = async () => {
    if (!archiveOfficeTarget) return
    setIsArchiving(true)
    try {
      await handleToggleStatus(archiveOfficeTarget)
      setArchiveOfficeTarget(null)
    } finally {
      setIsArchiving(false)
    }
  }

  const confirmRestoreOffice = async () => {
    if (!restoreOfficeTarget) return
    setIsRestoring(true)
    try {
      await handleToggleStatus(restoreOfficeTarget)
      setRestoreOfficeTarget(null)
    } finally {
      setIsRestoring(false)
    }
  }

  const filteredOffices = useMemo(() => {
    const list = offices.filter((o) => {
      const matchesSearch =
        !searchQuery ||
        o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.short_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.station_name || "").toLowerCase().includes(searchQuery.toLowerCase())
      const isArchived = o.status !== "Active"
      const matchesTab = statusFilter === "Active" ? !isArchived : isArchived
      const matchesFilters = matchesOfficeFilters(o, filterClauses, filterFields)

      return matchesSearch && matchesTab && matchesFilters
    })

    list.sort((a, b) => {
      let valA = ""
      let valB = ""
      if (sortBy === "short_name") {
        valA = (a.short_name || a.id || "").toLowerCase()
        valB = (b.short_name || b.id || "").toLowerCase()
      } else if (sortBy === "name") {
        valA = (a.name || "").toLowerCase()
        valB = (b.name || "").toLowerCase()
      } else if (sortBy === "station_name") {
        valA = (a.station_name || "").toLowerCase()
        valB = (b.station_name || "").toLowerCase()
      } else if (sortBy === "staff_count") {
        const numA = a.staff_count || 0
        const numB = b.staff_count || 0
        return sortOrder === "ASC" ? numA - numB : numB - numA
      } else if (sortBy === "module_count") {
        const numA = a.module_count || 0
        const numB = b.module_count || 0
        return sortOrder === "ASC" ? numA - numB : numB - numA
      } else if (sortBy === "status") {
        valA = (a.status || "").toLowerCase()
        valB = (b.status || "").toLowerCase()
      } else if (sortBy === "created_at" || sortBy === "updated_at") {
        valA = Date.parse(a[sortBy]) || 0
        valB = Date.parse(b[sortBy]) || 0
      }

      if (valA < valB) return sortOrder === "ASC" ? -1 : 1
      if (valA > valB) return sortOrder === "ASC" ? 1 : -1
      return 0
    })

    return list
  }, [offices, searchQuery, statusFilter, filterClauses, filterFields, sortBy, sortOrder])

  const totalPages = Math.max(1, Math.ceil(filteredOffices.length / pageSize))
  const startIndex = (page - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, filteredOffices.length)
  const paginatedOffices = useMemo(() => {
    return filteredOffices.slice(startIndex, startIndex + pageSize)
  }, [filteredOffices, startIndex, pageSize])

  const groupedOffices = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: "", offices: paginatedOffices }]
    const groups = new Map()
    paginatedOffices.forEach((office) => {
      const label = groupBy === "station"
        ? (office.station_name || "Unassigned station")
        : groupBy === "staff_count"
          ? `${office.staff_count || 0} staff`
          : office.status === "Active" ? "Active" : "Archived"
      if (!groups.has(label)) groups.set(label, [])
      groups.get(label).push(office)
    })
    return [...groups.entries()].map(([label, offices]) => ({ key: label, label, offices }))
  }, [groupBy, paginatedOffices])

  const tableColumns = [
    { key: "department", label: "Department / Office", sort: "short_name", icon: Building02Icon },
    { key: "office", label: "Office Name & Description", sort: "name", icon: Building01Icon },
    { key: "station", label: "Workstation & Storage", sort: "station_name", icon: ComputerIcon },
    { key: "staff", label: "Staff", sort: "staff_count", icon: UserSearch01Icon },
    { key: "modules", label: "Modules", sort: "module_count", icon: LayoutGridIcon },
    { key: "status", label: "Status", sort: "status", icon: CheckmarkCircle01Icon },
    { key: "created_at", label: "Date Added", sort: "created_at", icon: Building01Icon },
    { key: "updated_at", label: "Last Updated", sort: "updated_at", icon: Building01Icon },
  ]
  const sortOptions = tableColumns.map(({ sort, label, icon }) => ({ key: sort, label, icon }))
  const groupOptions = [
    { key: "status", label: "Status", icon: CheckmarkCircle01Icon },
    { key: "station", label: "Station", icon: ComputerIcon },
    { key: "staff_count", label: "Staff count", icon: UserSearch01Icon },
    { key: "none", label: "No grouping" },
  ]
  const orderedVisibleColumnKeys = tableColumns.filter((column) => visibleColumns.includes(column.key)).map((column) => column.key)

  // Horizontal table scrolling hook
  const {
    tableContainerRef,
    canScrollLeft,
    canScrollRight,
    isScrolled,
    scrollLeft,
    scrollRight,
    resetScroll,
  } = useTableScroll([paginatedOffices?.length]);

  useEffect(() => {
    resetScroll();
  }, [page, pageSize, searchQuery, statusFilter, layoutView, resetScroll]);

  // Derived selected office object ensuring reactivity with background updates
  const selectedOfficeForDetail = useMemo(() => {
    if (!selectedOfficeIdForDetail) return null
    return offices.find((o) => o.id === selectedOfficeIdForDetail) || null
  }, [offices, selectedOfficeIdForDetail])

  // Office Detail Record Browsing State & Navigation
  const currentDetailIndex = useMemo(() => {
    if (!selectedOfficeIdForDetail) return -1
    return filteredOffices.findIndex((o) => o.id === selectedOfficeIdForDetail)
  }, [filteredOffices, selectedOfficeIdForDetail])

  const totalOfficeCount = filteredOffices.length

  const handleNavigatePrevDetail = useCallback(() => {
    if (currentDetailIndex > 0) {
      setSelectedOfficeIdForDetail(filteredOffices[currentDetailIndex - 1]?.id || null)
    }
  }, [currentDetailIndex, filteredOffices])

  const handleNavigateNextDetail = useCallback(() => {
    if (currentDetailIndex < totalOfficeCount - 1) {
      setSelectedOfficeIdForDetail(filteredOffices[currentDetailIndex + 1]?.id || null)
    }
  }, [currentDetailIndex, totalOfficeCount, filteredOffices])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev
      const validIds = new Set(filteredOffices.map((o) => o.id))
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
  }, [filteredOffices])

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(paginatedOffices.map((o) => o.id)))
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

      const currentIdx = paginatedOffices.findIndex((o) => o.id === id)
      const lastIdx = paginatedOffices.findIndex((o) => o.id === lastSelectedId)

      if (currentIdx !== -1 && lastIdx !== -1) {
        const start = Math.min(currentIdx, lastIdx)
        const end = Math.max(currentIdx, lastIdx)
        const idsInRange = paginatedOffices
          .slice(start, end + 1)
          .map((o) => o.id)

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
        const res = await fetch(`/api/offices/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Inactive" }),
        })
        const json = await res.json()
        if (res.ok && json.ok) {
          setOffices((prev) => prev.map((o) => (o.id === id ? { ...o, status: "Inactive" } : o)))
          successCount++
        } else {
          failCount++
        }
      }

      showToast(`Archived ${successCount} department(s)${failCount > 0 ? ` (${failCount} failed)` : ""}`)
      setBulkArchiveOpen(false)
      setSelectedIds(new Set())
      invalidateDataCache("systemadmin_offices_stats")
      invalidateDataCache("systemadmin_offices")
      fetchOffices(true)
    } catch {
      showToast("Network error archiving selected departments", true)
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
        const res = await fetch(`/api/offices/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Active" }),
        })
        const json = await res.json()
        if (res.ok && json.ok) {
          setOffices((prev) => prev.map((o) => (o.id === id ? { ...o, status: "Active" } : o)))
          successCount++
        } else {
          failCount++
        }
      }

      showToast(`Restored ${successCount} department(s)${failCount > 0 ? ` (${failCount} failed)` : ""}`)
      setBulkRestoreOpen(false)
      setSelectedIds(new Set())
      invalidateDataCache("systemadmin_offices_stats")
      invalidateDataCache("systemadmin_offices")
      fetchOffices(true)
    } catch {
      showToast("Network error restoring selected departments", true)
    } finally {
      setBulkRestoreLoading(false)
    }
  }

  const handleCopyCodes = () => {
    const selectedOffices = offices.filter((o) => selectedIds.has(o.id))
    const codes = selectedOffices.map((o) => o.short_name || o.id).filter(Boolean)
    if (codes.length === 0) {
      showToast("No department codes found for selection", true)
      return
    }
    navigator.clipboard.writeText(codes.join(", "))
    showToast(`Copied ${codes.length} department code${codes.length === 1 ? "" : "s"} to clipboard`)
  }

  const updatePage = useCallback((newPage) => {
    const validPage = Math.max(1, Math.min(totalPages, newPage))
    setPage(validPage)
    const params = new URLSearchParams(window.location.search)
    if (validPage > 1) {
      params.set("page", String(validPage))
    } else {
      params.delete("page")
    }
    const queryString = params.toString()
    const nextUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname
    router.push(nextUrl, { scroll: false })
  }, [totalPages, router])

  const enabledCount = useMemo(() => {
    const sysCount = availableModules.filter(m => m.is_system).length
    const customCount = form.selectedModules.filter(id => !availableModules.find(m => m.id === id)?.is_system).length
    return Math.min(availableModules.length, sysCount + customCount)
  }, [availableModules, form.selectedModules])

  if (loading) return <OfficeManagementPageSkeleton />

  return (
    <div className="animate-fade-up font-jakarta flex flex-[1_0_auto] flex-col w-full gap-6">
      {/* ONE Single Card Container encapsulating Header, Metrics, Toolbar, Table & Pagination */}
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        <PageHeader
          icon=" Building01Icon"
          title={
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span>Departments & Stations</span>
              {loading ? (
                <Skeleton aria-hidden="true" className="h-3.5 w-44 rounded dark:bg-muted" />
              ) : (
                <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400">
                  {stats.total.toLocaleString()} departments · {stats.totalStaff.toLocaleString()} personnel
                </span>
              )}
            </div>
          }
          description="Manage campus offices, link scanning computers, and configure departmental storage folders."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex shrink-0 items-center gap-2">
              <RefreshButton onRefresh={handleManualRefresh} isLoading={isManualLoading} title="Refresh Offices & Modules" className="h-9 w-9" />
              <Button onClick={handleOpenCreate} className="h-9 shrink-0 px-4">Add Department</Button>
            </div>
          }
        />

        <div className="flex items-center justify-between gap-4 overflow-x-auto px-6 py-2.5 scrollbar-none border-b border-border bg-white dark:bg-card dark:border-white/10">
          <SegmentedControl
            value={statusFilter}
            onValueChange={setStatusFilter}
            variant="capsule"
            className="inline-grid grid-flow-col auto-cols-fr"
            items={[
              { value: "Active", label: "Active", badge: stats.active },
              { value: "Inactive", label: "Archived", badge: stats.inactive },
            ]}
          />

          <div className="ml-auto">
            <SegmentedControl
              value={layoutView}
              onValueChange={setLayoutView}
              variant="capsule"
              className="inline-grid grid-flow-col auto-cols-fr"
              items={[
                { value: "grid", label: "Grid", icon: <ViewModeIcon mode="grid" className="text-sm" /> },
                { value: "table", label: "Table", icon: <ViewModeIcon mode="table" className="text-sm" /> },
              ]}
            />
          </div>
        </div>

        <OfficeTableControls
          searchQuery={searchQuery}
          onSearchChange={(value) => { setSearchQuery(value); setPage(1) }}
          resultCount={filteredOffices.length}
          isLoading={loading}
          filterFields={filterFields}
          filters={filterClauses}
          onFiltersChange={(nextFilters) => { setFilterClauses(nextFilters); setPage(1) }}
          sortOptions={sortOptions}
          sortBy={sortBy}
          onSortByChange={(value) => { setSortBy(value); setSortOrder("ASC") }}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          groupOptions={groupOptions}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          columns={tableColumns.filter((column) => column.key !== "department")}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={(keys) => setVisibleColumns(["department", ...keys.filter((key) => key !== "department")])}
          showTableControls={layoutView === "table"}
          scrollControls={{
            scrollContainerRef: tableContainerRef,
            canScrollLeft,
            canScrollRight,
            isScrolled,
            onScrollLeft: scrollLeft,
            onScrollRight: scrollRight,
            onResetScroll: resetScroll,
          }}
        />

        <ActiveFilterChips
          chips={activeFilterChips}
          searchQuery={searchQuery}
          onClearSearch={() => { setSearchQuery(""); setPage(1) }}
          onClearAll={clearOfficeFilters}
          className="border-t border-border px-5 py-2.5 dark:border-border"
        />

        {/* Content Section inside the single card */}
        <div aria-busy={loading || undefined} className="rounded-b-2xl border-t border-border dark:border-border bg-white dark:bg-card flex flex-col flex-[1_0_auto]">
          {loading ? (
            <OfficeGridSkeleton
              layoutView={layoutView}
              count={layoutView === "table" ? pageSize : 6}
              visibleColumns={orderedVisibleColumnKeys}
              groupBy={groupBy}
              statusFilter={statusFilter}
              tableContainerRef={tableContainerRef}
            />
          ) : filteredOffices.length === 0 ? (
            <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia>{searchQuery || filterClauses.length ? <EmptySearch01Icon size="1em" /> : statusFilter === "Inactive" ? <EmptyArchive01Icon size="1em" /> : <EmptyBuilding03Icon size="1em" />}</EmptyMedia>
                  <EmptyTitle>
                    {searchQuery || filterClauses.length
                      ? "No Results Found"
                      : (statusFilter === "Inactive" ? "No Archived Departments Found" : "No Departments Found")}
                  </EmptyTitle>
                  <EmptyDescription>
                    {searchQuery || filterClauses.length
                      ? "No departments match your search and filters. Adjust or reset the filters to see more results."
                      : (statusFilter === "Inactive"
                        ? "There are currently no archived departments in the system."
                        : "There are currently no administrative or academic campus departments configured in the system.")}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  {searchQuery || filterClauses.length > 0 ? (
                    <Button
                      variant="outline"
                      onClick={() => { setSearchQuery(""); setFilterClauses([]) }}
                      title="Reset Filters"
                      className="flex h-10 items-center justify-center gap-2 px-5"
                    >
                      Reset Filters
                    </Button>
                  ) : statusFilter === "Inactive" && stats.active > 0 ? (
                    <Button
                      variant="outline"
                      onClick={() => setStatusFilter("Active")}
                      title="View Active Departments"
                      className="flex h-10 items-center justify-center px-5"
                    >
                      View Active Departments
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={handleOpenCreate}
                      title="Create Department"
                      className="flex h-10 items-center justify-center px-5 cursor-pointer"
                    >
                      Create Department
                    </Button>
                  )}
                </EmptyContent>
              </Empty>
            </div>
          ) : layoutView === "grid" ? (
            <div className="p-6 flex-[1_0_auto] bg-gray-50/30 dark:bg-zinc-900/20 rounded-b-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 content-start">
                {paginatedOffices.map((office) => {
                  const accent = office.accent_color || "#800000"
                  const isActive = String(office.status || "").trim().toLowerCase() === "active"
                  const storagePath = office.storage_path || `.local/storage/${office.id}`
                  return (
                    <Card
                      key={office.id}
                      className={cn(
                        "group overflow-hidden border relative shadow-xs rounded-2xl flex flex-col p-0 py-0 gap-0",
                        isActive
                          ? "border-border dark:border-border bg-white dark:bg-card"
                          : "border-dashed border-border dark:border-border bg-gray-50/70 dark:bg-zinc-900/40 opacity-80 dark:opacity-75"
                      )}
                    >
                      {/* Clean Apple HIG Header: Continuous-corner icon badge, Department code & Overflow menu */}
                      <div className="p-5 pb-0 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={cn(
                              "h-11 w-11 rounded-full flex items-center justify-center border text-xl shadow-2xs shrink-0 transition-all",
                              isActive
                                ? "border-border dark:border-white/10"
                                : "bg-gray-100 text-gray-400 border-border dark:bg-zinc-800 dark:text-zinc-500"
                            )}
                            style={{
                              backgroundColor: isActive ? `${accent}14` : undefined,
                              color: isActive ? accent : undefined,
                            }}
                          >
                            <AppIcon className={cn(office.icon || " Building02Icon", "text-xl")} fallback="Building02Icon" />
                          </div>

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <h3
                                className="truncate text-base font-bold leading-tight text-gray-900 dark:text-zinc-50"
                                title={office.name}
                              >
                                {office.short_name}
                              </h3>
                              <span className="px-2 py-0.5 text-[10px] font-bold font-sans tabular-nums uppercase tracking-wider rounded-full bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400 border border-border shrink-0">
                                {office.id}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 truncate mt-0.5" title={office.name}>
                              {office.name}
                            </p>
                          </div>
                        </div>

                        {/* Status Capsule & Overflow Actions Menu */}
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <OfficeStatusBadge isActive={isActive} />
                          <OfficeActionsMenu
                            office={office}
                            onViewDetails={(currentOffice) => setSelectedOfficeIdForDetail(currentOffice.id)}
                            onConfigure={handleOpenEdit}
                            onCopyStoragePath={(currentOffice) => {
                              if (navigator?.clipboard?.writeText) {
                                navigator.clipboard.writeText(currentOffice.storage_path || `.local/storage/${currentOffice.id}`)
                                showToast("Storage path copied to clipboard")
                              }
                            }}
                            onArchive={setArchiveOfficeTarget}
                            onRestore={setRestoreOfficeTarget}
                          />
                        </div>
                      </div>

                      <CardContent className="p-5 pt-3 flex flex-col flex-1 gap-3.5">
                        <div className="space-y-3">
                          <p
                            className="w-full min-w-0 truncate text-xs leading-4 text-gray-600 dark:text-zinc-400"
                            title={office.description || "No description provided."}
                          >
                            {office.description || "No description provided."}
                          </p>

                          {/* Workstation & Storage Specs (Grouped Inset Card) */}
                          <div className="rounded-xl bg-gray-50/80 dark:bg-zinc-800/50 p-2.5 space-y-1.5 border border-border text-xs">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400 text-[11px]">
                                <ComputerIcon size="1em" className="text-xs" />
                                <span>Scanning Computer:</span>
                              </span>
                              <span className="font-semibold text-gray-900 dark:text-zinc-100 text-[11px]">
                                {office.station_name || "Unassigned"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400 text-[11px]">
                                <Folder01Icon size="1em" className="text-xs" />
                                <span>Storage Folder:</span>
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="font-sans tabular-nums text-[11px] text-gray-700 dark:text-zinc-300"
                                  title={storagePath}
                                >
                                  {formatMiddleTruncate(storagePath, 24)}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCopyStoragePath(storagePath, office.id)
                                  }}
                                  className="text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                                  title="Copy path"
                                >
                                  {copiedStorageId === office.id ? (
                                    <Tick01Icon size="1em" className="text-[11px] text-gray-700 dark:text-zinc-200" />
                                  ) : (
                                    <Copy01Icon size="1em" className="text-[11px]" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Metrics (Pill Chips, No Dotted Underlines) & Primary Action */}
                        <div className="pt-3 border-t border-border mt-auto">
                          <div className="flex items-center justify-between gap-2">
                            {/* Native HIG Metric Chips */}
                            <div className="flex min-w-0 items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.dispatchEvent(new CustomEvent("switch-view", { detail: { view: "staff", officeId: office.id } }))
                                }}
                                title="View assigned personnel in Global Directory"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 transition-all cursor-pointer border-0"
                              >
                                <UserSearch01Icon size="1em" className="text-xs text-gray-400" />
                                <span>Staff</span>
                                <span className="font-bold text-gray-900 dark:text-zinc-100">{office.staff_count || 0}</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.dispatchEvent(new CustomEvent("switch-view", { detail: { view: "modules", officeId: office.id } }))
                                }}
                                title={`Configure workspace modules for ${office.short_name}`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 transition-all cursor-pointer border-0"
                              >
                                <LayoutGridIcon size="1em" className="text-xs text-gray-400" />
                                <span>Modules</span>
                                <span className="font-bold text-gray-900 dark:text-zinc-100">{office.module_count || 0}</span>
                              </button>
                            </div>

                            {isActive ? (
                              <Button
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleOpenEdit(office)
                                }}
                                className="h-9 shrink-0"
                              >
                                Configure Department
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="success"
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setRestoreOfficeTarget(office)
                                }}
                                className="h-9 shrink-0"
                              >
                                Restore Department
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
                {statusFilter === "Active" && page === totalPages && (
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="group flex min-h-[200px] w-full cursor-pointer select-none flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border p-8 text-gray-500 shadow-2xs transition-all hover:border-gray-900/40 hover:bg-gray-100/60 hover:text-gray-950 dark:border-border dark:hover:border-white/30 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
                    aria-label="Add a department"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl shadow-2xs transition-transform group-hover:scale-110 dark:bg-zinc-800">
                      <Add01Icon size={16} aria-hidden="true" className="text-gray-500 transition-colors group-hover:text-gray-950 dark:group-hover:text-zinc-100" />
                    </span>
                    <span className="text-center">
                      <span className="block text-xs font-semibold text-gray-800 dark:text-zinc-200">Add Department</span>
                      <span className="mt-0.5 block text-[11px] text-gray-400">Create a department and set up its office and station.</span>
                    </span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Compact Table View */
            <>
              <div
                ref={tableContainerRef}
                className="flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2 select-none"
              >
                <Table columns={[{ kind: "selection" }, ...orderedVisibleColumnKeys.map((key) => {
                  if (key === "department") return { kind: "text", maxWidth: 240 }
                  if (key === "office") return { kind: "text", maxWidth: 420 }
                  if (key === "station") return { kind: "text", maxWidth: 280 }
                  if (key === "staff" || key === "modules") return { kind: "number", maxWidth: 104 }
                  if (key === "status") return { kind: "status", maxWidth: 144 }
                  if (key === "created_at" || key === "updated_at") return { kind: "date" }
                  return { kind: "text" }
                }), { kind: "actions" }]} className="min-w-[960px]">
                  <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                    <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 h-11 select-none">
                      <th className="w-12 p-4 text-center align-middle">
                        <input
                          type="checkbox"
                          className="h-4 w-4 m-0 align-middle shrink-0 cursor-pointer rounded border border-border dark:border-border"
                          checked={
                            paginatedOffices.length > 0 &&
                            paginatedOffices.every((o) => selectedIds.has(o.id))
                          }
                          onChange={(e) => toggleSelectAll(e.target.checked)}
                          disabled={paginatedOffices.length === 0}
                          aria-label="Select all departments on this page"
                        />
                      </th>
                      {visibleColumns.includes("department") && (<th className="p-4 w-[22%] whitespace-nowrap">
                        <button
                          onClick={() => handleSort("short_name")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                            sortBy === "short_name" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Department / Office{" "}
                          <SortIndicator column="short_name" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>)}
                      {visibleColumns.includes("office") && (<th className="p-4 max-w-[420px] whitespace-nowrap">
                        <button
                          onClick={() => handleSort("name")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                            sortBy === "name" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Office Name & Description{" "}
                          <SortIndicator column="name" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>)}
                      {visibleColumns.includes("station") && (<th className="p-4 max-w-[280px] whitespace-nowrap">
                        <button
                          onClick={() => handleSort("station_name")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                            sortBy === "station_name" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Workstation & Storage{" "}
                          <SortIndicator column="station_name" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>)}
                      {visibleColumns.includes("staff") && (<th className="p-4 w-[8%] text-center whitespace-nowrap">
                        <button
                          onClick={() => handleSort("staff_count")}
                          className={cn(
                            "group inline-flex items-center justify-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                            sortBy === "staff_count" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Staff{" "}
                          <SortIndicator column="staff_count" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>)}
                      {visibleColumns.includes("modules") && (<th className="p-4 w-[8%] text-center whitespace-nowrap">
                        <button
                          onClick={() => handleSort("module_count")}
                          className={cn(
                            "group inline-flex items-center justify-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                            sortBy === "module_count" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Modules{" "}
                          <SortIndicator column="module_count" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>)}
                      {visibleColumns.includes("status") && (<th className="p-4 w-[8%] whitespace-nowrap">
                        <button
                          onClick={() => handleSort("status")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                            sortBy === "status" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Status{" "}
                          <SortIndicator column="status" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>)}
                      {tableColumns.filter(({ key }) => ["created_at", "updated_at"].includes(key) && visibleColumns.includes(key)).map(({ key, label }) => (
                        <th key={key} aria-sort={sortBy === key ? (sortOrder === "ASC" ? "ascending" : "descending") : "none"}>
                          <button
                            type="button"
                            onClick={() => handleSort(key)}
                            className={cn(
                              "group inline-flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                              sortBy === key ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            {label}<SortIndicator column={key} sortBy={sortBy} sortOrder={sortOrder} />
                          </button>
                        </th>
                      ))}
                      <th className="p-4 pr-6 text-right w-20 whitespace-nowrap text-xs font-semibold text-gray-500 dark:text-zinc-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-border">
                    {groupedOffices.map((group) => <Fragment key={group.key}>
                      {group.label && <tr className="bg-gray-50/90 dark:bg-zinc-900/80"><th colSpan={orderedVisibleColumnKeys.length + 2} className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-zinc-200">{group.label}<span className="ml-2 font-sans font-normal tabular-nums text-gray-400 dark:text-zinc-500">{group.offices.length}</span></th></tr>}
                      {group.offices.map((office) => {
                        const accent = office.accent_color || "#800000"
                        const isActive = String(office.status || "").trim().toLowerCase() === "active"
                        const isSelected = selectedIds.has(office.id)
                        return (
                          <tr
                            key={office.id}
                            selected={isSelected}
                            onClick={(e) => toggleSelect(office.id, e)}
                            onDoubleClick={(e) => {
                              if (e.target.closest("button, input, a")) return
                              setSelectedOfficeIdForDetail(office.id)
                            }}
                            className={cn(
                              "group border-b-[0.5px] border-border dark:border-border last:border-b-0 hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 select-none cursor-pointer",
                              !isActive && "bg-gray-50/40 dark:bg-zinc-900/20 opacity-75",
                            )}
                          >
                            <td className="w-12 p-4 align-middle text-center border-r border-border/70 dark:border-border/70">
                              <input
                                type="checkbox"
                                className={cn(
                                  "h-4 w-4 m-0 align-middle shrink-0 cursor-pointer rounded border border-border dark:border-border transition-opacity",
                                  isSelected ? "opacity-100" : "opacity-50 group-hover:opacity-80"
                                )}
                                checked={isSelected}
                                onChange={() => { }}
                                aria-label={`Select ${office.short_name}`}
                              />
                            </td>
                            {visibleColumns.includes("department") && (<td className="p-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
                              <div
                                className="flex items-center gap-3 cursor-pointer group/dept"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedOfficeIdForDetail(office.id)
                                }}
                                title={`View details for ${office.name}`}
                              >
                                <div
                                  className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center border text-sm shadow-2xs shrink-0 transition-transform group-hover/dept:scale-105",
                                    isActive
                                      ? "rms-office-accent"
                                      : "border-black/10 bg-gray-100/80 text-[#8e8e93]"
                                  )}
                                  {...(isActive ? { "data-color": accent } : {})}
                                  style={isActive ? {
                                    color: accent,
                                    backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
                                    borderColor: `color-mix(in srgb, ${accent} 25%, transparent)`,
                                  } : undefined}
                                >
                                  <AppIcon className={office.icon || " Building02Icon"} fallback="Building02Icon" />
                                </div>
                                <div>
                                  <span className="font-semibold text-gray-900 dark:text-zinc-100 block text-[13px] leading-tight group-hover/dept:text-pup-maroon dark:group-hover/dept:text-red-400 transition-colors">
                                    {office.short_name}
                                  </span>
                                  <span className="text-[11px] font-normal text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                                    ID: {office.id}
                                  </span>
                                </div>
                              </div>
                            </td>)}

                            {visibleColumns.includes("office") && (<td className="p-4 align-middle overflow-hidden max-w-[420px] border-r border-border/70 dark:border-border/70">
                              <div className="w-full min-w-0">
                                <span className="font-medium text-gray-900 dark:text-zinc-100 block text-[13px] truncate" title={office.name}>
                                  {office.name}
                                </span>
                                <span
                                  className="mt-0.5 block min-w-0 truncate text-[11px] font-normal text-gray-500 dark:text-zinc-400"
                                  style={{ width: "100%", maxWidth: 415 }}
                                  title={office.description || "No description provided."}
                                >
                                  {office.description || "No description provided."}
                                </span>
                              </div>
                            </td>)}

                            {visibleColumns.includes("station") && (<td className="p-4 align-middle max-w-[280px] whitespace-nowrap overflow-hidden border-r border-border/70 dark:border-border/70">
                              <div className="space-y-0.5">
                                <div className="flex min-w-0 items-center gap-1.5 text-xs text-gray-700 dark:text-zinc-300 font-medium">
                                  <ComputerIcon size="1em" className="text-gray-400 dark:text-zinc-500 text-xs shrink-0"></ComputerIcon>
                                  <span className="min-w-0 truncate">{office.station_name || "Unassigned"}</span>
                                </div>
                                <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-normal text-gray-500 dark:text-zinc-400 font-sans tabular-nums">
                                  <span className="min-w-0 truncate" title={office.storage_path || `.local/storage/${office.id}`}>
                                    {office.storage_path || `.local/storage/${office.id}`}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleCopyStoragePath(office.storage_path || `.local/storage/${office.id}`, office.id)
                                    }}
                                    className="text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                                    title="Copy storage path"
                                  >
                                    {copiedStorageId === office.id ? (
                                      <Tick01Icon size="1em" className="text-[11px] text-gray-700 dark:text-zinc-200" />
                                    ) : (
                                      <Copy01Icon size="1em" className="text-[11px]" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </td>)}

                            {visibleColumns.includes("staff") && (<td className="p-4 align-middle text-center whitespace-nowrap border-r border-border/70 dark:border-border/70">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.dispatchEvent(new CustomEvent("switch-view", { detail: { view: "staff", officeId: office.id } }))
                                }}
                                title="View assigned personnel in Global Directory"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 transition-colors font-semibold text-xs cursor-pointer border-0"
                              >
                                <UserSearch01Icon size="1em" className="text-xs text-gray-500"></UserSearch01Icon>
                                <span>{office.staff_count || 0}</span>
                              </button>
                            </td>)}

                            {visibleColumns.includes("modules") && (<td className="p-4 align-middle text-center whitespace-nowrap border-r border-border/70 dark:border-border/70">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.dispatchEvent(new CustomEvent("switch-view", { detail: { view: "modules", officeId: office.id } }))
                                }}
                                title={`Configure workspace modules for ${office.short_name}`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 transition-colors font-semibold text-xs cursor-pointer border-0"
                              >
                                <LayoutGridIcon size="1em" className="text-xs text-gray-500"></LayoutGridIcon>
                                <span>{office.module_count || 0}</span>
                              </button>
                            </td>)}

                            {visibleColumns.includes("status") && (
                              <td className="p-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
                                <OfficeStatusBadge isActive={isActive} />
                              </td>
                            )}

                            {["created_at", "updated_at"].filter((key) => visibleColumns.includes(key)).map((key) => (
                              <td key={key} className="p-4 align-middle whitespace-nowrap text-xs font-normal text-gray-600 dark:text-zinc-300 tabular-nums">
                                {office[key] ? formatPHDateTime(office[key]) : "N/A"}
                              </td>
                            ))}
                            <td className="p-4 align-middle text-center whitespace-nowrap">
                              <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                                <OfficeActionsMenu
                                  office={office}
                                  triggerVariant="table"
                                  onViewDetails={(currentOffice) => setSelectedOfficeIdForDetail(currentOffice.id)}
                                  onConfigure={handleOpenEdit}
                                  onCopyStoragePath={(currentOffice) => {
                                    if (navigator?.clipboard?.writeText) {
                                      navigator.clipboard.writeText(currentOffice.storage_path || `.local/storage/${currentOffice.id}`)
                                      showToast("Storage path copied to clipboard")
                                    }
                                  }}
                                  onArchive={setArchiveOfficeTarget}
                                  onRestore={setRestoreOfficeTarget}
                                />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </Fragment>)}
                  </tbody>
                </Table>
              </div>

              {/* Pagination Footer */}
              <TablePagination label="Office directory pages" page={page} pageSize={pageSize} totalCount={filteredOffices.length} displayedCount={paginatedOffices.length} onPageChange={updatePage} onPageSizeChange={setPageSize} />
            </>
          )}
        </div>
      </Card>

      {/* Create / Edit Dialog - Wide & Spacious Layout with Collapsible Accordion */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-full max-w-4xl sm:max-w-4xl rounded-2xl bg-white border border-border dark:bg-zinc-900 dark:border-border p-0 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Header: Clean title without icon as requested */}
            <DialogHeader className="p-6 sm:px-8 pt-6 pb-0 text-left shrink-0">
              <DialogTitle>
                {isEditing ? "Edit Department Details" : "Add New Department"}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Set up department identity, scanning computer, and enabled services.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 min-h-0">
              {/* Row 1: Editable Department Names (Acronym & Full Name) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Department Acronym / Short Name
                  </label>
                  <Input
                    value={form.short_name}
                    onChange={(e) => {
                      const val = e.target.value
                      setForm(prev => {
                        const next = { ...prev, short_name: val }
                        if (!isEditing) {
                          const generatedId = val
                            .toLowerCase()
                            .trimStart()
                            .replace(/[\s_]+/g, "-")
                            .replace(/[^a-z0-9-]/g, "")
                            .replace(/^-+|-+$/g, "")
                            .replace(/-+/g, "-")
                            .slice(0, 24)
                          next.id = generatedId
                          next.adminEmail = generatedId ? `admin.${generatedId}@pup.local` : ""
                        }
                        return next
                      })
                    }}
                    placeholder="e.g. Registrar, OSAS, Library"
                    className="h-10 rounded-xl bg-white border border-border text-xs focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 dark:bg-zinc-950 dark:border-border dark:text-white transition-all"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Full Name of the Department
                  </label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Office of the University Library Services"
                    className="h-10 rounded-xl bg-white border border-border text-xs focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 dark:bg-zinc-950 dark:border-border dark:text-white transition-all"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Description */}
              <div>
                <label htmlFor="office-description" className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                  Description <span className="text-gray-400 dark:text-zinc-500 font-normal">(Optional)</span>
                </label>
                <Textarea
                  id="office-description"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the department's institutional role and functions..."
                  className="w-full min-h-[72px] resize-y rounded-xl border border-border bg-white px-3.5 py-2.5 text-xs font-normal placeholder:text-gray-400 dark:border-border dark:bg-card focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                />
              </div>

              {/* Row 3: System-Generated Identifiers & Default Admin Provisioning (Grouped Read-Only Section) */}
              <div className="p-4 sm:p-5 rounded-2xl border border-border dark:border-border bg-gray-50/50 dark:bg-zinc-950/40 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                    {isEditing ? "System Identifier" : "System-Generated Identifiers & Default Admin"}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/40">
                    {isEditing ? "Read-only" : "Auto-assigned"}
                  </span>
                </div>

                <div className={cn("grid grid-cols-1 gap-3.5", !isEditing ? "sm:grid-cols-3" : "sm:grid-cols-1")}>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">
                      Department Code / ID
                    </label>
                    <div className="flex h-10 items-center justify-between rounded-xl border border-border bg-white/80 px-3.5 text-xs text-gray-700 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-300 shadow-2xs select-none">
                      <span className="font-sans tabular-nums text-xs font-semibold tracking-wide truncate">
                        {form.id || "office-[auto]"}
                      </span>
                    </div>
                  </div>

                  {!isEditing && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">
                          Default Admin ID
                        </label>
                        <div className="flex h-10 items-center justify-between rounded-xl border border-border bg-white/80 px-3.5 text-xs text-gray-700 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-300 shadow-2xs select-none">
                          <span className="font-sans tabular-nums text-xs font-semibold tracking-wide truncate">
                            PUP{(form.id || "OFFICE").trim().toUpperCase()}-001
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">
                          Department Administrator Email
                        </label>
                        <div className="flex h-10 items-center justify-between rounded-xl border border-border bg-white/80 px-3.5 text-xs text-gray-700 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-300 shadow-2xs select-none">
                          <span className="font-sans tabular-nums text-xs font-semibold tracking-wide truncate">
                            {form.adminEmail || `admin.${form.id || "[office]"}@pup.local`}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Row 3: Scanning workstation and fixed local folders */}
              <div className="p-4 sm:p-5 rounded-2xl border border-border dark:border-border bg-gray-50/50 dark:bg-zinc-950/40 space-y-3.5">
                <div className="flex items-center justify-between pb-2.5 border-b border-border dark:border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-pup-maroon/10 text-pup-maroon dark:bg-white/10 dark:text-zinc-100 flex items-center justify-center text-sm">
                      <ComputerIcon size={16}  ></ComputerIcon>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-gray-900 dark:text-zinc-50">
                        Scanning Workstation
                      </h5>
                      <p className="text-[11px] text-gray-900 dark:text-zinc-300">
                        Set a station name and configure its scanner to save into this department&apos;s inbound folder.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Workstation Name <span className="text-gray-400 dark:text-zinc-500 font-normal">(Optional)</span>
                  </label>
                  <Input
                    value={form.station_name}
                    onChange={(e) => setForm(prev => ({ ...prev, station_name: e.target.value }))}
                    placeholder="e.g. Registrar Archive PC (leave blank to assign automatically)"
                    className="h-10 rounded-xl bg-white border border-border text-xs focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 dark:bg-zinc-950 dark:border-border dark:text-white transition-all"
                  />
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1 block">
                    This name appears on staff pages and activity history. Storage locations are set up automatically.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border dark:border-border">
                  <div>
                    <span className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">Document Storage</span>
                    <div className="min-h-10 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-900 px-3 py-2 text-[11px] text-gray-700 dark:text-zinc-200 break-all select-text">
                      {isEditing ? form.storage_path : `${storageRoot}/storage/${form.id || "office-id"}/uploads`}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 block">Records stay in this department&apos;s local folder.</span>
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">Scanner Inbound</span>
                    <div className="min-h-10 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-900 px-3 py-2 text-[11px] text-gray-700 dark:text-zinc-200 break-all select-text">
                      {isEditing ? form.inbound_path : `${scannerHostRoot}/${form.id || "office-id"}/INBOUND`}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      Set this as the output folder in the scanner profile. Each department needs its own destination.
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 4: Module Scope Section with Collapsible Accordion (Create View) / Workspace Modules Configured (Edit View) */}
              <div className="space-y-2 pt-1 border-t border-border dark:border-border">
                {!isEditing ? (
                  <div className="border border-border dark:border-border rounded-2xl overflow-hidden bg-gray-50/50 dark:bg-zinc-950/40 transition-all">
                    <button
                      type="button"
                      onClick={() => setModulesAccordionOpen(prev => !prev)}
                      className="w-full flex items-center justify-between p-3.5 hover:bg-gray-100/60 dark:hover:bg-zinc-900/60 transition-colors cursor-pointer text-left select-none border-0 outline-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-pup-maroon/10 text-pup-maroon dark:bg-white/10 dark:text-zinc-100 flex items-center justify-center shrink-0">
                          <AppIcon className=" LayoutGridIcon text-base"></AppIcon>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900 dark:text-zinc-100">
                              Assign Default Modules
                            </span>
                            <Badge className="text-[10px] px-2 py-0.2 rounded-full bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-0 font-medium">
                              {enabledCount} of {availableModules.length} enabled
                            </Badge>
                          </div>
                          <span className="text-[11px] text-gray-400 dark:text-zinc-500 block mt-0.5">
                            Click to customize initial workspace modules (Standard default catalog only)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-gray-400 dark:text-zinc-500">
                          {modulesAccordionOpen ? "Collapse" : "Expand"}
                        </span>
                        <AppIcon className={cn(
                          " ArrowDown01Icon text-gray-400 text-sm transition-transform duration-200",
                          modulesAccordionOpen && "rotate-180 text-pup-maroon dark:text-red-400"
                        )}></AppIcon>
                      </div>
                    </button>

                    {/* Accordion Content */}
                    <AnimatePresence initial={false}>
                      {modulesAccordionOpen && (
                        <motion.div
                          initial={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.22, ease: EASE_OUT }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 border-t border-border dark:border-border bg-white/70 dark:bg-zinc-950/70 space-y-3">
                        <div className="flex items-center justify-between text-[11px] text-gray-900 dark:text-zinc-300 pb-1">
                          <span>Select which standard modules should be enabled for this department:</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setForm(prev => ({ ...prev, selectedModules: availableModules.map(m => m.id) }))}
                              title="Select All"
                              className="text-[10px] font-bold text-pup-maroon hover:underline dark:text-red-400 cursor-pointer"
                            >
                              Select
                            </button>
                            <span>·</span>
                            <button
                              type="button"
                              onClick={() => setForm(prev => ({ ...prev, selectedModules: availableModules.filter(m => m.is_system).map(m => m.id) }))}
                              className="text-[10px] font-bold text-gray-500 hover:underline dark:text-zinc-400 cursor-pointer"
                            >
                              System Only
                            </button>
                          </div>
                        </div>

                        {/* 2-column grid of modules */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                          {availableModules.map((mod) => {
                            const isSystem = mod.is_system;
                            const isChecked = isSystem || form.selectedModules.includes(mod.id);

                            return (
                              <label
                                key={mod.id}
                                className={cn(
                                  "flex items-start gap-2.5 p-2.5 rounded-xl text-xs transition-all border select-none",
                                  isChecked
                                    ? "border-gray-950 dark:border-white bg-gray-100/80 dark:bg-zinc-800 text-gray-950 dark:text-zinc-50 shadow-xs ring-1 ring-black/10 dark:ring-white/20"
                                    : "border-border bg-white dark:border-border dark:bg-zinc-900/40",
                                  isSystem ? "opacity-80 cursor-default" : "hover:bg-gray-50 dark:hover:bg-zinc-800/60 cursor-pointer"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={isSystem}
                                  onChange={() => handleModuleToggle(mod.id)}
                                  className="mt-0.5 rounded accent-gray-950 dark:accent-zinc-100 focus:ring-gray-950 dark:focus:ring-zinc-100 h-3.5 w-3.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-gray-900 dark:text-zinc-100 truncate text-[11.5px]">
                                      {mod.name}
                                    </span>
                                    {isSystem && (
                                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 shrink-0">
                                        System
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-gray-400 dark:text-zinc-500 block truncate">
                                    {mod.category === "admin" ? "Admin Operation" : "Staff Workspace"}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>

                        <div className="text-[10px] text-gray-400 dark:text-zinc-500 italic pt-1 border-t border-border dark:border-border">
                          * Note: Departments only use this standardized system catalog. Custom modules cannot be created per department.
                        </div>
                          </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl border border-border dark:border-border bg-gray-50/80 dark:bg-zinc-950/40 text-xs text-gray-600 dark:text-zinc-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-pup-maroon/10 text-pup-maroon dark:bg-white/10 dark:text-zinc-100 flex items-center justify-center shrink-0">
                        <AppIcon className=" LayoutGridIcon text-base"></AppIcon>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900 dark:text-zinc-100 block leading-tight">
                          Workspace Modules Configured
                        </span>
                        <span className="text-[11px] text-gray-900 dark:text-zinc-300">
                          System features are managed centrally in Compare Features. Save any changes here before navigating away.
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setConfirmMatrixLeaveOpen(true)}
                      title="Compare features across departments"
                      className="h-8 px-3.5 flex items-center justify-center shrink-0 self-start"
                    >
                      Compare Features
                    </Button>
                  </div>
                )}
              </div>

              {/* Row 5: Expanded Department Icon Section */}
              <div className="space-y-2 pt-1 border-t border-border dark:border-border">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                    Department Icon
                  </label>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500">{PRESET_ICONS.length} icons available</span>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl border border-border dark:border-border bg-gray-50/50 dark:bg-zinc-950/40">
                  <div className="grid grid-cols-6 sm:grid-cols-12 gap-2.5 sm:gap-3">
                    {PRESET_ICONS.map((opt) => {
                      const selected = iconKey(form.icon) === iconKey(opt.value)
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          title={opt.label}
                          onClick={() => setForm(prev => ({ ...prev, icon: opt.value }))}
                          className={cn(
                            "h-10 w-full flex items-center justify-center rounded-xl border text-lg transition-all cursor-pointer",
                            selected
                              ? "border-gray-950 dark:border-white bg-gray-100/80 dark:bg-zinc-800 text-gray-950 dark:text-zinc-50 shadow-xs ring-1 ring-black/10 dark:ring-white/20"
                              : "border-border bg-white text-gray-600 hover:border-border hover:bg-gray-100 dark:border-border dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-2xs"
                          )}
                        >
                          <AppIcon className={opt.value}></AppIcon>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Row 6: Branding Theme Colors */}
              <div className="space-y-2 pt-1 border-t border-border dark:border-border">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                    Branding Theme Color
                  </label>
                  <span className="font-sans tabular-nums text-[11px] font-medium text-gray-400 dark:text-zinc-500">
                    {form.accent_color}
                  </span>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl border border-border dark:border-border bg-gray-50/50 dark:bg-zinc-950/40 space-y-4">
                  <ColorSelector
                    label={null}
                    value={form.accent_color}
                    onChange={(hex) => setForm((prev) => ({ ...prev, accent_color: hex }))}
                    presets={OFFICE_COLOR_PRESETS}
                    columns={12}
                    showCustom
                    showHexInput
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 pt-0 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="h-10 px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitLoading}
                className="h-10 px-5 cursor-pointer"
              >
                {submitLoading ? "Saving..." : isEditing ? "Save Changes" : "Create Department"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Navigate to Matrix Confirmation Modal (Safeguard against unsaved edits) */}
      <ConfirmModal
        open={confirmMatrixLeaveOpen}
        onCancel={() => setConfirmMatrixLeaveOpen(false)}
        onConfirm={() => {
          setConfirmMatrixLeaveOpen(false)
          setDialogOpen(false)
          const targetOfficeId = form.id || selectedOfficeId
          if (typeof onSwitchTab === "function") {
            onSwitchTab("modules", targetOfficeId)
          }
          window.dispatchEvent(
            new CustomEvent("switch-view", {
              detail: {
                view: "modules",
                officeId: targetOfficeId,
                viewMode: "office",
              },
            })
          )
        }}
        title="Discard Unsaved Changes?"
        message="Opening Compare Features will close this dialog and discard any unsaved changes to this department. Do you want to continue?"
        confirmLabel="Discard Changes"
        cancelLabel="Cancel"
        variant="warning"
        isUnsavedChangesModal={true}
      />

      {/* Archive Confirmation Modal */}
      <ConfirmModal
        open={!!archiveOfficeTarget}
        onCancel={() => setArchiveOfficeTarget(null)}
        onConfirm={confirmArchiveOffice}
        isLoading={isArchiving}
        title="Archive Department"
        message={`Are you sure you want to archive ${archiveOfficeTarget?.name || "this department"}? Staff members assigned to this department will not have access until it is restored.`}
        confirmLabel="Archive Department"
        variant="warning"
        isAppleStyled={true}
        isPersonnelModal={true}
        isArchiveModal={true}
        selectedItems={archiveOfficeTarget ? [`${archiveOfficeTarget.short_name} (${archiveOfficeTarget.id}): ${archiveOfficeTarget.staff_count || 0} Staff assigned`] : []}
      />

      {/* Restore Confirmation Modal */}
      <ConfirmModal
        open={!!restoreOfficeTarget}
        onCancel={() => setRestoreOfficeTarget(null)}
        onConfirm={confirmRestoreOffice}
        isLoading={isRestoring}
        title="Restore Department"
        message={`Are you sure you want to restore ${restoreOfficeTarget?.name || "this department"}? Assigned staff members will regain access to their department workspace.`}
        confirmLabel="Restore Department"
        variant="success"
        isAppleStyled={true}
        isPersonnelModal={true}
        isRestoreModal={true}
        selectedItems={restoreOfficeTarget ? [`${restoreOfficeTarget.short_name} (${restoreOfficeTarget.id}): ${restoreOfficeTarget.staff_count || 0} Staff assigned`] : []}
      />

      {/* Batch Archive Confirmation Modal */}
      <ConfirmModal
        open={bulkArchiveOpen}
        onCancel={() => setBulkArchiveOpen(false)}
        onConfirm={confirmBulkArchive}
        isLoading={bulkArchiveLoading}
        title="Batch Archive Departments"
        message={`${selectedIds.size} department(s) will be archived. Staff members assigned to these departments will not have access until they are restored.`}
        confirmLabel="Archive Selected"
        variant="warning"
        isAppleStyled={true}
        isPersonnelModal={true}
        isArchiveModal={true}
        selectedItems={Array.from(selectedIds).map((id) => {
          const o = offices.find((x) => x.id === id)
          return o ? `${o.short_name} (${o.id}): ${o.staff_count || 0} Staff assigned` : id
        })}
      />

      {/* Batch Restore Confirmation Modal */}
      <ConfirmModal
        open={bulkRestoreOpen}
        onCancel={() => setBulkRestoreOpen(false)}
        onConfirm={confirmBulkRestore}
        isLoading={bulkRestoreLoading}
        title="Batch Restore Departments"
        message={`${selectedIds.size} department(s) will be reactivated. Assigned staff members will regain access to their department workspace.`}
        confirmLabel="Restore Selected"
        variant="success"
        isAppleStyled={true}
        isPersonnelModal={true}
        isRestoreModal={true}
        selectedItems={Array.from(selectedIds).map((id) => {
          const o = offices.find((x) => x.id === id)
          return o ? `${o.short_name} (${o.id}): ${o.staff_count || 0} Staff assigned` : id
        })}
      />

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedCount={selectedIds.size}
        entityName="department"
        onCancel={() => setSelectedIds(new Set())}
        primaryAction={{
          label: statusFilter === "Active" ? "Archive Departments" : "Restore Departments",
          variant: statusFilter === "Active" ? "danger" : "success",
          onClick: () => {
            if (statusFilter === "Active") {
              setBulkArchiveOpen(true)
            } else {
              setBulkRestoreOpen(true)
            }
          },
        }}
        secondaryActions={[
          {
            label: "Copy Codes",
            copiedLabel: "Codes Copied!",
            onClick: handleCopyCodes,
          },
        ]}
      />

      {/* Office Detail Sheet Drawer */}
      <OfficeDetailSheet
        open={Boolean(selectedOfficeForDetail)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelectedOfficeIdForDetail(null)
        }}
        office={selectedOfficeForDetail}
        onClose={() => setSelectedOfficeIdForDetail(null)}
        onConfigure={(office) => handleOpenEdit(office)}
        onRestore={(office) => setRestoreOfficeTarget(office)}
        onArchive={(office) => setArchiveOfficeTarget(office)}
        currentIndex={currentDetailIndex}
        totalCount={totalOfficeCount}
        onNavigatePrev={handleNavigatePrevDetail}
        onNavigateNext={handleNavigateNextDetail}
        showToast={showToast}
      />
    </div>
  )
}
