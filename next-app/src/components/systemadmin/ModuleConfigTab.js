"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import PageHeader from "@/components/shared/PageHeader"
import { cn } from "@/lib/utils"

export default function ModuleConfigTab({ showToast }) {
  const [matrix, setMatrix] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState({}) // { [key]: boolean }
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("All") // "All" | "admin" | "staff"
  const [selectedOfficeId, setSelectedOfficeId] = useState("")
  const [viewMode, setViewMode] = useState("office") // "office" | "matrix"

  const fetchMatrix = useCallback(async () => {
    try {
      const res = await fetch("/api/modules/matrix")
      const json = await res.json()
      if (res.ok && json.ok) {
        setMatrix(json.data)
        if (json.data.offices?.length > 0) {
          setSelectedOfficeId((prev) => prev || json.data.offices[0].id)
        }
      } else {
        showToast(json.error || "Failed to fetch module matrix", true)
      }
    } catch (err) {
      showToast("Network error fetching module matrix", true)
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchMatrix()
  }, [fetchMatrix])

  const handleToggle = async (officeId, moduleId, currentEnabled, isSystem) => {
    if (isSystem) return

    const toggleKey = `${officeId}-${moduleId}`
    setToggling((prev) => ({ ...prev, [toggleKey]: true }))

    try {
      const officeAssignments = matrix.assignments[officeId] || {}
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
        showToast("Modules configuration updated")
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
      } else {
        showToast(json.error || "Failed to update module assignment", true)
      }
    } catch (err) {
      showToast("Network error toggling module", true)
    } finally {
      setToggling((prev) => {
        const next = { ...prev }
        delete next[toggleKey]
        return next
      })
    }
  }

  const handleBatchToggle = async (officeId, category, enable) => {
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
        showToast(`Updated ${category === "all" ? "all" : category} modules`)
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
        showToast(json.error || "Failed to batch update modules", true)
      }
    } catch (err) {
      showToast("Network error updating modules", true)
    } finally {
      setToggling((prev) => {
        const next = { ...prev }
        delete next[toggleKey]
        return next
      })
    }
  }

  const currentOffice = useMemo(() => {
    if (!matrix?.offices) return null
    return matrix.offices.find((o) => o.id === selectedOfficeId) || matrix.offices[0]
  }, [matrix, selectedOfficeId])

  const filteredModules = useMemo(() => {
    if (!matrix?.modules) return []
    return matrix.modules.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description || "").toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCat = categoryFilter === "All" || m.category === categoryFilter
      return matchesSearch && matchesCat
    })
  }, [matrix, searchQuery, categoryFilter])

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

  const hasActiveFilters = searchQuery !== "" || categoryFilter !== "All"

  const handleClearFilters = () => {
    setSearchQuery("")
    setCategoryFilter("All")
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

  const { offices, modules } = matrix

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up font-inter">
      {/* Header with Clean View Switcher */}
      <PageHeader
        icon="ti ti-layout-grid"
        title="Module Configuration Matrix"
        description="Enable or disable standard workspace modules for campus departments. Modules are grouped by role operations (Office Head/Admin vs Staff)."
        actions={
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-zinc-800/70 p-1 rounded-xl border border-gray-200/60 dark:border-white/5">
            <button
              type="button"
              onClick={() => setViewMode("office")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === "office"
                  ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-50 shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              )}
            >
              <i className="ti ti-building text-sm"></i>
              By Department
            </button>
            <button
              type="button"
              onClick={() => setViewMode("matrix")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === "matrix"
                  ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-50 shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              )}
            >
              <i className="ti ti-table text-sm"></i>
              Matrix Overview
            </button>
          </div>
        }
      />

      {/* VIEW 1: BY OFFICE (Scalable for 4-5+ offices) */}
      {viewMode === "office" && (
        <div className="flex flex-col gap-6">
          {/* Office Selector Carousel / Horizontal Pill Bar */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-zinc-400 px-1">
              <span>Select Department to Configure ({offices.length}):</span>
              <span className="text-[11px] font-normal text-gray-400">
                Click a department to customize its active modules
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {offices.map((o) => {
                const isSelected = o.id === selectedOfficeId
                const activeCount = officeCounts[o.id] || 0
                const accent = o.accent_color || "#800000"

                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setSelectedOfficeId(o.id)}
                    className={cn(
                      "p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-3 cursor-pointer group select-none",
                      isSelected
                        ? "bg-white dark:bg-zinc-900 shadow-md ring-2 ring-pup-maroon/20 dark:ring-white/20 border-pup-maroon dark:border-white/30"
                        : "bg-white/60 dark:bg-zinc-900/40 border-gray-200/80 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 hover:bg-white dark:hover:bg-zinc-900"
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
                          <i className={o.icon || "ti ti-building"}></i>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900 dark:text-zinc-50 group-hover:text-pup-maroon transition-colors">
                            {o.short_name}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            ID: {o.id}
                          </div>
                        </div>
                      </div>

                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] font-mono px-2 py-0.5 rounded-full border-0 font-bold",
                          isSelected
                            ? "bg-pup-maroon text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300"
                        )}
                      >
                        {activeCount}/{modules.length}
                      </Badge>
                    </div>

                    <div className="text-[11px] text-gray-500 dark:text-zinc-400 truncate w-full">
                      {o.name}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Active Office Banner & Filters */}
          {currentOffice && (
            <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card overflow-hidden">
              <div
                className="p-5 border-b border-gray-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-950/20"
                style={{
                  borderLeft: `4px solid ${currentOffice.accent_color || "#800000"}`,
                }}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center text-xl shadow-xs"
                    style={{
                      backgroundColor: `${currentOffice.accent_color || "#800000"}15`,
                      color: currentOffice.accent_color || "#800000",
                    }}
                  >
                    <i className={currentOffice.icon || "ti ti-building"}></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50">
                        {currentOffice.name} ({currentOffice.short_name})
                      </h3>
                      <Badge className="text-[10px] font-bold bg-[#34c759]/15 text-[#34c759] border-0">
                        {currentOffice.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                      Configuring operational modules for {currentOffice.short_name} personnel and departmental heads.
                    </p>
                  </div>
                </div>

                {/* Quick Batch Actions for this office */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={Boolean(toggling[`${currentOffice.id}-all-batch`])}
                    onClick={() => handleBatchToggle(currentOffice.id, "all", true)}
                    className="h-8 text-xs font-semibold rounded-lg border-gray-200 dark:border-white/10 cursor-pointer"
                  >
                    <i className="ti ti-check-double mr-1 text-xs"></i>
                    Enable All Modules
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={Boolean(toggling[`${currentOffice.id}-all-batch`])}
                    onClick={() => handleBatchToggle(currentOffice.id, "all", false)}
                    className="h-8 text-xs font-semibold rounded-lg border-gray-200 dark:border-white/10 text-gray-600 hover:text-red-600 cursor-pointer"
                  >
                    <i className="ti ti-rotate-clockwise mr-1 text-xs"></i>
                    System Only
                  </Button>
                </div>
              </div>

              {/* Filter / Search Bar */}
              <div className="p-4 border-b border-gray-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex-1 w-full relative group">
                  <i className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-pup-maroon dark:text-zinc-500 text-sm"></i>
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter modules by name or description..."
                    className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-20 text-xs font-normal placeholder:text-gray-400 dark:border-white/10 dark:bg-zinc-900"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[11px] font-normal text-gray-400">
                    {filteredModules.length} modules
                  </div>
                </div>

                {/* Category Segmented Tabs */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-800/80 p-1 rounded-lg shrink-0 select-none">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter("All")}
                    className={cn(
                      "px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                      categoryFilter === "All"
                        ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-50 shadow-2xs"
                        : "text-gray-500 hover:text-gray-900 dark:text-zinc-400"
                    )}
                  >
                    All ({modules.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter("admin")}
                    className={cn(
                      "px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                      categoryFilter === "admin"
                        ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-50 shadow-2xs"
                        : "text-gray-500 hover:text-gray-900 dark:text-zinc-400"
                    )}
                  >
                    Head & Admin ({modules.filter((m) => m.category === "admin").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter("staff")}
                    className={cn(
                      "px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                      categoryFilter === "staff"
                        ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-50 shadow-2xs"
                        : "text-gray-500 hover:text-gray-900 dark:text-zinc-400"
                    )}
                  >
                    Staff Workspace ({modules.filter((m) => m.category === "staff").length})
                  </button>
                </div>
              </div>

              {/* Active Filters Row */}
              {hasActiveFilters && (
                <div className="border-b border-gray-100 bg-white px-5 py-2.5 flex items-center gap-2 dark:border-white/5 dark:bg-card">
                  <span className="text-[11px] font-medium uppercase text-gray-400">
                    Active filters:
                  </span>
                  {searchQuery && (
                    <div className="flex items-center gap-1.5 rounded-md bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-xs text-gray-800 dark:text-zinc-200">
                      Search: {searchQuery}
                      <button
                        onClick={() => setSearchQuery("")}
                        className="text-gray-400 hover:text-gray-700 cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {categoryFilter !== "All" && (
                    <div className="flex items-center gap-1.5 rounded-md bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-xs text-gray-800 dark:text-zinc-200">
                      Role: {categoryFilter === "admin" ? "Head & Admin" : "Staff"}
                      <button
                        onClick={() => setCategoryFilter("All")}
                        className="text-gray-400 hover:text-gray-700 cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="h-auto p-0 text-xs text-red-600 hover:bg-transparent cursor-pointer"
                  >
                    Clear
                  </Button>
                </div>
              )}

              <CardContent className="p-6 space-y-8">
                {/* ROLE OPERATION GROUP 1: HEAD & ADMINISTRATOR OPERATIONS */}
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
                              Office Head & Administrator Tools
                            </h4>
                            <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400 font-bold">
                              {groupedModules.admin.filter(
                                (m) =>
                                  m.is_system ||
                                  matrix.assignments[currentOffice.id]?.[m.id]?.enabled
                              ).length}{" "}
                              / {groupedModules.admin.length} active
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                            Supervisory dashboards, SLA analytics, compliance monitoring, and configuration controls.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => handleBatchToggle(currentOffice.id, "admin", true)}
                          className="text-[11px] font-semibold text-pup-maroon hover:underline dark:text-red-400 cursor-pointer"
                        >
                          Enable All Admin
                        </button>
                        <span className="text-gray-300 dark:text-zinc-700">·</span>
                        <button
                          type="button"
                          onClick={() => handleBatchToggle(currentOffice.id, "admin", false)}
                          className="text-[11px] font-semibold text-gray-500 hover:underline dark:text-zinc-400 cursor-pointer"
                        >
                          Disable Optional
                        </button>
                      </div>
                    </div>

                    {groupedModules.admin.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-400">
                        No admin modules match your search.
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
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ROLE OPERATION GROUP 2: STAFF WORKSPACE & DIGITIZATION MODULES */}
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
                              Staff Workspace & Digitization Modules
                            </h4>
                            <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400 font-bold">
                              {groupedModules.staff.filter(
                                (m) =>
                                  m.is_system ||
                                  matrix.assignments[currentOffice.id]?.[m.id]?.enabled
                              ).length}{" "}
                              / {groupedModules.staff.length} active
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                            Frontline scanning, OCR processing, document intake, and student records operations.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => handleBatchToggle(currentOffice.id, "staff", true)}
                          className="text-[11px] font-semibold text-pup-maroon hover:underline dark:text-red-400 cursor-pointer"
                        >
                          Enable All Staff
                        </button>
                        <span className="text-gray-300 dark:text-zinc-700">·</span>
                        <button
                          type="button"
                          onClick={() => handleBatchToggle(currentOffice.id, "staff", false)}
                          className="text-[11px] font-semibold text-gray-500 hover:underline dark:text-zinc-400 cursor-pointer"
                        >
                          Disable Optional
                        </button>
                      </div>
                    </div>

                    {groupedModules.staff.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-400">
                        No staff modules match your search.
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
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* VIEW 2: MATRIX OVERVIEW TABLE (Bird's-eye cross-office audit) */}
      {viewMode === "matrix" && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200/80 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-sm">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/5 bg-gray-50/70 dark:bg-zinc-950/30">
                <th className="p-4 text-xs font-bold text-gray-600 dark:text-zinc-300 uppercase tracking-wider min-w-[280px]">
                  Standard Catalog Module
                </th>
                {offices.map((o) => (
                  <th
                    key={o.id}
                    className="p-4 text-xs font-bold text-center uppercase tracking-wider min-w-[120px]"
                    style={{ color: o.accent_color || "#800000" }}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-[13px] font-black">{o.short_name}</span>
                      <span className="text-[10px] text-gray-400 font-mono mt-0.5">
                        {officeCounts[o.id] || 0}/{modules.length}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {/* Head / Admin Group Row */}
              <tr className="bg-gray-100/60 dark:bg-zinc-950/40">
                <td
                  colSpan={offices.length + 1}
                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400"
                >
                  Office Head & Administrator Tools
                </td>
              </tr>
              {groupedModules.admin.map((m) => (
                <MatrixTableRow
                  key={m.id}
                  m={m}
                  offices={offices}
                  assignments={matrix.assignments}
                  toggling={toggling}
                  onToggle={handleToggle}
                />
              ))}

              {/* Staff Workspace Group Row */}
              <tr className="bg-gray-100/60 dark:bg-zinc-950/40">
                <td
                  colSpan={offices.length + 1}
                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400"
                >
                  Staff Workspace & Digitization Modules
                </td>
              </tr>
              {groupedModules.staff.map((m) => (
                <MatrixTableRow
                  key={m.id}
                  m={m}
                  offices={offices}
                  assignments={matrix.assignments}
                  toggling={toggling}
                  onToggle={handleToggle}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/**
 * Clean, interactive card for an individual module in the By-Office view
 */
function ModuleCard({ m, office, assignments, toggling, onToggle }) {
  const toggleKey = `${office.id}-${m.id}`
  const isToggling = toggling[toggleKey]
  const isSystem = Boolean(m.is_system)
  const isEnabled = isSystem || Boolean(assignments[office.id]?.[m.id]?.enabled)

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
              <i className={m.icon || "ti ti-cube"}></i>
            </div>
            <div>
              <h5 className="text-xs font-bold text-gray-900 dark:text-zinc-50 leading-tight">
                {m.name}
              </h5>
              <span className="text-[10px] text-gray-400 font-mono">
                {m.id}
              </span>
            </div>
          </div>

          {isSystem ? (
            <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 text-[9px] font-bold border-0 tracking-wider uppercase">
              Core System
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
          {m.description || "Standard platform module."}
        </p>
      </div>

      <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
        <span className="text-[11px] font-medium text-gray-600 dark:text-zinc-400">
          {isSystem ? "Non-revocable" : isEnabled ? "Enabled for Staff" : "Disabled"}
        </span>

        {isToggling ? (
          <div className="w-8 h-4 flex items-center justify-center">
            <div className="w-3.5 h-3.5 border-2 border-pup-maroon border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isEnabled}
              disabled={isSystem}
              onChange={() => onToggle(office.id, m.id, isEnabled, isSystem)}
              className="sr-only peer"
            />
            <div
              className={cn(
                "w-9 h-5 bg-gray-200 peer-focus:outline-hidden dark:bg-zinc-700 rounded-full peer",
                "peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:bg-zinc-900 dark:after:border-zinc-700",
                isSystem
                  ? "peer-checked:bg-blue-500 opacity-60 cursor-not-allowed"
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

  return (
    <tr className="hover:bg-gray-50/40 dark:hover:bg-white/2 transition-colors">
      <td className="p-4 align-top">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-7 w-7 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 dark:text-zinc-400 text-xs shrink-0">
            <i className={m.icon || "ti ti-cube"}></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-gray-900 dark:text-zinc-50">
                {m.name}
              </span>
              {isSystem && (
                <span className="bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-sm">
                  System
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 max-w-md">
              {m.description || "No description provided."}
            </p>
          </div>
        </div>
      </td>

      {offices.map((o) => {
        const toggleKey = `${o.id}-${m.id}`
        const isToggling = toggling[toggleKey]
        const enabled = isSystem || Boolean(assignments[o.id]?.[m.id]?.enabled)

        return (
          <td key={o.id} className="p-4 text-center align-middle">
            <div className="inline-flex items-center justify-center">
              {isToggling ? (
                <div className="w-8 h-4 flex items-center justify-center">
                  <div className="w-3.5 h-3.5 border-2 border-pup-maroon border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={isSystem}
                    onChange={() => onToggle(o.id, m.id, enabled, isSystem)}
                    className="sr-only peer"
                  />
                  <div
                    className={cn(
                      "w-8 h-4 bg-gray-200 peer-focus:outline-hidden dark:bg-zinc-700 rounded-full peer",
                      "peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:after:bg-zinc-900 dark:after:border-zinc-700",
                      isSystem
                        ? "peer-checked:bg-blue-500 opacity-60 cursor-not-allowed"
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
