"use client"

import React, { useState } from "react"
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

const SlaCharts = React.memo(function SlaCharts({ data, pieData, onSwitchView }) {
  const isDark = false
  const [timeGrain, setTimeGrain] = useState("monthly") // "monthly", "weekly", "daily"
  const [activeBarName, setActiveBarName] = useState(null)
  const [activePieIndex, setActivePieIndex] = useState(null)
  const [hoveredTrendPoint, setHoveredTrendPoint] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const totalSlaRequests = pieData.reduce((acc, curr) => acc + curr.value, 0)

  const trendData = data?.trends?.[timeGrain] || []
  const hasDemandData = data?.topDocTypes?.length > 0
  const hasTrendData = trendData.length > 0

  const latestTrendPoint = trendData[trendData.length - 1]
  const displayPoint = hoveredTrendPoint || latestTrendPoint

  return (
    <div className="grid grid-cols-1 gap-[20px] lg:grid-cols-3">
      {/* Card 1: Request Trends Chart */}
      <div className="rounded-[12px] border-[0.5px] border-black/10 bg-white p-[28px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-card flex flex-col">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <div className="flex flex-col">
            <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-[#111111] dark:text-zinc-50 m-0">
              Request Trends
            </h3>
            {displayPoint && (
              <div className="mt-1.5 flex items-baseline gap-1 animate-fade-in">
                <span className="text-[28px] font-extrabold text-[#111111] dark:text-zinc-50 leading-none">
                  {displayPoint.count}
                </span>
                <span className="text-[12px] font-semibold text-[#8E8E93] dark:text-zinc-550 lowercase">
                  requests ({displayPoint.name})
                </span>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center justify-between h-8 min-w-[100px] gap-2 rounded-lg border border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#2c2c2e] px-2.5 text-[12px] font-semibold text-gray-800 dark:text-[#f2f2f7] hover:bg-gray-50 dark:hover:bg-[#3a3a3c] transition-all cursor-pointer shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] select-none"
            >
              <span>{timeGrain === "monthly" ? "Monthly" : timeGrain === "weekly" ? "Weekly" : "Daily"}</span>
              <i className="ph-bold ph-caret-down text-[10px] text-gray-400"></i>
            </button>
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-32 rounded-xl border border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#2c2c2e] p-1 shadow-lg z-50 animate-fade-in font-sans">
                  {["monthly", "weekly", "daily"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setTimeGrain(opt)
                        setHoveredTrendPoint(null)
                        setDropdownOpen(false)
                      }}
                      className={cn(
                        "w-full text-left px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-between",
                        timeGrain === opt 
                          ? "bg-pup-maroon/10 text-pup-maroon font-semibold" 
                          : "text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800"
                      )}
                    >
                      {opt === "monthly" ? "Monthly" : opt === "weekly" ? "Weekly" : "Daily"}
                      {timeGrain === opt && <i className="ph-bold ph-check text-[10px] text-pup-maroon" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex-1 min-h-[288px] w-full flex flex-col justify-center">
          {hasTrendData ? (
            <ResponsiveContainer width="100%" height="100%" debounce={100}>
              <AreaChart
                data={trendData}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                onMouseMove={(state) => {
                  if (state && state.activePayload && state.activePayload.length) {
                    setHoveredTrendPoint(state.activePayload[0].payload)
                  }
                }}
                onMouseLeave={() => setHoveredTrendPoint(null)}
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
                <div className="relative mb-6">
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
            <ResponsiveContainer width="100%" height="100%" debounce={100}>
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
                  radius={[8, 8, 0, 0]}
                  barSize={54}
                  onMouseEnter={(entry) => setActiveBarName(entry?.name || null)}
                  onMouseLeave={() => setActiveBarName(null)}
                >
                  {(data?.topDocTypes || []).map((entry, index) => {
                    const isHighlighted = activeBarName === entry.name;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isHighlighted ? "#FF6410" : "url(#barOrangeGradient)"}
                        opacity={activeBarName && !isHighlighted ? 0.35 : 1}
                        className="transition-all duration-300"
                        cursor="pointer"
                      />
                    )
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty className="flex h-full flex-col items-center justify-center border-0 bg-transparent text-center">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <div className="relative mb-6">
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
                <ResponsiveContainer width="100%" height="100%" debounce={100}>
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
                      onMouseEnter={(_, index) => setActivePieIndex(index)}
                      onMouseLeave={() => setActivePieIndex(null)}
                    >
                      {pieData.map((entry, index) => {
                        const isHovered = activePieIndex === index;
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={APPLE_STATUS_COLORS[entry.name] || "#e5e7eb"}
                            style={{
                              transform: isHovered ? 'scale(1.03)' : 'none',
                              transformOrigin: '50% 50%',
                              transition: 'all 0.2s ease-in-out',
                              cursor: 'pointer'
                            }}
                          />
                        );
                      })}
                    </Pie>
                    <ChartTooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </>
            ) : (
              <Empty data-compact="true" className="flex h-full flex-col items-center justify-center border-0 bg-transparent text-center p-0">
                <EmptyHeader className="flex flex-col items-center gap-0 max-w-[240px]">
                  <div className="relative mb-3 mx-auto w-12 h-12">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gray-100/50 dark:bg-zinc-800/30"></div>
                    <EmptyMedia className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-md rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                      <i className="ph-duotone ph-chart-pie text-xl text-gray-300 dark:text-zinc-600"></i>
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
              const isHovered = activePieIndex === index
              return (
                <div
                  key={d.name}
                  onMouseEnter={() => setActivePieIndex(index)}
                  onMouseLeave={() => setActivePieIndex(null)}
                  className={cn(
                    "flex items-center justify-between h-[36px] border-b-[0.5px] border-[#F2F2F7] dark:border-white/5 px-2 rounded-md transition-colors cursor-pointer",
                    isHovered && "bg-gray-50 dark:bg-zinc-800/40",
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
                  onMouseEnter={() => setActiveBarName(dt.name)}
                  onMouseLeave={() => setActiveBarName(null)}
                  className={cn(
                    "flex items-center justify-between h-[44px] border-b-[0.5px] border-[#F2F2F7] dark:border-white/5 px-2 rounded-lg transition-all cursor-pointer",
                    activeBarName === dt.name 
                      ? "bg-orange-50/50 dark:bg-orange-950/20 font-bold" 
                      : "hover:bg-gray-50/50 dark:hover:bg-zinc-800/20",
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
              <Empty data-compact="true" className="flex flex-col items-center justify-center border-0 bg-transparent py-4 text-center p-0">
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
})

export default SlaCharts

