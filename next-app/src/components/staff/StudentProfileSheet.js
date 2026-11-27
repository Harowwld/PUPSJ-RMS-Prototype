"use client";


import EditOdrsEmailDialog from "./EditOdrsEmailDialog";
import CopyButton from "@/components/shared/CopyButton";
import SheetPagination from "@/components/shared/SheetPagination";
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";
import StudentRecordsReportDialog from "@/components/shared/StudentRecordsReportDialog";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatPHDateTime } from "@/lib/timeFormat";
import { cn } from "@/lib/utils";
import { COMPACT_BADGE_BASE, BADGE_BASE, BADGE_PALETTES } from "@/lib/badgeStyles";
import { getRoleBranding } from "@/lib/roleBranding";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import { EmptyState } from "@/components/ui/empty";
import { Files01Icon, InboxIcon, Calendar01Icon, Cancel01Icon, File02Icon, Loading01Icon, MoreHorizontalIcon, ReloadIcon, Time01Icon, ViewIcon, WarehouseIcon } from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
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
          <AppIcon className={cn("text-gray-400 dark:text-zinc-500 text-sm shrink-0", icon)} />
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

const documentListClass = "divide-y divide-border overflow-hidden rounded-xl border border-border bg-white dark:bg-card";

const documentStatusVariants = {
  Approved: "success",
  Pending: "warning",
  Declined: "danger",
  Missing: "secondary",
};

