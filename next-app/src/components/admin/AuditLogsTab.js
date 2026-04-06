"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuditLogsTab({
  displayLogs,
  isLoading = false,
  error = null,
  logPage,
  setLogPage,
  logTotal,
  logsPerPage,
  setLogsPerPage,
  logSearch,
  setLogSearch,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(logsPerPage || 10);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setLogSearch(e.target.value);
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

  const handleDownloadCSV = () => {
    if (displayLogs.length === 0) return;

    const headers = ["Date & Time", "User", "Role", "Action", "IP Address"];
    const rows = displayLogs.map((log) => [
      log.time,
      log.user,
      log.role,
      log.action,
      log.ip,
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
    link.setAttribute("download", `audit-logs-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col w-full h-full gap-4 animate-fade-in font-inter">
      <Card className="flex-1 bg-white rounded-brand border border-gray-300 shadow-sm overflow-hidden flex flex-col">
        {/* Header with filters */}
        <div className="p-4 bg-gray-50/50 flex-none border-b border-gray-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-end">
            <div className="lg:col-span-1">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                Search Audit Logs
              </label>
              <div className="relative">
                <i className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <Input
                  type="text"
                  placeholder="Search by user, action, or IP address..."
                  className="pl-10 h-9 w-full bg-white border border-gray-300 rounded-brand text-sm focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
              </div>
            </div>

            <div className="lg:col-span-1 flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                  Items Per Page
                </label>
                <select
                  className="h-9 w-full rounded-brand border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon"
                  value={itemsPerPage}
                  onChange={handleItemsPerPageChange}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                  Export
                </label>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleDownloadCSV}
                  disabled={displayLogs.length === 0}
                  className="h-9 px-4 min-w-32 font-bold text-sm bg-pup-maroon text-white hover:bg-red-900 border border-pup-maroon shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <i className="ph-bold ph-download-simple text-sm mr-1.5"></i>
                  Export CSV
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Table content */}
        <CardContent className="p-6 flex-1 flex flex-col min-h-0">
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
            <div className="h-[320px] flex flex-col items-center justify-center text-center text-gray-500">
              <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon" />
              </div>
              <p className="text-lg font-bold text-gray-900">Could not load report</p>
              <p className="text-sm font-medium text-gray-600 mt-1 max-w-md">{error}</p>
            </div>
          ) : (
            <>
              <div className={`flex-1 overflow-auto rounded-brand ${displayLogs.length === 0 ? '' : 'border border-gray-200'}`}>
                <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                    <th className="p-3 font-bold w-44">Date & Time</th>
                    <th className="p-3 font-bold w-48">User</th>
                    <th className="p-3 font-bold w-32">Role</th>
                    <th className="p-3 font-bold">Action</th>
                    <th className="p-3 font-bold text-right w-40">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {displayLogs.length === 0 ? (
                    <tr className="border-0 hover:bg-transparent">
                      <td colSpan={5} className="p-0 border-0">
                        <div className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500">
                          <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                            <i className="ph-duotone ph-list-magnifying-glass text-3xl text-pup-maroon"></i>
                          </div>
                          <div className="text-lg font-bold text-gray-900">
                            No audit logs yet
                          </div>
                          <div className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                            We couldn&apos;t find any audit logs matching your search criteria.
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayLogs.map((log, idx) => {
                      // Determine badge type based on action severity (mock logic)
                      const isDestructive =
                        log.action.toLowerCase().includes("delete") ||
                        log.action.toLowerCase().includes("remove");
                      const isAuth =
                        log.action.toLowerCase().includes("login") ||
                        log.action.toLowerCase().includes("logout");

                      return (
                        <tr
                          key={idx}
                          className="hover:bg-gray-50 group cursor-default transition-colors"
                        >
                          <td className="p-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                            {log.time}
                          </td>
                          <td className="p-3 font-bold text-gray-900 text-sm whitespace-nowrap capitalize">
                            {log.user}
                          </td>
                          <td className="p-3">
                            {log.role === "System" ? (
                              <Badge
                                variant="outline"
                                className="bg-purple-50 text-purple-700 border-purple-200 font-bold uppercase text-[9px] tracking-wider px-2 py-0.5"
                              >
                                {log.role}
                              </Badge>
                            ) : log.role === "Admin" ||
                              log.role === "SuperAdmin" ? (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-700 border-amber-200 font-bold uppercase text-[9px] tracking-wider px-2 py-0.5"
                              >
                                {log.role}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-700 border-blue-200 font-bold uppercase text-[9px] tracking-wider px-2 py-0.5"
                              >
                                {log.role}
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-xs font-medium text-gray-700">
                            {isDestructive ? (
                              <span className="text-red-600 font-bold">
                                {log.action}
                              </span>
                            ) : isAuth ? (
                              <span className="text-blue-600 font-semibold">
                                {log.action}
                              </span>
                            ) : (
                              <span>{log.action}</span>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono text-[11px] text-gray-400">
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
                    <i className="ph-bold ph-caret-left"></i> Previous
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
                    Next <i className="ph-bold ph-caret-right"></i>
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
