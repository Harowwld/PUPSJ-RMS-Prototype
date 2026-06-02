"use client"

import { useCallback, useEffect, useMemo, useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPHDateTimeParts } from "@/lib/timeFormat"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import PageHeader from "@/components/shared/PageHeader"
import { RefreshButton } from "@/components/shared/RefreshButton"
import { Select } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column)
    return <i className="ph-bold ph-caret-up-down ml-1 text-[11px] opacity-40 transition-opacity group-hover:opacity-70 dark:opacity-30 dark:group-hover:opacity-60"></i>
  return sortOrder === "ASC" ? (
    <i className="ph-bold ph-caret-up ml-1 text-[11px] text-pup-maroon animate-in fade-in zoom-in duration-300 dark:text-primary"></i>
  ) : (
    <i className="ph-bold ph-caret-down ml-1 text-[11px] text-pup-maroon animate-in fade-in zoom-in duration-300 dark:text-primary"></i>
  )
}

function statusUi(status) {
  switch (status) {
    case "Approved":
      return {
        badge: "bg-green-50 text-green-700 border-green-200 dark:bg-emerald-950/20 dark:text-emerald-500/90 dark:border-emerald-900/50",
        icon: "ph-check-circle",
        label: "Approved",
      }
    case "Declined":
      return {
        badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-500/90 dark:border-red-900/50",
        icon: "ph-x-circle",
        label: "Declined",
      }
    default:
      return {
        badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-500/90 dark:border-amber-900/50",
        icon: "ph-clock",
        label: "Pending",
      }
  }
}

