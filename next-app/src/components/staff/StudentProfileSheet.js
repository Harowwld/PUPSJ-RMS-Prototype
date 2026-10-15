"use client";

import HugeIcon from "@/components/shared/HugeIcon";
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
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
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
  const [mobileTab, setMobileTab] = useState("overview"); // "overview" | "requirements" | "requests"

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
    fetch("/api/doc-types?officeId=registrar&scope=compliance", { cache: "no-store" })
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
      const name = typeof dt === "string" ? dt : dt?.name;
      if (!name) return false;
      const norm = String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seen.has(norm)) return false;
      seen.add(norm);
      return true;
    });

    return uniqueTypes.map((dt, index) => {
      const name = typeof dt === "string" ? dt : dt?.name || "";
      const matchDocs = (studentDocs || []).filter(
        (d) => String(d.doc_type || "").trim().toLowerCase() === String(name || "").trim().toLowerCase()
      );
      const approved = matchDocs.find((d) => d.approval_status === "Approved");
      const pending = matchDocs.find((d) => d.approval_status === "Pending");
      const declined = matchDocs.find((d) => d.approval_status === "Declined");
      const status = approved ? "Approved" : pending ? "Pending" : declined ? "Declined" : "Missing";
      const uniqueId =
        typeof dt === "object" && dt?.id
          ? String(dt.id)
          : `req-${index}-${String(name).toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

      return {
        id: uniqueId,
        name: name,
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

  // Student Initials
  const displayName = student.name && !student.name.startsWith("enc:v1:")
    ? student.name
    : (student.studentNo ? `Student (${student.studentNo})` : "Student Profile");

  const initials = displayName
    .replace(/[^a-zA-Z\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "ST";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl data-[side=right]:w-full data-[side=right]:sm:max-w-2xl data-[side=right]:md:max-w-4xl data-[side=right]:lg:max-w-5xl data-[side=right]:xl:max-w-6xl flex flex-col h-full bg-white dark:bg-card border-l border-border dark:border-border p-0 shadow-2xl overflow-hidden"
      >
        {/* Executive Header */}
        <SheetHeader className="shrink-0 p-6 pb-4 pr-16 border-b border-border dark:border-border bg-gradient-to-r from-gray-50/90 via-white to-gray-50/50 dark:from-zinc-900/90 dark:via-card dark:to-zinc-900/50 text-left">
          <div className="flex items-start gap-4">
            {/* Student Avatar Tile */}
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base shadow-xs shrink-0 border"
              style={{
                backgroundColor: authUser?.accent_color ? `${authUser.accent_color}15` : "rgba(128, 0, 0, 0.08)",
                color: authUser?.accent_color || "#800000",
                borderColor: authUser?.accent_color ? `${authUser.accent_color}30` : "rgba(128, 0, 0, 0.2)",
              }}
            >
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200/80 dark:border-zinc-700/60">
                  {student.studentNo}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-semibold px-2.5 py-0.5 rounded-full border",
                    isArchived
                      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", isArchived ? "bg-amber-500" : "bg-emerald-500")} />
                  {student.status || "Active"}
                </Badge>
              </div>

              <SheetTitle className="text-xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 truncate leading-snug">
                {displayName}
              </SheetTitle>

              <SheetDescription className="mt-0.5 text-xs text-gray-600 dark:text-zinc-400 flex items-center gap-2 flex-wrap">
                <span>Program: <strong className="text-gray-800 dark:text-zinc-200">{courseInfo?.code || student.courseCode || "N/A"}</strong></span>
                <span>•</span>
                <span>Section: <strong className="text-gray-800 dark:text-zinc-200">{student.section || "N/A"}</strong></span>
                <span>•</span>
                <span>Batch: <strong className="text-gray-800 dark:text-zinc-200">{student.yearLevel || "N/A"}</strong></span>
              </SheetDescription>
            </div>
          </div>

          {/* Mobile Tab Switcher (< md) */}
          <div className="mt-4 pt-3 border-t border-border/80 dark:border-border flex md:hidden items-center justify-between gap-1 bg-gray-100/70 dark:bg-zinc-800/50 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setMobileTab("overview")}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer",
                mobileTab === "overview"
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400"
              )}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("requirements")}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer",
                mobileTab === "requirements"
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400"
              )}
            >
              Requirements ({studentDocs.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("requests")}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer",
                mobileTab === "requests"
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400"
              )}
            >
              Requests ({requests.length})
            </button>
          </div>
        </SheetHeader>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left Column: Academic Profile, Storage Location, & Requirements Compliance */}
            <div
              className={cn(
                "md:col-span-7 lg:col-span-8 space-y-6",
                mobileTab !== "overview" && mobileTab !== "requirements" && "hidden md:block"
              )}
            >
              {/* Academic Profile Bento */}
              {(mobileTab === "overview" || typeof window === "undefined") && (
                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 flex items-center gap-1.5">
                    <HugeIcon className="ph-bold ph-graduation-cap text-xs" />
                    Academic & Enrollment Details
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Degree Program */}
                    <div className="sm:col-span-3 p-4 rounded-xl border border-border/80 bg-gray-50/60 dark:border-border dark:bg-zinc-900/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 block mb-1">
                        Degree Program
                      </span>
                      <div className="text-sm font-semibold text-gray-900 dark:text-zinc-100 flex items-start gap-2.5">
                        {courseInfo ? (
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold text-pup-maroon dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-pup-maroon/20 mr-2">
                              {courseInfo.code}
                            </span>
                            <span>{courseInfo.name}</span>
                          </div>
                        ) : (
                          <span>{student.courseCode || "N/A"}</span>
                        )}
                      </div>
                    </div>

                    {/* Section */}
                    <div className="p-3.5 rounded-xl border border-border/80 bg-gray-50/60 dark:border-border dark:bg-zinc-900/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 block mb-1">
                        Section
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                        {student.section ? `Section ${student.section}` : "N/A"}
                      </span>
                    </div>

                    {/* Batch Year */}
                    <div className="p-3.5 rounded-xl border border-border/80 bg-gray-50/60 dark:border-border dark:bg-zinc-900/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 block mb-1">
                        Entry Year / Batch
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                        {student.yearLevel ? `Batch ${student.yearLevel}` : "N/A"}
                      </span>
                    </div>

                    {/* Record Status */}
                    <div className="p-3.5 rounded-xl border border-border/80 bg-gray-50/60 dark:border-border dark:bg-zinc-900/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 block mb-1">
                        Registry Status
                      </span>
                      <span className={cn(
                        "text-sm font-bold",
                        isArchived ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                      )}>
                        {student.status || "Active"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Physical Archive Filing Coordinates */}
              {(mobileTab === "overview" || typeof window === "undefined") && (
                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 flex items-center gap-1.5">
                    <HugeIcon className="ph-bold ph-archive text-xs" />
                    Physical Archive Filing Location
                  </h4>

                  <div className="rounded-2xl border border-border/90 dark:border-border bg-gradient-to-br from-gray-50/80 via-white to-gray-50/40 dark:from-zinc-900/60 dark:via-card dark:to-zinc-900/40 p-4 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center shadow-xs shrink-0"
                          style={{
                            backgroundColor: authUser?.accent_color || branding.color || "#800000",
                            color: branding.foreground || "#ffffff",
                          }}
                        >
                          <HugeIcon className="ph-bold ph-warehouse text-xl" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 block">
                            Archive Coordinates
                          </span>
                          <div className="text-sm font-bold text-gray-900 dark:text-zinc-100 mt-0.5 flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200/60 dark:border-zinc-700">
                              Room {student.room}
                            </span>
                            <span className="text-gray-300 dark:text-zinc-600">•</span>
                            <span className="px-2.5 py-0.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200/60 dark:border-zinc-700">
                              Cabinet {student.cabinet}
                            </span>
                            <span className="text-gray-300 dark:text-zinc-600">•</span>
                            <span className="px-2.5 py-0.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200/60 dark:border-zinc-700">
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
                        title="View in Storage Map"
                        className="h-9 px-4 text-xs font-semibold rounded-xl! btn-brand-red text-white! active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs whitespace-nowrap self-start sm:self-auto"
                        style={{ color: "#ffffff" }}
                      >
                        Locate
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Requirements Compliance & Digitized Records */}
              {(mobileTab === "requirements" || mobileTab === "overview" || typeof window === "undefined") && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 flex items-center gap-1.5">
                        <HugeIcon className="ph-bold ph-check-square-offset text-xs" />
                        Requirements Compliance & Records ({studentDocs.length})
                      </h4>
                      {complianceSummary.total > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-24 h-1.5 rounded-full bg-gray-200 dark:bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                              style={{ width: `${complianceSummary.rate}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-gray-600 dark:text-zinc-400">
                            {complianceSummary.approved} of {complianceSummary.total} Verified ({complianceSummary.rate}%)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* View Switcher: Checklist vs Files */}
                    <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-gray-200/60 dark:border-white/5">
                      <button
                        type="button"
                        onClick={() => setComplianceView("checklist")}
                        className={cn(
                          "px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
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
                          "px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
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
                    <div className="rounded-2xl border border-border/80 dark:border-border overflow-hidden divide-y divide-border/80 dark:divide-border bg-white dark:bg-zinc-900/30">
                      {requirementsList.map((req, index) => {
                        const isApproved = req.status === "Approved";
                        const isPending = req.status === "Pending";
                        const isDeclined = req.status === "Declined";
                        const isMissing = req.status === "Missing";

                        return (
                          <div
                            key={req.id || `req-${index}-${req.name || ""}`}
                            className="p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={cn(
                                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm shadow-xs",
                                  isApproved
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40"
                                    : isPending
                                    ? "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/40"
                                    : isDeclined
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/40"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/40"
                                )}
                              >
                                <HugeIcon
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
                                <span className="text-[11px] text-gray-500 dark:text-zinc-400 block truncate">
                                  {req.doc?.original_filename || (isMissing ? "Not submitted to archive" : "Pending document")}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={cn(
                                  "text-[10px] font-semibold px-2.5 py-0.5 rounded-full border",
                                  isApproved
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                                    : isPending
                                    ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20"
                                    : isDeclined
                                    ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                                    : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                                )}
                              >
                                {req.status === "Missing" ? "Not Submitted" : req.status}
                              </span>

                              {req.doc && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onPreviewDocument?.(
                                          req.name,
                                          student.name,
                                          student.studentNo,
                                          req.doc.id
                                        );
                                      }}
                                      aria-label="Preview Document"
                                      className="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-all border border-transparent hover:border-gray-200 dark:hover:border-zinc-700 bg-transparent"
                                    >
                                      <HugeIcon className="ph-bold ph-eye text-sm" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>Preview Document</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : studentDocs.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-dashed border-border dark:border-border text-xs text-gray-500 dark:text-zinc-400 bg-gray-50/40 dark:bg-zinc-900/20">
                      <HugeIcon className="ph-duotone ph-files text-3xl mb-2 block mx-auto opacity-50" />
                      No digitized records uploaded for this student yet.
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border/80 dark:border-border overflow-hidden divide-y divide-border/80 dark:divide-border bg-white dark:bg-zinc-900/30">
                      {studentDocs.map((doc, docIdx) => (
                        <div
                          key={doc.id || `doc-${docIdx}`}
                          className="p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-900/30 flex items-center justify-center text-pup-maroon dark:text-red-400 shrink-0">
                              <HugeIcon className="ph-bold ph-file-pdf text-base" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate">
                                {doc.doc_type || "Document"}
                              </div>
                              <div className="text-[11px] text-gray-500 dark:text-zinc-400 truncate mt-0.5">
                                {doc.original_filename || "document.pdf"} • {formatPHDateTime(doc.created_at)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={cn(
                                "text-[10px] font-semibold px-2.5 py-0.5 rounded-full border",
                                doc.approval_status === "Approved"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                                  : doc.approval_status === "Declined"
                                  ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                              )}
                            >
                              {doc.approval_status || "Pending"}
                            </span>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onPreviewDocument?.(
                                      doc.doc_type,
                                      student.name,
                                      student.studentNo,
                                      doc.id
                                    );
                                  }}
                                  aria-label="Preview Document"
                                  className="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-all border border-transparent hover:border-gray-200 dark:hover:border-zinc-700 bg-transparent"
                                >
                                  <HugeIcon className="ph-bold ph-eye text-sm" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Preview Document</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Quick Profile Actions & Document Requests History Rail */}
            <div
              className={cn(
                "md:col-span-5 lg:col-span-4 space-y-6",
                mobileTab !== "requests" && "hidden md:block"
              )}
            >
              {/* Profile Actions Rail Card */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 flex items-center gap-1.5">
                  <HugeIcon className="ph-bold ph-wrench text-xs" />
                  Quick Actions
                </h4>

                <div className="rounded-2xl border border-border/80 dark:border-border bg-gray-50/50 dark:bg-zinc-900/40 p-3.5 flex items-center justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false);
                      onEditStudent?.(student);
                    }}
                    title="Edit Student Information"
                    className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    Edit
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false);
                      onLocateStudent?.(student);
                    }}
                    title="Locate in Physical Archive"
                    className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    Locate
                  </Button>
                </div>
              </div>

              {/* Document Requests History Card */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 flex items-center gap-1.5">
                    <HugeIcon className="ph-bold ph-clock-counter-clockwise text-xs" />
                    Requests History ({requests.length})
                  </h4>
                </div>

                {isLoadingRequests ? (
                  <div className="p-6 text-center text-xs text-gray-400 rounded-2xl border border-border/80 dark:border-border">
                    <HugeIcon className="ph-bold ph-spinner animate-spin text-lg mb-1.5 block mx-auto text-pup-maroon dark:text-red-400" />
                    Loading requests...
                  </div>
                ) : requests.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl border border-dashed border-border dark:border-border text-xs text-gray-400 dark:text-zinc-500 bg-gray-50/40 dark:bg-zinc-900/20">
                    <HugeIcon className="ph-duotone ph-receipt text-2xl mb-1.5 block mx-auto opacity-50" />
                    No document requests recorded for this student.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border/80 dark:border-border overflow-hidden divide-y divide-border/80 dark:divide-border bg-white dark:bg-zinc-900/30">
                    {requests.map((req, reqIdx) => (
                      <div key={req.id || `req-hist-${reqIdx}`} className="p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-gray-900 dark:text-zinc-100 truncate">
                            {req.doc_type || req.requested_document || "Document Request"}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
                              req.status === "Completed"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                : req.status === "InProgress"
                                ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800"
                                : req.status === "Ready"
                                ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                            )}
                          >
                            {req.status === "InProgress" ? "In Progress" : (req.status || "Pending")}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-zinc-400 flex items-center gap-1 font-mono">
                          <HugeIcon className="ph-bold ph-calendar text-[10px]" />
                          {formatPHDateTime(req.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Executive Footer */}
        <SheetFooter className="shrink-0 p-4 px-6 border-t border-border dark:border-border bg-gray-50/90 dark:bg-zinc-900/60 flex flex-row items-center justify-end gap-2.5">
          {isArchived ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                onRestoreStudent?.(student.studentNo);
              }}
              className="h-10 px-5 text-xs font-semibold rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
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
              className="h-10 px-5 text-xs font-semibold rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Archive
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