function ProfileDocumentRow({ name, description, status, onPreview, onRescan }) {
  const Main = onPreview ? "button" : "div";
  return (
    <li className="flex items-center gap-1 pr-2">
      <Main
        {...(onPreview ? { type: "button", onClick: onPreview, "aria-label": `Preview ${name}` } : {})}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left",
          onPreview && "cursor-pointer rounded-lg transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
        )}
      >
        <File02Icon size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold">{name}</span>
          <span className="block truncate text-[10px] text-muted-foreground">{description}</span>
        </span>
        <Badge size="compact" variant={documentStatusVariants[status] || "secondary"}>
          {status === "Missing" ? "Not Submitted" : status}
        </Badge>
      </Main>
      {(onPreview || onRescan) && (
        <DropdownMenu>
          <DropdownMenuTrigger className="table-action-button rounded-lg" aria-label={`Actions for ${name}`}>
            <MoreHorizontalIcon size={16} aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onPreview && (
              <DropdownMenuItem onClick={onPreview}>
                <ViewIcon size="1em" aria-hidden="true" />
                {PDF_ACTION_LABELS.preview}
              </DropdownMenuItem>
            )}
            {onRescan && (
              <DropdownMenuItem onClick={onRescan}>
                <ReloadIcon size="1em" aria-hidden="true" />
                Re-scan Document
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
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
  onRescan,
  onEditStudent,
  onOdrsEmailSaved,
  onArchiveStudent,
  onRestoreStudent,
  authUser = null,
}) {
  const branding = useMemo(() => getRoleBranding(authUser), [authUser]);
  const odrsEmail = student?.odrsEmail;
  const [requests, setRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

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
      const organizationId = String(d.organization_id || "").trim().toLowerCase();
      return (
        (sn && organizationId === sn) ||
        (acronym && organizationId === acronym) ||
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
      if (typeof dt === "object" && (dt?.is_requestable || dt?.isRequestable)) return false;
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

  function getDocumentActions(doc, name) {
    if (!doc) return {};
    const isCbl = String(doc.id || "").startsWith("cbl-");
    return {
      onPreview: onPreviewDocument && (() => {
        const target = isCbl
          ? student.rawOrg?.bylaws_storage_filename || student.bylawsStorageFilename || doc.id
          : doc.id;
        onPreviewDocument(name, student.name, student.acronym || student.studentNo, target);
      }),
      onRescan: onRescan && !doc.source_type && !isCbl ? () => {
        onOpenChange(false);
        onRescan(
          doc.organization_id || doc.student_no || student.rawOrg?.id || student.studentNo,
          name,
          doc.id,
          doc.original_filename,
          doc.mime_type
        );
      } : undefined,
    };
  }

  const organizationFiles = !isOrg ? null : studentDocs.length ? (
    <ul className={documentListClass}>
      {studentDocs.map((doc, index) => {
        const name = doc.doc_type || "Document";
        return (
          <ProfileDocumentRow
            key={doc.id || `doc-${index}`}
            name={name}
            description={`${doc.original_filename || "document.pdf"} • ${formatPHDateTime(doc.created_at)}`}
            status={doc.approval_status || "Pending"}
            {...getDocumentActions(doc, name)}
          />
        );
      })}
    </ul>
  ) : (
    <EmptyState
      variant="compact"
      icon={Files01Icon}
      title="No Digitized Records"
      description="No digitized records uploaded for this organization yet."
    />
  );

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        size="default"
        showCloseButton={false}
        className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full p-0 overflow-hidden"
      >
        <SheetHeader className="shrink-0 p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <div>
              <SheetTitle>
                {student?.category || student?.rawOrg ? "Organization Details" : "Student Details"}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Detailed profile, physical archive location, and digitized records
              </SheetDescription>
            </div>

            <div className="ml-auto flex items-center gap-3">
              {typeof totalCount === "number" && totalCount > 1 && (
                <SheetPagination
                  compact
                  label="Record navigation"
                  page={Math.max(1, (currentIndex ?? 0) + 1)}
                  totalPages={totalCount}
                  onPrevious={onNavigatePrev}
                  onNext={onNavigateNext}
                  previousDisabled={currentIndex <= 0}
                  nextDisabled={currentIndex >= totalCount - 1}
                  previousLabel={student?.category || student?.rawOrg ? "Previous Organization" : "Previous Student"}
                  nextLabel={student?.category || student?.rawOrg ? "Next Organization" : "Next Student"}
                />
              )}

              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="size-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/[0.04] dark:border-white/[0.08] shadow-2xs"
                aria-label="Close"
                title="Close"
              >
                <Cancel01Icon size="1em" className="text-sm" />
              </button>
            </div>
          </div>
        </SheetHeader>

        {/* Line-Attached Edge-to-Edge Status Notice */}
        <div
          className={cn(
            "flex items-center gap-2.5 px-6 py-2.5 text-xs border-b transition-colors shrink-0",
            isArchived
              ? "border-amber-200/90 bg-amber-50/90 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200"
              : "border-emerald-200/90 bg-emerald-50/90 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200"
          )}
        >
          <AppIcon
            className={cn(
              " text-[15px] shrink-0",
              isArchived ? "Archive01Icon text-amber-600 dark:text-amber-400" : "CheckmarkCircle01Icon text-emerald-600 dark:text-emerald-400"
            )}
          />
          <span className="font-medium text-[11.5px] sm:text-xs leading-normal">
            <strong className="font-semibold">
              {isArchived ? "Archived Record:" : "Active Archive Profile:"}
            </strong>{" "}
            {isArchived
              ? `This record is archived. Located in Room ${student.room}, Cabinet ${student.cabinet}, Drawer ${student.drawer}.`
              : `Institutional record active in Room ${student.room}, Cabinet ${student.cabinet}, Drawer ${student.drawer}.`}
          </span>
        </div>

        {/* Scrollable Single-Column Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Profile Identity Summary Strip (Unboxed) */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-border/80 dark:border-border">
            <div className="flex items-center gap-3.5 min-w-0">
              <ProfileAvatar
                id={student.id || student.account_id || student.accountId || student.studentNo}
                studentNo={student.studentNo}
                accountId={student.account_id || student.accountId}
                avatarFilename={student.avatar_filename || student.avatarFilename}
                name={displayName}
                initials={initials}
                className="size-11 rounded-2xl shadow-xs border select-none"
                imageClassName="rounded-2xl"
                fallbackClassName="rounded-2xl font-bold text-sm"
                fallbackStyle={{
                  backgroundColor: authUser?.accent_color ? `${authUser.accent_color}15` : "rgba(128, 0, 0, 0.08)",
                  color: isOrg ? "#ffffff" : authUser?.accent_color || "#800000",
                  borderColor: authUser?.accent_color ? `${authUser.accent_color}30` : "rgba(128, 0, 0, 0.2)",
                }}
              />
              <div className="min-w-0">
                <span className="text-base font-bold text-gray-900 dark:text-zinc-100 truncate block">
                  {displayName}
                </span>
                <p className="text-xs text-gray-500 dark:text-zinc-400 font-sans tabular-nums truncate mt-0.5">
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
                className="h-8 px-3 text-xs font-semibold rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                {student?.category || student?.rawOrg ? "Edit Organization" : "Edit Student"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onLocateStudent?.(student);
                }}
                title="Locate in Physical Archive"
                className="h-8 px-3 cursor-pointer"
              >
                Locate Drawer
              </Button>
            </div>
          </div>

          {/* 1. Academic & Enrollment Details (Standard Info List) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-1.5 border-b border-border/80 dark:border-border">
              <AppIcon
                className={cn(
                  "text-pup-maroon dark:text-red-400 text-sm",
                  student?.category || student?.rawOrg ? " Building01Icon" : " GraduationScrollIcon"
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
                    icon=" Tag01Icon"
                    label="Organization Acronym"
                  >
                    <span className="font-sans tabular-nums text-gray-800 dark:text-zinc-200 font-semibold">
                      {student.acronym || student.studentNo}
                    </span>
                  </InfoRow>

                  <InfoRow
                    icon=" Building01Icon"
                    label="Organization Name"
                    value={displayName}
                  />

                  <InfoRow
                    icon=" Tag01Icon"
                    label="Category"
                    value={student.category || "Academic"}
                  />

                  <InfoRow
                    icon=" UserCircleIcon"
                    label="Faculty Adviser"
                    value={student.adviser || student.rawOrg?.adviser_name || "N/A"}
                  />

                  <InfoRow
                    icon=" CovidInfoIcon"
                    label="Registry Status"
                  >
                    <span
                      className={cn(isArchived ? BADGE_PALETTES.amber : BADGE_PALETTES.emerald, BADGE_BASE)}
                    >
                      {student.status || "Active"}
                    </span>
                  </InfoRow>
                </>
              ) : (
                <>
                  <InfoRow
                    icon=" Tag01Icon"
                    label="Student Number"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="select-text font-sans tabular-nums">{student.studentNo}</span>
                      {student.studentNo && (
                        <CopyButton
                          iconOnly
                          textToCopy={student.studentNo}
                          entityName="Student Number"
                          showToast={false}
                        />
                      )}
                    </div>
                  </InfoRow>

                  <InfoRow
                    icon=" UserIcon"
                    label="Full Name"
                    value={displayName}
                  />

                  {(authUser?.office_id || authUser?.officeId) === "registrar" && (
                    <InfoRow icon=" Mail01Icon" label="ODRS Email">
                      <div className="flex flex-wrap items-center gap-2">
                        {odrsEmail ? (
                          <>
                            <span className="select-text break-all">{odrsEmail}</span>
                            <CopyButton
                              iconOnly
                              textToCopy={odrsEmail}
                              entityName="ODRS Email"
                              showToast={false}
                            />
                          </>
                        ) : (
                          <span className="font-normal text-muted-foreground">Not recorded</span>
                        )}
                        {student.status !== "Archived" && (
                          <EditOdrsEmailDialog key={student.studentNo} studentNo={student.studentNo} email={odrsEmail}
                            onSaved={(email) => onOdrsEmailSaved?.(student.studentNo, email)} />
                        )}
                      </div>
                    </InfoRow>
                  )}

                  <InfoRow
                    icon=" BookOpen01Icon"
                    label="Degree Program"
                    value={
                      courseInfo
                        ? `${courseInfo.code} — ${courseInfo.name}`
                        : student.courseCode || "N/A"
                    }
                  />

                  <InfoRow
                    icon=" UserSearch01Icon"
                    label="Section"
                    value={student.section ? `Section ${student.section}` : "N/A"}
                  />

                  <InfoRow
                    icon=" Calendar01Icon"
                    label="Entry Year / Batch"
                    value={student.yearLevel ? `Batch ${student.yearLevel}` : "N/A"}
                  />

                  <InfoRow
                    icon=" CovidInfoIcon"
                    label="Registry Status"
                  >
                    <span
                      className={cn(isArchived ? BADGE_PALETTES.amber : BADGE_PALETTES.emerald, BADGE_BASE)}
                    >
                      {student.status || "Active"}
                    </span>
                  </InfoRow>
                </>
              )}
            </div>
          </div>

          {/* 2. Physical Archive Filing Location (Standard Info List) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-1.5 border-b border-border/80 dark:border-border">
              <WarehouseIcon size="1em" className="text-pup-maroon dark:text-red-400 text-sm" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                Physical Archive Location
              </h3>
            </div>

            <div className="divide-y divide-gray-100/70 dark:divide-zinc-800/50">
              <InfoRow
                icon=" Door01Icon"
                label="Archive Vault"
                value={`Room ${student.room}`}
              />

              <InfoRow icon=" Archive01Icon" label="Cabinet & Drawer">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tabular-nums">Cabinet {student.cabinet} · Drawer {student.drawer}</span>
                  {onLocateStudent && (
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => {
                        onOpenChange(false);
                        onLocateStudent(student);
                      }}
                    >
                      Locate Drawer
                    </Button>
                  )}
                </div>
              </InfoRow>
            </div>
          </div>

          {/* 3. Requirements Compliance & Digitized Records */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-1.5">
              <div>
                <div className="flex items-center gap-2">
                  <Files01Icon size="1em" className="text-pup-maroon dark:text-red-400 text-sm" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                    {isOrg ? `Organization Records & Documents (${studentDocs.length})` : "Requirements Checklist"}
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

            </div>

            {isOrg ? organizationFiles : requirementsList.length ? (
              <ul className={documentListClass}>
                {requirementsList.map(({ id, name, status, doc }) => (
                  <ProfileDocumentRow
                    key={id}
                    name={name}
                    description={doc?.original_filename || (status === "Missing" ? "Not submitted to archive" : "Pending document")}
                    status={status}
                    {...getDocumentActions(doc, name)}
                  />
                ))}
              </ul>
            ) : (
              <EmptyState
                variant="compact"
                icon={Files01Icon}
                title="No Checklist Requirements"
              />
            )}
          </section>

          {/* 4. Document Requests History (Students only) */}
          {!isOrg && (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-border/80 dark:border-border">
                <div className="flex items-center gap-2">
                  <Time01Icon size="1em" className="text-pup-maroon dark:text-red-400 text-sm" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                    Requests History ({requests.length})
                  </h3>
                </div>
              </div>

              {isLoadingRequests ? (
                <div className="py-4 text-center text-xs text-gray-400">
                  <Loading01Icon size="1em" className="animate-spin text-sm mb-1 block mx-auto text-pup-maroon dark:text-red-400" />
                  Loading requests...
                </div>
              ) : requests.length === 0 ? (
                <EmptyState
                  variant="compact"
                  icon={InboxIcon}
                  title="No Document Requests"
                  description="No document requests recorded for this student."
                />
              ) : (
                <div className="rounded-xl border border-border/80 dark:border-border overflow-hidden divide-y divide-border/70 dark:divide-border bg-white dark:bg-zinc-900/40">
                  {requests.map((req, reqIdx) => (
                    <div key={req.id || `req-hist-${reqIdx}`} className="p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-gray-900 dark:text-zinc-100 truncate">
                          {req.doc_type || req.requested_document || "Document Request"}
                        </span>
                        <span
                          className={cn("text-[10px]", req.status === "Completed"
                              ? BADGE_PALETTES.emerald
                              : req.status === "InProgress"
                              ? BADGE_PALETTES.blue
                              : req.status === "Ready"
                              ? BADGE_PALETTES.purple
                              : BADGE_PALETTES.amber, COMPACT_BADGE_BASE)}
                        >
                          {req.status === "InProgress" ? "In Progress" : (req.status || "Pending")}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-zinc-400 flex items-center gap-1 font-sans tabular-nums">
                        <Calendar01Icon size="1em" className="text-[10px]" />
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
        <SheetFooter className="shrink-0 flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Close
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            {isArchived ? (
              onRestoreStudent && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onRestoreStudent?.(student.studentNo);
                  }}
                  className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  {isOrg ? "Restore Organization Record" : "Restore Student Record"}
                </Button>
              )
            ) : (
              onArchiveStudent && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onArchiveStudent?.(student.studentNo);
                  }}
                  className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  {isOrg ? "Archive Organization Record" : "Archive Student"}
                </Button>
              )
            )}
            {!isOrg && <Button size="sm" className="h-9 px-4" onClick={() => setReportOpen(true)}>Preview Student Records Report</Button>}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
    {!isOrg && <StudentRecordsReportDialog
      key={`${student.studentNo}:${authUser?.office_id || "registrar"}`}
      open={open && reportOpen}
      onClose={() => setReportOpen(false)}
      studentNo={student.studentNo}
      officeId={authUser?.office_id || "registrar"}
    />}
    </>
  );
}
