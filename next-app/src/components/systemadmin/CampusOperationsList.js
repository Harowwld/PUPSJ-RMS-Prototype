"use client"

import React, { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { formatPHDateTime, formatRelativeTime } from "@/lib/timeFormat"
import { getRequestCharterStatus, buildSlaTiers } from "@/lib/citizenCharter"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { ArrowDown01Icon } from "hugeicons-react"
import { useTablePreferences } from "@/components/shared/TablePreferences"
import { getListDensityClasses } from "@/lib/tablePresentation"
import {
  SUPERADMIN_BADGE_BASE as BADGE_BASE,
  BADGE_PALETTES,
  getDepartmentBadgeClass,
  getStatusBadgeClass,
} from "@/lib/badgeStyles"

export { BADGE_BASE, BADGE_PALETTES, getDepartmentBadgeClass, getStatusBadgeClass }

export function formatStudentRequester(name, studentNo) {
  if (!name || name.startsWith("enc:")) {
    return studentNo ? `Student (${studentNo})` : "Student"
  }
  return name
}

export function formatTransactionId(tx) {
  if (!tx) return ""
  const num = tx.originalId ?? (typeof tx.id === "string" ? tx.id.replace(/^[a-z]+-/, "") : tx.id)
  const padded = String(num || 0).padStart(3, "0")
  if (tx.officeId === "registrar" || tx.type === "document_request") {
    return `ODRS-${padded}`
  }
  if (tx.officeId === "osas" || tx.type === "event_proposal") {
    return `OSAS-${padded}`
  }
  return `TX-${padded}`
}

export default function CampusOperationsList({
  items = [],
  groupBy = "none",
  slaStandards = null,
  onOpenDetails,
  onPreviewPdf,
  statusBadgeClass,
}) {
  const { density } = useTablePreferences()
  const densityClasses = getListDensityClasses(density)
  const [collapsedGroups, setCollapsedGroups] = useState({})

  const toggleGroup = (key) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const slaTiers = useMemo(() => buildSlaTiers(slaStandards), [slaStandards])

  // Group items by chosen dimension
  const groupedData = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", label: "All Operations", items }]
    }

    if (groupBy === "department") {
      const groups = [
        { key: "registrar", label: "Office of the Registrar", items: [] },
        { key: "osas", label: "Office of Student Affairs and Services (OSAS)", items: [] },
      ]
      const other = { key: "other", label: "Other Departments", items: [] }

      items.forEach((item) => {
        const office = String(item.officeId || "").toLowerCase()
        if (office === "registrar") {
          groups[0].items.push(item)
        } else if (office === "osas") {
          groups[1].items.push(item)
        } else {
          other.items.push(item)
        }
      })

      const res = groups.filter((g) => g.items.length > 0)
      if (other.items.length > 0) res.push(other)
      return res
    }

    if (groupBy === "status") {
      const groups = [
        { key: "action_needed", label: "Action Needed / Intake", items: [] },
        { key: "in_progress", label: "In Progress / Review", items: [] },
        { key: "ready", label: "Ready / Completed", items: [] },
        { key: "needs_revision", label: "Needs Revision", items: [] },
        { key: "declined", label: "Cancelled / Declined", items: [] },
      ]
      const other = { key: "other", label: "Other Status", items: [] }

      items.forEach((item) => {
        const s = String(item.status || "").trim().toLowerCase()
        if (s === "pending" || s === "submitted") {
          groups[0].items.push(item)
        } else if (s === "inprogress" || s === "in progress" || s === "under review" || s === "processing") {
          groups[1].items.push(item)
        } else if (s === "ready" || s === "approved" || s === "done" || s === "completed") {
          groups[2].items.push(item)
        } else if (s === "needs revision" || s === "revision") {
          groups[3].items.push(item)
        } else if (s === "cancelled" || s === "declined" || s === "shredded") {
          groups[4].items.push(item)
        } else {
          other.items.push(item)
        }
      })

      const res = groups.filter((g) => g.items.length > 0)
      if (other.items.length > 0) res.push(other)
      return res
    }

    return [{ key: "all", label: "All Operations", items }]
  }, [groupBy, items])

  return (
    <div className="flex flex-col flex-1 divide-y divide-border dark:divide-border bg-white dark:bg-card">
      {groupedData.map((group) => {
        const isCollapsed = Boolean(collapsedGroups[group.key])
        const isGrouped = groupBy !== "none"

        return (
          <div key={group.key} className="flex flex-col">
            {/* Group Header (if grouped) */}
            {isGrouped && (
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center justify-between border-b border-border text-left hover:bg-gray-100/60 dark:hover:bg-zinc-800/40 transition-colors select-none cursor-pointer px-5 py-2.5 bg-gray-50/80 dark:bg-zinc-900/60"
                aria-expanded={!isCollapsed}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ArrowDown01Icon
                    size="1em"
                    className={cn(
                      "text-gray-400 dark:text-zinc-500 text-sm transition-transform duration-200 shrink-0",
                      isCollapsed && "-rotate-90"
                    )}
                  />
                  <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate">
                    {group.label}
                  </span>
                  <span className={cn(BADGE_BASE, BADGE_PALETTES.slate)}>
                    {group.items.length}
                  </span>
                </div>
                <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-medium">
                  {isCollapsed ? "Expand" : "Collapse"}
                </span>
              </button>
            )}

            {/* Group Items (Linear-inspired sleek horizontal row) */}
            {!isCollapsed && (
              <div className="divide-y divide-gray-100 dark:divide-zinc-800/60">
                {group.items.map((tx) => {
                  const txId = formatTransactionId(tx)
                  const requester = formatStudentRequester(tx.studentName, tx.studentNo)
                  const isRegistrar = tx.officeId === "registrar" || tx.type === "document_request"
                  const rel = formatRelativeTime(tx.createdAt)

                  const charter = getRequestCharterStatus(
                    {
                      doc_type: tx.title,
                      tier: tx.type === "event_proposal" ? slaTiers?.COMPLEX : undefined,
                      created_at: tx.createdAt,
                      updated_at: tx.updatedAt,
                      status: tx.status,
                    },
                    slaStandards
                  )

                  return (
                    <div
                      key={tx.id}
                      onClick={() => onOpenDetails?.(tx)}
                      className={cn(
                        "group flex items-center justify-between hover:bg-gray-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer select-none border-b border-gray-100 dark:border-zinc-800/60 last:border-b-0",
                        densityClasses.paddingX,
                        densityClasses.paddingY,
                        densityClasses.gap,
                        densityClasses.minHeight
                      )}
                    >
                      {/* Left: Identifier, Title, and Secondary Requester Context */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                        {/* Identifier */}
                        <span className="font-sans tabular-nums text-xs text-gray-500 dark:text-zinc-400 font-medium shrink-0 min-w-[70px] select-none">
                          {txId}
                        </span>

                        {/* Title */}
                        <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-zinc-100 group-hover:text-[#800000] dark:group-hover:text-red-400 transition-colors truncate shrink-0 max-w-[200px] sm:max-w-[320px] lg:max-w-md">
                          {tx.title || "Untitled Operation"}
                        </span>

                        {/* Requester & Org Subtitle */}
                        <span className="text-xs text-gray-400 dark:text-zinc-500 truncate hidden md:inline font-normal select-none">
                          — {requester}
                          {tx.studentNo ? ` (${tx.studentNo})` : ""}
                          {tx.organizationName ? ` • ${tx.organizationName}` : tx.notes ? ` • ${tx.notes}` : ""}
                        </span>
                      </div>

                      {/* Right: Linear Property Pills & Action Buttons */}
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {/* Stage Status (Text-only pill) */}
                        <span
                          className={cn(
                            BADGE_BASE,
                                                      statusBadgeClass ? statusBadgeClass(tx.status) : getStatusBadgeClass(tx.status)
                          )}
                        >
                          <span>{tx.status === "InProgress" ? "In Progress" : tx.status}</span>
                        </span>

                        {/* Department Pill (Text-only pill) */}
                        <span
                          className={cn(
                            BADGE_BASE,
                                                      getDepartmentBadgeClass(isRegistrar)
                          )}
                        >
                          <span>{isRegistrar ? "Registrar" : "OSAS"}</span>
                        </span>

                        {/* Charter SLA Badge (Text-only pill) */}
                        <span
                          className={cn(
                            BADGE_BASE,
                                                      charter.badgeClass
                          )}
                        >
                          <span>{charter.label}</span>
                        </span>

                        {/* Relative Timestamp */}
                        {tx.createdAt && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-normal tabular-nums hidden sm:inline ml-1 shrink-0">
                                {rel.relative || rel.date}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              Submitted on {formatPHDateTime(tx.createdAt)}
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-1 sm:gap-1.5 ml-1">
                          {tx.originalFilename && onPreviewPdf && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                onPreviewPdf(tx)
                              }}
                              className="h-7 px-3 text-[11px] font-semibold rounded-lg cursor-pointer"
                            >
                              Preview PDF
                            </Button>
                          )}

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onOpenDetails?.(tx)
                            }}
                            className="h-7 px-3 text-[11px] font-semibold rounded-lg cursor-pointer"
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
