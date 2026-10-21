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
import { cn, formatTitleCase } from "@/lib/utils";
import { getRoleBranding } from "@/lib/roleBranding";

/**
 * Standard Information Row (label : value)
 * Clean metadata layout aligned with colons and icons.
 */
function InfoRow({ icon, label, value, children, className }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[135px_12px_1fr] sm:grid-cols-[150px_14px_1fr] items-start gap-1 text-xs py-1.5 border-b border-gray-100/70 dark:border-zinc-800/50 last:border-0",
        className
      )}
    >
      <div className="text-gray-500 dark:text-zinc-400 font-medium flex items-center gap-2 truncate">
        {icon && (
          <HugeIcon className={cn("text-gray-400 dark:text-zinc-500 text-sm shrink-0", icon)} />
        )}
        <span className="truncate">{label}</span>
      </div>
      <span className="text-gray-300 dark:text-zinc-600 select-none">:</span>
      <div className="text-gray-900 dark:text-zinc-100 font-semibold break-words min-w-0">
        {children ?? (value || <span className="text-gray-400 font-normal italic">None</span>)}
      </div>
    </div>
  );
}

export default function StudentProfileSheet({
  open,
  onOpenChange,
  student,
  currentIndex,
  totalCount,
  onNavigatePrev,
  onNavigateNext,
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

  const isOrg = Boolean(student?.category || student?.rawOrg);

  // Fetch document requests for this student (Registrar students only)
  useEffect(() => {
    let isMounted = true;
    if (!open || !student?.studentNo || isOrg) {
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
  }, [open, student?.studentNo, isOrg]);

  // Fetch active document types for requirements compliance
  const [docTypes, setDocTypes] = useState([]);
  const [complianceView, setComplianceView] = useState("checklist"); // "checklist" | "files"

  useEffect(() => {
    let isMounted = true;
    if (!open || isOrg) return;
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
  }, [open, isOrg]);

  // Gather documents associated with this student or organization
  const studentDocs = useMemo(() => {
    if (!student) return [];
    const sn = String(student.studentNo || student.id || "").trim().toLowerCase();
    const acronym = String(student.acronym || "").trim().toLowerCase();

    // 1. Matches from allDocs
    const matched = (allDocs || []).filter((d) => {
      const docSn = String(d.student_no || "").trim().toLowerCase();
      return (
        (sn && docSn === sn) ||
        (acronym && docSn === acronym) ||
        (student.name && String(d.student_name || "").trim().toLowerCase() === String(student.name).trim().toLowerCase())
      );
    });

    // 2. If OSAS organization and has CBL on file, inject CBL if not already present
    if (student.hasCbl && !matched.some((d) => (d.doc_type || "").toLowerCase().includes("bylaws") || (d.doc_type || "").toLowerCase().includes("constitution"))) {
      matched.unshift({
        id: `cbl-${student.rawOrg?.id || student.studentNo}`,
        student_no: student.studentNo,
        student_name: student.name,
        doc_type: "Constitution and By-Laws",
        original_filename: `${student.acronym || student.name}_CBL.pdf`,
        size_bytes: 2450000,
        approval_status: "Approved",
        created_at: student.rawOrg?.created_at || new Date().toISOString(),
        file_url: `/api/osas/organizations/${encodeURIComponent(student.rawOrg?.id || student.studentNo)}/bylaws?file=1`,
      });
    }

    return matched;
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
        size="default"
        showCloseButton={false}
        className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full bg-white dark:bg-card border-l border-border dark:border-border p-0 shadow-2xl overflow-hidden"
      >
        {/* Top Header matching reference design: Student Profile < > 01 of 100 X */}
        <SheetHeader className="shrink-0 p-0 border-b border-border dark:border-border bg-white dark:bg-card">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <SheetTitle className="text-base font-bold text-gray-900 dark:text-zinc-50 tracking-tight">
                {student?.category || student?.rawOrg ? "Organization Details" : "Student Details"}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Detailed profile, physical archive location, and digitized records
              </SheetDescription>
            </div>

            <div className="flex items-center gap-3">
              {typeof totalCount === "number" && totalCount > 1 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400">
                  <button
                    type="button"
                    disabled={currentIndex <= 0}
                    onClick={onNavigatePrev}
                    className="w-7 h-7 rounded-lg border border-border/80 dark:border-border flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                    aria-label={student?.category || student?.rawOrg ? "Previous Organization" : "Previous Student"}
                    title={student?.category || student?.rawOrg ? "Previous Organization" : "Previous Student"}
                  >
                    <HugeIcon className="ph-bold ph-caret-left text-xs" />
                  </button>
                  <button
                    type="button"
                    disabled={currentIndex >= totalCount - 1}
                    onClick={onNavigateNext}
                    className="w-7 h-7 rounded-lg border border-border/80 dark:border-border flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                    aria-label={student?.category || student?.rawOrg ? "Next Organization" : "Next Student"}
                    title={student?.category || student?.rawOrg ? "Next Organization" : "Next Student"}
                  >
                    <HugeIcon className="ph-bold ph-caret-right text-xs" />
                  </button>
                  <span className="font-mono text-[11px] font-semibold text-gray-700 dark:text-zinc-300 ml-0.5">
                    {String(Math.max(1, (currentIndex ?? 0) + 1)).padStart(2, "0")} of {String(totalCount).padStart(2, "0")}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="w-8 h-8 rounded-xl bg-gray-100/90 hover:bg-gray-200/90 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/5 dark:border-white/10 shadow-2xs"
                aria-label="Close"
                title="Close"
              >
                <HugeIcon className="ph-bold ph-x text-sm" />
              </button>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable Single-Column Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Profile Card Summary Strip */}
          <div className="rounded-2xl border border-border/80 dark:border-border bg-gray-50/60 dark:bg-zinc-900/40 p-4 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border"
                style={{
                  backgroundColor: authUser?.accent_color ? `${authUser.accent_color}15` : "rgba(128, 0, 0, 0.08)",
                  color: authUser?.accent_color || "#800000",
                  borderColor: authUser?.accent_color ? `${authUser.accent_color}30` : "rgba(128, 0, 0, 0.2)",
                }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-gray-900 dark:text-zinc-100 truncate block">
                  {displayName}
                </span>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-mono truncate mt-0.5">
                  {student.acronym || student.studentNo}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEditStudent?.(student);
                }}
                title={student?.category || student?.rawOrg ? "Edit Organization Information" : "Edit Student Information"}
                className="h-8 px-3 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-2xs cursor-pointer active:scale-95 transition-all"
              >
                {student?.category || student?.rawOrg ? "Edit Organization" : "Edit Student"}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onLocateStudent?.(student);
                }}
                title="Locate in Physical Archive"
                className="h-8 px-3 text-xs font-semibold rounded-xl btn-brand-red text-white! cursor-pointer shadow-2xs active:scale-95 transition-all"
                style={{ color: "#ffffff" }}
              >
                Locate Drawer
              </Button>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                  isArchived
                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full mr-1", isArchived ? "bg-amber-500" : "bg-emerald-500")} />
                {student.status || "Active"}
              </Badge>
            </div>
          </div>

          {/* 1. Academic & Enrollment Details (Standard Info List) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-1.5 border-b border-border/80 dark:border-border">
              <HugeIcon
                className={cn(
                  "text-pup-maroon dark:text-red-400 text-sm",
                  student?.category || student?.rawOrg ? "ph-bold ph-buildings" : "ph-bold ph-graduation-cap"
                )}
              />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                {student?.category || student?.rawOrg ? "Organization & Registry Details" : "Academic & Registry Details"}
              </h3>
            </div>

            <div className="divide-y-0">
              {student?.category || student?.rawOrg ? (
                <>
                  <InfoRow
                    icon="ph-bold ph-hash"
                    label="Organization Acronym"
                  >
                    <span className="font-mono text-gray-800 dark:text-zinc-200 font-semibold">
                      {student.acronym || student.studentNo}
                    </span>
                  </InfoRow>

                  <InfoRow
                    icon="ph-bold ph-buildings"
                    label="Organization Name"
                    value={displayName}
                  />

                  <InfoRow
                    icon="ph-bold ph-tag"
                    label="Category"
                    value={student.category || "Academic"}
                  />

                  <InfoRow
                    icon="ph-bold ph-user-circle"
                    label="Faculty Adviser"
                    value={student.adviser || student.rawOrg?.adviser_name || "N/A"}
                  />

                  <InfoRow
                    icon="ph-bold ph-info"
                    label="Registry Status"
                  >
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                        isArchived
                          ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full mr-1", isArchived ? "bg-amber-500" : "bg-emerald-500")} />
                      {student.status || "Active"}
                    </Badge>
                  </InfoRow>
                </>
              ) : (
                <>
                  <InfoRow
                    icon="ph-bold ph-hash"
                    label="Student Number"
                  >
                    <span className="font-mono text-gray-800 dark:text-zinc-200 font-semibold">
                      {student.studentNo}
                    </span>
                  </InfoRow>

                  <InfoRow
                    icon="ph-bold ph-user"
                    label="Full Name"
                    value={displayName}
                  />

                  <InfoRow
                    icon="ph-bold ph-book-open"
                    label="Degree Program"
                    value={
                      courseInfo
                        ? `${courseInfo.code} — ${courseInfo.name}`
                        : student.courseCode || "N/A"
                    }
                  />

                  <InfoRow
                    icon="ph-bold ph-users"
                    label="Section"
                    value={student.section ? `Section ${student.section}` : "N/A"}
                  />

                  <InfoRow
                    icon="ph-bold ph-calendar-blank"
                    label="Entry Year / Batch"
                    value={student.yearLevel ? `Batch ${student.yearLevel}` : "N/A"}
                  />

                  <InfoRow
                    icon="ph-bold ph-info"
                    label="Registry Status"
                  >
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                        isArchived
                          ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full mr-1", isArchived ? "bg-amber-500" : "bg-emerald-500")} />
                      {student.status || "Active"}
                    </Badge>
                  </InfoRow>
                </>
              )}
            </div>
          </div>

          {/* 2. Physical Archive Filing Location (Standard Info List) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-1.5 border-b border-border/80 dark:border-border">
              <HugeIcon className="ph-bold ph-warehouse text-pup-maroon dark:text-red-400 text-sm" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                Physical Archive Filing Location
              </h3>
            </div>

            <div className="divide-y-0">
              <InfoRow
                icon="ph-bold ph-door"
                label="Archive Room"
                value={`Room ${student.room}`}
              />

              <InfoRow
                icon="ph-bold ph-archive"
                label="Filing Cabinet"
                value={`Cabinet ${student.cabinet}`}
              />

              <InfoRow
                icon="ph-bold ph-tray"
                label="Drawer Number"
                value={`Drawer ${student.drawer}`}
              />

              <InfoRow
                icon="ph-bold ph-map-pin"
                label="Full Coordinates"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-semibold text-gray-800 dark:text-zinc-200">
                    Room {student.room} • Cabinet {student.cabinet} • Drawer {student.drawer}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      onLocateStudent?.(student);
                    }}
                    className="h-6 px-2 text-[10px] font-semibold rounded-md border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 shadow-2xs active:scale-95 transition-all cursor-pointer"
                  >
                    Locate
                  </Button>
                </div>
              </InfoRow>
            </div>
          </div>

          {/* 3. Requirements Compliance & Digitized Records */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-border/80 dark:border-border flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <HugeIcon className="ph-bold ph-files text-pup-maroon dark:text-red-400 text-sm" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                    {isOrg ? "Organization Records & Documents" : "Requirements Compliance & Records"} ({studentDocs.length})
                  </h3>
                </div>
                {!isOrg && complianceSummary.total > 0 && (
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

              {/* View Switcher: Checklist vs Files (Students only) */}
              {!isOrg && (
                <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-gray-200/60 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setComplianceView("checklist")}
                    className={cn(
                      "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
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
                      "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                      complianceView === "files"
                        ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                        : "text-gray-500 hover:text-gray-900 dark:text-zinc-400"
                    )}
                  >
                    Files ({studentDocs.length})
                  </button>
                </div>
              )}
            </div>

            {!isOrg && complianceView === "checklist" && requirementsList.length > 0 ? (
              <div className="rounded-xl border border-border/80 dark:border-border overflow-hidden divide-y divide-border/70 dark:divide-border bg-white dark:bg-zinc-900/30">
                {requirementsList.map((req, index) => {
                  const isApproved = req.status === "Approved";
                  const isPending = req.status === "Pending";
                  const isDeclined = req.status === "Declined";
                  const isMissing = req.status === "Missing";

                  return (
                    <div
                      key={req.id || `req-${index}-${req.name || ""}`}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs shadow-2xs",
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
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate block">
                            {req.name}
                          </span>
                          <span className="text-[10px] text-gray-500 dark:text-zinc-400 block truncate">
                            {req.doc?.original_filename || (isMissing ? "Not submitted to archive" : "Pending document")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
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
                                    student.acronym || student.studentNo,
                                    req.doc.id
                                  );
                                }}
                                aria-label="Preview Document"
                                className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-all border border-transparent hover:border-gray-200 dark:hover:border-zinc-700 bg-transparent"
                              >
                                <HugeIcon className="ph-bold ph-eye text-xs" />
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
              <div className="py-4 text-center text-xs text-gray-400 dark:text-zinc-500 italic">
                {isOrg
                  ? "No digitized records uploaded for this organization yet."
                  : "No digitized records uploaded for this student yet."}
              </div>
            ) : (
              <div className="rounded-xl border border-border/80 dark:border-border overflow-hidden divide-y divide-border/70 dark:divide-border bg-white dark:bg-zinc-900/30">
                {studentDocs.map((doc, docIdx) => (
                  <div
                    key={doc.id || `doc-${docIdx}`}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-900/30 flex items-center justify-center text-pup-maroon dark:text-red-400 shrink-0">
                        <HugeIcon className="ph-bold ph-file-pdf text-base" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate">
                          {doc.doc_type || "Document"}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-zinc-400 truncate mt-0.5">
                          {doc.original_filename || "document.pdf"} • {formatPHDateTime(doc.created_at)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
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
                              const isCbl = String(doc.id || "").startsWith("cbl-");
                              const previewTarget = isCbl
                                ? (student.rawOrg?.bylaws_storage_filename || student.bylawsStorageFilename || doc.id)
                                : doc.id;
                              onPreviewDocument?.(
                                doc.doc_type || "Document",
                                student.name,
                                student.acronym || student.studentNo,
                                previewTarget
                              );
                            }}
                            aria-label="Preview Document"
                            className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-all border border-transparent hover:border-gray-200 dark:hover:border-zinc-700 bg-transparent"
                          >
                            <HugeIcon className="ph-bold ph-eye text-xs" />
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

          {/* 4. Document Requests History (Students only) */}
          {!isOrg && (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-border/80 dark:border-border">
                <div className="flex items-center gap-2">
                  <HugeIcon className="ph-bold ph-clock-counter-clockwise text-pup-maroon dark:text-red-400 text-sm" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                    Requests History ({requests.length})
                  </h3>
                </div>
              </div>

              {isLoadingRequests ? (
                <div className="py-4 text-center text-xs text-gray-400">
                  <HugeIcon className="ph-bold ph-spinner animate-spin text-sm mb-1 block mx-auto text-pup-maroon dark:text-red-400" />
                  Loading requests...
                </div>
              ) : requests.length === 0 ? (
                <div className="py-4 text-center text-xs text-gray-400 dark:text-zinc-500 italic">
                  No document requests recorded for this student.
                </div>
              ) : (
                <div className="rounded-xl border border-border/80 dark:border-border overflow-hidden divide-y divide-border/70 dark:divide-border bg-white dark:bg-zinc-900/30">
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
          )}
        </div>

        {/* Executive Footer - Clean Action Bar */}
        <SheetFooter className="shrink-0 p-4 px-6 border-t border-border dark:border-border bg-gray-50/70 dark:bg-zinc-900/40 flex flex-row items-center justify-between shrink-0">
          <div>
            {isArchived ? (
              onRestoreStudent && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    onRestoreStudent?.(student.studentNo);
                  }}
                  className="h-10 px-4 text-xs font-semibold rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  {isOrg ? "Restore Organization Record" : "Restore Student Record"}
                </Button>
              )
            ) : (
              onArchiveStudent && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    onArchiveStudent?.(student.studentNo);
                  }}
                  className="h-10 px-4 text-xs font-semibold rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  {isOrg ? "Archive Organization Record" : "Archive Student Record"}
                </Button>
              )
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 px-5 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
