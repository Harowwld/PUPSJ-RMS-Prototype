"use client";
import { BADGE_BASE } from "@/lib/badgeStyles";


import React, { useState, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import GoogleDrivePdfCard from "./GoogleDrivePdfCard";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { cn, formatTitleCase } from "@/lib/utils";
import ViewModeIcon from "@/components/shared/ViewModeIcon";
import { SegmentedControl } from "@/components/ui/tabs";
import { getRoleBranding } from "@/lib/roleBranding";
import { motion } from "framer-motion";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import { Files01Icon as EmptyFiles01Icon , Location01Icon} from "hugeicons-react";

export default function StudentDriveFilesView({
  student,
  allDocs = [],
  onLocateStudent,
  onPreviewDocument,
  onRescan,
  onBack,
  authUser = null,
  onOpenDossier,
  onOpenDetails,
}) {
  const branding = useMemo(() => getRoleBranding(authUser), [authUser]);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const handleOpenDetails = onOpenDetails || onOpenDossier;

  // Gather all documents for this student or organization
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
  }, [student, allDocs]);

  if (!student) return null;

  const displayName = student.name && !student.name.startsWith("enc:v1:")
    ? student.name
    : (student.studentNo ? `Student (${student.studentNo})` : "Student Record");

  const initials = displayName
    .replace(/[^a-zA-Z\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "ST";

  return (
    <div className="w-full space-y-4">
      {/* 1. Header Banner: Back button, Student identity, Physical storage pill, and Locate button */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 bg-white dark:bg-card rounded-2xl border border-border/80 dark:border-border shadow-xs">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {/* Back Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-9 px-4 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 text-xs font-semibold cursor-pointer active:scale-95 transition-all shrink-0 shadow-2xs"
            title="Back to Records"
          >
            Back
          </Button>

          {/* Student Avatar Tile */}
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
              color: authUser?.accent_color || "#800000",
              borderColor: authUser?.accent_color ? `${authUser.accent_color}30` : "rgba(128, 0, 0, 0.2)",
            }}
          />

          {/* Student Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-zinc-100 truncate" title={formatTitleCase(displayName)}>
                {formatTitleCase(displayName)}
              </h3>
              {student.category && (
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300", BADGE_BASE)}>
                  {student.category}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-gray-500 dark:text-zinc-400">
              <span className="font-sans tabular-nums text-[11px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200/60 dark:border-zinc-700">
                {student.acronym || student.studentNo}
              </span>
              {student.adviser && (
                <>
                  <span>•</span>
                  <span className="truncate">Adviser: {student.adviser}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Physical Storage, Archive Location, Student Details, and View Controls */}
        <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-between lg:justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-border/60">
          {/* Physical Storage Coordinates Badge */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-100/90 dark:bg-zinc-800/80 border border-gray-200/70 dark:border-white/5 text-xs font-semibold text-gray-800 dark:text-zinc-200 select-none">
            <Location01Icon size="1em" className="text-pup-maroon dark:text-red-400 text-sm" />
            <span>
              Room {student.room} • Cabinet {student.cabinet} • Drawer {student.drawer}
            </span>
          </div>

          {/* LOCATE FEATURE */}
          {onLocateStudent && (
            <Button
              type="button"
              size="sm"
              onClick={() => onLocateStudent(student)}
              className="h-9 px-4 cursor-pointer"
              title="Locate student's physical filing drawer in the archive map"
            >
              Locate Archive Drawer
            </Button>
          )}

          {/* Record Details Sheet Opener */}
          {handleOpenDetails && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDetails(student)}
                  className="h-9 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer active:scale-95 shadow-2xs"
                  title={`View ${student?.category || student?.rawOrg ? "Organization" : "Student"} Details`}
                >
                  {student?.category || student?.rawOrg ? "View Org Details" : "View Student Details"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                View {student?.category || student?.rawOrg ? "Organization" : "Student"} Details
              </TooltipContent>
            </Tooltip>
          )}

          {/* View Mode Toggle: Grid vs List (Integrated into top header) */}
          <SegmentedControl
            value={viewMode}
            onValueChange={setViewMode}
            variant="capsule"
            className="inline-grid grid-flow-col auto-cols-fr shrink-0"
            items={[
              { value: "grid", label: "Grid", icon: <ViewModeIcon mode="grid" className="text-sm" /> },
              { value: "list", label: "List", icon: <ViewModeIcon mode="list" className="text-sm" /> },
            ]}
          />
        </div>
      </div>

      {/* 3. Document Files Content Area */}
      {studentDocs.length === 0 ? (
        // Standard Empty State
        <div className="rounded-2xl flex-1 flex flex-col items-center justify-center min-h-[380px] w-full bg-white/40 dark:bg-card/40 border border-border/60 dark:border-border">
          <Empty>
            <EmptyHeader>
              <EmptyMedia><EmptyFiles01Icon size="1em" /></EmptyMedia>
              <EmptyTitle>
                No Digitized Documents in this Folder
              </EmptyTitle>
              <EmptyDescription>
                Hardcopy physical archives for {displayName} are safely filed in Room {student.room}, Cabinet {student.cabinet}, Drawer {student.drawer}.
              </EmptyDescription>
            </EmptyHeader>
            {onLocateStudent && (
              <EmptyContent>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onLocateStudent(student)}
                  className="h-9 px-4 cursor-pointer"
                >
                  Locate Archive Drawer in Storage Map
                </Button>
              </EmptyContent>
            )}
          </Empty>
        </div>
      ) : viewMode === "grid" ? (
        // Grid View of Google Drive PDF Cards
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {studentDocs.map((doc, idx) => (
            <GoogleDrivePdfCard
              key={doc.id || `doc-${idx}`}
              doc={doc}
              student={student}
              viewMode="grid"
              onPreview={onPreviewDocument}
              onLocate={onLocateStudent}
              onRescan={onRescan}
            />
          ))}
        </motion.div>
      ) : (
        // List View
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-2"
        >
          {studentDocs.map((doc, idx) => (
            <GoogleDrivePdfCard
              key={doc.id || `doc-${idx}`}
              doc={doc}
              student={student}
              viewMode="list"
              onPreview={onPreviewDocument}
              onLocate={onLocateStudent}
              onRescan={onRescan}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
