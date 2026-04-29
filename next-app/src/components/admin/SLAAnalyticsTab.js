"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatPHDateTime } from "@/lib/timeFormat";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export default function SLAAnalyticsTab({ showToast, onLogAction }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/analytics/document-requests", {
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to load SLA data");
      setData(json.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    onLogAction?.("Refreshed Document SLA Analytics");
    loadData();
  };

  // Safe variables
  const total = data?.totalRequests || 0;
  const slaHours = data?.sla?.averageTurnaroundHours;
  const completed = data?.sla?.totalCompleted || 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const STATUS_COLORS = {
    Pending: "#800000",
    InProgress: "#b23b3b",
    Ready: "#10b981",
    Completed: "#059669",
    Cancelled: "#9ca3af",
  };

  const pieData = Object.entries(data?.statusCounts || {}).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);

  const handlePrint = () => {
    window.print();
    onLogAction?.("Generated service analytics report (Print/PDF)");
  };

  const downloadCsv = () => {
    if (!data) return;
    const q = (cell) => `"${String(cell).replace(/"/g, '""')}"`;
    const row = (cells) => cells.map(q).join(",");

    const lines = [
      row(["Service Level Agreement Analytics", ""]),
      row(["Generated (Local)", formatPHDateTime(new Date().toISOString())]),
      "",
      row(["Summary Metrics", "Value"]),
      row(["Total Lifetime Requests", total]),
      row(["Overall Completion Rate", `${completionRate}%`]),
      row(["Average Turnaround (SLA)", slaHours != null ? `${slaHours.toFixed(1)} hrs` : "N/A"]),
      "",
      row(["Status Distribution", "Count"]),
    ];

    for (const [st, val] of Object.entries(data.statusCounts || {})) {
      if (val > 0) lines.push(row([st, val]));
    }

    lines.push("");
    lines.push(row(["Top Requested Documents", "Count"]));
    for (const dt of data.topDocTypes || []) {
      lines.push(row([dt.name, dt.count]));
    }

    lines.push("");
    lines.push(row(["Monthly Trend", "Received", "Completed"]));
    for (const trend of data.volumeTrend || []) {
      lines.push(row([trend.label, trend.received, trend.completed]));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `sla-analytics-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onLogAction?.("Exported SLA compliance report (CSV)");
  };

  const reportDate = formatPHDateTime(new Date().toISOString());

  return (
    <div className="flex flex-col w-full h-full gap-4 animate-fade-in font-inter min-h-0">
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page { size: A4; margin: 0; }
          body * { visibility: hidden; }
          .printable-report, .printable-report * { visibility: visible; }
          .printable-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 25mm !important;
            background: white !important;
            z-index: 9999 !important;
            box-shadow: none !important;
            page-break-after: always;
          }
          .no-print { display: none !important; }
          .rounded-brand, .rounded-xl { border-radius: 0 !important; }
          .shadow-sm, .shadow-xs, .shadow-2xl { box-shadow: none !important; }
          .border { border: 1px solid #e2e8f0 !important; }
          .bg-gray-50\\/50 { background-color: transparent !important; }
          .bg-white { background-color: white !important; }
          .text-pup-maroon { color: #800000 !important; }
          table { width: 100% !important; border-collapse: collapse !important; border: 1px solid #e2e8f0 !important; }
          th, td { border: 1px solid #e2e8f0 !important; padding: 12px !important; }
        }
      `}} />

      <Card className="flex-1 bg-white rounded-brand border border-gray-300 shadow-sm overflow-hidden flex flex-col min-h-0">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-pup-maroon shadow-sm shrink-0">
              <i className="ph-duotone ph-chart-line-up text-2xl"></i>
            </div>
            <div>
              <CardTitle className="text-xl font-black text-gray-900 tracking-tight leading-none">
                Document Request SLA Analytics
              </CardTitle>
              <CardDescription className="text-sm font-medium text-gray-500 mt-1.5">
                Service level agreements and turnaround metrics for alumni requests.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setReportOpen(true)}
              disabled={loading || !data}
              className="h-9 px-6 font-bold text-sm bg-pup-maroon text-white border border-pup-maroon shadow-sm hover:bg-red-900 disabled:opacity-60"
            >
              <i className="ph-bold ph-file-pdf text-sm mr-1.5" aria-hidden />
              GENERATE REPORT
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadCsv}
              disabled={loading || !data}
              className="h-9 px-4 font-bold text-sm text-gray-600 bg-white border border-gray-300 shadow-sm hover:bg-gray-50"
            >
              <i className="ph-bold ph-download-simple text-sm mr-1.5" aria-hidden />
              EXPORT CSV
            </Button>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={loading}
                    className="h-9 w-9 p-0 text-gray-600 bg-white border border-gray-300 shadow-sm hover:bg-gray-50 transition-all active:scale-95"
                  >
                    <i
                      className={cn(
                        "ph-bold ph-arrows-clockwise text-sm",
                        loading && "animate-spin"
                      )}
                      aria-hidden
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="font-bold">Refresh Analytics Data</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto p-6 bg-white">
          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-28 rounded-brand" />
                ))}
              </div>
              <Skeleton className="h-72 w-full rounded-brand" />
            </div>
          ) : error ? (
            <Empty className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500 border border-gray-200 rounded-brand bg-white shadow-sm">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                  <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon" />
                </EmptyMedia>
                <EmptyTitle className="text-lg font-bold text-gray-900">Could not load SLA analytics</EmptyTitle>
                <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                  {error}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Lifetime Requests — Accent Card */}
                <div className="relative rounded-xl p-5 overflow-hidden border border-[#5c1520] bg-[#7a1e28] shadow-sm group transition-all">
                  <i className="ph-duotone ph-envelope-open absolute -right-3 -bottom-3 text-[60px] opacity-20 text-white rotate-12 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="text-[10px] font-bold uppercase text-[#f7c9ce] tracking-widest mb-1 flex items-center gap-1.5">
                      <i className="ph-bold ph-envelope-open" /> Total Lifetime Requests
                    </div>
                    <div className="text-3xl font-black text-white">{total?.toLocaleString() ?? total}</div>
                  </div>
                </div>

                {/* Avg Turnaround (SLA) — Light Card */}
                <div className="relative rounded-xl p-5 overflow-hidden border border-[#7a1e28]/15 bg-[#fdf6f6] shadow-sm group transition-all">
                  <i className="ph-duotone ph-clock-countdown absolute -right-3 -bottom-3 text-[60px] opacity-10 text-[#7a1e28] rotate-12 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="text-[10px] font-bold uppercase text-[#9e5a62] tracking-widest mb-1 flex items-center gap-1.5">
                      <i className="ph-bold ph-clock-countdown" /> Avg Turnaround (SLA)
                    </div>
                    <div className="text-3xl font-black text-[#7a1e28]">
                      {slaHours != null ? `${slaHours.toFixed(1)} hrs` : "N/A"}
                    </div>
                    <div className="text-[10px] font-medium text-[#b07078] mt-1">From Pending to Completed</div>
                  </div>
                </div>

                {/* Overall Completion Rate — Light Card */}
                <div className="relative rounded-xl p-5 overflow-hidden border border-[#7a1e28]/15 bg-[#fdf6f6] shadow-sm group transition-all">
                  <i className="ph-duotone ph-check-circle absolute -right-3 -bottom-3 text-[60px] opacity-10 text-[#7a1e28] rotate-12 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="text-[10px] font-bold uppercase text-[#9e5a62] tracking-widest mb-1 flex items-center gap-1.5">
                      <i className="ph-bold ph-check-circle" /> Overall Completion Rate
                    </div>
                    <div className="flex items-end gap-3">
                      <div className="text-3xl font-black text-emerald-600">{completionRate}%</div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden mt-2">
                      <div className="h-full bg-emerald-500" style={{ width: `${completionRate}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Volume Trend Chart */}
                <div className="lg:col-span-2 rounded-brand border border-gray-200 bg-white p-5 shadow-xs">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">6-Month Volume Trend</h3>
                  <div className="h-72 w-full">
                    {data.volumeTrend?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.volumeTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                          <ChartTooltip
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}
                            cursor={{ fill: '#f9fafb' }}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} iconType="circle" />
                          <Bar dataKey="received" name="Requests Received" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="completed" name="Requests Completed" fill="#800000" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <Empty className="h-full flex flex-col items-center justify-center text-center text-gray-400 border-0">
                        <EmptyHeader className="flex flex-col items-center gap-0">
                          <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                            <i className="ph-bold ph-chart-bar text-2xl text-pup-maroon"></i>
                          </EmptyMedia>
                          <EmptyTitle className="text-lg font-bold text-gray-900">No trend data available</EmptyTitle>
                          <EmptyDescription className="text-sm font-medium text-gray-600 mt-1">
                            Once requests are processed over time, volume trends will appear here.
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  {/* Status Breakdown Pie */}
                  <div className="rounded-brand border border-gray-200 bg-white p-5 shadow-xs flex-1">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Status Distribution</h3>
                    <div className="h-44 w-full">
                      {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={65}
                              paddingAngle={2}
                              dataKey="value"
                              stroke="none"
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || "#e5e7eb"} />
                              ))}
                            </Pie>
                            <ChartTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <Empty className="h-full flex flex-col items-center justify-center text-center text-gray-400 border-0">
                          <EmptyHeader className="flex flex-col items-center gap-0">
                            <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                              <i className="ph-bold ph-chart-pie-slice text-2xl text-pup-maroon"></i>
                            </EmptyMedia>
                            <EmptyTitle className="text-lg font-bold text-gray-900">No status data</EmptyTitle>
                            <EmptyDescription className="text-sm font-medium text-gray-600 mt-1">
                              Status breakdown requires active request data.
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                       {pieData.map(d => (
                         <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                           <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[d.name] || '#ccc' }}></div>
                           <span className="font-medium">{d.name} <span className="text-gray-400">({d.value})</span></span>
                         </div>
                       ))}
                    </div>
                  </div>

                  {/* Top Requested Docs lists */}
                  <div className="rounded-brand border border-gray-200 bg-gray-50/50 p-5 shadow-xs flex-1">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Top Requested Documents</h3>
                    <div className="space-y-3">
                      {data?.topDocTypes?.length > 0 ? data.topDocTypes.map((dt, i) => (
                        <div key={dt.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0 shadow-sm">{i + 1}</div>
                            <span className="text-sm font-bold text-gray-800 truncate">{dt.name}</span>
                          </div>
                          <span className="text-xs font-bold text-pup-maroon bg-red-50 py-0.5 px-2 rounded-full border border-red-100">{dt.count} req</span>
                        </div>
                      )) : (
                        <Empty className="flex flex-col items-center justify-center text-center text-gray-400 border-0 py-8">
                          <EmptyHeader className="flex flex-col items-center gap-0">
                            <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                              <i className="ph-bold ph-file-text text-2xl text-pup-maroon"></i>
                            </EmptyMedia>
                            <EmptyTitle className="text-lg font-bold text-gray-900">No requests recorded yet</EmptyTitle>
                            <EmptyDescription className="text-sm font-medium text-gray-600 mt-1">
                              Data will populate as document requests are created.
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Preview Modal */}
      <Dialog open={reportOpen} onOpenChange={reportOpen ? () => setReportOpen(false) : undefined}>
        <DialogContent className="w-[96vw] max-w-[96vw] xl:max-w-[1200px] h-[90vh] p-0 flex flex-col overflow-hidden bg-gray-100 border border-gray-200 shadow-2xl rounded-brand">
          <DialogHeader className="bg-gray-50/50 border-b border-gray-100 p-6 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-pup-maroon shadow-sm shrink-0">
                <i className="ph-duotone ph-file-text text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-xl font-black text-gray-900 tracking-tight leading-none text-left">
                  Formal SLA Compliance Report
                </DialogTitle>
                <p className="text-sm font-medium text-gray-500 mt-1.5 text-left">
                  This document summarizes fulfillment efficiency and historical request trends.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-10 flex flex-col items-center gap-10 scroll-smooth bg-gray-200/50">
            {/* PAGE 1 */}
            <div className="printable-report w-[210mm] min-h-[297mm] bg-white shadow-2xl p-[25mm] flex flex-col box-border shrink-0">
              <div className="flex flex-col items-center text-center border-b-2 border-pup-maroon pb-6 mb-10">
                <img src="/assets/pup-logo.webp" alt="PUP Logo" className="w-20 h-20 mb-4" />
                <h1 className="text-2xl font-black text-pup-maroon uppercase tracking-tight leading-tight">Polytechnic University of the Philippines - San Juan City Campus</h1>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-1">Admission and Registration Office</p>
                <h2 className="text-xl font-bold text-gray-800 uppercase tracking-widest mt-6">Fulfillment SLA Analytics Report</h2>
                <p className="text-sm text-gray-500 mt-2 font-medium italic">Document ID: PUP-RKS-SLA-{new Date().getFullYear()}-{Math.floor(Math.random() * 10000)}</p>
              </div>

              <div className="space-y-6 text-gray-800 leading-relaxed text-sm">
                <div className="mb-8 bg-gray-50 p-4 border border-gray-100 rounded-lg">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</p>
                    <p className="font-black text-gray-700">{reportDate}</p>
                  </div>
                </div>

                <h3 className="text-base font-black text-gray-900 uppercase tracking-wider border-b border-gray-200 pb-2">I. Service Efficiency Summary</h3>
                <p>
                  This document details the registry&apos;s fulfillment efficiency across <strong>{total} total documented requests</strong>. The key performance indicator for public service operations is measured through our Service Level Agreement Turnaround Time.
                </p>
                <div className="grid grid-cols-2 gap-x-12 gap-y-6 bg-gray-50/50 p-6 rounded-xl border border-gray-100 mt-6">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Average Turnaround (SLA)</p>
                    <p className="text-2xl font-black text-gray-900">{slaHours != null ? `${slaHours.toFixed(1)} hrs` : "N/A"}</p>
                    <p className="text-[11px] text-gray-500 mt-1">Average time elapsed from Pending to Completed.</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Fulfillment Completion</p>
                    <p className="text-2xl font-black text-emerald-600">{completionRate}%</p>
                    <p className="text-[11px] text-gray-500 mt-1">Percentage of non-cancelled requests that are Completed.</p>
                  </div>
                </div>

                <p className="mt-6 italic text-gray-500 text-xs mt-12">
                  Note: Continued tracking of these analytics will help properly balance human resources during peak enrollment periods. The data provides a historical baseline for public service efficiency.
                </p>
              </div>

              <div className="mt-auto pt-12 flex justify-end border-t border-gray-100">
                <div className="text-right italic text-[10px] text-gray-400">
                  Page 1 of 2
                </div>
              </div>
            </div>

            {/* PAGE 2 */}
            <div className="printable-report w-[210mm] min-h-[297mm] bg-white shadow-2xl p-[25mm] flex flex-col box-border shrink-0">
              <div className="space-y-6 text-gray-800 leading-relaxed text-sm">
                <h3 className="text-base font-black text-gray-900 uppercase tracking-wider border-b border-gray-200 pb-2">II. Top Demand Analysis</h3>
                <p>
                  The following table aggregates the most frequently requested documents, identifying the highest administrative priorities.
                </p>
                <table className="w-full border-collapse mt-4 border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr className="text-[10px] font-bold uppercase text-gray-600">
                      <th className="p-4 text-left border-b border-gray-200">Document Type</th>
                      <th className="p-4 text-right border-b border-gray-200 w-32">Total Requests</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(data?.topDocTypes || []).map((c, i) => (
                      <tr key={c.name} className="text-xs">
                        <td className="p-4 font-bold text-gray-900 border-x border-gray-100">{i+1}. {c.name}</td>
                        <td className="p-4 text-right font-mono text-pup-maroon border-x border-gray-100">{c.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h3 className="text-base font-black text-gray-900 uppercase tracking-wider border-b border-gray-200 pb-2 mt-12">III. Recent Historical Volume</h3>
                <p>
                  Volume analysis tracks the inflow and fulfillment of requests over a rolling 6-month period.
                </p>
                <table className="w-full border-collapse mt-4 border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr className="text-[10px] font-bold uppercase text-gray-600">
                      <th className="p-4 text-left border-b border-gray-200">Period</th>
                      <th className="p-4 text-center border-b border-gray-200">Received</th>
                      <th className="p-4 text-center border-b border-gray-200 text-emerald-700">Completed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(data?.volumeTrend || []).map(c => (
                      <tr key={c.label} className="text-xs">
                        <td className="p-4 font-bold text-gray-900 border-x border-gray-100">{c.label}</td>
                        <td className="p-4 text-center border-x border-gray-100">{c.received}</td>
                        <td className="p-4 text-center font-bold text-emerald-600 border-x border-gray-100">{c.completed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-auto pt-12 flex flex-col gap-10 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-10">
                  <div className="flex flex-col gap-1">
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Prepared By</p>
                    <div className="mt-6">
                      <div className="w-full border-b border-gray-900"></div>
                      <p className="text-[10px] font-bold text-gray-900 uppercase mt-1">Administrative Staff</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Checked By</p>
                    <div className="mt-6">
                      <div className="w-full border-b border-gray-900"></div>
                      <p className="text-[10px] font-bold text-gray-900 uppercase mt-1">Campus Registrar</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <p className="text-[9px] font-bold text-gray-400 uppercase">Noted By</p>
                  <div className="mt-6">
                    <div className="w-64 border-b border-gray-900"></div>
                    <p className="text-[10px] font-bold text-gray-900 uppercase mt-1">Campus Director</p>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <div className="text-right italic text-[10px] text-gray-400">
                    Page 2 of 2
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0">
            <Button
              variant="outline"
              onClick={() => setReportOpen(false)}
              className="h-11 px-6 text-sm font-bold text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              CLOSE PREVIEW
            </Button>
            <Button
              onClick={handlePrint}
              className="h-11 px-8 bg-pup-maroon text-white font-bold shadow-sm hover:bg-red-900 flex items-center gap-2"
            >
              <i className="ph-bold ph-printer text-lg"></i> FINALIZE AND PRINT REPORT
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
