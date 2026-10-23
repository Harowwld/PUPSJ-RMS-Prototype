"use client";

import useUrlPage from "@/hooks/useUrlPage";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import HugeIcon from "@/components/shared/HugeIcon";
import { cn, formatTitleCase } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import MultiCriteriaFilter from "@/components/shared/MultiCriteriaFilter";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import NotificationsListSkeleton from "@/components/staff/skeletons/NotificationsListSkeleton";

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
        icon: "ph-check",
        avatarClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60",
        label: "Approved",
        category: "Document Review",
      };
    }
    if (approvalStatus === "Declined") {
      return {
        icon: "ph-x",
        avatarClass: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/70 dark:border-rose-800/60",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60",
        label: "Declined",
        category: "Document Review",
      };
    }
    return {
      icon: "ph-clock",
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
      icon: "ph-file-text",
      avatarClass: "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-200/70 dark:border-sky-800/60",
      badgeClass,
      label: requestStatus || "Request",
      category: "Document Request",
    };
  }

  if (type === "scan_upload") {
    return {
      icon: "ph-scan",
      avatarClass: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/60",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60",
      label: "Uploaded",
      category: "Ingestion",
    };
  }

  if (type === "student_record") {
    return {
      icon: "ph-user",
      avatarClass: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200/70 dark:border-purple-800/60",
      badgeClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/60",
      label: "Student",
      category: "Records",
    };
  }

  return {
    icon: "ph-bell",
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
        {icon && <HugeIcon className={cn("text-gray-400 dark:text-zinc-500 text-sm shrink-0", icon)} />}
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

  // Pagination
  const [page, setPage] = useUrlPage();
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Side Sheet Details state
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [notifFrameStatus, setNotifFrameStatus] = useState("loading");

  const isLoading = propLoading || initialLoading;

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [debouncedSearch, typeFilters, decisionFilters, activeTab, setPage]);

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage) || 1);
  const displayPage = Math.min(page, totalPages);
  const offset = (displayPage - 1) * itemsPerPage;

  // Main fetch function
  const load = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setIsRefreshing(true);
      setError("");
      try {
        const qs = new URLSearchParams();
        qs.set("limit", String(itemsPerPage));
        qs.set("offset", String(offset));
        qs.set("tab", activeTab);
        qs.set("sortBy", "created_at");
        qs.set("sortOrder", "DESC");
        if (debouncedSearch) qs.set("search", debouncedSearch);
        if (typeFilters.length > 0) qs.set("type", typeFilters.join(","));
        if (decisionFilters.length > 0) qs.set("decision", decisionFilters.join(","));

        const [res] = await Promise.all([
          fetch(`/api/notifications?${qs.toString()}`, { cache: "no-store" }),
          showRefreshing ? new Promise((resolve) => setTimeout(resolve, 500)) : Promise.resolve(),
        ]);
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Failed to load notifications");
        }
        const data = json.data || {};
        const nextItems = Array.isArray(data.items) ? data.items : [];
        setItems(nextItems);
        setTotal(Number(data.total || 0));
        setUnreadCount(Number(data.unreadCount || 0));
        setReadCount(Number(data.readCount || 0));
        onUnreadChangeRef.current?.(Number(data.unreadCount || 0));
      } catch (e) {
        setError(e?.message || "Failed to load notifications");
      } finally {
        setInitialLoading(false);
        setIsRefreshing(false);
      }
    },
    [offset, itemsPerPage, activeTab, debouncedSearch, typeFilters, decisionFilters]
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
  const toggleReadState = async (id, markAsRead) => {
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
  };

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

  // Group items by time bucket: TODAY, YESTERDAY, THIS WEEK, EARLIER
  const groupedItems = useMemo(() => {
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
  }, [items]);

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
    typeFilters.forEach((t) => {
      const opt = filterGroups[0]?.options.find((o) => o.value === t);
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
      chips.push({
        id: `decision-${d}`,
        label: `Decision: ${d}`,
        onRemove: () => {
          setDecisionFilters((prev) => prev.filter((item) => item !== d));
          setPage(1);
        },
      });
    });
    return chips;
  }, [searchQuery, typeFilters, decisionFilters, filterGroups, setPage]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() || typeFilters.length > 0 || decisionFilters.length > 0
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="font-jakarta w-full flex flex-col h-auto gap-6 focus:outline-none animate-fade-up">
        {/* Main Card Container encapsulating Header, Toolbar, Feed & Pagination */}
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta mb-4">
          {/* 1. Page Header */}
          <PageHeader
            icon="ph-bell"
            title={
              <div className="flex items-center gap-2">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-pup-maroon/10 text-pup-maroon dark:bg-red-400/10 dark:text-red-400">
                    {unreadCount} new
                  </span>
                )}
              </div>
            }
            description="Real-time updates on document reviews, student requests, and system activity."
            showBorder={false}
            className="p-6"
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
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
                    className="h-10 px-5 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-40"
                  >
                    <HugeIcon className="ph-bold ph-checks mr-1.5" />
                    Mark All as Read
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={total <= 0}
                    onClick={markAllUnread}
                    className="h-10 px-5 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-40"
                  >
                    <HugeIcon className="ph-bold ph-envelope mr-1.5" />
                    Mark All as Unread
                  </Button>
                </div>
              </div>
            }
          />

          {/* 2. Navigation Toolbar: Read / Unread Tabs ONLY */}
          <div className="border-t border-border dark:border-border p-5 flex flex-wrap items-center justify-between gap-3 bg-gray-50/40 dark:bg-zinc-900/30">
            {/* Left: Underline Tabs */}
            <div className="flex items-center gap-6 select-none overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("unread")}
                className={cn(
                  "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent whitespace-nowrap gap-1.5",
                  activeTab === "unread"
                    ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                    : "text-gray-500 dark:text-zinc-400 font-normal hover:text-gray-700 dark:hover:text-zinc-200"
                )}
              >
                <span>Unread</span>
                <span
                  className={cn(
                    "text-[11px] font-semibold px-2 py-0.2 rounded-full",
                    activeTab === "unread"
                      ? "bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-gray-200/80 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400"
                  )}
                >
                  {unreadCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("read")}
                className={cn(
                  "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent whitespace-nowrap gap-1.5",
                  activeTab === "read"
                    ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                    : "text-gray-500 dark:text-zinc-400 font-normal hover:text-gray-700 dark:hover:text-zinc-200"
                )}
              >
                <span>Read</span>
                <span
                  className={cn(
                    "text-[11px] font-semibold px-2 py-0.2 rounded-full",
                    activeTab === "read"
                      ? "bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-gray-200/80 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400"
                  )}
                >
                  {readCount}
                </span>
              </button>
            </div>

            {/* Right: Search Input & Multi-Criteria Filter Group */}
            <div className="flex flex-wrap items-center gap-2.5 max-w-full">
              {/* Search Input */}
              <div className="w-full sm:w-60 md:w-64 relative group min-w-0">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <HugeIcon className="ph-bold ph-magnifying-glass text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-sm" />
                </div>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notifications, student..."
                  className="h-9 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 pl-8 pr-16 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                />
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[11px] text-gray-400 dark:text-zinc-500">
                  {total > 0 ? `${total.toLocaleString()}` : "0"}
                </div>
              </div>

              {/* Multi-Criteria Filter Popover */}
              <MultiCriteriaFilter
                title="Filter Notifications"
                groups={filterGroups}
                selectedValues={filterValues}
                onChange={handleFilterChange}
                onClearAll={handleClearFilters}
                totalCount={total}
                filteredCount={items.length}
              />
            </div>
          </div>

          {/* 3. Active Filter Chips */}
          <ActiveFilterChips
            chips={activeChips}
            onClearAll={handleClearFilters}
            className="border-t border-border dark:border-border px-6 py-2.5"
          />

          {/* 4. Grouped Notification List / Skeletons / Empty State */}
          {isLoading && !isRefreshing ? (
            <div className="flex-1 flex flex-col min-h-0 border-t border-border dark:border-border">
              <NotificationsListSkeleton groupCount={2} itemsPerGroup={3} />
            </div>
          ) : error ? (
            <div className="flex-1 flex min-h-0 flex-col items-center justify-center p-6 border-t border-border dark:border-border rounded-b-2xl">
              <Empty className="flex h-[360px] flex-col items-center justify-center border-0 text-center text-gray-900 dark:text-zinc-300">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/80 bg-white shadow-sm dark:border-border dark:bg-zinc-800">
                    <HugeIcon className="ph-duotone ph-warning-circle text-3xl text-pup-maroon dark:text-primary" />
                  </EmptyMedia>
                  <EmptyTitle className="text-base font-semibold text-gray-900 dark:text-zinc-50">
                    Could not load notifications
                  </EmptyTitle>
                  <EmptyDescription className="mt-1 max-w-md text-xs font-normal text-gray-600 dark:text-zinc-300">
                    {error}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] border-t border-border dark:border-border w-full">
              <Empty className="flex flex-1 h-full min-h-[360px] flex-col items-center justify-center border-0 bg-transparent text-center">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <div className="relative mb-5">
                    <EmptyMedia className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-border/80 bg-white shadow-sm dark:border-border dark:bg-zinc-800">
                      <HugeIcon
                        className={cn(
                          "ph-duotone text-3xl text-gray-400 dark:text-zinc-500",
                          hasActiveFilters
                            ? "ph-magnifying-glass"
                            : activeTab === "unread"
                            ? "ph-checks"
                            : "ph-bell-slash"
                        )}
                      />
                    </EmptyMedia>
                  </div>
                  <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-100">
                    {hasActiveFilters
                      ? "No matching notifications"
                      : activeTab === "unread"
                      ? "You're all caught up!"
                      : "No read notifications"}
                  </EmptyTitle>
                  <EmptyDescription className="mt-1 max-w-sm text-sm font-medium text-gray-900 dark:text-zinc-300">
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
                      onClick={handleClearFilters}
                      className="mt-6 flex h-10 items-center justify-center rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-5 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                    >
                      Reset Filters
                    </Button>
                  </EmptyContent>
                )}
              </Empty>
            </div>
          ) : (
            /* Time-Grouped Notification Feed */
            <div className="flex flex-col gap-6 p-6 border-t border-border dark:border-border w-full">
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
                              <HugeIcon className={cn("ph-bold text-base", visuals.icon)} />
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
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-pup-maroon/10 text-pup-maroon dark:bg-red-400/10 dark:text-red-400">
                                    New
                                  </span>
                                )}
                              </div>

                              {/* Message Snippet */}
                              <p
                                className="text-xs text-muted-foreground mt-0.5 line-clamp-1 break-words font-normal"
                                title={n.message}
                              >
                                {n.message}
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
                                  <HugeIcon
                                    className={cn(
                                      "text-[16px]",
                                      isUnread ? "ph-bold ph-envelope" : "ph-bold ph-envelope-open"
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
          {!isLoading && !error && total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border bg-white p-4 px-6 rounded-b-2xl dark:border-border dark:bg-card">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-6 text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                  <span>
                    Showing {items.length} of {total.toLocaleString()} notifications
                  </span>

                  <div className="flex items-center gap-1.5 border-l border-border pl-6 dark:border-border">
                    <span className="text-[12px] text-gray-400 dark:text-zinc-500">Rows:</span>
                    <div className="flex items-center gap-1">
                      {[15, 25, 50, 100].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            setItemsPerPage(size);
                            setPage(1);
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[12px] font-normal cursor-pointer transition-colors border-0 ${
                            itemsPerPage === size
                              ? "bg-gray-100 text-[#111111] font-medium dark:bg-white/10 dark:text-zinc-50"
                              : "bg-transparent text-gray-450 dark:text-zinc-550 hover:text-gray-700 dark:hover:text-zinc-300"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  disabled={displayPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 bg-transparent text-[12px] font-normal text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
                >
                  Prev
                </button>

                <div className="flex h-8 min-w-[32px] items-center justify-center rounded-xl border border-border/80 bg-white px-2.5 text-[12px] font-semibold text-gray-900 dark:border-border dark:bg-card dark:text-zinc-100">
                  {displayPage}
                </div>

                <button
                  type="button"
                  disabled={displayPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 bg-transparent text-[12px] font-normal text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
                >
                  Next
                </button>
              </div>
            </div>
          )}
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
            className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full bg-white dark:bg-card border-l border-border dark:border-border p-0 shadow-2xl overflow-hidden focus:outline-none focus-visible:outline-none"
          >
            {/* Top Header matching reference design: Notification Details < > 01 of XX X */}
            <SheetHeader className="shrink-0 p-0 border-b border-border dark:border-border bg-white dark:bg-card">
              <div className="flex items-center justify-between px-6 py-4">
                <div>
                  <SheetTitle className="text-base font-bold text-gray-900 dark:text-zinc-50 tracking-tight">
                    Notification Details
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    Detailed notification event information and attached records.
                  </SheetDescription>
                </div>

                <div className="flex items-center gap-3">
                  {activeNavList.length > 1 && selectedNotifIndex >= 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400">
                      <button
                        type="button"
                        disabled={!hasPrevNotif}
                        onClick={handlePrevNotif}
                        className="w-7 h-7 rounded-lg border border-border/80 dark:border-border flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                        aria-label="Previous Notification"
                        title="Previous Notification"
                      >
                        <HugeIcon className="ph-bold ph-caret-left text-xs" />
                      </button>
                      <button
                        type="button"
                        disabled={!hasNextNotif}
                        onClick={handleNextNotif}
                        className="w-7 h-7 rounded-lg border border-border/80 dark:border-border flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                        aria-label="Next Notification"
                        title="Next Notification"
                      >
                        <HugeIcon className="ph-bold ph-caret-right text-xs" />
                      </button>
                      <span className="font-mono text-[11px] font-semibold text-gray-700 dark:text-zinc-300 ml-0.5">
                        {String(selectedNotifIndex + 1).padStart(2, "0")} of {String(activeNavList.length).padStart(2, "0")}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setSheetOpen(false)}
                    className="w-8 h-8 rounded-xl bg-gray-100/90 hover:bg-gray-200/90 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/5 dark:border-white/10 shadow-2xs"
                    aria-label="Close"
                    title="Close"
                  >
                    <HugeIcon className="ph-bold ph-x text-sm" />
                  </button>
                </div>
              </div>
            </SheetHeader>

            {/* Scrollable Sheet Body - 1 Column Standard Layout */}
            {selectedNotif ? (
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white dark:bg-card">
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
                          <HugeIcon className={cn("ph-bold", ui.icon)} />
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
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
                            ui.badgeClass
                          )}
                        >
                          <HugeIcon className={cn("text-xs ph-bold", ui.icon)} />
                          {ui.label}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* 1. Event Narrative / Message */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-border/80 dark:border-border">
                    <HugeIcon className="ph-bold ph-chat-centered-text text-pup-maroon dark:text-red-400 text-sm" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                      Event Summary
                    </h3>
                  </div>
                  <div className="pt-2">
                    <p className="text-xs text-gray-700 dark:text-zinc-200 leading-relaxed font-medium">
                      {selectedNotif.message}
                    </p>

                    {/* Rejection Note Banner */}
                    {selectedNotif.approval_status === "Declined" && selectedNotif.review_note && (
                      <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 dark:border-rose-900/40 dark:bg-rose-950/25">
                        <div className="flex gap-2.5">
                          <HugeIcon className="ph-bold ph-warning-circle text-rose-600 dark:text-rose-400 text-base shrink-0 mt-0.5" />
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
                    <HugeIcon className="ph-bold ph-info text-pup-maroon dark:text-red-400 text-sm" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                      Notification Specification
                    </h3>
                  </div>
                  <div className="py-1">
                    {(() => {
                      const ui = getNotificationVisuals(selectedNotif);
                      return (
                        <>
                          <InfoRow icon="ph-bold ph-tag" label="Event Category">
                            <span className="font-semibold text-gray-900 dark:text-zinc-100">
                              {ui.category}
                            </span>
                          </InfoRow>

                          <InfoRow
                            icon="ph-bold ph-buildings"
                            label="Office Scope"
                            value={formatTitleCase(selectedNotif.office_id) || "University General"}
                          />

                          <InfoRow
                            icon="ph-bold ph-user-circle"
                            label="Triggered By"
                            value={formatTitleCase(selectedNotif.actor_name) || "System Automated"}
                          />

                          <InfoRow
                            icon="ph-bold ph-calendar-blank"
                            label="Timestamp"
                            value={formatPHDateTime(selectedNotif.created_at)}
                          />

                          <InfoRow icon="ph-bold ph-envelope-simple" label="Read Status">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
                                  selectedNotif.is_read
                                    ? "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300"
                                    : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50"
                                )}
                              >
                                <span
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    selectedNotif.is_read ? "bg-gray-400" : "bg-blue-500"
                                  )}
                                />
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
                            <InfoRow icon="ph-bold ph-identification-card" label="Student Number">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200">
                                  {selectedNotif.student_no}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(selectedNotif.student_no, "student_no")}
                                  className="text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                                  title="Copy Student Number"
                                >
                                  <HugeIcon
                                    className={cn(
                                      "text-xs",
                                      copiedKey === "student_no"
                                        ? "ph-bold ph-check text-emerald-600"
                                        : "ph-bold ph-copy"
                                    )}
                                  />
                                </button>
                              </div>
                            </InfoRow>
                          )}

                          {selectedNotif.student_name && (
                            <InfoRow
                              icon="ph-bold ph-user"
                              label="Student Name"
                              value={formatTitleCase(selectedNotif.student_name)}
                            />
                          )}

                          {selectedNotif.doc_type && (
                            <InfoRow icon="ph-bold ph-file" label="Document Category" value={selectedNotif.doc_type} />
                          )}

                          {selectedNotif.original_filename && (
                            <InfoRow icon="ph-bold ph-paperclip" label="Original File">
                              <span
                                className="font-mono text-xs truncate block max-w-[240px]"
                                title={selectedNotif.original_filename}
                              >
                                {selectedNotif.original_filename}
                              </span>
                            </InfoRow>
                          )}

                          {selectedNotif.entity_type === "document_request" && (
                            <InfoRow icon="ph-bold ph-arrow-square-out" label="Related Request">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-semibold text-gray-700 dark:text-zinc-300">
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
                        <HugeIcon className="ph-bold ph-file-text text-pup-maroon dark:text-red-400 text-sm" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                          Document Preview
                        </h3>
                      </div>
                      <a
                        href={`/api/documents/${selectedNotif.entity_id || selectedNotif.metadata?.document_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-xs text-pup-maroon dark:text-red-400 hover:underline font-semibold"
                      >
                        <HugeIcon className="ph-bold ph-arrow-square-out mr-1 text-xs" />
                        Open New Tab
                      </a>
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
            <SheetFooter className="shrink-0 p-4 px-6 border-t border-border dark:border-border bg-gray-50/70 dark:bg-zinc-900/40 flex flex-row items-center justify-between">
              <div>
                {selectedNotif?.entity_type === "document_request" && onNavigateTab ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSheetOpen(false);
                      onNavigateTab("requests");
                    }}
                    className="h-10 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <HugeIcon className="ph-bold ph-arrow-square-out text-sm" />
                    <span>Open in Requests</span>
                  </Button>
                ) : selectedNotif?.approval_status === "Declined" && onRescan ? (
                  <Button
                    type="button"
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
                    className="h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white! shadow-xs cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                    style={{ color: "#ffffff" }}
                  >
                    <HugeIcon className="ph-bold ph-arrows-clockwise text-sm" />
                    <span>Rescan Document</span>
                  </Button>
                ) : null}
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSheetOpen(false)}
                  className="h-10 px-5 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Close
                </Button>

                {(selectedNotif?.entity_type === "document" || selectedNotif?.metadata?.document_id) && (
                  <a
                    href={`/api/documents/${selectedNotif.entity_id || selectedNotif.metadata?.document_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center rounded-xl btn-brand-red px-5 text-xs font-semibold text-white! shadow-xs transition-all active:scale-95 cursor-pointer"
                    style={{ color: "#ffffff" }}
                  >
                    <HugeIcon className="ph-bold ph-file-arrow-down mr-1.5 text-sm" />
                    Download File
                  </a>
                )}
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
