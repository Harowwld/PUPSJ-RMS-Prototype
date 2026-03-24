"use client";

import { useMemo } from "react";

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
    <div className="flex flex-col lg:flex-row gap-4 h-full animate-fade-in">
      <aside className="w-full lg:w-1/4 flex flex-col gap-4 h-full">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white p-4 rounded-brand border border-gray-300 shadow-sm stats-card">
            <div className="text-2xl font-bold text-pup-maroon">
              {stats.total}
            </div>
            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">
              Total Staff
            </div>
          </div>
          <div className="bg-white p-4 rounded-brand border border-gray-300 shadow-sm stats-card">
            <div className="text-2xl font-bold text-green-600">
              {stats.active}
            </div>
            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">
              Active Now
            </div>
          </div>
        </div>

        <div className="bg-white rounded-brand border border-gray-300 shadow-sm flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50/50">
            <h3 className="text-xs font-bold text-pup-maroon uppercase tracking-wide mb-3">
              Filter Directory
            </h3>
            <div className="space-y-3">
              <div className="relative group">
                <i className="ph-bold ph-magnifying-glass absolute left-3 top-2.5 text-gray-400 group-focus-within:text-pup-maroon"></i>
                <input
                  type="text"
                  placeholder="Search name or ID..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-brand text-sm focus:outline-none focus:border-pup-maroon transition-all placeholder-gray-400"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">
                  Role
                </label>
                <select
                  className="form-select text-xs"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="All">All Roles</option>
                  <option value="Admin">Admin</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">
                  Status
                </label>
                <select
                  className="form-select text-xs"
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

          <div className="flex-1 overflow-y-auto p-4 bg-white">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">
              Recent Logins
            </h4>
            <div className="space-y-3">
              {recentLogins.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 transition-colors cursor-pointer group"
                >
                  <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[10px] font-bold">
                    {s.fname[0]}
                    {s.lname[0]}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-gray-700 truncate group-hover:text-pup-maroon">
                      {s.fname} {s.lname}
                    </div>
                    <div className="text-[10px] text-gray-400 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                      {s.last_active || "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <section className="w-full lg:w-3/4 bg-white rounded-brand border border-gray-300 shadow-sm flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/30">
          <h2 className="font-bold text-pup-maroon flex items-center gap-2">
            <i className="ph-duotone ph-table"></i> Staff Management
          </h2>
          <div className="flex gap-2">
            <button
              onClick={onExportData}
              className="px-3 py-1.5 border border-gray-300 rounded-brand text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-pup-maroon transition-colors"
            >
              <i className="ph-bold ph-download-simple"></i> Export CSV
            </button>
            <button
              onClick={() => onSwitchView("create")}
              className="px-3 py-1.5 bg-pup-maroon text-white rounded-brand text-xs font-bold hover:bg-red-900 transition-colors shadow-sm flex items-center gap-1"
            >
              <i className="ph-bold ph-plus"></i> Add New
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="table-header">Staff Name</th>
                <th className="table-header w-32">ID</th>
                <th className="table-header">Role</th>
                <th className="table-header">Status</th>
                <th className="table-header">Last Active</th>
                <th className="table-header text-right w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((s) => {
                const roleBadgeClass =
                  s.role === "Admin" ? "badge-admin" : "badge-staff";
                const statusBadgeClass =
                  s.status === "Active" ? "badge-active" : "badge-inactive";

                return (
                  <tr
                    key={s.id}
                    className="table-row-hover transition-colors group"
                  >
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-pup-maroon text-white flex items-center justify-center text-xs font-bold">
                          {s.fname[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800 text-sm">
                            {s.fname} {s.lname}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {s.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell font-mono text-gray-600 text-xs whitespace-nowrap">
                      {s.id}
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${roleBadgeClass}`}>
                        {s.role}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${statusBadgeClass}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="table-cell text-xs text-gray-500 font-mono whitespace-nowrap">
                      {s.last_active || "—"}
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEditUser(s.id)}
                          className="h-8 w-8 inline-flex items-center justify-center hover:bg-gray-100 rounded text-gray-500 hover:text-pup-maroon"
                          title="Edit"
                        >
                          <i className="ph-bold ph-pencil-simple"></i>
                        </button>
                        <button
                          onClick={() => onDeleteUser(s.id)}
                          className="h-8 w-8 inline-flex items-center justify-center hover:bg-red-50 rounded text-gray-500 hover:text-red-600"
                          title="Delete"
                        >
                          <i className="ph-bold ph-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredStaff.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <i className="ph-duotone ph-ghost text-4xl mb-2"></i>
              <p className="text-sm">No staff members found.</p>
            </div>
          ) : null}
        </div>

        <div className="p-2 border-t border-gray-200 bg-gray-50 text-[10px] text-gray-400 flex justify-between px-4">
          <span>
            Showing <span>{filteredStaff.length}</span> records
          </span>
        </div>
      </section>
    </div>
  );
}
