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
import { cn } from "@/lib/utils"
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

const APPLE_STATUS_COLORS = {
  Pending: "#FF9F0A",
  InProgress: "#32ADE6",
  "In Progress": "#32ADE6",
  Ready: "#30D158",
}

export default function SlaCharts({ data, pieData, onSwitchView }) {
  const { theme, resolvedTheme } = useTheme()
  const isDark = theme === "dark" || resolvedTheme === "dark"
  const totalSlaRequests = pieData.reduce((acc, curr) => acc + curr.value, 0)

  return (
    <div className="grid grid-cols-1 gap-[20px] lg:grid-cols-3">
      {/* Document Demand Chart */}
      <div className="rounded-[12px] border-[0.5px] border-black/10 bg-white p-[28px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] lg:col-span-2 dark:border-white/10 dark:bg-card flex flex-col">
        <h3 className="mb-4 text-[18px] font-semibold tracking-[-0.01em] text-[#111111] dark:text-zinc-50 m-0">
          Document Demand (By Type)
        </h3>
        <div className="flex-1 min-h-[288px] w-full flex flex-col justify-center">
          {data?.topDocTypes?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.topDocTypes}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={isDark ? "rgba(255,255,255,0.05)" : "#F2F2F7"}
                  strokeWidth={0.5}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: isDark ? "#a1a1aa" : "#8E8E93" }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: isDark ? "#a1a1aa" : "#8E8E93" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <ChartTooltip 
                  content={<CustomBarTooltip />} 
                  cursor={{ fill: isDark ? "rgba(255,255,255,0.05)" : "#f9fafb" }} 
                />
                <Bar
                  dataKey="count"
                  name="Requests"
                  fill="#E5484D"
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

      {/* Right side panels container */}
      <div className="flex flex-col gap-[24px] rounded-[12px] border-[0.5px] border-black/10 bg-white p-[28px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-card">
        {/* Status Distribution */}
        <div className="flex flex-col">
          <h3 className="mb-4 text-[18px] font-semibold tracking-[-0.01em] text-[#111111] dark:text-zinc-50 m-0">
            Status Distribution
          </h3>
          <div className="h-44 w-full relative flex items-center justify-center">
            {pieData.length > 0 ? (
              <>
                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[28px] font-semibold text-[#111111] dark:text-zinc-50 leading-none">
                    {totalSlaRequests}
                  </span>
                  <span className="text-[11px] font-normal text-[#8E8E93] dark:text-zinc-500 mt-1 uppercase tracking-[0.04em]">
                    total
                  </span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={APPLE_STATUS_COLORS[entry.name] || "#e5e7eb"}
                        />
                      ))}
                    </Pie>
                    <ChartTooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </>
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
                </EmptyHeader>
              </Empty>
            )}
          </div>
          
          <div className="mt-4 flex flex-col pt-4 border-t border-[#F2F2F7] dark:border-white/5">
            {pieData.map((d, index) => {
              const percent = totalSlaRequests > 0 ? ((d.value / totalSlaRequests) * 100).toFixed(0) : 0
              const displayName = d.name === "InProgress" ? "In Progress" : d.name
              const color = APPLE_STATUS_COLORS[d.name] || "#ccc"
              return (
                <div
                  key={d.name}
                  className={cn(
                    "flex items-center justify-between h-[36px] border-b-[0.5px] border-[#F2F2F7] dark:border-white/5",
                    index === pieData.length - 1 && "border-b-0"
                  )}
                >
                  <div className="flex items-center gap-[8px]">
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-[13px] font-normal text-[#111111] dark:text-zinc-300">
                      {displayName}
                    </span>
                  </div>
                  <div className="flex items-center gap-[8px]">
                    <span className="text-[13px] font-normal text-[#111111] dark:text-zinc-50">
                      {d.value}
                    </span>
                    <span 
                      className="text-[13px] font-medium"
                      style={{ color: color }}
                    >
                      {percent}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="h-px bg-[#F2F2F7] dark:bg-white/5" />

        {/* Top Requested Documents */}
        <div className="flex flex-col">
          <h3 className="mb-4 text-[18px] font-semibold tracking-[-0.01em] text-[#111111] dark:text-zinc-50 m-0">
            Top Requested Documents
          </h3>
          <div className="flex flex-col">
            {data?.topDocTypes?.length > 0 ? (
              data.topDocTypes.map((dt, i) => (
                <div
                  key={dt.name}
                  className={cn(
                    "flex items-center justify-between h-[44px] border-b-[0.5px] border-[#F2F2F7] dark:border-white/5",
                    i === data.topDocTypes.length - 1 && "border-b-0"
                  )}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="text-[11px] font-normal text-[#8E8E93] dark:text-zinc-500 w-4 shrink-0">
                      {i + 1}
                    </span>
                    <span className="truncate text-[14px] font-medium text-[#111111] dark:text-zinc-50">
                      {dt.name}
                    </span>
                  </div>
                  <span className="text-[12px] font-normal text-[#8E8E93] dark:text-zinc-400">
                    {dt.count} {dt.count === 1 ? "request" : "requests"}
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
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


