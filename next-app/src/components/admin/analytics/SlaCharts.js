"use client"

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
import { useTheme } from "next-themes"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty"
import { Button } from "@/components/ui/button"
import { STATUS_COLORS } from "@/lib/constants"

/**
 * Custom Tooltip to ensure no "?" is shown
 */
const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-card dark:shadow-none">
        <p className="mb-2 text-[10px] font-semibold text-gray-400 tracking-widest dark:text-zinc-500">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.fill }} />
              <span className="text-xs font-semibold text-gray-700 dark:text-zinc-200">{entry.name}:</span>
              <span className="text-xs font-semibold text-gray-900 ml-auto dark:text-zinc-50">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const entry = payload[0]
    return (
      <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-card dark:shadow-none">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.payload.fill }} />
          <span className="text-xs font-semibold text-gray-700 dark:text-zinc-200">{entry.name}:</span>
          <span className="text-xs font-semibold text-gray-900 dark:text-zinc-50">{entry.value} requests</span>
        </div>
      </div>
    )
  }
  return null
}

export default function SlaCharts({ data, pieData, onSwitchView }) {
  const { theme, resolvedTheme } = useTheme()
  const isDark = theme === "dark" || resolvedTheme === "dark"
  const totalSlaRequests = pieData.reduce((acc, curr) => acc + curr.value, 0)

  const renderLegend = (value, entry) => {
    const { payload } = entry
    const percent = totalSlaRequests > 0 ? ((payload.value / totalSlaRequests) * 100).toFixed(0) : 0
    return (
      <span className="text-[10px] font-semibold text-gray-600 dark:text-zinc-300">
        {value} ({payload.value}) — {percent}%
      </span>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Document Demand Chart */}
      <div className="rounded-brand border border-gray-200 bg-white p-5 shadow-xs lg:col-span-2 dark:border-white/10 dark:bg-card flex flex-col">
        <h3 className="mb-4 text-xs font-semibold tracking-tight text-gray-500 dark:text-zinc-400">
          Document Demand (By Type)
        </h3>
        <div className="flex-1 min-h-[288px] w-full flex flex-col justify-center">
          {data?.topDocTypes?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.topDocTypes}
                margin={{ top: 10, right: 10, left: -20, bottom: 40 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={isDark ? "rgba(255,255,255,0.05)" : "#e5e7eb"}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: isDark ? "#a1a1aa" : "#6b7280", angle: -45, textAnchor: "end" }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: isDark ? "#a1a1aa" : "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip 
                  content={<CustomBarTooltip />} 
                  cursor={{ fill: isDark ? "rgba(255,255,255,0.05)" : "#f9fafb" }} 
                />
                <Bar
                  dataKey="count"
                  name="Requests"
                  fill={isDark ? "#ef4444" : "#800000"}
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty className="flex h-full flex-col items-center justify-center border-0 bg-transparent text-center">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <div className="relative mb-6 mx-auto w-24 h-24">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full bg-gray-100/50 dark:bg-zinc-800/30"></div>
                  <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                    <i className="ph-duotone ph-chart-bar text-xl text-gray-300 dark:text-zinc-600"></i>
                  </EmptyMedia>
                </div>
                <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                  No requests found
                </EmptyTitle>
                <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                  Select a different date range or wait for new requests to see the demand breakdown.
                </EmptyDescription>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-6 flex h-10 items-center gap-3 rounded-brand border border-gray-300 bg-white px-6 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 tracking-wide dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                  onClick={() => onSwitchView?.('review')}
                >
                  Check Incoming Requests
                </Button>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Status Breakdown Pie */}
        <div className="flex-1 rounded-brand border border-gray-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-card">
          <h3 className="mb-2 text-xs font-semibold tracking-tight text-gray-500 dark:text-zinc-400">
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
                  <ChartTooltip content={<CustomPieTooltip />} />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    formatter={renderLegend}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty className="flex h-full flex-col items-center justify-center border-0 bg-transparent text-center p-0">
                <EmptyHeader className="flex flex-col items-center gap-0 max-w-[240px]">
                  <div className="relative mb-3 mx-auto w-12 h-12">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gray-100/50 dark:bg-zinc-800/30"></div>
                    <EmptyMedia className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-md rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                      <i className="ph-duotone ph-chart-pie-slice text-xl text-gray-300 dark:text-zinc-600"></i>
                    </EmptyMedia>
                  </div>
                  <EmptyTitle className="text-sm font-semibold text-gray-900 dark:text-zinc-50">
                    No status data
                  </EmptyTitle>
                  <EmptyDescription className="max-w-[200px] text-[10px] font-medium text-gray-500 dark:text-zinc-400 mt-0.5">
                    Status distribution requires active request logs.
                  </EmptyDescription>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 flex h-8 items-center gap-2 rounded-brand border border-gray-300 bg-white px-4 text-[9px] font-semibold text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 tracking-wider dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                    onClick={() => onSwitchView?.('review')}
                  >
                    View Requests
                  </Button>
                </EmptyHeader>
              </Empty>
            )}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 border-t border-gray-50 pt-4 dark:border-white/10">
            {pieData.map((d) => {
              const percent = totalSlaRequests > 0 ? ((d.value / totalSlaRequests) * 100).toFixed(1) : 0
              return (
                <div
                  key={d.name}
                  className="flex items-center justify-between text-[11px] text-gray-600 dark:text-zinc-300"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: STATUS_COLORS[d.name] || "#ccc",
                      }}
                    ></div>
                    <span className="font-semibold tracking-tight">
                      {d.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-inter font-semibold text-gray-900 dark:text-zinc-50">{d.value}</span>
                    <span className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500">{percent}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top Requested Docs lists */}
        <div className="flex-1 rounded-brand border border-gray-200 bg-transparent p-5 shadow-xs dark:border-white/10 dark:bg-transparent">
          <h3 className="mb-3 text-xs font-semibold tracking-tight text-gray-500 dark:text-zinc-400">
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
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-[10px] font-semibold text-gray-500 shadow-sm dark:border-white/10 dark:bg-card dark:text-zinc-400 dark:shadow-none">
                      {i + 1}
                    </div>
                    <span className="truncate text-sm font-semibold text-gray-800 dark:text-zinc-100">
                      {dt.name}
                    </span>
                  </div>
                  <span className="rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-xs font-semibold text-pup-maroon dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                    {dt.count} req
                  </span>
                </div>
              ))
            ) : (
              <Empty className="flex flex-col items-center justify-center border-0 bg-transparent py-4 text-center p-0">
                <EmptyHeader className="flex flex-col items-center gap-0 max-w-[240px]">
                  <div className="relative mb-3 mx-auto w-12 h-12">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gray-100/50 dark:bg-zinc-800/30"></div>
                    <EmptyMedia className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-md rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                      <i className="ph-duotone ph-file-text text-xl text-gray-300 dark:text-zinc-600"></i>
                    </EmptyMedia>
                  </div>
                  <EmptyTitle className="text-sm font-semibold text-gray-900 dark:text-zinc-50">
                    No requests recorded yet
                  </EmptyTitle>
                  <EmptyDescription className="max-w-[200px] text-[10px] font-medium text-gray-500 dark:text-zinc-400 mt-0.5">
                    Document breakdown will display once requests are processed.
                  </EmptyDescription>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 flex h-8 items-center gap-2 rounded-brand border border-gray-300 bg-white px-4 text-[9px] font-semibold text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 tracking-wider dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                    onClick={() => onSwitchView?.('review')}
                  >
                    Go to Reviews
                  </Button>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


