"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import useViewPreference from "@/hooks/useViewPreference";
import useUrlPage from "@/hooks/useUrlPage";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardSearch from "@/components/systemadmin/DashboardSearch";
import { FilterPopover } from "@/components/systemadmin/OfficeTableControls";
import DataViewToolbar from "@/components/shared/DataViewToolbar";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import { DateRangeFilterButton } from "@/components/shared/DateRangePickerModal";
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
import NarrativeText from "@/components/shared/NarrativeText";
import { cn, formatLogDetails } from "@/lib/utils";
import LogDetailSheet from "@/components/admin/audit-logs/LogDetailSheet";
import TablePagination from "@/components/shared/TablePagination";
import NotificationsListSkeleton from "@/components/staff/skeletons/NotificationsListSkeleton";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
  EmptyContent,
} from "@/components/ui/empty";
import {
  Alert01Icon,
  Alert02Icon,
  AlertCircleIcon as EmptyAlertCircleIcon,
  Building01Icon,
  Cancel01Icon,
  Clock01Icon as EmptyClock01Icon,
  DatabaseIcon,
  Download01Icon,
  FileUploadIcon,
  FilterIcon,
  InformationCircleIcon,
  Key01Icon,
  Login01Icon,
  Logout01Icon,
  Search01Icon as EmptySearch01Icon,
  Settings01Icon,
  ShieldKeyIcon,
  StudentIcon,
  Tick01Icon,
  UserCircleIcon,
  ViewIcon,
} from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";

function parseDateLocal(str) {
  if (!str) return undefined;
  const [y, m, d] = str.split("-").map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return undefined;
  return new Date(y, m - 1, d);
}

/**
 * Action-aware semantic event visuals following Apple HIG and RMS standards.
 * Provides distinct Hugeicons and soft pastel badge backgrounds based on action and severity.
 */
function getActivityVisual(log) {
  const sev = String(log?.severity || "").toUpperCase();
  const act = String(log?.action || "").toLowerCase();

  // 1. Critical / Security Severity Overrides
  if (sev === "CRITICAL" || sev === "SECURITY" || act.includes("unauthorized") || act.includes("security")) {
    return {
      label: "Critical",
      Icon: Alert01Icon,
      avatarClass:
        "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60",
      chipClass:
        "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40",
    };
  }

  // 2. Warning Severity Overrides
  if (sev === "WARNING" || act.includes("invalid") || act.includes("failed") || act.includes("decline")) {
    return {
      label: sev === "WARNING" ? "Warning" : "Declined",
      Icon: act.includes("decline") ? Cancel01Icon : Alert02Icon,
      avatarClass: act.includes("decline")
        ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60"
        : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60",
      chipClass: act.includes("decline")
        ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40"
        : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40",
    };
  }

  // 3. Action-Specific Visuals
  if (act.includes("login") || act.includes("sign in") || act.includes("authenticated")) {
    return {
      label: "Login",
      Icon: Login01Icon,
      avatarClass:
        "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60",
      chipClass:
        "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40",
    };
  }

  if (act.includes("logout") || act.includes("sign out")) {
    return {
      label: "Logout",
      Icon: Logout01Icon,
      avatarClass:
        "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700",
      chipClass:
        "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700",
    };
  }

  if (act.includes("password") || act.includes("rotate") || act.includes("credential")) {
    return {
      label: "Security",
      Icon: Key01Icon,
      avatarClass:
        "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60",
      chipClass:
        "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/60 dark:border-purple-900/40",
    };
  }

  if (act.includes("avatar") || act.includes("profile")) {
    return {
      label: "Profile",
      Icon: UserCircleIcon,
      avatarClass:
        "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60",
      chipClass:
        "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/40",
    };
  }

  if (act.includes("student")) {
    return {
      label: "Records",
      Icon: StudentIcon,
      avatarClass:
        "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60",
      chipClass:
        "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/40",
    };
  }

  if (act.includes("organization") || act.includes("org")) {
    return {
      label: "Organization",
      Icon: Building01Icon,
      avatarClass:
        "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60",
      chipClass:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40",
    };
  }

  if (act.includes("upload") || act.includes("document") || act.includes("file")) {
    return {
      label: "Document",
      Icon: FileUploadIcon,
      avatarClass:
        "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60",
      chipClass:
        "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40",
    };
  }

  if (act.includes("approve")) {
    return {
      label: "Approved",
      Icon: Tick01Icon,
      avatarClass:
        "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60",
      chipClass:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40",
    };
  }

  if (act.includes("backup")) {
    return {
      label: "Backup",
      Icon: DatabaseIcon,
      avatarClass:
        "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-800/60",
      chipClass:
        "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-900/40",
    };
  }

  if (act.includes("export") || act.includes("download")) {
    return {
      label: "Export",
      Icon: Download01Icon,
      avatarClass:
        "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60",
      chipClass:
        "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200/60 dark:border-sky-900/40",
    };
  }

  if (act.includes("setting") || act.includes("config")) {
    return {
      label: "System",
      Icon: Settings01Icon,
      avatarClass:
        "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700",
      chipClass:
        "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700",
    };
  }

  // 4. Default Informational Event
  return {
    label: "Info",
    Icon: InformationCircleIcon,
    avatarClass:
      "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60",
    chipClass:
      "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200/60 dark:border-sky-900/40",
  };
}

