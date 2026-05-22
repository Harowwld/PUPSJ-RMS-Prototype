"use client"

import { useMemo, useState, useEffect, useCallback } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  formatPHDateTime,
  formatPHDateTimeParts,
  formatRelativeTime,
} from "@/lib/timeFormat"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty"
import { Card, CardContent } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import PageHeader from "@/components/shared/PageHeader"
import FloatingActionBar from "@/components/shared/FloatingActionBar"
import { cn } from "@/lib/utils"
import React from "react"
import { Select } from "@/components/ui/select"

const StaffTableRow = React.memo(({ 
  s, 
  isCurrentUser, 
  isSelected, 
  active, 
  isArchived, 
  initials, 
  toggleSelect, 
  onEditUser, 
  onRestoreUser, 
  onDeleteUser, 
  activeTab 
}) => {
  return (
    <tr
      onClick={(e) => !isCurrentUser && toggleSelect(s.id, e)}
      className={cn(
        "transition-colors hover:bg-gray-50",
        !isCurrentUser && "cursor-pointer",
        isCurrentUser && "bg-red-50/30",
        isArchived && "bg-gray-50/50",
        isSelected && "bg-amber-50/40 dark:bg-amber-900/20"
      )}
    >
      <td className="p-3 text-center">
        <input
          type="checkbox"
          className="h-4 w-4 cursor-pointer rounded border border-gray-300 text-pup-maroon accent-pup-maroon focus:ring-pup-maroon disabled:opacity-20"
          checked={isSelected}
          onChange={() => {}} // Controlled by tr onClick
          disabled={isCurrentUser}
        />
      </td>
      <td className="p-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-transform group-hover:scale-110",
              isArchived
                ? "border-gray-200 bg-gray-50 text-gray-500"
                : "border-red-100 bg-red-50 text-pup-maroon shadow-sm"
            )}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <span className="truncate">
                {s.fname} {s.lname}
              </span>
              {isCurrentUser && (
                <Badge className="h-4 bg-pup-maroon text-[9px] font-black uppercase">
                  You
                </Badge>
              )}
            </div>
            <div className="truncate text-xs font-medium text-gray-500">
              {s.email}
            </div>
          </div>
        </div>
      </td>
      <td className="p-3 text-[11px] font-bold text-gray-600 whitespace-nowrap">
        {s.id}
      </td>
      <td className="p-3">
        <Badge
          variant="outline"
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-black uppercase shadow-xs",
            s.role === "Admin" ||
              s.role === "SuperAdmin"
              ? "border-red-200 bg-red-50 text-pup-maroon"
              : "border-amber-200 bg-amber-50 text-amber-700"
          )}
        >
          {s.role}
        </Badge>
      </td>
      <td className="p-3">
        {s.totp_enabled ? (
          <Badge className="gap-1 rounded-full border-emerald-200 bg-emerald-50 text-[10px] font-black text-emerald-700 uppercase shadow-xs">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <i className="ph-bold ph-check-circle text-[10px]"></i>
            ENABLED
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="gap-1 rounded-full border-gray-200 bg-gray-50 text-[10px] font-black text-gray-500 uppercase shadow-xs"
          >
            <i className="ph-bold ph-warning-circle text-[10px]"></i>
            DISABLED
          </Badge>
        )}
      </td>
      <td className="p-3">
        <div className={cn(
          "flex items-center gap-1.5 text-[11px] font-bold uppercase",
          !active.relative && active.date === "—" ? "text-gray-400 font-medium" : "text-gray-900"
        )}>
          {active.relative === "Active Now" && (
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></div>
          )}
          {active.relative || (active.date === "—" ? "Never active" : active.date)}
        </div>
        {active.relative && (
          <div className="text-[10px] text-gray-500 opacity-70 mt-0.5">
            {active.date}
          </div>
        )}
      </td>
      <td className="p-3 text-right">
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {isCurrentUser ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = "/account")}
              className="h-8 w-[210px] gap-2 rounded-brand border border-gray-300 bg-white px-3 text-[10px] font-black tracking-wider text-gray-600 uppercase shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50/30 hover:text-pup-maroon active:scale-95"
            >
              <i className="ph-bold ph-user-circle text-base"></i>
              MANAGE MY ACCOUNT
            </Button>
          ) : (
            <div className="flex w-[210px] items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditUser(s.id)}
                className="h-8 flex-1 gap-1.5 rounded-brand border border-gray-300 bg-white px-0 text-[10px] font-black tracking-wider text-gray-600 uppercase shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50/30 hover:text-pup-maroon active:scale-95"
              >
                <i className="ph-bold ph-pencil-simple text-base"></i>
                EDIT
              </Button>

              {activeTab === "archived" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRestoreUser(s.id)}
                  className="h-8 flex-1 gap-1.5 rounded-brand border border-gray-300 bg-white px-0 text-[10px] font-black tracking-wider text-emerald-600 uppercase shadow-sm transition-colors hover:border-emerald-600 hover:bg-emerald-50/30 hover:text-emerald-700 active:scale-95"
                >
                  <i className="ph-bold ph-arrow-counter-clockwise text-base"></i>
                  RESTORE
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDeleteUser(s.id)}
                  className="h-8 flex-1 gap-1.5 rounded-brand border border-gray-300 bg-white px-0 text-[10px] font-black tracking-wider text-red-600 uppercase shadow-sm transition-colors hover:border-red-600 hover:bg-red-50/30 hover:text-red-700 active:scale-95"
                >
                  <i className="ph-bold ph-archive text-base"></i>
                  ARCHIVE
                </Button>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  )
})

