"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
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

function statusUi(status) {
  const s = String(status || "Pending")
  if (s === "Approved") {
    return {
      label: "Approved",
      badge: "bg-green-50 text-green-700 border-green-200 dark:bg-emerald-950/20 dark:text-emerald-500/90 dark:border-emerald-900/50",
      icon: "ph-fill ph-check-circle",
    }
  }
  if (s === "Declined") {
    return {
      label: "Declined",
      badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-500/90 dark:border-red-900/50",
      icon: "ph-fill ph-x-circle",
    }
  }
  return {
    label: s || "Pending",
    badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-500/90 dark:border-amber-900/50",
    icon: "ph-fill ph-clock",
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

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage) || 1)
  const displayPage = Math.min(page, totalPages)
  const offset = (displayPage - 1) * itemsPerPage

  const load = useCallback(async () => {
    setError("")
    try {
      const res = await fetch(`/api/notifications?limit=${itemsPerPage}&offset=${offset}`, { cache: "no-store" })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to load notifications")
      }
      const data = json.data || {}
      const nextItems = Array.isArray(data.items) ? data.items : []
      setItems(nextItems)
      setTotal(Number(data.total || 0))
      setUnreadCount(Number(data.unreadCount || 0))
      setLastSeenReviewedAt(data.lastSeenReviewedAt || null)
      onUnreadChange?.(Number(data.unreadCount || 0))
    } catch (e) {
      setError(e?.message || "Failed to load notifications")
    }
  }, [offset, itemsPerPage, onUnreadChange])

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await load();
      // Ensure visual feedback persists for a minimum duration
      await new Promise((resolve) => setTimeout(resolve, 600));
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setJumpPage(String(displayPage))
  }, [displayPage])

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

  const unreadCutoff = useMemo(() => {
    const s = String(lastSeenReviewedAt || "").trim()
    return s ? s : null
  }, [lastSeenReviewedAt])

  return (
    <div className="animate-fade-up font-inter flex h-full w-full flex-col">
      <Card className="flex flex-1 flex-col overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
        <PageHeader
          icon="ph-bell"
          title="System Notifications"
          description="Real-time updates on document review decisions and system alerts."
          actions={
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-end gap-1 mr-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest dark:text-zinc-500">Dataset Sync</p>
                <p className="text-[10px] font-medium text-gray-500 whitespace-nowrap dark:text-zinc-400">
                  Showing real-time alerts
                </p>
              </div>
              <RefreshButton onRefresh={handleRefresh} isLoading={isRefreshing} title="Refresh Notifications" />
              <Button
                variant="outline"
                size="sm"
                disabled={unreadCount <= 0}
                onClick={markAllRead}
                className="h-10 rounded-brand border-gray-300 px-5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 dark:text-zinc-200 dark:shadow-none dark:hover:border-zinc-700 dark:bg-red-950/30 dark:border-white/10"
              >
                <i className="ph-bold ph-checks mr-1.5"></i>
                MARK ALL AS READ
              </Button>
            </div>
          }
        />
        <CardContent className="h-auto flex flex-col p-6">
          {isLoading ? (
            <div className="flex h-full w-full flex-1 flex-col items-center justify-center bg-white p-10 min-h-[400px] dark:bg-card">
              <div className="flex flex-col items-center gap-4">
                <i className="ph-bold ph-spinner animate-spin text-4xl text-pup-maroon dark:text-primary" />
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest dark:text-zinc-400">
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
              <div className="relative h-auto w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
                {isRefreshing && (
                  <div className="absolute inset-0 z-20 flex h-full w-full flex-col items-center justify-center bg-white p-10 dark:bg-card">
                    <div className="flex flex-col items-center gap-4">
                      <i className="ph-bold ph-spinner animate-spin text-4xl text-pup-maroon dark:text-primary" />
                      <p className="text-sm font-bold text-gray-500 uppercase tracking-widest dark:text-zinc-400">
                        Generating...
                      </p>
                    </div>
                  </div>
                )}
                <table className="min-w-full text-xs">
                  <thead className="border-b border-gray-200 bg-gray-50 backdrop-blur-sm select-none dark:border-white/10 dark:bg-muted">
                    <tr className="text-left text-[10px] font-black tracking-widest text-gray-600 uppercase dark:text-zinc-300 dark:border-white/10">
                      <th className="p-4 w-32">Decision</th>
                      <th className="p-4 w-36">Student No</th>
                      <th className="p-4">Name</th>
                      <th className="p-4 w-36">Type</th>
                      <th className="p-4">File</th>
                      <th className="p-4 w-32">Reviewed By</th>
                      <th className="p-4 w-36">Reviewed</th>
                      <th className="p-4 text-right w-40">Actions</th>
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
                                <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
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
                        const isUnread =
                          unreadCutoff == null
                            ? true
                            : String(n.reviewed_at || "") > unreadCutoff
                        return (
                          <tr
                            key={n.id}
                            className={cn(
                              "group transition-all duration-200 hover:bg-gray-50 dark:bg-card dark:hover:bg-white/5 select-none",
                              isUnread && "bg-amber-50 dark:bg-amber-950/40"
                            )}
                          >
                            <td className="p-4">                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={`${ui.badge} rounded-full border px-2 py-0.5 text-[10px] font-bold shadow-xs`}
                                >
                                  <i className={`${ui.icon} mr-1.5`}></i>
                                  {ui.label}
                                </Badge>
                                {isUnread ? (
                                  <span className="animate-pulse text-[9px] font-extrabold tracking-widest text-pup-maroon dark:text-primary uppercase">
                                    New
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="p-4 font-mono text-xs font-bold text-gray-900 dark:text-zinc-50">
                              {n.student_no}
                            </td>
                            <td className="p-4 text-xs font-black text-gray-900 dark:text-zinc-50">
                              {n.student_name || "—"}
                            </td>
                            <td className="p-4">
                              <span className="inline-flex items-center rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-pup-maroon dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
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
                              <div className="font-mono text-xs">
                                {reviewed.date}
                              </div>
                              <div className="font-mono text-[10px] opacity-70">
                                {reviewed.time}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    onPreviewDocument?.(
                                      n.doc_type,
                                      n.student_name,
                                      n.student_no,
                                      n.id
                                    )
                                  }
                                  className="h-9 rounded-md border-gray-300 px-3 text-xs font-bold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 dark:text-zinc-200 dark:shadow-none dark:hover:border-zinc-700 dark:bg-red-950/30 dark:border-white/10"
                                >
                                  <i className="ph-bold ph-eye mr-1.5"></i>
                                  VIEW
                                </Button>
                                {n.approval_status === "Declined" && onRescan && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onRescan(n.student_no, n.doc_type, n.id, n.original_filename, n.mime_type)}
                                    className="h-9 rounded-md border-pup-maroon/30 hover:border-pup-maroon bg-white text-pup-maroon dark:text-primary px-3 text-xs font-bold shadow-sm transition-all hover:bg-red-50 dark:bg-card dark:text-primary dark:shadow-none"
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
                <div className="-mx-6 mt-4 -mb-6 flex items-center justify-between border-t border-gray-100 bg-gray-50 p-4 px-6 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-6 text-[11px] font-black text-gray-400 uppercase tracking-widest dark:text-zinc-500">
                      <span>
                        SHOWING{" "}
                        <strong className="text-gray-900 dark:text-zinc-50">
                          {offset + 1}-{Math.min(offset + itemsPerPage, total)}
                        </strong>{" "}
                        OUT OF{" "}
                        <strong className="text-gray-900 dark:text-zinc-50">
                          {total.toLocaleString()}
                        </strong>{" "}
                        ENTRIES
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

                      <div className="flex items-center gap-2 border-l border-gray-200 pl-4 dark:border-white/10">
                        <span className="text-[10px] font-bold text-gray-400 uppercase dark:text-zinc-500">
                          ROWS:
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Select
                                className="h-7 w-16 cursor-pointer rounded-brand border border-gray-300 bg-white px-1 text-[10px] font-bold text-gray-700 focus:ring-1 focus:ring-pup-maroon focus:outline-none dark:bg-card dark:text-zinc-200 dark:border-white/10"
                                value={itemsPerPage}
                                onChange={handleItemsPerPageChange}
                              >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={200}>200</option>
                              </Select>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="rounded-brand"
                            >
                              Items per page
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={displayPage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="h-8 rounded-brand border border-gray-300 bg-white px-3 text-[10px] font-black tracking-widest text-gray-600 uppercase shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-30 dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                    >
                      <i className="ph-bold ph-caret-left mr-1"></i> PREV
                    </Button>
                    <div className="flex h-8 min-w-[32px] items-center justify-center rounded-md border border-gray-200 bg-white px-3 text-[11px] font-black text-gray-900 shadow-xs dark:border-white/10 dark:bg-card dark:text-zinc-100">
                      {displayPage}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={displayPage >= totalPages}
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      className="h-8 rounded-brand border border-gray-300 bg-white px-3 text-[10px] font-black tracking-widest text-gray-600 uppercase shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-30 dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                    >
                      NEXT <i className="ph-bold ph-caret-right ml-1"></i>
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}



