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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return <i className="ph-bold ph-caret-up-down ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"></i>
  }
  return sortOrder === "ASC" ? (
    <i className="ph-bold ph-caret-up ml-1 text-[12px] text-gray-400"></i>
  ) : (
    <i className="ph-bold ph-caret-down ml-1 text-[12px] text-gray-400"></i>
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
      const [res] = await Promise.all([
        fetch(
          `/api/notifications?limit=${itemsPerPage}&offset=${offset}&sortBy=${sortBy}&sortOrder=${sortOrder}&tab=${activeTab}`,
          { cache: "no-store" }
        ),
        showRefreshing ? new Promise((resolve) => setTimeout(resolve, 600)) : Promise.resolve(),
      ])
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
        <Card className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
          <PageHeader
            icon="ph-bell"
            title={
              <div className="flex items-center gap-[6px]">
                System Notifications
                {activeTab === "archive" && (
                  <span className="text-[12px] font-normal text-emerald-600 dark:text-emerald-400">
                    · Restore Mode
                  </span>
                )}
              </div>
            }
            description="Real-time updates on document review decisions and system alerts."
            showBorder={false}
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
            actions={
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={unreadCount <= 0 || activeTab === "archive"}
                    onClick={markAllRead}
                    className="h-10 rounded-brand border-gray-300 px-5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:border-white/10 dark:bg-red-950/30 dark:text-zinc-200 dark:shadow-none dark:hover:border-zinc-700 dark:hover:text-red-500"
                  >
                    <i className="ph-bold ph-checks mr-1.5"></i>
                    Mark all as read
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={total <= 0 || activeTab === "archive"}
                    onClick={markAllUnread}
                    className="h-10 rounded-brand border-gray-300 px-5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-amber-50 hover:text-amber-600 dark:border-white/10 dark:bg-amber-950/30 dark:text-zinc-200 dark:shadow-none dark:hover:border-zinc-700 dark:hover:text-amber-500"
                  >
                    <i className="ph-bold ph-envelopes mr-1.5"></i>
                    Mark all as unread
                  </Button>
                </div>

                <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />

                <RefreshButton
                  onRefresh={handleRefresh}
                  isLoading={isRefreshing}
                  title="Refresh notifications"
                />
              </div>
            }
          />
          {/* Inbox / Archive Toggle */}
          <div className="flex w-full gap-[24px] select-none px-6 pt-3">
            <button
              type="button"
              onClick={() => setActiveTab("inbox")}
              className={cn(
                "relative pb-2 text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer",
                activeTab === "inbox"
                  ? "text-black after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-black dark:text-zinc-50 dark:after:bg-zinc-50"
                  : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
              )}
            >
              Inbox ({inboxCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("archive")}
              className={cn(
                "relative pb-2 text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer",
                activeTab === "archive"
                  ? "text-black after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-black dark:text-zinc-50 dark:after:bg-zinc-50"
                  : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
              )}
            >
              Archive ({archiveCount})
            </button>
          </div>
        </Card>

        <div className="flex flex-col h-auto gap-4">

          {isLoading && !isRefreshing ? (
              <NotificationsSkeleton />
            ) : error ? (
              <Empty className="flex h-[320px] flex-col items-center justify-center border-0 text-center text-gray-500 dark:text-zinc-400">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
                    <i className="ph-duotone ph-warning-circle text-xl text-pup-maroon dark:text-primary" />
                  </EmptyMedia>
                  <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
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
                  className="overflow-hidden rounded-brand border border-gray-200 dark:border-white/10 bg-white dark:bg-card shadow-sm dark:shadow-none transition-all duration-slow animate-fade-up"
                >
                  <div className="overflow-x-auto rounded-[inherit]">
                    <table className="min-w-full table-fixed text-sm">
                      <thead className="sticky top-0 z-10 border-b-[0.5px] border-black/10 dark:border-white/10 bg-white dark:bg-card">
                        <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                          <th className="w-32 p-4">
                            <button
                              onClick={() => handleSort("decision")}
                              className={cn(
                                "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                                sortBy === "decision" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                              )}
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
                              className={cn(
                                "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                                sortBy === "student_no" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                              )}
                            >
                              Student No{" "}
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
                              className={cn(
                                "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                                sortBy === "student_name" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                              )}
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
                              className={cn(
                                "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                                sortBy === "doc_type" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                              )}
                            >
                              Document Type{" "}
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
                              className={cn(
                                "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                                sortBy === "file" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                              )}
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
                              className={cn(
                                "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                                sortBy === "reviewed_by" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                              )}
                            >
                              Reviewed By{" "}
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
                              className={cn(
                                "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                                sortBy === "reviewed_at" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                              )}
                            >
                              Reviewed{" "}
                              <SortIndicator
                                column="reviewed_at"
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                              />
                            </button>
                          </th>
                          <th className="w-40 p-4 text-right text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">Actions</th>
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
                                      <i className="ph-duotone ph-magnifying-glass text-xl text-gray-300 dark:text-zinc-600"></i>
                                    </EmptyMedia>
                                  </div>
                                  <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
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
                                  "group h-[52px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0 transition-all duration-fast hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 select-none",
                                  isUnread && "bg-amber-50 dark:bg-amber-950/40"
                                )}
                              >
                                <td className="py-0 px-4 align-middle">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={cn(
                                        "inline-flex w-fit items-center justify-center gap-1 rounded-[4px] px-[8px] py-[3px] border text-[11px] font-medium tracking-[0.04em]",
                                        ui.badge
                                      )}
                                    >
                                      <i className={cn("ph-fill text-[11px]", ui.icon)}></i>
                                      {ui.label}
                                    </div>
                                    {isUnread ? (
                                      <span className="animate-pulse text-[9px] font-semibold tracking-widest text-pup-maroon dark:text-primary">
                                        New
                                      </span>
                                    ) : null}
                                  </div>
                                </td>
                                <td className="py-0 px-4 align-middle text-[13px] font-normal text-[#111111] dark:text-zinc-300">
                                  {n.student_no}
                                </td>
                                <td className="py-0 px-4 align-middle text-[14px] font-medium text-[#111111] dark:text-zinc-50">
                                  {n.student_name || "—"}
                                </td>
                                <td className="py-0 px-4 align-middle">
                                  <div
                                    className="inline-flex w-fit items-center justify-center gap-1 rounded-[4px] px-[8px] py-[3px] border border-pup-maroon/20 bg-pup-maroon/10 text-[11px] font-medium tracking-[0.04em] text-pup-maroon whitespace-nowrap dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-400"
                                  >
                                    <i className="ph-bold ph-file text-[11px]"></i>
                                    {n.doc_type}
                                  </div>
                                </td>
                                <td className="py-0 px-4 align-middle text-[#111111] dark:text-zinc-300">
                                  <div className="max-w-[200px] truncate text-[13px] font-normal">
                                    {n.original_filename}
                                  </div>
                                  {n.review_note && (
                                    <div className="text-[12px] font-normal text-[#8E8E93] dark:text-zinc-500 mt-[2px] italic">
                                      Note: {n.review_note}
                                    </div>
                                  )}
                                </td>
                                 <td className="py-0 px-4 align-middle text-[#111111] dark:text-zinc-300">
                                  <div className="flex flex-col gap-0.5 text-[13px] font-normal">
                                    <span className="truncate text-[13px] font-normal text-[#111111] dark:text-zinc-300">{n.reviewed_by || "—"}</span>
                                    {n.reviewed_by && (
                                      n.is_previewed === 1 ? (
                                        <span className="inline-flex w-fit items-center gap-1 rounded-[4px] bg-green-50 px-[6px] py-[2px] text-[10px] font-medium tracking-[0.02em] text-green-700 border border-green-200 dark:bg-emerald-950/20 dark:text-emerald-500/90 dark:border-emerald-900/50">
                                          <i className="ph-bold ph-check-circle text-[10px]"></i>
                                          Verified Preview
                                        </span>
                                      ) : (
                                        <span className="inline-flex w-fit items-center gap-1 rounded-[4px] bg-amber-50 px-[6px] py-[2px] text-[10px] font-medium tracking-[0.02em] text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-500/90 dark:border-amber-900/50">
                                          <i className="ph-bold ph-info text-[10px]"></i>
                                          Quick Approved
                                        </span>
                                      )
                                    )}
                                  </div>
                                </td>
                                <td className="py-0 px-4 align-middle text-[#111111] dark:text-zinc-300">
                                  <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#111111] dark:text-zinc-100">
                                    {reviewed.date}
                                  </div>
                                  <div className="text-[12px] font-normal text-[#8E8E93] dark:text-zinc-500 mt-[2px]">
                                    {reviewed.time}
                                  </div>
                                </td>
                                <td className="py-0 px-4 align-middle" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() => handleViewDetails(n)}
                                            className="w-7 h-7 rounded-[6px] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/10 text-[#C7C7CC] dark:text-zinc-600 transition-colors hover:text-blue-500 dark:hover:text-blue-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center"
                                          >
                                            <i className="ph-bold ph-eye text-[16px]"></i>
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-zinc-900 text-white border-zinc-800">
                                          <p className="text-[10px] font-semibold">Document preview</p>
                                          <p className="text-[9px] opacity-80">Open full view of this record</p>
                                        </TooltipContent>
                                      </Tooltip>

                                      {activeTab !== "archive" && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              onClick={() => handleAction(n.id, isUnread ? "markRead" : "markUnread")}
                                              className="w-7 h-7 rounded-[6px] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/10 text-[#C7C7CC] dark:text-zinc-600 transition-colors hover:text-emerald-600 dark:hover:text-emerald-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center"
                                            >
                                              <i className={cn("ph-bold text-[16px]", isUnread ? "ph-checks" : "ph-envelope")}></i>
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent className="bg-zinc-900 text-white border-zinc-800">
                                            <p className="text-[10px] font-semibold">Inbox status</p>
                                            <p className="text-[9px] opacity-80">{isUnread ? "Mark as read" : "Mark as unread"}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}

                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() => handleAction(n.id, activeTab === "inbox" ? "archive" : "unarchive")}
                                            className="w-7 h-7 rounded-[6px] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/10 text-[#C7C7CC] dark:text-zinc-600 transition-colors hover:text-amber-500 dark:hover:text-amber-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center"
                                          >
                                            <i className={cn("ph-bold text-[16px]", activeTab === "inbox" ? "ph-archive" : "ph-archive-restore")}></i>
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-zinc-900 text-white border-zinc-800">
                                          <p className="text-[10px] font-semibold">Storage action</p>
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
                                          className="h-7 rounded-[6px] btn-brand-red px-3 text-[11px] font-semibold tracking-wider shadow-xs transition-all active:scale-95 whitespace-nowrap dark:shadow-none"
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
                      <div className="flex items-center gap-8">
                        <div className="flex items-center gap-6 text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                          <span>
                            Showing {items.length} of {total.toLocaleString()}
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

                          <div className="flex items-center gap-1.5 border-l border-gray-200 pl-6 dark:border-white/10">
                            <span className="text-[12px] text-gray-400 dark:text-zinc-500">Rows:</span>
                            <div className="flex items-center gap-1">
                              {[10, 20, 50, 100].map((size) => (
                                <button
                                  key={size}
                                  type="button"
                                  onClick={() => {
                                    setItemsPerPage(size)
                                    setPage(1)
                                  }}
                                  className={`px-2 py-0.5 rounded-[4px] text-[12px] font-normal cursor-pointer transition-colors border-0 ${
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
                          disabled={displayPage <= 1}
                          onClick={() => {
                            setPage((p) => Math.max(1, p - 1))
                            setJumpPage(String(Math.max(1, displayPage - 1)))
                          }}
                          className="h-8 bg-transparent text-[12px] font-normal text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
                        >
                          Prev
                        </button>

                        <div className="flex h-8 min-w-[32px] items-center justify-center rounded-[6px] border border-gray-200/80 bg-white px-2.5 text-[12px] font-medium text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-100">
                          {displayPage}
                        </div>

                        <button
                          disabled={displayPage >= totalPages}
                          onClick={() => {
                            setPage((p) => Math.min(totalPages, p + 1))
                            setJumpPage(String(Math.min(totalPages, displayPage + 1)))
                          }}
                          className="h-8 bg-transparent text-[12px] font-normal text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
                        >
                          Next
                        </button>
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
          <DialogContent className="flex h-[90vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden border border-gray-200 bg-gray-100 p-0 shadow-2xl transition-all duration-normal xl:max-w-[1400px] rounded-brand dark:border-white/10 dark:bg-muted">
            <DialogHeader className="shrink-0 border-b border-gray-100 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-pup-maroon dark:text-primary shadow-sm dark:border-white/10 dark:bg-card">
                    <i className="ph-duotone ph-file-pdf text-xl"></i>
                  </div>
                  <div className="min-w-0 text-left">
                    <DialogTitle className="text-xl font-semibold tracking-tight text-gray-900 dark:text-zinc-50">
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
                <div className="fixed inset-0 z-[9999] flex flex-col bg-white dark:bg-card animate-in fade-in duration-normal">
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
                  <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest border-b border-gray-100 pb-2 dark:text-zinc-400 dark:border-white/10">Student Record</h4>
                  <div className="mt-5 space-y-5">
                    <div>
                      <label className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Student Name</label>
                      <p className="text-base font-semibold text-gray-900 dark:text-zinc-50">{selectedNotif?.student_name || "—"}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Student Number</label>
                      <p className="text-base font-semibold text-gray-900 dark:text-zinc-50">{selectedNotif?.student_no}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold tracking-widest text-gray-400">Document Category</label>
                      <div className="mt-1.5">
                        <Badge
                          variant="outline"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-pup-maroon/20 bg-pup-maroon/10 text-[10px] font-semibold tracking-wider text-pup-maroon dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-400 shadow-none"
                        >
                          <i className="ph-bold ph-file text-[11px]"></i>
                          {selectedNotif?.doc_type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-semibold text-gray-500 tracking-widest border-b border-gray-100 pb-2 dark:text-zinc-400 dark:border-white/10">Review Summary</h4>
                  <div className="mt-5 space-y-5">
                    <div>
                      <label className="text-[10px] font-semibold tracking-widest text-gray-400">Approval Status</label>
                      <div className="mt-1.5">
                        {selectedNotif && (() => {
                          const ui = statusUi(selectedNotif.approval_status)
                          return (
                            <Badge
                              variant="outline"
                              className={cn("flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold tracking-wider shadow-none", ui.badge)}
                            >
                              <i className={cn("ph-fill text-[11px]", ui.icon)}></i>
                              {ui.label}
                            </Badge>
                          )
                        })()}
                      </div>
                    </div>
                    {selectedNotif?.approval_status === "Declined" && (
                      <div className="p-5 rounded-2xl bg-red-50 border border-red-100 dark:bg-red-950/30 dark:border-red-900/50">
                        <label className="text-[10px] font-semibold tracking-widest text-red-600 uppercase">Rejection Reason</label>
                        <p className="mt-2 text-sm font-medium text-red-800 dark:text-red-300 italic">
                          &quot;{selectedNotif?.review_note || "No specific reason provided by reviewer."}&quot;
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Reviewed By</label>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <p className="text-xs font-semibold text-gray-700 dark:text-zinc-300">{selectedNotif?.reviewed_by || "—"}</p>
                          {selectedNotif?.reviewed_by && (
                            selectedNotif.is_previewed === 1 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-semibold text-green-700 border border-green-200 dark:bg-emerald-950/20 dark:text-emerald-500/90 dark:border-emerald-900/50">
                                Verified Preview
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-500/90 dark:border-amber-900/50">
                                Quick Approved
                              </span>
                            )
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Decision Date</label>
                        <p className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
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
                    <p className="text-[10px] font-semibold">Document Zoom</p>
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
                      className="h-11 rounded-brand border-gray-300 px-6 text-sm font-semibold tracking-wide text-gray-600 hover:border-gray-300 hover:bg-amber-50 hover:text-amber-600 dark:hover:text-amber-500 shadow-sm transition-colors dark:text-zinc-300 dark:border-white/10"
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
                      className="h-11 rounded-brand border-gray-300 px-6 text-sm font-semibold tracking-wide text-gray-600 hover:border-gray-300 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:text-emerald-500 shadow-sm transition-colors dark:text-zinc-300 dark:border-white/10"
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
                  className="h-11 rounded-brand border-gray-300 px-6 text-sm font-semibold tracking-wide text-gray-600 hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 shadow-sm transition-colors dark:text-zinc-300 dark:border-white/10"
                >
                  Close Details
                </Button>

                {selectedNotif?.approval_status === "Declined" && activeTab !== "archive" && onRescan ? (
                  <Button
                    onClick={() => {
                      onRescan(selectedNotif.student_no, selectedNotif.doc_type, selectedNotif.id, selectedNotif.original_filename, selectedNotif.mime_type)
                      setDetailModalOpen(false)
                    }}
                    className="h-11 rounded-brand btn-brand-red px-8 text-sm font-semibold tracking-wide shadow-md transition-all active:scale-95 dark:shadow-none"
                  >
                    <i className="ph-bold ph-arrow-counter-clockwise mr-2"></i>
                    Re-scan Document
                  </Button>
                ) : (
                  <a
                    href={`/api/documents/${selectedNotif?.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center rounded-brand btn-brand-red px-8 text-sm font-semibold tracking-wide shadow-md transition-all active:scale-95 dark:shadow-none"
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

