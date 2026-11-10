"use client";
import { BADGE_BASE } from "@/lib/badgeStyles";


import SheetPagination from "@/components/shared/SheetPagination";
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";
import useUrlPage from "@/hooks/useUrlPage";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";

import { cn, formatTitleCase } from "@/lib/utils";
import NarrativeText from "@/components/shared/NarrativeText";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/tabs";
import {
  formatPHDateTime,
  formatPHDateTimeParts,
  getNotificationDateGroup,
  formatNotificationTimeAgo,
} from "@/lib/timeFormat";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import ResilientPDFViewer from "@/components/shared/ResilientPDFViewer";
import PDFPreviewModal from "@/components/shared/PDFPreviewModal";
import DataViewToolbar from "@/components/shared/DataViewToolbar";
import DashboardSearch from "@/components/shared/DashboardSearch";
import {
  FilterPopover,
  SortPopover,
  GroupPopover,
  ActiveFilterChips as TableActiveFilterChips,
} from "@/components/systemadmin/OfficeTableControls";
import { DateRangeFilterButton } from "@/components/shared/DateRangePickerModal";
import MultiCriteriaFilter from "@/components/shared/MultiCriteriaFilter";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import TablePagination from "@/components/shared/TablePagination";
import NotificationsListSkeleton from "@/components/staff/skeletons/NotificationsListSkeleton";
import { AlertCircleIcon as EmptyAlertCircleIcon, NotificationOff01Icon as EmptyNotificationOff01Icon, Search01Icon as EmptySearch01Icon, TickDouble01Icon as EmptyTickDouble01Icon, Alert01Icon, Cancel01Icon, CovidInfoIcon, File02Icon, LinkSquare01Icon, Mail01Icon, TickDouble01Icon, Search01Icon } from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
/**
 * Returns icon, badge styling, and title accent for a notification type & status.
 */
function getNotificationVisuals(notif) {
  const type = notif.type || "system";
  const approvalStatus = notif.approval_status || notif.metadata?.approval_status || "";
  const requestStatus = notif.metadata?.status || "";

  if (type === "document_review") {
    if (approvalStatus === "Approved") {
      return {
        icon: "Tick01Icon",
        avatarClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60",
        label: "Approved",
        category: "Document Review",
      };
    }
    if (approvalStatus === "Declined") {
      return {
        icon: "Cancel01Icon",
        avatarClass: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/70 dark:border-rose-800/60",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60",
        label: "Declined",
        category: "Document Review",
      };
    }
    return {
      icon: "Clock01Icon",
      avatarClass: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/60",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60",
      label: "Pending Review",
      category: "Document Review",
    };
  }

  if (type === "document_request") {
    let badgeClass = "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800/60";
    if (requestStatus === "Completed" || requestStatus === "Ready") {
      badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60";
    } else if (requestStatus === "Cancelled" || requestStatus === "Deficient") {
      badgeClass = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60";
    }

    return {
      icon: "File02Icon",
      avatarClass: "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-200/70 dark:border-sky-800/60",
      badgeClass,
      label: requestStatus || "Request",
      category: "Document Request",
    };
  }

  if (type === "scan_upload") {
    return {
      icon: "FingerPrintScanIcon",
      avatarClass: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/60",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60",
      label: "Uploaded",
      category: "Ingestion",
    };
  }

  if (type === "student_record") {
    return {
      icon: "UserIcon",
      avatarClass: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200/70 dark:border-purple-800/60",
      badgeClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/60",
      label: "Student",
      category: "Records",
    };
  }

  return {
    icon: "Notification01Icon",
    avatarClass: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    label: notif.severity || "System",
    category: "System Alert",
  };
}

/**
 * Standard Information Row for side sheet.
 */
function InfoRow({ icon, label, value, children, className }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[135px_12px_1fr] sm:grid-cols-[150px_14px_1fr] items-start gap-1 text-xs py-1.5 border-b border-gray-100/70 dark:border-zinc-800/50 last:border-0",
        className
      )}
    >
      <div className="text-gray-500 dark:text-zinc-400 font-medium flex items-center gap-2 truncate">
        {icon && <AppIcon className={cn("text-gray-400 dark:text-zinc-500 text-sm shrink-0", icon)} />}
        <span className="truncate">{label}</span>
      </div>
      <span className="text-gray-300 dark:text-zinc-600 select-none">:</span>
      <div className="text-gray-900 dark:text-zinc-100 font-semibold break-words min-w-0">
        {children ?? (value || <span className="text-gray-400 font-normal italic">None</span>)}
      </div>
    </div>
  );
}

