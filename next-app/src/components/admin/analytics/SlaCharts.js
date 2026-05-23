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
      <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-xl">
        <p className="mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.fill }} />
              <span className="text-xs font-bold text-gray-700">{entry.name}:</span>
              <span className="text-xs font-black text-gray-900 ml-auto">{entry.value}</span>
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
      <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.payload.fill }} />
          <span className="text-xs font-bold text-gray-700">{entry.name}:</span>
          <span className="text-xs font-black text-gray-900">{entry.value} requests</span>
        </div>
      </div>
    )
  }
  return null
}

export default function SlaCharts({ data, pieData, onSwitchView }) {
  const totalSlaRequests = pieData.reduce((acc, curr) => acc + curr.value, 0)

  const renderLegend = (value, entry) => {
    const { payload } = entry
    const percent = totalSlaRequests > 0 ? ((payload.value / totalSlaRequests) * 100).toFixed(0) : 0
    return (
      <span className="text-[10px] font-bold text-gray-600 uppercase">
        {value} ({payload.value}) — {percent}%
      </span>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Volume Trend Chart */}
      <div className="rounded-brand border border-gray-200 bg-white p-5 shadow-xs lg:col-span-2">
        <h3 className="mb-4 text-xs font-bold tracking-widest text-gray-500 uppercase">
          6-Month Volume Trend
        </h3>
        <div className="h-72 w-full">
          {data?.volumeTrend?.length > 0 ? (
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
                  tick={{ fontSize: 10, fill: "#6b7280", angle: -45, textAnchor: "end" }}
                  axisLine={false}
                  tickLine={false}
                  height={60}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip content={<CustomBarTooltip />} cursor={{ fill: "#f9fafb" }} />
                <Legend
                  wrapperStyle={{
                    fontSize: "10px",
                    paddingTop: "20px",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                  iconType="circle"
                />
                <Bar
                  dataKey="received"
                  name="Received"
                  fill="#cbd5e1"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
                <Bar
                  dataKey="completed"
                  name="Completed"
                  fill="#800000"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4 h-9 rounded-brand border-gray-300 font-bold text-xs"
                  onClick={() => onSwitchView?.('review')}
                >
                  CHECK INCOMING REQUESTS
                </Button>
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
              <Empty className="flex h-full flex-col items-center justify-center border-0 text-center text-gray-400">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                    <i className="ph-bold ph-chart-pie-slice text-2xl text-pup-maroon"></i>
                  </EmptyMedia>
                  <EmptyTitle className="text-lg font-bold text-gray-900">
                    No status data
                  </EmptyTitle>
                  <EmptyDescription className="mt-1 text-sm font-medium text-gray-600 mb-4">
                    Status breakdown requires active request data.
                  </EmptyDescription>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 rounded-brand border-gray-300 font-bold text-[10px]"
                    onClick={() => onSwitchView?.('review')}
                  >
                    VIEW REQUESTS
                  </Button>
                </EmptyHeader>
              </Empty>
            )}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 border-t border-gray-50 pt-4">
            {pieData.map((d) => {
              const percent = totalSlaRequests > 0 ? ((d.value / totalSlaRequests) * 100).toFixed(1) : 0
              return (
                <div
                  key={d.name}
                  className="flex items-center justify-between text-[11px] text-gray-600"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: STATUS_COLORS[d.name] || "#ccc",
                      }}
                    ></div>
                    <span className="font-bold uppercase tracking-tight">
                      {d.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-inter font-black text-gray-900">{d.value}</span>
                    <span className="text-[10px] font-bold text-gray-400">{percent}%</span>
                  </div>
                </div>
              )
            })}
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
                  <EmptyDescription className="mt-1 text-sm font-medium text-gray-600 mb-4">
                    Data will populate as document requests are
                    created.
                  </EmptyDescription>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 rounded-brand border-gray-300 font-bold text-[10px]"
                    onClick={() => onSwitchView?.('review')}
                  >
                    GO TO REVIEWS
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
