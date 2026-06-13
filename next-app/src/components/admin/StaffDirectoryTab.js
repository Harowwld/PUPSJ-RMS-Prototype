"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

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
        "group transition-all duration-200 hover:bg-gray-50/80 dark:bg-card dark:hover:bg-white/5 select-none",
        !isCurrentUser && "cursor-pointer",
        isCurrentUser && "bg-red-50 dark:bg-red-950/30",
        isSelected && "bg-amber-50 dark:bg-amber-950/40"
      )}
    >
      <td className="p-4 text-center">
        {!isCurrentUser && (
          <input
            type="checkbox"
            className="h-4 w-4 cursor-pointer rounded border border-gray-300 text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon disabled:opacity-20 dark:border-white/10 dark:text-primary"
            checked={isSelected}
            onChange={() => {}} // Controlled by tr onClick
          />
        )}
      </td>
      <td className="p-4">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-zinc-50 leading-tight">
            <span className="truncate">
              {s.fname} {s.lname}
            </span>
            {isCurrentUser && (
              <Badge className="h-4 bg-pup-maroon text-[8px] font-black dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-400">
                You
              </Badge>
            )}
          </div>
          <div className="truncate text-[10px] font-medium text-gray-500 dark:text-zinc-400 mt-0.5">
            {s.email}
          </div>
        </div>
      </td>
      <td className="p-4 text-xs font-bold tracking-tight text-gray-700 whitespace-nowrap dark:text-zinc-300">
        {s.id}
      </td>
      <td className="p-4">
        <div className={cn(
          "flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black  tracking-wider transition-all",
          s.role === "Admin" || s.role === "SuperAdmin"
            ? "border-red-500/30 bg-red-500/10 text-red-600 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-400"
            : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-400"
        )}>
          <i className={cn(
            "ph-bold text-[10px]",
            s.role === "Admin" || s.role === "SuperAdmin" ? "ph-shield-star" : "ph-user"
          )}></i>
          {s.role}
        </div>
      </td>
      <td className="p-4">
        {s.totp_enabled ? (
          <div className="flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black text-emerald-600 tracking-wider dark:text-emerald-400">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            2FA Enabled
          </div>
        ) : (
          <div className="flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[9px] font-black text-gray-400 tracking-wider dark:border-white/10 dark:bg-white/5 dark:text-zinc-500">
            <i className="ph-bold ph-warning-circle text-[10px]"></i>
            Off
          </div>
        )}
      </td>
      <td className="p-4">
        <div className={cn(
          "flex items-center gap-1.5 text-xs font-bold ",
          !active.relative && active.date === "—" ? "text-gray-400 dark:text-zinc-500 font-medium" : "text-gray-900 dark:text-zinc-50"
        )}>
          {active.relative === "Active Now" && (
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></div>
          )}
          {active.relative || (active.date === "—" ? "Never active" : active.date)}
        </div>
        {active.relative && (
          <div className="text-[10px] text-gray-500 font-medium opacity-70 mt-0.5 dark:text-zinc-400">
            {active.date}
          </div>
        )}
      </td>
      <td className="p-4 text-right">
        <div
          className="flex items-center justify-end gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {isCurrentUser ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/account")}
              className="h-9 w-full max-w-[140px] gap-2 rounded-brand border-gray-200 bg-white px-4 text-[10px] font-black tracking-widest text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 dark:bg-white/5 dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
            >
              <i className="ph-bold ph-user-circle text-base"></i>
              Account
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              {activeTab === "active" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onEditUser(s.id)}
                      className="h-9 w-9 rounded-brand border-gray-200 bg-white p-0 text-gray-400 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-pup-maroon dark:hover:text-red-500 dark:bg-white/5 dark:border-white/10 dark:text-zinc-500 dark:hover:text-primary dark:hover:bg-zinc-800 cursor-pointer active:scale-95"
                    >
                      <i className="ph-bold ph-pencil-simple text-base"></i>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-zinc-900 text-white border-zinc-800">
                    <p className="text-[10px] font-bold">Edit Personnel</p>
                    <p className="text-[9px] opacity-80">Modify account details and system role</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {activeTab === "archived" ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onRestoreUser(s.id)}
                      className="h-9 w-9 rounded-brand border-gray-200 bg-white p-0 text-emerald-600 shadow-sm transition-all hover:border-emerald-600 hover:bg-emerald-50 dark:bg-white/5 dark:border-white/10 dark:text-emerald-400 dark:hover:bg-emerald-900/20 cursor-pointer active:scale-95"
                    >
                      <i className="ph-bold ph-arrow-counter-clockwise text-base"></i>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-zinc-900 text-white border-zinc-800">
                    <p className="text-[10px] font-bold">Restore Account</p>
                    <p className="text-[9px] opacity-80">Reactivate access for this staff member</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onDeleteUser(s.id)}
                      className="h-9 w-9 rounded-brand border-gray-200 bg-white p-0 text-red-400 shadow-sm transition-all hover:border-red-600 hover:bg-red-50 dark:bg-white/5 dark:border-white/10 dark:text-red-400/90 dark:hover:bg-red-400/10 cursor-pointer active:scale-95"
                    >
                      <i className="ph-bold ph-archive text-base"></i>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-zinc-900 text-white border-zinc-800">
                    <p className="text-[10px] font-bold">Archive Profile</p>
                    <p className="text-[9px] opacity-80">Deactivate and hide from active directory</p>
                  </TooltipContent>
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
  if (sortBy !== column)
    return <i className="ph-bold ph-caret-up-down ml-1 text-[11px] opacity-40 transition-opacity group-hover:opacity-70 dark:opacity-30 dark:group-hover:opacity-60"></i>
  return sortOrder === "ASC" ? (
    <i className="ph-bold ph-caret-up ml-1 text-[11px] text-pup-maroon animate-in fade-in zoom-in duration-300 dark:text-primary"></i>
  ) : (
    <i className="ph-bold ph-caret-down ml-1 text-[11px] text-pup-maroon animate-in fade-in zoom-in duration-300 dark:text-primary"></i>
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
        className="font-inter w-full flex flex-col gap-6 focus:outline-none animate-fade-up"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
      {/* Card 1: Header & Control Toolbar */}
      <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
        <PageHeader
          icon="ph-users-three"
          title={
            <div className="flex items-center gap-2">
              Staff Directory
              {activeTab === "archived" && (
                <Badge className="border-red-100 bg-red-50 text-[10px] font-black text-red-700 dark:border-white/10 dark:bg-red-950/30 dark:text-red-400">
                  Restore Mode
                </Badge>
              )}
            </div>
          }
          description="Manage system staff and administrative access."
        />

        {hasActiveFilters && (
          <div className="flex-none border-t border-gray-100 bg-white px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-300 dark:border-white/10 dark:bg-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10px] font-bold tracking-widest text-gray-400 dark:text-zinc-500">Active filters:</span>
              {localSearch && (
                <div className="flex items-center gap-1 rounded-full border border-gray-300 bg-pup-maroon/10 px-2.5 py-1 text-[10px] font-bold text-pup-maroon dark:text-primary dark:border-white/10 dark:text-primary">
                  Search: {localSearch}
                  <button
                    onClick={() => { 
                      setLocalSearch(""); 
                      setSearch("");
                      setCurrentPage(1); 
                    }}
                    className="ml-1 hover:text-pup-darkMaroon transition-colors"
                  >
                    <i className="ph-bold ph-x text-[8px]"></i>
                  </button>
                </div>
              )}
              {roleFilter !== "All" && (
                <div className="flex items-center gap-1 rounded-full border border-blue-100/30 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
                  Role: {roleFilter}
                  <button
                    onClick={() => { setRoleFilter("All"); setCurrentPage(1); }}
                    className="ml-1 hover:text-blue-800 transition-colors"
                  >
                    <i className="ph-bold ph-x text-[8px]"></i>
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
                className="h-6 rounded-full border-2 border-dashed border-gray-300 px-3 text-[10px] font-black text-pup-maroon dark:text-primary transition-colors hover:border-pup-darkMaroon hover:bg-red-50 hover:text-pup-maroon dark:border-white/10 dark:text-primary dark:bg-red-950/30"
              >
                Clear All Filters
              </Button>
            </div>
          </div>
        )}

        {!isLoading && !error && (
          <CardContent className="font-inter bg-white p-4 dark:bg-card/50 backdrop-blur-md border-t border-gray-100 dark:border-white/10">
            <div className="flex shrink-0 select-none flex-wrap items-end justify-between gap-6">
              <div className="flex w-full flex-col gap-1.5 sm:w-auto">
                <div className="flex w-full cursor-default items-center overflow-hidden rounded-brand border border-gray-200 bg-gray-100 p-0.5 backdrop-blur-sm sm:w-auto dark:border-white/10 dark:bg-muted/50">
                  <button
                    type="button"
                    onClick={() => setActiveTab("active")}
                    className={`group flex h-11 flex-1 cursor-pointer items-center justify-center gap-3 px-8 text-sm font-bold transition-all duration-200 active:scale-[0.98] sm:w-[200px] sm:flex-none ${
 activeTab === "active"
 ? "rounded-l-[calc(var(--radius)-2px)] rounded-r-none bg-white text-pup-maroon shadow-sm ring-1 ring-inset ring-black/5 dark:bg-zinc-900 dark:text-primary dark:ring-white/10"
 : "text-gray-500 ring-transparent hover:bg-white/50 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-200"
 }`}
                  >
                    <span className="whitespace-nowrap tracking-wide">
                      Active
                    </span>
                    <span
                      className={cn(
                        "flex h-5 min-w-[26px] items-center justify-center rounded-full px-2 text-[10px] font-black transition-all duration-300",
                        activeTab === "active"
                          ? "bg-pup-maroon text-white shadow-sm ring-2 ring-red-50/50 dark:bg-red-500/20 dark:text-red-400 dark:ring-red-400/20 dark:shadow-none"
                          : "bg-gray-200 text-gray-500 group-hover:bg-gray-300 dark:bg-zinc-800 dark:text-zinc-500 dark:group-hover:bg-zinc-700 dark:group-hover:text-zinc-300"
                      )}
                    >
                      {staffData.filter((s) => s.status !== "Archived").length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("archived")}
                    className={`group flex h-11 flex-1 cursor-pointer items-center justify-center gap-3 px-8 text-sm font-bold transition-all duration-200 active:scale-[0.98] sm:w-[200px] sm:flex-none ${
 activeTab === "archived"
 ? "rounded-r-[calc(var(--radius)-2px)] rounded-l-none bg-white text-pup-maroon shadow-sm ring-1 ring-inset ring-black/5 dark:bg-zinc-900 dark:text-primary dark:ring-white/10"
 : "text-gray-500 ring-transparent hover:bg-white/50 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-200"
 }`}
                  >
                    <span className="whitespace-nowrap tracking-wide">
                      Archived
                    </span>
                    <span
                      className={cn(
                        "flex h-5 min-w-[26px] items-center justify-center rounded-full px-2 text-[10px] font-black transition-all duration-300",
                        activeTab === "active"
                          ? "bg-pup-maroon text-white shadow-sm ring-2 ring-red-50/50 dark:bg-red-500/20 dark:text-red-400 dark:ring-red-400/20 dark:shadow-none"
                          : "bg-gray-200 text-gray-500 group-hover:bg-gray-300 dark:bg-zinc-800 dark:text-zinc-500 dark:group-hover:bg-zinc-700 dark:group-hover:text-zinc-300"
                      )}
                    >
                      {staffData.filter((s) => s.status === "Archived").length}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-1.col gap-1.5 min-w-[300px]">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black tracking-widest text-gray-400 dark:text-zinc-500">
                    Search
                  </label>
                  <span className="text-[9px] font-black text-pup-maroon dark:text-primary/70">
                    {filteredStaff.length > 0 ? `${filteredStaff.length.toLocaleString()} matches` : "No results"}
                  </span>
                </div>
                <div className="relative group">
                  <i className="ph-bold ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-pup-maroon dark:text-zinc-500"></i>
                  <Input
                    placeholder="Search name, email or ID..."
                    className="h-11 rounded-brand border border-gray-200 bg-white pl-11 pr-4 text-dium transition-all focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 placeholder:text-gray-400 dark:border-white/10 dark:bg-card dark:text-zinc-300 dark:focus:border-primary"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 w-full sm:w-44">
                <label className="text-[10px] font-black tracking-widest text-gray-400 dark:text-zinc-500">
                  Role
                </label>
                <Select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="All">All</option>
                  <option value="Admin">Administrators</option>
                  <option value="Staff">Regular Staff</option>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={() => onSwitchView("create")}
                  disabled={activeTab === "archived"}
                  className="flex h-11 items-center gap-2 rounded-brand btn-brand-red active:scale-95 disabled:opacity-50 transition-all dark:shadow-none text-[10px] font-black tracking-widest px-6"
                >
                  <i className="ph-bold ph-user-plus text-base"></i>
                  Add Staff
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Main Table Grid & Pagination (No outer background card) */}
      {isLoading ? (
        <div className="overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card">
          <div className="h-10 border-b border-gray-200 bg-transparent dark:border-white/10 dark:bg-transparent" />
          <div className="divide-y divide-gray-100 dark:divide-white/10">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <div className="flex flex-1 items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full dark:bg-muted" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32 dark:bg-muted" />
                    <Skeleton className="h-3 w-24 dark:bg-muted" />
                  </div>
                </div>
                <Skeleton className="hidden h-4 w-20 lg:block dark:bg-muted" />
                <Skeleton className="hidden h-6 w-20 rounded-full lg:block dark:bg-muted" />
                <Skeleton className="hidden h-6 w-24 rounded-full lg:block dark:bg-muted" />
                <Skeleton className="hidden h-4 w-28 lg:block dark:bg-muted" />
                <div className="flex gap-3">
                  <Skeleton className="h-9 w-16 rounded-brand dark:bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card p-6">
          <Empty className="flex h-[320px] flex-col items-center justify-center border-0 text-center text-gray-500 dark:text-zinc-400">
            <EmptyHeader className="flex flex-col items-center gap-0">
              <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
                <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon dark:text-primary" />
              </EmptyMedia>
              <EmptyTitle className="text-lg font-bold text-gray-900 dark:text-zinc-50">
                Could not load personnel data
              </EmptyTitle>
              <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600 dark:text-zinc-300">
                {error}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full font-inter"
        >
          <TabsContent
            value={activeTab}
            key={activeTab}
            className="outline-none animate-fade-up"
          >
            <div className="overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card">
              <table className="min-w-full table-fixed text-sm">
                <thead className="sticky top-0 z-10 border-b border-gray-200 bg-transparent backdrop-blur-sm dark:border-white/10 dark:bg-transparent">
                  <tr className="text-left text-[10px] font-black tracking-widest text-gray-600 dark:text-zinc-300">
                    <th className="w-16 p-4 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer rounded border border-gray-300 text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon disabled:opacity-20 dark:text-primary dark:border-white/10"
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
                        className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none"
                      >
                        Staff Name{" "}
                        <SortIndicator
                          column="fname"
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                        />
                      </button>
                    </th >
                    <th className="w-48 p-4">
                      <button
                        onClick={() => handleSort("id")}
                        className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none"
                      >
                        Employee ID{" "}
                        <SortIndicator
                          column="id"
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                        />
                      </button>
                    </th>
                    <th className="w-48 p-4">
                      <button
                        onClick={() => handleSort("role")}
                        className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none"
                      >
                        System Role{" "}
                        <SortIndicator
                          column="role"
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                        />
                      </button>
                    </th>
                    <th className="w-40 p-4">
                      <button
                        onClick={() => handleSort("totp_enabled")}
                        className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none"
                      >
                        Security{" "}
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
                        className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none"
                      >
                        Last Login{" "}
                        <SortIndicator
                          column="last_active"
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                        />
                      </button>
                    </th>
                    <th className="w-32 p-4 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
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
                            <EmptyTitle className="text-xl font-black text-gray-900 dark:text-zinc-50">
                              {hasActiveFilters || search !== "" ? "No Matches Found" : (activeTab === "archived" ? "No archive found" : "No Activity Found")}
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
                                className="mt-6 flex h-10 items-center gap-3 rounded-brand border border-gray-300 bg-white px-6 text-xs font-bold text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 tracking-wide dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                              >
                                <i className="ph-bold ph-arrow-counter-clockwise"></i>
                                Clear Search
                              </Button>
                            ) : (
                              activeTab === "active" && staffData.filter(s => s.status !== "Archived").length === 0 && (
                                <Button
                                  onClick={() => onSwitchView("create")}
                                  className="mt-6 flex h-10 items-center gap-3 rounded-brand btn-brand-red px-6 text-xs font-bold text-white transition-all dark:shadow-none"
                                >
                                  <i className="ph-bold ph-user-plus"></i>
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

              {filteredStaff.length > 0 && (
                <div className="flex items-center justify-between border-t border-gray-100 bg-white p-6 px-8 dark:border-white/10 dark:bg-card">
                  <div className="flex items-center gap-8 select-none cursor-default">
                    <div className="flex items-center gap-6 text-[11px] font-black text-gray-400 tracking-widest dark:text-zinc-500">
                      <span>
                        Showing <strong className="text-gray-900 dark:text-zinc-50">{paginatedStaff.length}</strong> out of <strong className="text-gray-900 dark:text-zinc-50">{filteredStaff.length}</strong> entries
                      </span>

                      <div className="flex items-center gap-3 border-l border-gray-200 pl-6 dark:border-white/10">
                        <span className="text-[10px] opacity-60">Rows:</span>
                        <Select
                          className="h-8 w-16 cursor-pointer rounded-brand border border-gray-300 bg-white px-2 text-[10px] font-bold text-gray-700 focus:ring-1 focus:ring-pup-maroon focus:outline-none transition-all hover:bg-gray-50 dark:bg-card dark:text-zinc-200 dark:hover:bg-white/10 dark:border-white/10"
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
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3 select-none">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={displayPage <= 1}
                      onClick={() =>
                        setCurrentPage((p) => Math.max(1, p - 1))
                      }
                      className="h-10 rounded-brand border border-gray-300 bg-white px-5 text-[10px] font-black tracking-widest text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-30 dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                    >
                      <i className="ph-bold ph-caret-left mr-2 text-base"></i>Prev</Button>

                    <div className="flex h-9 min-w-[48px] cursor-default items-center justify-center rounded-brand border border-gray-200 bg-white px-3 text-[11px] font-black text-gray-900 shadow-sm dark:border-white/10 dark:bg-card dark:text-zinc-50 dark:shadow-none">
                      {displayPage}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={displayPage >= totalPages}
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      className="h-10 rounded-brand border border-gray-300 bg-white px-5 text-[10px] font-black tracking-widest text-gray-500 shadow-sm transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-30 dark:bg-card dark:text-zinc-400 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                    >Next<i className="ph-bold ph-caret-right ml-2 text-base"></i>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {selectedIds.size > 1 && (
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
                className="h-9 px-4 text-xs font-bold text-gray-500 transition-colors hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 dark:text-zinc-400 dark:bg-red-950/30"
              >
                Deselect All
              </Button>

              {activeTab === "active" ? (
                <Button
                  size="sm"
                  onClick={() => {
                    onBulkArchive(Array.from(selectedIds))
                  }}
                  className="flex h-10 items-center gap-3 rounded-brand btn-brand-red px-6 text-xs font-black text-white shadow-lg shadow-red-900/20 active:scale-95 transition-all dark:shadow-none"
                >
                  <i className="ph-bold ph-archive text-sm"></i>
                  Archive Selected
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    onBulkRestore(Array.from(selectedIds))
                  }}
                  className="flex h-10 items-center gap-3 rounded-brand btn-brand-green px-6 text-xs font-black text-white active:scale-95 transition-all dark:shadow-none"
                >
                  <i className="ph-bold ph-arrow-counter-clockwise text-sm"></i>
                  Restore Selected
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




