"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import Header from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPHDateTimeParts } from "@/lib/timeFormat";
import { Select } from "@/components/ui/select"
import { isAdminRole } from "@/lib/roleUtils";
import PageHeader from "@/components/shared/PageHeader";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function getActionIcon(action) {
  const act = String(action || "").toLowerCase();
  if (act.includes("login")) return "ph-duotone ph-sign-in";
  if (act.includes("logout")) return "ph-duotone ph-sign-out";
  if (act.includes("create") || act.includes("add")) return "ph-duotone ph-plus-circle";
  if (act.includes("delete") || act.includes("remove")) return "ph-duotone ph-trash";
  if (act.includes("restore")) return "ph-duotone ph-arrow-counter-clockwise";
  if (act.includes("update") || act.includes("edit")) return "ph-duotone ph-pencil-line";
  if (act.includes("upload") || act.includes("ingest")) return "ph-duotone ph-cloud-arrow-up";
  if (act.includes("download") || act.includes("export")) return "ph-duotone ph-download-simple";
  if (act.includes("view") || act.includes("preview")) return "ph-duotone ph-eye";
  if (act.includes("approve")) return "ph-duotone ph-check-circle";
  if (act.includes("reject")) return "ph-duotone ph-x-circle";
  if (act.includes("archive")) return "ph-duotone ph-archive";
  if (act.includes("rotate") || act.includes("password")) return "ph-duotone ph-key";
  if (act.includes("backup")) return "ph-duotone ph-database";
  return "ph-duotone ph-activity";
}

function getSeverityConfig(sev) {
  switch (String(sev || "").toUpperCase()) {
    case "CRITICAL":
      return {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        icon: "ph-fill ph-warning-circle"
      };
    case "WARNING":
      return {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        icon: "ph-fill ph-warning"
      };
    default:
      return {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
        icon: "ph-fill ph-info"
      };
  }
}

