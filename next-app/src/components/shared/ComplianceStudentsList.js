"use client";

import { useState } from "react";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import { BADGE_BASE, BADGE_PALETTES } from "@/lib/badgeStyles";
import { ArrowDown01Icon } from "hugeicons-react";
import { cn } from "@/lib/utils";

const requirementStates = [
  {
    status: "declined",
    label: "Needs correction",
    countLabel: "need correction",
    palette: BADGE_PALETTES.rose,
  },
  {
    status: "missing",
    label: "Missing",
    countLabel: "missing",
    palette: BADGE_PALETTES.amber,
  },
  {
    status: "pending",
    label: "Awaiting review",
    countLabel: "awaiting review",
    palette: BADGE_PALETTES.blue,
  },
];

function countLabel(group, count) {
  return group.status === "declined" && count === 1
    ? "needs correction"
    : group.countLabel;
}

function StudentIdentity({ student }) {
  return (
    <div className="flex items-start gap-3 min-w-0 flex-1">
      <ProfileAvatar
        id={student.studentNo}
        name={student.name || "Student"}
        className="size-9 rounded-full shrink-0 border border-black/10 dark:border-white/10"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[13px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-100 truncate">
            {student.name || "Student"}
          </span>
          <span className="font-mono text-[11px] text-gray-500 dark:text-zinc-400 tabular-nums">
            {student.studentNo}
          </span>
        </div>
        {(student.courseCode || student.section) && (
          <div className="mt-0.5 text-[11.5px] text-gray-500 dark:text-zinc-400 truncate">
            {[student.courseCode, student.section].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewNote({ requirement }) {
  if (requirement.status !== "declined" || !requirement.doc?.review_note) return null;
  return (
    <div className="mt-2.5 p-2.5 rounded-lg bg-gray-50/80 dark:bg-zinc-800/50 border border-black/[0.04] dark:border-white/[0.06] text-[11.5px] leading-relaxed text-gray-600 dark:text-zinc-300">
      <span className="font-semibold text-gray-800 dark:text-zinc-200">
        Review note:{" "}
      </span>
      {requirement.doc.review_note}
    </div>
  );
}

export default function ComplianceStudentsList({
  students = [],
  singleDocument = false,
}) {
  return (
    <div
      className="space-y-2.5"
      aria-label="Students with outstanding requirements"
    >
      {students.map((student) => {
        const requirements = student.outstandingRequirements || [];
        const groups = requirementStates
          .map((state) => ({
            ...state,
            requirements: requirements.filter(
              (requirement) => requirement.status === state.status
            ),
          }))
          .filter((group) => group.requirements.length > 0);

        if (singleDocument) {
          const requirement = requirements[0];
          const state = groups[0] || requirementStates[1];
          return (
            <div
              key={student.studentNo}
              className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-900/60 p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <StudentIdentity student={student} />
                <span
                  className={cn(BADGE_BASE, state.palette)}
                >
                  {state.label}
                </span>
              </div>
              {requirement && <ReviewNote requirement={requirement} />}
            </div>
          );
        }

        return (
          <div
            key={student.studentNo}
            className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-900/60 p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all"
          >
            <details className="group/record">
              <summary className="cursor-pointer list-none select-none outline-none [&::-webkit-details-marker]:hidden">
                <div className="flex items-start justify-between gap-3">
                  <StudentIdentity student={student} />
                  <div className="flex items-center gap-2 pt-0.5 shrink-0">
                    <span className={cn(BADGE_BASE, BADGE_PALETTES.amber)}>
                      {requirements.length} {groups.length === 1 ? countLabel(groups[0], requirements.length) : "outstanding"}
                    </span>
                    <ArrowDown01Icon
                      size={14}
                      aria-hidden="true"
                      className="text-gray-400 transition-transform duration-200 group-open/record:rotate-180 dark:text-zinc-500"
                    />
                  </div>
                </div>

                {groups.length > 1 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 pl-12">
                    {groups.map((group) => (
                      <span
                        key={group.status}
                        className={cn(BADGE_BASE, group.palette)}
                      >
                        {group.requirements.length} {countLabel(group, group.requirements.length)}
                      </span>
                    ))}
                  </div>
                )}
              </summary>

              {/* Expanded Requirements Details */}
              <div className="mt-3.5 pt-3.5 border-t border-black/[0.04] dark:border-white/[0.06] space-y-4 pl-12">
                {groups.map((group) => (
                  <section key={group.status}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                        {group.label}
                      </span>
                      <span className="text-[10px] font-bold tabular-nums text-gray-400 dark:text-zinc-500">
                        ({group.requirements.length})
                      </span>
                    </div>

                    <ul className="space-y-1.5">
                      {group.requirements.map((requirement) => (
                        <li
                          key={requirement.documentTypeId}
                          className="text-[12.5px] leading-relaxed text-gray-700 dark:text-zinc-300"
                        >
                          <div className="flex items-center gap-2">
                            <span className="size-1.5 rounded-full bg-gray-400 dark:bg-zinc-500 shrink-0" />
                            <span className="font-medium text-gray-900 dark:text-zinc-100">
                              {requirement.docType}
                            </span>
                          </div>
                          <ReviewNote requirement={requirement} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </details>
          </div>
        );
      })}
    </div>
  );
}
