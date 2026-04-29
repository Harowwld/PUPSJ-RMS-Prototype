"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPHDateTimeParts } from "@/lib/timeFormat";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";

function statusUi(status) {
  const s = String(status || "Pending");
  if (s === "Approved") {
    return {
      label: "Approved",
      badge: "bg-green-50 text-green-700 border-green-200",
      icon: "ph-fill ph-check-circle",
    };
  }
  if (s === "Declined") {
    return {
      label: "Declined",
      badge: "bg-red-50 text-red-700 border-red-200",
      icon: "ph-fill ph-x-circle",
    };
  }
  return {
    label: s || "Pending",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    icon: "ph-fill ph-clock",
  };
}

export default function NotificationsTab({ onPreviewDocument, onUnreadChange }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSeenReviewedAt, setLastSeenReviewedAt] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const displayPage = Math.min(page, totalPages);
  const offset = (displayPage - 1) * pageSize;

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/notifications?limit=${pageSize}&offset=${offset}`,
        { cache: "no-store" },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to load notifications");
      }
      const data = json.data || {};
      const nextItems = Array.isArray(data.items) ? data.items : [];
      setItems(nextItems);
      setTotal(Number(data.total || 0));
      setUnreadCount(Number(data.unreadCount || 0));
      setLastSeenReviewedAt(data.lastSeenReviewedAt || null);
      onUnreadChange?.(Number(data.unreadCount || 0));
    } catch (e) {
      setError(e?.message || "Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  }, [offset, onUnreadChange]);

  const markAllRead = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markSeen" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to mark as read");
      }
      const nextUnread = Number(json?.data?.unreadCount || 0);
      setUnreadCount(nextUnread);
      setLastSeenReviewedAt(json?.data?.lastSeenReviewedAt || null);
      onUnreadChange?.(nextUnread);
      await load();
    } catch {
      // silent
    }
  }, [load, onUnreadChange]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      load();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [load]);

  const unreadCutoff = useMemo(() => {
    const s = String(lastSeenReviewedAt || "").trim();
    return s ? s : null;
  }, [lastSeenReviewedAt]);

  return (
    <div className="flex flex-col w-full h-full gap-4 animate-fade-in font-inter">
      <Card className="flex-1 bg-white rounded-brand border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-pup-maroon shadow-sm shrink-0">
              <i className="ph-duotone ph-bell text-2xl"></i>
            </div>
            <div>
              <CardTitle className="text-xl font-black text-gray-900 tracking-tight">
                System Notifications
              </CardTitle>
              <CardDescription className="font-medium text-gray-500">
                Real-time updates on document review decisions and system alerts.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              className="h-10 px-5 font-bold text-sm border-gray-300 text-gray-700 hover:text-pup-maroon hover:bg-red-50 hover:border-pup-maroon rounded-brand shadow-sm transition-all"
            
            >
              <i className="ph-bold ph-arrows-clockwise mr-1.5"></i>
              REFRESH
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={unreadCount <= 0}
              onClick={markAllRead}
              className="h-10 px-5 font-bold text-sm border-gray-300 text-gray-700 hover:text-pup-maroon hover:bg-red-50 hover:border-pup-maroon rounded-brand shadow-sm transition-all"
            >
              <i className="ph-bold ph-checks mr-1.5"></i>
              MARK ALL AS READ
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 flex-1 flex flex-col min-h-0">
          {isLoading ? (
            <div className="flex-1 flex flex-col space-y-4">
              <div className="flex-1 border border-gray-200 rounded-brand overflow-hidden flex flex-col">
                <Skeleton className="h-10 w-full rounded-none" />
                <div className="divide-y divide-gray-100 flex-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="p-4 flex items-center justify-between">
                      <div className="flex-1 grid grid-cols-1 lg:grid-cols-8 gap-4">
                        <div className="flex items-center">
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                        <div className="hidden lg:flex items-center">
                          <Skeleton className="h-4 w-24 font-mono" />
                        </div>
                        <div className="hidden lg:flex items-center">
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <div className="hidden lg:flex items-center">
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                        <div className="hidden lg:flex items-center space-y-1 flex-col">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-2 w-24" />
                        </div>
                        <div className="hidden lg:flex items-center">
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <div className="hidden lg:flex items-center space-y-1 flex-col">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-2 w-12" />
                        </div>
                        <div className="flex items-center justify-end">
                          <Skeleton className="h-9 w-16 rounded-brand" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Skeleton className="h-4 w-48" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20 rounded-brand" />
                  <Skeleton className="h-8 w-12 rounded-brand" />
                  <Skeleton className="h-8 w-20 rounded-brand" />
                </div>
              </div>
            </div>
          ) : error ? (
            <Empty className="h-[320px] flex flex-col items-center justify-center text-center text-gray-500 border-0">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                  <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon" />
                </EmptyMedia>
                <EmptyTitle className="text-lg font-bold text-gray-900">Could not load notifications</EmptyTitle>
                <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                  {error}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto overflow-x-auto border border-gray-200 rounded-brand">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                      <th className="p-3 font-bold">Decision</th>
                      <th className="p-3 font-bold">Student No</th>
                      <th className="p-3 font-bold">Name</th>
                      <th className="p-3 font-bold">Type</th>
                      <th className="p-3 font-bold">File</th>
                      <th className="p-3 font-bold">Reviewed By</th>
                      <th className="p-3 font-bold">Reviewed</th>
                      <th className="p-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.length === 0 ? (
                      <tr className="border-0 hover:bg-transparent">
                        <td colSpan={8} className="p-0 border-0">
                          <Empty className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500 border-0">
                            <EmptyHeader className="flex flex-col items-center gap-0">
                              <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                                <i className="ph-duotone ph-bell text-3xl text-pup-maroon"></i>
                              </EmptyMedia>
                              <EmptyTitle className="text-lg font-bold text-gray-900">No notifications yet</EmptyTitle>
                              <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                                When admins approve or decline uploaded documents,
                                updates will appear here.
                              </EmptyDescription>
                            </EmptyHeader>
                          </Empty>
                        </td>
                      </tr>
                    ) : (
                      items.map((n) => {
                        const ui = statusUi(n.approval_status);
                        const reviewed = formatPHDateTimeParts(n.reviewed_at);
                        const isUnread =
                          unreadCutoff == null
                            ? true
                            : String(n.reviewed_at || "") > unreadCutoff;
                        return (
                          <tr
                            key={n.id}
                            className={`hover:bg-gray-50 transition-colors ${
                              isUnread ? "bg-red-50/40" : ""
                            }`}
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={`${ui.badge} font-bold text-xs px-2 py-1 rounded-full border shadow-xs`}
                                >
                                  <i className={`${ui.icon} mr-1.5`}></i>
                                  {ui.label}
                                </Badge>
                                {isUnread ? (
                                  <span className="text-[10px] font-extrabold text-pup-maroon uppercase tracking-widest animate-pulse">
                                    New
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="p-3 font-mono font-bold text-gray-900">
                              {n.student_no}
                            </td>
                            <td className="p-3 text-gray-800 font-medium">
                              {n.student_name || "—"}
                            </td>
                            <td className="p-3">
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-50 text-pup-maroon border border-red-100 text-xs font-bold">
                                {n.doc_type}
                              </span>
                            </td>
                            <td className="p-3 text-gray-700">
                              <div className="text-sm font-medium max-w-[200px] truncate">
                                {n.original_filename}
                              </div>
                              {n.review_note && (
                                <div className="text-[11px] text-gray-500 italic mt-0.5 line-clamp-1">
                                  Note: {n.review_note}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-gray-700 font-medium">
                              {n.reviewed_by || "—"}
                            </td>
                            <td className="p-3 text-gray-600 font-medium">
                              <div className="font-mono text-[11px]">
                                {reviewed.date}
                              </div>
                              <div className="text-[10px] opacity-70">
                                {reviewed.time}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex justify-end flex-wrap gap-2">
                                {n.approval_status === "Declined" ? (
                                  <span className="px-3 h-9 inline-flex items-center rounded-brand border border-gray-200 text-gray-400 font-bold text-xs bg-gray-50">
                                    <i className="ph-bold ph-file-x mr-1.5"></i>
                                    File Removed
                                  </span>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      onPreviewDocument?.(
                                        n.doc_type,
                                        n.student_name,
                                        n.student_no,
                                        n.id,
                                      )
                                    }
                                    className="px-3 font-bold text-xs border-gray-300 text-gray-700 hover:text-pup-maroon hover:bg-red-50 hover:border-pup-maroon rounded-brand transition-all shadow-sm h-9"
                                  >
                                    <i className="ph-bold ph-eye mr-1.5"></i>
                                    VIEW
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs font-medium text-gray-500">
                  {total > 0 ? (
                    <>
                      Showing {offset + 1}-
                      {Math.min(offset + pageSize, total)} of{" "}
                      <strong className="text-gray-900">
                        {total.toLocaleString()}
                      </strong>{" "}
                      notifications
                      {unreadCount > 0 ? (
                        <>
                          {" "}
                          •{" "}
                          <strong className="text-pup-maroon">
                            {unreadCount.toLocaleString()}
                          </strong>{" "}
                          unread
                        </>
                      ) : null}
                    </>
                  ) : null}
                </div>

                {total > 0 ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={displayPage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="text-xs font-bold text-gray-600"
                    >
                      <i className="ph-bold ph-caret-left text-[10px] mr-1"></i> PREVIOUS
                    </Button>
                    <div className="px-3 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-md h-8 flex items-center justify-center min-w-12 shadow-sm">
                      {displayPage} / {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={displayPage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="text-xs font-bold text-gray-600"
                    >
                      NEXT <i className="ph-bold ph-caret-right text-[10px] ml-1"></i>
                    </Button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

