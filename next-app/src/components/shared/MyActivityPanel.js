"use client";

import HugeIcon from "@/components/shared/HugeIcon";
import useUrlPage from "@/hooks/useUrlPage";
import { useEffect, useMemo, useState, useCallback } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import MultiCriteriaFilter from "@/components/shared/MultiCriteriaFilter";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getNotificationDateGroup,
  formatNotificationTimeAgo,
} from "@/lib/timeFormat";
import { RefreshButton } from "@/components/shared/RefreshButton";
import PageHeader from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";
import LogDetailSheet from "@/components/admin/audit-logs/LogDetailSheet";
import LogStatCards from "@/components/admin/audit-logs/StatCards";
import NotificationsListSkeleton from "@/components/staff/skeletons/NotificationsListSkeleton";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
  EmptyContent,
} from "@/components/ui/empty";

function parseDateLocal(str) {
  if (!str) return undefined;
  const [y, m, d] = str.split("-").map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return undefined;
  return new Date(y, m - 1, d);
}

function getSeverityVisual(sev) {
  const s = String(sev || "").toUpperCase();
  if (s === "CRITICAL") {
    return {
      label: "Critical",
      icon: "ph-seal-warning",
      avatarClass: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60",
      chipClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
    };
  }
  if (s === "WARNING") {
    return {
      label: "Warning",
      icon: "ph-warning",
      avatarClass: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60",
      chipClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    };
  }
  return {
    label: "Info",
    icon: "ph-info",
    avatarClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60",
    chipClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  };
}

