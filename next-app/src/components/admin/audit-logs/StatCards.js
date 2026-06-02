"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function Sparkline({ data, color = "#FFFFFF" }) {
  if (!data || data.length === 0) return null;
  
  const width = 160; // Increased width
  const height = 50; // Increased height
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  });

  const pathData = `M ${points.join(" L ")}`;
  const areaData = `${pathData} L ${width},${height} L 0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {/* Area fill */}
      <path
        d={areaData}
        fill={color}
        className="opacity-10"
      />
      {/* Line */}
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-70"
      />
      {/* End point dot */}
      <circle 
        cx={width} 
        cy={height - ((data[data.length-1] - min) / range) * height} 
        r="3" 
        fill={color}
        className="opacity-100"
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
      color: "blue",
      trendData: trends.map(t => t.total),
      iconClass: "ph-database"
    },
    {
      label: "Activity Today",
      value: logStats?.logsToday || 0,
      sublabel: "Events recorded today",
      color: "emerald",
      trendData: trends.map(t => t.total),
      iconClass: "ph-calendar-check"
    },
    {
      label: "Auth Attempts",
      value: logStats?.authEvents || 0,
      sublabel: "Logins & access events",
      color: "amber",
      trendData: trends.map(t => t.auth),
      iconClass: "ph-fingerprint"
    }
  ];

  const getColorClasses = (color) => {
    switch (color) {
      case "blue": return { 
        bg: "from-blue-500 to-blue-700 dark:from-blue-800 dark:to-blue-950", border: "border-blue-950", 
        text: "text-white", 
        sub: "text-blue-200", spark: "#BFDBFE" 
      };
      case "emerald": return { 
        bg: "from-emerald-500 to-emerald-700 dark:from-emerald-800 dark:to-emerald-950", border: "border-emerald-950", 
        text: "text-white", 
        sub: "text-emerald-100", spark: "#A7F3D0" 
      };
      case "amber": return { 
        bg: "from-amber-500 to-amber-700 dark:from-amber-700 dark:to-amber-950", border: "border-amber-950", 
        text: "text-white", 
        sub: "text-amber-100", spark: "#FDE68A" 
      };
      default: return {};
    }
  };

  if (isLoading && !logStats) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-muted" />
        ))}
      </div>
    );
  }

  if (!logStats) return null;

  return (
    <div className={cn(
      "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 transition-all duration-500",
      isLoading ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
    )}>
      {stats.map((stat, i) => {
        const classes = getColorClasses(stat.color);
        return (
          <div 
            key={i} 
            className={cn(
              "group relative overflow-hidden rounded-xl border-none p-5 shadow-sm dark:shadow-none transition-all duration-300 hover:shadow-md dark:shadow-none bg-linear-to-br",
              classes.bg
            )}
          >
            {/* Background Decorative Icon */}
            <i className={cn("ph-duotone pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[280px] text-white opacity-[0.07]", stat.iconClass)} />
            
            <div className="relative z-10">
              <div className="flex items-end justify-between">
                <div>
                  <p className={cn("text-[10px] font-black tracking-widest ", classes.sub)}>
                    {stat.label}
                  </p>
                  <h3 className={cn("text-3xl font-black tracking-tight", classes.text)}>
                    {stat.value.toLocaleString()}
                  </h3>
                  <p className={cn("mt-1 text-[10px] font-medium opacity-80", classes.sub)}>
                    {stat.sublabel}
                  </p>
                </div>

              </div>
            </div>
          </div>
        );
      })}
    </div>
  )
}

