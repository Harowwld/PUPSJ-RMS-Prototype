"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPHDateTime } from "@/lib/timeFormat";
import { cn } from "@/lib/utils";
import { getRoleBranding } from "@/lib/roleBranding";

export default function StudentProfileSheet({
  open,
  onOpenChange,
  student,
  courses = [],
  allDocs = [],
  onLocateStudent,
  onPreviewDocument,
  onEditStudent,
  onArchiveStudent,
  onRestoreStudent,
  authUser = null,
}) {
  const branding = useMemo(() => getRoleBranding(authUser), [authUser]);
  const [requests, setRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  // Fetch document requests for this student
  useEffect(() => {
    let isMounted = true;
    if (!open || !student?.studentNo) {
      return;
    }

    const timer = setTimeout(() => {
      if (isMounted) setIsLoadingRequests(true);
    }, 0);

    fetch(
      `/api/document-requests?studentNo=${encodeURIComponent(
        student.studentNo
      )}&limit=10`
    )
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json?.ok && Array.isArray(json?.data)) {
          setRequests(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingRequests(false);
      });

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [open, student?.studentNo]);

  if (!student) return null;

  // Filter documents associated with this student
  const studentDocs = (allDocs || []).filter(
    (d) =>
      String(d.student_no || "").trim().toUpperCase() ===
      String(student.studentNo || "").trim().toUpperCase()
  );

  // Find course details for display
  const courseInfo = (courses || []).find(
    (c) =>
      String(c.code || "").trim().toUpperCase() ===
      String(student.courseCode || "").trim().toUpperCase()
  );

  const isArchived =
    String(student.status || "").toLowerCase() === "archived";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl data-[side=right]:sm:max-w-xl data-[side=right]:md:max-w-2xl flex flex-col h-full bg-white dark:bg-card border-l border-gray-200 dark:border-white/10 p-0 shadow-2xl font-inter overflow-hidden"
      >
        {/* Header with profile details */}
        <SheetHeader className="shrink-0 p-6 pb-4 pr-14 border-b border-gray-100 dark:border-white/10 bg-gradient-to-r from-gray-50/90 via-white to-gray-50/50 dark:from-zinc-900/90 dark:via-card dark:to-zinc-900/50">
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow-xs shrink-0"
              style={{
                backgroundColor: `${authUser?.accent_color || branding.color || "#800000"}15`,
                color: authUser?.accent_color || branding.color || "#800000",
              }}
            >
              <i className="ph-bold ph-student text-2xl"></i>
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-[19px] font-bold tracking-tight text-gray-900 dark:text-zinc-50 truncate leading-snug">
                {student.name}
              </SheetTitle>
              <SheetDescription className="mt-1 flex items-center flex-wrap gap-2 text-xs">
                <span className="font-mono font-semibold text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-full">
                  {student.studentNo}
                </span>
                <span className="text-gray-300 dark:text-zinc-600">•</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                    isArchived
                      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                  )}
                >
                  {student.status || "Active"}
                </Badge>
              </SheetDescription>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                onEditStudent?.(student);
              }}
              className="h-8 px-3 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              <i className="ph-bold ph-pencil-simple mr-1.5 text-xs"></i>
              Edit Profile
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                onLocateStudent?.(student);
              }}
              className="h-8 px-3 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              <i className="ph-bold ph-compass mr-1.5 text-xs text-pup-maroon dark:text-red-400"></i>
              Locate in Storage Map
            </Button>
          </div>
        </SheetHeader>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Academic & Registry Details */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Academic & Registry Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 dark:border-white/5 dark:bg-zinc-900/40 sm:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 block mb-1">
                  Degree Program
                </span>
                <div className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                  {courseInfo ? (
                    <span>
                      <span className="font-bold text-pup-maroon dark:text-red-400">
                        {courseInfo.code}
                      </span>{" "}
                      — {courseInfo.name}
                    </span>
                  ) : (
                    student.courseCode || "N/A"
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 dark:border-white/5 dark:bg-zinc-900/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 block mb-1">
                  Section
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100 block">
                  {student.section ? `Section ${student.section}` : "—"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 dark:border-white/5 dark:bg-zinc-900/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 block mb-1">
                  Entry Year / Batch
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100 block">
                  {student.yearLevel ? `Batch ${student.yearLevel}` : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Physical Archive Location Banner */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Physical Storage Coordinates
            </h4>
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gradient-to-br from-gray-50/80 via-white to-gray-50/40 dark:from-zinc-900/60 dark:via-card dark:to-zinc-900/40 p-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs shrink-0"
                    style={{
                      backgroundColor: authUser?.accent_color || branding.color || "#800000",
                      color: branding.foreground || "#ffffff",
                    }}
                  >
                    <i className="ph-bold ph-warehouse text-lg"></i>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 block">
                      Physical Archive Filing Location
                    </span>
                    <div className="text-sm font-bold text-gray-900 dark:text-zinc-100 mt-0.5 flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200">
                        Room {student.room}
                      </span>
                      <span className="text-gray-300 dark:text-zinc-600">•</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200">
                        Cabinet {student.cabinet}
                      </span>
                      <span className="text-gray-300 dark:text-zinc-600">•</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200">
                        Drawer {student.drawer}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onLocateStudent?.(student);
                  }}
                  className="flex h-9 px-4 text-xs font-semibold rounded-xl! btn-brand-red active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs whitespace-nowrap self-start sm:self-auto"
                  style={{
                    backgroundColor: authUser?.accent_color || branding.color || "var(--brand-accent)",
                    color: branding.foreground || "var(--brand-foreground, #ffffff)",
                  }}
                >
                  <i className="ph-bold ph-compass mr-1.5 text-sm"></i>
                  View in Map
                </Button>
              </div>
            </div>
          </div>

          {/* Section 3: Associated Digitized Documents */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                Digitized Documents ({studentDocs.length})
              </h4>
            </div>

            {studentDocs.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-gray-200 dark:border-white/10 text-xs text-gray-400 dark:text-zinc-500">
                <i className="ph-duotone ph-files text-3xl mb-1.5 block opacity-50"></i>
                No digitized records uploaded for this student yet.
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden divide-y divide-gray-100 dark:divide-white/5">
                {studentDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 dark:text-zinc-400 shrink-0">
                        <i className="ph-bold ph-file-pdf text-base text-pup-maroon dark:text-red-400"></i>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate">
                          {doc.doc_type || "Document"}
                        </div>
                        <div className="text-[11px] text-gray-400 dark:text-zinc-500 truncate mt-0.5">
                          {doc.original_filename || "document.pdf"} • {formatPHDateTime(doc.created_at)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] font-semibold px-2 py-0.5 rounded-full border",
                          doc.approval_status === "Approved"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                            : doc.approval_status === "Declined"
                              ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                        )}
                      >
                        {doc.approval_status || "Pending"}
                      </Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onPreviewDocument?.(
                            doc.doc_type,
                            student.name,
                            student.studentNo,
                            doc.id
                          );
                        }}
                        className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                      >
                        <i className="ph-bold ph-eye mr-1 text-xs"></i>
                        Preview
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Document Requests History */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Document Requests History ({requests.length})
            </h4>

            {isLoadingRequests ? (
              <div className="p-4 text-center text-xs text-gray-400">Loading requests...</div>
            ) : requests.length === 0 ? (
              <div className="p-4 text-center rounded-xl border border-dashed border-gray-200 dark:border-white/10 text-xs text-gray-400 dark:text-zinc-500">
                No alumni or student document requests recorded.
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden divide-y divide-gray-100 dark:divide-white/5">
                {requests.map((req) => (
                  <div key={req.id} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-zinc-100">
                        {req.doc_type || req.requested_document || "Document Request"}
                      </span>
                      <div className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
                        Logged on {formatPHDateTime(req.created_at)}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full">
                      {req.status || "Pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer with actions */}
        <SheetFooter className="shrink-0 p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50/90 dark:bg-zinc-900/60 flex items-center justify-between flex-row">
          <div>
            {isArchived ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onRestoreStudent?.(student.studentNo);
                }}
                className="h-9 px-4 text-xs font-semibold rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                <i className="ph-bold ph-archive-restore mr-1.5 text-sm"></i>
                Restore
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onArchiveStudent?.(student.studentNo);
                }}
                className="h-9 px-4 text-xs font-semibold rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                <i className="ph-bold ph-archive mr-1.5 text-sm"></i>
                Archive
              </Button>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-9 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
