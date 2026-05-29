"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
        label: "APPROVED",
      }
    case "Declined":
      return {
        badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-500/90 dark:border-red-900/50",
        icon: "ph-x-circle",
        label: "DECLINED",
      }
    default:
      return {
        badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-500/90 dark:border-amber-900/50",
        icon: "ph-clock",
        label: "PENDING",
      }
  }
}

export default function NotificationsTab({
  onPreviewDocument,
  onUnreadChange,
  onRescan,
  isLoading,
  onRefresh,
}) {
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

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage) || 1)
  const displayPage = Math.min(page, totalPages)
  const offset = (displayPage - 1) * itemsPerPage

  const load = useCallback(async () => {
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
      onUnreadChange?.(Number(data.unreadCount || 0))
    } catch (e) {
      setError(e?.message || "Failed to load notifications")
    }
  }, [offset, itemsPerPage, sortBy, sortOrder, activeTab, onUnreadChange])

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await load()
      await new Promise((resolve) => setTimeout(resolve, 600))
    } finally {
      setIsRefreshing(false)
    }
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
      onUnreadChange?.(nextUnread)
      await load()
    } catch {
      // silent
    }
  }, [load, onUnreadChange])

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
    <div className="animate-fade-up font-inter flex w-full flex-col gap-6">
      <Card className="flex flex-col overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
        <PageHeader
          icon="ph-bell"
          title="System Notifications"
          description="Real-time updates on document review decisions and system alerts."
          actions={
            <div className="flex items-center gap-2">
              <div className="mr-2 flex flex-col items-end gap-1">
                <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase dark:text-zinc-500">
                  Dataset Sync
                </p>
                <p className="text-[10px] font-medium whitespace-nowrap text-gray-500 dark:text-zinc-400">
                  Showing real-time alerts
                </p>
              </div>
              <RefreshButton
                onRefresh={handleRefresh}
                isLoading={isRefreshing}
                title="Refresh Notifications"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={unreadCount <= 0}
                onClick={markAllRead}
                className="h-10 rounded-brand border-gray-300 px-5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:border-white/10 dark:bg-red-950/30 dark:text-zinc-200 dark:shadow-none dark:hover:border-zinc-700 dark:hover:text-red-500"
              >
                <i className="ph-bold ph-checks mr-1.5"></i>
                MARK ALL AS READ
              </Button>
            </div>
          }
        />
      </Card>

      <div className="flex flex-col h-auto gap-4">
        <div className="flex shrink-0 select-none flex-wrap items-end justify-between gap-6">
          <div className="flex w-full flex-col gap-1.5 sm:w-auto">
            <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase dark:text-zinc-500">
              Notification View
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
                  INBOX
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
                  ARCHIVE
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

        {isLoading ? (
            <div className="flex h-full min-h-[400px] w-full flex-1 flex-col items-center justify-center bg-white p-10 dark:bg-card">
              <div className="flex flex-col items-center gap-4">
                <i className="ph-bold ph-spinner animate-spin text-4xl text-pup-maroon dark:text-primary" />
                <p className="text-sm font-bold tracking-widest text-gray-500 uppercase dark:text-zinc-400">
                  Loading...
                </p>
              </div>
            </div>
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
                className={cn(
                  "overflow-hidden rounded-brand border border-gray-200 dark:border-white/10 bg-white dark:bg-card shadow-sm dark:shadow-none transition-all duration-500 animate-fade-up",
                  isRefreshing ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
                )}
              >
                {isRefreshing && (
                  <div className="absolute inset-0 z-20 flex h-full w-full flex-col items-center justify-center rounded-[inherit] bg-white/90 p-10 backdrop-blur-sm dark:bg-card/90">
                    <div className="flex flex-col items-center gap-4">
                      <i className="ph-bold ph-spinner animate-spin text-4xl text-pup-maroon dark:text-primary" />
                      <p className="text-sm font-bold tracking-widest text-gray-500 uppercase dark:text-zinc-400">
                        Refreshing...
                      </p>
                    </div>
                  </div>
                )}
                <div className="overflow-x-auto rounded-[inherit]">
                  <table className="min-w-full table-fixed text-sm">
                    <thead className="bg-gray-50 select-none dark:bg-muted">
                      <tr className="text-left text-[10px] font-black tracking-widest text-gray-600 uppercase dark:text-zinc-300">
                        <th className="w-32 p-4">
                          <button
                            onClick={() => handleSort("decision")}
                            className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none dark:text-zinc-300"
                          >
                            DECISION{" "}
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
                            STUDENT NO{" "}
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
                            NAME{" "}
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
                            TYPE{" "}
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
                            FILE{" "}
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
                            REVIEWED BY{" "}
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
                            REVIEWED{" "}
                            <SortIndicator
                              column="reviewed_at"
                              sortBy={sortBy}
                              sortOrder={sortOrder}
                            />
                          </button>
                        </th>
                        <th className="w-48 p-4 text-right">ACTIONS</th>
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
                                      "flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider shadow-xs transition-all",
                                      ui.badge
                                    )}
                                  >
                                    <i className={cn("ph-fill text-[10px]", ui.icon)}></i>
                                    {ui.label}
                                  </div>
                                  {isUnread ? (
                                    <span className="animate-pulse text-[9px] font-extrabold tracking-widest text-pup-maroon uppercase dark:text-primary">
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
                                <span className="inline-flex items-center rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-[10px] font-black tracking-wider text-pup-maroon uppercase whitespace-nowrap dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
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
                                {n.reviewed_by || "—"}
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
                                <div className="flex flex-wrap justify-end gap-1.5">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          onClick={() =>
                                            onPreviewDocument?.(
                                              n.doc_type,
                                              n.student_name,
                                              n.student_no,
                                              n.id
                                            )
                                          }
                                          className="h-9 w-9 cursor-pointer rounded-full border-gray-200 bg-white p-0 text-gray-400 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-500 dark:hover:border-blue-800 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
                                        >
                                          <i className="ph-bold ph-eye text-base"></i>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent className="rounded-brand border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-blue-800 shadow-xl dark:border-blue-900/50 dark:bg-blue-950/90 dark:text-blue-400">
                                        Preview Document
                                      </TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          onClick={() => handleAction(n.id, isUnread ? "markRead" : "markUnread")}
                                          className="h-9 w-9 cursor-pointer rounded-full border-gray-200 bg-white p-0 text-gray-400 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-500 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400"
                                        >
                                          <i className={cn("ph-bold text-base", isUnread ? "ph-checks" : "ph-envelope")}></i>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent className="rounded-brand border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-800 shadow-xl dark:border-emerald-900/50 dark:bg-emerald-950/90 dark:text-emerald-400">
                                        {isUnread ? "Mark as Read" : "Mark as Unread"}
                                      </TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          onClick={() => handleAction(n.id, activeTab === "inbox" ? "archive" : "unarchive")}
                                          className="h-9 w-9 cursor-pointer rounded-full border-gray-200 bg-white p-0 text-gray-400 shadow-sm transition-all hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-500 dark:hover:border-amber-800 dark:hover:bg-amber-950/40 dark:hover:text-amber-400"
                                        >
                                          <i className={cn("ph-bold text-base", activeTab === "inbox" ? "ph-archive" : "ph-tray")}></i>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent className="rounded-brand border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-800 shadow-xl dark:border-amber-900/50 dark:bg-amber-950/90 dark:text-amber-400">
                                        {activeTab === "inbox" ? "Archive Notification" : "Restore to Inbox"}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  {n.approval_status === "Declined" &&
                                    onRescan && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          onRescan(
                                            n.student_no,
                                            n.doc_type,
                                            n.id,
                                            n.original_filename,
                                            n.mime_type
                                          )
                                        }
                                        className="h-9 rounded-md border-pup-maroon/30 bg-white px-3 text-xs font-bold text-pup-maroon shadow-sm transition-all hover:border-pup-maroon hover:bg-red-50 dark:bg-card dark:text-primary dark:shadow-none"
                                      >
                                        <i className="ph-bold ph-arrow-counter-clockwise mr-1.5"></i>
                                        RE-SCAN
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
                      <div className="flex items-center gap-6 text-[11px] font-black text-gray-400 uppercase tracking-widest dark:text-zinc-500">
                        <span>
                          SHOWING <strong className="text-gray-900 dark:text-zinc-50">{offset + 1}-{Math.min(offset + itemsPerPage, total)}</strong> OUT OF <strong className="text-gray-900 dark:text-zinc-50">{total.toLocaleString()}</strong> ENTRIES
                          {unreadCount > 0 ? (
                            <>
                              {" "}
                              •{" "}
                              <strong className="text-pup-maroon dark:text-primary">
                                {unreadCount.toLocaleString()}
                              </strong>{" "}
                              UNREAD
                            </>
                          ) : null}
                        </span>

                        <div className="flex items-center gap-3 border-l border-gray-200 pl-6 dark:border-white/10">
                          <span className="text-[10px] opacity-60">ROWS:</span>
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
                        className="h-10 rounded-brand border border-gray-300 bg-white px-5 text-[10px] font-black tracking-widest text-gray-600 uppercase shadow-sm transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-30 dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                      >
                        <i className="ph-bold ph-caret-left mr-2 text-base"></i>
                        PREV
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
                        className="h-10 rounded-brand border border-gray-300 bg-white px-5 text-[10px] font-black tracking-widest text-gray-500 uppercase shadow-sm transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-30 dark:bg-card dark:text-zinc-400 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                      >
                        NEXT
                        <i className="ph-bold ph-caret-right ml-2 text-base"></i>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
      </div>
    </div>
  )
}
