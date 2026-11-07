"use client"

import { ArrowDown01Icon } from "hugeicons-react"
import { cn } from "@/lib/utils"

const requirementStates = [
  {
    status: "declined",
    label: "Needs correction",
    countLabel: "need correction",
    tone: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  },
  {
    status: "missing",
    label: "Missing",
    countLabel: "missing",
    tone: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  },
  {
    status: "pending",
    label: "Awaiting review",
    countLabel: "awaiting review",
    tone: "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300",
  },
]

function countLabel(group, count) {
  return group.status === "declined" && count === 1
    ? "needs correction"
    : group.countLabel
}

function StudentIdentity({ student }) {
  return (
    <div className="min-w-0">
      <p className="text-[14px] font-semibold tracking-[-0.01em] [overflow-wrap:anywhere] text-gray-900 dark:text-zinc-50">
        {student.name || "Student"}
      </p>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[12px] leading-relaxed text-gray-500 dark:text-zinc-400">
        <span className="[overflow-wrap:anywhere] tabular-nums">
          {student.studentNo}
        </span>
        {(student.courseCode || student.section) && (
          <span className="min-w-0 [overflow-wrap:anywhere] text-gray-600 dark:text-zinc-300">
            {[student.courseCode, student.section].filter(Boolean).join(" · ")}
          </span>
        )}
      </div>
    </div>
  )
}

function ReviewNote({ requirement }) {
  if (requirement.status !== "declined" || !requirement.doc?.review_note)
    return null
  return (
    <p className="mt-1.5 text-[12px] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap text-gray-500 dark:text-zinc-400">
      <span className="font-medium text-gray-700 dark:text-zinc-300">
        Review note:{" "}
      </span>
      {requirement.doc.review_note}
    </p>
  )
}

export default function ComplianceStudentsList({
  students,
  singleDocument = false,
}) {
  return (
    <ul
      className="divide-y divide-border"
      aria-label="Students with outstanding requirements"
    >
      {students.map((student) => {
        const requirements = student.outstandingRequirements || []
        const groups = requirementStates
          .map((state) => ({
            ...state,
            requirements: requirements.filter(
              (requirement) => requirement.status === state.status
            ),
          }))
          .filter((group) => group.requirements.length > 0)

        if (singleDocument) {
          const requirement = requirements[0]
          const state = groups[0] || requirementStates[1]
          return (
            <li key={student.studentNo} className="py-5 first:pt-0 last:pb-0">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <StudentIdentity student={student} />
                <span
                  className={cn(
                    "mt-0.5 rounded-full px-2.5 py-1 text-[11px] leading-4 font-medium whitespace-nowrap",
                    state.tone
                  )}
                >
                  {state.label}
                </span>
              </div>
              {requirement && <ReviewNote requirement={requirement} />}
            </li>
          )
        }

        return (
          <li key={student.studentNo} className="py-1 first:pt-0 last:pb-0">
            <details className="group/record">
              <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-3 rounded-xl py-4 transition-colors outline-none hover:bg-gray-50/70 focus-visible:ring-1 focus-visible:ring-ring active:bg-gray-100/70 dark:hover:bg-zinc-800/35 dark:active:bg-zinc-800/60 [&::-webkit-details-marker]:hidden">
                <StudentIdentity student={student} />
                <div className="flex items-center gap-3 pt-0.5">
                  <div className="min-w-[70px] text-right">
                    <p className="text-[21px] leading-none font-semibold tracking-[-0.03em] text-gray-900 tabular-nums dark:text-zinc-50">
                      {requirements.length}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-gray-500 dark:text-zinc-400">
                      {groups.length === 1
                        ? countLabel(groups[0], requirements.length)
                        : "outstanding"}
                    </p>
                  </div>
                  <ArrowDown01Icon
                    size={16}
                    aria-hidden="true"
                    className="shrink-0 text-gray-400 transition-transform duration-150 group-open/record:rotate-180 motion-reduce:transition-none dark:text-zinc-500"
                  />
                </div>
                {groups.length > 1 && (
                  <div className="col-span-2 flex flex-wrap gap-1.5">
                    {groups.map((group) => (
                      <span
                        key={group.status}
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] leading-4 font-medium",
                          group.tone
                        )}
                      >
                        {group.requirements.length}{" "}
                        {countLabel(group, group.requirements.length)}
                      </span>
                    ))}
                  </div>
                )}
              </summary>
              <div className="space-y-5 pt-1 pb-5">
                {groups.map((group) => (
                  <section key={group.status}>
                    <h3 className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-gray-900 dark:text-zinc-100">
                      {group.label}
                      <span className="font-normal text-gray-400 tabular-nums dark:text-zinc-500">
                        {group.requirements.length}
                      </span>
                    </h3>
                    <ul className="space-y-2">
                      {group.requirements.map((requirement) => (
                        <li
                          key={requirement.documentTypeId}
                          className="text-[13px] leading-relaxed [overflow-wrap:anywhere] text-gray-600 dark:text-zinc-300"
                        >
                          {requirement.docType}
                          <ReviewNote requirement={requirement} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </details>
          </li>
        )
      })}
    </ul>
  )
}
