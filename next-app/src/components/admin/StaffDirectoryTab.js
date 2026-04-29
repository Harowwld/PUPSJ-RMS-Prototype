"use client";

import { useMemo, useState, useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPHDateTime, formatPHDateTimeParts } from "@/lib/timeFormat";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  onDeleteUser,
  onExportData,
  onSwitchView,
}) {
  const filteredStaff = useMemo(() => {
    const q = search.toLowerCase();
    return staffData.filter((s) => {
      const matchesSearch =
        `${s.fname} ${s.lname}`.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q);
      const matchesRole = roleFilter === "All" || s.role === roleFilter;
      const matchesStatus = statusFilter === "All" || s.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [search, roleFilter, staffData, statusFilter]);

  const recentLogins = useMemo(() => {
    return staffData.filter((s) => s.status === "Active").slice(0, 4);
  }, [staffData]);

  const stats = useMemo(() => {
    return {
      total: staffData.length,
      active: staffData.filter((s) => s.status === "Active").length,
    };
  }, [staffData]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage) || 1;

  // Cap current page if filtering reduces dataset below current page
  const displayPage = Math.min(currentPage, totalPages);

  const paginatedStaff = useMemo(() => {
    const start = (displayPage - 1) * itemsPerPage;
    return filteredStaff.slice(start, start + itemsPerPage);
  }, [filteredStaff, displayPage, itemsPerPage]);

  const formatLastActive = (v) => {
    const raw = String(v || "").trim();
    if (!raw) return { date: "—", time: "" };
    // If it's already a human label, just return it as date
    if (!raw.includes("-") && !raw.includes(":")) return { date: raw, time: "" };
    return formatPHDateTimeParts(raw);
  };

  return (
    <div className="flex flex-col w-full h-full gap-4 animate-fade-in font-inter">
      {isLoading ? (
        <div className="flex flex-col lg:flex-row flex-1 gap-4 items-stretch overflow-hidden">
          {/* Sidebar Skeleton */}
          <aside className="w-full lg:w-1/4 flex flex-col gap-4 h-full overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="bg-white rounded-brand border border-gray-200 p-4 h-24 flex flex-col justify-center gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-20" />
              </div>
              <div className="bg-white rounded-brand border border-gray-200 p-4 h-24 flex flex-col justify-center gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>

            <div className="bg-white rounded-brand border border-gray-200 flex-1 flex flex-col overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 space-y-4">
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
              <div className="p-5 space-y-4">
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
          <Card className="w-full lg:w-3/4 bg-white rounded-brand border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
            <CardContent className="p-6 flex-1 flex flex-col min-h-0 bg-white">
              <div className="flex-1 border border-gray-200 rounded-brand overflow-hidden flex flex-col">
                <Skeleton className="h-10 w-full rounded-none" />
                <div className="divide-y divide-gray-100 flex-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="p-4 flex items-center justify-between">
                      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-full" />
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-2 w-24" />
                          </div>
                        </div>
                        <div className="hidden lg:flex items-center">
                          <Skeleton className="h-4 w-20 font-mono" />
                        </div>
                        <div className="hidden lg:flex items-center">
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                        <div className="hidden lg:flex items-center">
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                        <div className="hidden lg:flex items-center">
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
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
        <Card className="flex-1 bg-white rounded-brand border border-gray-300 shadow-sm overflow-hidden flex flex-col">
          <CardContent className="p-6 flex-1 flex flex-col min-h-0">
            <Empty className="h-[320px] flex flex-col items-center justify-center text-center text-gray-500 border-0">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                  <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon" />
                </EmptyMedia>
                <EmptyTitle className="text-lg font-bold text-gray-900">Could not load report</EmptyTitle>
                <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                  {error}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col lg:flex-row flex-1 gap-4 items-stretch overflow-hidden">
          <aside className="w-full lg:w-1/4 flex flex-col gap-4 h-full overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
              {/* Total Records — Accent Card */}
              <div className="relative rounded-xl p-4 overflow-hidden border border-[#5c1520] bg-[#7a1e28] shadow-sm group transition-all">
                <i className="ph-duotone ph-users-four absolute -right-3 -bottom-3 text-[60px] opacity-20 text-white rotate-12 pointer-events-none" />
                <div className="relative z-10">
                  <p className="text-[10px] font-bold text-[#f7c9ce] uppercase tracking-widest mb-1">Total Records</p>
                  <h3 className="text-3xl font-bold text-white tracking-tight leading-none">
                    {stats.total?.toLocaleString?.() ?? stats.total}
                  </h3>
                </div>
              </div>

              {/* Network Online — Light Card */}
              <div className="relative rounded-xl p-4 overflow-hidden border border-[#7a1e28]/15 bg-[#fdf6f6] shadow-sm group transition-all">
                <i className="ph-duotone ph-broadcast absolute -right-3 -bottom-3 text-[60px] opacity-10 text-[#7a1e28] rotate-12 pointer-events-none" />
                <div className="relative z-10">
                  <p className="text-[10px] font-bold text-[#9e5a62] uppercase tracking-widest mb-1">Network Online</p>
                  <div className="flex items-center gap-2">
                    <h3 className="text-3xl font-bold text-[#7a1e28] tracking-tight leading-none">
                      {stats.active?.toLocaleString?.() ?? stats.active}
                    </h3>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-brand border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                    <i className="ph-bold ph-funnel"></i> Directory Filters
                  </h3>
                  {(search !== "" || roleFilter !== "All" || statusFilter !== "All") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearch("");
                        setRoleFilter("All");
                        setStatusFilter("All");
                      }}
                      className="h-5 px-1.5 text-[9px] font-bold text-pup-maroon hover:bg-red-50 hover:text-pup-darkMaroon"
                    >
                      CLEAR ALL
                    </Button>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="relative group">
                    <i className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pup-maroon transition-colors"></i>
                    <Input
                      type="text"
                      placeholder="Query name or ID..."
                      className="h-10 pl-9 bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 uppercase mb-1.5 block">
                      System Role
                    </label>
                    <select
                      className="h-10 w-full rounded-brand border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon"
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                    >
                      <option value="All">All Roles</option>
                      <option value="Admin">Admin</option>
                      <option value="Staff">Staff</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">
                      Activity Status
                    </label>
                    <select
                      className="h-10 w-full rounded-brand border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="All">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 bg-white">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-4">
                  Recent Network Check-ins
                </h4>
                <div className="space-y-3">
                  {recentLogins.map((s, idx) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-all cursor-pointer group border border-transparent hover:border-gray-100 animate-in zoom-in-95 duration-300 fill-mode-forwards"
                      style={{
                        animationDelay: `${idx * 80}ms`,
                      }}
                    >
                      <div className="w-8 h-8 rounded-full bg-red-50 text-pup-maroon flex items-center justify-center text-xs font-bold border border-red-100 shrink-0 transition-transform duration-300 group-hover:scale-110">
                        {s.fname[0]}
                        {s.lname[0]}
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-sm font-bold text-gray-800 truncate group-hover:text-pup-maroon transition-colors">
                          {s.fname} {s.lname}
                        </div>
                        <div className="text-[10px] font-medium text-gray-400 flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                          {s.last_active ? formatLastActive(s.last_active).date : "Currently Online"}
                        </div>
                      </div>
                    </div>
                  ))}
                  {recentLogins.length === 0 && (
                    <Empty className="border-0 opacity-80 py-6">
                      <EmptyHeader className="flex flex-col items-center gap-0">
                        <EmptyMedia className="mb-2">
                          <i className="ph-bold ph-broadcast text-2xl text-gray-300"></i>
                        </EmptyMedia>
                        <EmptyTitle className="text-gray-400 text-[10px] italic font-bold">
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

          <Card className="w-full lg:w-3/4 bg-white rounded-brand border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
            <CardContent className="p-6 flex-1 flex flex-col min-h-0 bg-white">
              <div className="flex-1 overflow-y-auto overflow-x-auto border border-gray-200 rounded-brand">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                      <th className="p-3 font-bold">Personnel Name</th>
                      <th className="p-3 font-bold w-32">Staff ID</th>
                      <th className="p-3 font-bold w-28">Role</th>
                      <th className="p-3 font-bold w-28">Status</th>
                      <th className="p-3 font-bold whitespace-nowrap">
                        Last Active
                      </th>
                      <th className="p-3 font-bold text-right w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredStaff.length === 0 ? (
                      <tr className="border-0 hover:bg-transparent">
                        <td colSpan={6} className="p-0 border-0">
                          <Empty className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500 border-0">
                            <EmptyHeader className="flex flex-col items-center gap-0">
                              <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                                <i className="ph-duotone ph-users-three text-3xl text-pup-maroon"></i>
                              </EmptyMedia>
                              <EmptyTitle className="text-lg font-bold text-gray-900">No staff records yet</EmptyTitle>
                              <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                                We couldn&apos;t find any staff members matching your
                                search criteria.
                              </EmptyDescription>
                            </EmptyHeader>
                          </Empty>
                        </td>
                      </tr>
                    ) : (
                      paginatedStaff.map((s) => {
                        const isCurrentUser = s.id === currentUserId;
                        const active = formatLastActive(s.last_active);
                        return (
                        <tr
                          key={s.id}
                          className={`hover:bg-gray-50 group transition-colors ${isCurrentUser ? "bg-red-50/40" : ""}`}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-3 py-1">
                              <div className="w-9 h-9 rounded-full bg-red-50 text-pup-maroon flex items-center justify-center text-xs font-black border border-red-100 shadow-xs shrink-0 transition-transform group-hover:scale-105">
                                {s.fname[0]}{s.lname[0]}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                  <span className="truncate">{s.fname} {s.lname}</span>
                                  {isCurrentUser && (
                                    <Badge variant="outline" className="bg-pup-maroon text-white border-pup-maroon font-black text-[9px] uppercase px-1.5 py-0 leading-tight h-4 rounded-full">
                                      You
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-[11px] font-medium text-gray-500 truncate">
                                  {s.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 font-mono font-bold text-gray-900 text-xs">
                            {s.id}
                          </td>
                          <td className="p-3">
                            {s.role === "Admin" || s.role === "SuperAdmin" ? (
                              <Badge
                                variant="outline"
                                className="bg-red-50 text-pup-maroon border-red-200 font-bold uppercase text-[10px] px-2 py-1 rounded-full shadow-xs"
                              >
                                <i className="ph-fill ph-shield-check mr-1.5" />
                                {s.role}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-700 border-amber-200 font-bold uppercase text-[10px] px-2 py-1 rounded-full shadow-xs"
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
                                className="bg-green-50 text-green-700 border-green-200 font-bold uppercase text-[10px] px-2 py-1 rounded-full shadow-xs flex w-max items-center gap-1.5"
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                {s.status}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-gray-50 text-gray-500 border-gray-200 font-bold uppercase text-[10px] px-2 py-1 rounded-full shadow-xs"
                              >
                                {s.status}
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
                                  onClick={() => window.location.href = "/account"}
                                  className="h-9 px-3 font-bold text-xs border-gray-300 text-gray-700 hover:text-pup-maroon hover:bg-red-50 hover:border-pup-maroon rounded-brand transition-all shadow-sm"
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
                                    className="h-9 px-3 font-bold text-xs border-gray-300 text-gray-700 hover:text-pup-maroon hover:bg-red-50 hover:border-pup-maroon rounded-brand transition-all shadow-sm"
                                    title="Modify Account"
                                  >
                                    <i className="ph-bold ph-pencil-simple mr-1.5"></i>
                                    EDIT
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onDeleteUser(s.id)}
                                    className="h-9 px-3 font-bold text-xs border-red-200 text-red-700 hover:text-red-800 hover:bg-red-50 hover:border-red-300 rounded-brand transition-all shadow-sm"
                                    title="Revoke Network Credentials"
                                  >
                                    <i className="ph-bold ph-trash mr-1.5"></i>
                                    DELETE
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {filteredStaff.length > 0 && (
                <div className="mt-4 flex items-center justify-between shrink-0">
                  <div className="text-xs font-medium text-gray-500">
                    Showing {(displayPage - 1) * itemsPerPage + 1}-
                    {Math.min(displayPage * itemsPerPage, filteredStaff.length)} of{" "}
                    <strong className="text-gray-900">
                      {filteredStaff.length}
                    </strong>{" "}
                    personnel records
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 mr-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Per Page
                      </label>
                      <select
                        className="h-8 rounded-brand border border-gray-300 bg-white px-2 py-1 text-xs font-bold text-gray-700 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon"
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={displayPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="text-xs font-bold text-gray-600 h-8"
                    >
                      <i className="ph-bold ph-caret-left mr-1"></i> PREVIOUS
                    </Button>
                    <div className="px-3 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-brand h-8 flex items-center justify-center min-w-12 shadow-sm">
                      {displayPage} / {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={displayPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="text-xs font-bold text-gray-600 h-8"
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
  );
}