/**
 * Formats audit narrative descriptions, rendering Apple-style tokens for mentions, IDs, and entities.
 */
function renderFormattedDetails(details, onMentionClick) {
  return <NarrativeText text={details} mode="full" onMentionClick={onMentionClick} />;
}

export default function MyActivityPanel() {
  const [search, setSearch] = useState("");
  const [localSearch, setLocalSearch] = useViewPreference("activity", "localSearch", "");
  const [filterRules, setFilterRules] = useViewPreference("activity", "filterRules", []);
  const [startDate, setStartDate] = useViewPreference("activity", "startDate", "");
  const [endDate, setEndDate] = useViewPreference("activity", "endDate", "");
  const [page, setPage] = useUrlPage();
  const [perPage, setPerPage] = useViewPreference("activity", "perPage", 50);

  const activityFilterFields = useMemo(
    () => [
      {
        key: "severity",
        label: "Severity",
        icon: FilterIcon,
        options: [
          { value: "INFO", label: "Information" },
          { value: "WARNING", label: "Warning" },
          { value: "CRITICAL", label: "Critical" },
        ],
      },
    ],
    []
  );

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const offset = (page - 1) * perPage;
      const includeSeverities = filterRules
        .filter((r) => r.fieldKey === "severity" && r.operator !== "is_not" && r.value)
        .flatMap((r) => (Array.isArray(r.value) ? r.value : [String(r.value)]));
      const excludeSeverities = filterRules
        .filter((r) => r.fieldKey === "severity" && r.operator === "is_not" && r.value)
        .flatMap((r) => (Array.isArray(r.value) ? r.value : [String(r.value)]));

      const sevQuery = includeSeverities.length > 0 ? `&severity=${encodeURIComponent(includeSeverities.join(","))}` : "";
      const excludeSevQuery = excludeSeverities.length > 0 ? `&excludeSeverity=${encodeURIComponent(excludeSeverities.join(","))}` : "";
      const startQuery = startDate ? `&startDate=${encodeURIComponent(startDate)}` : "";
      const endQuery = endDate ? `&endDate=${encodeURIComponent(endDate)}` : "";

      const res = await fetch(
        `/api/audit-logs?mine=1&limit=${perPage}&offset=${offset}&search=${encodeURIComponent(search)}${sevQuery}${excludeSevQuery}${startQuery}${endQuery}&sortBy=created_at&sortOrder=DESC`,
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
  }, [page, perPage, search, filterRules, startDate, endDate]);

  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

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
  }, [refresh]);

  const handleClearFilters = () => {
    setLocalSearch("");
    setSearch("");
    setFilterRules([]);
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    localSearch !== "" || filterRules.length > 0 || startDate !== "" || endDate !== ""
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

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta animate-fade-up">
        {/* 1. Page Header */}
        <PageHeader
          icon="Time01Icon"
          title={
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span>My Activity</span>
              <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">
                {total.toLocaleString()} records
              </span>
            </div>
          }
          description="A personal audit trail of every action your account takes on the system."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <RefreshButton onRefresh={handleRefresh} isLoading={loading} title="Refresh Activity" className="h-9 w-9" />
          }
        />

        {/* 2. Search & Filter Toolbar */}
        <DataViewToolbar label="Personal activity search, severity filter, and date range" className="gap-2 border-t border-border dark:border-border bg-white px-5 py-3 dark:bg-card">
          {/* Left Group */}
          <div className="flex min-w-0 items-center gap-2">
            <DashboardSearch
              value={localSearch}
              onChange={setLocalSearch}
              onClear={() => {
                setLocalSearch("");
                setSearch("");
                setPage(1);
              }}
              placeholder="Search action, details, IP..."
              label="Search personal activity history"
              count={total}
              loading={loading && total === 0}
              className="w-72 sm:w-80 shrink-0"
            />
          </div>

          {/* Right Group: Canonical Filter Control & Date Range */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <FilterPopover
              fields={activityFilterFields}
              filters={filterRules}
              onFiltersChange={(rules) => {
                setFilterRules(rules);
                setPage(1);
              }}
              entityLabel="activity"
            />

            <DateRangeFilterButton
              startDate={startDate}
              endDate={endDate}
              onApply={({ startDate: newStart, endDate: newEnd }) => {
                setStartDate(newStart);
                setEndDate(newEnd);
                setPage(1);
              }}
              onClear={() => {
                setStartDate("");
                setEndDate("");
                setPage(1);
              }}
              disableFutureDates={true}
            />
          </div>
        </DataViewToolbar>

        {/* 3. Active Filter Chips */}
        {hasActiveFilters && (
          <ActiveFilterChips
            chips={filterRules.map((rule) => {
              const field = activityFilterFields.find((f) => f.key === rule.fieldKey);
              const valLabel =
                field?.options?.find((opt) => String(opt.value) === String(rule.value))?.label || rule.value;
              return {
                id: rule.id,
                label: `${field?.label || rule.fieldKey} ${rule.operator === "is_not" ? "is not" : "is"} ${valLabel}`,
                onRemove: () => {
                  setFilterRules(filterRules.filter((r) => r.id !== rule.id));
                  setPage(1);
                },
              };
            })}
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
            className="border-t border-border dark:border-border bg-white dark:bg-card px-5 sm:px-6 py-2.5"
          />
        )}

        {/* 5. Grouped Activity Feed / Skeleton / States */}
        {loading && !rows.length ? (
          <NotificationsListSkeleton groupCount={2} itemsPerGroup={3} className="flex-[1_0_auto] border-t border-border dark:border-border" />
        ) : error ? (
          <div className="flex-[1_0_auto] min-h-[320px] flex flex-col items-center justify-center p-6 text-center text-gray-500 dark:text-zinc-400 border-t border-border dark:border-border rounded-b-2xl">
            <Empty>
              <EmptyHeader>
                <EmptyMedia className="text-red-600 dark:text-red-400"><EmptyAlertCircleIcon size="1em" /></EmptyMedia>
                <EmptyTitle>
                  Activity Log Error
                </EmptyTitle>
                <EmptyDescription>
                  {error}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  className="h-10 px-5 text-xs font-semibold rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Retry Loading
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex-[1_0_auto] min-h-[320px] flex flex-col items-center justify-center p-6 border-t border-border dark:border-border rounded-b-2xl">
            <Empty>
              <EmptyHeader>
                <EmptyMedia>{hasActiveFilters ? <EmptySearch01Icon size="1em" /> : <EmptyClock01Icon size="1em" />}</EmptyMedia>
                <EmptyTitle>
                  {hasActiveFilters ? "No Activity Found" : "No Activity Recorded Yet"}
                </EmptyTitle>
                <EmptyDescription>
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
                    className="h-10 px-5 text-xs font-semibold rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
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
              "flex flex-[1_0_auto] flex-col gap-6 px-6 py-5 border-t border-border dark:border-border bg-white dark:bg-card transition-all duration-slow",
              loading ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
            )}
          >
            {groupedRows.map((group) => (
              <div key={group.key} className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    {group.key}
                  </span>
                  <span className="text-[11px] font-medium text-gray-400 dark:text-zinc-500 tabular-nums">
                    {group.items.length} {group.items.length === 1 ? "event" : "events"}
                  </span>
                </div>

                <div className="rounded-2xl border border-border bg-white dark:bg-card overflow-hidden shadow-2xs divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                  {group.items.map((log) => {
                    const visuals = getActivityVisual(log);
                    const ActionIcon = visuals.Icon;
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
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base transition-transform group-hover:scale-105 shadow-2xs",
                              visuals.avatarClass
                            )}
                          >
                            <ActionIcon size={18} aria-hidden="true" />
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
                                  "px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border select-none shrink-0",
                                  visuals.chipClass
                                )}
                              >
                                {visuals.label}
                              </span>
                            </div>

                            <p
                              className="text-xs text-gray-600 dark:text-zinc-400 mt-0.5 line-clamp-2 leading-relaxed break-words font-normal"
                              title={formatLogDetails(log.details) || "No known description"}
                            >
                              {renderFormattedDetails(log.details, handleSearchSimilar)}
                            </p>

                            <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400 dark:text-zinc-500 tabular-nums">
                              <span>{formatNotificationTimeAgo(log.created_at || log.time)}</span>
                              {log.ip && (
                                <>
                                  <span>·</span>
                                  <span className="font-sans tabular-nums">{log.ip}</span>
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
                                <ViewIcon size="1em" className="text-[16px]" />
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
        {!error && (
          <TablePagination
            label="My activity pages"
            page={displayPage}
            pageSize={perPage}
            totalCount={total}
            displayedCount={rows.length}
            onPageChange={setPage}
            onPageSizeChange={setPerPage}
            loading={loading}
          />
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
      </Card>
    </TooltipProvider>
  );
}