function NotificationsSkeleton() {
  return (
    <div className="flex-1 flex flex-col space-y-4">
      <div className="flex-1 border border-gray-200 rounded-brand overflow-hidden flex flex-col dark:border-white/10">
        <Skeleton className="h-10 w-full rounded-none dark:bg-muted" />
        <div className="divide-y divide-gray-100 dark:divide-white/10 flex-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between">
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-7 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-20 rounded-full dark:bg-muted" />
                </div>
                <div className="hidden lg:block space-y-2">
                  <Skeleton className="h-4 w-24 dark:bg-muted" />
                </div>
                <div className="hidden lg:block space-y-2">
                  <Skeleton className="h-4 w-32 dark:bg-muted" />
                </div>
                <div className="hidden lg:block space-y-2">
                  <Skeleton className="h-6 w-24 rounded-full dark:bg-muted" />
                </div>
                <div className="hidden lg:block space-y-2">
                  <Skeleton className="h-4 w-40 dark:bg-muted" />
                </div>
                <div className="hidden lg:block space-y-2">
                  <Skeleton className="h-4 w-20 dark:bg-muted" />
                </div>
                <div className="hidden lg:block space-y-2">
                  <Skeleton className="h-4 w-24 dark:bg-muted" />
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <Skeleton className="h-9 w-9 rounded-brand dark:bg-muted" />
                <Skeleton className="h-9 w-9 rounded-brand dark:bg-muted" />
                <Skeleton className="h-9 w-9 rounded-brand dark:bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function NotificationsTab({
  onPreviewDocument,
  onUnreadChange,
  onRescan,
  isLoading: propLoading,
  onRefresh,
}) {
  const onUnreadChangeRef = useRef(onUnreadChange)
  useEffect(() => {
    onUnreadChangeRef.current = onUnreadChange
  }, [onUnreadChange])

  const [initialLoading, setInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [lastSeenReviewedAt, setLastSeenReviewedAt] = useState(null)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [jumpPage, setJumpPage] = useState("1")
  const [sortBy, setSortBy] = useState("reviewed_at")
  const [sortOrder, setSortOrder] = useState("DESC")
  const [activeTab, setActiveTab] = useState("inbox")
  const [inboxCount, setInboxCount] = useState(0)
  const [archiveCount, setArchiveCount] = useState(0)

  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedNotif, setSelectedNotif] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const isLoading = propLoading || initialLoading

  useEffect(() => {
    if (!detailModalOpen) {
      setIsFullscreen(false)
    }
  }, [detailModalOpen])

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage) || 1)
  const displayPage = Math.min(page, totalPages)
  const offset = (displayPage - 1) * itemsPerPage

  const load = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true)
    setError("")
    try {
      const res = await fetch(
        `/api/notifications?limit=${itemsPerPage}&offset=${offset}&sortBy=${sortBy}&sortOrder=${sortOrder}&tab=${activeTab}`,
        { cache: "no-store" }
      )
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to load notifications")
      }
      const data = json.data || {}
      const nextItems = Array.isArray(data.items) ? data.items : []
      setItems(nextItems)
      setTotal(Number(data.total || 0))
      setUnreadCount(Number(data.unreadCount || 0))
      setInboxCount(Number(data.inboxCount || 0))
      setArchiveCount(Number(data.archiveCount || 0))
      setLastSeenReviewedAt(data.lastSeenReviewedAt || null)
      onUnreadChangeRef.current?.(Number(data.unreadCount || 0))
    } catch (e) {
      setError(e?.message || "Failed to load notifications")
    } finally {
      setInitialLoading(false)
      setIsRefreshing(false)
    }
  }, [offset, itemsPerPage, sortBy, sortOrder, activeTab])

  // Refresh handler
  const handleRefresh = async () => {
    await load(true)
  }

  useEffect(() => {
    setJumpPage(String(displayPage))
  }, [displayPage])

  useEffect(() => {
    setPage(1)
  }, [activeTab])

  const handleJumpPage = (e) => {
    if (e.key === "Enter" || e.type === "blur") {
      const val = parseInt(jumpPage)
      if (!isNaN(val) && val >= 1 && val <= totalPages) {
        setPage(val)
      } else {
        setJumpPage(String(displayPage))
      }
    }
  }

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value))
    setPage(1)
  }

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC")
    } else {
      setSortBy(column)
      setSortOrder("ASC")
    }
    setPage(1)
  }

  const handleViewDetails = (notif) => {
    setSelectedNotif(notif)
    setDetailModalOpen(true)
  }

  const markAllRead = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markSeen" }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to mark as read")
      }
      const nextUnread = Number(json?.data?.unreadCount || 0)
      setUnreadCount(nextUnread)
      setLastSeenReviewedAt(json?.data?.lastSeenReviewedAt || null)
      onUnreadChangeRef.current?.(nextUnread)
      await load()
    } catch {
      // silent
    }
  }, [load])

  const markAllUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllUnread" }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to mark as unread")
      }
      const nextUnread = Number(json?.data?.unreadCount || 0)
      setUnreadCount(nextUnread)
      onUnreadChangeRef.current?.(nextUnread)
      await load()
    } catch {
      // silent
    }
  }, [load])

  const handleAction = async (id, action) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ids: [id],
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Action failed")
      }
      await load()
    } catch (e) {
      setError(e?.message || "Failed to perform action")
    }
  }

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      load()
    }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", onVisible)
    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", onVisible)
    }
  }, [load])

  return (
    <TooltipProvider delayDuration={200}>
      <div className="animate-fade-up font-inter flex w-full flex-col gap-6">
        <Card className="flex flex-col overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
          <PageHeader
            icon="ph-bell"
            title={
              activeTab === "archive" ? (
                <span className="flex items-center gap-2.5">
                  System notifications
                  <Badge
                    variant="outline"
                    className="border-red-200 bg-red-50 px-2.5 py-1 text-[9px] font-black tracking-widest text-pup-maroon dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
                  >
                    Archive view
                  </Badge>
                </span>
              ) : (
                "System notifications"
              )
            }
            description="Real-time updates on document review decisions and system alerts."
            actions={
              <div className="flex items-center gap-2">
                <div className="mr-2 flex flex-col items-end gap-1">
                  <p className="text-[10px] font-bold tracking-widest text-gray-400 dark:text-zinc-500">
                    Refresh status
                  </p>
                  <p className="text-[10px] font-medium whitespace-nowrap text-gray-500 dark:text-zinc-400">
                    Get latest database updates
                  </p>
                </div>
                <RefreshButton
                  onRefresh={handleRefresh}
                  isLoading={isRefreshing}
                  title="Refresh notifications"
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={unreadCount <= 0 || activeTab === "archive"}
                  onClick={markAllRead}
                  className="h-10 rounded-brand border-gray-300 px-5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:border-white/10 dark:bg-red-950/30 dark:text-zinc-200 dark:shadow-none dark:hover:border-zinc-700 dark:hover:text-red-500"
                >
                  <i className="ph-bold ph-checks mr-1.5"></i>
                  Mark all as read
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={total <= 0 || activeTab === "archive"}
                  onClick={markAllUnread}
                  className="h-10 rounded-brand border-gray-300 px-5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-amber-50 hover:text-amber-600 dark:border-white/10 dark:bg-amber-950/30 dark:text-zinc-200 dark:shadow-none dark:hover:border-zinc-700 dark:hover:text-amber-500"
                >
                  <i className="ph-bold ph-envelope mr-1.5"></i>
                  Mark all as unread
                </Button>
              </div>
            }
          />
        </Card>

        <div className="flex flex-col h-auto gap-4">
          <div className="flex shrink-0 select-none flex-wrap items-end justify-between gap-6">
            <div className="flex w-full flex-col gap-1.5 sm:w-auto">
              <label className="text-[10px] font-black tracking-widest text-gray-400 dark:text-zinc-500">
                Notification view
              </label>
              <div className="flex w-full cursor-default items-center overflow-hidden rounded-brand border border-gray-200 bg-gray-100 p-0.5 backdrop-blur-sm sm:w-auto dark:border-white/10 dark:bg-muted/50">
                <button
                  type="button"
                  onClick={() => setActiveTab("inbox")}
                  className={`group flex h-11 flex-1 cursor-pointer items-center justify-center gap-3 px-8 text-sm font-bold transition-all duration-200 active:scale-[0.98] sm:w-[200px] sm:flex-none ${
 activeTab === "inbox"
 ? "rounded-l-[calc(var(--radius)-2px)] rounded-r-none bg-white text-pup-maroon shadow-sm ring-1 ring-inset ring-black/5 dark:bg-zinc-900 dark:text-primary dark:ring-white/10"
 : "text-gray-500 ring-transparent hover:bg-white/50 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-200"
 }`}
                >
                  <i
                    className={`ph-bold ph-tray ${activeTab === "inbox" ? "" : "text-gray-400 group-hover:text-gray-600 dark:text-zinc-500 dark:group-hover:text-zinc-300 dark:hover:text-zinc-300"}`}
                  ></i>
                  <span className="whitespace-nowrap tracking-wide">
                    Inbox
                  </span>
                  <span
                    className={cn(
                      "flex h-5 min-w-[26px] items-center justify-center rounded-full px-2 text-[10px] font-black transition-all duration-300",
                      activeTab === "inbox"
                        ? "bg-pup-maroon text-white shadow-sm ring-2 ring-red-50/50 dark:bg-red-500/20 dark:text-red-400 dark:ring-red-400/20 dark:shadow-none"
                        : "bg-gray-200 text-gray-500 group-hover:bg-gray-300 dark:bg-zinc-800 dark:text-zinc-500 dark:group-hover:bg-zinc-700 dark:group-hover:text-zinc-300"
                    )}
                  >
                    {inboxCount}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("archive")}
                  className={`group flex h-11 flex-1 cursor-pointer items-center justify-center gap-3 px-8 text-sm font-bold transition-all duration-200 active:scale-[0.98] sm:w-[200px] sm:flex-none ${
 activeTab === "archive"
 ? "rounded-r-[calc(var(--radius)-2px)] rounded-l-none bg-white text-pup-maroon shadow-sm ring-1 ring-inset ring-black/5 dark:bg-zinc-900 dark:text-primary dark:ring-white/10"
 : "text-gray-500 ring-transparent hover:bg-white/50 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-200"
 }`}
                >
                  <i
                    className={`ph-bold ph-archive ${activeTab === "archive" ? "" : "text-gray-400 group-hover:text-gray-600 dark:text-zinc-500 dark:group-hover:text-zinc-300 dark:hover:text-zinc-300"}`}
                  ></i>
                  <span className="whitespace-nowrap tracking-wide">
                    Archive
                  </span>
                  <span
                    className={cn(
                      "flex h-5 min-w-[26px] items-center justify-center rounded-full px-2 text-[10px] font-black transition-all duration-300",
                      activeTab === "archive"
                        ? "bg-pup-maroon text-white shadow-sm ring-2 ring-red-50/50 dark:bg-red-500/20 dark:text-red-400 dark:ring-red-400/20 dark:shadow-none"
                        : "bg-gray-200 text-gray-500 group-hover:bg-gray-300 dark:bg-zinc-800 dark:text-zinc-500 dark:group-hover:bg-zinc-700 dark:group-hover:text-zinc-300"
                    )}
                  >
                    {archiveCount}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {isLoading || isRefreshing ? (
              <NotificationsSkeleton />
            ) : error ? (
              <Empty className="flex h-[320px] flex-col items-center justify-center border-0 text-center text-gray-500 dark:text-zinc-400">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
                    <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon dark:text-primary" />
                  </EmptyMedia>
                  <EmptyTitle className="text-lg font-bold text-gray-900 dark:text-zinc-50">
                    Could not load notifications
                  </EmptyTitle>
                  <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600 dark:text-zinc-300">
                    {error}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <>
                <div
                  className="overflow-hidden rounded-brand border border-gray-200 dark:border-white/10 bg-white dark:bg-card shadow-sm dark:shadow-none transition-all duration-500 animate-fade-up"
                >
                  <div className="overflow-x-auto rounded-[inherit]">
                    <table className="min-w-full table-fixed text-sm">
                      <thead className="bg-gray-50 select-none dark:bg-muted">
                        <tr className="text-left text-[10px] font-black tracking-widest text-gray-600 dark:text-zinc-300">
                          <th className="w-32 p-4">
                            <button
                              onClick={() => handleSort("decision")}
                              className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none dark:text-zinc-300"
                            >
                              Decision{" "}
                              <SortIndicator
                                column="decision"
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                              />
                            </button>
                          </th>
                          <th className="w-36 p-4">
                            <button
                              onClick={() => handleSort("student_no")}
                              className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none dark:text-zinc-300"
                            >
                              Student no{" "}
                              <SortIndicator
                                column="student_no"
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                              />
                            </button>
                          </th>
                          <th className="w-48 p-4">
                            <button
                              onClick={() => handleSort("student_name")}
                              className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none dark:text-zinc-300"
                            >
                              Name{" "}
                              <SortIndicator
                                column="student_name"
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                              />
                            </button>
                          </th>
                          <th className="w-48 p-4">
                            <button
                              onClick={() => handleSort("doc_type")}
                              className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none dark:text-zinc-300"
                            >
                              Type{" "}
                              <SortIndicator
                                column="doc_type"
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                              />
                            </button>
                          </th>
                          <th className="w-64 p-4">
                            <button
                              onClick={() => handleSort("file")}
                              className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none dark:text-zinc-300"
                            >
                              File{" "}
                              <SortIndicator
                                column="file"
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                              />
                            </button>
                          </th>
                          <th className="w-36 p-4">
                            <button
                              onClick={() => handleSort("reviewed_by")}
                              className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none dark:text-zinc-300"
                            >
                              Reviewed by{" "}
                              <SortIndicator
                                column="reviewed_by"
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                              />
                            </button>
                          </th>
                          <th className="w-36 p-4">
                            <button
                              onClick={() => handleSort("reviewed_at")}
                              className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none dark:text-zinc-300"
                            >
                              Reviewed{" "}
                              <SortIndicator
                                column="reviewed_at"
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                              />
                            </button>
                          </th>
                          <th className="w-64 p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                        {items.length === 0 ? (
                          <tr className="border-0 hover:bg-transparent">
                            <td colSpan={8} className="border-0 p-0">
                              <Empty className="flex h-[450px] flex-col items-center justify-center border-0 bg-transparent text-center">
                                <EmptyHeader className="flex flex-col items-center gap-0">
                                  <div className="relative mb-6">
                                    <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                                    <EmptyMedia className="relative z-10 flex h-24 w-24 rotate-3 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl dark:border-white/10 dark:bg-card dark:shadow-none">
                                      <i className="ph-duotone ph-magnifying-glass text-5xl text-gray-300 dark:text-zinc-600"></i>
                                    </EmptyMedia>
                                  </div>
                                  <EmptyTitle className="text-xl font-black text-gray-900 dark:text-zinc-50">
                                    No notifications found
                                  </EmptyTitle>
                                  <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                                    When admins approve or decline uploaded
                                    documents, updates will appear here.
                                  </EmptyDescription>
                                </EmptyHeader>
                              </Empty>
                            </td>
                          </tr>
                        ) : (
                          items.map((n) => {
                            const ui = statusUi(n.approval_status)
                            const reviewed = formatPHDateTimeParts(n.reviewed_at)
                            const isUnread = n.is_read === 0
                            return (
                              <tr
                                key={n.id}
                                className={cn(
                                  "group border-l-2 border-transparent transition-all duration-200 select-none hover:bg-gray-50 dark:bg-card dark:hover:bg-white/5",
                                  isUnread && "bg-amber-50 dark:bg-amber-950/40 border-l-amber-500"
                                )}
                              >
                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={cn(
                                        "flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black tracking-wider shadow-xs transition-all",
                                        ui.badge
                                      )}
                                    >
                                      <i className={cn("ph-fill text-[10px]", ui.icon)}></i>
                                      {ui.label}
                                    </div>
                                    {isUnread ? (
                                      <span className="animate-pulse text-[9px] font-extrabold tracking-widest text-pup-maroon dark:text-primary">
                                        New
                                      </span>
                                    ) : null}
                                  </div>
                                </td>
                                <td className="p-4 text-xs font-bold text-gray-900 dark:text-zinc-50">
                                  {n.student_no}
                                </td>
                                <td className="p-4 text-xs font-black text-gray-900 dark:text-zinc-50">
                                  {n.student_name || "—"}
                                </td>
                                <td className="p-4">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-pup-maroon/20 bg-pup-maroon/10 text-[10px] font-black tracking-wider text-pup-maroon whitespace-nowrap dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-400">
                                    <i className="ph-bold ph-file text-[11px]"></i>
                                    {n.doc_type}
                                  </span>
                                </td>
                                <td className="p-4 text-gray-700 dark:text-zinc-200">
                                  <div className="max-w-[200px] truncate text-xs font-medium">
                                    {n.original_filename}
                                  </div>
                                  {n.review_note && (
                                    <div className="mt-0.5 line-clamp-1 text-[10px] text-gray-500 italic dark:text-zinc-400">
                                      Note: {n.review_note}
                                    </div>
                                  )}
                                </td>
                                 <td className="p-4 text-xs font-bold text-gray-700 dark:text-zinc-300">
                                  <div className="flex flex-col gap-1.5">
                                    <span className="truncate">{n.reviewed_by || "—"}</span>
                                    {n.reviewed_by && (
                                      n.is_previewed === 1 ? (
                                        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-black text-green-700 border border-green-200 dark:bg-emerald-950/20 dark:text-emerald-500/90 dark:border-emerald-900/50">
                                          <i className="ph-bold ph-check-circle text-[10px]"></i>
                                          Verified Preview
                                        </span>
                                      ) : (
                                        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-black text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-500/90 dark:border-amber-900/50">
                                          <i className="ph-bold ph-info text-[10px]"></i>
                                          Quick Approved
                                        </span>
                                      )
                                    )}
                                  </div>
                                </td>
                                <td className="p-4 text-gray-600 dark:text-zinc-300">
                                  <div className="text-xs">
                                    {reviewed.date}
                                  </div>
                                  <div className="text-[10px] opacity-70">
                                    {reviewed.time}
                                  </div>
                                </td>
                                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleViewDetails(n)}
                                            className="h-9 w-9 cursor-pointer rounded-brand border-gray-200 bg-white p-0 text-gray-400 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-500 dark:hover:border-blue-800 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
                                          >
                                            <i className="ph-bold ph-eye text-base"></i>
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-zinc-900 text-white border-zinc-800">
                                          <p className="text-[10px] font-bold">Document preview</p>
                                          <p className="text-[9px] opacity-80">Open full view of this record</p>
                                        </TooltipContent>
                                      </Tooltip>

                                      {activeTab !== "archive" && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="outline"
                                              size="icon"
                                              onClick={() => handleAction(n.id, isUnread ? "markRead" : "markUnread")}
                                              className="h-9 w-9 cursor-pointer rounded-brand border-gray-200 bg-white p-0 text-gray-400 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-500 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400"
                                            >
                                              <i className={cn("ph-bold text-base", isUnread ? "ph-checks" : "ph-envelope")}></i>
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent className="bg-zinc-900 text-white border-zinc-800">
                                            <p className="text-[10px] font-bold">Inbox status</p>
                                            <p className="text-[9px] opacity-80">{isUnread ? "Mark as read" : "Mark as unread"}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}

                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleAction(n.id, activeTab === "inbox" ? "archive" : "unarchive")}
                                            className="h-9 w-9 cursor-pointer rounded-brand border-gray-200 bg-white p-0 text-gray-400 shadow-sm transition-all hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-500 dark:hover:border-amber-800 dark:hover:bg-amber-950/40 dark:hover:text-amber-400"
                                          >
                                            <i className={cn("ph-bold text-base", activeTab === "inbox" ? "ph-archive" : "ph-tray")}></i>
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-zinc-900 text-white border-zinc-800">
                                          <p className="text-[10px] font-bold">Storage action</p>
                                          <p className="text-[9px] opacity-80">{activeTab === "inbox" ? "Archive notification" : "Restore to inbox"}</p>
                                        </TooltipContent>
                                      </Tooltip>

                                    {n.approval_status === "Declined" &&
                                      activeTab !== "archive" &&
                                      onRescan && (
                                        <Button
                                          onClick={() =>
                                            onRescan(
                                              n.student_no,
                                              n.doc_type,
                                              n.id,
                                              n.original_filename,
                                              n.mime_type
                                            )
                                          }
                                          className="h-9 rounded-brand btn-brand-red px-3 text-xs font-black tracking-wider shadow-xs transition-all active:scale-95 whitespace-nowrap dark:shadow-none"
                                        >
                                          <i className="ph-bold ph-arrow-counter-clockwise mr-1.5 text-xs"></i>
                                          Re-scan
                                        </Button>
                                      )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {total > 0 && (
                    <div className="flex items-center justify-between border-t border-gray-100 bg-white p-6 px-8 rounded-b-brand dark:border-white/10 dark:bg-card">
                      <div className="flex items-center gap-8 select-none cursor-default">
                        <div className="flex items-center gap-6 text-[11px] font-black text-gray-400 tracking-widest dark:text-zinc-500">
                          <span>
                            Showing <strong className="text-gray-900 dark:text-zinc-50">{items.length}</strong> out of <strong className="text-gray-900 dark:text-zinc-50">{total.toLocaleString()}</strong> entries
                            {unreadCount > 0 ? (
                              <>
                                {" "}
                                •{" "}
                                <strong className="text-pup-maroon dark:text-primary">
                                  {unreadCount.toLocaleString()}
                                </strong>{" "}
                                unread
                              </>
                            ) : null}
                          </span>

                          <div className="flex items-center gap-3 border-l border-gray-200 pl-6 dark:border-white/10">
                            <span className="text-[10px] opacity-60">Rows:</span>
                            <Select
                              className="h-8 w-16 cursor-pointer rounded-brand border border-gray-300 bg-white px-2 text-[10px] font-bold text-gray-700 focus:ring-1 focus:ring-pup-maroon focus:outline-none transition-all hover:bg-gray-50 dark:bg-card dark:text-zinc-200 dark:hover:bg-white/10 dark:border-white/10"
                              value={itemsPerPage}
                              onChange={handleItemsPerPageChange}
                            >
                              <option value={10}>10</option>
                              <option value={20}>20</option>
                              <option value={50}>50</option>
                              <option value={100}>100</option>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3 select-none">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={displayPage <= 1}
                          onClick={() => {
                            setPage((p) => Math.max(1, p - 1))
                            setJumpPage(String(Math.max(1, displayPage - 1)))
                          }}
                          className="h-10 rounded-brand border border-gray-300 bg-white px-5 text-[10px] font-black tracking-widest text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-30 dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                        >
                          <i className="ph-bold ph-caret-left mr-2 text-base"></i>
                          Prev
                        </Button>

                        <div className="flex h-9 min-w-[48px] cursor-default items-center justify-center rounded-brand border border-gray-200 bg-white px-3 text-[11px] font-black text-gray-900 shadow-sm dark:border-white/10 dark:bg-card dark:text-zinc-50 dark:shadow-none">
                          {displayPage}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          disabled={displayPage >= totalPages}
                          onClick={() => {
                            setPage((p) => Math.min(totalPages, p + 1))
                            setJumpPage(String(Math.min(totalPages, displayPage + 1)))
                          }}
                          className="h-10 rounded-brand border border-gray-300 bg-white px-5 text-[10px] font-black tracking-widest text-gray-500 shadow-sm transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-30 dark:bg-card dark:text-zinc-400 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                        >
                          Next
                          <i className="ph-bold ph-caret-right ml-2 text-base"></i>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
        </div>

        <Dialog
          open={detailModalOpen}
          onOpenChange={(isOpen) => {
            setDetailModalOpen(isOpen)
            if (!isOpen) {
              setIsFullscreen(false)
              // We delay clearing selectedNotif slightly to avoid flicker during close animation
              setTimeout(() => setSelectedNotif(null), 300)
            }
          }}
        >
          <DialogContent className="flex h-[90vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden border border-gray-200 bg-gray-100 p-0 shadow-2xl transition-all duration-300 xl:max-w-[1400px] rounded-brand dark:border-white/10 dark:bg-muted">
            <DialogHeader className="shrink-0 border-b border-gray-100 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-pup-maroon dark:text-primary shadow-sm dark:border-white/10 dark:bg-card">
                    <i className="ph-duotone ph-file-pdf text-2xl"></i>
                  </div>
                  <div className="min-w-0 text-left">
                    <DialogTitle className="text-xl leading-none font-black tracking-tight text-gray-900 dark:text-zinc-50">
                      Document Review: {selectedNotif?.doc_type || "Loading..."}
                    </DialogTitle>
                    <p className="mt-1.5 text-sm font-medium text-gray-500 dark:text-zinc-400">
                      Viewing review details for student {selectedNotif?.student_no}.
                    </p>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="relative flex flex-1 overflow-hidden bg-gray-100 dark:bg-muted">
              {/* Fullscreen Overlay */}
              {isFullscreen && selectedNotif && (
                <div className="fixed inset-0 z-[9999] flex flex-col bg-white dark:bg-card animate-in fade-in duration-300">
                  <div className="absolute top-4 right-4 z-[10000]">
                    <Button
                      variant="default"
                      size="icon"
                      onClick={() => setIsFullscreen(false)}
                      className="h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md border-0 active:scale-95 transition-all"
                    >
                      <i className="ph-bold ph-x text-lg"></i>
                    </Button>
                  </div>
                  <iframe
                    src={`/api/documents/${selectedNotif.id}#toolbar=0&navpanes=0`}
                    className="w-full h-full border-0"
                    title="PDF Fullscreen Preview"
                  />
                </div>
              )}

              {/* Left: Document Preview */}
              <div className="flex-1 bg-white border-r border-gray-200 dark:bg-zinc-900 dark:border-white/10 relative">
                {selectedNotif ? (
                  <iframe
                    src={`/api/documents/${selectedNotif.id}#toolbar=0&navpanes=0`}
                    className="w-full h-full border-0"
                    title="PDF Preview"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-white dark:bg-card">
                    <Skeleton className="h-full w-full" />
                  </div>
                )}
              </div>

              {/* Right: metadata & decision */}
              <div className="w-[400px] hidden xl:flex flex-col overflow-y-auto p-8 space-y-10 bg-white dark:bg-card">
                <div>
                  <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 pb-2 dark:text-zinc-400 dark:border-white/10">Student Record</h4>
                  <div className="mt-5 space-y-5">
                    <div>
                      <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Student Name</label>
                      <p className="text-base font-bold text-gray-900 dark:text-zinc-50">{selectedNotif?.student_name || "—"}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Student Number</label>
                      <p className="text-base font-bold text-gray-900 dark:text-zinc-50">{selectedNotif?.student_no}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Document Category</label>
                      <div className="mt-1.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-pup-maroon/20 bg-pup-maroon/10 text-[10px] font-black uppercase tracking-wider text-pup-maroon dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-400">
                          <i className="ph-bold ph-file text-[11px]"></i>
                          {selectedNotif?.doc_type}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 pb-2 dark:text-zinc-400 dark:border-white/10">Review Summary</h4>
                  <div className="mt-5 space-y-5">
                    <div>
                      <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Approval Status</label>
                      <div className="mt-1.5">
                        {selectedNotif && (() => {
                          const ui = statusUi(selectedNotif.approval_status)
                          return (
                            <div className={cn("flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider shadow-xs", ui.badge)}>
                              <i className={cn("ph-fill text-[11px]", ui.icon)}></i>
                              {ui.label}
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                    {selectedNotif?.approval_status === "Declined" && (
                      <div className="p-5 rounded-2xl bg-red-50 border border-red-100 dark:bg-red-950/30 dark:border-red-900/50">
                        <label className="text-[10px] font-black tracking-widest text-red-600 uppercase">Rejection Reason</label>
                        <p className="mt-2 text-sm font-medium text-red-800 dark:text-red-300 leading-relaxed italic">
                          &quot;{selectedNotif?.review_note || "No specific reason provided by reviewer."}&quot;
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Reviewed By</label>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <p className="text-xs font-bold text-gray-700 dark:text-zinc-300">{selectedNotif?.reviewed_by || "—"}</p>
                          {selectedNotif?.reviewed_by && (
                            selectedNotif.is_previewed === 1 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-black text-green-700 border border-green-200 dark:bg-emerald-950/20 dark:text-emerald-500/90 dark:border-emerald-900/50">
                                Verified Preview
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-black text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-500/90 dark:border-amber-900/50">
                                Quick Approved
                              </span>
                            )
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Decision Date</label>
                        <p className="text-xs font-bold text-gray-700 dark:text-zinc-300">
                          {selectedNotif && formatPHDateTimeParts(selectedNotif.reviewed_at).date}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 justify-between items-center gap-3 border-t border-gray-100 bg-white p-4 dark:border-white/10 dark:bg-card">
              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      className={cn(
                        "h-11 w-11 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-card transition-all hover:bg-gray-50 dark:hover:bg-white/10 shadow-sm dark:shadow-none",
                        isFullscreen && "bg-pup-maroon dark:bg-red-600 text-white hover:bg-pup-darkMaroon border-pup-darkMaroon"
                      )}
                    >
                      <i className={cn("ph-bold text-xl", isFullscreen ? "ph-corners-in" : "ph-corners-out")}></i>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-zinc-900 text-white border-zinc-800">
                    <p className="text-[10px] font-bold">Document Zoom</p>
                    <p className="text-[9px] opacity-80">Toggle high-focus preview mode</p>
                  </TooltipContent>
                </Tooltip>

                {activeTab !== "archive" && (
                  selectedNotif?.is_read === 1 ? (
                    <Button
                      variant="outline"
                      onClick={async () => {
                        await handleAction(selectedNotif.id, "markUnread");
                        setDetailModalOpen(false);
                      }}
                      className="h-11 rounded-brand border-gray-300 px-6 text-sm font-bold tracking-wide text-gray-600 hover:border-gray-300 hover:bg-amber-50 hover:text-amber-600 dark:hover:text-amber-500 shadow-sm transition-colors dark:text-zinc-300 dark:border-white/10"
                    >
                      <i className="ph-bold ph-envelope mr-2"></i>
                      Mark as Unread
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={async () => {
                        await handleAction(selectedNotif?.id, "markRead");
                        setDetailModalOpen(false);
                      }}
                      className="h-11 rounded-brand border-gray-300 px-6 text-sm font-bold tracking-wide text-gray-600 hover:border-gray-300 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:text-emerald-500 shadow-sm transition-colors dark:text-zinc-300 dark:border-white/10"
                    >
                      <i className="ph-bold ph-checks mr-2"></i>
                      Mark as Read
                    </Button>
                  )
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setDetailModalOpen(false)}
                  className="h-11 rounded-brand border-gray-300 px-6 text-sm font-bold tracking-wide text-gray-600 hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 shadow-sm transition-colors dark:text-zinc-300 dark:border-white/10"
                >
                  Close Details
                </Button>

                {selectedNotif?.approval_status === "Declined" && activeTab !== "archive" && onRescan ? (
                  <Button
                    onClick={() => {
                      onRescan(selectedNotif.student_no, selectedNotif.doc_type, selectedNotif.id, selectedNotif.original_filename, selectedNotif.mime_type)
                      setDetailModalOpen(false)
                    }}
                    className="h-11 rounded-brand btn-brand-red px-8 text-sm font-bold tracking-wide shadow-md transition-all active:scale-95 dark:shadow-none"
                  >
                    <i className="ph-bold ph-arrow-counter-clockwise mr-2"></i>
                    Re-scan Document
                  </Button>
                ) : (
                  <a
                    href={`/api/documents/${selectedNotif?.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center rounded-brand btn-brand-red px-8 text-sm font-bold tracking-wide shadow-md transition-all active:scale-95 dark:shadow-none"
                  >
                    <i className="ph-bold ph-arrow-square-out mr-2 text-lg"></i>
                    Open Full View
                  </a>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

