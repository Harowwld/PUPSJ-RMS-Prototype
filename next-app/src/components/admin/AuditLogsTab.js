"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPHDateTime } from "@/lib/timeFormat";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";

export default function AuditLogsTab({
  displayLogs,
  logStats,
  isLoading = false,
  error = null,
  logPage,
  setLogPage,
  logTotal,
  logsPerPage,
  setLogsPerPage,
  logSearch,
  setLogSearch,
  logRoleFilter,
  setLogRoleFilter,
  logSeverityFilter,
  setLogSeverityFilter,
}) {
  const [searchQuery, setSearchQuery] = useState(logSearch || "");
  const [itemsPerPage, setItemsPerPage] = useState(logsPerPage || 10);
  const [isExporting, setIsExporting] = useState(false);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setLogSearch(e.target.value);
    setLogPage(1);
  };

  const handleRoleChange = (e) => {
    setLogRoleFilter(e.target.value);
    setLogPage(1);
  };

  const handleSeverityChange = (e) => {
    setLogSeverityFilter(e.target.value);
    setLogPage(1);
  };

  const handleItemsPerPageChange = (e) => {
    const value = Number(e.target.value);
    setItemsPerPage(value);
    setLogsPerPage(value);
    setLogPage(1);
  };

  const startItem = (logPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(logPage * itemsPerPage, logTotal);

  const handleDownloadCSV = async () => {
    if (logTotal === 0 || isExporting) return;
    setIsExporting(true);

    try {
      const roleQuery = logRoleFilter !== "All" ? `&role=${encodeURIComponent(logRoleFilter)}` : "";
      const sevQuery = logSeverityFilter !== "All" ? `&severity=${encodeURIComponent(logSeverityFilter)}` : "";
      const res = await fetch(`/api/audit-logs?limit=50000&search=${encodeURIComponent(logSearch)}${roleQuery}${sevQuery}`);
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Export failed");

      const allLogs = Array.isArray(json.data) ? json.data : [];
      const headers = ["Date & Time", "Severity", "Actor", "Role", "Action", "Details", "IP Address", "User Agent", "Entity Type", "Entity ID"];
      
      const rows = allLogs.map((log) => [
        formatPHDateTime(log.created_at),
        log.severity || "INFO",
        log.actor,
        log.role,
        log.action,
        log.details || "—",
        log.ip || "—",
        log.user_agent || "—",
        log.entity_type || "—",
        log.entity_id || "—",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `audit-logs-full-${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("[Export Error]", err);
    } finally {
      setIsExporting(false);
    }
  };

  const getSeverityColor = (sev) => {
    switch (String(sev || "").toUpperCase()) {
      case "CRITICAL": return "bg-red-100 text-red-700 border-red-200";
      case "WARNING": return "bg-amber-100 text-amber-700 border-amber-200";
      default: return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  return (
    <div className="flex flex-col w-full gap-4 animate-fade-in font-inter">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm relative overflow-hidden group hover:border-pup-maroon/30 transition-all">
          <i className="ph-duotone ph-scroll absolute -right-3 -bottom-3 text-6xl opacity-5 text-pup-maroon rotate-12 group-hover:scale-110 transition-transform" />
          <div className="relative z-10">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Logs</p>
            {isLoading || !logStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                  {logStats.totalLogs.toLocaleString()}
                </h3>
                <p className="text-[10px] font-medium text-gray-500 mt-0.5">Cumulative system events</p>
              </>
            )}
          </div>
        </div>

        <div className="bg-[#fdf6f6] rounded-xl p-5 border border-[#7a1e28]/10 shadow-sm relative overflow-hidden group hover:border-pup-maroon/30 transition-all">
          <i className="ph-duotone ph-calendar-check absolute -right-3 -bottom-3 text-6xl opacity-10 text-pup-maroon rotate-12 group-hover:scale-110 transition-transform" />
          <div className="relative z-10">
            <p className="text-[10px] font-black text-[#9e5a62] uppercase tracking-widest mb-1">Logs Today</p>
            {isLoading || !logStats ? (
              <Skeleton className="h-8 w-20 bg-[#7a1e28]/5" />
            ) : (
              <>
                <h3 className="text-2xl font-black text-pup-maroon tracking-tight">
                  {logStats.logsToday.toLocaleString()}
                </h3>
                <p className="text-[10px] font-medium text-[#9e5a62] mt-0.5">Activity since midnight</p>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm relative overflow-hidden group hover:border-pup-maroon/30 transition-all">
          <i className="ph-duotone ph-fingerprint absolute -right-3 -bottom-3 text-6xl opacity-5 text-pup-maroon rotate-12 group-hover:scale-110 transition-transform" />
          <div className="relative z-10">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Auth Events</p>
            {isLoading || !logStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                  {logStats.authEvents.toLocaleString()}
                </h3>
                <p className="text-[10px] font-medium text-gray-500 mt-0.5">Logins and access attempts</p>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm relative overflow-hidden group hover:border-pup-maroon/30 transition-all">
          <i className="ph-duotone ph-warning-octagon absolute -right-3 -bottom-3 text-6xl opacity-5 text-red-600 rotate-12 group-hover:scale-110 transition-transform" />
          <div className="relative z-10">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Critical Events</p>
            {isLoading || !logStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <h3 className={`text-2xl font-black tracking-tight ${logStats.criticalEvents > 0 ? "text-red-600" : "text-gray-900"}`}>
                  {logStats.criticalEvents.toLocaleString()}
                </h3>
                <p className="text-[10px] font-medium text-gray-500 mt-0.5">High-priority security alerts</p>
              </>
            )}
          </div>
        </div>
      </div>

      <Card className="bg-white rounded-brand border border-gray-300 shadow-sm">
        {/* Header with filters */}
        <div className="p-4 bg-gray-50/50 border-b border-gray-200">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-end">
            <div className="xl:col-span-4">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700 uppercase">
                  Search Logs
                </label>
                {(searchQuery !== "" || logRoleFilter !== "All" || logSeverityFilter !== "All") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setLogSearch("");
                      setLogRoleFilter("All");
                      setLogSeverityFilter("All");
                      setLogPage(1);
                    }}
                    className="h-5 px-1.5 text-[9px] font-bold text-pup-maroon hover:bg-red-50 hover:text-pup-darkMaroon"
                  >
                    CLEAR ALL
                  </Button>
                )}
              </div>
              <div className="relative">
                <i className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <Input
                  type="text"
                  placeholder="User, action, details, entity, or IP..."
                  className="pl-10 h-10 w-full bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"                  value={searchQuery}
                  onChange={handleSearchChange}
                />
              </div>
            </div>

            <div className="xl:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                Filter by Role
              </label>
              <select
                className="h-10 w-full rounded-brand border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon"
                value={logRoleFilter}
                onChange={handleRoleChange}
              >
                <option value="All">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Staff">Staff</option>
                <option value="System">System</option>
              </select>
            </div>

            <div className="xl:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                Severity
              </label>
              <select
                className="h-10 w-full rounded-brand border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon"
                value={logSeverityFilter}
                onChange={handleSeverityChange}
              >
                <option value="All">All Severities</option>
                <option value="INFO">INFO</option>
                <option value="WARNING">WARNING</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            <div className="xl:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                Items
              </label>
              <select
                className="h-10 w-full rounded-brand border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon"
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>

            <div className="xl:col-span-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleDownloadCSV}
                disabled={logTotal === 0 || isExporting}
                className="h-10 w-full font-bold text-sm bg-pup-maroon text-white hover:bg-red-900 border border-pup-maroon shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <i className={`ph-bold ${isExporting ? "ph-circle-notch animate-spin" : "ph-download-simple"} text-sm`}></i>
                {isExporting ? "EXPORTING..." : "EXPORT CSV"}
              </Button>
            </div>
          </div>
        </div>

        {/* Table content */}
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-brand" />
                ))}
              </div>
              <Skeleton className="h-4 w-full max-w-md rounded-brand" />
              <Skeleton className="h-32 rounded-brand" />
            </div>
          ) : error ? (
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
          ) : (
            <>
              <div className={`overflow-x-auto rounded-brand ${displayLogs.length === 0 ? '' : 'border border-gray-200'}`}>
                <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                    <th className="p-3 font-bold w-40">Timestamp</th>
                    <th className="p-3 font-bold w-24">Severity</th>
                    <th className="p-3 font-bold w-44">User / Actor</th>
                    <th className="p-3 font-bold w-44">Action</th>
                    <th className="p-3 font-bold">Rich Details</th>
                    <th className="p-3 font-bold w-12 text-center"><i className="ph-bold ph-desktop" title="Device/Browser"></i></th>
                    <th className="p-3 font-bold text-right w-32">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {displayLogs.length === 0 ? (
                    <tr className="border-0 hover:bg-transparent">
                      <td colSpan={7} className="p-0 border-0">
                        <Empty className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500 border-0">
                          <EmptyHeader className="flex flex-col items-center gap-0">
                            <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                              <i className="ph-duotone ph-list-magnifying-glass text-3xl text-pup-maroon"></i>
                            </EmptyMedia>
                            <EmptyTitle className="text-lg font-bold text-gray-900">No audit logs yet</EmptyTitle>
                            <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                              We couldn&apos;t find any audit logs matching your search criteria.
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      </td>
                    </tr>
                  ) : (
                    displayLogs.map((log) => {
                      const isArchival =
                        log.action.toLowerCase().includes("delete") ||
                        log.action.toLowerCase().includes("remove") ||
                        log.action.toLowerCase().includes("archive");
                      const isAuth =
                        log.action.toLowerCase().includes("login") ||
                        log.action.toLowerCase().includes("logout");

                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-gray-50 group cursor-default transition-colors"
                        >
                          <td className="p-3 font-mono text-[10px] text-gray-500 whitespace-nowrap">
                            {log.time}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className={`font-black text-[9px] px-1.5 py-0.5 rounded-sm border-0 ${getSeverityColor(log.severity)}`}>
                              {log.severity}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-900 text-sm whitespace-nowrap">{log.user}</span>
                              <span className="text-[9px] text-gray-400 font-black uppercase tracking-tighter">{log.role}</span>
                            </div>
                          </td>
                          <td className="p-3 text-xs font-bold">
                            {isArchival ? (
                              <span className="text-red-600 uppercase tracking-tighter">{log.action}</span>
                            ) : isAuth ? (
                              <span className="text-blue-600 uppercase tracking-tighter">{log.action}</span>
                            ) : (
                              <span className="text-gray-700 uppercase tracking-tighter">{log.action}</span>
                            )}
                          </td>
                          <td className="p-3 text-xs text-gray-600 leading-relaxed font-medium">
                            {log.details}
                            {(log.entityType || log.entityId) && (
                              <div className="flex gap-2 mt-1">
                                {log.entityType && <span className="bg-gray-100 text-gray-500 text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase">{log.entityType}</span>}
                                {log.entityId && <span className="text-[9px] text-gray-400 font-mono">ID: {log.entityId}</span>}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center justify-center text-gray-300 hover:text-gray-600 transition-colors" title={log.userAgent}>
                              <i className="ph-bold ph-info text-base"></i>
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono text-[10px] text-gray-400">
                            {log.ip}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs font-medium text-gray-500">
                  {logTotal > 0 ? (
                    <>
                      Showing {startItem}-{endItem} of{" "}
                      <strong className="text-gray-900">{logTotal.toLocaleString()}</strong>{" "}
                      audit log entries
                    </>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={logPage <= 1}
                    onClick={() => setLogPage((p) => p - 1)}
                    className="h-8 text-xs font-bold text-gray-600"
                  >
                    <i className="ph-bold ph-caret-left"></i> PREVIOUS
                  </Button>
                  <div className="px-3 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-md h-8 flex items-center justify-center min-w-12 shadow-sm">
                    {logPage} / {Math.max(1, Math.ceil(logTotal / itemsPerPage))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={logPage >= Math.ceil(logTotal / itemsPerPage)}
                    onClick={() => setLogPage((p) => p + 1)}
                    className="h-8 text-xs font-bold text-gray-600"
                  >
                    NEXT <i className="ph-bold ph-caret-right"></i>
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
    </Card>
  </div>
);
}
