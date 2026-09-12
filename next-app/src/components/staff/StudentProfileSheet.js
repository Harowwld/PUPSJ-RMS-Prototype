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

  // Fetch active document types for requirements compliance
  const [docTypes, setDocTypes] = useState([]);
  const [complianceView, setComplianceView] = useState("checklist"); // "checklist" | "files"

  useEffect(() => {
    let isMounted = true;
    if (!open) return;
    fetch("/api/doc-types?officeId=registrar", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json?.ok && Array.isArray(json?.data)) {
          setDocTypes(json.data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [open]);

  // Filter documents associated with this student
  const studentDocs = useMemo(() => {
    if (!student?.studentNo) return [];
    return (allDocs || []).filter(
      (d) =>
        String(d.student_no || "").trim().toUpperCase() ===
        String(student.studentNo || "").trim().toUpperCase()
    );
  }, [allDocs, student]);

  // Find course details for display
  const courseInfo = useMemo(() => {
    if (!student?.courseCode) return null;
    return (courses || []).find(
      (c) =>
        String(c.code || "").trim().toUpperCase() ===
        String(student.courseCode || "").trim().toUpperCase()
    );
  }, [courses, student]);

  const isArchived =
    String(student?.status || "").toLowerCase() === "archived";

  // Requirements checklist calculation
  const requirementsList = useMemo(() => {
    if (!docTypes || docTypes.length === 0) return [];
    const seen = new Set();
    const uniqueTypes = docTypes.filter((dt) => {
      const norm = String(dt.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seen.has(norm)) return false;
      seen.add(norm);
      return true;
    });

    return uniqueTypes.map((dt) => {
      const matchDocs = (studentDocs || []).filter(
        (d) => String(d.doc_type || "").trim().toLowerCase() === String(dt.name || "").trim().toLowerCase()
      );
      const approved = matchDocs.find((d) => d.approval_status === "Approved");
      const pending = matchDocs.find((d) => d.approval_status === "Pending");
      const declined = matchDocs.find((d) => d.approval_status === "Declined");
      const status = approved ? "Approved" : pending ? "Pending" : declined ? "Declined" : "Missing";
      return {
        id: dt.id,
        name: dt.name,
        status,
        doc: approved || pending || declined || matchDocs[0] || null,
      };
    });
  }, [docTypes, studentDocs]);

  const complianceSummary = useMemo(() => {
    const total = requirementsList.length;
    const approved = requirementsList.filter((r) => r.status === "Approved").length;
    const pending = requirementsList.filter((r) => r.status === "Pending").length;
    const missing = requirementsList.filter((r) => r.status === "Missing").length;
    const rate = total > 0 ? Math.round((approved / total) * 100) : 0;
    return { total, approved, pending, missing, rate };
  }, [requirementsList]);

  if (!student) return null;

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
                  className="flex h-9 px-4 text-xs font-semibold rounded-xl! btn-brand-red text-white! active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs whitespace-nowrap self-start sm:self-auto"
                >
                  <i className="ph-bold ph-compass mr-1.5 text-sm"></i>
                  View in Map
                </Button>
              </div>
            </div>
          </div>

          {/* Section 3: Requirements Compliance & Digitized Documents */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                  Requirements & Records ({studentDocs.length})
                </h4>
                {complianceSummary.total > 0 && (
                  <span className="text-[11px] font-semibold text-gray-600 dark:text-zinc-400">
                    {complianceSummary.approved} of {complianceSummary.total} Verified ({complianceSummary.rate}%)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-0.5 rounded-lg border border-gray-200/60 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setComplianceView("checklist")}
                  className={cn(
                    "px-2 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer",
                    complianceView === "checklist"
                      ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:text-zinc-400"
                  )}
                >
                  Checklist
                </button>
                <button
                  type="button"
                  onClick={() => setComplianceView("files")}
                  className={cn(
                    "px-2 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer",
                    complianceView === "files"
                      ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:text-zinc-400"
                  )}
                >
                  Files ({studentDocs.length})
                </button>
              </div>
            </div>

            {complianceView === "checklist" && requirementsList.length > 0 ? (
              <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden divide-y divide-gray-100 dark:divide-white/5">
                {requirementsList.map((req) => {
                  const isApproved = req.status === "Approved";
                  const isPending = req.status === "Pending";
                  const isDeclined = req.status === "Declined";
                  const isMissing = req.status === "Missing";

                  return (
                    <div
                      key={req.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs",
                            isApproved
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : isPending
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                              : isDeclined
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                          )}
                        >
                          <i
                            className={
                              isApproved
                                ? "ph-bold ph-seal-check"
                                : isPending
                                ? "ph-bold ph-hourglass"
                                : isDeclined
                                ? "ph-bold ph-x-circle"
                                : "ph-bold ph-circle"
                            }
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate block">
                            {req.name}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-zinc-500 block truncate">
                            {req.doc?.original_filename || (isMissing ? "Not submitted to archive" : "Pending file")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] font-semibold px-2 py-0.5 rounded-full border",
                            isApproved
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : isPending
                              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400"
                              : isDeclined
                              ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400"
                              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400"
                          )}
                        >
                          {req.status === "Missing" ? "Not Submitted" : req.status}
                        </Badge>
                        {req.doc && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              onPreviewDocument?.(
                                req.name,
                                student.name,
                                student.studentNo,
                                req.doc.id
                              );
                            }}
                            className="h-7 px-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-white/10"
                          >
                            Preview
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : studentDocs.length === 0 ? (
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
                No document requests recorded.
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
                className="h-9 px-4 text-xs font-semibold rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 shadow-xs cursor-pointer active:scale-95 transition-all"
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
