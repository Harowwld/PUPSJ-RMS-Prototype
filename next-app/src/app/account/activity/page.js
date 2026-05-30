"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import Header from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPHDateTimeParts, formatPHDateTime } from "@/lib/timeFormat";
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
import { generateAuditLogsPdf } from "@/lib/pdfGenerator";
import { generateExportFilename } from "@/lib/exportHelpers";
import PdfPreviewDialog from "@/components/admin/audit-logs/PdfPreviewDialog";
import { toast } from "sonner";

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
        bg: "bg-red-500/10",
        text: "text-red-600 dark:text-red-400",
        border: "border-red-500/20 dark:border-red-400/20",
        icon: "ph-fill ph-warning-circle"
      };
    case "WARNING":
      return {
        bg: "bg-amber-500/10",
        text: "text-amber-600 dark:text-amber-400",
        border: "border-amber-500/20 dark:border-amber-400/20",
        icon: "ph-fill ph-warning"
      };
    default:
      return {
        bg: "bg-blue-500/10",
        text: "text-blue-600 dark:text-blue-400",
        border: "border-blue-500/20 dark:border-blue-400/20",
        icon: "ph-fill ph-info"
      };
  }
}

function Sparkline({ data, color = "#FFFFFF" }) {
  if (!data || data.length === 0) return null;
  
  const width = 160;
  const height = 50;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  });

  const pathData = `M ${points.join(" L ")}`;
  const areaData = `${pathData} L ${width},${height} L 0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <path d={areaData} fill={color} className="opacity-10" />
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-70"
      />
      <circle 
        cx={width} 
        cy={height - ((data[data.length-1] - min) / range) * height} 
        r="3" 
        fill={color}
        className="opacity-100"
      />
    </svg>
  );
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

  // PDF & Export State
  const [isExporting, setIsExporting] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfBlobUrl, setPdfPreviewUrl] = useState(null);
  const [previewFrameReady, setPreviewFrameReady] = useState(false);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);

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

  const fetchAllForExport = async () => {
    const sevQuery = severityFilter !== "All" ? `&severity=${encodeURIComponent(severityFilter)}` : "";
    const res = await fetch(
      `/api/audit-logs?mine=1&limit=50000&search=${encodeURIComponent(search)}${sevQuery}&sortBy=created_at&sortOrder=DESC`
    );
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error || "Export failed");
    return Array.isArray(json.data) ? json.data : [];
  };

  const handleDownloadCSV = async () => {
    if (total === 0 || isExporting) return;
    setIsExporting(true);
    try {
      const allLogs = await fetchAllForExport();
      const headers = ["Date & Time", "Severity", "Actor", "Role", "Action", "Details", "IP Address", "User Agent", "Entity Type", "Entity ID"];
      const rows = allLogs.map((log) => [
        formatPHDateTime(log.created_at),
        log.severity || "INFO",
        log.actor,
        log.role,
        log.action,
        log.details || "No known description",
        log.ip || "—",
        log.user_agent || "—",
        log.entity_type || "—",
        log.entity_id || "—",
      ]);
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const fileName = generateExportFilename("MY-ACTIVITY", "DATA", "csv");
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Export Success", { description: "Your activity logs have been exported to CSV." });
    } catch (err) {
      toast.error("Export Failed", { description: err.message || "Unable to export activity logs." });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePreviewPDF = async () => {
    if (total === 0 || isExporting) return;
    setIsExporting(true);
    try {
      const allLogs = await fetchAllForExport();
      const blob = await generateAuditLogsPdf(allLogs, {
        role: "My Account",
        severity: severityFilter,
        search: search
      });
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
      setPdfPreviewOpen(true);
    } catch (err) {
      toast.error("Preview Failed", { description: err.message || "Unable to generate PDF preview." });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadFromPreview = () => {
    if (!pdfBlobUrl) return;
    try {
      const fileName = generateExportFilename("MY-ACTIVITY", "REPORT", "pdf");
      const link = document.createElement("a");
      link.href = pdfBlobUrl;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download Success", { description: "Activity report has been downloaded." });
    } catch (err) {
      toast.error("Download Failed", { description: "Unable to download the PDF report." });
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const displayPage = Math.min(page, totalPages);

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-gray-50 animate-in fade-in duration-700 dark:bg-background">
        <div className="h-16 bg-white border-b border-gray-200 dark:bg-card dark:border-white/10" />
        <main className="max-w-[1200px] mx-auto p-8 space-y-8">
          <div className="flex flex-col gap-2">
            <Skeleton className="w-64 h-8 dark:bg-muted" />
            <Skeleton className="w-96 h-4 dark:bg-muted" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <Skeleton className="h-32 rounded-2xl dark:bg-muted" />
             <Skeleton className="h-32 rounded-2xl dark:bg-muted" />
             <Skeleton className="h-32 rounded-2xl dark:bg-muted" />
             <Skeleton className="h-32 rounded-2xl dark:bg-muted" />
          </div>
          <Skeleton className="h-[500px] w-full rounded-2xl dark:bg-muted" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-background font-inter">
      <Header authUser={authUser} onLogout={handleLogout} />

      <main className="flex-1 w-full max-w-[1400px] mx-auto py-10 px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <TooltipProvider delay={200}>
          <PageHeader
            icon="ph-clock-counter-clockwise"
            title="My Activity"
            description="Review a complete audit history of actions performed by your account."
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadCSV}
                  disabled={total === 0 || isExporting}
                  className="flex h-10 w-32 items-center justify-center gap-1.5 rounded-brand border border-gray-300 text-[10px] font-bold text-gray-600 shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-50 dark:text-zinc-300 dark:shadow-none dark:bg-red-950/30 dark:border-white/10"
                >
                  <i className={cn("ph-bold text-base", isExporting ? "ph-circle-notch animate-spin" : "ph-file-csv")} aria-hidden />
                  {isExporting ? "PREPARING..." : "EXPORT"}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handlePreviewPDF}
                  disabled={total === 0 || isExporting}
                  className="flex h-10 px-5 items-center justify-center gap-2 btn-brand-red hover:-translate-y-0.5 text-[11px] font-black text-white active:scale-95 disabled:opacity-50 transition-all dark:shadow-none"
                >
                  <i className={cn("ph-bold text-base", isExporting ? "ph-circle-notch animate-spin" : "ph-file-pdf")} aria-hidden />
                  {isExporting ? "GENERATING..." : "GENERATE REPORT"}
                </Button>
                <div className="ml-2 flex items-center gap-3 border-l border-gray-200 pl-4 dark:border-white/10">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const path = isAdminRole(authUser?.role) ? "/admin" : "/staff";
                      router.push(path);
                    }}
                    className="h-10 px-5 font-black uppercase tracking-widest text-[10px] border-gray-300 bg-white hover:border-pup-maroon hover:text-pup-maroon dark:hover:text-red-500 transition-all shadow-xs flex items-center gap-2 rounded-xl active:scale-95 dark:border-white/10 dark:bg-card dark:text-zinc-300"
                  >
                    <i className="ph-bold ph-caret-left"></i>
                    Return to Dashboard
                  </Button>
                </div>
              </div>
            }
          />

          <Separator className="mt-8 bg-gray-200 dark:bg-zinc-800" />

          {/* Stats Bar */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Activity - Blue */}
            <div className="rounded-2xl p-6 border transition-all duration-300 shadow-sm dark:shadow-none bg-linear-to-br from-blue-800 to-blue-950 border-blue-950 relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1.5">Total Activity</p>
                    {!stats ? (
                      <Skeleton className="h-8 w-20 bg-white/20" />
                    ) : (
                      <>
                        <h3 className="text-3xl font-black text-white tracking-tight">
                          {stats.totalLogs.toLocaleString()}
                        </h3>
                        <p className="text-[10px] font-medium text-blue-200/80 mt-1">Actions performed</p>
                      </>
                    )}
                  </div>
                  {stats?.trends && (
                    <div className="opacity-70 transition-opacity group-hover:opacity-100">
                      <Sparkline data={stats.trends.map(t => t.total)} color="#BFDBFE" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Today - Green */}
            <div className="rounded-2xl p-6 border transition-all duration-300 shadow-sm dark:shadow-none bg-linear-to-br from-emerald-800 to-emerald-950 border-emerald-950 relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-1.5">Actions Today</p>
                    {!stats ? (
                      <Skeleton className="h-8 w-20 bg-white/20" />
                    ) : (
                      <>
                        <h3 className="text-3xl font-black text-white tracking-tight">
                          {stats.logsToday.toLocaleString()}
                        </h3>
                        <p className="text-[10px] font-medium text-emerald-100/80 mt-1">Since midnight</p>
                      </>
                    )}
                  </div>
                  {stats?.trends && (
                    <div className="opacity-70 transition-opacity group-hover:opacity-100">
                      <Sparkline data={stats.trends.map(t => t.total)} color="#A7F3D0" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Auth History - Yellow/Amber */}
            <div className="rounded-2xl p-6 border transition-all duration-300 shadow-sm dark:shadow-none bg-linear-to-br from-amber-700 to-amber-950 border-amber-950 relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-black text-amber-100 uppercase tracking-widest mb-1.5">Auth History</p>
                    {!stats ? (
                      <Skeleton className="h-8 w-20 bg-white/20" />
                    ) : (
                      <>
                        <h3 className="text-3xl font-black text-white tracking-tight">
                          {stats.authEvents.toLocaleString()}
                        </h3>
                        <p className="text-[10px] font-medium text-amber-100/80 mt-1">Logins & logouts</p>
                      </>
                    )}
                  </div>
                  {stats?.trends && (
                    <div className="opacity-70 transition-opacity group-hover:opacity-100">
                      <Sparkline data={stats.trends.map(t => t.auth)} color="#FDE68A" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Security Level - Red */}
            <div className="rounded-2xl p-6 border transition-all duration-300 shadow-sm dark:shadow-none bg-linear-to-br from-red-700 to-red-950 border-red-950 relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-black text-red-200 uppercase tracking-widest mb-1.5">Security Level</p>
                    {!stats ? (
                      <Skeleton className="h-8 w-20 bg-white/20" />
                    ) : (
                      <>
                        <h3 className="text-3xl font-black text-white tracking-tight">
                          {stats.criticalEvents.toLocaleString()}
                        </h3>
                        <p className="text-[10px] font-medium text-red-200/80 mt-1">High-priority alerts</p>
                      </>
                    )}
                  </div>
                  {stats?.trends && (
                    <div className="opacity-70 transition-opacity group-hover:opacity-100">
                      <Sparkline data={stats.trends.map(t => t.critical)} color="#FECACA" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Card className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden dark:bg-card dark:border-white/10">
            {/* Filter Bar */}
            <div className="p-6 bg-gray-50 border-b border-gray-100 dark:bg-muted/30 dark:border-white/10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
                <div className="lg:col-span-6">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest dark:text-zinc-300">
                      SEARCH AUDIT TRACE
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
                        className="h-5 px-1.5 text-[9px] font-black text-pup-maroon dark:text-primary hover:bg-red-50 hover:text-pup-darkMaroon uppercase tracking-tighter dark:bg-red-950/30"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                  <div className="relative group">
                    <i className="ph-bold ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pup-maroon transition-colors dark:text-zinc-500"></i>
                    <Input
                      type="text"
                      placeholder="Search by action, details, entity, or IP..."
                      className="pl-11 h-12 w-full rounded-xl border border-gray-200 bg-white text-sm font-bold shadow-xs transition-all focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-pup-maroon/20 text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-50"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                    />
                  </div>
                </div>

                <div className="lg:col-span-4">
                  <label className="block text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest ml-1 dark:text-zinc-300">
                    SEVERITY
                  </label>
                  <Select
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 shadow-xs outline-none transition-all focus:border-gray-300 focus:ring-2 focus:ring-pup-maroon/20 dark:border-white/10 dark:bg-card dark:text-zinc-200 dark:focus:border-zinc-700"
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
                  <label className="block text-[10px] font-black text-gray-500 mb-2 uppercase tracking-widest ml-1 dark:text-zinc-300">
                    DISPLAY
                  </label>
                  <Select
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 shadow-xs outline-none transition-all focus:border-gray-300 focus:ring-2 focus:ring-pup-maroon/20 dark:border-white/10 dark:bg-card dark:text-zinc-200 dark:focus:border-zinc-700"
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
                  <thead className="bg-gray-50 border-b border-gray-100 dark:bg-muted dark:border-white/10">
                    <tr className="text-left text-[10px] font-black tracking-widest text-gray-400 uppercase dark:text-zinc-300">
                      <th className="p-4 px-6">TIMESTAMP</th>
                      <th className="p-4 px-6">SEVERITY</th>
                      <th className="p-4 px-6">EVENT / ACTION</th>
                      <th className="p-4 px-6">TRACE DETAILS</th>
                      <th className="p-4 px-6 text-right">IDENTIFIER</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                    {loading ? (
                      Array.from({ length: 10 }).map((_, idx) => (
                        <tr key={idx}>
                          <td className="p-4 px-6"><Skeleton className="h-4 w-32 dark:bg-muted" /></td>
                          <td className="p-4 px-6"><Skeleton className="h-6 w-16 rounded-full dark:bg-muted" /></td>
                          <td className="p-4 px-6"><Skeleton className="h-4 w-40 dark:bg-muted" /></td>
                          <td className="p-4 px-6"><Skeleton className="h-4 w-full dark:bg-muted" /></td>
                          <td className="p-4 px-6 text-right"><Skeleton className="h-4 w-24 ml-auto dark:bg-muted" /></td>
                        </tr>
                      ))
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={5}>
                          <div className="flex h-[400px] flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-6 shadow-xs dark:bg-card dark:border-white/10">
                              <i className="ph-duotone ph-clock-counter-clockwise text-4xl text-gray-300 dark:text-zinc-600"></i>
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 dark:text-zinc-50">Zero Activity Found</h4>
                            <p className="text-sm font-medium text-gray-500 mt-1 max-w-sm dark:text-zinc-400">
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
                            className="group hover:bg-gray-50 transition-all duration-200 cursor-default dark:hover:bg-white/5 dark:bg-card"
                            onDoubleClick={(e) => e.preventDefault()}
                          >
                            <td className="p-4 px-6">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-900 dark:text-zinc-50">{timeParts.date}</span>
                                <span className="text-[10px] font-medium text-gray-400 dark:text-zinc-400">{timeParts.time}</span>
                              </div>
                            </td>
                            <td className="p-4 px-6">
                              <div className={cn(
                                "flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider transition-all",
                                sev.bg, sev.text, sev.border
                              )}>
                                <i className={cn(sev.icon, "text-[10px]")}></i>
                                {r.severity}
                              </div>
                            </td>
                            <td className="p-4 px-6">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500 group-hover:bg-white group-hover:text-pup-maroon dark:group-hover:text-red-500 dark:hover:text-red-500 shadow-xs transition-colors dark:bg-zinc-800 dark:text-zinc-400 dark:group-hover:bg-white/5 dark:hover:bg-white/5">
                                  <i className={cn(getActionIcon(r.action), "text-base")}></i>
                                </div>
                                <span className="text-xs font-bold tracking-tight text-gray-700 uppercase dark:text-zinc-300">{r.action}</span>
                              </div>
                            </td>
                            <td className="p-4 px-6">
                              <div className="flex flex-col gap-1">
                                <p className="text-xs font-medium text-gray-600 leading-relaxed max-w-[600px] line-clamp-2 dark:text-zinc-300">
                                  {r.details || "No known description"}
                                </p>
                                {(r.entity_type || r.entity_id) && (
                                  <div className="flex items-center gap-2 mt-1">
                                     {r.entity_type && (
                                       <Badge variant="outline" className="text-[9px] font-black bg-gray-100 border-0 text-gray-500 uppercase h-4 px-1.5 rounded-sm dark:bg-zinc-800 dark:text-zinc-400">
                                         {r.entity_type}
                                       </Badge>
                                     )}
                                     {r.entity_id && <span className="text-[9px] font-mono text-gray-400 dark:text-zinc-500">#{r.entity_id}</span>}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-4 px-6 text-right">
                               <div className="flex flex-col items-end">
                                  <span className="text-[10px] font-bold text-gray-700 font-mono tracking-tighter dark:text-zinc-200">{r.ip || "—"}</span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-[9px] font-medium text-gray-400 cursor-help flex items-center gap-1 dark:text-zinc-500">
                                        <i className="ph-bold ph-desktop"></i>
                                        Device Info
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="max-w-[300px] bg-white border border-gray-200 p-3 rounded-xl shadow-2xl text-[10px] text-gray-600 font-medium dark:bg-card dark:border-white/10 dark:text-zinc-300">
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
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between dark:bg-white/5 dark:border-white/10">
                  <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest dark:text-zinc-500">
                    Showing <strong className="text-gray-900 dark:text-zinc-50">{rows.length}</strong> of <strong className="text-gray-900 dark:text-zinc-50">{total.toLocaleString()}</strong> Activity Logs
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={displayPage <= 1 || loading}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className="h-9 rounded-xl border-gray-300 bg-white px-4 text-[10px] font-black text-gray-600 uppercase shadow-xs transition-all hover:border-pup-maroon hover:text-pup-maroon dark:hover:text-red-500 disabled:opacity-30 active:scale-95 dark:border-white/10 dark:bg-card dark:text-zinc-300"
                    >
                      <i className="ph-bold ph-caret-left mr-2"></i>
                      Prev
                    </Button>
                    <div className="h-9 min-w-[36px] flex items-center justify-center rounded-xl bg-white border border-gray-300 shadow-xs px-3 text-[11px] font-black text-gray-900 select-none dark:bg-card dark:border-white/10 dark:text-zinc-50">
                      {displayPage}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={displayPage >= totalPages || loading}
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      className="h-9 rounded-xl border-gray-300 bg-white px-4 text-[10px] font-black text-gray-600 uppercase shadow-xs transition-all hover:border-pup-maroon hover:text-pup-maroon dark:hover:text-red-500 disabled:opacity-30 active:scale-95 dark:border-white/10 dark:bg-card dark:text-zinc-300"
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

      <PdfPreviewDialog
        pdfPreviewOpen={pdfPreviewOpen}
        setPdfPreviewOpen={setPdfPreviewOpen}
        pdfBlobUrl={pdfBlobUrl}
        setPdfPreviewUrl={setPdfPreviewUrl}
        previewFrameReady={previewFrameReady}
        setPreviewFrameReady={setPreviewFrameReady}
        handleDownloadFromPreview={handleDownloadFromPreview}
        isFullscreenPreview={isFullscreenPreview}
        setIsFullscreenPreview={setIsFullscreenPreview}
      />
    </div>
  );
}
