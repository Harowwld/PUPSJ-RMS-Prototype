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
  AreaChart,
  Area,
} from "recharts"
import { cn } from "@/lib/utils"
import { useState } from "react"
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
          {payload.map((entry, index) => {
            const indicatorColor = String(entry.fill).startsWith("url") 
              ? (entry.stroke || "#007AFF") 
              : entry.fill;
            return (
              <div key={index} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: indicatorColor }} />
                <span className="text-xs font-semibold text-gray-700 dark:text-zinc-200">{entry.name}:</span>
                <span className="text-xs font-semibold text-gray-900 ml-auto dark:text-zinc-50">{entry.value}</span>
              </div>
            )
          })}
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

const RenderCustomDot = (props) => {
  const { cx, cy, value, payload } = props;
  let countVal = value;
  if (Array.isArray(value)) {
    countVal = value[1];
  } else if (payload && typeof payload.count === 'number') {
    countVal = payload.count;
  }
  if (countVal === 0 || countVal === undefined || countVal === null) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      stroke="#007AFF"
      strokeWidth={2}
      fill="#FFFFFF"
    />
  );
};

const RenderCustomActiveDot = (props) => {
  const { cx, cy, value, payload } = props;
  let countVal = value;
  if (Array.isArray(value)) {
    countVal = value[1];
  } else if (payload && typeof payload.count === 'number') {
    countVal = payload.count;
  }
  if (countVal === 0 || countVal === undefined || countVal === null) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      stroke="#007AFF"
      strokeWidth={2}
      fill="#FFFFFF"
    />
  );
};

const labelShortener = (value) => {
  if (!value) return "";
  if (value === "Transcript of Records") return "Transcript";
  if (value === "Certificate of Good Moral") return "Good Moral";
  if (value === "Certificate of Registration") return "Registration";
  if (value.length > 15) return value.substring(0, 12) + "...";
  return value;
};

export default function SlaCharts({ data, pieData, onSwitchView }) {
  const isDark = false
  const [timeGrain, setTimeGrain] = useState("monthly") // "monthly", "weekly", "daily"
  const totalSlaRequests = pieData.reduce((acc, curr) => acc + curr.value, 0)

  const trendData = data?.trends?.[timeGrain] || []
  const hasDemandData = data?.topDocTypes?.length > 0
  const hasTrendData = trendData.length > 0

  return (
    <div className="grid grid-cols-1 gap-[20px] lg:grid-cols-3">
      {/* Card 1: Request Trends Chart */}
      <div className="rounded-[12px] border-[0.5px] border-black/10 bg-white p-[28px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-card flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-[#111111] dark:text-zinc-50 m-0">
            Request Trends
          </h3>
          <select
            className="h-8 min-w-[100px] w-fit cursor-pointer rounded-brand border-[0.5px] border-black/15 bg-white px-2.5 text-[12px] font-normal text-[#111111] dark:border-white/10 dark:bg-card dark:text-zinc-100 focus:outline-none focus:ring-0"
            value={timeGrain}
            onChange={(e) => setTimeGrain(e.target.value)}
          >
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
            <option value="daily">Daily</option>
          </select>
        </div>
        <div className="flex-1 min-h-[288px] w-full flex flex-col justify-center">
          {hasTrendData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendData}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="areaBlueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#007AFF" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={isDark ? "rgba(255, 255, 255, 0.15)" : "#E5E5EA"}
                  strokeWidth={1}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: isDark ? "#a1a1aa" : "#8E8E93" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: isDark ? "#a1a1aa" : "#8E8E93" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <ChartTooltip 
                  content={<CustomBarTooltip />} 
                  cursor={false} 
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Requests"
                  stroke="#007AFF"
                  strokeWidth={2}
                  fill="url(#areaBlueGradient)"
                  dot={<RenderCustomDot />}
                  activeDot={<RenderCustomActiveDot />}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Empty className="flex h-full flex-col items-center justify-center border-0 bg-transparent text-center">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <div className="relative mb-6 mx-auto w-24 h-24">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full bg-gray-100/50 dark:bg-zinc-800/30"></div>
                  <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                    <i className="ph-duotone ph-chart-line text-xl text-gray-300 dark:text-zinc-600"></i>
                  </EmptyMedia>
                </div>
                <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                  No trend data
                </EmptyTitle>
                <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                  Select a different range to display trend lines.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </div>

      {/* Card 2: Document Demand Chart */}
      <div className="rounded-[12px] border-[0.5px] border-black/10 bg-white p-[28px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-card flex flex-col">
        <h3 className="mb-4 text-[18px] font-semibold tracking-[-0.01em] text-[#111111] dark:text-zinc-50 m-0">
          Document Demand
        </h3>
        <div className="flex-1 min-h-[288px] w-full flex flex-col justify-center">
          {hasDemandData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.topDocTypes}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="barOrangeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF6410" stopOpacity={1} />
                    <stop offset="100%" stopColor="#FF6410" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={isDark ? "rgba(255, 255, 255, 0.15)" : "#E5E5EA"}
                  strokeWidth={1}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: isDark ? "#a1a1aa" : "#8E8E93" }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  tickFormatter={labelShortener}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: isDark ? "#a1a1aa" : "#8E8E93" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <ChartTooltip 
                  content={<CustomBarTooltip />} 
                  cursor={false} 
                />
                <Bar
                  dataKey="count"
                  name="Requests"
                  fill="url(#barOrangeGradient)"
                  radius={[8, 8, 0, 0]}
                  barSize={54}
                  activeBar={{ fill: "#e55300" }}
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
                  Select a different date range or wait for new requests.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </div>

      {/* Card 3: Right side panels container */}
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


