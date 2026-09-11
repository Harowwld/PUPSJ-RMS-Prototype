"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPHDateTime } from "@/lib/timeFormat";
import { cn } from "@/lib/utils";

export default function StudentProfileModal({
  open,
  onOpenChange,
  student,
  allDocs = [],
  onLocateStudent,
  onPreviewDocument,
  onEditStudent,
  onArchiveStudent,
  onRestoreStudent,
}) {
  const [requests, setRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  // Filter documents associated with this student
  const studentDocs = (allDocs || []).filter(
    (d) =>
      String(d.student_no || "").trim().toUpperCase() ===
      String(student?.studentNo || "").trim().toUpperCase()
  );

  // Fetch document requests for this student
  useEffect(() => {
    let isMounted = true;
    if (open && student?.studentNo) {
      const timer = setTimeout(() => {
        if (isMounted) setIsLoadingRequests(true);
      }, 0);
      fetch(`/api/document-requests?studentNo=${encodeURIComponent(student.studentNo)}&limit=10`)
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
    } else {
      const timer = setTimeout(() => {
        if (isMounted) setRequests([]);
      }, 0);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [open, student?.studentNo]);

  if (!student) return null;

  const isArchived = String(student.status || "").toLowerCase() === "archived";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-card">
        {/* Header with profile banner */}
        <DialogHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-zinc-900 dark:to-card p-6 pb-4 border-b border-gray-100 dark:border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-pup-maroon/10 text-pup-maroon dark:bg-red-500/20 dark:text-red-400 flex items-center justify-center font-bold text-lg shadow-xs">
                <i className="ph-bold ph-student text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-[18px] font-bold tracking-tight text-gray-900 dark:text-zinc-50 truncate">
                  {student.name}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-xs font-semibold text-gray-600 dark:text-zinc-300">
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
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onEditStudent?.(student);
                }}
                className="h-9 px-3.5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                <i className="ph-bold ph-pencil-simple mr-1.5 text-sm"></i>
                Edit Profile
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Scrollable Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto font-inter">
          {/* Section 1: Academic & Registry Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 dark:border-white/5 dark:bg-zinc-900/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 block mb-1">
                Program
              </span>
              <span className="text-sm font-bold text-gray-900 dark:text-zinc-100 truncate block">
                {student.courseCode || "N/A"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 dark:border-white/5 dark:bg-zinc-900/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 block mb-1">
                Section
              </span>
              <span className="text-sm font-bold text-gray-900 dark:text-zinc-100 block">
                {student.section || "—"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 dark:border-white/5 dark:bg-zinc-900/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 block mb-1">
                Entry Year
              </span>
              <span className="text-sm font-bold text-gray-900 dark:text-zinc-100 block">
                {student.yearLevel || "—"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 dark:border-white/5 dark:bg-zinc-900/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 block mb-1">
                Total Files
              </span>
              <span className="text-sm font-bold text-gray-900 dark:text-zinc-100 block">
                {studentDocs.length} Scanned
              </span>
            </div>
          </div>

          {/* Section 2: Physical Archive Location Banner */}
          <div className="rounded-2xl border border-pup-maroon/20 bg-gradient-to-r from-pup-maroon/5 via-pup-maroon/2 to-transparent dark:border-red-500/20 dark:from-red-500/10 dark:via-red-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pup-maroon text-white dark:bg-red-500 flex items-center justify-center shadow-xs">
                <i className="ph-bold ph-warehouse text-lg"></i>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-pup-maroon dark:text-red-400">
                  Physical Archive Filing Location
                </h4>
                <div className="text-sm font-semibold text-gray-800 dark:text-zinc-100 mt-0.5">
                  Room {student.room} • Cabinet {student.cabinet} • Drawer {student.drawer}
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onLocateStudent?.(student);
              }}
              className="h-9 px-4 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs cursor-pointer active:scale-95 transition-all whitespace-nowrap self-start sm:self-auto"
            >
              <i className="ph-bold ph-compass mr-1.5 text-sm"></i>
              Locate in Storage Map
            </Button>
          </div>

          {/* Section 3: Associated Digitized Documents */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                Digitized Documents ({studentDocs.length})
              </h4>
            </div>

            {studentDocs.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-gray-200 dark:border-white/10 text-xs text-gray-400 dark:text-zinc-500">
                <i className="ph-duotone ph-files text-3xl mb-1.5 block opacity-50"></i>
                No digitized documents currently uploaded for this student.
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
                        <div className="text-[11px] text-gray-400 dark:text-zinc-500 truncate">
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
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
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
                    <Badge variant="outline" className="text-[10px] font-semibold uppercase px-2 py-0.5">
                      {req.status || "Pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
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
                Restore to Active
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
                Archive Student
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
