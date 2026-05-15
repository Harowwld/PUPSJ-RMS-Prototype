"use client"

import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { formatPHDateTime } from "@/lib/timeFormat"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
} from "recharts"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { generateSLAAnalyticsPdf } from "@/lib/pdfGenerator"
import PageHeader from "@/components/shared/PageHeader"

export default function SLAAnalyticsTab({
 showToast, onLogAction }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [reportOpen, setReportOpen] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/analytics/document-requests", {
        cache: "no-store",
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok)
        throw new Error(json?.error || "Failed to load SLA data")
      setData(json.data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRefresh = () => {
    loadData()
  }

  // Safe variables
  const total = data?.totalRequests || 0
  const slaHours = data?.sla?.averageTurnaroundHours
  const completed = data?.sla?.totalCompleted || 0
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  const STATUS_COLORS = {
    Pending: "#800000",
    InProgress: "#b23b3b",
    Ready: "#10b981",
    Completed: "#059669",
    Cancelled: "#9ca3af",
  }

  const pieData = Object.entries(data?.statusCounts || {})
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0)

  const handlePrint = async () => {
    try {
      const blob = await generateSLAAnalyticsPdf(data, total, slaHours, completionRate);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pup-rks-sla-report-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onLogAction?.({
        action: "Generate Report",
        details:
          "generated formal SLA compliance report (Print/PDF) for administrative records",
        entityType: "Report",
      })
      showToast?.({ title: "Success", description: "Report downloaded successfully." });
    } catch (e) {
      console.error("PDF Generation failed:", e);
      showToast?.({ title: "Error", description: "Failed to generate PDF report." }, true);
    }
  }

  const downloadCsv = () => {
    if (!data) return
    const q = (cell) => `"${String(cell).replace(/"/g, '""')}"`
    const row = (cells) => cells.map(q).join(",")

    const lines = [
      row(["Service Level Agreement Analytics", ""]),
      row(["Generated (Local)", formatPHDateTime(new Date().toISOString())]),
      "",
      row(["Summary Metrics", "Value"]),
      row(["Total Lifetime Requests", total]),
      row(["Overall Completion Rate", `${completionRate}%`]),
      row([
        "Average Turnaround (SLA)",
        slaHours != null ? `${slaHours.toFixed(1)} hrs` : "N/A",
      ]),
      "",
      row(["Status Distribution", "Count"]),
    ]

    for (const [st, val] of Object.entries(data.statusCounts || {})) {
      if (val > 0) lines.push(row([st, val]))
    }

    lines.push("")
    lines.push(row(["Top Requested Documents", "Count"]))
    for (const dt of data.topDocTypes || []) {
      lines.push(row([dt.name, dt.count]))
    }

    lines.push("")
    lines.push(row(["Monthly Trend", "Received", "Completed"]))
    for (const trend of data.volumeTrend || []) {
      lines.push(row([trend.label, trend.received, trend.completed]))
    }

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.href = url
    link.download = `sla-analytics-${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    onLogAction?.({
      action: "Export CSV",
      details:
        "exported comprehensive SLA compliance dataset to local CSV storage volume",
      entityType: "Report",
    })
  }

  const reportDate = formatPHDateTime(new Date().toISOString())

  return (
    <div className="animate-fade-in font-inter flex h-full min-h-0 w-full flex-col">
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm">
        <PageHeader
          icon="ph-chart-line-up"
          title="Document Request SLA Analytics"
          description="Service level agreements and turnaround metrics for alumni requests."
          actions={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setReportOpen(true)}
                disabled={loading || !data}
                className="h-10 rounded-brand border border-pup-maroon bg-pup-maroon px-6 text-sm font-bold text-white shadow-sm hover:bg-red-900 disabled:opacity-60 transition-colors"
              >
                <i className="ph-bold ph-file-pdf mr-1.5 text-sm" aria-hidden />
                GENERATE REPORT
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadCsv}
                disabled={loading || !data}
                className="h-10 px-4 font-bold border-gray-300 shadow-sm hover:border-pup-maroon hover:bg-red-50/30 rounded-brand transition-colors"
              >
                <i
                  className="ph-bold ph-download-simple mr-1.5 text-pup-maroon"
                  aria-hidden
                />
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
                      className="h-10 w-10 border border-gray-300 bg-white p-0 text-gray-600 shadow-sm transition-all hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95 rounded-brand"
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
          }
        />

        <CardContent className="flex-1 overflow-auto bg-white p-6">
          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-28 rounded-brand" />
                ))}
              </div>
              <Skeleton className="h-72 w-full rounded-brand" />
            </div>
          ) : error ? (
            <Empty className="flex h-[400px] flex-col items-center justify-center rounded-brand border border-gray-200 bg-white text-center text-gray-500 shadow-sm">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                  <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon" />
                </EmptyMedia>
                <EmptyTitle className="text-lg font-bold text-gray-900">
                  Could not load SLA analytics
                </EmptyTitle>
                <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600">
                  {error}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Total Lifetime Requests — Accent Card */}
                <div className="group relative overflow-hidden rounded-xl border border-[#5c1520] bg-[#7a1e28] p-5 shadow-sm transition-all">
                  <i className="ph-duotone ph-envelope-open pointer-events-none absolute -right-3 -bottom-3 rotate-12 text-[60px] text-white opacity-20" />
                  <div className="relative z-10">
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-[#f7c9ce] uppercase">
                      <i className="ph-bold ph-envelope-open" /> Total Lifetime
                      Requests
                    </div>
                    <div className="text-3xl font-black text-white">
                      {total?.toLocaleString() ?? total}
                    </div>
                    <div className="mt-1 text-[10px] font-medium text-[#f7c9ce]/80">
                      Total requests desde inception
                    </div>
                  </div>
                </div>

                {/* Avg Turnaround (SLA) — Light Card */}
                <div className="group relative overflow-hidden rounded-xl border border-[#7a1e28]/15 bg-[#fdf6f6] p-5 shadow-sm transition-all">
                  <i className="ph-duotone ph-clock-countdown pointer-events-none absolute -right-3 -bottom-3 rotate-12 text-[60px] text-[#7a1e28] opacity-10" />
                  <div className="relative z-10">
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-[#9e5a62] uppercase">
                      <i className="ph-bold ph-clock-countdown" /> Avg
                      Turnaround (SLA)
                    </div>
                    <div className="text-3xl font-black text-[#7a1e28]">
                      {slaHours != null ? `${slaHours.toFixed(1)} hrs` : "N/A"}
                    </div>
                    <div className="mt-1 text-[10px] font-medium text-[#b07078]">
                      From Pending to Completed
                    </div>
                  </div>
                </div>

                {/* Overall Completion Rate — Light Card */}
                <div className="group relative overflow-hidden rounded-xl border border-[#7a1e28]/15 bg-[#fdf6f6] p-5 shadow-sm transition-all">
                  <i className="ph-duotone ph-check-circle pointer-events-none absolute -right-3 -bottom-3 rotate-12 text-[60px] text-[#7a1e28] opacity-10" />
                  <div className="relative z-10">
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-[#9e5a62] uppercase">
                      <i className="ph-bold ph-check-circle" /> Overall
                      Completion Rate
                    </div>
                    <div className="flex items-end gap-3">
                      <div className="text-3xl font-black text-emerald-600">
                        {completionRate}%
                      </div>
                    </div>
                    <div className="mt-1 text-[10px] font-medium text-[#b07078]">
                      Percentage of fulfilled requests
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Volume Trend Chart */}
                <div className="rounded-brand border border-gray-200 bg-white p-5 shadow-xs lg:col-span-2">
                  <h3 className="mb-4 text-xs font-bold tracking-widest text-gray-500 uppercase">
                    6-Month Volume Trend
                  </h3>
                  <div className="h-72 w-full">
                    {data.volumeTrend?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={data.volumeTrend}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#e5e7eb"
                          />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 12, fill: "#6b7280" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 12, fill: "#6b7280" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <ChartTooltip
                            contentStyle={{
                              borderRadius: "8px",
                              border: "1px solid #e5e7eb",
                              boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                            }}
                            cursor={{ fill: "#f9fafb" }}
                          />
                          <Legend
                            wrapperStyle={{
                              fontSize: "12px",
                              paddingTop: "10px",
                            }}
                            iconType="circle"
                          />
                          <Bar
                            dataKey="received"
                            name="Requests Received"
                            fill="#cbd5e1"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="completed"
                            name="Requests Completed"
                            fill="#800000"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <Empty className="flex h-full flex-col items-center justify-center border-0 text-center text-gray-400">
                        <EmptyHeader className="flex flex-col items-center gap-0">
                          <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                            <i className="ph-bold ph-chart-bar text-2xl text-pup-maroon"></i>
                          </EmptyMedia>
                          <EmptyTitle className="text-lg font-bold text-gray-900">
                            No trend data available
                          </EmptyTitle>
                          <EmptyDescription className="mt-1 text-sm font-medium text-gray-600">
                            Once requests are processed over time, volume trends
                            will appear here.
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  {/* Status Breakdown Pie */}
                  <div className="flex-1 rounded-brand border border-gray-200 bg-white p-5 shadow-xs">
                    <h3 className="mb-2 text-xs font-bold tracking-widest text-gray-500 uppercase">
                      Status Distribution
                    </h3>
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
                                <Cell
                                  key={`cell-${index}`}
                                  fill={STATUS_COLORS[entry.name] || "#e5e7eb"}
                                />
                              ))}
                            </Pie>
                            <ChartTooltip
                              contentStyle={{
                                borderRadius: "8px",
                                border: "none",
                                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <Empty className="flex h-full flex-col items-center justify-center border-0 text-center text-gray-400">
                          <EmptyHeader className="flex flex-col items-center gap-0">
                            <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                              <i className="ph-bold ph-chart-pie-slice text-2xl text-pup-maroon"></i>
                            </EmptyMedia>
                            <EmptyTitle className="text-lg font-bold text-gray-900">
                              No status data
                            </EmptyTitle>
                            <EmptyDescription className="mt-1 text-sm font-medium text-gray-600">
                              Status breakdown requires active request data.
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {pieData.map((d) => (
                        <div
                          key={d.name}
                          className="flex items-center gap-1.5 text-xs text-gray-600"
                        >
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor: STATUS_COLORS[d.name] || "#ccc",
                            }}
                          ></div>
                          <span className="font-medium">
                            {d.name}{" "}
                            <span className="text-gray-400">({d.value})</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Requested Docs lists */}
                  <div className="flex-1 rounded-brand border border-gray-200 bg-gray-50/50 p-5 shadow-xs">
                    <h3 className="mb-3 text-xs font-bold tracking-widest text-gray-500 uppercase">
                      Top Requested Documents
                    </h3>
                    <div className="space-y-3">
                      {data?.topDocTypes?.length > 0 ? (
                        data.topDocTypes.map((dt, i) => (
                          <div
                            key={dt.name}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-[10px] font-bold text-gray-500 shadow-sm">
                                {i + 1}
                              </div>
                              <span className="truncate text-sm font-bold text-gray-800">
                                {dt.name}
                              </span>
                            </div>
                            <span className="rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-xs font-bold text-pup-maroon">
                              {dt.count} req
                            </span>
                          </div>
                        ))
                      ) : (
                        <Empty className="flex flex-col items-center justify-center border-0 py-8 text-center text-gray-400">
                          <EmptyHeader className="flex flex-col items-center gap-0">
                            <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                              <i className="ph-bold ph-file-text text-2xl text-pup-maroon"></i>
                            </EmptyMedia>
                            <EmptyTitle className="text-lg font-bold text-gray-900">
                              No requests recorded yet
                            </EmptyTitle>
                            <EmptyDescription className="mt-1 text-sm font-medium text-gray-600">
                              Data will populate as document requests are
                              created.
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
      <Dialog
        open={reportOpen}
        onOpenChange={reportOpen ? () => setReportOpen(false) : undefined}
      >
        <DialogContent className="flex h-[90vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden rounded-brand border border-gray-200 bg-gray-100 p-0 shadow-2xl xl:max-w-[1200px]">
          <DialogHeader className="shrink-0 border-b border-gray-100 bg-gray-50/50 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-pup-maroon shadow-sm">
                <i className="ph-duotone ph-file-text text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-left text-xl leading-none font-black tracking-tight text-gray-900">
                  Formal SLA Compliance Report
                </DialogTitle>
                <p className="mt-1.5 text-left text-sm font-medium text-gray-500">
                  This document summarizes fulfillment efficiency and historical
                  request trends.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-1 flex-col items-center gap-10 overflow-auto scroll-smooth bg-gray-200/50 p-10">
            {/* PAGE 1 */}
            <div className="printable-report box-border flex min-h-[297mm] w-[210mm] shrink-0 flex-col bg-white p-[25mm] shadow-2xl">
              <div className="mb-10 flex flex-col items-center border-b-2 border-pup-maroon pb-6 text-center">
                <img
                  src="/assets/pup-logo.webp"
                  alt="PUP Logo"
                  className="mb-4 h-20 w-20"
                />
                <h1 className="text-2xl leading-tight font-black tracking-tight text-pup-maroon uppercase">
                  Polytechnic University of the Philippines - San Juan City
                  Campus
                </h1>
                <p className="mt-1 text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase">
                  Admission and Registration Office
                </p>
                <h2 className="mt-6 text-xl font-bold tracking-widest text-gray-800 uppercase">
                  Fulfillment SLA Analytics Report
                </h2>
                <p className="mt-2 text-sm font-medium text-gray-500 italic">
                  Document ID: PUP-RKS-SLA-{new Date().getFullYear()}-
                  {Math.floor(Math.random() * 10000)}
                </p>
              </div>

              <div className="space-y-6 text-sm leading-relaxed text-gray-800">
                <div className="mb-8 rounded-lg border border-gray-100 bg-gray-50 p-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                      Date
                    </p>
                    <p className="font-black text-gray-700">{reportDate}</p>
                  </div>
                </div>

                <h3 className="border-b border-gray-200 pb-2 text-base font-black tracking-wider text-gray-900 uppercase">
                  I. Service Efficiency Summary
                </h3>
                <p>
                  This document details the registry&apos;s fulfillment
                  efficiency across{" "}
                  <strong>{total} total documented requests</strong>. The key
                  performance indicator for public service operations is
                  measured through our Service Level Agreement Turnaround Time.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-x-12 gap-y-6 rounded-xl border border-gray-100 bg-gray-50/50 p-6">
                  <div>
                    <p className="mb-1 text-[10px] font-bold text-gray-400 uppercase">
                      Average Turnaround (SLA)
                    </p>
                    <p className="text-2xl font-black text-gray-900">
                      {slaHours != null ? `${slaHours.toFixed(1)} hrs` : "N/A"}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-500">
                      Average time elapsed from Pending to Completed.
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-bold text-gray-400 uppercase">
                      Fulfillment Completion
                    </p>
                    <p className="text-2xl font-black text-emerald-600">
                      {completionRate}%
                    </p>
                    <p className="mt-1 text-[11px] text-gray-500">
                      Percentage of non-cancelled requests that are Completed.
                    </p>
                  </div>
                </div>

                <p className="mt-6 mt-12 text-xs text-gray-500 italic">
                  Note: Continued tracking of these analytics will help properly
                  balance human resources during peak enrollment periods. The
                  data provides a historical baseline for public service
                  efficiency.
                </p>
              </div>

              <div className="mt-auto flex justify-end border-t border-gray-100 pt-12">
                <div className="text-right text-[10px] text-gray-400 italic">
                  Page 1 of 2
                </div>
              </div>
            </div>

            {/* PAGE 2 */}
            <div className="printable-report box-border flex min-h-[297mm] w-[210mm] shrink-0 flex-col bg-white p-[25mm] shadow-2xl">
              <div className="space-y-6 text-sm leading-relaxed text-gray-800">
                <h3 className="border-b border-gray-200 pb-2 text-base font-black tracking-wider text-gray-900 uppercase">
                  II. Top Demand Analysis
                </h3>
                <p>
                  The following table aggregates the most frequently requested
                  documents, identifying the highest administrative priorities.
                </p>
                <table className="mt-4 w-full border-collapse border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr className="text-[10px] font-bold text-gray-600 uppercase">
                      <th className="border-b border-gray-200 p-4 text-left">
                        Document Type
                      </th>
                      <th className="w-32 border-b border-gray-200 p-4 text-right">
                        Total Requests
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(data?.topDocTypes || []).map((c, i) => (
                      <tr key={c.name} className="text-xs">
                        <td className="border-x border-gray-100 p-4 font-bold text-gray-900">
                          {i + 1}. {c.name}
                        </td>
                        <td className="border-x border-gray-100 p-4 text-right font-mono text-pup-maroon">
                          {c.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h3 className="mt-12 border-b border-gray-200 pb-2 text-base font-black tracking-wider text-gray-900 uppercase">
                  III. Recent Historical Volume
                </h3>
                <p>
                  Volume analysis tracks the inflow and fulfillment of requests
                  over a rolling 6-month period.
                </p>
                <table className="mt-4 w-full border-collapse border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr className="text-[10px] font-bold text-gray-600 uppercase">
                      <th className="border-b border-gray-200 p-4 text-left">
                        Period
                      </th>
                      <th className="border-b border-gray-200 p-4 text-center">
                        Received
                      </th>
                      <th className="border-b border-gray-200 p-4 text-center text-emerald-700">
                        Completed
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(data?.volumeTrend || []).map((c) => (
                      <tr key={c.label} className="text-xs">
                        <td className="border-x border-gray-100 p-4 font-bold text-gray-900">
                          {c.label}
                        </td>
                        <td className="border-x border-gray-100 p-4 text-center">
                          {c.received}
                        </td>
                        <td className="border-x border-gray-100 p-4 text-center font-bold text-emerald-600">
                          {c.completed}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-auto flex flex-col gap-10 border-t border-gray-100 pt-12">
                <div className="grid grid-cols-2 gap-10">
                  <div className="flex flex-col gap-1">
                    <p className="text-[9px] font-bold text-gray-400 uppercase">
                      Prepared By
                    </p>
                    <div className="mt-6">
                      <div className="w-full border-b border-gray-900"></div>
                      <p className="mt-1 text-[10px] font-bold text-gray-900 uppercase">
                        Administrative Staff
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <p className="text-[9px] font-bold text-gray-400 uppercase">
                      Checked By
                    </p>
                    <div className="mt-6">
                      <div className="w-full border-b border-gray-900"></div>
                      <p className="mt-1 text-[10px] font-bold text-gray-900 uppercase">
                        Campus Registrar
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <p className="text-[9px] font-bold text-gray-400 uppercase">
                    Noted By
                  </p>
                  <div className="mt-6">
                    <div className="w-64 border-b border-gray-900"></div>
                    <p className="mt-1 text-[10px] font-bold text-gray-900 uppercase">
                      Campus Director
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <div className="text-right text-[10px] text-gray-400 italic">
                    Page 2 of 2
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 bg-white p-4">
            <Button
              variant="outline"
              onClick={() => setReportOpen(false)}
              className="h-11 px-6 font-bold border-gray-300 shadow-sm hover:border-pup-maroon hover:bg-red-50/30 rounded-brand transition-colors"
            >
              CLOSE PREVIEW
            </Button>
            <Button
              onClick={handlePrint}
              className="flex h-11 items-center gap-2 bg-pup-maroon px-8 font-bold text-white shadow-sm hover:bg-red-900 rounded-brand transition-colors"
            >
              <i className="ph-bold ph-printer text-lg"></i> FINALIZE AND PRINT
              REPORT
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
