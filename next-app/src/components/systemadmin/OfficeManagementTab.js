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
  { value: "ti ti-building-2", label: "Administration" },
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

export default function OfficeManagementTab({ showToast }) {
  const [offices, setOffices] = useState([])
  const [availableModules, setAvailableModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("Active")
  const [selectedKpi, setSelectedKpi] = useState(null)
  const [deactivateOfficeTarget, setDeactivateOfficeTarget] = useState(null)
  const [isDeactivating, setIsDeactivating] = useState(false)
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
    icon: "ti ti-building",
    accent_color: "#800000",
    status: "Active",
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
    // Default enabled modules: all standard modules
    const defaultSelected = availableModules.map(m => m.id)
    setForm({
      id: "",
      name: "",
      short_name: "",
      description: "",
      icon: "ti ti-building",
      accent_color: "#800000",
      status: "Active",
      selectedModules: defaultSelected,
    })
    setDialogOpen(true)
  }

  const handleOpenEdit = (office) => {
    setIsEditing(true)
    setSelectedOfficeId(office.id)
    const icon = office.icon || "ti ti-building"
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
    if (!form.id.trim() || !form.name.trim() || !form.short_name.trim()) {
      showToast("Please fill in all required fields", true)
      return
    }

    setSubmitLoading(true)
    try {
      const url = isEditing ? `/api/offices/${selectedOfficeId}` : "/api/offices"
      const method = isEditing ? "PATCH" : "POST"

      const payload = {
        id: form.id.trim().toLowerCase(),
        name: form.name.trim(),
        short_name: form.short_name.trim(),
        description: form.description.trim(),
        icon: form.icon.trim(),
        accent_color: form.accent_color,
        status: form.status,
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
  }, [offices, searchQuery, statusFilter])

  const hasActiveFilters = searchQuery !== ""

  const handleClearFilters = () => {
    setSearchQuery("")
  }

  const statCardsData = [
    {
      key: "total",
      label: "Campus Offices",
      value: stats.total,
      sublabel: `${stats.active} active institutional partitions`,
      color: "blue",
      shape1: "from-[#0055FF]/40 to-[#007AFF]/0",
      shape2: "from-[#14C8FF]/30 to-[#007AFF]/0",
      bg: "from-[#14C8FF] via-[#007AFF] to-[#0055FF] dark:from-[#007AFF] dark:to-[#0033aa]",
      glass: "glass-stat-card-blue",
    },
    {
      key: "active",
      label: "Active Partitions",
      value: stats.active,
      sublabel: `${stats.inactive} inactive or decommissioned`,
      color: "emerald",
      shape1: "from-[#047857]/40 to-[#059669]/0",
      shape2: "from-[#34d399]/30 to-[#059669]/0",
      bg: "from-[#34d399] via-[#059669] to-[#047857] dark:from-[#059669] dark:to-[#024e37]",
      glass: "glass-stat-card-green",
    },
    {
      key: "staff",
      label: "Total Personnel",
      value: stats.totalStaff,
      sublabel: `${stats.avgModules} avg modules per branch`,
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
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Total Units</span>
                        <span className="text-lg font-black font-mono">{stats.total}</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Avg Modules</span>
                        <span className="text-lg font-black font-mono">{stats.avgModules}</span>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-xs text-white/90 leading-relaxed">
                      Partitioned administrative and academic units operating independently with role-based access.
                    </div>
                  </div>
                )}
                {stat.key === "active" && (
                  <div className="space-y-3 text-white">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Active Units</span>
                        <span className="text-lg font-black font-mono">{stats.active}</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Inactive</span>
                        <span className="text-lg font-black font-mono">{stats.inactive}</span>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-xs text-white/90 leading-relaxed">
                      Offices actively operational with enabled modules and personnel services.
                    </div>
                  </div>
                )}
                {stat.key === "staff" && (
                  <div className="space-y-3 text-white">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Assigned Staff</span>
                        <span className="text-lg font-black font-mono">{stats.totalStaff}</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Avg Staff/Office</span>
                        <span className="text-lg font-black font-mono">{stats.total > 0 ? (stats.totalStaff / stats.total).toFixed(1) : 0}</span>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-xs text-white/90 leading-relaxed">
                      Cumulative personnel count operating within assigned departmental workspaces.
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
          icon="ti ti-building-community"
          title="Office & Department Management"
          description="Add, configure, and monitor administrative offices and campus departments."
          actions={
            <Button
              onClick={handleOpenCreate}
              className="flex h-[36px] items-center justify-center rounded-[8px] btn-brand-red text-white font-medium text-[13px] active:scale-95 transition-all cursor-pointer px-5"
            >
              <i className="ph-bold ph-plus mr-1.5 text-[14px]"></i>
              Create Office
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
          {/* Status Tabs Toggle: Active vs Archived */}
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
              Active ({stats.active})
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
              Archived ({stats.inactive})
            </button>
          </div>

          {/* Toolbar Row */}
          <div className="flex flex-row items-center gap-[12px] w-full select-none">
            {/* Search */}
            <div className="flex-1 min-w-0 relative group">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <i className="ph-bold ph-magnifying-glass text-gray-400 transition-colors group-focus-within:text-pup-maroon dark:text-zinc-500 text-sm"></i>
              </div>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search offices by name, acronym, ID..."
                className="h-[36px] w-full rounded-[8px] border-[0.5px] border-black/15 bg-white pl-9 pr-20 text-[13px] font-normal placeholder:text-[#8E8E93] dark:border-white/15 dark:bg-card"
              />
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                {filteredOffices.length > 0 ? `${filteredOffices.length} results` : "0 results"}
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOffices.map((office) => {
            const accent = office.accent_color || "#800000"
            const isActive = office.status === "Active"
            return (
              <Card 
                key={office.id} 
                className="overflow-hidden border border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] relative shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 rounded-2xl"
              >
                <CardContent className="p-6 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="h-10 w-10 rounded-xl flex items-center justify-center border text-lg shadow-sm"
                          style={{ borderColor: `${accent}20`, backgroundColor: `${accent}08`, color: accent }}
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

                      <Badge 
                        className={cn(
                          "rounded-full border-0 px-2 py-0.5 text-[10px] font-bold shadow-none",
                          isActive 
                            ? "bg-[#34c759]/10 text-[#34c759] dark:bg-[#30d158]/20 dark:text-[#30d158]"
                            : "bg-[#8e8e93]/10 text-[#8e8e93] dark:bg-[#8e8e93]/20 dark:text-[#aeaeb2]"
                        )}
                      >
                        {office.status}
                      </Badge>
                    </div>

                    <h4 className="text-xs font-semibold text-gray-900 dark:text-[#f2f2f7] mb-1.5 leading-snug">
                      {office.name}
                    </h4>
                    
                    <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                      {office.description || "No description provided."}
                    </p>
                  </div>

                  {/* Office Metrics */}
                  <div className="border-t border-gray-100 dark:border-zinc-800 pt-4 mt-2 flex items-center justify-between text-xs text-gray-600 dark:text-zinc-400">
                    <div className="flex items-center gap-1.5 font-medium">
                      <i className="ti ti-users text-gray-400"></i>
                      <span>Staff: <strong className="text-gray-900 dark:text-zinc-100 font-bold">{office.staff_count || 0}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <i className="ti ti-layout-grid text-gray-400"></i>
                      <span>Modules: <strong className="text-gray-900 dark:text-zinc-100 font-bold">{office.module_count || 0}</strong></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-5 pt-3 border-t border-gray-100 dark:border-zinc-800">
                    <Button 
                      onClick={() => handleOpenEdit(office)}
                      className="flex-1 bg-[#f2f2f7] hover:bg-[#e5e5ea] dark:bg-[#2c2c2e] dark:hover:bg-[#3a3a3c] text-gray-800 dark:text-[#f2f2f7] font-semibold text-xs h-8 cursor-pointer rounded-lg border-0 shadow-none"
                    >
                      Configure
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        if (isActive) {
                          setDeactivateOfficeTarget(office)
                        } else {
                          handleToggleStatus(office)
                        }
                      }}
                      className={cn(
                        "h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer border-0 shadow-none transition-colors",
                        isActive 
                          ? "text-[#ff3b30] hover:bg-[#ff3b30]/10 dark:text-[#ff453a] dark:hover:bg-[#ff453a]/15"
                          : "text-[#34c759] hover:bg-[#34c759]/10 dark:text-[#30d158] dark:hover:bg-[#30d158]/15"
                      )}
                    >
                      {isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create / Edit Dialog - Wide & Spacious Layout with Collapsible Accordion */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl w-full rounded-2xl bg-white border border-gray-200 dark:bg-zinc-900 dark:border-white/10 p-0 shadow-2xl overflow-hidden">
          <form onSubmit={handleSubmit}>
            {/* Header: Clean title without icon as requested */}
            <DialogHeader className="p-6 pb-4 border-b border-gray-100 dark:border-white/5 text-left">
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-zinc-50 tracking-tight">
                {isEditing ? "Edit Office Configuration" : "Create Administrative Office"}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mt-1 dark:text-zinc-400">
                Configure identity, default workspace modules, and branding for this campus office.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-5 max-h-[68vh] overflow-y-auto">
              {/* Row 1: Short Name & ID side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Acronym / Short Name *
                  </label>
                  <Input
                    value={form.short_name}
                    onChange={(e) => setForm(prev => ({ ...prev, short_name: e.target.value }))}
                    placeholder="e.g. Registrar, OSAS, Library"
                    className="h-10 rounded-xl bg-white border border-gray-200 text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-white/10 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Office Identifier (Database ID) *
                  </label>
                  <Input
                    value={form.id}
                    onChange={(e) => setForm(prev => ({ ...prev, id: e.target.value }))}
                    disabled={isEditing}
                    placeholder="e.g. registrar, osas, library"
                    className="h-10 rounded-xl bg-white border border-gray-200 text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-white/10 dark:text-white font-mono"
                    required
                  />
                  {!isEditing && (
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      Auto-provisions admin account: <code className="font-mono text-gray-600 dark:text-zinc-300">PUP{(form.id || "OFFICE").trim().toUpperCase()}-001</code>
                    </span>
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
                          <Badge className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-0">
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
                  <div className="p-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-950/40">
                    <div className="grid grid-cols-6 sm:grid-cols-9 gap-2 max-h-[170px] overflow-y-auto pr-1">
                      {PRESET_ICONS.map((opt) => {
                        const selected = form.icon === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            title={opt.label}
                            onClick={() => setForm(prev => ({ ...prev, icon: opt.value }))}
                            className={cn(
                              "h-10 flex items-center justify-center rounded-xl border text-lg transition-all cursor-pointer shadow-2xs",
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
                    Selected icon: <i className={form.icon}></i> <code className="font-mono text-gray-600 dark:text-zinc-400">{form.icon}</code>
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
                  <span className="text-[11px] font-mono text-gray-400 dark:text-zinc-500">
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
                        className="h-9 w-28 rounded-xl bg-white border border-gray-200 text-xs focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-white/10 dark:text-white font-mono"
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

            <DialogFooter className="p-6 bg-gray-50 dark:bg-zinc-950/40 border-t border-gray-100 dark:border-white/5 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                className="text-xs text-gray-500 dark:text-zinc-400 font-semibold cursor-pointer"
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
        title="Deactivate Office Partition"
        message={`Are you sure you want to deactivate ${deactivateOfficeTarget?.name || "this office"}? Staff members assigned to this office will lose operational workspace access until reactivated.`}
        confirmLabel="Deactivate Office"
        variant="danger"
        isAppleStyled={true}
        isPersonnelModal={true}
        selectedItems={deactivateOfficeTarget ? [`${deactivateOfficeTarget.short_name} (${deactivateOfficeTarget.id}) — ${deactivateOfficeTarget.staff_count || 0} Staff assigned`] : []}
      />
    </div>
  )
}