export default function NotificationsTab({
  onUnreadChange,
  onRescan,
  onPreviewDocument,
  onNavigateTab,
  isLoading: propLoading,
}) {
  const onUnreadChangeRef = useRef(onUnreadChange);
  const loadRequestRef = useRef(0);
  useEffect(() => {
    onUnreadChangeRef.current = onUnreadChange;
  }, [onUnreadChange]);

  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [readCount, setReadCount] = useState(0);

  // Tabs: ONLY "unread" and "read"
  const [activeTab, setActiveTab] = useState("unread");

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilters, setTypeFilters] = useState([]);
  const [decisionFilters, setDecisionFilters] = useState([]);
  const [filterRules, setFilterRules] = useState([]);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [groupBy, setGroupBy] = useState("date");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination
  const [page, setPage] = useUrlPage();
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Side Sheet Details state
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [notifFrameStatus, setNotifFrameStatus] = useState("loading");
  const [pdfPreview, setPdfPreview] = useState(null);

  const isLoading = propLoading || initialLoading;

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeFilters, decisionFilters, filterRules, activeTab, sortBy, sortOrder, startDate, endDate, setPage]);

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage) || 1);
  const displayPage = Math.min(page, totalPages);
  const offset = (displayPage - 1) * itemsPerPage;

  // Main fetch function
  const load = useCallback(
    async (showRefreshing = false) => {
      const request = ++loadRequestRef.current;
      if (showRefreshing) setIsRefreshing(true);
      setError("");
      try {
        const qs = new URLSearchParams();
        qs.set("limit", String(itemsPerPage));
        qs.set("offset", String(offset));
        qs.set("tab", activeTab);
        qs.set("sortBy", sortBy);
        qs.set("sortOrder", sortOrder);
        if (debouncedSearch) qs.set("search", debouncedSearch);
        const effectiveTypes = [
          ...typeFilters,
          ...filterRules.filter((r) => r.fieldKey === "type" && r.operator !== "is_not").map((r) => r.value),
        ];
        if (effectiveTypes.length > 0) qs.set("type", effectiveTypes.join(","));
        const effectiveDecisions = [
          ...decisionFilters,
          ...filterRules.filter((r) => r.fieldKey === "decision" && r.operator !== "is_not").map((r) => r.value),
        ];
        if (effectiveDecisions.length > 0) qs.set("decision", effectiveDecisions.join(","));
        if (startDate) qs.set("startDate", startDate);
        if (endDate) qs.set("endDate", endDate);

        const [res] = await Promise.all([
          fetch(`/api/notifications?${qs.toString()}`, { cache: "no-store" }),
          showRefreshing ? new Promise((resolve) => setTimeout(resolve, 500)) : Promise.resolve(),
        ]);
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Failed to load notifications");
        }
        if (request !== loadRequestRef.current) return;
        const data = json.data || {};
        const nextItems = Array.isArray(data.items) ? data.items : [];
        setItems(nextItems);
        setTotal(Number(data.total || 0));
        setUnreadCount(Number(data.unreadCount || 0));
        setReadCount(Number(data.readCount || 0));
        onUnreadChangeRef.current?.(Number(data.unreadCount || 0));
      } catch (e) {
        if (request !== loadRequestRef.current) return;
        setError(e?.message || "Failed to load notifications");
      } finally {
        if (request === loadRequestRef.current) {
          setInitialLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [offset, itemsPerPage, activeTab, debouncedSearch, typeFilters, decisionFilters, filterRules, sortBy, sortOrder, startDate, endDate]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Periodic polling & visibility wakeup
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 25000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [load]);

  const handleRefresh = async () => {
    await load(true);
  };

  // Mark specific notification read or unread
  const toggleReadState = useCallback(async (id, markAsRead) => {
    try {
      const action = markAsRead ? "markRead" : "markUnread";
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: [id] }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to update notification state");
      }

      // Optimistically update item read state in UI
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_read: markAsRead } : item))
      );
      if (selectedNotif && selectedNotif.id === id) {
        setSelectedNotif((prev) => (prev ? { ...prev, is_read: markAsRead } : null));
      }
      setUnreadCount(Number(json?.data?.unreadCount || 0));
      setReadCount(Number(json?.data?.readCount || 0));
      onUnreadChangeRef.current?.(Number(json?.data?.unreadCount || 0));

      // In unread/read tab views, refresh list so item relocates cleanly
      await load();
    } catch (e) {
      setError(e?.message || "Failed to update notification");
    }
  }, [selectedNotif, load]);

  // Mark all read
  const markAllRead = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllRead" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to mark all as read");
      const nextUnread = Number(json?.data?.unreadCount || 0);
      const nextRead = Number(json?.data?.readCount || 0);
      setUnreadCount(nextUnread);
      setReadCount(nextRead);
      onUnreadChangeRef.current?.(nextUnread);
      await load();
    } catch {
      // silent
    }
  }, [load]);

  // Mark all unread
  const markAllUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllUnread" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to mark all as unread");
      const nextUnread = Number(json?.data?.unreadCount || 0);
      const nextRead = Number(json?.data?.readCount || 0);
      setUnreadCount(nextUnread);
      setReadCount(nextRead);
      onUnreadChangeRef.current?.(nextUnread);
      await load();
    } catch {
      // silent
    }
  }, [load]);

  // In-drawer navigation state & snapshot
  const [navItems, setNavItems] = useState([]);

  // Click row to view details in Sheet
  const handleOpenDetailSheet = useCallback(
    (notif, sourceList = items) => {
      setSelectedNotif(notif);
      setNavItems((prev) => (prev.length > 0 && sheetOpen ? prev : sourceList));
      setSheetOpen(true);
      setNotifFrameStatus("loading");

      // Automatically mark as read if it is unread
      if (!notif.is_read) {
        toggleReadState(notif.id, true);
      }
    },
    [items, sheetOpen, toggleReadState]
  );

  const activeNavList = navItems.length > 0 ? navItems : items;

  const selectedNotifIndex = useMemo(() => {
    if (!selectedNotif || !activeNavList || activeNavList.length === 0) return -1;
    return activeNavList.findIndex((item) => String(item.id) === String(selectedNotif.id));
  }, [selectedNotif, activeNavList]);

  const hasPrevNotif = selectedNotifIndex > 0;
  const hasNextNotif = selectedNotifIndex >= 0 && selectedNotifIndex < activeNavList.length - 1;

  const handlePrevNotif = useCallback(() => {
    if (selectedNotifIndex > 0) {
      const prev = activeNavList[selectedNotifIndex - 1];
      if (prev) handleOpenDetailSheet(prev, activeNavList);
    }
  }, [selectedNotifIndex, activeNavList, handleOpenDetailSheet]);

  const handleNextNotif = useCallback(() => {
    if (selectedNotifIndex >= 0 && selectedNotifIndex < activeNavList.length - 1) {
      const next = activeNavList[selectedNotifIndex + 1];
      if (next) handleOpenDetailSheet(next, activeNavList);
    }
  }, [selectedNotifIndex, activeNavList, handleOpenDetailSheet]);

  // Copy helper for identifiers
  const [copiedKey, setCopiedKey] = useState(null);
  const handleCopyText = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // Filter fields configuration for FilterPopover
  const filterFields = useMemo(
    () => [
      {
        key: "type",
        label: "Category",
        type: "select",
        options: [
          { value: "document_review", label: "Document Reviews" },
          { value: "document_request", label: "Document Requests" },
          { value: "scan_upload", label: "Uploads & Ingestion" },
          { value: "system", label: "System Alerts" },
        ],
      },
      {
        key: "decision",
        label: "Review Decision",
        type: "select",
        options: [
          { value: "Approved", label: "Approved" },
          { value: "Declined", label: "Declined" },
        ],
      },
    ],
    []
  );

  const sortOptions = useMemo(
    () => [
      { key: "created_at", value: "created_at", label: "Date & Time" },
      { key: "title", value: "title", label: "Title" },
      { key: "type", value: "type", label: "Category" },
    ],
    []
  );

  const groupOptions = useMemo(
    () => [
      { key: "date", value: "date", label: "Date" },
      { key: "type", value: "type", label: "Category" },
      { key: "decision", value: "decision", label: "Decision" },
      { key: "none", value: "none", label: "No grouping" },
    ],
    []
  );

  // Group items by selected grouping criteria
  const groupedItems = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "ALL", label: null, items }];
    }
    if (groupBy === "type") {
      const map = new Map();
      items.forEach((item) => {
        const visuals = getNotificationVisuals(item);
        const key = visuals.category || "General";
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(item);
      });
      return Array.from(map.entries()).map(([label, groupItems]) => ({
        key: label,
        label,
        items: groupItems,
      }));
    }
    if (groupBy === "decision") {
      const map = new Map();
      items.forEach((item) => {
        const d = item.approval_status || item.metadata?.approval_status || item.metadata?.status || "None";
        if (!map.has(d)) map.set(d, []);
        map.get(d).push(item);
      });
      return Array.from(map.entries()).map(([label, groupItems]) => ({
        key: label,
        label,
        items: groupItems,
      }));
    }

    // Default: date grouping
    const groups = {
      TODAY: [],
      YESTERDAY: [],
      "THIS WEEK": [],
      EARLIER: [],
    };

    items.forEach((item) => {
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
  }, [items, groupBy]);

  // Filters configuration
  const filterGroups = useMemo(
    () => [
      {
        id: "type",
        label: "Category",
        options: [
          { value: "document_review", label: "Document Reviews", indicatorColor: "bg-emerald-500" },
          { value: "document_request", label: "Document Requests", indicatorColor: "bg-sky-500" },
          { value: "scan_upload", label: "Uploads & Ingestion", indicatorColor: "bg-amber-500" },
          { value: "system", label: "System Alerts", indicatorColor: "bg-purple-500" },
        ],
      },
      {
        id: "decision",
        label: "Review Decision",
        options: [
          { value: "Approved", label: "Approved", indicatorColor: "bg-emerald-500" },
          { value: "Declined", label: "Declined", indicatorColor: "bg-rose-500" },
        ],
      },
    ],
    []
  );

  const filterValues = useMemo(
    () => ({
      type: typeFilters,
      decision: decisionFilters,
    }),
    [typeFilters, decisionFilters]
  );

  const handleFilterChange = useCallback((groupId, values) => {
    if (groupId === "type") setTypeFilters(values);
    else if (groupId === "decision") setDecisionFilters(values);
    setPage(1);
  }, [setPage]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setTypeFilters([]);
    setDecisionFilters([]);
    setFilterRules([]);
    setStartDate("");
    setEndDate("");
    setPage(1);
  }, [setPage]);

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
        onRemove: () => setFilterRules((prev) => prev.filter((r) => r.id !== rule.id)),
      });
    });
    typeFilters.forEach((t) => {
      const opt = filterFields[0]?.options.find((o) => o.value === t);
      chips.push({
        id: `type-${t}`,
        label: `Category: ${opt?.label || t}`,
        onRemove: () => {
          setTypeFilters((prev) => prev.filter((item) => item !== t));
          setPage(1);
        },
      });
    });
    decisionFilters.forEach((d) => {
      const opt = filterFields[1]?.options.find((o) => o.value === d);
      chips.push({
        id: `decision-${d}`,
        label: `Decision: ${opt?.label || d}`,
        onRemove: () => {
          setDecisionFilters((prev) => prev.filter((item) => item !== d));
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
  }, [searchQuery, filterRules, filterFields, typeFilters, decisionFilters, startDate, endDate, setPage]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() || typeFilters.length > 0 || decisionFilters.length > 0 || filterRules.length > 0 || startDate || endDate
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="font-jakarta w-full flex flex-[1_0_auto] flex-col h-auto gap-6 focus:outline-none animate-fade-up">
        {/* Main Card Container encapsulating Header, Toolbar, Feed & Pagination */}
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
            description="Real-time updates on document reviews, student requests, and system activity."
            showBorder={false}
            className="p-6"
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
            actions={
              <div className="flex items-center gap-2">
                <RefreshButton
                  onRefresh={handleRefresh}
                  isLoading={isRefreshing}
                  title="Refresh Notifications"
                />

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={unreadCount <= 0}
                    onClick={markAllRead}
                    className="h-9 shrink-0 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-40"
                  >
                    Mark All as Read
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={total <= 0}
                    onClick={markAllUnread}
                    className="h-9 shrink-0 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-40"
                  >
                    Mark All as Unread
                  </Button>
                </div>
              </div>
            }
          />

          {/* Connected Row: Read / Unread Tabs */}
          <div className="border-t border-border dark:border-border p-4 sm:px-5 sm:py-3 bg-white dark:bg-card">
            <SegmentedControl
              value={activeTab}
              onValueChange={setActiveTab}
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

          {/* Canonical 2-Zone DataViewToolbar */}
          <DataViewToolbar
            label="Notifications search and controls"
            className="border-t border-border dark:border-border p-4 sm:px-5 sm:py-3 gap-2 bg-white dark:bg-card flex flex-wrap items-center justify-between select-none"
          >
            {/* Left Zone: DashboardSearch */}
            <div className="flex min-w-0 items-center gap-2 z-10">
              <DashboardSearch
                value={searchQuery}
                onChange={(val) => setSearchQuery(val)}
                count={total}
                loading={isLoading}
                placeholder="Search notifications, student..."
                label="Search notifications"
              />
            </div>

            {/* Right Zone: Filter -> Sort -> Group -> DateRange */}
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <FilterPopover
                fields={filterFields}
                filters={filterRules}
                onFiltersChange={setFilterRules}
                entityLabel="notifications"
              />
              <SortPopover
                options={sortOptions}
                sortBy={sortBy}
                onSortByChange={setSortBy}
                sortOrder={sortOrder}
                onSortOrderChange={setSortOrder}
              />
              <GroupPopover
                options={groupOptions}
                groupBy={groupBy}
                onGroupByChange={setGroupBy}
              />
              <DateRangeFilterButton
                startDate={startDate}
                endDate={endDate}
                onApply={({ startDate: s, endDate: e }) => {
                  setStartDate(s);
                  setEndDate(e);
                }}
                onClear={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                disableFutureDates={true}
              />
            </div>
          </DataViewToolbar>

          {/* 3. Active Filter Chips */}
          {activeChips.length > 0 && (
            <TableActiveFilterChips
              chips={activeChips}
              onClearAll={handleClearFilters}
              className="border-t border-border dark:border-border px-6 py-2.5 bg-white dark:bg-card"
            />
          )}

          {/* 4. Grouped Notification List / Skeletons / Empty State */}
          {isLoading && !isRefreshing ? (
            <div className="flex-[1_0_auto] flex flex-col border-t border-border dark:border-border">
              <NotificationsListSkeleton groupCount={2} itemsPerGroup={3} />
            </div>
          ) : error ? (
            <div className="flex-[1_0_auto] flex flex-col items-center justify-center p-6 border-t border-border dark:border-border rounded-b-2xl">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia className="text-red-600 dark:text-red-400"><EmptyAlertCircleIcon size="1em" /></EmptyMedia>
                  <EmptyTitle>
                    Could not load notifications
                  </EmptyTitle>
                  <EmptyDescription>
                    {error}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] border-t border-border dark:border-border w-full">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia>{hasActiveFilters ? <EmptySearch01Icon size="1em" /> : activeTab === "unread" ? <EmptyTickDouble01Icon size="1em" /> : <EmptyNotificationOff01Icon size="1em" />}</EmptyMedia>
                  <EmptyTitle>
                    {hasActiveFilters
                      ? "No matching notifications"
                      : activeTab === "unread"
                      ? "You're all caught up!"
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
                      Reset Filters
                    </Button>
                  </EmptyContent>
                )}
              </Empty>
            </div>
          ) : (
            /* Time-Grouped Notification Feed */
            <div className="flex flex-[1_0_auto] flex-col gap-6 p-6 border-t border-border dark:border-border w-full">
              {groupedItems.map((group) => (
                <div key={group.key} className="space-y-2.5">
                  {/* Group Header matching user screenshot */}
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                      {group.key}
                    </span>
                    <span className="text-[11px] font-medium text-gray-400 dark:text-zinc-500">
                      {group.items.length} {group.items.length === 1 ? "notification" : "notifications"}
                    </span>
                  </div>

                  {/* Rounded Card Container containing notification rows */}
                  <div className="rounded-2xl border border-border/80 bg-white dark:bg-card overflow-hidden shadow-xs divide-y divide-border/60 dark:divide-border/60">
                    {group.items.map((n) => {
                      const visuals = getNotificationVisuals(n);
                      const isUnread = !n.is_read;
                      const timeAgo = formatNotificationTimeAgo(n.created_at);

                      return (
                        <div
                          key={n.id}
                          onClick={() => handleOpenDetailSheet(n)}
                          className={cn(
                            "group flex items-center justify-between gap-4 p-4 transition-all duration-normal cursor-pointer select-none",
                            "hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 active:scale-[0.998]",
                            isUnread && "bg-amber-50/20 dark:bg-amber-950/10"
                          )}
                        >
                          {/* Left: Icon Badge & Content */}
                          <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                            {/* Circular Avatar / Icon Badge */}
                            <div
                              className={cn(
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base transition-transform group-hover:scale-105",
                                visuals.avatarClass
                              )}
                            >
                              <AppIcon className={cn(" text-base", visuals.icon)} />
                            </div>

                            {/* Middle Text Details */}
                            <div className="flex flex-col min-w-0 flex-1">
                              {/* Title line */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4
                                  className={cn(
                                    "text-[13px] leading-snug tracking-[-0.01em] truncate",
                                    isUnread
                                      ? "font-semibold text-gray-900 dark:text-zinc-50"
                                      : "font-medium text-gray-700 dark:text-zinc-300"
                                  )}
                                  title={n.title}
                                >
                                  {n.title}
                                </h4>
                                {isUnread && (
                                  <span className={cn("inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-pup-maroon/10 text-pup-maroon dark:bg-red-400/10 dark:text-red-400", BADGE_BASE)}>
                                    New
                                  </span>
                                )}
                              </div>

                              {/* Message Snippet */}
                              <p
                                className="text-xs text-muted-foreground mt-0.5 line-clamp-1 break-words font-normal"
                                title={n.message}
                              >
                                <NarrativeText text={n.message} mode="compact" />
                              </p>

                              {/* Metadata line: Category / Office · Relative Time */}
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400 dark:text-zinc-500">
                                <span className="font-medium text-gray-600 dark:text-zinc-400">
                                  {visuals.category}
                                </span>
                                <span>·</span>
                                <span>{timeAgo}</span>
                                {n.actor_name && (
                                  <>
                                    <span>·</span>
                                    <span className="truncate max-w-[150px]">
                                      by {formatTitleCase(n.actor_name)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Quick Read/Unread Envelope Toggle */}
                          <div
                            className="shrink-0 flex items-center gap-2 pl-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => toggleReadState(n.id, !n.is_read)}
                                  className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-lg transition-colors border-0 bg-transparent cursor-pointer active:scale-95",
                                    isUnread
                                      ? "text-pup-maroon dark:text-primary hover:bg-pup-maroon/10"
                                      : "text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                                  )}
                                >
                                  <AppIcon
                                    className={cn(
                                      "text-[16px]",
                                      isUnread ? " Mail01Icon" : " MailOpen01Icon"
                                    )}
                                  />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-zinc-900 text-white border-zinc-800">
                                <p className="text-[10px] font-semibold">
                                  {isUnread ? "Mark as read" : "Mark as unread"}
                                </p>
                              </TooltipContent>
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

          {/* 5. Pagination Footer */}
          {!isLoading && !error && total > 0 && items.length > 0 && <TablePagination label="Notification pages" page={displayPage} pageSize={itemsPerPage} totalCount={total} displayedCount={items.length} onPageChange={setPage} onPageSizeChange={setItemsPerPage} loading={isLoading} />}
        </Card>

        {/* 6. Sliding Detail Sheet */}
        <Sheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setNavItems([]);
          }}
        >
          <SheetContent
            side="right"
            size="default"
            showCloseButton={false}
            className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full p-0 overflow-hidden focus:outline-none focus-visible:outline-none"
          >
            <SheetHeader className="shrink-0 p-0 border-b border-border bg-white dark:bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div>
                  <SheetTitle className="text-base font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-100">
                    Notification Details
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    Detailed notification event information and attached records.
                  </SheetDescription>
                </div>

                <div className="ml-auto flex items-center gap-3">
                  {activeNavList.length > 1 && selectedNotifIndex >= 0 && (
                    <SheetPagination
                      compact
                      label="Record navigation"
                      page={selectedNotifIndex + 1}
                      totalPages={activeNavList.length}
                      onPrevious={handlePrevNotif}
                      onNext={handleNextNotif}
                      previousDisabled={!hasPrevNotif}
                      nextDisabled={!hasNextNotif}
                      previousLabel="Previous Notification"
                      nextLabel="Next Notification"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => setSheetOpen(false)}
                    className="size-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/[0.04] dark:border-white/[0.08] shadow-2xs"
                    aria-label="Close"
                    title="Close"
                  >
                    <Cancel01Icon size="1em" className="text-sm" />
                  </button>
                </div>
              </div>
            </SheetHeader>

            {/* Scrollable Sheet Body - 1 Column Standard Layout */}
            {selectedNotif ? (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Event Summary Strip */}
                {(() => {
                  const ui = getNotificationVisuals(selectedNotif);
                  return (
                    <div className="flex items-center justify-between gap-3 pb-4 border-b border-border/80 dark:border-border">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "w-11 h-11 rounded-full flex items-center justify-center text-lg shrink-0 shadow-2xs",
                            ui.avatarClass
                          )}
                        >
                          <AppIcon className={cn("", ui.icon)} />
                        </div>
                        <div className="min-w-0">
                          <h2
                            className="text-sm font-bold text-gray-900 dark:text-zinc-50 truncate"
                            title={selectedNotif.title}
                          >
                            {selectedNotif.title || "Notification"}
                          </h2>
                          <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate mt-0.5">
                            {formatPHDateTime(selectedNotif.created_at)} • {formatNotificationTimeAgo(selectedNotif.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border", ui.badgeClass, BADGE_BASE)}
                        >
                          {ui.label}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* 1. Event Narrative / Message */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-border/80 dark:border-border">
                    <AppIcon className=" Message01Icon text-pup-maroon dark:text-red-400 text-sm" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                      Event Summary
                    </h3>
                  </div>
                  <div className="pt-2">
                    <p className="text-xs text-gray-700 dark:text-zinc-200 leading-relaxed font-medium">
                      <NarrativeText text={selectedNotif.message} mode="full" />
                    </p>

                    {/* Rejection Note Banner */}
                    {selectedNotif.approval_status === "Declined" && selectedNotif.review_note && (
                      <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 dark:border-rose-900/40 dark:bg-rose-950/25">
                        <div className="flex gap-2.5">
                          <Alert01Icon size="1em" className="text-rose-600 dark:text-rose-400 text-base shrink-0 mt-0.5" />
                          <div className="text-xs space-y-1">
                            <span className="font-bold text-rose-950 dark:text-rose-300 block tracking-wider text-[10px] uppercase">
                              Reviewer Rejection Reason
                            </span>
                            <p className="text-rose-900 dark:text-rose-200 leading-relaxed font-medium italic">
                              &ldquo;{selectedNotif.review_note}&rdquo;
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Structured Information Section (InfoRow label : value) */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-border/80 dark:border-border">
                    <CovidInfoIcon size="1em" className="text-pup-maroon dark:text-red-400 text-sm" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                      Notification Specification
                    </h3>
                  </div>
                  <div className="py-1">
                    {(() => {
                      const ui = getNotificationVisuals(selectedNotif);
                      return (
                        <>
                          <InfoRow icon=" Tag01Icon" label="Event Category">
                            <span className="font-semibold text-gray-900 dark:text-zinc-100">
                              {ui.category}
                            </span>
                          </InfoRow>

                          <InfoRow
                            icon=" Building01Icon"
                            label="Office Scope"
                            value={formatTitleCase(selectedNotif.office_id) || "University General"}
                          />

                          <InfoRow
                            icon="UserCircleIcon"
                            label="Triggered By"
                          >
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{formatTitleCase(selectedNotif.actor_name) || "System Automated"}</span>
                              {selectedNotif.actor_id && (
                                <span className="font-sans text-[10px] text-gray-400 dark:text-zinc-500 bg-gray-100 dark:bg-zinc-800 px-1 rounded tabular-nums">
                                  {selectedNotif.actor_id}
                                </span>
                              )}
                            </div>
                          </InfoRow>

                          <InfoRow
                            icon=" Calendar01Icon"
                            label="Timestamp"
                            value={formatPHDateTime(selectedNotif.created_at)}
                          />

                          <InfoRow icon=" Mail01Icon" label="Read Status">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold", selectedNotif.is_read
                                    ? "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300"
                                    : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50", BADGE_BASE)}
                              >
                                {selectedNotif.is_read ? "Read" : "Unread"}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleReadState(selectedNotif.id, !selectedNotif.is_read)}
                                className="text-[11px] text-gray-500 hover:text-pup-maroon dark:text-zinc-400 dark:hover:text-red-400 font-semibold underline cursor-pointer"
                              >
                                {selectedNotif.is_read ? "Mark Unread" : "Mark Read"}
                              </button>
                            </div>
                          </InfoRow>

                          {selectedNotif.student_no && (
                            <InfoRow icon=" Contact01Icon" label="Student Number">
                              <div className="flex items-center gap-2">
                                <span className="font-sans tabular-nums text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200">
                                  {selectedNotif.student_no}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(selectedNotif.student_no, "student_no")}
                                  className="text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                                  title="Copy Student Number"
                                >
                                  <AppIcon
                                    className={cn(
                                      "text-xs",
                                      copiedKey === "student_no"
                                        ? " Tick01Icon text-gray-600 dark:text-zinc-300"
                                        : " Copy01Icon"
                                    )}
                                  />
                                </button>
                              </div>
                            </InfoRow>
                          )}

                          {selectedNotif.student_name && (
                            <InfoRow
                              icon=" UserIcon"
                              label="Student Name"
                              value={formatTitleCase(selectedNotif.student_name)}
                            />
                          )}

                          {selectedNotif.doc_type && (
                            <InfoRow icon=" File01Icon" label="Document Category" value={selectedNotif.doc_type} />
                          )}

                          {selectedNotif.original_filename && (
                            <InfoRow icon=" Attachment01Icon" label="Original File">
                              <span
                                className="font-sans tabular-nums text-xs truncate block max-w-[240px]"
                                title={selectedNotif.original_filename}
                              >
                                {selectedNotif.original_filename}
                              </span>
                            </InfoRow>
                          )}

                          {selectedNotif.entity_type === "document_request" && (
                            <InfoRow icon=" LinkSquare01Icon" label="Related Request">
                              <div className="flex items-center gap-2">
                                <span className="font-sans tabular-nums text-xs font-semibold text-gray-700 dark:text-zinc-300">
                                  REQ-{selectedNotif.entity_id || selectedNotif.metadata?.request_id}
                                </span>
                                {onNavigateTab && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => {
                                      setSheetOpen(false);
                                      onNavigateTab("requests");
                                    }}
                                    className="h-6 px-2 text-[10px] font-semibold rounded-md border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 shadow-2xs active:scale-95 transition-all cursor-pointer"
                                  >
                                    View in Requests
                                  </Button>
                                )}
                              </div>
                            </InfoRow>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* 3. Document PDF Preview (if notification is a document or has linked document) */}
                {(selectedNotif.entity_type === "document" || selectedNotif.metadata?.document_id) && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between pb-1.5 border-b border-border/80 dark:border-border">
                      <div className="flex items-center gap-2">
                        <File02Icon size="1em" className="text-pup-maroon dark:text-red-400 text-sm" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                          Document Preview
                        </h3>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPdfPreview({
                          url: `/api/documents/${selectedNotif.entity_id || selectedNotif.metadata?.document_id}`,
                          title: selectedNotif.doc_type || "Document",
                          studentName: selectedNotif.student_name,
                        })}
                      >
                        {PDF_ACTION_LABELS.preview}
                      </Button>
                    </div>

                    <div className="pt-2">
                      <div className="rounded-xl border border-border overflow-hidden h-[340px] bg-white dark:bg-zinc-900 relative">
                        <ResilientPDFViewer
                          src={`/api/documents/${selectedNotif.entity_id || selectedNotif.metadata?.document_id}`}
                          docId={selectedNotif.entity_id || selectedNotif.metadata?.document_id}
                          preview={{
                            studentName: selectedNotif.student_name,
                            docType: selectedNotif.doc_type,
                          }}
                          className="w-full h-full border-0"
                          title="PDF Preview"
                          onStatusChange={setNotifFrameStatus}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Executive Action Bar Footer */}
            <SheetFooter className="shrink-0 p-4 px-6 border-t border-border flex flex-row items-center justify-between bg-white dark:bg-card">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSheetOpen(false)}
                className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Close
              </Button>

              <div className="flex items-center gap-2.5">
                {selectedNotif?.entity_type === "document_request" && onNavigateTab ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSheetOpen(false);
                      onNavigateTab("requests");
                    }}
                    className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    Open in Requests
                  </Button>
                ) : selectedNotif?.approval_status === "Declined" && onRescan ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setSheetOpen(false);
                      onRescan(
                        selectedNotif.student_no,
                        selectedNotif.doc_type,
                        selectedNotif.entity_id || selectedNotif.metadata?.document_id,
                        selectedNotif.original_filename,
                        selectedNotif.mime_type
                      );
                    }}
                    className="h-9 px-4 cursor-pointer"
                  >
                    Rescan Document
                  </Button>
                ) : null}

                {(selectedNotif?.entity_type === "document" || selectedNotif?.metadata?.document_id) && (
                  <Button
                    asChild
                    variant="default"
                    size="sm"
                    className="h-9 px-4 text-xs font-semibold rounded-xl shadow-xs active:scale-95 cursor-pointer"
                  >
                    <a
                      href={`/api/documents/${selectedNotif.entity_id || selectedNotif.metadata?.document_id}`}
                      download={selectedNotif.original_filename || "document.pdf"}
                      rel="noreferrer"
                    >
                      {selectedNotif?.mime_type?.startsWith("image/") ? PDF_ACTION_LABELS.original : PDF_ACTION_LABELS.download}
                    </a>
                  </Button>
                )}
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <PDFPreviewModal
          open={!!pdfPreview}
          onClose={() => setPdfPreview(null)}
          preview={pdfPreview}
          onUpdate={
            selectedNotif && onRescan && !selectedNotif.source_type
              ? () => {
                  setPdfPreview(null);
                  setSheetOpen(false);
                  onRescan(
                    selectedNotif.student_no,
                    selectedNotif.doc_type,
                    selectedNotif.entity_id || selectedNotif.metadata?.document_id,
                    selectedNotif.original_filename,
                    selectedNotif.mime_type
                  );
                }
              : undefined
          }
        />
      </div>
    </TooltipProvider>
  );
}