StaffTableRow.displayName = "StaffTableRow"

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column)
    return (
      <i className="ph-bold ph-caret-up-down ml-1 text-[11px] opacity-30"></i>
    )
  return sortOrder === "asc" ? (
    <i className="ph-bold ph-caret-up ml-1 text-[11px] text-pup-maroon"></i>
  ) : (
    <i className="ph-bold ph-caret-down ml-1 text-[11px] text-pup-maroon"></i>
  )
}

export default function StaffDirectoryTab({
  staffData,
  isLoading = false,
  error = null,
  currentUserId,
  search,
  setSearch,
  roleFilter,
  setRoleFilter,
  selectedIds,
  onSelectionChange,
  onEditUser,
  onRestoreUser,
  onDeleteUser,
  onBulkArchive,
  onExportData,
  onSwitchView,
}) {
  const [activeTab, setActiveTab] = useState("active")
  const [localSearch, setLocalSearch] = useState("")

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [jumpPage, setJumpPage] = useState("1")
  const [lastSelectedId, setLastSelectedId] = useState(null)

  // Sync local search with external search prop initially
  useEffect(() => {
    if (search && !localSearch) setLocalSearch(search)
  }, [])

  // Debounce search update
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(localSearch)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(handler)
  }, [localSearch, setSearch])

  // Load persisted search on mount
  useEffect(() => {
    const savedSearch = localStorage.getItem("staffDir_search")
    if (savedSearch !== null) setLocalSearch(savedSearch)
  }, [])

  // Persist search when it changes
  useEffect(() => {
    localStorage.setItem("staffDir_search", search)
  }, [search])

  const filteredStaff = useMemo(() => {
    const q = search.toLowerCase()
    return staffData.filter((s) => {
      const matchesSearch =
        `${s.fname} ${s.lname}`.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q)

      const matchesRole = roleFilter === "All" || s.role === roleFilter

      // Filter by tab status
      const isArchived = s.status === "Archived"
      const matchesTab = activeTab === "active" ? !isArchived : isArchived

      return matchesSearch && matchesRole && matchesTab
    })
  }, [search, roleFilter, staffData, activeTab])

  const stats = useMemo(() => {
    const total = staffData.length
    const authCount = staffData.filter((s) => s.totp_enabled).length
    const authRate = total > 0 ? Math.round((authCount / total) * 100) : 0

    return {
      total,
      authCount,
      authRate,
    }
  }, [staffData])

  const [sortBy, setSortBy] = useState("fname")
  const [sortOrder, setSortOrder] = useState("asc")

  const handleSort = (column) => {
    if (sortBy === column) {
      if (sortOrder === "asc") {
        setSortOrder("desc")
      } else {
        setSortBy("fname")
        setSortOrder("asc")
      }
    } else {
      setSortBy(column)
      setSortOrder("asc")
    }
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage) || 1

  // Cap current page if filtering reduces dataset below current page
  const displayPage = Math.min(currentPage, totalPages)

  const sortedStaff = useMemo(() => {
    return [...filteredStaff].sort((a, b) => {
      let valA = a[sortBy]
      let valB = b[sortBy]

      if (sortBy === "fname") {
        valA = `${a.fname} ${a.lname}`.toLowerCase()
        valB = `${b.fname} ${b.lname}`.toLowerCase()
      } else if (typeof valA === "string") {
        valA = valA.toLowerCase()
        valB = (valB || "").toLowerCase()
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1
      if (valA > valB) return sortOrder === "asc" ? 1 : -1
      return 0
    })
  }, [filteredStaff, sortBy, sortOrder])

  const paginatedStaff = useMemo(() => {
    const start = (displayPage - 1) * itemsPerPage
    return sortedStaff.slice(start, start + itemsPerPage)
  }, [sortedStaff, displayPage, itemsPerPage])

  useEffect(() => {
    setJumpPage(String(displayPage))
  }, [displayPage])

  // Clear selection when changing tabs or pages
  useEffect(() => {
    onSelectionChange(new Set())
    setLastSelectedId(null)
  }, [activeTab, displayPage, onSelectionChange])

  const toggleSelectAll = (checked) => {
    if (checked) {
      onSelectionChange(
        new Set(
          paginatedStaff
            .filter((s) => s.id !== currentUserId)
            .map((s) => s.id)
        )
      )
    } else {
      onSelectionChange(new Set())
    }
    setLastSelectedId(null)
  }

  const toggleSelect = (id, event) => {
    const isSelected = selectedIds.has(id)

    if (event?.shiftKey && lastSelectedId) {
      if (isSelected) {
        if (selectedIds.size > 1) {
          // If Shift+Clicking an already selected item among multiple, deselect others
          onSelectionChange(new Set([id]))
          setLastSelectedId(id)
        } else {
          // If Shift+Clicking the ONLY selected item, deselect it completely
          onSelectionChange(new Set())
          setLastSelectedId(null)
        }
        return
      }

      // Normal Shift+Click Range Selection
      const currentIdx = paginatedStaff.findIndex((s) => s.id === id)
      const lastIdx = paginatedStaff.findIndex((s) => s.id === lastSelectedId)

      if (currentIdx !== -1 && lastIdx !== -1) {
        const start = Math.min(currentIdx, lastIdx)
        const end = Math.max(currentIdx, lastIdx)
        const idsInRange = paginatedStaff
          .slice(start, end + 1)
          .filter((s) => s.id !== currentUserId)
          .map((s) => s.id)

        const next = new Set(selectedIds)
        idsInRange.forEach((rangeId) => next.add(rangeId))
        
        onSelectionChange(next)
        setLastSelectedId(id)
        return
      }
    }

    // Plain Click: Additive Toggle
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
      if (lastSelectedId === id) setLastSelectedId(null)
    } else {
      next.add(id)
      setLastSelectedId(id)
    }
    onSelectionChange(next)
  }

  const handleJumpPage = (e) => {
    if (e.key === "Enter" || e.type === "blur") {
      const val = parseInt(jumpPage)
      if (!isNaN(val) && val >= 1 && val <= totalPages) {
        setCurrentPage(val)
      } else {
        setJumpPage(String(displayPage))
      }
    }
  }

  const handleKeyDown = useCallback(
    (e) => {
      // Only paginate if not typing in an input/select
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return

      if (e.key === "ArrowLeft") {
        setCurrentPage((p) => Math.max(1, p - 1))
      } else if (e.key === "ArrowRight") {
        setCurrentPage((p) => Math.min(totalPages, p + 1))
      }
    },
    [totalPages]
  )

  const startItem = (displayPage - 1) * itemsPerPage + 1
  const endItem = Math.min(displayPage * itemsPerPage, filteredStaff.length)

  return (
    <div
      className="animate-fade-in font-inter flex h-full w-full flex-col gap-4 focus:outline-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {isLoading ? (
        <div className="flex flex-1 flex-col gap-4">
          {/* Top Metric Row Skeleton */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="flex h-24 flex-col justify-center gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-20" />
              </div>
            ))}
          </div>

          <Card className="flex flex-1 flex-col overflow-hidden rounded-brand border border-gray-300 bg-white shadow-sm">
            <PageHeader
              icon="ph-users-three"
              title="Personnel Directory"
              description="Manage registrar personnel and administrative access credentials."
            />
            <CardContent className="flex min-h-0 flex-1 flex-col p-6 pt-2">
              {/* Tab & Toolbar Skeleton */}
              <div className="mb-6 flex flex-col gap-4">
                <Skeleton className="h-10 w-48 rounded-lg" />
                <div className="flex flex-wrap items-center gap-3">
                  <Skeleton className="h-10 min-w-[200px] flex-1 rounded-brand" />
                  <Skeleton className="h-10 w-40 rounded-brand" />
                </div>
              </div>

              {/* Table Skeleton */}
              <div className="flex-1 overflow-hidden rounded-brand border border-gray-200">
                <div className="h-10 border-b border-gray-200 bg-gray-50/50" />
                <div className="divide-y divide-gray-100">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4">
                      <div className="flex flex-1 items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <Skeleton className="hidden h-4 w-20 lg:block" />
                      <Skeleton className="hidden h-6 w-20 rounded-full lg:block" />
                      <Skeleton className="hidden h-6 w-24 rounded-full lg:block" />
                      <Skeleton className="hidden h-4 w-28 lg:block" />
                      <div className="flex gap-2">
                        <Skeleton className="h-9 w-16 rounded-brand" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : error ? (
        <Card className="flex flex-1 flex-col overflow-hidden rounded-brand border border-gray-300 bg-white shadow-sm">
          <CardContent className="flex min-h-0 flex-1 flex-col p-6">
            <Empty className="flex h-[320px] flex-col items-center justify-center border-0 text-center text-gray-500">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                  <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon" />
                </EmptyMedia>
                <EmptyTitle className="text-lg font-bold text-gray-900">
                  Could not load personnel data
                </EmptyTitle>
                <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600">
                  {error}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-1 flex-col gap-4">
          <Card className="flex flex-1 flex-col overflow-hidden rounded-brand border border-gray-300 bg-white shadow-sm">
            <PageHeader
              icon="ph-users-three"
              title="Personnel Directory"
              description="Manage registrar personnel and administrative access credentials."
              actions={
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onExportData(sortedStaff)}
                    className="flex h-10 w-32 items-center justify-center gap-1.5 rounded-brand border border-gray-300 text-[10px] font-bold text-gray-600 shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95"
                  >
                    <i className="ph-bold ph-file-csv text-base"></i>
                    EXPORT CSV
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onSwitchView("create")}
                    className="h-10 rounded-brand bg-linear-to-b from-red-800 to-pup-maroon border-4 border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md px-5 text-xs font-bold text-white shadow-sm active:scale-95 transition-all"
                  >
                    <i className="ph-bold ph-user-plus mr-1.5"></i>
                    ADD PERSONNEL
                  </Button>
                </div>
              }
            />

            <CardContent className="font-inter flex min-h-0 flex-1 flex-col bg-white p-6 pt-4">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <div className="mb-6 flex shrink-0 select-none flex-col items-center justify-between gap-4 sm:flex-row">
                  <div className="flex w-full items-center sm:w-auto">
                    <div className="flex w-full cursor-default items-center overflow-hidden rounded-brand border border-gray-200 bg-gray-100/80 p-0.5 backdrop-blur-sm sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setActiveTab("active")}
                        className={`group flex h-11 w-full cursor-pointer items-center justify-center gap-3 px-8 text-sm font-bold transition-all duration-200 active:scale-[0.98] sm:w-[240px] ${
                          activeTab === "active"
                            ? "rounded-l-[calc(var(--radius)-2px)] rounded-r-none bg-white text-pup-maroon shadow-sm ring-1 ring-black/5"
                            : "rounded-l-[calc(var(--radius)-2px)] rounded-r-none text-gray-500 hover:bg-white/50 hover:text-gray-700"
                        }`}
                      >
                        <i
                          className={`ph-bold ph-users-three ${activeTab === "active" ? "" : "text-gray-400 group-hover:text-gray-600"}`}
                        ></i>
                        <span className="whitespace-nowrap tracking-wide">ACTIVE DIRECTORY</span>
                        <span
                          className={cn(
                            "flex h-5 min-w-[26px] items-center justify-center rounded-full px-2 text-[10px] font-black transition-all duration-300",
                            activeTab === "active"
                              ? "bg-pup-maroon text-white shadow-sm ring-2 ring-red-50/50"
                              : "bg-gray-200/60 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-700"
                          )}
                        >
                          {
                            staffData.filter((s) => s.status !== "Archived")
                              .length
                          }
                        </span>
                      </button>
                      <div className="h-6 w-px bg-gray-200/50" />
                      <button
                        type="button"
                        onClick={() => setActiveTab("archived")}
                        className={`group flex h-11 w-full cursor-pointer items-center justify-center gap-3 px-8 text-sm font-bold transition-all duration-200 active:scale-[0.98] sm:w-[240px] ${
                          activeTab === "archived"
                            ? "rounded-r-[calc(var(--radius)-2px)] rounded-l-none bg-white text-pup-maroon shadow-sm ring-1 ring-black/5"
                            : "rounded-r-[calc(var(--radius)-2px)] rounded-l-none text-gray-500 hover:bg-white/50 hover:text-gray-700"
                        }`}
                      >
                        <i
                          className={`ph-bold ph-archive ${activeTab === "archived" ? "" : "text-gray-400 group-hover:text-gray-600"}`}
                        ></i>
                        <span className="whitespace-nowrap tracking-wide">ARCHIVE VAULT</span>
                        <span
                          className={cn(
                            "flex h-5 min-w-[26px] items-center justify-center rounded-full px-2 text-[10px] font-black transition-all duration-300",
                            activeTab === "archived"
                              ? "bg-pup-maroon text-white shadow-sm ring-2 ring-red-50/50"
                              : "bg-gray-200/60 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-700"
                          )}
                        >
                          {
                            staffData.filter((s) => s.status === "Archived")
                              .length
                          }
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Integrated Summary Metrics Bar */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex min-w-[150px] select-none cursor-default items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-all hover:shadow-md">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-pup-maroon shadow-xs">
                        <i className="ph-duotone ph-users-four text-xl"></i>
                      </div>
                      <div>
                        <p className="mb-1 text-[9px] leading-none font-black tracking-widest text-gray-400 uppercase">
                          Personnel
                        </p>
                        <p className="text-base leading-tight font-black text-gray-900">
                          {stats.total?.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex min-w-[180px] select-none cursor-default items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-all hover:shadow-md">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-500 shadow-xs">
                        <i className="ph-duotone ph-shield-check text-xl"></i>
                      </div>
                      <div>
                        <p className="mb-1 text-[9px] leading-none font-black tracking-widest text-gray-400 uppercase">
                          2FA Adoption
                        </p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-base leading-tight font-black text-gray-900">
                            {stats.authRate}%
                          </p>
                          <span className="text-[10px] font-bold text-gray-400 opacity-70">
                            ({stats.authCount} verified)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-x-auto overflow-y-auto rounded-brand border border-gray-200 bg-white shadow-xs select-none">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
                      <tr className="text-left text-xs tracking-wider text-gray-600 uppercase">
                        <th className="w-12 p-3 text-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 cursor-pointer rounded border border-gray-300 text-pup-maroon accent-pup-maroon focus:ring-pup-maroon disabled:opacity-20"
                            checked={
                              paginatedStaff.some((s) => s.id !== currentUserId) &&
                              paginatedStaff
                                .filter((s) => s.id !== currentUserId)
                                .every((s) => selectedIds.has(s.id))
                            }
                            onChange={(e) => toggleSelectAll(e.target.checked)}
                            disabled={
                              paginatedStaff.length === 0 ||
                              paginatedStaff.every((s) => s.id === currentUserId)
                            }
                          />
                        </th>
                        <th className="p-3 font-bold">
                          <button
                            onClick={() => handleSort("fname")}
                            className="group flex items-center rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100 focus:outline-none"
                          >
                            Personnel Name{" "}
                            <SortIndicator
                              column="fname"
                              sortBy={sortBy}
                              sortOrder={sortOrder}
                            />
                          </button>
                        </th>
                        <th className="w-32 p-3 font-bold whitespace-nowrap">
                          <button
                            onClick={() => handleSort("id")}
                            className="group flex items-center rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100 focus:outline-none"
                          >
                            Staff ID{" "}
                            <SortIndicator
                              column="id"
                              sortBy={sortBy}
                              sortOrder={sortOrder}
                            />
                          </button>
                        </th>
                        <th className="w-28 p-3 font-bold">
                          <button
                            onClick={() => handleSort("role")}
                            className="group flex items-center rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100 focus:outline-none"
                          >
                            Role{" "}
                            <SortIndicator
                              column="role"
                              sortBy={sortBy}
                              sortOrder={sortOrder}
                            />
                          </button>
                        </th>
                        <th className="w-32 p-3 font-bold">2FA Status</th>
                        <th className="p-3 font-bold whitespace-nowrap">
                          <button
                            onClick={() => handleSort("last_active")}
                            className="group flex items-center rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100 focus:outline-none"
                          >
                            Last Login{" "}
                            <SortIndicator
                              column="last_active"
                              sortBy={sortBy}
                              sortOrder={sortOrder}
                            />
                          </button>
                        </th>
                        <th className="w-24 p-3 text-right font-bold">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredStaff.length === 0 ? (
                        <tr className="border-0 hover:bg-transparent">
                          <td colSpan={7} className="p-12 text-center">
                            <Empty className="flex h-[400px] flex-col items-center justify-center border-0 text-center text-gray-500">
                              <EmptyHeader className="flex flex-col items-center gap-0">
                                <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                                  <i className="ph-duotone ph-users-three text-3xl text-pup-maroon"></i>
                                </EmptyMedia>
                                <EmptyTitle className="text-lg font-bold text-gray-900">
                                  {activeTab === "active"
                                    ? "No personnel records"
                                    : "Archive vault is empty"}
                                </EmptyTitle>
                                <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600">
                                  {localSearch !== "" || roleFilter !== "All"
                                    ? `No personnel matches your current filters in the ${activeTab} directory.`
                                    : activeTab === "active"
                                      ? "Start by adding registrar personnel to manage access and credentials."
                                      : "Archived personnel records will appear here once they are moved from the active directory."}
                                </EmptyDescription>
                                {localSearch !== "" || roleFilter !== "All" ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setLocalSearch("")
                                      setSearch("")
                                      setRoleFilter("All")
                                      setCurrentPage(1)
                                    }}
                                    className="mt-4 flex items-center gap-2 rounded-brand border border-gray-300 px-4 text-[10px] font-bold text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50/30 hover:text-pup-maroon sm:text-xs"
                                  >
                                    <i className="ph-bold ph-x-circle"></i>
                                    CLEAR ALL FILTERS
                                  </Button>
                                ) : (
                                  activeTab === "active" && (
                                    <Button
                                      onClick={() => onSwitchView("create")}
                                      className="mt-4 flex h-10 items-center gap-2 rounded-brand bg-pup-maroon px-6 text-xs font-bold text-white shadow-sm transition-all hover:bg-red-900 active:scale-95"
                                    >
                                      <i className="ph-bold ph-user-plus"></i>
                                      REGISTER NEW PERSONNEL
                                    </Button>
                                  )
                                  )}
                                  </EmptyHeader>
                                  </Empty>
                                  </td>
                                  </tr>                      ) : (
                        paginatedStaff.map((s) => (
                          <StaffTableRow
                            key={s.id}
                            s={s}
                            isCurrentUser={s.id === currentUserId}
                            isSelected={selectedIds.has(s.id)}
                            active={formatRelativeTime(s.last_active)}
                            isArchived={s.status === "Archived"}
                            initials={`${s.fname?.[0] || ""}${s.lname?.[0] || ""}` || "?"}
                            toggleSelect={toggleSelect}
                            onEditUser={onEditUser}
                            onRestoreUser={onRestoreUser}
                            onDeleteUser={onDeleteUser}
                            activeTab={activeTab}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredStaff.length > 0 && (
                  <div className="-mx-6 mt-4 -mb-6 flex items-center justify-between rounded-b-brand border-t border-gray-100 bg-white p-6 px-8">
                    <div className="flex items-center gap-8 select-none cursor-default">
                      <div className="flex items-center gap-6 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                        <span>
                          Showing <strong className="text-gray-900">{paginatedStaff.length}</strong> out of{" "}
                          <strong className="text-gray-900">{filteredStaff.length}</strong>{" "}
                          {activeTab === "active" ? "Active" : "Archived"} Personnel
                        </span>

                        {filteredStaff.length > 10 && (
                          <div className="flex items-center gap-3 border-l border-gray-200/50 pl-6">
                            <span className="text-[10px] opacity-60">Rows:</span>
                            <Select
                              className="h-8 w-16 cursor-pointer rounded-brand border border-gray-300 bg-white px-2 text-[10px] font-bold text-gray-700 focus:ring-1 focus:ring-pup-maroon focus:outline-none transition-all hover:bg-gray-50"
                              value={itemsPerPage}
                              onChange={(e) => {
                                setItemsPerPage(Number(e.target.value))
                                setCurrentPage(1)
                              }}
                            >
                              <option value={10}>10</option>
                              <option value={20}>20</option>
                              <option value={50}>50</option>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>

                    {totalPages > 1 && (
                      <div className="flex shrink-0 items-center gap-3 select-none">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={displayPage <= 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className="h-10 rounded-brand border border-gray-300 bg-white px-5 text-[10px] font-black tracking-widest text-gray-500 uppercase shadow-sm transition-all hover:border-gray-300 hover:bg-red-50/30 hover:text-pup-maroon active:scale-95 disabled:opacity-30"
                        >
                          <i className="ph-bold ph-caret-left mr-2 text-base"></i>
                          PREV
                        </Button>
                        
                        <div className="flex h-9 min-w-[36px] cursor-default items-center justify-center rounded-brand border border-gray-200 bg-white px-3 text-[11px] font-black text-gray-900 shadow-sm">
                          {displayPage}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          disabled={displayPage >= totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className="h-10 rounded-brand border border-gray-300 bg-white px-5 text-[10px] font-black tracking-widest text-gray-500 uppercase shadow-sm transition-all hover:border-gray-300 hover:bg-red-50/30 hover:text-pup-maroon active:scale-95 disabled:opacity-30"
                        >
                          NEXT
                          <i className="ph-bold ph-caret-right ml-2 text-base"></i>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedIds.size > 0 && (
        <FloatingActionBar
          selectedCount={selectedIds.size}
          selectionStatus="Selected Personnel"
          onCancel={() => onSelectionChange(new Set())}
          customContent={
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelectionChange(new Set())}
                className="h-9 px-4 text-xs font-bold text-gray-500 uppercase transition-colors hover:bg-red-50/30 hover:text-pup-maroon"
              >
                DESELECT ALL
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const selectedStaff = staffData.filter((s) =>
                    selectedIds.has(s.id)
                  )
                  onExportData(selectedStaff)
                }}
                className="h-10 px-6 text-xs font-bold text-gray-700 uppercase shadow-lg shadow-gray-200/50 hover:bg-gray-200 active:scale-95 rounded-xl border border-gray-200"
              >
                <i className="ph-bold ph-file-csv mr-2 text-sm"></i>
                EXPORT SELECTED
              </Button>
              {activeTab === "active" && (
                <Button
                  size="sm"
                  onClick={() => {
                    onBulkArchive(Array.from(selectedIds))
                  }}
                  className="flex h-10 items-center gap-2 rounded-xl bg-linear-to-b from-red-800 to-pup-maroon border-4 border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md px-6 text-xs font-black text-white uppercase shadow-lg shadow-red-900/20 active:scale-95 transition-all"
                >
                  <i className="ph-bold ph-archive text-sm"></i>
                  ARCHIVE SELECTED
                </Button>
              )}
            </div>
          }
        />
      )}
    </div>
  )
}
