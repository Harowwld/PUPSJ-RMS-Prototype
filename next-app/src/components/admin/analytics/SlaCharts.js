"use client"

import HugeIcon from "@/components/shared/HugeIcon";
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
  LabelList,
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
            const isOrange = String(entry.fill).includes("Orange") || entry.color === "#FF6410";
            const indicatorColor = isOrange ? "#FF6410" : (String(entry.fill).startsWith("url") ? (entry.stroke || "#007AFF") : entry.fill);
            return (
              <div key={index} className="flex items-center gap-2">
                <div className="rms-style-background-color h-2 w-2 rounded-full" data-background-color={indicatorColor} style={{ backgroundColor: indicatorColor }} />
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
          <div className="rms-style-background-color h-2 w-2 rounded-full" data-background-color={entry.payload.fill} style={{ backgroundColor: entry.payload.fill }} />
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
  Completed: "#34C759",
  Cancelled: "#8E8E93",
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

const formatDocTypeName = (value) => {
  if (!value) return "";
  // Generous limit for horizontal bar labels; keeps full names visible
  if (value.length > 28) return `${value.substring(0, 26)}...`;
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-stretch">
      {/* Left Column (2 Cols): Horizontal graphs (Request Trends & Document Demand) */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {/* Card 1: Request Trends Chart */}
        <div className="flex-1 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
            <div className="flex flex-col">
              <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50 m-0">
                Request Trends
              </h3>
              {displayPoint ? (
                <div className="mt-1.5 flex items-baseline gap-1 animate-fade-in">
                  <span className="text-[28px] font-extrabold text-gray-900 dark:text-zinc-50 leading-none">
                    {displayPoint.count ?? 0}
                  </span>
                  <span className="text-[12px] font-semibold text-gray-400 dark:text-zinc-500 lowercase">
                    requests ({displayPoint.name || "—"})
                  </span>
                </div>
              ) : (
                <div className="mt-1.5 flex items-baseline gap-1">
                  <span className="text-[28px] font-extrabold text-gray-900 dark:text-zinc-50 leading-none">
                    0
                  </span>
                  <span className="text-[12px] font-semibold text-gray-400 dark:text-zinc-500 lowercase">
                    requests
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-gray-200/60 dark:border-white/5">
              {["monthly", "weekly", "daily"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setTimeGrain(opt)
                    setHoveredTrendPoint(null)
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap capitalize",
                    timeGrain === opt
                      ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-[270px] h-[270px] w-full flex flex-col justify-center">
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
                <EmptyHeader className="flex flex-col items-center justify-center gap-0">
                  <div className="relative mb-3 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100/70 dark:bg-zinc-800/50 flex items-center justify-center border border-gray-200/50 dark:border-white/5 shadow-xs">
                      <HugeIcon className="ph-duotone ph-chart-line text-2xl text-gray-400 dark:text-zinc-500" />
                    </div>
                  </div>
                  <EmptyTitle className="text-base font-semibold text-gray-900 dark:text-zinc-50">
                    No trend data
                  </EmptyTitle>
                  <EmptyDescription className="max-w-xs text-xs font-normal text-gray-500 dark:text-zinc-400 mt-1">
                    Select a different range to display trend lines.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </div>

        {/* Card 2: Document Demand Chart (Horizontal Bar Chart) */}
        <div className="flex-1 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
            <div className="flex flex-col">
              <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50 m-0">
                Document Demand
              </h3>
              <div className="mt-1.5 flex items-baseline gap-1 animate-fade-in">
                <span className="text-[28px] font-extrabold text-gray-900 dark:text-zinc-50 leading-none">
                  {(data?.topDocTypes || []).reduce((acc, curr) => acc + (curr.count || 0), 0)}
                </span>
                <span className="text-[12px] font-semibold text-gray-400 dark:text-zinc-500 lowercase">
                  total requests
                </span>
              </div>
            </div>
            <div className="flex items-center h-8">
              <span className="text-[12px] font-medium text-gray-400 dark:text-zinc-500">
                Ranked by request volume
              </span>
            </div>
          </div>
          <div className="flex-1 min-h-[270px] h-[270px] w-full flex flex-col justify-center">
            {hasDemandData ? (
              <ResponsiveContainer width="100%" height="100%" debounce={100}>
                <BarChart
                  layout="vertical"
                  data={data.topDocTypes}
                  margin={{ top: 10, right: 36, left: 10, bottom: 10 }}
                >
                  <defs>
                    <linearGradient id="barOrangeGradientHorizontal" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#FF6410" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#FF6410" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    vertical={true}
                    stroke={isDark ? "rgba(255, 255, 255, 0.15)" : "#E5E5EA"}
                    strokeWidth={1}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: isDark ? "#a1a1aa" : "#8E8E93" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={210}
                    tick={{ fontSize: 12, fill: isDark ? "#374151" : "#1f2937", fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    tickFormatter={formatDocTypeName}
                  />
                  <ChartTooltip 
                    content={<CustomBarTooltip />} 
                    cursor={{ fill: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)" }}
                  />
                  <Bar
                    dataKey="count"
                    name="Requests"
                    radius={[0, 6, 6, 0]}
                    barSize={20}
                    onMouseEnter={(entry) => setActiveBarName(entry?.name || null)}
                    onMouseLeave={() => setActiveBarName(null)}
                  >
                    {(data?.topDocTypes || []).map((entry, index) => {
                      const isHighlighted = activeBarName === entry.name;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={isHighlighted ? "#FF6410" : "url(#barOrangeGradientHorizontal)"}
                          opacity={activeBarName && !isHighlighted ? 0.35 : 1}
                          className="transition-all duration-300"
                          cursor="pointer"
                        />
                      )
                    })}
                    <LabelList
                      dataKey="count"
                      position="right"
                      offset={8}
                      className="fill-gray-600 dark:fill-zinc-400 text-[11px] font-semibold"
                      formatter={(val) => (val > 0 ? val : "")}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty className="flex h-full flex-col items-center justify-center border-0 bg-transparent text-center">
                <EmptyHeader className="flex flex-col items-center justify-center gap-0">
                  <div className="relative mb-3 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100/70 dark:bg-zinc-800/50 flex items-center justify-center border border-gray-200/50 dark:border-white/5 shadow-xs">
                      <HugeIcon className="ph-duotone ph-chart-bar text-2xl text-gray-400 dark:text-zinc-500" />
                    </div>
                  </div>
                  <EmptyTitle className="text-base font-semibold text-gray-900 dark:text-zinc-50">
                    No requests found
                  </EmptyTitle>
                  <EmptyDescription className="max-w-xs text-xs font-normal text-gray-500 dark:text-zinc-400 mt-1">
                    Select a different date range or wait for new requests.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </div>
      </div>

      {/* Right Column (1 Col): Vertical Align (Status Distribution & Ranked Summary) */}
      <div className="lg:col-span-1 flex flex-col">
        <div className="flex-1 flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none h-full justify-between">
          {/* Status Distribution */}
          <div className="flex flex-col flex-1">
            <h3 className="mb-4 text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50 m-0">
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
                              className={isHovered ? "rms-pie-cell rms-pie-cell-hover" : "rms-pie-cell"}
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
                  <EmptyHeader className="flex flex-col items-center justify-center gap-0 max-w-[240px]">
                    <div className="relative mb-3 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-2xl bg-gray-100/70 dark:bg-zinc-800/50 flex items-center justify-center border border-gray-200/50 dark:border-white/5 shadow-xs">
                        <HugeIcon className="ph-duotone ph-chart-pie text-2xl text-gray-400 dark:text-zinc-500" />
                      </div>
                    </div>
                    <EmptyTitle className="text-sm font-semibold text-gray-900 dark:text-zinc-50">
                      No status data
                    </EmptyTitle>
                    <EmptyDescription className="max-w-[200px] text-[11px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5">
                      Status distribution requires active request logs.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </div>
            
            <div className="mt-4 flex flex-col pt-3 border-t border-gray-100 dark:border-white/5">
              {pieData.map((d, index) => {
                const percent = totalSlaRequests > 0 ? Math.round((d.value / totalSlaRequests) * 100) : 0
                const displayName = d.name === "InProgress" ? "In Progress" : d.name
                const color = APPLE_STATUS_COLORS[d.name] || "#ccc"
                const isHovered = activePieIndex === index
                return (
                  <div
                    key={d.name}
                    onMouseEnter={() => setActivePieIndex(index)}
                    onMouseLeave={() => setActivePieIndex(null)}
                    className={cn(
                      "flex items-center justify-between h-[36px] border-b-[0.5px] border-gray-100 dark:border-white/5 px-2 rounded-md transition-colors cursor-pointer",
                      isHovered && "bg-gray-50 dark:bg-zinc-800/40",
                      index === pieData.length - 1 && "border-b-0"
                    )}
                  >
                    <div className="flex items-center gap-[8px]">
                      <div
                        className="rms-style-background-color h-2 w-2 rounded-full shrink-0"
                        data-background-color={color}
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-[13px] font-normal text-gray-800 dark:text-zinc-300">
                        {displayName}
                      </span>
                    </div>
                    <div className="flex items-center gap-[8px]">
                      <span className="text-[13px] font-normal text-gray-900 dark:text-zinc-50">
                        {d.value}
                      </span>
                      <span
                        className="rms-style-color text-[13px] font-medium"
                        data-color={color}
                        style={{ color }}
                      >
                        {percent}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="h-px bg-gray-100 dark:bg-white/5 my-6" />

          {/* Top Requested Documents */}
          <div className="flex flex-col flex-1">
            <h3 className="mb-4 text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50 m-0">
              Top Requested Documents
            </h3>
            <div className="flex-1 flex flex-col justify-center items-center w-full min-h-[160px]">
              {data?.topDocTypes?.length > 0 ? (
                <div className="flex flex-col w-full">
                  {data.topDocTypes.map((dt, i) => (
                    <div
                      key={dt.name}
                      onMouseEnter={() => setActiveBarName(dt.name)}
                      onMouseLeave={() => setActiveBarName(null)}
                      className={cn(
                        "flex items-center justify-between h-[44px] border-b-[0.5px] border-gray-100 dark:border-white/5 px-2 rounded-lg transition-all cursor-pointer",
                        activeBarName === dt.name 
                          ? "bg-orange-50/50 dark:bg-orange-950/20 font-bold" 
                          : "hover:bg-gray-50/50 dark:hover:bg-zinc-800/20",
                        i === data.topDocTypes.length - 1 && "border-b-0"
                      )}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500 w-4 shrink-0">
                          {i + 1}
                        </span>
                        <span className="truncate text-[14px] font-medium text-gray-900 dark:text-zinc-50">
                          {dt.name}
                        </span>
                      </div>
                      <span className="text-[12px] font-normal text-gray-400 dark:text-zinc-400">
                        {dt.count} {dt.count === 1 ? "request" : "requests"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty data-compact="true" className="flex flex-1 flex-col items-center justify-center border-0 bg-transparent py-4 text-center p-0 w-full my-auto">
                  <EmptyHeader className="flex flex-col items-center justify-center gap-0 max-w-[240px]">
                    <div className="relative mb-3 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-2xl bg-gray-100/70 dark:bg-zinc-800/50 flex items-center justify-center border border-gray-200/50 dark:border-white/5 shadow-xs">
                        <HugeIcon className="ph-duotone ph-file-text text-2xl text-gray-400 dark:text-zinc-500" />
                      </div>
                    </div>
                    <EmptyTitle className="text-sm font-semibold text-gray-900 dark:text-zinc-50">
                      No requests recorded yet
                    </EmptyTitle>
                    <EmptyDescription className="text-[12px] font-normal text-gray-400 dark:text-zinc-500 mt-1 max-w-[220px] text-center mx-auto">
                      Top requested document types will appear here.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card 4: Client Satisfaction Measurement (CSM) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none flex flex-col gap-6 lg:col-span-3">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <HugeIcon className="ph-fill ph-star text-amber-500 text-[18px]" />
              <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50 m-0">
                Client Satisfaction Measurement (CSM)
              </h3>
            </div>
            <p className="text-[13px] font-normal text-gray-500 dark:text-zinc-400">
              Student feedback ratings, satisfaction rate, and public service quality evaluations.
            </p>
          </div>

          {data?.feedback?.totalResponses > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/40 text-amber-900 dark:text-amber-200">
                <span className="text-amber-500 text-sm">★</span>
                <span className="text-sm font-bold">{data.feedback.averageRating}</span>
                <span className="text-xs text-amber-700 dark:text-amber-400">/ 5.0</span>
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                {data.feedback.satisfactionRate}% Positive ({data.feedback.totalResponses} {data.feedback.totalResponses === 1 ? "review" : "reviews"})
              </span>
            </div>
          )}
        </div>

        {data?.feedback?.totalResponses > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start pt-2 border-t border-gray-100 dark:border-white/5">
            {/* Rating Breakdown Bars */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                Rating Distribution
              </span>
              <div className="flex flex-col gap-2.5">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = data.feedback.ratingBreakdown?.[stars] || 0;
                  const pct = data.feedback.totalResponses > 0 
                    ? Math.round((count / data.feedback.totalResponses) * 100) 
                    : 0;
                  return (
                    <div key={stars} className="flex items-center gap-3 text-xs">
                      <span className="w-9 font-semibold text-gray-700 dark:text-zinc-300 flex items-center gap-1">
                        {stars} <span className="text-amber-500">★</span>
                      </span>
                      <div className="flex-1 h-3 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden relative">
                        <div 
                          className="h-full rounded-full transition-all duration-500 bg-amber-500 dark:bg-amber-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-14 text-right font-medium text-gray-500 dark:text-zinc-400">
                        {count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Evaluation Aspects */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                Top Service Highlights
              </span>
              {data.feedback.topAspects?.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {data.feedback.topAspects.map((aspect) => (
                    <div
                      key={aspect.tag}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/70 dark:bg-zinc-800/40 text-xs"
                    >
                      <span className="font-medium text-gray-800 dark:text-zinc-200 truncate mr-2">
                        {aspect.label}
                      </span>
                      <span className="font-semibold text-gray-500 dark:text-zinc-400 shrink-0">
                        {aspect.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 dark:text-zinc-500 italic">
                  No specific aspect tags submitted yet.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center text-center border-t border-gray-100 dark:border-white/5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3 border border-amber-200/60 dark:border-amber-800/30">
              <HugeIcon className="ph-duotone ph-star text-2xl" />
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">No student feedback recorded yet</p>
            <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm mt-1">
              Feedback scores and service ratings will automatically populate here as students rate completed document requests.
            </p>
          </div>
        )}
      </div>
    </div>
  )
})

export default SlaCharts
