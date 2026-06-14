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
        bg: "from-[#14C8FF] via-[#007AFF] to-[#0055FF] dark:from-[#007AFF] dark:to-[#0033aa]",
        shape1: "from-[#0055FF]/40 to-[#007AFF]/0",
        shape2: "from-[#14C8FF]/30 to-[#007AFF]/0",
        text: "text-white", 
        sub: "text-blue-200", spark: "#BFDBFE" 
      };
      case "emerald": return { 
        bg: "from-[#34d399] via-[#059669] to-[#047857] dark:from-[#059669] dark:to-[#024e37]",
        shape1: "from-[#047857]/40 to-[#059669]/0",
        shape2: "from-[#34d399]/30 to-[#059669]/0",
        text: "text-white", 
        sub: "text-emerald-100", spark: "#A7F3D0" 
      };
      case "amber": return { 
        bg: "from-[#fbbf24] via-[#d97706] to-[#b45309] dark:from-[#d97706] dark:to-[#78350f]",
        shape1: "from-[#b45309]/40 to-[#d97706]/0",
        shape2: "from-[#fbbf24]/30 to-[#d97706]/0",
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
              "group relative overflow-hidden rounded-xl border-none p-5 shadow-sm dark:shadow-none transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br",
              classes.bg
            )}
          >
            {/* iCloud diagonal overlay vectors */}
            <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none z-0">
              <div className={cn("absolute bottom-0 left-0 w-[70%] h-[80%] bg-gradient-to-tr pointer-events-none", classes.shape1)} style={{ clipPath: 'polygon(0% 100%, 100% 100%, 0% 0%)' }} />
              <div className={cn("absolute bottom-0 left-0 w-[50%] h-[60%] bg-gradient-to-tr pointer-events-none", classes.shape2)} style={{ clipPath: 'polygon(0% 100%, 100% 100%, 0% 25%)' }} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-end justify-between">
                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-[14px] font-medium text-white">
                    {stat.label}
                  </div>
                  <div className="text-[48px] font-semibold text-white tracking-tight">
                    {stat.value.toLocaleString()}
                  </div>
                  <div className="mt-1 text-[13px] font-normal text-white">
                    {stat.sublabel}
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })}
    </div>
  )
}

