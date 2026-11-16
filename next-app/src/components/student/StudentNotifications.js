"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircleIcon,
  Cancel01Icon,
  Clock01Icon,
  File02Icon,
  Mail01Icon,
  MailOpen01Icon,
  Notification01Icon,
  NotificationOff01Icon,
  Search01Icon,
  Tick01Icon,
  TickDouble01Icon,
} from "hugeicons-react";
import { authFetch } from "@/lib/clientAuth";
import { cn, formatLogDetails, formatTitleCase } from "@/lib/utils";
import { COMPACT_BADGE_BASE } from "@/lib/badgeStyles";
import {
  formatNotificationTimeAgo,
  formatPHDateTime,
  getNotificationDateGroup,
  isInManilaDateRange,
} from "@/lib/timeFormat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/tabs";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import DataViewToolbar from "@/components/shared/DataViewToolbar";
import DashboardSearch from "@/components/shared/DashboardSearch";
import {
  ActiveFilterChips as TableActiveFilterChips,
  FilterPopover,
  GroupPopover,
  SortPopover,
} from "@/components/systemadmin/OfficeTableControls";
import { DateRangeFilterButton } from "@/components/shared/DateRangePickerModal";
import DataGroupHeader from "@/components/shared/DataGroupHeader";
import TablePagination from "@/components/shared/TablePagination";
import NarrativeText from "@/components/shared/NarrativeText";
import NotificationsListSkeleton from "@/components/staff/skeletons/NotificationsListSkeleton";

const EVENT_FALLBACK_DESCRIPTIONS = {
  request_submitted: "Your document request has been received and queued for Registrar review.",
  request_processing: "The Registrar is currently preparing and processing your requested document.",
  request_action_required: "Action is required on your document request. Open the request to review the Registrar's note.",
  request_receipt_received: "Your payment proof was received and queued for Registrar verification.",
  request_payment: "Payment proof is required before the Registrar can continue processing your request.",
  request_pickup_deadline: "Your pickup deadline is approaching. Claim your document at the Registrar's Office soon.",
  checklist_missing: "A required admission or clearance document needs your attention.",
  request_ready: "Your requested document is ready for pickup. Open the request for claiming instructions.",
  request_inquiry_response: "The Registrar has posted a response to your missing documents inquiry.",
  request_completed: "Your document request has been marked as completed and released.",
  request_cancelled: "This document request has been cancelled. Open the request to view the reason.",
  request_reopened: "Your document request has been reopened for further processing.",
  request_disposed: "The unclaimed document is no longer available for pickup.",
  request_pickup_updated: "Pickup instructions for your document request have been updated.",
  request_update: "The Registrar posted a new update on your document request.",
  osas_bylaws_received: "Your organization's Constitution & By-Laws submission has been received.",
  osas_bylaws_revision: "Revisions were requested for your Constitution & By-Laws submission.",
  osas_bylaws_decision: "A decision has been posted on your Constitution & By-Laws submission.",
  osas_received: "Your organization's event proposal submission has been received.",
  osas_revision_received: "Your revised event proposal has been received for OSAS review.",
  osas_review: "Your event proposal is currently under review by OSAS.",
  osas_revision: "OSAS requested revisions on your event proposal. Open it to view reviewer notes.",
  osas_decision: "A decision has been posted on your event proposal.",
  osas_report_due: "Your post-event narrative and liquidation report is due soon.",
  osas_report_update: "Your post-event report status or details have been updated.",
  osas_report_action: "Your post-event report requires your attention before it can be finalized.",
  osas_report_decision: "A final decision has been posted on your post-event report.",
};

