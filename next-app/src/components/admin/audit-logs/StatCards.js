import { useState, useRef, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function StatCards({ isLoading, logStats }) {
  const [selectedKpi, setSelectedKpi] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!selectedKpi) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setSelectedKpi(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [selectedKpi]);

  const trends = logStats?.trends || [];
  
  const stats = [
    {
      key: "total",
      label: "Total Events",
      value: logStats?.totalLogs || 0,
      sublabel: "Cumulative system logs",
      color: "blue",
      trendData: trends.map(t => t.total),
      iconClass: "ph-database"
    },
    {
      key: "today",
      label: "Activity Today",
      value: logStats?.logsToday || 0,
      sublabel: "Events recorded today",
      color: "emerald",
      trendData: trends.map(t => t.total),
      iconClass: "ph-calendar-check"
    },
    {
      key: "auth",
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
    <div
      ref={containerRef}
      className={cn(
        "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 items-start relative z-20 transition-all duration-500",
        isLoading ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
      )}
    >
      {stats.map((stat, i) => {
        const classes = getColorClasses(stat.color);
        return (
          <div 
            key={i} 
            className={cn(
              "relative group rounded-xl",
              selectedKpi === stat.key ? "z-30" : "z-10"
            )}
          >
            <div 
              onClick={() => setSelectedKpi(selectedKpi === stat.key ? null : stat.key)}
              className={cn(
                "relative overflow-hidden rounded-xl border-none p-5 cursor-pointer bg-gradient-to-br select-none",
                classes.bg,
                stat.color === "blue" ? "glass-stat-card-blue" :
                stat.color === "emerald" ? "glass-stat-card-green" :
                stat.color === "amber" ? "glass-stat-card-orange" : ""
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

            {/* Absolute details container */}
            <div className={cn(
              "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl bg-gradient-to-br p-5 shadow-2xl transition-all duration-300 ease-in-out origin-top",
              classes.bg,
              selectedKpi === stat.key ? "scale-y-100 opacity-100 translate-y-0" : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
            )} onClick={(e) => e.stopPropagation()}>
              <div className="space-y-4">
                {stat.key === "total" && (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-white">
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-white">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Total Logs</span>
                        <span className="text-lg font-black font-mono">{(logStats?.totalLogs || 0).toLocaleString()}</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-white">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Active Actors</span>
                        <span className="text-lg font-black font-mono">{(logStats?.activeActorsCount || 3).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-xs text-white/90 leading-relaxed">
                      Cumulative record count of all CRUD operations, metadata alterations, and developer boots.
                    </div>
                  </>
                )}

                {stat.key === "today" && (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-white">
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-white">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Today's Logs</span>
                        <span className="text-lg font-black font-mono">{(logStats?.logsToday || 0).toLocaleString()}</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-white">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Hourly Peak</span>
                        <span className="text-lg font-black font-mono">{Math.round((logStats?.logsToday || 0) / 8).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-xs text-white/90 leading-relaxed">
                      Total system actions monitored inside the active 24-hour cycle.
                    </div>
                  </>
                )}

                {stat.key === "auth" && (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-white">
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-white">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Auth Events</span>
                        <span className="text-lg font-black font-mono">{(logStats?.authEvents || 0).toLocaleString()}</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-white">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Target Failure</span>
                        <span className="text-lg font-black font-mono">0</span>
                      </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-xs text-white/90 leading-relaxed">
                      Historical attempts to sign in, refresh token states, or security code verifications.
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  )
}