export default function AccountActivityPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch { /* ignore */ }
    localStorage.setItem("pup-logout", Date.now());
    router.push("/");
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          if (res.status === 401) {
            router.push("/");
          }
          return;
        }
        setAuthUser(json.data);
      } finally {
        setLoadingUser(false);
      }
    })();
  }, [router]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * perPage;
      const sevQuery = severityFilter !== "All" ? `&severity=${encodeURIComponent(severityFilter)}` : "";
      const res = await fetch(
        `/api/audit-logs?mine=1&limit=${perPage}&offset=${offset}&search=${encodeURIComponent(search)}${sevQuery}`,
        { cache: "no-store" }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to load activity");
      setRows(Array.isArray(json.data) ? json.data : []);
      setTotal(Number(json.total) || 0);
    } catch {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, severityFilter]);

  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch("/api/audit-logs/stats?mine=1");
      const json = await res.json();
      if (res.ok && json?.ok) {
        setStats(json.data);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (loadingUser) return;
    if (!authUser) return;
    refresh();
    refreshStats();
  }, [loadingUser, authUser, refresh, refreshStats]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const displayPage = Math.min(page, totalPages);

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-gray-50/50 animate-fade-in">
        <div className="h-16 bg-white border-b border-gray-200" />
        <main className="max-w-[1200px] mx-auto p-8 space-y-8">
          <div className="flex flex-col gap-2">
            <Skeleton className="w-64 h-8" />
            <Skeleton className="w-96 h-4" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <Skeleton className="h-32 rounded-2xl" />
             <Skeleton className="h-32 rounded-2xl" />
             <Skeleton className="h-32 rounded-2xl" />
             <Skeleton className="h-32 rounded-2xl" />
          </div>
          <Skeleton className="h-[500px] w-full rounded-2xl" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB] font-inter">
      <Header authUser={authUser} onLogout={handleLogout} />

      <main className="flex-1 w-full max-w-[1400px] mx-auto py-10 px-6 animate-fade-in">
        <TooltipProvider delay={200}>
          <PageHeader
            icon="ph-clock-counter-clockwise"
            title="My Activity"
            description="Review a complete audit history of actions performed by your account."
            actions={
              <Button
                variant="outline"
                onClick={() => {
                  const path = isAdminRole(authUser?.role) ? "/admin" : "/staff";
                  router.push(path);
                }}
                className="h-10 px-5 font-black uppercase tracking-widest text-[10px] border-gray-300 bg-white hover:border-pup-maroon hover:text-pup-maroon transition-all shadow-xs flex items-center gap-2 rounded-xl active:scale-95"
              >
                <i className="ph-bold ph-caret-left"></i>
                Return to Dashboard
              </Button>
            }
          />

          <Separator className="mt-8 bg-gray-200" />

          {/* Stats Bar */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Activity - Blue */}
            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all">
              <i className="ph-duotone ph-list-numbers absolute -right-3 -bottom-3 text-7xl opacity-10 text-blue-600 rotate-12 group-hover:scale-110 transition-transform" />
              <div className="relative z-10">
                <p className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest mb-1.5">Total Activity</p>
                {!stats ? (
                  <Skeleton className="h-8 w-20 bg-blue-200/20" />
                ) : (
                  <>
                    <h3 className="text-3xl font-black text-blue-900 tracking-tight">
                      {stats.totalLogs.toLocaleString()}
                    </h3>
                    <p className="text-[10px] font-medium text-blue-700 mt-1">Actions performed</p>
                  </>
                )}
              </div>
            </div>

            {/* Actions Today - Green */}
            <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-all">
              <i className="ph-duotone ph-calendar-check absolute -right-3 -bottom-3 text-7xl opacity-10 text-emerald-600 rotate-12 group-hover:scale-110 transition-transform" />
              <div className="relative z-10">
                <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-1.5">Actions Today</p>
                {!stats ? (
                  <Skeleton className="h-8 w-20 bg-emerald-200/20" />
                ) : (
                  <>
                    <h3 className="text-3xl font-black text-emerald-900 tracking-tight">
                      {stats.logsToday.toLocaleString()}
                    </h3>
                    <p className="text-[10px] font-medium text-emerald-700 mt-1">Since midnight</p>
                  </>
                )}
              </div>
            </div>

            {/* Auth History - Yellow/Amber */}
            <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 shadow-sm relative overflow-hidden group hover:border-amber-200 transition-all">
              <i className="ph-duotone ph-fingerprint absolute -right-3 -bottom-3 text-7xl opacity-10 text-amber-600 rotate-12 group-hover:scale-110 transition-transform" />
              <div className="relative z-10">
                <p className="text-[10px] font-black text-amber-600/60 uppercase tracking-widest mb-1.5">Auth History</p>
                {!stats ? (
                  <Skeleton className="h-8 w-20 bg-amber-200/20" />
                ) : (
                  <>
                    <h3 className="text-3xl font-black text-amber-900 tracking-tight">
                      {stats.authEvents.toLocaleString()}
                    </h3>
                    <p className="text-[10px] font-medium text-amber-700 mt-1">Logins & logouts</p>
                  </>
                )}
              </div>
            </div>

            {/* Security Level - Red */}
            <div className="bg-red-50 rounded-2xl p-6 border border-red-100 shadow-sm relative overflow-hidden group hover:border-red-200 transition-all">
              <i className="ph-duotone ph-warning-octagon absolute -right-3 -bottom-3 text-7xl opacity-10 text-red-600 rotate-12 group-hover:scale-110 transition-transform" />
              <div className="relative z-10">
                <p className="text-[10px] font-black text-red-600/60 uppercase tracking-widest mb-1.5">Security Level</p>
                {!stats ? (
                  <Skeleton className="h-8 w-20 bg-red-200/20" />
                ) : (
                  <>
                    <h3 className={`text-3xl font-black tracking-tight ${stats.criticalEvents > 0 ? "text-red-600" : "text-red-900"}`}>
                      {stats.criticalEvents.toLocaleString()}
                    </h3>
                    <p className="text-[10px] font-medium text-red-700 mt-1">High-severity alerts</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <Card className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Filter Bar */}
            <div className="p-6 bg-gray-50/80 border-b border-gray-100">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
                <div className="lg:col-span-6">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      Search Audit Trace
                    </label>
                    {(search !== "" || severityFilter !== "All") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearch("");
                          setSeverityFilter("All");
                          setPage(1);
                        }}
                        className="h-5 px-1.5 text-[9px] font-black text-pup-maroon hover:bg-red-50 hover:text-pup-darkMaroon uppercase tracking-tighter"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                  <div className="relative group">
                    <i className="ph-bold ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pup-maroon transition-colors"></i>
                    <Input
                      type="text"
                      placeholder="Search by action, details, entity, or IP..."
                      className="pl-11 h-12 w-full rounded-xl border border-gray-200 bg-white text-sm font-bold shadow-xs transition-all focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-pup-maroon/20 text-gray-900"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                    />
                  </div>
                </div>

                <div className="lg:col-span-4">
                  <label className="block text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest ml-1">
                    Severity
                  </label>
                  <Select
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 shadow-xs outline-none transition-all focus:border-gray-300 focus:ring-2 focus:ring-pup-maroon/20"
                    value={severityFilter}
                    onChange={(e) => {
                      setSeverityFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="All">All</option>
                    <option value="INFO">INFO</option>
                    <option value="WARNING">WARNING</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </Select>
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest ml-1">
                    Display
                  </label>
                  <Select
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 shadow-xs outline-none transition-all focus:border-gray-300 focus:ring-2 focus:ring-pup-maroon/20"
                    value={perPage}
                    onChange={(e) => {
                      setPerPage(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </Select>
                </div>
              </div>
            </div>

            <CardContent className="p-0">
              <div className="overflow-x-auto select-none">
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr className="text-left text-[10px] font-black tracking-widest text-gray-400 uppercase">
                      <th className="p-4 px-6">Timestamp</th>
                      <th className="p-4 px-6">Severity</th>
                      <th className="p-4 px-6">Event / Action</th>
                      <th className="p-4 px-6">Trace Details</th>
                      <th className="p-4 px-6 text-right">Identifier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      Array.from({ length: 10 }).map((_, idx) => (
                        <tr key={idx}>
                          <td className="p-4 px-6"><Skeleton className="h-4 w-32" /></td>
                          <td className="p-4 px-6"><Skeleton className="h-6 w-16 rounded-full" /></td>
                          <td className="p-4 px-6"><Skeleton className="h-4 w-40" /></td>
                          <td className="p-4 px-6"><Skeleton className="h-4 w-full" /></td>
                          <td className="p-4 px-6 text-right"><Skeleton className="h-4 w-24 ml-auto" /></td>
                        </tr>
                      ))
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={5}>
                          <div className="flex h-[400px] flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-6 shadow-xs">
                              <i className="ph-duotone ph-clock-counter-clockwise text-4xl text-gray-300"></i>
                            </div>
                            <h4 className="text-lg font-bold text-gray-900">Zero Activity Found</h4>
                            <p className="text-sm font-medium text-gray-500 mt-1 max-w-sm">
                              No events matching your current filters were detected in the audit log.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      rows.map((r) => {
                        const sev = getSeverityConfig(r.severity);
                        const timeParts = formatPHDateTimeParts(r.created_at);

                        return (
                          <tr 
                            key={r.id} 
                            className="group hover:bg-gray-50/80 transition-all duration-200 cursor-default"
                            onDoubleClick={(e) => e.preventDefault()}
                          >
                            <td className="p-4 px-6">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-900">{timeParts.date}</span>
                                <span className="text-[10px] font-medium text-gray-400">{timeParts.time}</span>
                              </div>
                            </td>
                            <td className="p-4 px-6">
                              <div className={cn(
                                "flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-tight shadow-xs",
                                sev.bg, sev.text, sev.border
                              )}>
                                <i className={cn(sev.icon, "text-[10px]")}></i>
                                {r.severity}
                              </div>
                            </td>
                            <td className="p-4 px-6">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500 group-hover:bg-white group-hover:text-pup-maroon shadow-xs transition-colors">
                                  <i className={cn(getActionIcon(r.action), "text-base")}></i>
                                </div>
                                <span className="text-xs font-bold tracking-tight text-gray-700 uppercase">{r.action}</span>
                              </div>
                            </td>
                            <td className="p-4 px-6">
                              <div className="flex flex-col gap-1">
                                <p className="text-xs font-medium text-gray-600 leading-relaxed max-w-[600px] line-clamp-2">
                                  {r.details || "No known description"}
                                </p>
                                {(r.entity_type || r.entity_id) && (
                                  <div className="flex items-center gap-2 mt-1">
                                     {r.entity_type && (
                                       <Badge variant="outline" className="text-[9px] font-black bg-gray-100 border-0 text-gray-500 uppercase h-4 px-1.5 rounded-sm">
                                         {r.entity_type}
                                       </Badge>
                                     )}
                                     {r.entity_id && <span className="text-[9px] font-mono text-gray-400">#{r.entity_id}</span>}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-4 px-6 text-right">
                               <div className="flex flex-col items-end">
                                  <span className="text-[10px] font-bold text-gray-700 font-mono tracking-tighter">{r.ip || "—"}</span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-[9px] font-medium text-gray-400 cursor-help flex items-center gap-1">
                                        <i className="ph-bold ph-desktop"></i>
                                        Device Info
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="max-w-[300px] bg-white border border-gray-200 p-3 rounded-xl shadow-2xl text-[10px] text-gray-600 font-medium">
                                       {r.user_agent}
                                    </TooltipContent>
                                  </Tooltip>
                               </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {total > 0 && (
                <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                    Showing <strong className="text-gray-900">{rows.length}</strong> of <strong className="text-gray-900">{total.toLocaleString()}</strong> Activity Logs
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={displayPage <= 1 || loading}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className="h-9 rounded-xl border-gray-300 bg-white px-4 text-[10px] font-black text-gray-600 uppercase shadow-xs transition-all hover:border-pup-maroon hover:text-pup-maroon disabled:opacity-30 active:scale-95"
                    >
                      <i className="ph-bold ph-caret-left mr-2"></i>
                      Prev
                    </Button>
                    <div className="h-9 min-w-[36px] flex items-center justify-center rounded-xl bg-white border border-gray-300 shadow-xs px-3 text-[11px] font-black text-gray-900 select-none">
                      {displayPage}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={displayPage >= totalPages || loading}
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      className="h-9 rounded-xl border-gray-300 bg-white px-4 text-[10px] font-black text-gray-600 uppercase shadow-xs transition-all hover:border-pup-maroon hover:text-pup-maroon disabled:opacity-30 active:scale-95"
                    >
                      Next
                      <i className="ph-bold ph-caret-right ml-2"></i>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TooltipProvider>
      </main>
    </div>
  );
}
