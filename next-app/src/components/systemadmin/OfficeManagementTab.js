"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import PageHeader from "@/components/shared/PageHeader"
import ConfirmModal from "@/components/shared/ConfirmModal"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"

// Expanded predefined icon palette so SuperAdmins have rich choices for campus offices
const PRESET_ICONS = [
  { value: "ti ti-building", label: "Building" },
  { value: "ti ti-landmark", label: "Institution" },
  { value: "ti ti-school", label: "College" },
  { value: "ti ti-graduation-cap", label: "Graduation" },
  { value: "ti ti-badge-check", label: "Registrar" },
  { value: "ti ti-scroll", label: "Diploma" },
  { value: "ti ti-scroll-text", label: "Credentials" },
  { value: "ti ti-award", label: "Honors" },
  { value: "ti ti-shield-check", label: "Clearance" },
  { value: "ti ti-users", label: "Personnel" },
  { value: "ti ti-user-check", label: "Admissions" },
  { value: "ti ti-user", label: "Student Affairs" },
  { value: "ti ti-clipboard-list", label: "Records" },
  { value: "ti ti-clipboard-check", label: "Evaluations" },
  { value: "ti ti-file-text", label: "Documents" },
  { value: "ti ti-folder", label: "Folders" },
  { value: "ti ti-folder-archive", label: "Archive Folder" },
  { value: "ti ti-archive", label: "Archives" },
  { value: "ti ti-book", label: "Library" },
  { value: "ti ti-book-open", label: "Textbooks" },
  { value: "ti ti-library", label: "Catalog" },
  { value: "ti ti-calendar", label: "Schedules" },
  { value: "ti ti-mail", label: "Communications" },
  { value: "ti ti-banknote", label: "Accounting" },
  { value: "ti ti-wallet", label: "Cashier" },
  { value: "ti ti-credit-card", label: "Finance" },
  { value: "ti ti-calculator", label: "Budget" },
  { value: "ti ti-stethoscope", label: "Clinic" },
  { value: "ti ti-heart-pulse", label: "Health Services" },
  { value: "ti ti-flask-conical", label: "Laboratory" },
  { value: "ti ti-database", label: "IT & Systems" },
  { value: "ti ti-server", label: "Infrastructure" },
  { value: "ti ti-laptop", label: "Computing" },
  { value: "ti ti-briefcase", label: "Career & Placement" },
  { value: "ti ti-message-square", label: "Guidance & Counseling" },
]

// Expanded institutional branding colors palette
const PRESET_COLORS = [
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
    return <i className="ph-bold ph-caret-up-down ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"></i>
  }
  return sortOrder === "ASC" ? (
    <i className="ph-bold ph-caret-up ml-1 text-[12px] text-gray-400"></i>
  ) : (
    <i className="ph-bold ph-caret-down ml-1 text-[12px] text-gray-400"></i>
  )
}

