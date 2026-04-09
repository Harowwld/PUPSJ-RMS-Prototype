"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPHDateTimeParts } from "@/lib/timeFormat";

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
        <div className="p-4 bg-gray-50/50 flex-none border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3 justify-between">
            <div>
              <div className="text-xs font-bold text-gray-700 uppercase">
                Notifications
              </div>
              <div className="text-sm font-medium text-gray-600 mt-1">
                Document review decisions (approved/declined) across the system.
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={load}
                className="h-9 px-3 font-bold text-xs border-gray-300 text-gray-700 hover:text-pup-maroon hover:bg-red-50 hover:border-pup-maroon rounded-brand"
              >
                <i className="ph-bold ph-arrows-clockwise mr-1.5"></i>
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={unreadCount <= 0}
                onClick={markAllRead}
                className="h-9 px-3 font-bold text-xs border-gray-300 text-gray-700 hover:text-pup-maroon hover:bg-red-50 hover:border-pup-maroon rounded-brand"
              >
                <i className="ph-bold ph-checks mr-1.5"></i>
                Mark all as read
              </Button>
            </div>
          </div>
        </div>

        <CardContent className="p-6 flex-1 flex flex-col min-h-0">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-full max-w-md rounded-brand" />
              <Skeleton className="h-10 w-full rounded-brand" />
              <Skeleton className="h-10 w-full rounded-brand" />
              <Skeleton className="h-10 w-full rounded-brand" />
            </div>
          ) : error ? (
            <div className="h-[320px] flex flex-col items-center justify-center text-center text-gray-500">
              <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon" />
              </div>
              <p className="text-lg font-bold text-gray-900">
                Could not load notifications
              </p>
              <p className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                {error}
              </p>
            </div>
          ) : (
            <>
              <div
                className={`flex-1 overflow-auto rounded-brand ${
                  items.length === 0 ? "" : "border border-gray-200"
                }`}
              >
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                      <th className="p-3 font-bold">Decision</th>
                      <th className="p-3 font-bold">Student</th>
                      <th className="p-3 font-bold">Document</th>
                      <th className="p-3 font-bold">Reviewed By</th>
                      <th className="p-3 font-bold">Reviewed</th>
                      <th className="p-3 font-bold">Note</th>
                      <th className="p-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.length === 0 ? (
                      <tr className="border-0 hover:bg-transparent">
                        <td colSpan={7} className="p-0 border-0">
                          <div className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500">
                            <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                              <i className="ph-duotone ph-bell text-3xl text-pup-maroon"></i>
                            </div>
                            <div className="text-lg font-bold text-gray-900">
                              No notifications yet
                            </div>
                            <div className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                              When admins approve or decline uploaded documents,
                              updates will appear here.
                            </div>
                          </div>
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
                              isUnread ? "bg-red-50/30" : ""
                            }`}
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={`${ui.badge} font-bold text-xs px-3 py-1 rounded-full border`}
                                >
                                  <i className={`${ui.icon} mr-1.5`}></i>
                                  {ui.label}
                                </Badge>
                                {isUnread ? (
                                  <span className="text-[10px] font-extrabold text-pup-maroon uppercase tracking-widest">
                                    New
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-900">
                                  {n.student_name || "UNKNOWN"}
                                </span>
                                <span className="font-mono text-xs text-gray-500">
                                  {n.student_no}
                                </span>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-700">
                                  {n.doc_type}
                                </span>
                                <span className="text-xs text-gray-500 font-mono truncate max-w-[220px]">
                                  {n.original_filename}
                                </span>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="text-sm font-medium text-gray-700">
                                {n.reviewed_by || "—"}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="font-mono text-[11px] text-gray-500 whitespace-nowrap">
                                <div>{reviewed.date}</div>
                                {reviewed.time ? <div>{reviewed.time}</div> : null}
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="text-sm text-gray-600">
                                {n.review_note ? String(n.review_note) : "—"}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex justify-end">
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
                                    className="h-9 px-3 font-bold text-xs border-gray-300 text-gray-700 hover:text-pup-maroon hover:bg-red-50 hover:border-pup-maroon rounded-brand"
                                  >
                                    <i className="ph-bold ph-eye mr-1.5"></i>
                                    View
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
                      className="h-8 text-xs font-bold text-gray-600"
                    >
                      <i className="ph-bold ph-caret-left"></i> Previous
                    </Button>
                    <div className="px-3 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-md h-8 flex items-center justify-center min-w-12 shadow-sm">
                      {displayPage} / {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={displayPage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="h-8 text-xs font-bold text-gray-600"
                    >
                      Next <i className="ph-bold ph-caret-right"></i>
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

