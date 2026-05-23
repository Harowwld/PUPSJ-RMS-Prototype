"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

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
  
  const stats = [
    {
      label: "Total Events",
      value: logStats?.totalLogs || 0,
      sublabel: "Cumulative system logs",
      icon: "ph-duotone ph-scroll",
      color: "blue",
      trendData: trends.map(t => t.total)
    },
    {
      label: "Activity Today",
      value: logStats?.logsToday || 0,
      sublabel: "Events recorded today",
      icon: "ph-duotone ph-calendar-check",
      color: "emerald",
      trendData: trends.map(t => t.total)
    },
    {
      label: "Auth Attempts",
      value: logStats?.authEvents || 0,
      sublabel: "Logins & access events",
      icon: "ph-duotone ph-fingerprint",
      color: "amber",
      trendData: trends.map(t => t.auth)
    },
    {
      label: "Critical Alerts",
      value: logStats?.criticalEvents || 0,
      sublabel: "High-priority incidents",
      icon: "ph-duotone ph-warning-octagon",
      color: "red",
      trendData: trends.map(t => t.critical)
    }
  ];

  const getColorClasses = (color) => {
    switch (color) {
      case "blue": return { 
        bg: "bg-blue-50/50", border: "border-blue-100", 
        icon: "text-blue-600", text: "text-blue-900", 
        sub: "text-blue-600/60", spark: "#2563EB" 
      };
      case "emerald": return { 
        bg: "bg-emerald-50/50", border: "border-emerald-100", 
        icon: "text-emerald-600", text: "text-emerald-900", 
        sub: "text-emerald-700/60", spark: "#10B981" 
      };
      case "amber": return { 
        bg: "bg-amber-50/50", border: "border-amber-100", 
        icon: "text-amber-600", text: "text-amber-900", 
        sub: "text-amber-700/60", spark: "#D97706" 
      };
      case "red": return { 
        bg: "bg-red-50/50", border: "border-red-100", 
        icon: "text-red-600", text: "text-red-900", 
        sub: "text-red-700/60", spark: "#EF4444" 
      };
      default: return {};
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => {
        const classes = getColorClasses(stat.color);
        return (
          <div 
            key={i} 
            className={cn(
              "group relative overflow-hidden rounded-2xl border p-5 shadow-xs transition-all duration-300 hover:shadow-md",
              classes.bg,
              classes.border
            )}
          >
            {/* Background Decorative Icon */}
            <i className={cn(
              stat.icon, 
              "absolute -right-4 -bottom-4 rotate-12 text-7xl opacity-5 transition-transform duration-500 group-hover:scale-125 group-hover:rotate-0"
            )} />
            
            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5">
                  <i className={cn(stat.icon, "text-xl", classes.icon)} />
                </div>
                {!isLoading && stat.trendData.length > 0 && (
                  <div className="mt-1 opacity-60 transition-opacity group-hover:opacity-100">
                    <Sparkline data={stat.trendData} color={classes.spark} />
                  </div>
                )}
              </div>
              
              <div className="mt-4">
                <p className={cn("text-[10px] font-black tracking-widest uppercase", classes.sub)}>
                  {stat.label}
                </p>
                {isLoading || !logStats ? (
                  <Skeleton className="mt-1 h-8 w-24" />
                ) : (
                  <div className="flex items-baseline gap-1">
                    <h3 className={cn("text-2xl font-black tracking-tight", classes.text)}>
                      {stat.value.toLocaleString()}
                    </h3>
                  </div>
                )}
                {!isLoading && (
                  <p className={cn("mt-1 text-[10px] font-bold opacity-70", classes.sub)}>
                    {stat.sublabel}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
