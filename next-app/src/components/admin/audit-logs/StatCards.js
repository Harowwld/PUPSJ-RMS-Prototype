"use client"

import { Skeleton } from "@/components/ui/skeleton"

function Sparkline({ data, color = "#7A1E28" }) {
  if (!data || data.length === 0) return null;
  
  const width = 120;
  const height = 40;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        className="opacity-40"
      />
      {/* End point dot */}
      <circle 
        cx={width} 
        cy={height - ((data[data.length-1] - min) / range) * height} 
        r="3" 
        fill={color}
      />
    </svg>
  );
}

export default function StatCards({ isLoading, logStats }) {
  const trends = logStats?.trends || [];
  
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="group relative overflow-hidden rounded-xl border border-blue-100 bg-blue-50/50 p-5 shadow-sm transition-all hover:border-blue-200">
        <i className="ph-duotone ph-scroll absolute -right-3 -bottom-3 rotate-12 text-6xl text-blue-600 opacity-5 transition-transform group-hover:scale-110" />
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 text-[10px] font-black tracking-widest text-blue-600/60 uppercase">
                Total Logs
              </p>
              {isLoading || !logStats ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <h3 className="text-2xl font-black tracking-tight text-blue-900">
                  {logStats.totalLogs.toLocaleString()}
                </h3>
              )}
            </div>
            {!isLoading && trends.length > 0 && (
              <div className="mt-1">
                <Sparkline data={trends.map(t => t.total)} color="#2563EB" />
              </div>
            )}
          </div>
          {!isLoading && logStats && (
            <p className="mt-0.5 text-[10px] font-medium text-blue-600/70">
              Cumulative system events
            </p>
          )}
        </div>
      </div>

      <div className="group relative overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-sm transition-all hover:border-emerald-200">
        <i className="ph-duotone ph-calendar-check absolute -right-3 -bottom-3 rotate-12 text-6xl text-emerald-600 opacity-5 transition-transform group-hover:scale-110" />
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 text-[10px] font-black tracking-widest text-emerald-700/60 uppercase">
                Logs Today
              </p>
              {isLoading || !logStats ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <h3 className="text-2xl font-black tracking-tight text-emerald-900">
                  {logStats.logsToday.toLocaleString()}
                </h3>
              )}
            </div>
            {!isLoading && trends.length > 0 && (
              <div className="mt-1">
                <Sparkline data={trends.map(t => t.total)} color="#10B981" />
              </div>
            )}
          </div>
          {!isLoading && logStats && (
            <p className="mt-0.5 text-[10px] font-medium text-emerald-700/70">
              System events recorded today
            </p>
          )}
        </div>
      </div>

      <div className="group relative overflow-hidden rounded-xl border border-amber-100 bg-amber-50/50 p-5 shadow-sm transition-all hover:border-amber-200">
        <i className="ph-duotone ph-fingerprint absolute -right-3 -bottom-3 rotate-12 text-6xl text-amber-600 opacity-5 transition-transform group-hover:scale-110" />
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 text-[10px] font-black tracking-widest text-amber-700/60 uppercase">
                Auth Events
              </p>
              {isLoading || !logStats ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <h3 className="text-2xl font-black tracking-tight text-amber-900">
                  {logStats.authEvents.toLocaleString()}
                </h3>
              )}
            </div>
            {!isLoading && trends.length > 0 && (
              <div className="mt-1">
                <Sparkline data={trends.map(t => t.auth)} color="#D97706" />
              </div>
            )}
          </div>
          {!isLoading && logStats && (
            <p className="mt-0.5 text-[10px] font-medium text-amber-700/70">
              Logins and access attempts
            </p>
          )}
        </div>
      </div>

      <div className="group relative overflow-hidden rounded-xl border border-red-100 bg-red-50/50 p-5 shadow-sm transition-all hover:border-red-200">
        <i className="ph-duotone ph-warning-octagon absolute -right-3 -bottom-3 rotate-12 text-6xl text-red-600 opacity-5 transition-transform group-hover:scale-110" />
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 text-[10px] font-black tracking-widest text-red-700/60 uppercase">
                Critical Events
              </p>
              {isLoading || !logStats ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <h3
                  className={`text-2xl font-black tracking-tight ${logStats.criticalEvents > 0 ? "text-red-700" : "text-red-900"}`}
                >
                  {logStats.criticalEvents.toLocaleString()}
                </h3>
              )}
            </div>
            {!isLoading && trends.length > 0 && (
              <div className="mt-1">
                <Sparkline data={trends.map(t => t.critical)} color="#EF4444" />
              </div>
            )}
          </div>
          {!isLoading && logStats && (
            <p className="mt-0.5 text-[10px] font-medium text-red-700/70">
              High-priority security alerts
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