export default function MyActivityPanel({ embedded = false }) {
  const [search, setSearch] = useState("");
  const [localSearch, setLocalSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useUrlPage();
  const [perPage, setPerPage] = useState(10);

  const selectedSeverities = useMemo(() => {
    if (!severityFilter || severityFilter === "All") return [];
    return severityFilter.split(",").map((s) => s.trim()).filter(Boolean);
  }, [severityFilter]);

  const filterCriteriaGroups = useMemo(() => [
    {
      id: "severity",
      label: "Severity",
      options: [
        { id: "INFO", label: "Information", dotColor: "bg-blue-500" },
        { id: "WARNING", label: "Warnings", dotColor: "bg-amber-500" },
        { id: "CRITICAL", label: "Critical", dotColor: "bg-rose-500" },
      ],
      selected: selectedSeverities,
      onChange: (vals) => {
        setSeverityFilter(vals.length === 0 ? "All" : vals.join(","));
        setPage(1);
      },
    },
  ], [selectedSeverities, setPage]);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  const [selectedLog, setSelectedLog] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const offset = (page - 1) * perPage;
      const sevQuery = severityFilter !== "All" ? `&severity=${encodeURIComponent(severityFilter)}` : "";
      const startQuery = startDate ? `&startDate=${encodeURIComponent(startDate)}` : "";
      const endQuery = endDate ? `&endDate=${encodeURIComponent(endDate)}` : "";

      const res = await fetch(
        `/api/audit-logs?mine=1&limit=${perPage}&offset=${offset}&search=${encodeURIComponent(search)}${sevQuery}${startQuery}${endQuery}&sortBy=created_at&sortOrder=DESC`,
        { cache: "no-store" }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to load activity");
      setRows(Array.isArray(json.data) ? json.data : []);
      setTotal(Number(json.total) || 0);
    } catch (err) {
      setRows([]);
      setTotal(0);
      setError(err?.message || "Failed to load activity");
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, severityFilter, startDate, endDate]);

  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch("/api/audit-logs/stats?mine=1");
      const json = await res.json();
      if (res.ok && json?.ok) {
        setStats(json.data);
      }
    } catch { /* ignore */ }
  }, []);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refresh(), refreshStats()]);
  }, [refresh, refreshStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        setSearch(localSearch);
        setPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch, search, setPage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    refreshStats();
  }, [refresh, refreshStats]);

  const handleQuickRange = (range) => {
    const end = new Date();
    let start = new Date();

    switch (range) {
      case "today":
        start.setHours(0, 0, 0, 0);
        break;
      case "yesterday":
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case "last7":
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        break;
      case "last30":
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        break;
    }

    setStartDate(format(start, "yyyy-MM-dd"));
    setEndDate(format(end, "yyyy-MM-dd"));
    setPage(1);
  };

  const activeShortcut = (() => {
    if (!startDate || !endDate) return null;
    const todayStr = format(new Date(), "yyyy-MM-dd");

    if (startDate === todayStr && endDate === todayStr) return "today";

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yestStr = format(yesterday, "yyyy-MM-dd");
    if (startDate === yestStr && endDate === yestStr) return "yesterday";

    const last7 = new Date();
    last7.setDate(last7.getDate() - 6);
    if (startDate === format(last7, "yyyy-MM-dd") && endDate === todayStr) return "last7";

    const last30 = new Date();
    last30.setDate(last30.getDate() - 29);
    if (startDate === format(last30, "yyyy-MM-dd") && endDate === todayStr) return "last30";

    return null;
  })();

  const handleClearFilters = () => {
    setLocalSearch("");
    setSearch("");
    setSeverityFilter("All");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    localSearch !== "" || severityFilter !== "All" || startDate !== "" || endDate !== ""
  );

  const groupedRows = useMemo(() => {
    const groups = {
      TODAY: [],
      YESTERDAY: [],
      "THIS WEEK": [],
      EARLIER: [],
    };

    rows.forEach((row) => {
      const bucket = getNotificationDateGroup(row.created_at || row.time);
      if (groups[bucket]) {
        groups[bucket].push(row);
      } else {
        groups.EARLIER.push(row);
      }
    });

    return [
      { key: "TODAY", label: "Today", items: groups.TODAY },
      { key: "YESTERDAY", label: "Yesterday", items: groups.YESTERDAY },
      { key: "THIS WEEK", label: "This Week", items: groups["THIS WEEK"] },
      { key: "EARLIER", label: "Earlier", items: groups.EARLIER },
    ].filter((g) => g.items.length > 0);
  }, [rows]);

  const handleNextLog = () => {
    if (!selectedLog) return;
    const currentIndex = rows.findIndex((log) => log.id === selectedLog.id);
    if (currentIndex < rows.length - 1) {
      setSelectedLog(rows[currentIndex + 1]);
    }
  };

  const handlePrevLog = () => {
    if (!selectedLog) return;
    const currentIndex = rows.findIndex((log) => log.id === selectedLog.id);
    if (currentIndex > 0) {
      setSelectedLog(rows[currentIndex - 1]);
    }
  };

  const handleSearchSimilar = (term) => {
    setLocalSearch(term);
    setSearch(term);
    setPage(1);
  };

  const handleCopy = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("Copied to Clipboard", { description: `${label} has been successfully copied.` });
  };


  const totalPages = Math.max(1, Math.ceil(total / perPage) || 1);
  const displayPage = Math.min(page, totalPages);
  const startEntry = total === 0 ? 0 : (displayPage - 1) * perPage + 1;
  const endEntry = startEntry === 0 ? 0 : (displayPage - 1) * perPage + rows.length;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          "animate-in fade-in duration-normal",
          !embedded &&
            "flex h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta mb-4"
        )}
      >
        {/* 1. Page Header */}
        {embedded ? (
          <div className="px-6 py-4 flex items-start flex-wrap justify-between gap-3">
            <div>
              <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 transition-colors dark:text-zinc-50">
                My Activity
              </h3>
              <p className="mt-1 text-[13px] font-normal text-gray-500 transition-colors dark:text-zinc-400">
                A personal audit trail of every action your account takes on the system.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <RefreshButton onRefresh={handleRefresh} isLoading={loading} title="Refresh Activity" />
            </div>
          </div>
        ) : (
          <PageHeader
            icon="ph-clock-counter-clockwise"
            title="My Activity"
            description="A personal audit trail of every action your account takes on the system."
            showBorder={false}
            className="p-6"
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
            actions={
              <RefreshButton onRefresh={handleRefresh} isLoading={loading} title="Refresh Activity" />
            }
          />
        )}

        {/* 2. KPI Stat Cards */}
        <div className="px-6 py-5 border-t border-border dark:border-border">
          <LogStatCards
            isLoading={loading && !stats}
            logStats={stats}
            sublabelOverrides={{
              total: "Cumulative personal logs",
              today: "Events recorded today",
              auth: "Logins & access events",
            }}
          />
        </div>

        {/* 3. Search & Filter Toolbar */}
        <div className="px-6 py-4 border-t border-border dark:border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 sm:w-64 min-w-[200px] max-w-sm group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <HugeIcon className="ph-bold ph-magnifying-glass text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-sm" />
            </div>
            <Input
              type="text"
              placeholder="Search action, details, IP..."
              className="h-9 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 pl-8 pr-16 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              disabled={loading}
            />
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[11px] text-gray-400 dark:text-zinc-500 font-mono">
              {total.toLocaleString()}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <MultiCriteriaFilter
              title="Filter Logs"
              buttonLabel="Filter"
              groups={filterCriteriaGroups}
              align="end"
              onReset={() => {
                setSeverityFilter("All");
                setPage(1);
              }}
            />

            <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-gray-200/60 dark:border-white/5 shrink-0">
              {[
                { key: "today", label: "Today" },
                { key: "yesterday", label: "Yest." },
                { key: "last7", label: "7d" },
                { key: "last30", label: "30d" },
              ].map((range) => {
                const isActive = activeShortcut === range.key;
                return (
                  <button
                    key={range.key}
                    type="button"
                    onClick={() => handleQuickRange(range.key)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap",
                      isActive
                        ? "bg-pup-maroon text-white dark:bg-red-600 dark:text-white shadow-xs"
                        : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                    )}
                  >
                    {range.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-[105px]">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-9 w-full justify-start rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-left text-xs font-normal shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 px-2.5 cursor-pointer",
                        !startDate ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                      )}
                    >
                      {startDate ? format(parseDateLocal(startDate), "MMM d") : "Start"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-card" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate ? parseDateLocal(startDate) : undefined}
                      onSelect={(date) => {
                        setStartDate(date ? format(date, "yyyy-MM-dd") : "");
                        setPage(1);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <span className="text-[12px] text-gray-400 dark:text-zinc-500">→</span>
              <div className="w-[105px]">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-9 w-full justify-start rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-left text-xs font-normal shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 px-2.5 cursor-pointer",
                        !endDate ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                      )}
                    >
                      {endDate ? format(parseDateLocal(endDate), "MMM d") : "End"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-card" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate ? parseDateLocal(endDate) : undefined}
                      onSelect={(date) => {
                        setEndDate(date ? format(date, "yyyy-MM-dd") : "");
                        setPage(1);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        <ActiveFilterChips
          groups={filterCriteriaGroups}
          selected={{ severity: selectedSeverities }}
          onRemove={(groupId, val) => {
            const next = selectedSeverities.filter((v) => v !== val);
            setSeverityFilter(next.length === 0 ? "All" : next.join(","));
            setPage(1);
          }}
          searchQuery={localSearch}
          onClearSearch={() => {
            setLocalSearch("");
            setSearch("");
            setPage(1);
          }}
          extraChips={[
            ...(startDate || endDate
              ? [
                  {
                    groupLabel: "Date Range",
                    label: `${startDate ? format(parseDateLocal(startDate), "MMM d, yyyy") : "Start"} → ${endDate ? format(parseDateLocal(endDate), "MMM d, yyyy") : "End"}`,
                    onClear: () => {
                      setStartDate("");
                      setEndDate("");
                      setPage(1);
                    },
                  },
                ]
              : []),
          ]}
          onClearAll={handleClearFilters}
          className="border-t border-border dark:border-border px-6 py-2.5"
        />

        {/* 5. Grouped Activity Feed / Skeleton / States */}
        {loading && !rows.length ? (
          <NotificationsListSkeleton groupCount={2} itemsPerGroup={3} className="border-t border-border dark:border-border" />
        ) : error ? (
          <div className="min-h-[320px] flex flex-col items-center justify-center p-6 text-center text-gray-500 dark:text-zinc-400 border-t border-border dark:border-border rounded-b-2xl">
            <Empty className="flex flex-col items-center justify-center border-0 text-center text-gray-500 dark:text-zinc-400">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <div className="relative mb-6">
                  <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                  <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-border bg-white shadow-xl dark:border-border dark:bg-card dark:shadow-none">
                    <HugeIcon className="ph-duotone ph-warning-circle text-3xl text-pup-maroon dark:text-primary" />
                  </EmptyMedia>
                </div>
                <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                  Activity Log Error
                </EmptyTitle>
                <EmptyDescription className="max-w-md text-sm font-medium text-gray-500 dark:text-zinc-400 mt-1">
                  {error}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  className="mt-6 h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Retry Loading
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        ) : rows.length === 0 ? (
          <div className="min-h-[320px] flex flex-col items-center justify-center p-6 border-t border-border dark:border-border rounded-b-2xl">
            <Empty className="flex flex-col items-center justify-center border-0 bg-transparent text-center">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <EmptyMedia className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-zinc-800">
                  <HugeIcon
                    className={cn(
                      "ph-duotone text-3xl text-gray-400 dark:text-zinc-500",
                      hasActiveFilters ? "ph-magnifying-glass" : "ph-clock-counter-clockwise"
                    )}
                  />
                </EmptyMedia>
                <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                  {hasActiveFilters ? "No Activity Found" : "No Activity Recorded Yet"}
                </EmptyTitle>
                <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400 mt-1">
                  {hasActiveFilters
                    ? "Try adjusting your search filters to find what you're looking for."
                    : "Your sign-ins, security changes, and account actions will automatically appear here."}
                </EmptyDescription>
              </EmptyHeader>
              {hasActiveFilters && (
                <EmptyContent>
                  <Button
                    variant="outline"
                    onClick={handleClearFilters}
                    title="Reset Filters"
                    className="mt-6 h-10 px-5 text-xs font-semibold rounded-xl border border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                  >
                    Reset Filters
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          </div>
        ) : (
          <div
            className={cn(
              "flex flex-col gap-6 px-6 py-5 border-t border-border dark:border-border transition-all duration-slow",
              loading ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
            )}
          >
            {groupedRows.map((group) => (
              <div key={group.key} className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    {group.key}
                  </span>
                  <span className="text-[11px] font-medium text-gray-400 dark:text-zinc-500">
                    {group.items.length} {group.items.length === 1 ? "event" : "events"}
                  </span>
                </div>

                <div className="rounded-2xl border border-border/80 bg-white dark:bg-card overflow-hidden shadow-xs divide-y divide-border/60 dark:divide-border/60">
                  {group.items.map((log) => {
                    const visuals = getSeverityVisual(log.severity);
                    const actionTitle =
                      log.action === "Rotate Password" ? "Password Rotated" : log.action || "Unknown Event";

                    return (
                      <div
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className="group flex items-center justify-between gap-4 p-4 transition-all duration-normal cursor-pointer select-none hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 active:scale-[0.998]"
                      >
                        <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                          <div
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base transition-transform group-hover:scale-105",
                              visuals.avatarClass
                            )}
                          >
                            <HugeIcon className={cn("ph-bold text-base", visuals.icon)} />
                          </div>

                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4
                                className="text-[13px] leading-snug tracking-[-0.01em] font-semibold text-gray-900 dark:text-zinc-50 truncate"
                                title={actionTitle}
                              >
                                {actionTitle}
                              </h4>
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                  visuals.chipClass
                                )}
                              >
                                {visuals.label}
                              </span>
                            </div>

                            <p
                              className="text-xs text-muted-foreground mt-0.5 line-clamp-1 break-words font-normal"
                              title={log.details || "No known description"}
                            >
                              {log.details || "No known description"}
                            </p>

                            <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400 dark:text-zinc-500">
                              <span>{formatNotificationTimeAgo(log.created_at || log.time)}</span>
                              {log.ip && (
                                <>
                                  <span>·</span>
                                  <span className="font-mono">{log.ip}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div
                          className="shrink-0 flex items-center gap-2 pl-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => setSelectedLog(log)}
                                className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 border-0 bg-transparent cursor-pointer active:scale-95 flex items-center justify-center transition-colors"
                                aria-label="View Details"
                              >
                                <HugeIcon className="ph-bold ph-eye text-[16px]" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>View Details</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 6. Pagination Footer */}
        {!error && total > 0 && (
          <div className="mt-auto flex items-center justify-between gap-4 border-t border-border bg-white p-4 px-6 rounded-b-2xl dark:border-border dark:bg-card">
            <div className="flex items-center gap-6 text-xs text-gray-900 dark:text-zinc-300 select-none">
              <span>
                Showing {endEntry} of {total.toLocaleString()}
              </span>

              <div className="flex items-center gap-2">
                <span>Rows:</span>
                {[10, 20, 50, 100].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setPerPage(size);
                      setPage(1);
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                      perPage === size
                        ? "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
                        : "text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 select-none">
              <Button
                variant="ghost"
                size="sm"
                disabled={displayPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="text-xs text-gray-900 dark:text-zinc-300 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
              >
                Prev
              </Button>

              <div className="h-8 w-8 rounded-xl border border-border bg-white flex items-center justify-center text-xs font-bold text-gray-800 dark:border-border dark:bg-zinc-900 dark:text-zinc-200">
                {displayPage}
              </div>

              <Button
                variant="ghost"
                size="sm"
                disabled={displayPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="text-xs text-gray-900 dark:text-zinc-300 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Log Detail Sheet */}
        <LogDetailSheet
          selectedLog={selectedLog}
          setSelectedLog={setSelectedLog}
          handleCopy={handleCopy}
          onSearchSimilar={handleSearchSimilar}
          onNext={handleNextLog}
          onPrev={handlePrevLog}
          hasNext={rows.length > 0 && selectedLog && rows.findIndex((l) => l.id === selectedLog.id) < rows.length - 1}
          hasPrev={rows.length > 0 && selectedLog && rows.findIndex((l) => l.id === selectedLog.id) > 0}
          currentIndex={selectedLog ? rows.findIndex((l) => l.id === selectedLog.id) : -1}
          totalCount={rows.length}
          hideActor={true}
        />
      </div>
    </TooltipProvider>
  );
}
