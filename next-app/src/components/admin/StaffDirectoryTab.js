"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function StaffDirectoryTab({
  staffData,
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

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full animate-fade-in font-inter">
      <aside className="w-full lg:w-1/4 flex flex-col gap-4 h-full">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white p-4 rounded-brand border border-gray-200 shadow-sm">
            <div className="text-2xl font-bold text-pup-maroon">
              {stats.total}
            </div>
            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wide mt-1">
              Total Staff
            </div>
          </div>
          <div className="bg-white p-4 rounded-brand border border-gray-200 shadow-sm">
            <div className="text-2xl font-bold text-green-600">
              {stats.active}
            </div>
            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wide mt-1">
              Active Now
            </div>
          </div>
        </div>

        <div className="bg-white rounded-brand border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
              <i className="ph-bold ph-funnel"></i> Directory Filters
            </h3>
            <div className="space-y-4">
              <div className="relative group">
                <i className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pup-maroon transition-colors"></i>
                <Input
                  type="text"
                  placeholder="Query name or ID..."
                  className="pl-9 h-9 border-gray-200 bg-white"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">
                  System Role
                </label>
                <select
                  className="flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="All">All Roles</option>
                  <option value="Admin">Administrator</option>
                  <option value="Staff">Records Staff</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">
                  Activity Status
                </label>
                <select
                  className="flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Online Active</option>
                  <option value="Inactive">Offline</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 bg-white">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-4">
              Recent Network Check-ins
            </h4>
            <div className="space-y-3">
              {recentLogins.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group border border-transparent hover:border-gray-100"
                >
                  <div className="w-8 h-8 rounded-full bg-red-50 text-pup-maroon flex items-center justify-center text-xs font-bold border border-red-100 shrink-0">
                    {s.fname[0]}
                    {s.lname[0]}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-sm font-bold text-gray-800 truncate group-hover:text-pup-maroon transition-colors">
                      {s.fname} {s.lname}
                    </div>
                    <div className="text-[10px] font-medium text-gray-400 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                      {s.last_active || "Currently Online"}
                    </div>
                  </div>
                </div>
              ))}
              {recentLogins.length === 0 && (
                <div className="text-sm text-gray-500 italic px-2">No strictly active network sessions found.</div>
              )}
            </div>
          </div>
        </div>
      </aside>

      <section className="w-full lg:w-3/4 bg-white rounded-brand border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
              <i className="ph-duotone ph-users-three text-lg"></i>
            </div>
            <h2 className="font-bold text-gray-900 text-lg">
              Staff Management
            </h2>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onExportData}
              className="h-9 gap-2 text-gray-600 font-bold"
            >
              <i className="ph-bold ph-download-simple text-base"></i> Export CSV
            </Button>
            <Button
              size="sm"
              onClick={() => onSwitchView("create")}
              className="h-9 gap-2 bg-pup-maroon hover:bg-red-900 text-white font-bold shadow-sm"
            >
              <i className="ph-bold ph-plus text-base"></i> Add Staff
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                <th className="p-3 font-bold">Name</th>
                <th className="p-3 font-bold w-32">Staff ID</th>
                <th className="p-3 font-bold w-28">Role</th>
                <th className="p-3 font-bold w-24">Status</th>
                <th className="p-3 font-bold whitespace-nowrap">Last Active</th>
                <th className="p-3 font-bold text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <div className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500">
                        <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                        <i className="ph-duotone ph-users-three text-3xl text-pup-maroon"></i>
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        No staff records yet
                      </div>
                      <div className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                        We couldn't find any staff members matching your search criteria.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 group cursor-default transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3 py-1">
                        <div className="w-8 h-8 rounded-full bg-red-50 text-pup-maroon flex items-center justify-center text-xs font-bold border border-red-100 shrink-0">
                          {s.fname[0]}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-sm">
                            {s.fname} {s.lname}
                          </div>
                          <div className="text-[11px] font-medium text-gray-500">
                            {s.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-gray-500 text-xs">
                      {s.id}
                    </td>
                    <td className="p-3">
                      {s.role === "Admin" || s.role === "SuperAdmin" ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold uppercase text-[9px] tracking-wider px-2 py-0.5">
                          {s.role}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold uppercase text-[9px] tracking-wider px-2 py-0.5">
                          {s.role}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      {s.status === "Active" ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-bold uppercase text-[9px] tracking-wider px-2 py-0.5 flex w-max items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                          {s.status}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200 font-bold uppercase text-[9px] tracking-wider px-2 py-0.5">
                          {s.status}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-xs text-gray-500 font-mono">
                      {s.last_active || "—"}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onEditUser(s.id)}
                          className="h-8 w-8 text-gray-400 hover:text-pup-maroon hover:bg-red-50"
                          title="Modify Account"
                        >
                          <i className="ph-bold ph-pencil-simple text-base"></i>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onDeleteUser(s.id)}
                          className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                          title="Revoke Network Credentials"
                        >
                          <i className="ph-bold ph-trash text-base"></i>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-gray-100 bg-gray-50 text-xs font-medium text-gray-500 flex justify-between px-6 shrink-0">
          <span>
            Showing <strong className="text-gray-900">{filteredStaff.length}</strong> personnel records across network
          </span>
        </div>
      </section>
    </div>
  );
}
