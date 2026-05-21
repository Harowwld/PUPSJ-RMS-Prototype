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

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column)
    return (
      <i className="ph-bold ph-caret-up-down ml-1 text-[10px] opacity-30"></i>
    )
  return sortOrder === "asc" ? (
    <i className="ph-bold ph-caret-up ml-1 text-[10px] text-pup-maroon"></i>
  ) : (
    <i className="ph-bold ph-caret-down ml-1 text-[10px] text-pup-maroon"></i>
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

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [jumpPage, setJumpPage] = useState("1")

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
  }, [activeTab, displayPage, onSelectionChange])

  const toggleSelectAll = (checked) => {
    if (checked) {
      onSelectionChange(new Set(paginatedStaff.map((s) => s.id)))
    } else {
      onSelectionChange(new Set())
    }
  }

  const toggleSelect = (id) => {
    onSelectionChange((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
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
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-16" />
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
                    className="flex h-10 w-32 items-center justify-center gap-1.5 rounded-brand border-gray-300 text-[10px] font-bold text-gray-600 shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95"
                  >
                    <i className="ph-bold ph-file-csv text-base"></i>
                    EXPORT CSV
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onSwitchView("create")}
                    className="h-10 rounded-brand bg-pup-maroon px-5 text-xs font-bold text-white shadow-sm transition-all hover:bg-red-900 active:scale-95"
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
                <div className="mb-6 flex shrink-0 flex-col items-center justify-between gap-4 sm:flex-row">
                  <div className="flex items-center gap-4">
                    <div className="inline-flex h-auto rounded-brand border border-gray-200/50 bg-gray-100/80 p-1 backdrop-blur-sm">
                      <button
                        type="button"
                        onClick={() => setActiveTab("active")}
                        className={`flex items-center gap-2.5 rounded-brand px-5 py-2 text-sm font-bold transition-all duration-200 active:scale-95 ${
                          activeTab === "active"
                            ? "bg-white text-pup-maroon shadow-sm ring-1 ring-black/5"
                            : "text-gray-500 hover:bg-white/50 hover:text-gray-700"
                        }`}
                      >
                        <i
                          className={`ph-bold ph-users-three ${activeTab === "active" ? "" : "text-gray-400"}`}
                        ></i>
                        <span>ACTIVE DIRECTORY</span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "ml-1 h-4 px-1.5 text-[10px] font-bold",
                            activeTab === "active"
                              ? "bg-red-50 text-pup-maroon"
                              : "bg-gray-200 text-gray-500"
                          )}
                        >
                          {
                            staffData.filter((s) => s.status !== "Archived")
                              .length
                          }
                        </Badge>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("archived")}
                        className={`flex items-center gap-2.5 rounded-brand px-5 py-2 text-sm font-bold transition-all duration-200 active:scale-95 ${
                          activeTab === "archived"
                            ? "bg-white text-pup-maroon shadow-sm ring-1 ring-black/5"
                            : "text-gray-500 hover:bg-white/50 hover:text-gray-700"
                        }`}
                      >
                        <i
                          className={`ph-bold ph-archive ${activeTab === "archived" ? "" : "text-gray-400"}`}
                        ></i>
                        <span>ARCHIVE VAULT</span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "ml-1 h-4 px-1.5 text-[10px] font-bold",
                            activeTab === "archived"
                              ? "bg-red-50 text-pup-maroon"
                              : "bg-gray-200 text-gray-500"
                          )}
                        >
                          {
                            staffData.filter((s) => s.status === "Archived")
                              .length
                          }
                        </Badge>
                      </button>
                    </div>
                  </div>

                  {/* Integrated Summary Metrics Bar */}
                  <div className="flex flex-wrap items-center gap-6 rounded-brand border border-gray-100 bg-gray-50/30 px-4 py-2 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-pup-maroon">
                        <i className="ph-duotone ph-users-four text-base"></i>
                      </div>
                      <div>
                        <p className="mb-0.5 text-[8px] leading-none font-black tracking-widest text-gray-400 uppercase">
                          Personnel
                        </p>
                        <p className="text-xs leading-tight font-black text-gray-900">
                          {stats.total?.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="h-6 w-px bg-gray-200"></div>

                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
                        <i className="ph-duotone ph-shield-check text-base"></i>
                      </div>
                      <div>
                        <p className="mb-0.5 text-[8px] leading-none font-black tracking-widest text-gray-400 uppercase">
                          2FA Adoption
                        </p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs leading-tight font-black text-gray-900">
                            {stats.authRate}%
                          </p>
                          <span className="text-[9px] font-bold text-gray-400 opacity-70">
                            ({stats.authCount} verified)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-x-auto overflow-y-auto rounded-brand border border-gray-200 bg-white shadow-xs">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
                      <tr className="text-left text-xs tracking-wider text-gray-600 uppercase">
                        <th className="w-12 p-3 text-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-pup-maroon accent-pup-maroon focus:ring-pup-maroon disabled:opacity-20"
                            checked={
                              paginatedStaff.length > 0 &&
                              paginatedStaff.every((s) => selectedIds.has(s.id))
                            }
                            onChange={(e) => toggleSelectAll(e.target.checked)}
                            disabled={paginatedStaff.length === 0}
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
                        <th className="w-32 p-3 font-bold">
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
                            Last Activity{" "}
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
                                    className="mt-4 flex items-center gap-2 rounded-brand border border-gray-300 px-4 text-[10px] font-bold text-gray-600 shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon sm:text-xs"
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
                        </tr>
                      ) : (
                        paginatedStaff.map((s) => {
                          const isCurrentUser = s.id === currentUserId
                          const active = formatRelativeTime(s.last_active)
                          const isArchived = s.status === "Archived"

                          // Safe initials fallback
                          const initials =
                            `${s.fname?.[0] || ""}${s.lname?.[0] || ""}` || "?"

                          return (
                            <tr
                              key={s.id}
                              className={cn(
                                "transition-colors hover:bg-gray-50",
                                isCurrentUser && "bg-red-50/30",
                                isArchived && "opacity-75 grayscale-[0.2]",
                                selectedIds.has(s.id) && "bg-red-50/20"
                              )}
                            >
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 cursor-pointer rounded border-gray-300 text-pup-maroon accent-pup-maroon focus:ring-pup-maroon disabled:opacity-20"
                                  checked={selectedIds.has(s.id)}
                                  onChange={() => toggleSelect(s.id)}
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
                              <td className="p-3 text-[11px] font-bold text-gray-600">
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
                                <div className="text-[11px] font-bold text-gray-900">
                                  {active.relative || active.date}
                                </div>
                                {active.relative && (
                                  <div className="text-[10px] text-gray-500 opacity-70">
                                    {active.date}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {isCurrentUser ? (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                              (window.location.href =
                                                "/account")
                                            }
                                            className="h-8 w-8 rounded-brand text-gray-500 hover:bg-red-50 hover:text-pup-maroon"
                                          >
                                            <i className="ph-bold ph-user-circle text-lg"></i>
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                          Manage My Account
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => onEditUser(s.id)}
                                              className="h-8 w-8 rounded-brand text-gray-500 hover:bg-red-50 hover:text-pup-maroon"
                                            >
                                              <i className="ph-bold ph-pencil-simple text-lg"></i>
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent side="top">
                                            Edit Profile
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>

                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-brand text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                          >
                                            <i className="ph-bold ph-dots-three-vertical text-lg"></i>
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                          align="end"
                                          className="w-48 rounded-xl border-gray-200 shadow-xl"
                                        >
                                          {activeTab === "archived" ? (
                                            <DropdownMenuItem
                                              onClick={() =>
                                                onRestoreUser(s.id)
                                              }
                                              className="cursor-pointer gap-2 font-bold text-emerald-600 focus:bg-emerald-50 focus:text-emerald-700"
                                            >
                                              <i className="ph-bold ph-arrow-counter-clockwise text-base transition-colors"></i>
                                              Restore Account
                                            </DropdownMenuItem>
                                          ) : (
                                            <DropdownMenuItem
                                              onClick={() => onDeleteUser(s.id)}
                                              className="cursor-pointer gap-2 font-bold text-red-600 focus:bg-red-50 focus:text-red-700"
                                            >
                                              <i className="ph-bold ph-archive text-base transition-colors"></i>
                                              Archive Account
                                            </DropdownMenuItem>
                                          )}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredStaff.length > 0 && (
                  <div className="-mx-6 mt-4 -mb-6 flex items-center justify-between rounded-b-brand border-t border-gray-100 bg-gray-50/50 p-4 px-6">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                        <span>
                          Showing {(displayPage - 1) * itemsPerPage + 1}-
                          {Math.min(
                            displayPage * itemsPerPage,
                            filteredStaff.length
                          )}{" "}
                          of{" "}
                          <strong className="text-gray-900">
                            {filteredStaff.length.toLocaleString()}
                          </strong>
                        </span>

                        <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">
                            Rows:
                          </span>
                          <select
                            className="h-7 w-16 cursor-pointer rounded-brand border border-gray-300 bg-white px-1 text-[10px] font-bold text-gray-700 focus:ring-1 focus:ring-pup-maroon focus:outline-none"
                            value={itemsPerPage}
                            onChange={(e) => {
                              setItemsPerPage(Number(e.target.value))
                              setCurrentPage(1)
                            }}
                          >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={displayPage <= 1}
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        className="h-8 rounded-brand border border-gray-300 bg-white px-3 text-[10px] font-black tracking-widest text-gray-600 uppercase shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95 disabled:opacity-30"
                      >
                        <i className="ph-bold ph-caret-left mr-1"></i>
                        PREVIOUS
                        <kbd className="ml-2 hidden rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-400 sm:inline-block">
                          ←
                        </kbd>
                      </Button>
                      <div className="flex h-8 min-w-[32px] items-center justify-center rounded-md border border-gray-200 bg-white px-2 text-[11px] font-bold text-gray-700 shadow-xs focus-within:border-pup-maroon focus-within:ring-1 focus-within:ring-pup-maroon">
                        <input
                          type="text"
                          className="w-6 bg-transparent text-center focus:outline-none"
                          value={jumpPage}
                          onChange={(e) => setJumpPage(e.target.value)}
                          onKeyDown={handleJumpPage}
                          onBlur={handleJumpPage}
                        />
                        <span className="mx-0.5 text-gray-400">/</span>
                        <span>{totalPages}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={displayPage >= totalPages}
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        className="h-8 rounded-brand border border-gray-300 bg-white px-3 text-[10px] font-black tracking-widest text-gray-600 uppercase shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95 disabled:opacity-30"
                      >
                        NEXT
                        <kbd className="mr-2 hidden rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-400 sm:inline-block">
                          →
                        </kbd>
                        <i className="ph-bold ph-caret-right ml-1"></i>
                      </Button>
                    </div>
                  </div>
                )}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <FloatingActionBar
          selectedCount={selectedIds.size}
          onCancel={() => setSelectedIds(new Set())}
          customContent={
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
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
                  className="flex h-10 items-center gap-2 rounded-xl bg-red-600 px-6 text-xs font-bold text-white uppercase shadow-lg shadow-red-600/20 transition-all hover:bg-red-700 active:scale-95"
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