function getStudentNotificationVisuals(eventKey = "") {
  const key = String(eventKey || "");

  if (key === "request_ready" || key === "request_completed") {
    return {
      Icon: Tick01Icon,
      avatarClass:
        "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60",
      category: "Document Request",
    };
  }

  if (key === "request_cancelled" || key === "request_disposed") {
    return {
      Icon: Cancel01Icon,
      avatarClass:
        "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/70 dark:border-rose-800/60",
      category: "Document Request",
    };
  }

  if (
    key === "request_action_required" ||
    key === "request_payment" ||
    key === "request_pickup_deadline" ||
    key === "checklist_missing"
  ) {
    return {
      Icon: AlertCircleIcon,
      avatarClass:
        "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/60",
      category: key === "checklist_missing" ? "Compliance" : "Document Request",
    };
  }

  if (key.startsWith("request_")) {
    return {
      Icon: File02Icon,
      avatarClass:
        "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-200/70 dark:border-sky-800/60",
      category: "Document Request",
    };
  }

  if (key === "osas_decision" || key === "osas_bylaws_decision" || key === "osas_report_decision") {
    return {
      Icon: Tick01Icon,
      avatarClass:
        "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60",
      category: key.includes("report") ? "Post-Event Report" : "Organization",
    };
  }

  if (
    key === "osas_revision" ||
    key === "osas_bylaws_revision" ||
    key === "osas_report_due" ||
    key === "osas_report_action"
  ) {
    return {
      Icon: Clock01Icon,
      avatarClass:
        "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/60",
      category: key.includes("report") ? "Post-Event Report" : "Organization",
    };
  }

  if (key.startsWith("osas_")) {
    return {
      Icon: File02Icon,
      avatarClass:
        "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200/70 dark:border-purple-800/60",
      category: key.includes("report") ? "Post-Event Report" : "Organization",
    };
  }

  return {
    Icon: Notification01Icon,
    avatarClass:
      "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700",
    category: "System Update",
  };
}

function getStudentNotificationDescription(item) {
  const detail = String(item?.detail || "").trim();
  const refLabel = item?.reference ? `"${item.reference}"` : "your request";
  if (detail) {
    return item?.reference && !detail.includes(item.reference)
      ? `${detail} (${item.reference})`
      : detail;
  }

  const refTemplates = {
    request_submitted: `Document request ${refLabel} has been received and queued for Registrar review.`,
    request_processing: `The Registrar is currently preparing and processing ${refLabel}.`,
    request_action_required: `Action is required on ${refLabel}. Open to review the Registrar's note.`,
    request_receipt_received: `Payment proof for ${refLabel} was received and queued for Registrar verification.`,
    request_payment: `Payment proof is required for ${refLabel} before the Registrar can continue processing.`,
    request_pickup_deadline: `The pickup deadline for ${refLabel} is approaching. Claim your document at the Registrar's Office.`,
    checklist_missing: `A required admission or clearance document needs your attention (${refLabel}).`,
    request_ready: `${refLabel} is now "Ready for Pickup". Open to view claiming instructions.`,
    request_inquiry_response: `The Registrar posted a response to your missing documents inquiry (${refLabel}).`,
    request_completed: `${refLabel} has been marked as "Completed" and released.`,
    request_cancelled: `${refLabel} has been "Cancelled". Open to view the cancellation reason.`,
    request_reopened: `${refLabel} has been reopened for further processing.`,
    request_disposed: `The unclaimed document for ${refLabel} is no longer available for pickup.`,
    request_pickup_updated: `Pickup instructions for ${refLabel} have been updated.`,
    request_update: `The Registrar posted a new update on ${refLabel}.`,
  };

  if (refTemplates[item?.event_key]) {
    return refTemplates[item.event_key];
  }

  const fallback = EVENT_FALLBACK_DESCRIPTIONS[item?.event_key];
  if (fallback) {
    return item?.reference ? `${fallback} (${item.reference})` : fallback;
  }
  return item?.reference
    ? `Update posted for ${refLabel}. Open to view full details.`
    : "Open this notification to view the latest workflow details.";
}

