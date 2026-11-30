"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty";
import { RefreshButton } from "@/components/shared/RefreshButton";
import NarrativeText from "@/components/shared/NarrativeText";
import useViewPreference from "@/hooks/useViewPreference";
import { cn } from "@/lib/utils";
import { SUPERADMIN_BADGE_BASE as BADGE_BASE, BADGE_PALETTES } from "@/lib/badgeStyles";

const COMPACT_ACTIVITY_BADGE = "h-4 min-h-4 px-1.5 py-0 text-[10px] leading-none";
import { formatPHDateTime, formatNotificationTimeAgo } from "@/lib/timeFormat";
import {
  Cancel01Icon,
  Clock01Icon,
  Search01Icon,
  Shield01Icon,
  Alert01Icon,
  AlertCircleIcon,
  ComputerIcon,
  ArrowUpRight01Icon,
  ArrowDown01Icon,
} from "hugeicons-react";

export default function PersonnelActivityStream({ member, onNavigateToLogs }) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [search, setSearch] = useViewPreference("personnel-activity", "search", "");
  const [debouncedSearch, setDebouncedSearch] = useState(() => search.trim());
  const [severity, setSeverity] = useViewPreference("personnel-activity", "severity", "All");
  const [offset, setOffset] = useState(0);
  const [expandedLogId, setExpandedLogId] = useState(null);
  const limit = 15;

  const toggleExpandLog = (id) => {
    setExpandedLogId((prev) => (prev === id ? null : id));
  };

  const debounceTimerRef = useRef(null);

  // Debounce search input
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setOffset(0);
    }, 300);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [search]);

  // Fetch logs
  const fetchLogs = useCallback(
    async (isManualRefresh = false, append = false, currentOffset = 0) => {
      if (!member?.id) return;

      if (isManualRefresh) setIsRefreshing(true);
      else if (append) setIsLoadingMore(true);
      else setIsLoading(true);

      try {
        const params = new URLSearchParams();
        params.set("limit", String(limit));
        params.set("offset", String(currentOffset));
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (severity && severity !== "All") params.set("severity", severity);

        const res = await fetch(`/api/staff/${encodeURIComponent(member.id)}/activity?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);

        if (json?.ok && Array.isArray(json.data)) {
          if (append) {
            setLogs((prev) => [...prev, ...json.data]);
          } else {
            setLogs(json.data);
            setOffset(0);
          }
          setTotal(Number(json.total) || 0);
        } else {
          if (!append) setLogs([]);
          setTotal(0);
        }
      } catch (err) {
        console.error("Failed to load personnel activity:", err);
        if (!append) setLogs([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [member?.id, debouncedSearch, severity]
  );

  // Trigger fetch when dependencies change
  useEffect(() => {
    fetchLogs(false, false, 0);
  }, [fetchLogs]);

  const handleLoadMore = () => {
    const nextOffset = offset + limit;
    setOffset(nextOffset);
    fetchLogs(false, true, nextOffset);
  };

  const hasMore = logs.length < total;
  const isFiltered = Boolean(debouncedSearch || (severity && severity !== "All"));

  const getSeverityBadge = (sev) => {
    const s = String(sev || "INFO").toUpperCase();
    if (s === "CRITICAL") {
      return (
        <span className={cn(BADGE_BASE, BADGE_PALETTES.rose, COMPACT_ACTIVITY_BADGE)}>
          Critical
        </span>
      );
    }
    if (s === "WARNING") {
      return (
        <span className={cn(BADGE_BASE, BADGE_PALETTES.amber, COMPACT_ACTIVITY_BADGE)}>
          Warning
        </span>
      );
    }
    return (
      <span className={cn(BADGE_BASE, BADGE_PALETTES.blue, COMPACT_ACTIVITY_BADGE)}>
        Info
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Activity Filter Toolbar */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search01Icon
              size="1em"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 pointer-events-none text-xs"
            />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter actions or details..."
              className="h-8 pl-8 pr-7 text-xs bg-gray-50/70 dark:bg-zinc-900/40 border-border/80 dark:border-border"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 cursor-pointer"
                title="Clear filter"
              >
                <Cancel01Icon size="1em" className="text-[11px]" />
              </button>
            )}
          </div>

          <RefreshButton
            onRefresh={() => fetchLogs(true, false, 0)}
            isLoading={isRefreshing}
            title="Refresh Activity"
            className="h-8 w-8 shrink-0"
          />
        </div>

        {/* Severity Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {["All", "INFO", "WARNING", "CRITICAL"].map((sev) => {
            const isSelected = severity === sev;
            return (
              <button
                key={sev}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSeverity(sev)}
                className={cn(
                  "px-2.5 py-0.5 text-[11px] font-medium rounded-full border transition-all cursor-pointer active:scale-95",
                  isSelected
                    ? "bg-gray-900 text-white border-gray-900 dark:bg-zinc-100 dark:text-zinc-950 dark:border-zinc-100 font-semibold"
                    : "bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border-border dark:border-border hover:bg-gray-50 dark:hover:bg-zinc-700"
                )}
              >
                {sev === "All" ? "All Severities" : sev}
              </button>
            );
          })}
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="space-y-2 pt-1">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : logs.length > 0 ? (
          <>
            <div className="rounded-xl border border-border/80 dark:border-border bg-white dark:bg-zinc-900/40 divide-y divide-gray-100 dark:divide-zinc-800/60 overflow-hidden shadow-2xs">
              {logs.map((log) => {
                const isOperator = log.eventType === "operator";
                const isExpanded = expandedLogId === log.id;
                return (
                  <div
                    key={log.id}
                    onClick={() => toggleExpandLog(log.id)}
                    className="group p-3 sm:px-3.5 hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer select-none"
                  >
                    {/* Sleek Row Header */}
                    <div className="flex items-start justify-between gap-2.5">
                      {/* Left: Indicator Icon + Action Name + Badges */}
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        {/* Status Indicator Icon */}
                        <div className="mt-0.5 shrink-0">
                          {log.severity === "CRITICAL" ? (
                            <div className="size-5 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center">
                              <AlertCircleIcon size="1em" className="text-xs" />
                            </div>
                          ) : log.severity === "WARNING" ? (
                            <div className="size-5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                              <Alert01Icon size="1em" className="text-xs" />
                            </div>
                          ) : (
                            <div className="size-5 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                              <Shield01Icon size="1em" className="text-xs" />
                            </div>
                          )}
                        </div>

                        {/* Action Title, Pills & Details Preview */}
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors truncate">
                              {log.action}
                            </span>
                            {getSeverityBadge(log.severity)}
                            {isOperator ? (
                              <span className={cn(BADGE_BASE, BADGE_PALETTES.emerald, COMPACT_ACTIVITY_BADGE)}>
                                Operator
                              </span>
                            ) : (
                              <span className={cn(BADGE_BASE, BADGE_PALETTES.gray, COMPACT_ACTIVITY_BADGE)}>
                                Account
                              </span>
                            )}
                          </div>

                          {log.details && (
                            <div
                              className={cn(
                                "text-[11.5px] text-gray-600 dark:text-zinc-400 leading-relaxed font-sans transition-all",
                                isExpanded ? "line-clamp-none pt-0.5 text-gray-800 dark:text-zinc-200" : "line-clamp-1"
                              )}
                            >
                              <NarrativeText text={log.details} mode="full" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Timestamp & Expand Indicator */}
                      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                        <span className="text-[10.5px] text-gray-400 dark:text-zinc-500 font-sans tabular-nums whitespace-nowrap">
                          {formatNotificationTimeAgo(log.created_at)}
                        </span>
                        <ArrowDown01Icon
                          size="1em"
                          className={cn(
                            "text-gray-400 dark:text-zinc-500 text-xs transition-transform duration-200",
                            isExpanded && "-rotate-180 text-gray-700 dark:text-zinc-200"
                          )}
                        />
                      </div>
                    </div>

                    {/* Expanded Details Sub-Section */}
                    {isExpanded && (
                      <div className="mt-2.5 pt-2.5 pl-7.5 border-t border-dashed border-border/70 dark:border-border/70 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] text-gray-500 dark:text-zinc-400 font-sans motion-safe:animate-in motion-safe:fade-in-50 duration-150">
                        <div className="min-w-0 flex flex-col gap-0.5">
                          <span className="font-medium text-gray-400 dark:text-zinc-500">Timestamp</span>
                          <span className="tabular-nums text-gray-800 dark:text-zinc-200 font-medium truncate">
                            {formatPHDateTime(log.created_at)}
                          </span>
                        </div>
                        <div className="min-w-0 flex flex-col gap-0.5">
                          <span className="font-medium text-gray-400 dark:text-zinc-500">Logged By</span>
                          <span
                            className="text-gray-800 dark:text-zinc-200 font-medium truncate"
                            title={log.actor ? `${log.actor_display_name || log.actor}${log.role ? ` (${log.role})` : ""}` : "System"}
                          >
                            {log.actor ? `${log.actor_display_name || log.actor}${log.role ? ` (${log.role})` : ""}` : "System"}
                          </span>
                        </div>
                        <div className="min-w-0 flex flex-col gap-0.5">
                          <span className="font-medium text-gray-400 dark:text-zinc-500">IP Address</span>
                          <span className="tabular-nums text-gray-800 dark:text-zinc-200 font-medium truncate">
                            {log.ip || "N/A"}
                          </span>
                        </div>
                        <div className="min-w-0 flex flex-col gap-0.5">
                          <span className="font-medium text-gray-400 dark:text-zinc-500">Device/Client</span>
                          <span
                            className="text-gray-700 dark:text-zinc-300 font-medium truncate"
                            title={log.user_agent || "System / Internal"}
                          >
                            {log.user_agent || "System / Internal"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination / Load More */}
            {hasMore ? (
              <div className="pt-2 text-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="w-full h-9 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  {isLoadingMore ? "Loading more records..." : `Load More (${logs.length} of ${total})`}
                </Button>
              </div>
            ) : total > limit ? (
              <p className="text-[11px] text-center text-gray-400 dark:text-zinc-500 pt-2 font-sans tabular-nums">
                All {total} recorded events displayed
              </p>
            ) : null}
          </>
        ) : isFiltered ? (
          <EmptyState
            variant="compact"
            icon={Search01Icon}
            title="No Matching Activity"
            description="No audit logs matched the specified search or severity filter."
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setSeverity("All");
              }}
              className="mt-2 h-9 px-4 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Clear Filters
            </Button>
          </EmptyState>
        ) : (
          <EmptyState
            variant="compact"
            icon={Clock01Icon}
            title="No Activity Recorded Yet"
            description="Audit events and operational logs performed by or targeting this account will appear here."
          />
        )}
      </div>

      {/* Forensic Jump Link */}
      <div className="pt-2 border-t border-border/60 dark:border-border/60 flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400">
        <span>Need platform-wide forensic queries?</span>
        <button
          type="button"
          onClick={() => {
            if (onNavigateToLogs) {
              onNavigateToLogs();
            } else {
              window.dispatchEvent(
                new CustomEvent("switch-view", {
                  detail: { view: "logs", search: member.id },
                })
              );
            }
          }}
          className="inline-flex items-center gap-1 text-pup-maroon dark:text-red-400 hover:underline font-medium cursor-pointer"
        >
          <span>Open in Platform Logs</span>
          <ArrowUpRight01Icon size="1em" className="text-[11px]" />
        </button>
      </div>
    </div>
  );
}
