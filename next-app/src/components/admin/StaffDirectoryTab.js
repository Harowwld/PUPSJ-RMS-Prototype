"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import DirectoryTableSkeleton from "@/components/systemadmin/skeletons/DirectoryTableSkeleton"
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
import { RefreshButton } from "@/components/shared/RefreshButton"
import { cn } from "@/lib/utils"
import React from "react"
import { Select } from "@/components/ui/select"

const formatLastLoginDate = (dateStr) => {
  if (!dateStr || dateStr === "—") return "—"
  try {
    const parts = dateStr.split("/")
    if (parts.length === 3) {
      const month = parseInt(parts[0]) - 1
      const day = parseInt(parts[1])
      const year = parseInt(parts[2])
      const date = new Date(year, month, day)
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric"
        })
      }
    }
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      })
    }
  } catch (e) {}
  return dateStr
}

const StaffTableRow = React.memo(({ 
  s, 
  isCurrentUser, 
  isSelected, 
  active, 
  isArchived, 
  toggleSelect, 
  onEditUser, 
  onRestoreUser, 
  onDeleteUser, 
  activeTab 
}) => {
  const router = useRouter()
  return (
    <tr
      onClick={(e) => !isCurrentUser && toggleSelect(s.id, e)}
      className={cn(
        "group h-[52px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0 transition-all duration-fast hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 select-none",
        !isCurrentUser && "cursor-pointer",
        isSelected && "bg-blue-50/60 dark:bg-blue-950/20"
      )}
    >
      <td className="py-0 px-4 align-middle text-center">
        {!isCurrentUser && (
          <input
            type="checkbox"
            className={cn(
              "h-4 w-4 cursor-pointer rounded border border-gray-300 dark:border-white/10 transition-opacity",
              isSelected ? "opacity-100" : "opacity-50 group-hover:opacity-80"
            )}
            checked={isSelected}
            onChange={() => {}} // Controlled by tr onClick
          />
        )}
      </td>
      <td className="py-0 px-4 align-middle">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 text-[14px] font-medium text-[#111111] dark:text-zinc-50">
            <span className={cn("truncate", isCurrentUser && "font-semibold")}>
              {s.fname} {s.lname}
            </span>
          </div>
          <div className="truncate text-[12px] font-normal text-[#8E8E93] dark:text-zinc-500 mt-[2px]">
            {s.email}
          </div>
        </div>
      </td>
      <td className="py-0 px-4 align-middle text-[13px] font-normal text-[#111111] dark:text-zinc-300">
        {s.id}
      </td>
      <td className="py-0 px-4 align-middle">
        <div className={cn(
          "inline-flex w-fit items-center justify-center rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium tracking-[0.04em]",
          s.role === "SystemAdmin" || s.role === "SuperAdmin"
            ? "bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
            : s.role === "Admin"
              ? "bg-[#FEE2E2] text-[#991B1B] dark:bg-red-950/40 dark:text-red-400"
              : "bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/40 dark:text-amber-400"
        )}>
          {s.role === "SuperAdmin" || s.role === "SystemAdmin" ? "System Admin" : s.role}
        </div>
      </td>
      <td className="py-0 px-4 align-middle">
        {s.totp_enabled ? (
          <span className="text-[13px] font-normal text-emerald-600 dark:text-emerald-400">
            2FA Enabled
          </span>
        ) : (
          <span className="text-[13px] font-normal text-[#8E8E93] dark:text-zinc-500">
            Off
          </span>
        )}
      </td>
      <td className="py-0 px-4 align-middle">
        {(!active.relative && active.date === "—") ? (
          <div className="text-[13px] font-normal text-[#C7C7CC] dark:text-zinc-600">
            Never active
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#111111] dark:text-zinc-100">
              {active.relative === "Active Now" && (
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></div>
              )}
              {active.relative || formatLastLoginDate(active.date)}
            </div>
            {active.relative && (
              <div className="text-[12px] font-normal text-[#8E8E93] dark:text-zinc-500 mt-[2px]">
                {formatLastLoginDate(active.date)}
              </div>
            )}
          </div>
        )}
      </td>
      <td className="py-0 px-4 align-middle text-right">
        <div
          className="flex items-center justify-end gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {isCurrentUser ? (
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
              {activeTab === "active" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onEditUser(s.id)}
                      aria-label="Edit Staff Member"
                      className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                    >
                      <i className="ph-bold ph-pencil-simple text-[16px]"></i>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Edit Staff</TooltipContent>
                </Tooltip>
              )}

              {activeTab === "archived" ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onRestoreUser(s.id)}
                      aria-label="Restore Staff Member"
                      className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                    >
                      <i className="ph-bold ph-archive-restore text-[16px]"></i>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Restore Staff</TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onDeleteUser(s.id)}
                      aria-label="Archive Staff Member"
                      className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                    >
                      <i className="ph-bold ph-archive text-[16px]"></i>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Archive Staff</TooltipContent>
                </Tooltip>
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
  if (sortBy !== column) {
    return <i className="ph-bold ph-caret-up-down ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"></i>
  }
  return sortOrder === "ASC" ? (
    <i className="ph-bold ph-caret-up ml-1 text-[12px] text-gray-400"></i>
  ) : (
    <i className="ph-bold ph-caret-down ml-1 text-[12px] text-gray-400"></i>
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
  onBulkRestore,
  onSwitchView,
  onRefresh,
}) {
  const [activeTab, setActiveTab] = useState("active")
  const [localSearch, setLocalSearch] = useState("")

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [jumpPage, setJumpPage] = useState("1")
  const [lastSelectedId, setLastSelectedId] = useState(null)

  const hasActiveFilters = localSearch !== "" || roleFilter !== "All";

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
      // Exclude System Admin and Super Admin from admin-side staff directory
      if (s.role === "SystemAdmin" || s.role === "SuperAdmin") return false

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

  const [sortBy, setSortBy] = useState("id")
  const [sortOrder, setSortOrder] = useState("ASC")

  const handleSort = (column) => {
    if (sortBy === column) {
      if (sortOrder === "ASC") {
        setSortOrder("DESC")
      } else {
        setSortBy("id")
        setSortOrder("ASC")
      }
    } else {
      setSortBy(column)
      setSortOrder("ASC")
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
      } else if (sortBy === "id") {
        return sortOrder === "ASC"
          ? a.id.localeCompare(b.id, undefined, { numeric: true })
          : b.id.localeCompare(a.id, undefined, { numeric: true })
      } else if (sortBy === "totp_enabled") {
        valA = a.totp_enabled ? 1 : 0
        valB = b.totp_enabled ? 1 : 0
      } else if (typeof valA === "string") {
        valA = valA.toLowerCase()
        valB = (valB || "").toLowerCase()
      }

      if (valA < valB) return sortOrder === "ASC" ? -1 : 1
      if (valA > valB) return sortOrder === "ASC" ? 1 : -1
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
    <TooltipProvider delayDuration={200}>
      <div
        className="font-inter w-full flex flex-1 flex-col h-full min-h-0 gap-6 focus:outline-none animate-fade-up"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
      {/* Main Table Card with Header, Toolbar & Active Filter Chips */}
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
        <PageHeader
          icon="ph-users"
          title={
            <div className="flex items-center gap-[6px]">
              <span>Staff Directory</span>
              {activeTab === "archived" && (
                <span className="text-[12px] font-normal text-emerald-600 dark:text-emerald-400">
                  · Restore Mode
                </span>
              )}
            </div>
          }
          description="Manage system staff and administrative access."
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex items-center gap-6">
              <RefreshButton
                onRefresh={onRefresh}
                isLoading={isLoading}
                title="Refresh Staff Directory"
              />

              <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />

              <Button
                onClick={() => onSwitchView("create")}
                disabled={activeTab === "archived" || isLoading}
                className="flex h-10 items-center justify-center rounded-xl! btn-brand-red text-white font-semibold text-xs active:scale-95 disabled:opacity-50 transition-all cursor-pointer px-5 shadow-xs"
              >
                Add Staff
              </Button>
            </div>
          }
        />

        {/* Navigation Toolbar */}
        <div className="border-t border-gray-100 dark:border-white/10 p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
          {/* Left: Active vs Archived Tabs */}
          <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-gray-200/60 dark:border-white/5 shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("active")}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                activeTab === "active"
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
              )}
            >
              Active ({staffData.filter((s) => s.status !== "Archived" && s.role !== "SystemAdmin" && s.role !== "SuperAdmin").length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("archived")}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                activeTab === "archived"
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
              )}
            >
              Archived ({staffData.filter((s) => s.status === "Archived" && s.role !== "SystemAdmin" && s.role !== "SuperAdmin").length})
            </button>
          </div>

          {/* Right: Search & Role Filter */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-64 min-w-[200px]">
              <i className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 text-xs" />
              <Input
                type="text"
                placeholder="Search name, email or ID..."
                className="h-10 pl-9 rounded-xl text-xs font-normal border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 placeholder:text-gray-400"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="w-40">
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                disabled={isLoading}
                className="h-10 rounded-xl text-xs font-semibold border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200"
              >
                <option value="All">All Roles</option>
                <option value="Admin">Administrators</option>
                <option value="Staff">Regular Staff</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Active Filter Chips Row */}
        {hasActiveFilters && (
          <div className="flex-none border-t border-gray-100 dark:border-white/10 bg-white dark:bg-card px-6 py-3 animate-in fade-in slide-in-from-top-1 duration-normal">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500">
                Active filters:
              </span>
              {localSearch && (
                <div className="flex items-center gap-[6px] rounded-lg bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                  Search: {localSearch}
                  <button
                    onClick={() => { 
                      setLocalSearch(""); 
                      setSearch("");
                      setCurrentPage(1); 
                    }}
                    className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                  >
                    ×
                  </button>
                </div>
              )}
              {roleFilter !== "All" && (
                <div className="flex items-center gap-[6px] rounded-lg bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                  Role: {roleFilter === "Admin" ? "Administrators" : roleFilter === "Staff" ? "Regular Staff" : roleFilter}
                  <button
                    onClick={() => { setRoleFilter("All"); setCurrentPage(1); }}
                    className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                  >
                    ×
                  </button>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLocalSearch("")
                  setSearch("")
                  setRoleFilter("All")
                  setCurrentPage(1)
                }}
                className="h-auto text-[12px] font-medium text-gray-400 dark:text-zinc-500 border-0 bg-transparent hover:bg-transparent shadow-none p-0 hover:text-red-600 dark:hover:text-red-500 transition-colors cursor-pointer"
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Content Area: Loading / Error / Table */}
        {isLoading ? (
          <div className="p-6 border-t border-gray-100 dark:border-white/10">
            <DirectoryTableSkeleton rowCount={8} />
          </div>
        ) : error ? (
          <div className="p-6 border-t border-gray-100 dark:border-white/10">
            <Empty className="flex h-[320px] flex-col items-center justify-center border-0 text-center text-gray-500 dark:text-zinc-400">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
                  <i className="ph-duotone ph-warning-circle text-xl text-pup-maroon dark:text-primary" />
                </EmptyMedia>
                <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                  Could not load personnel data
                </EmptyTitle>
                <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600 dark:text-zinc-300">
                  {error}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <div className="w-full flex flex-col flex-1 min-h-0 border-t border-gray-100 dark:border-white/10">
            <div className="w-full overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 border-b-[0.5px] border-black/10 dark:border-white/10 bg-white dark:bg-card">
                  <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                    <th className="w-16 p-4 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer rounded border border-gray-300 dark:border-white/10"
                        checked={
                          paginatedStaff.some(
                            (s) => s.id !== currentUserId
                          ) &&
                          paginatedStaff
                             .filter((s) => s.id !== currentUserId)
                             .every((s) => selectedIds.has(s.id))
                        }
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        disabled={
                          paginatedStaff.length === 0 ||
                          paginatedStaff.every(
                            (s) => s.id === currentUserId
                          )
                        }
                      />
                    </th>
                    <th className="p-4 min-w-[280px]">
                      <button
                        onClick={() => handleSort("fname")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                          sortBy === "fname" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                        )}
                      >
                        Staff Name{" "}
                        <SortIndicator
                          column="fname"
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                        />
                      </button>
                    </th>
                    <th className="w-48 p-4">
                      <button
                        onClick={() => handleSort("id")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                          sortBy === "id" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                        )}
                      >
                        Staff ID{" "}
                        <SortIndicator
                          column="id"
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                        />
                      </button>
                    </th>
                    <th className="w-40 p-4">
                      <button
                        onClick={() => handleSort("role")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                          sortBy === "role" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                        )}
                      >
                        Role{" "}
                        <SortIndicator
                          column="role"
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                        />
                      </button>
                    </th>
                    <th className="w-36 p-4">
                      <button
                        onClick={() => handleSort("totp_enabled")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                          sortBy === "totp_enabled" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                        )}
                      >
                        2FA Status{" "}
                        <SortIndicator
                          column="totp_enabled"
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                        />
                      </button>
                    </th>
                    <th className="w-56 p-4">
                      <button
                        onClick={() => handleSort("last_active")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                          sortBy === "last_active" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                        )}
                      >
                        Last Login{" "}
                        <SortIndicator
                          column="last_active"
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                        />
                      </button>
                    </th>
                    <th className="w-32 p-4 text-right text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-transparent">
                  {filteredStaff.length === 0 ? (
                    <tr className="border-0 hover:bg-transparent">
                      <td colSpan={7} className="p-12 text-center">
                        <Empty className="flex h-[450px] flex-col items-center justify-center border-0 bg-transparent text-center">
                          <EmptyHeader className="flex flex-col items-center gap-0">
                            <div className="relative mb-6">
                              <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                              <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                                <i className={activeTab === "archived" && !hasActiveFilters && search === "" ? "ph-archive" : "ph-magnifying-glass"}></i>
                              </EmptyMedia>
                            </div>
                            <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                              {hasActiveFilters || search !== "" ? "No Matches Found" : (activeTab === "archived" ? "No Archived Personnel Found" : "No Personnel Found")}
                            </EmptyTitle>
                            <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                              {hasActiveFilters || search !== ""
                                ? "Try adjusting your search filters to find what you're looking for."
                                : (activeTab === "archived" ? "There are currently no archived personnel records in the system." : "There are currently no personnel records in the system.")}
                            </EmptyDescription>
                            {hasActiveFilters || search !== "" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setLocalSearch("")
                                  setSearch("")
                                  setRoleFilter("All")
                                  setCurrentPage(1)
                                }}
                                className="mt-6 flex h-10 items-center justify-center rounded-xl! border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-6 text-xs font-semibold text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs active:scale-95 cursor-pointer"
                              >
                                <i className="ph-bold ph-arrow-counter-clockwise mr-2"></i>
                                Clear Search
                              </Button>
                            ) : (
                              activeTab === "active" && staffData.filter(s => s.status !== "Archived").length === 0 && (
                                <Button
                                  onClick={() => onSwitchView("create")}
                                  className="mt-6 flex h-10 items-center justify-center rounded-xl! btn-brand-red px-6 text-xs font-semibold text-white shadow-xs cursor-pointer active:scale-95 transition-all"
                                >
                                  Register New Staff
                                </Button>
                              )
                            )}
                          </EmptyHeader>
                        </Empty>
                      </td>
                    </tr>
                  ) : (
                    paginatedStaff.map((s) => (
                      <StaffTableRow
                        key={s.id}
                        s={s}
                        isCurrentUser={s.id === currentUserId}
                        isSelected={selectedIds.has(s.id)}
                        active={formatRelativeTime(s.last_active)}
                        isArchived={s.status === "Archived"}
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
              <div className="flex items-center justify-between border-t border-gray-100 bg-white p-6 px-8 dark:border-white/10 dark:bg-card mt-auto">
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-6 text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                    <span>
                      Showing {paginatedStaff.length} of {filteredStaff.length}
                    </span>
                    <div className="flex items-center gap-1.5 border-l border-gray-200 pl-6 dark:border-white/10">
                      <span className="text-[12px] text-gray-400 dark:text-zinc-500">Rows:</span>
                      <div className="flex items-center gap-1">
                        {[10, 20, 50, 100].map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => {
                              setItemsPerPage(size)
                              setCurrentPage(1)
                            }}
                            className={`px-2 py-0.5 rounded-[4px] text-[12px] font-normal cursor-pointer transition-colors border-0 ${
                              itemsPerPage === size
                                ? "bg-gray-100 text-[#111111] font-medium dark:bg-white/10 dark:text-zinc-50"
                                : "bg-transparent text-gray-450 dark:text-zinc-550 hover:text-gray-700 dark:hover:text-zinc-300"
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <button
                    disabled={displayPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 bg-transparent text-[12px] font-normal text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
                  >
                    Prev
                  </button>

                  <div className="flex h-8 min-w-[32px] items-center justify-center rounded-[6px] border border-gray-200/80 bg-white px-2.5 text-[12px] font-medium text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-100">
                    {displayPage}
                  </div>

                  <button
                    disabled={displayPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 bg-transparent text-[12px] font-normal text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {selectedIds.size > 1 && (
        <FloatingActionBar
          selectedCount={selectedIds.size}
          selectionStatus="Selected Personnel"
          onCancel={() => onSelectionChange(new Set())}
          customContent={
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onSelectionChange(new Set())}
                className="h-auto text-[13px] font-normal text-[#8E8E93] hover:text-[#111111] dark:hover:text-white bg-transparent hover:bg-transparent border-0 p-0 shadow-none cursor-pointer"
              >
                Deselect All
              </button>

              {activeTab === "active" ? (
                <Button
                  size="sm"
                  onClick={() => {
                    onBulkArchive(Array.from(selectedIds))
                  }}
                  className="flex h-[36px] px-5 items-center justify-center rounded-xl btn-brand-red text-[13px] font-medium text-white active:scale-95 transition-all dark:shadow-none cursor-pointer"
                >
                  Archive
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    onBulkRestore(Array.from(selectedIds))
                  }}
                  className="flex h-[36px] px-5 items-center justify-center rounded-xl btn-brand-green text-[13px] font-medium text-white active:scale-95 transition-all dark:shadow-none cursor-pointer"
                >
                  Restore
                </Button>
              )}
            </div>
          }
        />
      )}
    </div>
    </TooltipProvider>
  )
}