export default function StudentNotifications({ onUnreadChange }) {
  const [inbox, setInbox] = useState(null);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  // Tabs: Unread / Read (aligned with Staff NotificationsTab)
  const [activeTab, setActiveTab] = useState("unread");

  // Search, Filters, Sort, Group, Date Range
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRules, setFilterRules] = useState([]);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [groupBy, setGroupBy] = useState("date");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const load = useCallback(async (signal) => {
    const response = await authFetch("/api/student/notifications?limit=100", {
      signal,
      cache: "no-store",
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      throw new Error(
        response.status === 401
          ? "Sign in again to view notifications."
          : result?.error || "Could not load notifications."
      );
    }
    return result.data;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal)
      .then((data) => {
        setInbox(data);
        setError(null);
        onUnreadChange?.(data.unread);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) {
          setError(failure.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsRefreshing(false);
        }
      });
    return () => controller.abort();
  }, [load, onUnreadChange, reload]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setError(null);
    setReload((current) => current + 1);
  }, []);

  const toggleReadState = useCallback(
    async ({ id = null, all = false, unread = false }) => {
      if (all) setMarkingAll(true);
      try {
        const response = await authFetch("/api/student/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(all ? { all: true, unread } : { id, unread }),
          keepalive: true,
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.ok) {
          throw new Error(result?.error || "Could not update notification status.");
        }
        const nextUnread = Number(result.data?.unread ?? 0);
        const nextRead = Number(result.data?.read ?? 0);
        const readAt = unread ? null : new Date().toISOString();
        setInbox((current) =>
          current
            ? {
                ...current,
                unread: nextUnread,
                read: nextRead,
                items: current.items.map((item) =>
                  all || item.id === id ? { ...item, read_at: readAt } : item
                ),
              }
            : current
        );
        onUnreadChange?.(nextUnread);
        setError(null);
      } catch (failure) {
        setError(failure.message || "Could not update notification status.");
      } finally {
        if (all) setMarkingAll(false);
      }
    },
    [onUnreadChange]
  );

  const filterFields = useMemo(
    () => [
      {
        key: "category",
        label: "Category",
        options: [
          { value: "Document Request", label: "Document Requests", indicatorColor: "bg-sky-500" },
          { value: "Organization", label: "Organizations", indicatorColor: "bg-purple-500" },
          { value: "Post-Event Report", label: "Post-Event Reports", indicatorColor: "bg-amber-500" },
          { value: "Compliance", label: "Compliance", indicatorColor: "bg-emerald-500" },
          { value: "System Update", label: "System Updates", indicatorColor: "bg-slate-500" },
        ],
      },
    ],
    []
  );

  const sortOptions = useMemo(
    () => [
      { key: "created_at", value: "created_at", label: "Date & Time" },
      { key: "title", value: "title", label: "Title" },
      { key: "category", value: "category", label: "Category" },
    ],
    []
  );

  const groupOptions = useMemo(
    () => [
      { key: "date", value: "date", label: "Date" },
      { key: "category", value: "category", label: "Category" },
      { key: "none", value: "none", label: "No grouping" },
    ],
    []
  );

  const items = useMemo(() => inbox?.items ?? [], [inbox]);
  const unreadCount = Number(inbox?.unread ?? 0);
  const readCount = Number(inbox?.read ?? items.filter((item) => Boolean(item.read_at)).length);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const includeCategories = filterRules
      .filter((r) => r.fieldKey === "category" && r.operator !== "is_not")
      .map((r) => r.value);
    const excludeCategories = filterRules
      .filter((r) => r.fieldKey === "category" && r.operator === "is_not")
      .map((r) => r.value);

    const next = items.filter((item) => {
      if (activeTab === "unread" && item.read_at) return false;
      if (activeTab === "read" && !item.read_at) return false;

      const visuals = getStudentNotificationVisuals(item.event_key);
      if (includeCategories.length > 0 && !includeCategories.includes(visuals.category)) {
        return false;
      }
      if (excludeCategories.includes(visuals.category)) {
        return false;
      }

      if ((startDate || endDate) && !isInManilaDateRange(item.created_at, startDate, endDate)) {
        return false;
      }

      if (!query) return true;
      const description = getStudentNotificationDescription(item);
      return [item.title, description, item.reference, visuals.category]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(query));
    });

    next.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "title") {
        comparison = String(a.title || "").localeCompare(String(b.title || ""));
      } else if (sortBy === "category") {
        comparison = getStudentNotificationVisuals(a.event_key).category.localeCompare(
          getStudentNotificationVisuals(b.event_key).category
        );
      } else {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortOrder === "ASC" ? comparison : -comparison;
    });

    return next;
  }, [items, activeTab, searchQuery, filterRules, startDate, endDate, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage) || 1);
  const displayPage = Math.min(page, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (displayPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, displayPage, itemsPerPage]);

  const groupedItems = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "ALL", label: null, items: paginatedItems }];
    }
    if (groupBy === "category") {
      const map = new Map();
      paginatedItems.forEach((item) => {
        const key = getStudentNotificationVisuals(item.event_key).category || "General";
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(item);
      });
      return Array.from(map.entries()).map(([label, groupItems]) => ({
        key: label,
        label,
        items: groupItems,
      }));
    }

    const groups = {
      TODAY: [],
      YESTERDAY: [],
      "THIS WEEK": [],
      EARLIER: [],
    };
    paginatedItems.forEach((item) => {
      const bucket = getNotificationDateGroup(item.created_at);
      if (groups[bucket]) {
        groups[bucket].push(item);
      } else {
        groups.EARLIER.push(item);
      }
    });

    return [
      { key: "TODAY", label: "Today", items: groups.TODAY },
      { key: "YESTERDAY", label: "Yesterday", items: groups.YESTERDAY },
      { key: "THIS WEEK", label: "This Week", items: groups["THIS WEEK"] },
      { key: "EARLIER", label: "Earlier", items: groups.EARLIER },
    ].filter((g) => g.items.length > 0);
  }, [paginatedItems, groupBy]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setFilterRules([]);
    setStartDate("");
    setEndDate("");
    setPage(1);
  }, []);

  const activeChips = useMemo(() => {
    const chips = [];
    if (searchQuery.trim()) {
      chips.push({
        id: "search",
        label: `Search: ${searchQuery.trim()}`,
        onRemove: () => {
          setSearchQuery("");
          setPage(1);
        },
      });
    }
    filterRules.forEach((rule) => {
      const field = filterFields.find((f) => f.key === rule.fieldKey);
      chips.push({
        id: rule.id,
        label: `${field?.label || rule.fieldKey}: ${rule.operator === "is_not" ? "not " : ""}${rule.value}`,
        onRemove: () => {
          setFilterRules((prev) => prev.filter((r) => r.id !== rule.id));
          setPage(1);
        },
      });
    });
    if (startDate || endDate) {
      chips.push({
        id: "date-range",
        label: `Date: ${startDate || "Any"} to ${endDate || "Any"}`,
        onRemove: () => {
          setStartDate("");
          setEndDate("");
          setPage(1);
        },
      });
    }
    return chips;
  }, [searchQuery, filterRules, filterFields, startDate, endDate]);

  const hasActiveFilters = Boolean(searchQuery.trim() || filterRules.length > 0 || startDate || endDate);
  const isInitialLoading = !inbox && !error;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="font-jakarta w-full flex flex-[1_0_auto] flex-col h-auto gap-6 focus:outline-none animate-fade-up">
        <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
          {/* 1. Page Header */}
          <PageHeader
            icon="Notification01Icon"
            title={
              <span className="flex items-center gap-2">
                <span>Notifications</span>
                <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">
                  {unreadCount > 0 ? `${unreadCount.toLocaleString()} unread` : "All caught up"}
                </span>
              </span>
            }
            description="Updates on your document requests, organization submissions, and compliance."
            showBorder={false}
            className="p-6"
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
            actions={
              <div className="flex items-center gap-2">
                <RefreshButton
                  onRefresh={handleRefresh}
                  isLoading={isRefreshing}
                  title="Refresh notifications"
                />
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={unreadCount <= 0 || markingAll}
                    onClick={() => toggleReadState({ all: true, unread: false })}
                    className="h-9 shrink-0 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-40"
                  >
                    Mark all as read
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={readCount <= 0 || markingAll}
                    onClick={() => toggleReadState({ all: true, unread: true })}
                    className="h-9 shrink-0 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-40"
                  >
                    Mark all as unread
                  </Button>
                </div>
              </div>
            }
          />

          {/* 2. Connected Row: Unread / Read Tabs */}
          <div className="p-4 sm:px-5 sm:py-3 bg-white dark:bg-card">
            <SegmentedControl
              value={activeTab}
              onValueChange={(value) => {
                setActiveTab(value);
                setPage(1);
              }}
              variant="capsule"
              className="inline-grid grid-flow-col auto-cols-fr shrink-0"
              items={[
                {
                  value: "unread",
                  label: "Unread",
                  badge: unreadCount,
                },
                {
                  value: "read",
                  label: "Read",
                  badge: readCount,
                },
              ]}
            />
          </div>

          {/* 3. Canonical 2-Zone DataViewToolbar */}
          <DataViewToolbar
            label="Notifications search and controls"
            className="border-t border-border dark:border-border p-4 sm:px-5 sm:py-3 gap-2 bg-white dark:bg-card flex flex-wrap items-center justify-between select-none"
          >
            <div className="flex min-w-0 items-center gap-2 z-10">
              <DashboardSearch
                value={searchQuery}
                onChange={(value) => {
                  setSearchQuery(value);
                  setPage(1);
                }}
                count={filteredItems.length}
                loading={isInitialLoading || isRefreshing}
                placeholder="Search notifications or request #"
                label="Search notifications"
              />
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <FilterPopover
                fields={filterFields}
                filters={filterRules}
                onFiltersChange={(rules) => {
                  setFilterRules(rules);
                  setPage(1);
                }}
                entityLabel="notifications"
              />
              <SortPopover
                options={sortOptions}
                sortBy={sortBy}
                onSortByChange={(value) => {
                  setSortBy(value);
                  setPage(1);
                }}
                sortOrder={sortOrder}
                onSortOrderChange={(value) => {
                  setSortOrder(value);
                  setPage(1);
                }}
              />
              <GroupPopover
                options={groupOptions}
                groupBy={groupBy}
                onGroupByChange={(value) => {
                  setGroupBy(value);
                  setPage(1);
                }}
              />
              <DateRangeFilterButton
                startDate={startDate}
                endDate={endDate}
                onApply={({ startDate: s, endDate: e }) => {
                  setStartDate(s);
                  setEndDate(e);
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

          {/* 4. Active Filter Chips */}
          {activeChips.length > 0 && (
            <TableActiveFilterChips
              chips={activeChips}
              onClearAll={handleClearFilters}
              className="border-t border-border dark:border-border px-6 py-2.5 bg-white dark:bg-card"
            />
          )}

          {error && items.length > 0 && (
            <p role="alert" className="border-t border-border px-6 py-2 text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          {/* 5. Grouped Notification Feed / Skeletons / Error / Empty State */}
          {isInitialLoading ? (
            <div className="flex-[1_0_auto] flex flex-col border-t border-border dark:border-border">
              <NotificationsListSkeleton groupCount={2} itemsPerGroup={3} flush />
            </div>
          ) : error && items.length === 0 ? (
            <div className="flex-[1_0_auto] flex flex-col items-center justify-center p-6 border-t border-border dark:border-border rounded-b-2xl">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia className="text-red-600 dark:text-red-400">
                    <AlertCircleIcon size="1em" />
                  </EmptyMedia>
                  <EmptyTitle>Could not load notifications</EmptyTitle>
                  <EmptyDescription>{error}</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setError(null);
                      setReload((current) => current + 1);
                    }}
                    className="h-9 px-4 text-xs font-semibold rounded-xl"
                  >
                    Try again
                  </Button>
                </EmptyContent>
              </Empty>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] border-t border-border dark:border-border w-full">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia>
                    {hasActiveFilters ? (
                      <Search01Icon size="1em" />
                    ) : activeTab === "unread" ? (
                      <TickDouble01Icon size="1em" />
                    ) : (
                      <NotificationOff01Icon size="1em" />
                    )}
                  </EmptyMedia>
                  <EmptyTitle>
                    {hasActiveFilters
                      ? "No matching notifications"
                      : activeTab === "unread"
                      ? "You're all caught up"
                      : "No read notifications"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {hasActiveFilters
                      ? "No notifications match your current search or filter criteria. Try clearing filters."
                      : activeTab === "unread"
                      ? "There are no unread notifications waiting for your review."
                      : "Notifications that you have already reviewed will appear here for reference."}
                  </EmptyDescription>
                </EmptyHeader>
                {hasActiveFilters && (
                  <EmptyContent>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearFilters}
                      className="h-9 px-4 text-xs font-semibold rounded-xl"
                    >
                      Reset filters
                    </Button>
                  </EmptyContent>
                )}
              </Empty>
            </div>
          ) : (
            <div className="flex flex-[1_0_auto] flex-col border-t border-border w-full">
              {groupedItems.map((group) => (
                <div key={group.key} className="border-b border-border last:border-b-0">
                  {group.label && <DataGroupHeader label={group.label} count={group.items.length} />}
                  <ul className="divide-y divide-border/60">
                    {group.items.map((item) => {
                      const visuals = getStudentNotificationVisuals(item.event_key);
                      const StatusIcon = visuals.Icon;
                      const isUnread = !item.read_at;
                      const timeAgo = formatNotificationTimeAgo(item.created_at);
                      const formattedTitle = formatTitleCase(formatLogDetails(item.title));
                      const description = getStudentNotificationDescription(item);
                      const highlightedPhrases = item.reference ? [item.reference] : undefined;

                      return (
                        <li key={item.id}>
                          <Link
                            href={item.target_path || "/student"}
                            onClick={() => {
                              if (isUnread) void toggleReadState({ id: item.id, unread: false });
                            }}
                            className={cn(
                              "group flex items-center justify-between gap-4 px-5 py-4 transition-all duration-normal cursor-pointer select-none sm:px-6",
                              "hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 active:scale-[0.998]",
                              isUnread && "bg-amber-50/20 dark:bg-amber-950/10"
                            )}
                          >
                            {/* Left: Icon Badge & Content */}
                            <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                              <div
                                aria-hidden="true"
                                className={cn(
                                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-105",
                                  visuals.avatarClass
                                )}
                              >
                                <StatusIcon size={16} />
                              </div>

                              <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4
                                    className={cn(
                                      "text-[13px] leading-snug tracking-[-0.01em] truncate",
                                      isUnread
                                        ? "font-bold text-gray-900 dark:text-zinc-50"
                                        : "font-semibold text-gray-700 dark:text-zinc-300"
                                    )}
                                    title={formattedTitle}
                                  >
                                    {isUnread && <span className="sr-only">Unread. </span>}
                                    {formattedTitle}
                                  </h4>
                                  {isUnread && (
                                    <span
                                      className={cn(
                                        COMPACT_BADGE_BASE,
                                        "bg-pup-maroon/10 text-pup-maroon dark:bg-red-400/10 dark:text-red-400"
                                      )}
                                    >
                                      New
                                    </span>
                                  )}
                                </div>

                                <p
                                  className="text-xs text-muted-foreground mt-0.5 line-clamp-2 break-words font-normal"
                                  title={description}
                                >
                                  <NarrativeText
                                    text={description}
                                    mode="full"
                                    highlightedPhrases={highlightedPhrases}
                                  />
                                </p>

                                <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400 dark:text-zinc-500 flex-wrap">
                                  <span className="font-medium text-gray-600 dark:text-zinc-400">
                                    {visuals.category}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <time
                                    dateTime={item.created_at}
                                    title={formatPHDateTime(item.created_at)}
                                    className="tabular-nums"
                                  >
                                    {timeAgo}
                                  </time>
                                  {item.reference && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="font-medium text-gray-500 dark:text-zinc-400 tabular-nums">
                                        {item.reference}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: Quick Read/Unread Envelope Toggle */}
                            <div
                              className="shrink-0 flex items-center gap-2 pl-2"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            >
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    aria-label={isUnread ? "Mark as read" : "Mark as unread"}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      void toggleReadState({ id: item.id, unread: !isUnread });
                                    }}
                                    className={cn(
                                      "flex h-8 w-8 items-center justify-center rounded-lg transition-colors border-0 bg-transparent cursor-pointer active:scale-95",
                                      isUnread
                                        ? "text-pup-maroon dark:text-primary hover:bg-pup-maroon/10"
                                        : "text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                                    )}
                                  >
                                    {isUnread ? (
                                      <Mail01Icon size={16} aria-hidden="true" />
                                    ) : (
                                      <MailOpen01Icon size={16} aria-hidden="true" />
                                    )}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-zinc-900 text-white border-zinc-800">
                                  <p className="text-[10px] font-semibold">
                                    {isUnread ? "Mark as read" : "Mark as unread"}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* 6. Pagination Footer */}
          {filteredItems.length > 0 && (
            <TablePagination
              label="Notification pages"
              page={displayPage}
              pageSize={itemsPerPage}
              totalCount={filteredItems.length}
              displayedCount={paginatedItems.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setItemsPerPage(size);
                setPage(1);
              }}
              loading={isInitialLoading || isRefreshing}
            />
          )}
        </Card>
      </div>
    </TooltipProvider>
  );
}
