"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import Header from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPHDateTime } from "@/lib/timeFormat";

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
    } catch {
      // ignore
    }
    router.push("/");
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          router.push("/");
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
      setRows(Array.isArray(json.data) ? json.data.map(r => ({
        id: r.id,
        time: formatPHDateTime(r.created_at),
        action: r.action,
        details: r.details || "—",
        severity: r.severity || "INFO",
        userAgent: r.user_agent || "—",
        entityType: r.entity_type || "",
        entityId: r.entity_id || "",
        ip: r.ip || "—"
      })) : []);
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
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (loadingUser) return;
    if (!authUser) return;
    refresh();
    refreshStats();
  }, [loadingUser, authUser, refresh, refreshStats]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const displayPage = Math.min(page, totalPages);

  const displayRows = useMemo(() => rows, [rows]);

  const getSeverityColor = (sev) => {
    switch (String(sev || "").toUpperCase()) {
      case "CRITICAL": return "bg-red-100 text-red-700 border-red-200";
      case "WARNING": return "bg-amber-100 text-amber-700 border-amber-200";
      default: return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="h-16 bg-white border-b border-gray-200" />
        <main className="max-w-[1100px] mx-auto p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-[420px] w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50 font-inter">
      <Header authUser={authUser} onLogout={handleLogout} />

      <main className="flex-1 w-full max-w-[1200px] mx-auto py-8 px-6">
        {/* Sleek Page Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-200 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-black text-pup-maroon uppercase tracking-widest mb-1">
              <i className="ph-bold ph-clock-counter-clockwise"></i>
              Audit Activity
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">My Activity</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Recent actions performed by your account.</p>
          </div>

          <Button
            variant="outline"
            onClick={() => router.push("/account")}
            className="h-11 px-6 font-black uppercase tracking-widest text-xs border-gray-300 hover:border-pup-maroon hover:text-pup-maroon transition-all shadow-sm flex items-center gap-2 shrink-0 rounded-brand group"
          >
            <i className="ph-bold ph-arrow-left transition-transform group-hover:-translate-x-1"></i>
            Return to Account
          </Button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm relative overflow-hidden group hover:border-pup-maroon/30 transition-all">
            <i className="ph-duotone ph-list-numbers absolute -right-3 -bottom-3 text-6xl opacity-5 text-pup-maroon rotate-12 group-hover:scale-110 transition-transform" />
            <div className="relative z-10">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Activity</p>
              {!stats ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                    {stats.totalLogs.toLocaleString()}
                  </h3>
                  <p className="text-[10px] font-medium text-gray-500 mt-0.5">Lifetime system actions</p>
                </>
              )}
            </div>
          </div>

          <div className="bg-[#fdf6f6] rounded-xl p-5 border border-[#7a1e28]/10 shadow-sm relative overflow-hidden group hover:border-pup-maroon/30 transition-all">
            <i className="ph-duotone ph-calendar-check absolute -right-3 -bottom-3 text-6xl opacity-10 text-pup-maroon rotate-12 group-hover:scale-110 transition-transform" />
            <div className="relative z-10">
              <p className="text-[10px] font-black text-[#9e5a62] uppercase tracking-widest mb-1">Actions Today</p>
              {!stats ? (
                <Skeleton className="h-8 w-20 bg-[#7a1e28]/5" />
              ) : (
                <>
                  <h3 className="text-2xl font-black text-pup-maroon tracking-tight">
                    {stats.logsToday.toLocaleString()}
                  </h3>
                  <p className="text-[10px] font-medium text-[#9e5a62] mt-0.5">Performed since midnight</p>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm relative overflow-hidden group hover:border-pup-maroon/30 transition-all">
            <i className="ph-duotone ph-fingerprint absolute -right-3 -bottom-3 text-6xl opacity-5 text-pup-maroon rotate-12 group-hover:scale-110 transition-transform" />
            <div className="relative z-10">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Auth Events</p>
              {!stats ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                    {stats.authEvents.toLocaleString()}
                  </h3>
                  <p className="text-[10px] font-medium text-gray-500 mt-0.5">Logins and logout history</p>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm relative overflow-hidden group hover:border-pup-maroon/30 transition-all">
            <i className="ph-duotone ph-warning-octagon absolute -right-3 -bottom-3 text-6xl opacity-5 text-red-600 rotate-12 group-hover:scale-110 transition-transform" />
            <div className="relative z-10">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Critical Events</p>
              {!stats ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <h3 className={`text-2xl font-black tracking-tight ${stats.criticalEvents > 0 ? "text-red-600" : "text-gray-900"}`}>
                    {stats.criticalEvents.toLocaleString()}
                  </h3>
                  <p className="text-[10px] font-medium text-gray-500 mt-0.5">Records updated or deleted</p>
                </>
              )}
            </div>
          </div>
        </div>

        <Card className="bg-white rounded-brand border border-gray-200 shadow-sm">
          <div className="p-4 bg-gray-50/50 border-b border-gray-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
              <div className="lg:col-span-5">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase">
                    Search Activity Logs
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
                    placeholder="Search by action, details, entity, or IP..."
                    className="pl-10 h-10 w-full bg-white border border-gray-300 rounded-brand text-sm focus-visible:ring-pup-maroon focus-visible:border-pup-maroon transition-colors"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
              </div>

              <div className="lg:col-span-3">
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                  Severity
                </label>
                <select
                  className="h-10 w-full rounded-brand border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon"
                  value={severityFilter}
                  onChange={(e) => {
                    setSeverityFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="All">All Severities</option>
                  <option value="INFO">INFO</option>
                  <option value="WARNING">WARNING</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                  Items
                </label>
                <select
                  className="h-10 w-full rounded-brand border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon"
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
                </select>
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            <div className={`overflow-x-auto rounded-brand ${displayRows.length === 0 && !loading ? "" : "border border-gray-200"}`}>
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                    <th className="p-3 font-bold w-44">Timestamp</th>
                    <th className="p-3 font-bold w-24">Severity</th>
                    <th className="p-3 font-bold w-48">Action</th>
                    <th className="p-3 font-bold">Rich Details</th>
                    <th className="p-3 font-bold w-12 text-center"><i className="ph-bold ph-desktop" title="Device/Browser"></i></th>
                    <th className="p-3 font-bold text-right w-32">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                      <tr key={idx}>
                        <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-16" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-full" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-8" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-24 ml-auto" /></td>
                      </tr>
                    ))
                  ) : displayRows.length === 0 ? (
                    <tr className="border-0 hover:bg-transparent">
                      <td colSpan={6} className="p-0 border-0">
                        <div className="h-[320px] flex flex-col items-center justify-center text-center text-gray-500">
                          <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                            <i className="ph-duotone ph-clock-counter-clockwise text-3xl text-pup-maroon"></i>
                          </div>
                          <div className="text-lg font-bold text-gray-900">
                            No activity yet
                          </div>
                          <div className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                            Actions performed by your account will appear here.
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayRows.map((r) => {
                      const isDestructive =
                        r.action.toLowerCase().includes("delete") ||
                        r.action.toLowerCase().includes("remove") ||
                        r.action.toLowerCase().includes("archive");
                      const isAuth =
                        r.action.toLowerCase().includes("login") ||
                        r.action.toLowerCase().includes("logout");

                      return (
                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3 font-mono text-[10px] text-gray-500 whitespace-nowrap">
                            {r.time}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className={`font-black text-[9px] px-1.5 py-0.5 rounded-sm border-0 ${getSeverityColor(r.severity)}`}>
                              {r.severity}
                            </Badge>
                          </td>
                          <td className="p-3 text-xs font-bold text-gray-700">
                            {isDestructive ? (
                              <span className="text-red-600 uppercase tracking-tighter">{r.action}</span>
                            ) : isAuth ? (
                              <span className="text-blue-600 uppercase tracking-tighter">{r.action}</span>
                            ) : (
                              <span className="text-gray-700 uppercase tracking-tighter">{r.action}</span>
                            )}
                          </td>
                          <td className="p-3 text-xs text-gray-600 leading-relaxed font-medium">
                            {r.details}
                            {(r.entityType || r.entityId) && (
                              <div className="flex gap-2 mt-1">
                                {r.entityType && <span className="bg-gray-100 text-gray-500 text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase">{r.entityType}</span>}
                                {r.entityId && <span className="text-[9px] text-gray-400 font-mono">ID: {r.entityId}</span>}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center justify-center text-gray-300 hover:text-gray-600 transition-colors" title={r.userAgent}>
                              <i className="ph-bold ph-info text-base"></i>
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono text-[10px] text-gray-400">
                            {r.ip || "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {total > 0 ? (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs font-medium text-gray-500">
                  Showing {(displayPage - 1) * perPage + 1}-
                  {Math.min(displayPage * perPage, total)} of{" "}
                  <strong className="text-gray-900">{total.toLocaleString()}</strong>{" "}
                  activity entries
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={displayPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 text-xs font-bold text-gray-600"
                  >
                    <i className="ph-bold ph-caret-left"></i> PREVIOUS
                  </Button>
                  <div className="px-3 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-md h-8 flex items-center justify-center min-w-12 shadow-sm">
                    {displayPage} / {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={displayPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 text-xs font-bold text-gray-600"
                  >
                    NEXT <i className="ph-bold ph-caret-right"></i>
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
