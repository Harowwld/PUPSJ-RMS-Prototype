"use client"

import { useMemo, useState, useEffect } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPHDateTime, formatPHDateTimeParts } from "@/lib/timeFormat"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"

export default function StaffDirectoryTab({
  staffData,
  isLoading = false,
  error = null,
  currentUserId,
  search,
  setSearch,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
  onEditUser,
  onRestoreUser,
  onDeleteUser,
  onExportData,
  onSwitchView,
}) {
  const filteredStaff = useMemo(() => {
    const q = search.toLowerCase()
    return staffData.filter((s) => {
      const matchesSearch =
        `${s.fname} ${s.lname}`.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      const matchesRole = roleFilter === "All" || s.role === roleFilter
      const matchesStatus = statusFilter === "All" || s.status === statusFilter
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [search, roleFilter, staffData, statusFilter])

  const recentLogins = useMemo(() => {
    return staffData.filter((s) => s.status === "Active").slice(0, 4)
  }, [staffData])

  const stats = useMemo(() => {
    return {
      total: staffData.length,
      active: staffData.filter((s) => s.status === "Active").length,
    }
  }, [staffData])

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [jumpPage, setJumpPage] = useState("1")

  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage) || 1

  // Cap current page if filtering reduces dataset below current page
  const displayPage = Math.min(currentPage, totalPages)

  const paginatedStaff = useMemo(() => {
    const start = (displayPage - 1) * itemsPerPage
    return filteredStaff.slice(start, start + itemsPerPage)
  }, [filteredStaff, displayPage, itemsPerPage])

  useEffect(() => {
    setJumpPage(String(displayPage))
  }, [displayPage])

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

  const formatLastActive = (v) => {
    const raw = String(v || "").trim()
    if (!raw) return { date: "—", time: "" }
    // If it's already a human label, just return it as date
    if (!raw.includes("-") && !raw.includes(":")) return { date: raw, time: "" }
    return formatPHDateTimeParts(raw)
  }

  return (
    <div className="animate-fade-in font-inter flex h-full w-full flex-col">
      {isLoading ? (
        <div className="flex flex-1 flex-col items-stretch gap-4 overflow-hidden lg:flex-row">
          {/* Sidebar Skeleton */}
          <aside className="flex h-full w-full flex-col gap-4 overflow-y-auto pr-1 lg:w-1/4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="flex h-24 flex-col justify-center gap-2 rounded-brand border border-gray-200 bg-white p-4">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-20" />
              </div>
              <div className="flex h-24 flex-col justify-center gap-2 rounded-brand border border-gray-200 bg-white p-4">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden rounded-brand border border-gray-200 bg-white">
              <div className="space-y-4 border-b border-gray-100 bg-gray-50/50 p-5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full rounded-brand" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-10 w-full rounded-brand" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-10 w-full rounded-brand" />
                </div>
              </div>
              <div className="space-y-4 p-5">
                <Skeleton className="h-3 w-24" />
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-2 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Table Skeleton */}
          <Card className="flex h-full w-full flex-col overflow-hidden rounded-brand border-gray-200 bg-white shadow-sm lg:w-3/4">
            <PageHeader
              icon="ph-users-three"
              title="Personnel Directory"
              description="Manage registrar personnel and administrative access credentials."
            />
            <CardContent className="flex min-h-0 flex-1 flex-col bg-white p-6">
              <div className="flex flex-1 flex-col overflow-hidden rounded-brand border border-gray-200">
                <Skeleton className="h-10 w-full rounded-none" />
                <div className="flex-1 divide-y divide-gray-100">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4"
                    >
                      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-5">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-full" />
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-2 w-24" />
                          </div>
                        </div>
                        <div className="hidden items-center lg:flex">
                          <Skeleton className="h-4 w-20 font-mono" />
                        </div>
                        <div className="hidden items-center lg:flex">
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                        <div className="hidden items-center lg:flex">
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                        <div className="hidden items-center lg:flex">
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </div>
                      <div className="ml-4 flex gap-2">
                        <Skeleton className="h-9 w-16 rounded-brand" />
                        <Skeleton className="h-9 w-16 rounded-brand" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Skeleton className="h-4 w-48" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-24 rounded-brand" />
                  <Skeleton className="h-8 w-20 rounded-brand" />
                  <Skeleton className="h-8 w-12 rounded-brand" />
                  <Skeleton className="h-8 w-20 rounded-brand" />
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
                  Could not load report
                </EmptyTitle>
                <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600">
                  {error}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-1 flex-col items-stretch gap-4 overflow-hidden lg:flex-row">
          <aside className="flex h-full w-full flex-col gap-4 overflow-y-auto pr-1 lg:w-1/4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {/* Total Records — Accent Card */}
              <div className="group relative overflow-hidden rounded-xl border border-[#5c1520] bg-[#7a1e28] p-4 shadow-sm transition-all">
                <i className="ph-duotone ph-users-four pointer-events-none absolute -right-3 -bottom-3 rotate-12 text-[60px] text-white opacity-20" />
                <div className="relative z-10">
                  <p className="mb-1 text-[10px] font-bold tracking-widest text-[#f7c9ce] uppercase">
                    Total Records
                  </p>
                  <h3 className="text-3xl leading-none font-bold tracking-tight text-white">
                    {stats.total?.toLocaleString?.() ?? stats.total}
                  </h3>
                </div>
              </div>

              {/* Network Online — Light Card */}
              <div className="group relative overflow-hidden rounded-xl border border-[#7a1e28]/15 bg-[#fdf6f6] p-4 shadow-sm transition-all">
                <i className="ph-duotone ph-broadcast pointer-events-none absolute -right-3 -bottom-3 rotate-12 text-[60px] text-[#7a1e28] opacity-10" />
                <div className="relative z-10">
                  <p className="mb-1 text-[10px] font-bold tracking-widest text-[#9e5a62] uppercase">
                    Network Online
                  </p>
                  <div className="flex items-center gap-2">
                    <h3 className="text-3xl leading-none font-bold tracking-tight text-[#7a1e28]">
                      {stats.active?.toLocaleString?.() ?? stats.active}
                    </h3>
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 bg-gray-50/50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-xs font-bold tracking-wide text-gray-900 uppercase">
                    <i className="ph-bold ph-funnel"></i> Directory Filters
                  </h3>
                  {(search !== "" ||
                    roleFilter !== "All" ||
                    statusFilter !== "All") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearch("")
                        setRoleFilter("All")
                        setStatusFilter("All")
                      }}
                      className="h-5 px-1.5 text-[9px] font-bold text-pup-maroon hover:bg-red-50 hover:text-pup-darkMaroon"
                    >
                      CLEAR ALL
                    </Button>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="group relative">
                    <i className="ph-bold ph-magnifying-glass absolute top-1/2 left-3 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-pup-maroon"></i>
                    <Input
                      type="text"
                      placeholder="Query name or ID..."
                      className="h-10 rounded-brand border border-gray-300 bg-white pl-9 text-sm focus-visible:border-pup-maroon focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-gray-700 uppercase">
                      System Role
                    </label>
                    <select
                      className="h-10 w-full rounded-brand border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition-colors focus:border-pup-maroon focus:ring-2 focus:ring-pup-maroon focus:outline-none"
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                    >
                      <option value="All">All</option>
                      <option value="Admin">Admin</option>
                      <option value="Staff">Staff</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold text-gray-500 uppercase">
                      Activity Status
                    </label>
                    <select
                      className="h-10 w-full rounded-brand border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition-colors focus:border-pup-maroon focus:ring-2 focus:ring-pup-maroon focus:outline-none"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="All">All</option>
                      <option value="Active">Active (Online)</option>
                      <option value="Inactive">Inactive (Offline)</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-white p-5">
                <h4 className="mb-4 text-[10px] font-bold tracking-wide text-gray-400 uppercase">
                  Recent Network Check-ins
                </h4>
                <div className="space-y-3">
                  {recentLogins.map((s, idx) => (
                    <div
                      key={s.id}
                      className="group animate-in zoom-in-95 fill-mode-forwards flex cursor-pointer items-center gap-3 rounded-lg border border-transparent p-2 transition-all duration-300 hover:border-gray-100 hover:bg-gray-50"
                      style={{
                        animationDelay: `${idx * 80}ms`,
                      }}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50 text-xs font-bold text-pup-maroon transition-transform duration-300 group-hover:scale-110">
                        {s.fname[0]}
                        {s.lname[0]}
                      </div>
                      <div className="overflow-hidden">
                        <div className="truncate text-sm font-bold text-gray-800 transition-colors group-hover:text-pup-maroon">
                          {s.fname} {s.lname}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400">
                          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500"></div>
                          {s.last_active
                            ? formatLastActive(s.last_active).date
                            : "Currently Online"}
                        </div>
                      </div>
                    </div>
                  ))}
                  {recentLogins.length === 0 && (
                    <Empty className="border-0 py-6 opacity-80">
                      <EmptyHeader className="flex flex-col items-center gap-0">
                        <EmptyMedia className="mb-2">
                          <i className="ph-bold ph-broadcast text-2xl text-gray-300"></i>
                        </EmptyMedia>
                        <EmptyTitle className="text-[10px] font-bold text-gray-400 italic">
                          No active sessions
                        </EmptyTitle>
                        <EmptyDescription className="text-[9px]">
                          No staff members are currently flagged as online.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}
                </div>
              </div>
            </div>
          </aside>

          <Card className="flex h-full w-full flex-col overflow-hidden rounded-brand border-gray-200 bg-white shadow-sm lg:w-3/4">
            <PageHeader
              icon="ph-users-three"
              title="Personnel Directory"
              description="Manage registrar personnel and administrative access credentials."
              actions={
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onExportData}
                    className="h-10 rounded-brand border-gray-300 px-5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:border-pup-maroon hover:bg-red-50 hover:text-pup-maroon"
                  >
                    <i className="ph-bold ph-download-simple mr-1.5"></i>
                    EXPORT CSV
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onSwitchView("create")}
                    className="h-10 rounded-brand bg-pup-maroon px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-red-900 active:scale-95"
                  >
                    <i className="ph-bold ph-user-plus mr-1.5"></i>
                    ADD PERSONNEL
                  </Button>
                </div>
              }
            />
            <CardContent className="flex min-h-0 flex-1 flex-col bg-white p-6">
              <div className="flex-1 overflow-x-auto overflow-y-auto rounded-brand border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
                    <tr className="text-left text-xs tracking-wider text-gray-600 uppercase">
                      <th className="p-3 font-bold">Personnel Name</th>
                      <th className="w-32 p-3 font-bold">Staff ID</th>
                      <th className="w-28 p-3 font-bold">Role</th>
                      <th className="w-28 p-3 font-bold">Status</th>
                      <th className="p-3 font-bold whitespace-nowrap">
                        Last Active
                      </th>
                      <th className="w-24 p-3 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredStaff.length === 0 ? (
                      <tr className="border-0 hover:bg-transparent">
                        <td colSpan={6} className="border-0 p-0">
                          <Empty className="flex h-[400px] flex-col items-center justify-center border-0 text-center text-gray-500">
                            <EmptyHeader className="flex flex-col items-center gap-0">
                              <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                                <i className="ph-duotone ph-users-three text-3xl text-pup-maroon"></i>
                              </EmptyMedia>
                              <EmptyTitle className="text-lg font-bold text-gray-900">
                                No staff records yet
                              </EmptyTitle>
                              <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600">
                                We couldn&apos;t find any staff members matching
                                your search criteria.
                              </EmptyDescription>
                            </EmptyHeader>
                          </Empty>
                        </td>
                      </tr>
                    ) : (
                      paginatedStaff.map((s) => {
                        const isCurrentUser = s.id === currentUserId
                        const active = formatLastActive(s.last_active)
                        return (
                          <tr
                            key={s.id}
                            className={`group transition-colors hover:bg-gray-50 ${isCurrentUser ? "bg-red-50/40" : ""}`}
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-3 py-1">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50 text-xs font-black text-pup-maroon shadow-xs transition-transform group-hover:scale-105">
                                  {s.fname[0]}
                                  {s.lname[0]}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                                    <span className="truncate">
                                      {s.fname} {s.lname}
                                    </span>
                                    {isCurrentUser && (
                                      <Badge
                                        variant="outline"
                                        className="h-4 rounded-full border-pup-maroon bg-pup-maroon px-1.5 py-0 text-[9px] leading-tight font-black text-white uppercase"
                                      >
                                        You
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="truncate text-[11px] font-medium text-gray-500">
                                    {s.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 font-mono text-xs font-bold text-gray-900">
                              {s.id}
                            </td>
                            <td className="p-3">
                              {s.role === "Admin" || s.role === "SuperAdmin" ? (
                                <Badge
                                  variant="outline"
                                  className="rounded-full border-red-200 bg-red-50 px-2 py-1 text-[10px] font-bold text-pup-maroon uppercase shadow-xs"
                                >
                                  <i className="ph-fill ph-shield-check mr-1.5" />
                                  {s.role}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="rounded-full border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700 uppercase shadow-xs"
                                >
                                  <i className="ph-fill ph-user mr-1.5" />
                                  {s.role}
                                </Badge>
                              )}
                            </td>
                            <td className="p-3">
                              {s.status === "Active" ? (
                                <Badge
                                  variant="outline"
                                  className="flex w-max items-center gap-1.5 rounded-full border-green-200 bg-green-50 px-2 py-1 text-[10px] font-bold text-green-700 uppercase shadow-xs"
                                >
                                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500"></div>
                                  {s.status}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="rounded-full border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-500 uppercase shadow-xs"
                                >
                                  {s.status === "Inactive"
                                    ? "Archived"
                                    : s.status}
                                </Badge>
                              )}
                            </td>
                            <td className="p-3 font-medium text-gray-600">
                              <div className="font-mono text-[11px]">
                                {active.date}
                              </div>
                              {active.time && (
                                <div className="text-[10px] opacity-70">
                                  {active.time}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {isCurrentUser ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      (window.location.href = "/account")
                                    }
                                    className="h-9 rounded-brand border-gray-300 px-3 text-xs font-bold text-gray-700 shadow-sm transition-all hover:border-pup-maroon hover:bg-red-50 hover:text-pup-maroon"
                                  >
                                    <i className="ph-bold ph-user-circle mr-1.5"></i>
                                    ACCOUNT
                                  </Button>
                                ) : (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => onEditUser(s.id)}
                                      className="h-9 rounded-brand border-gray-300 px-3 text-xs font-bold text-gray-700 shadow-sm transition-all hover:border-pup-maroon hover:bg-red-50 hover:text-pup-maroon"
                                      title="Modify Account"
                                    >
                                      <i className="ph-bold ph-pencil-simple mr-1.5"></i>
                                      EDIT
                                    </Button>
                                    {s.status === "Archived" ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onRestoreUser(s.id)}
                                        className="h-9 rounded-brand border-green-200 px-3 text-xs font-bold text-green-700 shadow-sm transition-all hover:border-green-300 hover:bg-green-50 hover:text-green-800"
                                        title="Restore Account Access"
                                      >
                                        <i className="ph-bold ph-arrow-counter-clockwise mr-1.5"></i>
                                        RESTORE
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onDeleteUser(s.id)}
                                        className="h-9 rounded-brand border-red-200 px-3 text-xs font-bold text-red-700 shadow-sm transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-800"
                                        title="Archive Personnel Account"
                                      >
                                        <i className="ph-bold ph-archive mr-1.5"></i>
                                        ARCHIVE
                                      </Button>
                                    )}
                                  </>
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
                <div className="mt-4 flex shrink-0 items-center justify-between">
                  <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                    <span>
                      {(displayPage - 1) * itemsPerPage + 1}-
                      {Math.min(displayPage * itemsPerPage, filteredStaff.length)}{" "}
                      of{" "}
                      <strong className="text-gray-900">
                        {filteredStaff.length.toLocaleString()}
                      </strong>{" "}
                      entries
                    </span>

                    <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
                      <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
                        Rows:
                      </label>
                      <select
                        className="h-8 rounded-brand border border-gray-300 bg-white px-2 py-1 text-xs font-bold text-gray-700 shadow-sm transition-colors focus:border-pup-maroon focus:ring-2 focus:ring-pup-maroon focus:outline-none"
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value))
                          setCurrentPage(1)
                        }}
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={displayPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="h-8 rounded-brand border border-gray-300 bg-white px-3 text-[10px] font-black tracking-widest text-gray-600 uppercase shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95 disabled:opacity-30"
                    >
                      <i className="ph-bold ph-caret-left mr-1"></i> PREV
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
                      NEXT <i className="ph-bold ph-caret-right ml-1"></i>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