export default function OfficeManagementTab({ showToast }) {
  const [offices, setOffices] = useState([])
  const [availableModules, setAvailableModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("Active")
  const [selectedKpi, setSelectedKpi] = useState(null)
  const [deactivateOfficeTarget, setDeactivateOfficeTarget] = useState(null)
  const [isDeactivating, setIsDeactivating] = useState(false)
  const [activateOfficeTarget, setActivateOfficeTarget] = useState(null)
  const [isActivating, setIsActivating] = useState(false)
  const [copiedTokenId, setCopiedTokenId] = useState(null)
  const [revealedTokens, setRevealedTokens] = useState({})
  const [showModalToken, setShowModalToken] = useState(false)
  const [hasManuallyEditedId, setHasManuallyEditedId] = useState(false)
  const [layoutView, setLayoutView] = useState("grid")
  
  // Table Sorting state
  const [sortBy, setSortBy] = useState("short_name")
  const [sortOrder, setSortOrder] = useState("ASC")

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"))
    } else {
      setSortBy(column)
      setSortOrder("ASC")
    }
  }

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

  // Form State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedOfficeId, setSelectedOfficeId] = useState(null)
  const [showCustomIcon, setShowCustomIcon] = useState(false)
  const [modulesAccordionOpen, setModulesAccordionOpen] = useState(false)

  const [form, setForm] = useState({
    id: "",
    name: "",
    short_name: "",
    description: "",
    icon: "ph-bold ph-building",
    accent_color: "#800000",
    status: "Active",
    station_name: "",
    storage_path: "",
    inbound_path: "",
    scanner_model: "",
    ingest_token: "",
    selectedModules: [],
  })

  const [submitLoading, setSubmitLoading] = useState(false)

  const fetchOffices = useCallback(async () => {
    try {
      const res = await fetch("/api/offices?stats=true")
      const json = await res.json()
      if (res.ok && json.ok) {
        setOffices(json.data)
      } else {
        showToast(json.error || "Failed to fetch offices", true)
      }
    } catch (err) {
      showToast("Network error fetching offices", true)
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const fetchModules = useCallback(async () => {
    try {
      const res = await fetch("/api/modules")
      const json = await res.json()
      if (res.ok && json.ok) {
        setAvailableModules(json.data || [])
      }
    } catch (err) {
      console.error("Failed to fetch available modules", err)
    }
  }, [])

  useEffect(() => {
    fetchOffices()
    fetchModules()
  }, [fetchOffices, fetchModules])

  const handleOpenCreate = () => {
    setIsEditing(false)
    setSelectedOfficeId(null)
    setShowCustomIcon(false)
    setModulesAccordionOpen(false)
    setHasManuallyEditedId(false)
    setShowModalToken(false)
    const defaultSelected = availableModules.map(m => m.id)
    setForm({
      id: "",
      name: "",
      short_name: "",
      description: "",
      icon: "ph-bold ph-building",
      accent_color: "#800000",
      status: "Active",
      station_name: "",
      storage_path: "",
      inbound_path: "",
      scanner_model: "Fujitsu fi-7160 Batch Scanner",
      ingest_token: `station_token_${Math.random().toString(36).substring(2, 10)}`,
      selectedModules: defaultSelected,
    })
    setDialogOpen(true)
  }

  const handleOpenEdit = (office) => {
    if (office.status !== "Active") return
    setIsEditing(true)
    setHasManuallyEditedId(true)
    setShowModalToken(false)
    setSelectedOfficeId(office.id)
    const icon = office.icon || "ph-bold ph-building"
    setShowCustomIcon(!PRESET_ICONS.some(p => p.value === icon))
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
      inbound_path: office.inbound_path || "",
      scanner_model: office.scanner_model || "",
      ingest_token: office.ingest_token || "",
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
    if (!cleanId || !form.name.trim() || !form.short_name.trim()) {
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
        storage_path: form.storage_path.trim() || undefined,
        inbound_path: form.inbound_path.trim() || undefined,
        scanner_model: form.scanner_model.trim() || undefined,
        ingest_token: form.ingest_token.trim() || undefined,
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
        } else if (json.admin && json.admin.created) {
          showToast(
            `Office created with default modules. Default admin ${json.admin.id} (password: ${json.admin.defaultPassword}) — change on first login.`
          )
        } else {
          showToast("Office created successfully")
        }
        setDialogOpen(false)
        fetchOffices()
      } else {
        showToast(json.error || "Failed to save office", true)
      }
    } catch (err) {
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
        showToast(`Office set to ${nextStatus}`)
        fetchOffices()
      } else {
        showToast(json.error || "Failed to toggle status", true)
      }
    } catch (err) {
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
    return {
      total,
      active,
      inactive,
      totalStaff,
      avgModules,
    }
  }, [offices])

  const confirmDeactivateOffice = async () => {
    if (!deactivateOfficeTarget) return
    setIsDeactivating(true)
    try {
      await handleToggleStatus(deactivateOfficeTarget)
      setDeactivateOfficeTarget(null)
    } finally {
      setIsDeactivating(false)
    }
  }

  const confirmActivateOffice = async () => {
    if (!activateOfficeTarget) return
    setIsActivating(true)
    try {
      await handleToggleStatus(activateOfficeTarget)
      setActivateOfficeTarget(null)
    } finally {
      setIsActivating(false)
    }
  }

  const filteredOffices = useMemo(() => {
    return offices.filter((o) => {
      const matchesSearch =
        o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.short_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase())
      const isArchived = o.status !== "Active"
      const matchesTab = statusFilter === "Active" ? !isArchived : isArchived
      return matchesSearch && matchesTab
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
      }

      if (valA < valB) return sortOrder === "ASC" ? -1 : 1
      if (valA > valB) return sortOrder === "ASC" ? 1 : -1
      return 0
    })

    return list
  }, [offices, searchQuery, statusFilter, sortBy, sortOrder])

  const hasActiveFilters = searchQuery !== ""

  const handleClearFilters = () => {
    setSearchQuery("")
  }

  const statCardsData = [
    {
      key: "total",
      label: "Campus Offices",
      value: stats.total,
      sublabel: `${stats.active} active offices`,
      color: "blue",
      shape1: "from-[#0055FF]/40 to-[#007AFF]/0",
      shape2: "from-[#14C8FF]/30 to-[#007AFF]/0",
      bg: "from-[#14C8FF] via-[#007AFF] to-[#0055FF] dark:from-[#007AFF] dark:to-[#0033aa]",
      glass: "glass-stat-card-blue",
    },
    {
      key: "active",
      label: "Active Departments",
      value: stats.active,
      sublabel: `${stats.inactive} archived or inactive`,
      color: "emerald",
      shape1: "from-[#047857]/40 to-[#059669]/0",
      shape2: "from-[#34d399]/30 to-[#059669]/0",
      bg: "from-[#34d399] via-[#059669] to-[#047857] dark:from-[#059669] dark:to-[#024e37]",
      glass: "glass-stat-card-green",
    },
    {
      key: "staff",
      label: "Total Staff",
      value: stats.totalStaff,
      sublabel: `${stats.avgModules} avg modules per office`,
      color: "amber",
      shape1: "from-[#b45309]/40 to-[#d97706]/0",
      shape2: "from-[#fbbf24]/30 to-[#d97706]/0",
      bg: "from-[#fbbf24] via-[#d97706] to-[#b45309] dark:from-[#d97706] dark:to-[#78350f]",
      glass: "glass-stat-card-orange",
    },
  ]

  const enabledCount = useMemo(() => {
    const sysCount = availableModules.filter(m => m.is_system).length
    const customCount = form.selectedModules.filter(id => !availableModules.find(m => m.id === id)?.is_system).length
    return Math.min(availableModules.length, sysCount + customCount)
  }, [availableModules, form.selectedModules])

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
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Total Offices</span>
                        <span className="text-lg font-black">{stats.total}</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Avg Modules</span>
                        <span className="text-lg font-black">{stats.avgModules}</span>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-xs text-white/90 leading-relaxed">
                      Administrative and academic offices operating across campus with role-based access.
                    </div>
                  </div>
                )}
                {stat.key === "active" && (
                  <div className="space-y-3 text-white">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter("Active")
                          setSelectedKpi(null)
                        }}
                        className="bg-white/10 hover:bg-white/20 transition-all p-2.5 rounded-lg text-left cursor-pointer border-0 w-full active:scale-95"
                      >
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Active Offices ↗</span>
                        <span className="text-lg font-black">{stats.active}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter("Inactive")
                          setSelectedKpi(null)
                        }}
                        className="bg-white/10 hover:bg-white/20 transition-all p-2.5 rounded-lg text-left cursor-pointer border-0 w-full active:scale-95"
                      >
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Archived Offices ↗</span>
                        <span className="text-lg font-black">{stats.inactive}</span>
                      </button>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-xs text-white/90 leading-relaxed">
                      Click either box above to quickly filter the list.
                    </div>
                  </div>
                )}
                {stat.key === "staff" && (
                  <div className="space-y-3 text-white">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent("switch-view", { detail: { view: "staff" } }))}
                        className="bg-white/10 hover:bg-white/20 transition-all p-2.5 rounded-lg text-left cursor-pointer border-0 w-full active:scale-95"
                      >
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Total Staff ↗</span>
                        <span className="text-lg font-black">{stats.totalStaff}</span>
                      </button>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Avg Staff/Office</span>
                        <span className="text-lg font-black">{stats.total > 0 ? (stats.totalStaff / stats.total).toFixed(1) : 0}</span>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-xs text-white/90 leading-relaxed">
                      Click Total Staff to view all personnel across all offices in the Global Directory.
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Card with Header, Active Filter Chips & Toolbar */}
      <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none overflow-hidden">
        <PageHeader
          icon="ph-bold ph-buildings"
          title={
            <div className="flex items-center gap-[6px]">
              <span>Departments & Offices</span>
              {statusFilter === "Inactive" && (
                <span className="text-[12px] font-normal text-emerald-600 dark:text-emerald-400">
                  · Restore Mode
                </span>
              )}
            </div>
          }
          description="Manage campus offices, link scanning computers, and configure departmental storage folders."
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <Button
              onClick={handleOpenCreate}
              className="flex h-10 items-center justify-center rounded-xl! btn-brand-red text-white font-semibold text-xs active:scale-95 transition-all cursor-pointer px-5 shadow-xs"
            >
              <i className="ph-bold ph-plus mr-1.5 text-[14px]"></i>
              Add Department
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
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 w-full select-none">
            {/* Left: Active vs Archived Underline Tabs */}
            <div className="flex items-center gap-6 shrink-0 h-10 px-1 self-start lg:self-auto">
              <button
                type="button"
                onClick={() => setStatusFilter("Active")}
                className={cn(
                  "relative h-full flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
                  statusFilter === "Active"
                    ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                    : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
                )}
              >
                Active ({stats.active})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("Inactive")}
                className={cn(
                  "relative h-full flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
                  statusFilter === "Inactive"
                    ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                    : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
                )}
              >
                Archived ({stats.inactive})
              </button>
            </div>

            {/* Right: Search Input & View Switcher Group */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full lg:w-auto">
              {/* Search Input with increased width */}
              <div className="w-full sm:w-[360px] lg:w-[420px] relative group shrink-0">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <i className="ph-bold ph-magnifying-glass text-gray-400 transition-colors group-focus-within:text-pup-maroon dark:text-zinc-500 text-sm"></i>
                </div>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search offices by name, acronym, ID..."
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-24 text-xs font-normal placeholder:text-gray-400 dark:border-white/10 dark:bg-card focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5"
                />
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                  {filteredOffices.length > 0 ? `${filteredOffices.length} results` : "0 results"}
                </div>
              </div>

              {/* View Switcher: Grid vs Table */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-800/80 p-1 rounded-xl shrink-0 border border-gray-200/60 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setLayoutView("grid")}
                  title="Grid Card View"
                  className={cn(
                    "h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer border-0",
                    layoutView === "grid"
                      ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-50 shadow-2xs"
                      : "text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200 bg-transparent"
                  )}
                >
                  <i className="ph-bold ph-squares-four text-sm"></i>
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutView("table")}
                  title="Compact Table View"
                  className={cn(
                    "h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer border-0",
                    layoutView === "table"
                      ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-50 shadow-2xs"
                      : "text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200 bg-transparent"
                  )}
                >
                  <i className="ph-bold ph-list-dashes text-sm"></i>
                  <span className="hidden sm:inline">Table</span>
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offices Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <Card key={n} className="overflow-hidden border border-gray-200/50 dark:border-white/5 bg-white/50 dark:bg-zinc-900/50">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-24 rounded-md" />
                <Skeleton className="h-4 w-48 rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredOffices.length === 0 ? (
        <div className="flex h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-white/40 dark:bg-zinc-900/20 text-center">
          <Empty className="flex flex-col items-center justify-center border-0 bg-transparent text-center">
            <EmptyHeader className="flex flex-col items-center gap-0">
              <div className="relative mb-6">
                <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                  <i className={cn(
                    searchQuery ? "ph-magnifying-glass" : (statusFilter === "Inactive" ? "ph-archive" : "ph-buildings"),
                    "text-3xl text-gray-400 dark:text-zinc-500"
                  )}></i>
                </EmptyMedia>
              </div>
              <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                {searchQuery
                  ? "No Results Found"
                  : (statusFilter === "Inactive" ? "No Archived Offices Found" : "No Offices Found")}
              </EmptyTitle>
              <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400 mt-1">
                {searchQuery
                  ? "We couldn't find any offices matching your search criteria. Try adjusting your keywords."
                  : (statusFilter === "Inactive"
                    ? "There are currently no archived or deactivated offices in the system."
                    : "There are currently no administrative offices or campus departments configured in the system.")}
              </EmptyDescription>
              {searchQuery ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="mt-6 flex h-10 items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 text-xs font-semibold text-gray-700 shadow-xs transition-colors hover:bg-gray-50 dark:bg-zinc-900 dark:border-white/10 dark:text-zinc-300 cursor-pointer"
                >
                  <i className="ph-bold ph-arrow-counter-clockwise"></i>
                  Clear Search
                </Button>
              ) : statusFilter === "Active" ? (
                <Button
                  onClick={handleOpenCreate}
                  className="mt-6 flex h-10 items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 text-xs font-semibold shadow-xs dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 cursor-pointer"
                >
                  <i className="ph-bold ph-plus"></i>
                  Create First Office
                </Button>
              ) : null}
            </EmptyHeader>
          </Empty>
        </div>
      ) : layoutView === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOffices.map((office) => {
            const accent = office.accent_color || "#800000"
            const isActive = office.status === "Active"
            return (
              <Card
                key={office.id}
                className={cn(
                  "overflow-hidden border relative shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-all duration-300 rounded-2xl flex flex-col justify-between",
                  isActive
                    ? "border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5"
                    : "border-dashed border-gray-300 dark:border-zinc-700 bg-gray-50/70 dark:bg-zinc-900/40 opacity-80 dark:opacity-75"
                )}
              >
                <CardContent className="p-6 flex flex-col h-full justify-between">
                  <div>
                    {!isActive && (
                      <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800/80 text-[11px] font-medium text-gray-600 dark:text-zinc-300 flex items-center justify-between border border-gray-200/60 dark:border-white/5">
                        <span className="flex items-center gap-1.5">
                          <i className="ph-bold ph-archive text-gray-400"></i>
                          <span>Archived Office</span>
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Inactive</span>
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center border text-lg shadow-sm"
                          style={
                            isActive
                              ? { borderColor: `${accent}20`, backgroundColor: `${accent}08`, color: accent }
                              : { borderColor: "rgba(142, 142, 147, 0.2)", backgroundColor: "rgba(142, 142, 147, 0.08)", color: "#8e8e93" }
                          }
                        >
                          <i className={office.icon || "ti ti-building"}></i>
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-zinc-50 leading-tight">
                            {office.short_name}
                          </h3>
                          <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                            ID: {office.id}
                          </span>
                        </div>
                      </div>

                      <div
                        className={cn(
                          "inline-flex w-fit items-center justify-center rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium tracking-[0.04em] select-none",
                          isActive
                            ? "bg-[#D1FAE5] text-[#065F46] dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "bg-gray-100 text-[#8E8E93] dark:bg-zinc-800 dark:text-zinc-400"
                        )}
                      >
                        {isActive ? "Active" : "Inactive"}
                      </div>
                    </div>

                    <h4 className="text-xs font-semibold text-gray-900 dark:text-[#f2f2f7] mb-1.5 leading-snug">
                      {office.name}
                    </h4>

                    <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                      {office.description || "No description provided."}
                    </p>
                  </div>

                  {/* Workstation & Scanner Setup */}
                  <div className="space-y-1.5 mt-2 pt-3 border-t border-gray-100 dark:border-zinc-800 text-[11px] text-gray-600 dark:text-zinc-400">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400">
                        <i className="ph-bold ph-desktop text-pup-maroon dark:text-red-400"></i>
                        <span>Scanning Computer:</span>
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-zinc-100">
                        {office.station_name || "Unassigned"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400">
                        <i className="ph-bold ph-hard-drives text-pup-maroon dark:text-red-400"></i>
                        <span>Storage Folder:</span>
                      </span>
                      <span className="font-medium text-gray-700 dark:text-zinc-300 truncate max-w-[150px]" title={office.storage_path}>
                        {office.storage_path || `.local/storage/${office.id}`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400">
                        <i className="ph-bold ph-printer text-pup-maroon dark:text-red-400"></i>
                        <span>Scanner Model:</span>
                      </span>
                      <span className="font-medium text-gray-700 dark:text-zinc-300 truncate max-w-[150px]" title={office.scanner_model}>
                        {office.scanner_model || "Document Scanner"}
                      </span>
                    </div>

                    {office.ingest_token && (
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400">
                          <i className="ph-bold ph-key text-pup-maroon dark:text-red-400"></i>
                          <span>Scanner Key:</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-gray-600 dark:text-zinc-300 tracking-wider">
                            {revealedTokens[office.id] ? office.ingest_token : "••••••••••••"}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setRevealedTokens(prev => ({ ...prev, [office.id]: !prev[office.id] }))
                            }}
                            title={revealedTokens[office.id] ? "Hide Security Key" : "Show Security Key"}
                            className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer border-0 bg-transparent"
                          >
                            <i className={cn("text-xs", revealedTokens[office.id] ? "ph-bold ph-eye-slash" : "ph-bold ph-eye")}></i>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigator.clipboard.writeText(office.ingest_token)
                              setCopiedTokenId(office.id)
                              showToast("Scanner security key copied to clipboard")
                              setTimeout(() => setCopiedTokenId(null), 2000)
                            }}
                            title="Copy Scanner Security Key"
                            className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer border-0 bg-transparent"
                          >
                            <i className={cn("text-xs", copiedTokenId === office.id ? "ph-bold ph-check text-emerald-600" : "ph-bold ph-copy")}></i>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Office Metrics: Clickable Deep Links */}
                  <div className="border-t border-gray-100 dark:border-zinc-800 pt-2.5 mt-2 flex items-center justify-between text-xs text-gray-600 dark:text-zinc-400">
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent("switch-view", { detail: { view: "staff", officeId: office.id } }))}
                      title={`View assigned personnel in Global Directory`}
                      className="group/staff flex items-center gap-1.5 font-medium hover:text-pup-maroon dark:hover:text-red-400 transition-colors cursor-pointer border-0 bg-transparent p-0"
                    >
                      <i className="ph-bold ph-users text-gray-400 group-hover/staff:text-pup-maroon dark:group-hover/staff:text-red-400 transition-colors"></i>
                      <span>Staff: <strong className="text-gray-900 dark:text-zinc-100 group-hover/staff:text-pup-maroon dark:group-hover/staff:text-red-400 font-bold underline decoration-dotted underline-offset-2">{office.staff_count || 0}</strong></span>
                      <i className="ph-bold ph-arrow-right text-[10px] opacity-0 group-hover/staff:opacity-100 transition-opacity"></i>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent("switch-view", { detail: { view: "modules", officeId: office.id } }))}
                      title={`Configure workspace modules for ${office.short_name}`}
                      className="group/mod flex items-center gap-1.5 font-medium hover:text-pup-maroon dark:hover:text-red-400 transition-colors cursor-pointer border-0 bg-transparent p-0"
                    >
                      <i className="ph-bold ph-squares-four text-gray-400 group-hover/mod:text-pup-maroon dark:group-hover/mod:text-red-400 transition-colors"></i>
                      <span>Modules: <strong className="text-gray-900 dark:text-zinc-100 group-hover/mod:text-pup-maroon dark:group-hover/mod:text-red-400 font-bold underline decoration-dotted underline-offset-2">{office.module_count || 0}</strong></span>
                      <i className="ph-bold ph-arrow-right text-[10px] opacity-0 group-hover/mod:opacity-100 transition-opacity"></i>
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-5 pt-3 border-t border-gray-100 dark:border-zinc-800">
                    {isActive ? (
                      <>
                        <Button
                          onClick={() => handleOpenEdit(office)}
                          className="flex-1 bg-[#f2f2f7] hover:bg-[#e5e5ea] dark:bg-[#2c2c2e] dark:hover:bg-[#3a3a3c] text-gray-800 dark:text-[#f2f2f7] font-semibold text-xs h-8 cursor-pointer rounded-xl border-0 shadow-none"
                        >
                          Configure
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setDeactivateOfficeTarget(office)}
                          className="h-8 px-3 rounded-xl text-xs font-semibold cursor-pointer border-0 shadow-none transition-colors text-[#ff3b30] hover:bg-[#ff3b30]/10 dark:text-[#ff453a] dark:hover:bg-[#ff453a]/15"
                        >
                          Deactivate
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => setActivateOfficeTarget(office)}
                        className="w-full bg-[#34c759]/10 hover:bg-[#34c759]/20 text-[#28a745] dark:bg-[#30d158]/15 dark:hover:bg-[#30d158]/25 dark:text-[#30d158] font-semibold text-xs h-8 cursor-pointer rounded-xl border-0 shadow-none transition-colors flex items-center justify-center gap-1.5"
                      >
                        <i className="ph-bold ph-arrow-counter-clockwise text-[13px]"></i>
                        <span>Activate Department</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        /* Compact Table View */
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden bg-white dark:bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 dark:text-zinc-400">
              <thead className="sticky top-0 z-10 border-b-[0.5px] border-black/10 dark:border-white/10 bg-white dark:bg-card">
                <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500 h-11 select-none">
                  <th className="px-5 py-3">
                    <button
                      onClick={() => handleSort("short_name")}
                      className={cn(
                        "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                        sortBy === "short_name" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                      )}
                    >
                      Department / Office{" "}
                      <SortIndicator column="short_name" sortBy={sortBy} sortOrder={sortOrder} />
                    </button>
                  </th>
                  <th className="px-5 py-3">
                    <button
                      onClick={() => handleSort("name")}
                      className={cn(
                        "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                        sortBy === "name" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                      )}
                    >
                      Office Name & Description{" "}
                      <SortIndicator column="name" sortBy={sortBy} sortOrder={sortOrder} />
                    </button>
                  </th>
                  <th className="px-5 py-3">
                    <button
                      onClick={() => handleSort("station_name")}
                      className={cn(
                        "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                        sortBy === "station_name" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                      )}
                    >
                      Workstation & Storage{" "}
                      <SortIndicator column="station_name" sortBy={sortBy} sortOrder={sortOrder} />
                    </button>
                  </th>
                  <th className="px-5 py-3 text-center">
                    <button
                      onClick={() => handleSort("staff_count")}
                      className={cn(
                        "group inline-flex items-center justify-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                        sortBy === "staff_count" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                      )}
                    >
                      Staff{" "}
                      <SortIndicator column="staff_count" sortBy={sortBy} sortOrder={sortOrder} />
                    </button>
                  </th>
                  <th className="px-5 py-3 text-center">
                    <button
                      onClick={() => handleSort("module_count")}
                      className={cn(
                        "group inline-flex items-center justify-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                        sortBy === "module_count" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                      )}
                    >
                      Modules{" "}
                      <SortIndicator column="module_count" sortBy={sortBy} sortOrder={sortOrder} />
                    </button>
                  </th>
                  <th className="px-5 py-3">
                    <button
                      onClick={() => handleSort("status")}
                      className={cn(
                        "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                        sortBy === "status" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                      )}
                    >
                      Status{" "}
                      <SortIndicator column="status" sortBy={sortBy} sortOrder={sortOrder} />
                    </button>
                  </th>
                  <th className="px-5 py-3 text-right text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filteredOffices.map((office) => {
                  const accent = office.accent_color || "#800000"
                  const isActive = office.status === "Active"
                  return (
                    <tr
                      key={office.id}
                      className={cn(
                        "hover:bg-gray-50/70 dark:hover:bg-zinc-900/40 transition-colors",
                        !isActive && "bg-gray-50/40 dark:bg-zinc-900/20 opacity-75"
                      )}
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-8 w-8 rounded-lg flex items-center justify-center border text-sm shadow-2xs shrink-0"
                            style={
                              isActive
                                ? { borderColor: `${accent}20`, backgroundColor: `${accent}08`, color: accent }
                                : { borderColor: "rgba(142, 142, 147, 0.2)", backgroundColor: "rgba(142, 142, 147, 0.08)", color: "#8e8e93" }
                            }
                          >
                            <i className={office.icon || "ti ti-building"}></i>
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 dark:text-zinc-50 block text-xs leading-tight">
                              {office.short_name}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                              ID: {office.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="max-w-xs">
                          <span className="font-semibold text-gray-900 dark:text-zinc-100 block text-xs truncate">
                            {office.name}
                          </span>
                          <span className="text-[11px] text-gray-400 dark:text-zinc-500 line-clamp-1">
                            {office.description || "No description provided."}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="text-[11px] space-y-0.5">
                          <div className="flex items-center gap-1.5 text-gray-800 dark:text-zinc-200 font-medium">
                            <i className="ph-bold ph-desktop text-pup-maroon dark:text-red-400 text-xs"></i>
                            <span>{office.station_name || "Unassigned"}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 dark:text-zinc-500 truncate max-w-[150px]" title={office.storage_path}>
                            {office.storage_path || `.local/storage/${office.id}`}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => window.dispatchEvent(new CustomEvent("switch-view", { detail: { view: "staff", officeId: office.id } }))}
                          title="View assigned personnel in Global Directory"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 transition-colors font-semibold text-xs cursor-pointer border-0"
                        >
                          <i className="ph-bold ph-users text-xs text-gray-500"></i>
                          <span>{office.staff_count || 0}</span>
                        </button>
                      </td>

                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => window.dispatchEvent(new CustomEvent("switch-view", { detail: { view: "modules", officeId: office.id } }))}
                          title={`Configure workspace modules for ${office.short_name}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 transition-colors font-semibold text-xs cursor-pointer border-0"
                        >
                          <i className="ph-bold ph-squares-four text-xs text-gray-500"></i>
                          <span>{office.module_count || 0}</span>
                        </button>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div
                          className={cn(
                            "inline-flex w-fit items-center justify-center rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium tracking-[0.04em] select-none",
                            isActive
                              ? "bg-[#D1FAE5] text-[#065F46] dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-gray-100 text-[#8E8E93] dark:bg-zinc-800 dark:text-zinc-400"
                          )}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {office.ingest_token && (
                            <div className="flex items-center gap-0.5 mr-1">
                              <span className="text-[10px] text-gray-400 dark:text-zinc-500 tracking-wider">
                                {revealedTokens[office.id] ? office.ingest_token.slice(0, 10) + "..." : "••••••••"}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setRevealedTokens(prev => ({ ...prev, [office.id]: !prev[office.id] }))
                                }}
                                title={revealedTokens[office.id] ? "Hide Security Key" : "Show Security Key"}
                                className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer border-0 bg-transparent"
                              >
                                <i className={cn("text-xs", revealedTokens[office.id] ? "ph-bold ph-eye-slash" : "ph-bold ph-eye")}></i>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigator.clipboard.writeText(office.ingest_token)
                                  setCopiedTokenId(office.id)
                                  showToast("Scanner security key copied to clipboard")
                                  setTimeout(() => setCopiedTokenId(null), 2000)
                                }}
                                title="Copy Scanner Security Key"
                                className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer border-0 bg-transparent"
                              >
                                <i className={cn("text-xs", copiedTokenId === office.id ? "ph-bold ph-check text-emerald-600" : "ph-bold ph-copy")}></i>
                              </button>
                            </div>
                          )}
                          {isActive ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleOpenEdit(office)}
                                className="h-7 px-2.5 rounded-lg bg-[#f2f2f7] hover:bg-[#e5e5ea] dark:bg-[#2c2c2e] dark:hover:bg-[#3a3a3c] text-gray-800 dark:text-[#f2f2f7] font-semibold text-[11px] cursor-pointer border-0 shadow-none"
                              >
                                Configure
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeactivateOfficeTarget(office)}
                                className="h-7 px-2 rounded-lg text-[11px] font-semibold text-[#ff3b30] hover:bg-[#ff3b30]/10 dark:text-[#ff453a] cursor-pointer border-0 shadow-none"
                              >
                                Deactivate
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => setActivateOfficeTarget(office)}
                              className="h-7 px-3 rounded-lg bg-[#34c759]/10 hover:bg-[#34c759]/20 text-[#28a745] dark:bg-[#30d158]/15 dark:hover:bg-[#30d158]/25 dark:text-[#30d158] font-semibold text-[11px] cursor-pointer border-0 shadow-none flex items-center gap-1"
                            >
                              <i className="ph-bold ph-arrow-counter-clockwise text-xs"></i>
                              <span>Activate</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Dialog - Wide & Spacious Layout with Collapsible Accordion */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl w-full rounded-2xl bg-white border border-gray-200 dark:bg-zinc-900 dark:border-white/10 p-0 shadow-2xl overflow-hidden">
          <form onSubmit={handleSubmit}>
            {/* Header: Clean title without icon as requested */}
            <DialogHeader className="p-6 pb-0 bg-white dark:bg-card border-none text-left">
              <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                {isEditing ? "Edit Office Details" : "Add New Office"}
              </DialogTitle>
              <DialogDescription className="text-[13px] font-normal text-gray-500 mt-1 dark:text-zinc-400">
                Set up office identity, scanning computer, and enabled services.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-5 max-h-[68vh] overflow-y-auto">
              {/* Row 1: Short Name & ID side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Office Acronym / Short Name *
                  </label>
                  <Input
                    value={form.short_name}
                    onChange={(e) => {
                      const val = e.target.value
                      setForm(prev => {
                        const next = { ...prev, short_name: val }
                        if (!isEditing && !hasManuallyEditedId) {
                          next.id = val
                            .toLowerCase()
                            .trimStart()
                            .replace(/[\s_]+/g, "-")
                            .replace(/[^a-z0-9-]/g, "")
                            .replace(/-+/g, "-")
                            .slice(0, 24)
                        }
                        return next
                      })
                    }}
                    placeholder="e.g. Registrar, OSAS, Library"
                    className="h-10 rounded-xl bg-white border border-gray-200 text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-white/10 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Office Code / ID *
                  </label>
                  <Input
                    value={form.id}
                    onChange={(e) => {
                      setHasManuallyEditedId(true)
                      const cleanId = e.target.value
                        .toLowerCase()
                        .replace(/[\s_]+/g, "-")
                        .replace(/[^a-z0-9-]/g, "")
                        .replace(/-+/g, "-")
                      setForm(prev => ({ ...prev, id: cleanId }))
                    }}
                    disabled={isEditing}
                    placeholder="e.g. registrar, osas, library"
                    className="h-10 rounded-xl bg-white border border-gray-200 text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-white/10 dark:text-white"
                    required
                  />
                  {!isEditing && (
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                      <span>
                        Default admin: <code className="text-gray-600 dark:text-zinc-300 font-semibold">PUP{(form.id || "OFFICE").trim().toUpperCase()}-001</code>
                      </span>
                      {!hasManuallyEditedId && form.id && (
                        <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-medium">
                          Auto-generated
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Full Office Name */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Full Name of the Office *
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Office of the University Library Services"
                  className="h-10 rounded-xl bg-white border border-gray-200 text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-white/10 dark:text-white"
                  required
                />
              </div>

              {/* Row 3: Description */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Description
                </label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the department's institutional role and functions..."
                  className="h-10 rounded-xl bg-white border border-gray-200 text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-white/10 dark:text-white"
                />
              </div>

              {/* Workstation & Document Scanning Setup */}
              <div className="border border-gray-200/80 dark:border-white/10 rounded-2xl p-4 bg-gray-50/50 dark:bg-zinc-950/40 space-y-3.5">
                <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100 dark:border-white/5">
                  <div className="h-7 w-7 rounded-lg bg-pup-maroon/10 text-pup-maroon dark:bg-white/10 dark:text-zinc-100 flex items-center justify-center text-sm">
                    <i className="ph-bold ph-desktop"></i>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-900 dark:text-zinc-50">
                      Scanning Workstation & Storage Setup
                    </h5>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                      Link this department to its physical scanning computer and storage folder.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Scanning Computer Name
                    </label>
                    <Input
                      value={form.station_name}
                      onChange={(e) => setForm(prev => ({ ...prev, station_name: e.target.value }))}
                      placeholder="e.g. REG-ARCHIVE-PC01"
                      className="h-10 rounded-xl bg-white border border-gray-200 text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-white/10 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Scanner Model
                    </label>
                    <Input
                      value={form.scanner_model}
                      onChange={(e) => setForm(prev => ({ ...prev, scanner_model: e.target.value }))}
                      placeholder="e.g. Fujitsu fi-7160 / Canon DR-G2140"
                      className="h-10 rounded-xl bg-white border border-gray-200 text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-white/10 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Storage Folder Path
                  </label>
                  <Input
                    value={form.storage_path}
                    onChange={(e) => setForm(prev => ({ ...prev, storage_path: e.target.value }))}
                    placeholder="e.g. D:\PUP_REGISTRAR_RECORDS or .local/storage/registrar/uploads"
                    className="h-10 rounded-xl bg-white border border-gray-200 text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-white/10 dark:text-white"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Scanned documents for this department will be physically saved in this local folder.
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Scanner Inbound Folder Path
                  </label>
                  <Input
                    value={form.inbound_path}
                    onChange={(e) => setForm(prev => ({ ...prev, inbound_path: e.target.value }))}
                    placeholder="e.g. /Volumes/RegistrarScanner/INBOUND or .local/hot-folder/INBOUND"
                    className="h-10 rounded-xl bg-white border border-gray-200 text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-white/10 dark:text-white"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    The local folder watched by Continuous Scanning. The watcher reloads this setting automatically.
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Scanner Connection Token (Security Key)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const slug = (form.short_name || "sec").toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 16);
                        const randomToken = `station_token_${slug || "sec"}_${Math.random().toString(36).substring(2, 10)}`;
                        setForm(prev => ({ ...prev, ingest_token: randomToken }));
                      }}
                      className="text-[10px] font-bold text-pup-maroon hover:underline dark:text-red-400 cursor-pointer"
                    >
                      Generate New Key
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      type={showModalToken ? "text" : "password"}
                      value={form.ingest_token}
                      onChange={(e) => setForm(prev => ({ ...prev, ingest_token: e.target.value }))}
                      placeholder="Security key for the scanner computer service"
                      className="h-10 rounded-xl bg-white border border-gray-200 text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-white/10 dark:text-white pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowModalToken(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 cursor-pointer border-0 bg-transparent p-0"
                      title={showModalToken ? "Hide security key" : "Show security key"}
                    >
                      <i className={cn("text-sm", showModalToken ? "ph-bold ph-eye-slash" : "ph-bold ph-eye")}></i>
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 4: Module Scope Section with Collapsible Accordion (Create View) */}
              {!isEditing ? (
                <div className="border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden bg-gray-50/50 dark:bg-zinc-950/40 transition-all">
                  <button
                    type="button"
                    onClick={() => setModulesAccordionOpen(prev => !prev)}
                    className="w-full flex items-center justify-between p-3.5 hover:bg-gray-100/60 dark:hover:bg-zinc-900/60 transition-colors cursor-pointer text-left select-none border-0 outline-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-pup-maroon/10 text-pup-maroon dark:bg-white/10 dark:text-zinc-100 flex items-center justify-center shrink-0">
                        <i className="ti ti-layout-grid text-base"></i>
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
                      <i className={cn(
                        "ti ti-chevron-down text-gray-400 text-sm transition-transform duration-200",
                        modulesAccordionOpen && "rotate-180 text-pup-maroon dark:text-red-400"
                      )}></i>
                    </div>
                  </button>

                  {/* Accordion Content */}
                  {modulesAccordionOpen && (
                    <div className="p-3.5 border-t border-gray-200/80 dark:border-white/10 bg-white/70 dark:bg-zinc-950/70 space-y-3 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400 pb-1">
                        <span>Select which standard modules should be enabled for this office:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, selectedModules: availableModules.map(m => m.id) }))}
                            className="text-[10px] font-bold text-pup-maroon hover:underline dark:text-red-400 cursor-pointer"
                          >
                            Select All
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                        {availableModules.map((mod) => {
                          const isSystem = mod.is_system;
                          const isChecked = isSystem || form.selectedModules.includes(mod.id);

                          return (
                            <label
                              key={mod.id}
                              className={cn(
                                "flex items-start gap-2.5 p-2 rounded-xl text-xs transition-all border select-none",
                                isChecked
                                  ? "border-pup-maroon/20 bg-pup-maroon/5 dark:border-white/15 dark:bg-white/5"
                                  : "border-gray-200/70 bg-gray-50/50 dark:border-white/5 dark:bg-zinc-900/40",
                                isSystem ? "opacity-80 cursor-default" : "hover:border-pup-maroon/40 cursor-pointer"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isSystem}
                                onChange={() => handleModuleToggle(mod.id)}
                                className="mt-0.5 rounded text-pup-maroon focus:ring-pup-maroon h-3.5 w-3.5"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-gray-900 dark:text-zinc-100 truncate text-[11.5px]">
                                    {mod.name}
                                  </span>
                                  {isSystem && (
                                    <span className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.2 rounded bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 shrink-0">
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

                      <div className="text-[10px] text-gray-400 dark:text-zinc-500 italic pt-1 border-t border-gray-100 dark:border-white/5">
                        * Note: Offices only use this standardized system catalog. Custom modules cannot be created per office.
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-gray-200/80 dark:border-white/10 bg-gray-50/80 dark:bg-zinc-950/40 text-xs text-gray-600 dark:text-zinc-400 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-pup-maroon/10 text-pup-maroon dark:bg-white/10 dark:text-zinc-100 flex items-center justify-center shrink-0">
                      <i className="ti ti-layout-grid text-base"></i>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-zinc-100 block leading-tight">
                        Workspace Modules Configured
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                        Toggle default system modules for this office anytime in the matrix.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDialogOpen(false)
                      window.dispatchEvent(new CustomEvent("switch-view", { detail: { view: "modules" } }))
                    }}
                    className="text-xs font-bold text-pup-maroon hover:underline dark:text-red-400 cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <span>Open Matrix</span>
                    <i className="ti ti-arrow-right text-xs"></i>
                  </button>
                </div>
              )}

              {/* Row 5: Expanded Office Icon Section */}
              <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Office Icon
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCustomIcon(v => !v)}
                    className="text-[10px] font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    {showCustomIcon ? "Use icon catalog" : "Custom icon class"}
                  </button>
                </div>

                {!showCustomIcon ? (
                  <div className="p-3.5 sm:p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-950/40">
                    <div className="grid grid-cols-6 sm:grid-cols-9 gap-2.5 sm:gap-3">
                      {PRESET_ICONS.map((opt) => {
                        const selected = form.icon === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            title={opt.label}
                            onClick={() => setForm(prev => ({ ...prev, icon: opt.value }))}
                            className={cn(
                              "h-10 w-full flex items-center justify-center rounded-xl border text-lg transition-all cursor-pointer shadow-2xs",
                              selected
                                ? "border-slate-900 bg-slate-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 scale-105"
                                : "border-gray-200/90 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-100 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            )}
                          >
                            <i className={opt.value}></i>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <Input
                    value={form.icon}
                    onChange={(e) => setForm(prev => ({ ...prev, icon: e.target.value }))}
                    placeholder="e.g. ti ti-building, ph-bold ph-certificate"
                    className="h-10 rounded-xl bg-white border border-gray-200 text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-white/10 dark:text-white"
                  />
                )}
                <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-zinc-500 pt-0.5">
                  <span className="flex items-center gap-1.5">
                    Selected icon: <i className={form.icon}></i> <code className="text-gray-600 dark:text-zinc-400 font-medium">{form.icon}</code>
                  </span>
                  <span>{PRESET_ICONS.length} icons available</span>
                </div>
              </div>

              {/* Row 6: Expanded Branding Theme Colors & Live Preview */}
              <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Branding Theme Color
                  </label>
                  <span className="text-[11px] font-medium text-gray-400 dark:text-zinc-500">
                    {form.accent_color}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-950/40 space-y-3">
                  {/* Expanded Swatches Grid */}
                  <div className="grid grid-cols-6 sm:grid-cols-9 gap-2.5">
                    {PRESET_COLORS.map(c => {
                      const isSelected = form.accent_color?.toLowerCase() === c.hex.toLowerCase()
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          title={`${c.name} (${c.hex})`}
                          onClick={() => setForm(prev => ({ ...prev, accent_color: c.hex }))}
                          className={cn(
                            "h-8 rounded-xl border transition-all cursor-pointer flex items-center justify-center shadow-2xs",
                            isSelected
                              ? "ring-2 ring-slate-900 ring-offset-2 dark:ring-white dark:ring-offset-zinc-950 scale-105"
                              : "border-black/10 hover:scale-105"
                          )}
                          style={{ backgroundColor: c.hex }}
                        >
                          {isSelected && (
                            <i className="ti ti-check text-white text-xs drop-shadow-sm font-bold"></i>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Custom Color Input & Live Preview */}
                  <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-gray-200/70 dark:border-white/5">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="color"
                        value={form.accent_color}
                        onChange={(e) => setForm(prev => ({ ...prev, accent_color: e.target.value }))}
                        className="w-9 h-9 border rounded-xl overflow-hidden cursor-pointer bg-transparent shrink-0"
                      />
                      <Input
                        value={form.accent_color}
                        onChange={(e) => setForm(prev => ({ ...prev, accent_color: e.target.value }))}
                        placeholder="#800000"
                        className="h-9 w-28 rounded-xl bg-white border border-gray-200 text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-white/10 dark:text-white"
                      />
                    </div>

                    {/* Live Office Badge Preview */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">
                        Live Preview:
                      </span>
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-2xs"
                        style={{
                          borderColor: `${form.accent_color}30`,
                          backgroundColor: `${form.accent_color}10`,
                          color: form.accent_color
                        }}
                      >
                        <i className={cn(form.icon || "ti ti-building", "text-sm")}></i>
                        <span>{form.short_name || "Office"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                className="h-10 px-4 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-white/5 rounded-xl cursor-pointer border-none shadow-none"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitLoading}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl h-10 px-5 cursor-pointer dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs"
              >
                {submitLoading ? "Saving..." : isEditing ? "Save Changes" : "Create Office"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Modal */}
      <ConfirmModal
        open={!!deactivateOfficeTarget}
        onCancel={() => setDeactivateOfficeTarget(null)}
        onConfirm={confirmDeactivateOffice}
        isLoading={isDeactivating}
        title="Deactivate Office"
        message={`Are you sure you want to deactivate ${deactivateOfficeTarget?.name || "this office"}? Staff members assigned to this office will not have access until it is reactivated.`}
        confirmLabel="Deactivate Office"
        variant="danger"
        isAppleStyled={true}
        isPersonnelModal={true}
        selectedItems={deactivateOfficeTarget ? [`${deactivateOfficeTarget.short_name} (${deactivateOfficeTarget.id}) — ${deactivateOfficeTarget.staff_count || 0} Staff assigned`] : []}
      />

      {/* Activate Confirmation Modal */}
      <ConfirmModal
        open={!!activateOfficeTarget}
        onCancel={() => setActivateOfficeTarget(null)}
        onConfirm={confirmActivateOffice}
        isLoading={isActivating}
        title="Reactivate Office"
        message={`Are you sure you want to reactivate ${activateOfficeTarget?.name || "this office"}? Assigned staff members will regain access to their office workspace.`}
        confirmLabel="Reactivate Office"
        variant="primary"
        isAppleStyled={true}
        isPersonnelModal={true}
        selectedItems={activateOfficeTarget ? [`${activateOfficeTarget.short_name} (${activateOfficeTarget.id}) — ${activateOfficeTarget.staff_count || 0} Staff assigned`] : []}
      />
    </div>
  )
}
