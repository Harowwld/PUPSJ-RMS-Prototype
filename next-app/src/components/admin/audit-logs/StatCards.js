"use client"

import { Skeleton } from "@/components/ui/skeleton"

function Sparkline({ data, color = "#7A1E28" }) {
  if (!data || data.length === 0) return null;
  
  const width = 100;
  const height = 30;
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
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        className="opacity-40"
      />
      {/* End point dot */}
      <circle 
        cx={width} 
        cy={height - ((data[data.length-1] - min) / range) * height} 
        r="2.5" 
        fill={color}
      />
    </svg>
  );
}

export default function StatCards({ isLoading, logStats }) {
  const trends = logStats?.trends || [];
  
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-pup-maroon/30">
        <i className="ph-duotone ph-scroll absolute -right-3 -bottom-3 rotate-12 text-6xl text-pup-maroon opacity-5 transition-transform group-hover:scale-110" />
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 text-[10px] font-black tracking-widest text-gray-400 uppercase">
                Total Logs
              </p>
              {isLoading || !logStats ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <h3 className="text-2xl font-black tracking-tight text-gray-900">
                  {logStats.totalLogs.toLocaleString()}
                </h3>
              )}
            </div>
            {!isLoading && trends.length > 0 && (
              <div className="mt-1">
                <Sparkline data={trends.map(t => t.total)} />
              </div>
            )}
          </div>
          {!isLoading && logStats && (
            <p className="mt-0.5 text-[10px] font-medium text-gray-500">
              Cumulative system events
            </p>
          )}
        </div>
      </div>

      <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-pup-maroon/30">
        <i className="ph-duotone ph-calendar-check absolute -right-3 -bottom-3 rotate-12 text-6xl text-pup-maroon opacity-5 transition-transform group-hover:scale-110" />
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 text-[10px] font-black tracking-widest text-gray-400 uppercase">
                Logs Today
              </p>
              {isLoading || !logStats ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <h3 className="text-2xl font-black tracking-tight text-gray-900">
                  {logStats.logsToday.toLocaleString()}
                </h3>
              )}
            </div>
            {!isLoading && trends.length > 0 && (
              <div className="mt-1">
                <Sparkline data={trends.map(t => t.total)} />
              </div>
            )}
          </div>
          {!isLoading && logStats && (
            <p className="mt-0.5 text-[10px] font-medium text-gray-500">
              System events recorded today
            </p>
          )}
        </div>
      </div>

      <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-pup-maroon/30">
        <i className="ph-duotone ph-fingerprint absolute -right-3 -bottom-3 rotate-12 text-6xl text-pup-maroon opacity-5 transition-transform group-hover:scale-110" />
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 text-[10px] font-black tracking-widest text-gray-400 uppercase">
                Auth Events
              </p>
              {isLoading || !logStats ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <h3 className="text-2xl font-black tracking-tight text-gray-900">
                  {logStats.authEvents.toLocaleString()}
                </h3>
              )}
            </div>
            {!isLoading && trends.length > 0 && (
              <div className="mt-1">
                <Sparkline data={trends.map(t => t.auth)} color="#3B82F6" />
              </div>
            )}
          </div>
          {!isLoading && logStats && (
            <p className="mt-0.5 text-[10px] font-medium text-gray-500">
              Logins and access attempts
            </p>
          )}
        </div>
      </div>

      <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-pup-maroon/30">
        <i className="ph-duotone ph-warning-octagon absolute -right-3 -bottom-3 rotate-12 text-6xl text-red-600 opacity-5 transition-transform group-hover:scale-110" />
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 text-[10px] font-black tracking-widest text-gray-400 uppercase">
                Critical Events
              </p>
              {isLoading || !logStats ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <h3
                  className={`text-2xl font-black tracking-tight ${logStats.criticalEvents > 0 ? "text-red-600" : "text-gray-900"}`}
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
            <p className="mt-0.5 text-[10px] font-medium text-gray-500">
              High-priority security alerts
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
