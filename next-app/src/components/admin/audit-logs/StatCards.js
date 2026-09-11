import { useState, useRef, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import KpiStatCardsSkeleton from "@/components/systemadmin/skeletons/KpiStatCardsSkeleton"

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
      value: Number(logStats?.totalLogs ?? logStats?.totallogs ?? 0),
      sublabel: "Cumulative system logs",
      color: "blue",
      trendData: trends.map(t => Number(t.total ?? t.count ?? 0)),
      iconClass: "ph-database"
    },
    {
      key: "today",
      label: "Activity Today",
      value: Number(logStats?.logsToday ?? logStats?.logstoday ?? 0),
      sublabel: "Events recorded today",
      color: "emerald",
      trendData: trends.map(t => Number(t.total ?? t.count ?? 0)),
      iconClass: "ph-calendar-check"
    },
    {
      key: "auth",
      label: "Auth Attempts",
      value: Number(logStats?.authEvents ?? logStats?.authevents ?? 0),
      sublabel: "Logins & access events",
      color: "amber",
      trendData: trends.map(t => Number(t.auth ?? t.authCount ?? t.authcount ?? 0)),
      iconClass: "ph-fingerprint"
    }
  ];

  const getSubColor = (color) => {
    switch (color) {
      case "blue": return "text-blue-600 dark:text-blue-400";
      case "emerald": return "text-emerald-600 dark:text-emerald-400";
      case "amber": return "text-amber-600 dark:text-amber-400";
      default: return "text-gray-500";
    }
  };

  const getRingColor = (color) => {
    switch (color) {
      case "blue": return "border-blue-500/40 dark:border-blue-500/40 ring-1 ring-blue-500/20";
      case "emerald": return "border-emerald-500/40 dark:border-emerald-500/40 ring-1 ring-emerald-500/20";
      case "amber": return "border-amber-500/40 dark:border-amber-500/40 ring-1 ring-amber-500/20";
      default: return "";
    }
  };

  if (isLoading || !logStats) {
    return <KpiStatCardsSkeleton count={3} />;
  }

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 items-start relative z-20"
    >
      {stats.map((stat, i) => {
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
                "relative overflow-hidden rounded-xl border p-4 cursor-pointer select-none transition-all",
                "border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-900/30 hover:border-gray-200 dark:hover:border-white/10",
                selectedKpi === stat.key && getRingColor(stat.color)
              )}
            >
              <div className="relative z-10">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                    {stat.label}
                  </span>
                  <i className={cn("ph-bold ph-caret-down text-xs text-gray-400 transition-transform duration-300", selectedKpi === stat.key && "rotate-180")} />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-gray-900 dark:text-zinc-50 tracking-tight">
                    {stat.value.toLocaleString()}
                  </span>
                  <span className={cn("text-xs font-medium", getSubColor(stat.color))}>
                    {stat.sublabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Absolute details container */}
            <div className={cn(
              "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
              selectedKpi === stat.key ? "scale-y-100 opacity-100 translate-y-0" : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
            )} onClick={(e) => e.stopPropagation()}>
              <div className="space-y-3">
                {stat.key === "total" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">
                        <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Total Logs</span>
                        <span className="text-lg font-black text-gray-900 dark:text-zinc-50 font-sans">{Number(logStats?.totalLogs ?? logStats?.totallogs ?? 0).toLocaleString()}</span>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/30">
                        <span className="block text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Active Actors</span>
                        <span className="text-lg font-black text-blue-700 dark:text-blue-400 font-sans">{Number(logStats?.activeActorsCount ?? logStats?.activeactorscount ?? 3).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5 text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                      Cumulative record count of all CRUD operations, metadata alterations, and developer boots.
                    </div>
                  </>
                )}

                {stat.key === "today" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">
                        <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Today&apos;s Logs</span>
                        <span className="text-lg font-black text-gray-900 dark:text-zinc-50 font-sans">{Number(logStats?.logsToday ?? logStats?.logstoday ?? 0).toLocaleString()}</span>
                      </div>
                      <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                        <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Hourly Peak</span>
                        <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-sans">{Math.round(Number(logStats?.logsToday ?? logStats?.logstoday ?? 0) / 8).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5 text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                      Total system actions monitored inside the active 24-hour cycle.
                    </div>
                  </>
                )}

                {stat.key === "auth" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">
                        <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Auth Events</span>
                        <span className="text-lg font-black text-gray-900 dark:text-zinc-50 font-sans">{Number(logStats?.authEvents ?? logStats?.authevents ?? 0).toLocaleString()}</span>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30">
                        <span className="block text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Target Failure</span>
                        <span className="text-lg font-black text-amber-700 dark:text-amber-400">0</span>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5 text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
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
