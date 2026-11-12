"use client"

import useWorkspaceViewPreference from "@/hooks/useWorkspaceViewPreference"
import { COMPACT_BADGE_BASE, BADGE_BASE } from "@/lib/badgeStyles";
import { Table, TableRow } from "@/components/ui/table";
import TablePagination from "@/components/shared/TablePagination";
import SheetPagination from "@/components/shared/SheetPagination";
import useUrlPage from "@/hooks/useUrlPage";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import StaffDirectorySkeleton from "@/components/admin/skeletons/StaffDirectorySkeleton";
import DataContentSkeleton from "@/components/shared/DataContentSkeleton";
import PersonnelActionsMenu from "@/components/systemadmin/PersonnelActionsMenu";
import DashboardSearch from "@/components/systemadmin/DashboardSearch";
import ViewModeIcon from "@/components/shared/ViewModeIcon";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import CopyButton from "@/components/shared/CopyButton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  formatRelativeTime,
  formatPHDateTime,
  isInManilaDateRange,
} from "@/lib/timeFormat";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import PageHeader from "@/components/shared/PageHeader";
import FloatingActionBar from "@/components/shared/FloatingActionBar";
import { RefreshButton } from "@/components/shared/RefreshButton";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import TableScrollControls from "@/components/shared/TableScrollControls";
import DataViewToolbar from "@/components/shared/DataViewToolbar";
import { DateRangeFilterButton } from "@/components/shared/DateRangePickerModal";
import {
  FilterPopover,
  SortPopover,
  GroupPopover,
  ColumnsPopover,
} from "@/components/systemadmin/OfficeTableControls";
import { SegmentedControl } from "@/components/ui/tabs";
import useTableScroll from "@/hooks/useTableScroll";
import useViewPreference from "@/hooks/useViewPreference";
import { cn, formatTitleCase } from "@/lib/utils";
import { matchesSearchQuery } from "@/lib/searchUtils";
import { getOfficePrefix, getOfficeRoleLabel } from "@/lib/roleUtils";
import React from "react";
import {
  AlertCircleIcon as EmptyAlertCircleIcon,
  Archive01Icon as EmptyArchive01Icon,
  Search01Icon as EmptySearch01Icon,
  UserGroupIcon as EmptyUserGroupIcon,
  Add01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
  Building01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Contact01Icon,
  Copy01Icon,
  FilterIcon,
  Layers01Icon,
  Layout2ColumnIcon,
  MinusSignIcon,
  SecurityCheckIcon,
  Tick01Icon,
  Clock01Icon,
} from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";

const STAFF_SORT_OPTIONS = [
  { key: "fname", label: "Staff Name" },
  { key: "id", label: "Staff ID" },
  { key: "role", label: "Role" },
  { key: "section", label: "Section" },
  { key: "totp_enabled", label: "2FA Status" },
  { key: "last_active", label: "Last Login" },
  { key: "email", label: "Email Address" },
  { key: "created_at", label: "Date Added" },
]

const STAFF_COLUMNS = [
  { key: "id", label: "Staff ID" },
  { key: "name", label: "Staff Name" },
  { key: "role", label: "Role" },
  { key: "section", label: "Section" },
  { key: "totp_enabled", label: "2FA Status" },
  { key: "last_active", label: "Last Login" },
  { key: "email", label: "Email Address", defaultHidden: true },
  { key: "created_at", label: "Date Added", defaultHidden: true },
]
const DEFAULT_VISIBLE_COLUMNS = ["id", "name", "role", "section", "totp_enabled", "last_active"]

const formatLastLoginDate = (dateStr) => {
  if (!dateStr || dateStr === "N/A") return "N/A"
  try {
    const parts = dateStr.split("/")
    if (parts.length === 3) {
      const month = parseInt(parts[0], 10) - 1
      const day = parseInt(parts[1], 10)
      const year = parseInt(parts[2], 10)
      const date = new Date(year, month, day)
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      }
    }
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    }
  } catch {}
  return dateStr
}

const getStaffCleanName = (staff) => {
  const f = staff?.fname && !staff.fname.startsWith("enc:v1:") ? staff.fname.trim() : ""
  const l = staff?.lname && !staff.lname.startsWith("enc:v1:") ? staff.lname.trim() : ""
  const full = `${f} ${l}`.trim()
  if (full) return formatTitleCase(full)
  return staff?.id ? `Staff (${staff.id})` : "Staff Member"
}

const getStaffCleanEmail = (staff) => {
  if (staff?.email && !staff.email.startsWith("enc:v1:")) return staff.email
  return "N/A"
}

function InfoRow({ icon, label, children, className }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[135px_12px_1fr] sm:grid-cols-[150px_14px_1fr] items-start gap-1 text-xs py-2 border-b border-gray-100/70 dark:border-zinc-800/50 last:border-0",
        className
      )}
    >
      <div className="text-gray-500 dark:text-zinc-400 font-medium flex items-center gap-2 truncate">
        {icon && (
          typeof icon === "string" ? (
            <AppIcon className={cn("text-gray-400 dark:text-zinc-500 text-sm shrink-0", icon)} />
          ) : (
            <span className="text-gray-400 dark:text-zinc-500 text-sm shrink-0 flex items-center">
              {icon}
            </span>
          )
        )}
        <span className="truncate">{label}</span>
      </div>
      <span className="text-gray-300 dark:text-zinc-600 select-none">:</span>
      <div className="text-gray-900 dark:text-zinc-100 font-semibold break-words min-w-0">
        {children}
      </div>
    </div>
  )
}

const StaffGridCard = React.memo(({
  s,
  offices,
  isCurrentUser,
  isSelected,
  active,
  toggleSelect,
  onEditUser,
  onRestoreUser,
  onDeleteUser,
  onInspectUser,
}) => {
  const [copiedId, setCopiedId] = useState(false)
  const initials = `${s.fname?.charAt(0) || ""}${s.lname?.charAt(0) || ""}`.toUpperCase() || "ST"
  const cleanName = getStaffCleanName(s)
  const cleanEmail = getStaffCleanEmail(s)
  const isArchived = s.status === "Archived" || s.status === "Inactive"
  const roleLabel =
    s.role === "SuperAdmin" || s.role === "SystemAdmin"
      ? "System Admin"
      : getOfficeRoleLabel(s.role, s, offices)
  const lastLoginText =
    !active.relative && (!active.date || active.date === "N/A")
      ? "Never active"
      : active.relative || formatLastLoginDate(active.date)

  const handleCopyId = (e) => {
    e.stopPropagation()
    if (!s.id) return
    navigator.clipboard?.writeText(s.id)
    setCopiedId(true)
    toast.success(`Copied ${s.id} to clipboard`)
    setTimeout(() => setCopiedId(false), 2000)
  }

  return (
    <Card
      onClick={() => onInspectUser(s)}
      className={cn(
        "group relative flex flex-col justify-between p-4 rounded-2xl border bg-white dark:bg-card cursor-pointer select-none",
        "transition-[transform,box-shadow,border-color,background-color] duration-150 ease-out motion-safe:active:scale-[0.985]",
        isArchived
          ? "border-dashed border-black/[0.12] dark:border-white/15 bg-gray-50/70 dark:bg-zinc-900/40 opacity-85"
          : "border-black/[0.08] dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3)] hover:border-black/[0.15] dark:hover:border-white/20 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]",
        isSelected &&
          "border-gray-950 dark:border-white bg-gray-100/70 dark:bg-zinc-800/80 ring-1 ring-black/10 dark:ring-white/20"
      )}
    >
      {/* Zone 1: Identity Header (Checkbox, macOS Avatar, Name & Email, Overflow Menu) */}
      <div className="flex items-start justify-between gap-2.5 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {!isCurrentUser && (
            <div
              className="-m-1 p-1 rounded-md flex items-center justify-center shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                toggleSelect(s.id, e)
              }}
            >
              <input
                type="checkbox"
                aria-label={`Select ${cleanName}`}
                className={cn(
                  "h-3.5 w-3.5 m-0 align-middle shrink-0 cursor-pointer rounded border border-border dark:border-border transition-opacity duration-150",
                  isSelected ? "opacity-100" : "opacity-45 group-hover:opacity-85"
                )}
                checked={isSelected}
                onChange={() => {}}
              />
            </div>
          )}

          <ProfileAvatar
            staffId={s.id}
            name={cleanName}
            initials={initials}
            className="size-9 rounded-full border border-black/[0.08] dark:border-white/10 shadow-2xs shrink-0"
            fallbackClassName="text-xs font-bold"
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h3
                className="truncate text-[13.5px] font-semibold tracking-[-0.012em] text-gray-900 dark:text-zinc-50 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors duration-150 leading-snug"
                title={cleanName}
              >
                {cleanName}
              </h3>
              {isCurrentUser && (
                <span
                  className={cn(
                    BADGE_BASE,
                    "h-4.5 min-h-4.5 bg-blue-100/90 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-[10px] px-1.5 py-0"
                  )}
                >
                  You
                </span>
              )}
            </div>
            <p
              className="truncate text-[11.5px] font-normal text-gray-500 dark:text-zinc-400 leading-tight mt-0.5"
              title={cleanEmail}
            >
              {cleanEmail}
            </p>
          </div>
        </div>

        <div onClick={(e) => e.stopPropagation()} className="shrink-0 -mr-1 -mt-0.5">
          <PersonnelActionsMenu
            member={s}
            name={cleanName}
            isSelf={isCurrentUser}
            entityName="Staff"
            onViewProfile={() => onInspectUser(s)}
            onEdit={() => onEditUser(s.id)}
            onSettings={() =>
              window.dispatchEvent(
                new CustomEvent("switch-view", { detail: { view: "settings" } })
              )
            }
            onArchive={() => onDeleteUser(s.id)}
            onRestore={() => onRestoreUser(s.id)}
          />
        </div>
      </div>

      {/* Zone 2: Apple Inset Grouped Metadata Block */}
      <div className="mt-3.5 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-gray-50/80 dark:bg-zinc-900/50 divide-y divide-black/[0.05] dark:divide-white/[0.06] overflow-hidden">
        {/* Row 1: Employee ID with Quick Copy */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 text-[11px]">
          <span className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400 font-medium shrink-0">
            <Contact01Icon size={13} aria-hidden="true" className="text-gray-400 dark:text-zinc-500 shrink-0" />
            <span>ID</span>
          </span>
          <div className="flex items-center gap-1 min-w-0">
            <span
              className="font-sans tabular-nums text-[11.5px] font-semibold text-gray-900 dark:text-zinc-100 truncate"
              title={s.id}
            >
              {s.id}
            </span>
            <button
              type="button"
              onClick={handleCopyId}
              className="size-5 rounded-md inline-flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-black/[0.05] dark:hover:text-zinc-200 dark:hover:bg-white/[0.08] transition-colors duration-150 cursor-pointer shrink-0 motion-safe:active:scale-96"
              title="Copy Employee ID"
              aria-label={`Copy Employee ID ${s.id}`}
            >
              {copiedId ? (
                <Tick01Icon size={11} aria-hidden="true" className="text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy01Icon size={11} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Assigned Section */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 text-[11px]">
          <span className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400 font-medium shrink-0">
            <Building01Icon size={13} aria-hidden="true" className="text-gray-400 dark:text-zinc-500 shrink-0" />
            <span>Section</span>
          </span>
          <span
            className="truncate text-[11.5px] font-medium text-gray-800 dark:text-zinc-200 text-right"
            title={s.section || "Administration"}
          >
            {s.section || "Administration"}
          </span>
        </div>

        {/* Row 3: Two-Factor Security Status */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 text-[11px]">
          <span className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400 font-medium shrink-0">
            <SecurityCheckIcon size={13} aria-hidden="true" className="text-gray-400 dark:text-zinc-500 shrink-0" />
            <span>Security</span>
          </span>
          {s.totp_enabled ? (
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1.5 shrink-0">
              <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              2FA Enabled
            </span>
          ) : (
            <span className="text-[11px] font-normal text-gray-500 dark:text-zinc-400 inline-flex items-center gap-1.5 shrink-0">
              <span className="size-1.5 rounded-full bg-gray-300 dark:bg-zinc-600" aria-hidden="true" />
              Off
            </span>
          )}
        </div>
      </div>

      {/* Zone 3: Footer (Role Pill & Last Active Session) */}
      <div className="mt-3 pt-0.5 flex items-center justify-between gap-2 min-w-0">
        <span
          className={cn(
            BADGE_BASE,
            "h-5.5 min-h-5.5 px-2.5 text-[10.5px] font-semibold tracking-[-0.01em] truncate",
            s.role === "SystemAdmin" || s.role === "SuperAdmin"
              ? "bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
              : s.role === "Admin"
                ? "bg-[#800000]/10 text-[#800000] dark:bg-red-950/40 dark:text-red-300"
                : "bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/50 dark:text-amber-200"
          )}
        >
          {roleLabel}
        </span>

        <span
          className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-zinc-400 tabular-nums shrink-0"
          title={`Last login: ${lastLoginText}`}
        >
          <Clock01Icon size={12} aria-hidden="true" className="text-gray-400 dark:text-zinc-500 shrink-0" />
          <span>{lastLoginText}</span>
        </span>
      </div>
    </Card>
  )
})
StaffGridCard.displayName = "StaffGridCard"

const StaffTableRow = React.memo(({ 
  s, 
  offices,
  visibleColumns = DEFAULT_VISIBLE_COLUMNS,
  isCurrentUser, 
  isSelected, 
  active, 
  toggleSelect, 
  onEditUser, 
  onRestoreUser, 
  onDeleteUser, 
  onInspectUser,
  isScrolledX,
}) => {
  return (
    <TableRow
      selected={isSelected}
      onClick={(e) => !isCurrentUser && toggleSelect(s.id, e)}
      onDoubleClick={(e) => {
        if (e.target.closest("button, input, a")) return
        onInspectUser(s)
      }}
      className={cn(
        "group border-b-[0.5px] border-border dark:border-border last:border-b-0 transition-all duration-fast hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 select-none",
        !isCurrentUser && "cursor-pointer",
        isSelected && "bg-blue-50/60 dark:bg-blue-950/20"
      )}
    >
      <td className={cn(
        "w-12 p-4 align-middle text-center border-r border-border/70 dark:border-border/70 sticky left-0 z-10 transition-colors",
        isSelected
          ? "bg-blue-50 dark:bg-blue-950"
          : "bg-white group-hover:bg-gray-50/40 dark:bg-card dark:group-hover:bg-zinc-800/80"
      )}>
        {!isCurrentUser && (
          <input
            type="checkbox"
            aria-label={`Select ${getStaffCleanName(s)}`}
            className={cn(
              "h-4 w-4 m-0 align-middle shrink-0 cursor-pointer rounded border border-border dark:border-border transition-opacity",
              isSelected ? "opacity-100" : "opacity-50 group-hover:opacity-80"
            )}
            checked={isSelected}
            onChange={() => {}}
          />
        )}
      </td>
      {visibleColumns.includes("id") && <td className={cn(
        "p-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70 sticky left-12 z-10 transition-all duration-200",
        isSelected
          ? "bg-blue-50 dark:bg-blue-950"
          : "bg-white group-hover:bg-gray-50/40 dark:bg-card dark:group-hover:bg-zinc-800/80",
        isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)] border-r border-border/70"
      )}>
        <span className={cn("font-sans tabular-nums text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200", BADGE_BASE)}>
          {s.id}
        </span>
      </td>}

      {visibleColumns.includes("name") && (
        <td className="p-4 align-middle overflow-hidden border-r border-border/70 dark:border-border/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <ProfileAvatar
              staffId={s.id}
              name={getStaffCleanName(s)}
              initials={`${s.fname?.charAt(0) || ""}${s.lname?.charAt(0) || ""}`.toUpperCase() || "ST"}
              className="size-8 rounded-full border shadow-2xs shrink-0"
              fallbackClassName="text-xs font-bold"
            />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 min-w-0 text-[14px] font-semibold text-gray-900 dark:text-zinc-100">
                <span className="truncate" title={getStaffCleanName(s)}>
                  {getStaffCleanName(s)}
                </span>
                {isCurrentUser && (
                  <span className={cn(BADGE_BASE, "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-[10px] px-1.5 py-0")}>
                    You
                  </span>
                )}
              </div>
              <div className="truncate text-xs font-normal text-gray-500 dark:text-zinc-400 mt-0.5" title={getStaffCleanEmail(s)}>
                {getStaffCleanEmail(s)}
              </div>
            </div>
          </div>
        </td>
      )}

      {visibleColumns.includes("role") && (
        <td className="p-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
          <div className={cn("inline-flex w-fit items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide", s.role === "SystemAdmin" || s.role === "SuperAdmin"
              ? "bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
              : s.role === "Admin"
                ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400", BADGE_BASE)}>
            {s.role === "SuperAdmin" || s.role === "SystemAdmin" ? "System Admin" : getOfficeRoleLabel(s.role, s, offices)}
          </div>
        </td>
      )}

      {visibleColumns.includes("section") && (
        <td className="p-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
          <span className="text-xs font-medium text-gray-700 dark:text-zinc-300">
            {s.section || "General"}
          </span>
        </td>
      )}

      {visibleColumns.includes("totp_enabled") && (
        <td className="p-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
          {s.totp_enabled ? (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              2FA Enabled
            </span>
          ) : (
            <span className="text-xs font-normal text-gray-500 dark:text-zinc-400 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-gray-400 dark:bg-zinc-600" />
              Off
            </span>
          )}
        </td>
      )}

      {visibleColumns.includes("last_active") && (
        <td className="p-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
          {(!active.relative && (!active.date || active.date === "N/A")) ? (
            <div className="text-xs font-normal text-gray-400 dark:text-zinc-500">
              Never active
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-900 dark:text-zinc-100">
                {active.relative || formatLastLoginDate(active.date)}
              </div>
              {active.relative && (
                <div className="text-xs font-normal text-gray-500 dark:text-zinc-400 mt-0.5">
                  {formatLastLoginDate(active.date)}
                </div>
              )}
            </div>
          )}
        </td>
      )}

      {visibleColumns.includes("email") && (
        <td className="p-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
          <span className="text-xs font-mono text-gray-600 dark:text-zinc-400 truncate">
            {getStaffCleanEmail(s)}
          </span>
        </td>
      )}

      {visibleColumns.includes("created_at") && (
        <td className="p-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
          <span className="text-xs font-normal text-gray-600 dark:text-zinc-400 tabular-nums">
            {formatLastLoginDate(s.created_at)}
          </span>
        </td>
      )}

      <td className="w-12 p-4 align-middle text-center whitespace-nowrap">
        <div
          className="flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <PersonnelActionsMenu
            member={s}
            name={getStaffCleanName(s)}
            isSelf={isCurrentUser}
            entityName="Staff"
            onViewProfile={() => onInspectUser(s)}
            onEdit={() => onEditUser(s.id)}
            onSettings={() =>
              window.dispatchEvent(
                new CustomEvent("switch-view", {
                  detail: { view: "settings" },
                })
              )
            }
            onArchive={() => onDeleteUser(s.id)}
            onRestore={() => onRestoreUser(s.id)}
          />
        </div>
      </td>
    </TableRow>
  )
})
StaffTableRow.displayName = "StaffTableRow"

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return <ArrowUpDownIcon size="1em" className="ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
  }
  return sortOrder === "ASC" ? (
    <ArrowUp01Icon size="1em" className="ml-1 text-[12px] text-gray-400" />
  ) : (
    <ArrowDown01Icon size="1em" className="ml-1 text-[12px] text-gray-400" />
  )
}

export default function StaffDirectoryTab({
  staffData,
  hasLoaded = false,
  officeId = "registrar",
  officeShortName,
  offices,
  isLoading = false,
  error = null,
  currentUserId,
  search,
  setSearch,
  roleFilter,
  setRoleFilter,
  selectedIds,
  onSelectionChange,
  onEditUser,
  onRestoreUser,
  onDeleteUser,
  onBulkArchive,
  onBulkRestore,
  onSwitchView,
  onRefresh,
}) {
  const [activeTab, setActiveTab] = useState("active")
  const [viewMode, setViewMode] = useWorkspaceViewPreference("staff_directory", "viewMode", "table", {
    legacyKey: "staffDir_viewMode",
  })

  const [inspectMember, setInspectMember] = useState(null)
  const [copiedField, setCopiedField] = useState(null)

  const handleCopyField = (text, fieldKey, fieldLabel) => {
    if (!text) return
    navigator.clipboard?.writeText(text)
    setCopiedField(fieldKey)
    toast.success(`Copied ${fieldLabel} to clipboard`)
    setTimeout(() => {
      setCopiedField((curr) => (curr === fieldKey ? null : curr))
    }, 2000)
  }

  const [localSearch, setLocalSearch] = useState(() => {
    if (search) return search
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("staffDir_search")
      if (saved !== null) return saved
    }
    return ""
  })

  const [currentPage, setCurrentPage] = useUrlPage()
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [lastSelectedId, setLastSelectedId] = useState(null)

  const [groupBy, setGroupBy] = useWorkspaceViewPreference("staff_directory", "groupBy", "none")
  const [visibleColumns, setVisibleColumns] = useWorkspaceViewPreference("staff_directory", "visibleColumns", DEFAULT_VISIBLE_COLUMNS)

  const [filterRules, setFilterRules] = useWorkspaceViewPreference("staff_directory", "filterRules", [])
  const [startDate, setStartDate] = useWorkspaceViewPreference("staff_directory", "startDate", "")
  const [endDate, setEndDate] = useWorkspaceViewPreference("staff_directory", "endDate", "")

  const roleFilters = useMemo(() => {
    if (!roleFilter || roleFilter === "All") return []
    return roleFilter.split(",").map((s) => s.trim()).filter(Boolean)
  }, [roleFilter])

  // Filter staff to the active office scope (excludes SuperAdmin/SystemAdmin and other offices like OSAS)
  const officeStaff = useMemo(() => {
    const targetOffice = (officeId || "registrar").toLowerCase()
    return (staffData || []).filter((s) => {
      if (!s) return false
      // Exclude System Admin and Super Admin from office directory
      if (s.role === "SystemAdmin" || s.role === "SuperAdmin") return false
      // Exclude staff from other offices (e.g., OSAS accounts in Registrar)
      const staffOffice = (s.office_id || "").toLowerCase()
      if (staffOffice && staffOffice !== targetOffice) return false
      // Strict safeguard: ensure no PUPOSAS accounts leak into Registrar
      if (targetOffice === "registrar" && s.id?.toUpperCase().startsWith("PUPOSAS")) return false
      return true
    })
  }, [staffData, officeId])

  const officePrefix = useMemo(() => getOfficePrefix(officeShortName || officeId, offices), [officeShortName, officeId, offices])

  const groupOptions = useMemo(() => [
    { key: "role", label: "Role", icon: EmptyUserGroupIcon },
    { key: "section", label: "Section", icon: Building01Icon },
    { key: "totp_enabled", label: "2FA Status", icon: SecurityCheckIcon },
    { key: "none", label: "No grouping", icon: MinusSignIcon },
  ], [])

  const filterFields = useMemo(() => {
    const sections = Array.from(new Set(officeStaff.map((s) => s.section).filter(Boolean))).sort()
    return [
      {
        key: "role",
        label: "Role",
        icon: EmptyUserGroupIcon,
        options: [
          { value: "Admin", label: `${officePrefix} Admin` },
          { value: "Staff", label: `${officePrefix} Staff` },
        ],
      },
      {
        key: "section",
        label: "Section",
        icon: Building01Icon,
        options: sections.length > 0
          ? sections.map((sec) => ({ value: sec, label: sec }))
          : [{ value: "Records", label: "Records" }],
      },
      {
        key: "totp_enabled",
        label: "2FA Status",
        icon: SecurityCheckIcon,
        options: [
          { value: "true", label: "2FA Enabled" },
          { value: "false", label: "2FA Disabled" },
        ],
      },
      {
        key: "status",
        label: "Account Status",
        icon: CheckmarkCircle01Icon,
        options: [
          { value: "Active", label: "Active" },
          { value: "Archived", label: "Archived" },
        ],
      },
    ]
  }, [officeStaff, officePrefix])

  const hasActiveFilters = localSearch !== "" || filterRules.length > 0 || roleFilters.length > 0 || startDate !== "" || endDate !== ""

  const handleClearFilters = useCallback(() => {
    setLocalSearch("")
    setSearch("")
    setFilterRules([])
    setRoleFilter?.("All")
    setStartDate("")
    setEndDate("")
    setCurrentPage(1)
  }, [setSearch, setRoleFilter, setCurrentPage, setFilterRules, setStartDate, setEndDate])

  // Debounce search update
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(localSearch)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(handler)
  }, [localSearch, setSearch, setCurrentPage])

  // Persist search when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("staffDir_search", search)
    }
  }, [search])

  const filteredStaff = useMemo(() => {
    return (officeStaff || []).filter((s) => {
      const matchesSearch = matchesSearchQuery(
        [getStaffCleanName(s), s.id, getStaffCleanEmail(s), s.section || ""],
        search
      )

      const matchesFilterRules = filterRules.every((rule) => {
        if (!rule.value && rule.value !== false && rule.value !== "false") return true
        if (rule.fieldKey === "role") {
          return rule.operator === "is_not" ? s.role !== rule.value : s.role === rule.value
        }
        if (rule.fieldKey === "section") {
          const sec = s.section || ""
          return rule.operator === "is_not" ? sec !== rule.value : sec === rule.value
        }
        if (rule.fieldKey === "totp_enabled") {
          const is2Fa = Boolean(s.totp_enabled)
          const ruleBool = rule.value === "true" || rule.value === true
          return rule.operator === "is_not" ? is2Fa !== ruleBool : is2Fa === ruleBool
        }
        if (rule.fieldKey === "status") {
          const statusVal = s.status || "Active"
          return rule.operator === "is_not" ? statusVal !== rule.value : statusVal === rule.value
        }
        return true
      })

      const matchesRole = roleFilters.length === 0 || roleFilters.includes(s.role)

      // Filter by created_at date range
      const matchesDateRange = isInManilaDateRange(s.created_at, startDate, endDate)

      // Filter by tab status
      const isArchived = s.status === "Archived"
      const matchesTab = activeTab === "active" ? !isArchived : isArchived

      return matchesSearch && matchesFilterRules && matchesRole && matchesDateRange && matchesTab
    })
  }, [search, filterRules, roleFilters, startDate, endDate, officeStaff, activeTab])

  const [sortBy, setSortBy] = useWorkspaceViewPreference("staff_directory", "sortBy", "id")
  const [sortOrder, setSortOrder] = useWorkspaceViewPreference("staff_directory", "sortOrder", "ASC")

  const handleSort = (column) => {
    if (sortBy === column) {
      if (sortOrder === "ASC") {
        setSortOrder("DESC")
      } else {
        setSortBy("id")
        setSortOrder("ASC")
      }
    } else {
      setSortBy(column)
      setSortOrder("ASC")
    }
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage) || 1
  const displayPage = Math.min(currentPage, totalPages)

  const sortedStaff = useMemo(() => {
    return [...filteredStaff].sort((a, b) => {
      let valA = a[sortBy]
      let valB = b[sortBy]

      if (sortBy === "fname" || sortBy === "name") {
        valA = getStaffCleanName(a).toLowerCase()
        valB = getStaffCleanName(b).toLowerCase()
      } else if (sortBy === "id") {
        return sortOrder === "ASC"
          ? a.id.localeCompare(b.id, undefined, { numeric: true })
          : b.id.localeCompare(a.id, undefined, { numeric: true })
      } else if (sortBy === "totp_enabled") {
        valA = a.totp_enabled ? 1 : 0
        valB = b.totp_enabled ? 1 : 0
      } else if (sortBy === "email") {
        valA = getStaffCleanEmail(a).toLowerCase()
        valB = getStaffCleanEmail(b).toLowerCase()
      } else if (sortBy === "section") {
        valA = (a.section || "").toLowerCase()
        valB = (b.section || "").toLowerCase()
      } else if (sortBy === "created_at" || sortBy === "last_active") {
        valA = Date.parse(a[sortBy]) || 0
        valB = Date.parse(b[sortBy]) || 0
      } else if (typeof valA === "string") {
        valA = valA.toLowerCase()
        valB = (valB || "").toLowerCase()
      }

      if (valA < valB) return sortOrder === "ASC" ? -1 : 1
      if (valA > valB) return sortOrder === "ASC" ? 1 : -1
      return 0
    })
  }, [filteredStaff, sortBy, sortOrder])

  const paginatedStaff = useMemo(() => {
    const start = (displayPage - 1) * itemsPerPage
    return sortedStaff.slice(start, start + itemsPerPage)
  }, [sortedStaff, displayPage, itemsPerPage])

  const groupedStaff = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", label: "", members: paginatedStaff }]
    }
    const groups = new Map()
    for (const member of paginatedStaff) {
      let label = ""
      if (groupBy === "role") {
        label = member.role === "Admin" ? `${officePrefix} Admin` : `${officePrefix} Staff`
      } else if (groupBy === "section") {
        label = member.section || "General / Unassigned"
      } else if (groupBy === "totp_enabled") {
        label = member.totp_enabled ? "2FA Enabled" : "2FA Disabled (Off)"
      }
      if (!groups.has(label)) groups.set(label, [])
      groups.get(label).push(member)
    }
    return [...groups.entries()].map(([label, members]) => ({ key: label, label, members }))
  }, [groupBy, paginatedStaff, officePrefix])

  const staffTableColumns = useMemo(() => [
    "selection",
    ...STAFF_COLUMNS.filter((c) => visibleColumns.includes(c.key)).map((c) => {
      if (c.key === "id") return "identifier"
      if (c.key === "name" || c.key === "email") return { kind: "text", maxWidth: 360 }
      if (c.key === "section") return { kind: "text", maxWidth: 200 }
      if (c.key === "last_active" || c.key === "created_at") return { kind: "date" }
      if (c.key === "totp_enabled") return { kind: "status" }
      return { kind: "category" }
    }),
    "actions",
  ], [visibleColumns])
  const tableWidth = visibleColumns.length >= 6 ? "min-w-[1240px]" : "min-w-[560px]"

  const {
    containerRef: tableContainerRef,
    isScrolledX,
    scrollLeft,
    scrollRight,
    resetScroll,
  } = useTableScroll([paginatedStaff.length]);

  useEffect(() => {
    resetScroll();
  }, [displayPage, activeTab, search, roleFilters, filterRules, resetScroll]);

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setCurrentPage(1)
    onSelectionChange(new Set())
    setLastSelectedId(null)
  }

  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage)
    onSelectionChange(new Set())
    setLastSelectedId(null)
  }, [onSelectionChange, setCurrentPage])

  // Prune stale selected IDs when filtered staff updates
  useEffect(() => {
    if (!selectedIds || selectedIds.size === 0) return
    const validIds = new Set(filteredStaff.map((s) => s.id))
    let needsPruning = false
    for (const id of selectedIds) {
      if (!validIds.has(id)) {
        needsPruning = true
        break
      }
    }
    if (needsPruning) {
      const next = new Set()
      for (const id of selectedIds) {
        if (validIds.has(id)) next.add(id)
      }
      onSelectionChange(next)
    }
  }, [filteredStaff, selectedIds, onSelectionChange])

  const handleCopyEmails = useCallback(() => {
    const emails = Array.from(selectedIds)
      .map((id) => (Array.isArray(staffData) ? staffData : []).find((s) => s.id === id)?.email)
      .filter(Boolean)
    if (emails.length === 0) return
    navigator.clipboard?.writeText(emails.join("; "))
    toast.success(`Copied ${emails.length} email${emails.length > 1 ? "s" : ""} to clipboard`)
  }, [selectedIds, staffData])

  const handleCopyIds = useCallback(() => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    navigator.clipboard?.writeText(ids.join(", "))
    toast.success(`Copied ${ids.length} Employee ID${ids.length > 1 ? "s" : ""} to clipboard`)
  }, [selectedIds])

  const toggleSelectAll = (checked) => {
    if (checked) {
      onSelectionChange(
        new Set(
          paginatedStaff
            .filter((s) => s.id !== currentUserId)
            .map((s) => s.id)
        )
      )
    } else {
      onSelectionChange(new Set())
    }
    setLastSelectedId(null)
  }

  const toggleSelect = (id, event) => {
    const isSelected = selectedIds.has(id)

    if (event?.shiftKey && lastSelectedId) {
      if (isSelected) {
        if (selectedIds.size > 1) {
          onSelectionChange(new Set([id]))
          setLastSelectedId(id)
        } else {
          onSelectionChange(new Set())
          setLastSelectedId(null)
        }
        return
      }

      const currentIdx = paginatedStaff.findIndex((s) => s.id === id)
      const lastIdx = paginatedStaff.findIndex((s) => s.id === lastSelectedId)

      if (currentIdx !== -1 && lastIdx !== -1) {
        const start = Math.min(currentIdx, lastIdx)
        const end = Math.max(currentIdx, lastIdx)
        const idsInRange = paginatedStaff
          .slice(start, end + 1)
          .filter((s) => s.id !== currentUserId)
          .map((s) => s.id)

        const next = new Set(selectedIds)
        idsInRange.forEach((rangeId) => next.add(rangeId))
        
        onSelectionChange(next)
        setLastSelectedId(id)
        return
      }
    }

    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
      if (lastSelectedId === id) setLastSelectedId(null)
    } else {
      next.add(id)
      setLastSelectedId(id)
    }
    onSelectionChange(next)
  }

  const handleKeyDown = useCallback(
    (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return

      if (e.key === "ArrowLeft") {
        handlePageChange(Math.max(1, displayPage - 1))
      } else if (e.key === "ArrowRight") {
        handlePageChange(Math.min(totalPages, displayPage + 1))
      }
    },
    [totalPages, displayPage, handlePageChange]
  )

  const adminCount = useMemo(() => {
    return officeStaff.filter((s) => s.role === "Admin").length
  }, [officeStaff])

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="font-jakarta w-full flex flex-[1_0_auto] flex-col h-auto gap-6 focus:outline-none animate-fade-up"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
      {/* Main Single Card Container */}
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        {/* PageHeader with Inline Metrics and Action Buttons */}
        <PageHeader
          icon="UserSearch01Icon"
          title={
            <div className="flex items-center gap-[6px]">
              <span>Staff Directory</span>
              <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">
                {officeStaff.length} personnel · {adminCount} {adminCount === 1 ? "administrator" : "administrators"}
              </span>
            </div>
          }
          description={`Manage ${officePrefix} personnel and administrative access.`}
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            <div className="flex items-center gap-2">
              <RefreshButton
                onRefresh={onRefresh}
                isLoading={isLoading}
                title="Refresh Staff Directory"
              />

              <Button
                onClick={() => onSwitchView("create")}
                disabled={activeTab === "archived" || isLoading}
                className="h-9 shrink-0 px-4"
              >
                Register Staff
              </Button>
            </div>
          }
        />

        {/* Connected Tabs Row: Active/Archived on Left, [Grid] [Table] View Switcher on Right */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-white dark:bg-card">
          <SegmentedControl
            value={activeTab}
            onValueChange={handleTabChange}
            variant="capsule"
            className="inline-grid grid-flow-col auto-cols-fr shrink-0"
            items={[
              {
                value: "active",
                label: "Active",
                badge: officeStaff.filter((s) => s.status !== "Archived").length,
              },
              {
                value: "archived",
                label: "Archived",
                badge: officeStaff.filter((s) => s.status === "Archived").length,
              },
            ]}
          />

          <div className="ml-auto">
            <SegmentedControl
              value={viewMode}
              onValueChange={setViewMode}
              variant="capsule"
              className="inline-grid grid-flow-col auto-cols-fr shrink-0"
              items={[
                {
                  value: "grid",
                  label: "Grid",
                  icon: <ViewModeIcon mode="grid" className="text-sm" />,
                },
                {
                  value: "table",
                  label: "Table",
                  icon: <ViewModeIcon mode="table" className="text-sm" />,
                },
              ]}
            />
          </div>
        </div>

        {/* 2-Zone DataViewToolbar */}
        <DataViewToolbar label="Staff search, filters, sorting, grouping, and columns" className="border-t border-border dark:border-border p-4 sm:px-5 sm:py-3 gap-3 bg-white dark:bg-card">
          {/* Left: Search input + TableScrollControls (only when viewMode === "table") */}
          <div className="flex min-w-0 items-center gap-2">
            <DashboardSearch
              value={localSearch}
              onChange={setLocalSearch}
              onClear={() => {
                setLocalSearch("")
                setSearch("")
                setCurrentPage(1)
              }}
              count={filteredStaff.length}
              loading={isLoading}
              label="Staff search"
              placeholder="Search name, email or ID..."
            />

            {viewMode === "table" && (
              <TableScrollControls
                scrollContainerRef={tableContainerRef}
                onScrollLeft={scrollLeft}
                onScrollRight={scrollRight}
                onResetScroll={resetScroll}
                isScrolled={isScrolledX}
              />
            )}
          </div>

          {/* Right: FilterPopover, SortPopover, GroupPopover, and ColumnsPopover */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <FilterPopover
              fields={filterFields}
              filters={filterRules}
              onFiltersChange={(newRules) => {
                setFilterRules(newRules)
                setCurrentPage(1)
              }}
              entityLabel="personnel"
            />

            <SortPopover
              options={STAFF_SORT_OPTIONS}
              sortBy={sortBy}
              onSortByChange={(key) => {
                setSortBy(key)
                setSortOrder("ASC")
                setCurrentPage(1)
              }}
              sortOrder={sortOrder}
              onSortOrderChange={(order) => {
                setSortOrder(order)
                setCurrentPage(1)
              }}
            />

            <GroupPopover
              options={groupOptions}
              groupBy={groupBy}
              onGroupByChange={setGroupBy}
            />

            {viewMode === "table" && (
              <ColumnsPopover
                columns={STAFF_COLUMNS}
                visibleColumns={visibleColumns}
                defaultColumns={DEFAULT_VISIBLE_COLUMNS}
                onVisibleColumnsChange={setVisibleColumns}
                minVisible={2}
              />
            )}

            <DateRangeFilterButton
              startDate={startDate}
              endDate={endDate}
              onApply={({ startDate: s, endDate: e }) => {
                setStartDate(s)
                setEndDate(e)
                setCurrentPage(1)
              }}
              onClear={() => {
                setStartDate("")
                setEndDate("")
                setCurrentPage(1)
              }}
              disableFutureDates={true}
            />
          </div>
        </DataViewToolbar>

        {/* Active Filter Chips Row */}
        {hasActiveFilters && (
          <ActiveFilterChips
            chips={[
              ...filterRules.map((rule) => {
                const field = filterFields.find((f) => f.key === rule.fieldKey)
                const fieldLabel = field?.label || rule.fieldKey
                const opt = field?.options?.find((o) => String(o.value) === String(rule.value))
                const valLabel = opt?.label || String(rule.value)
                const opText = rule.operator === "is_not" ? "is not" : "is"
                return {
                  id: rule.id,
                  label: `${fieldLabel} ${opText} ${valLabel}`,
                  onRemove: () => {
                    setFilterRules((prev) => prev.filter((r) => r.id !== rule.id))
                    setCurrentPage(1)
                  },
                }
              }),
              ...(startDate || endDate
                ? [
                    {
                      id: "dateRange",
                      label: `Range: ${startDate || "..."} to ${endDate || "..."}`,
                      onRemove: () => {
                        setStartDate("")
                        setEndDate("")
                        setCurrentPage(1)
                      },
                    },
                  ]
                : []),
            ]}
            groups={[
              ...(roleFilters.length > 0
                ? [
                    {
                      key: "role",
                      label: "Role",
                      values: roleFilters,
                      onRemove: (val) => {
                        const next = roleFilters.filter((v) => v !== val)
                        setRoleFilter?.(next.length === 1 ? next[0] : (next.length === 0 ? "All" : next.join(",")))
                        setCurrentPage(1)
                      },
                      formatValue: (val) => (val === "Admin" ? `${officePrefix} Admin` : val === "Staff" ? `${officePrefix} Staff` : val),
                    },
                  ]
                : []),
            ]}
            searchQuery={localSearch}
            onClearSearch={() => {
              setLocalSearch("")
              setSearch("")
              setCurrentPage(1)
            }}
            onClearAll={handleClearFilters}
            className="border-t border-border dark:border-border bg-white dark:bg-card px-6 py-2.5"
          />
        )}

        {/* Content Area: Loading / Error / Empty / Grid / Table */}
        {isLoading && !hasLoaded ? (
          <div className="w-full flex-[1_0_auto] flex flex-col border-t border-border dark:border-border">
            {viewMode === "grid"
              ? <StaffDirectorySkeleton rowCount={8} layoutView={viewMode} />
              : <DataContentSkeleton columns={staffTableColumns} rowCount={8} className={tableWidth} />}
          </div>
        ) : error ? (
          <div className="p-6 flex-[1_0_auto] flex flex-col justify-center border-t border-border dark:border-border rounded-b-2xl">
            <Empty>
              <EmptyHeader>
                <EmptyMedia className="text-red-600 dark:text-red-400"><EmptyAlertCircleIcon size="1em" /></EmptyMedia>
                <EmptyTitle>
                  Could not load personnel data
                </EmptyTitle>
                <EmptyDescription>
                  {error}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full border-t border-border dark:border-border">
            <Empty>
              <EmptyHeader>
                <EmptyMedia>{activeTab === "archived" && !hasActiveFilters && search === "" ? <EmptyArchive01Icon size="1em" /> : <EmptySearch01Icon size="1em" />}</EmptyMedia>
                <EmptyTitle>
                  {hasActiveFilters || search !== "" ? "No Matches Found" : (activeTab === "archived" ? "No Archived Personnel Found" : "No Personnel Found")}
                </EmptyTitle>
                <EmptyDescription>
                  {hasActiveFilters || search !== ""
                    ? "Try adjusting your search filters to find what you're looking for."
                    : (activeTab === "archived" ? "There are currently no archived personnel records in the system." : "There are currently no personnel records in the system.")}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {hasActiveFilters || search !== "" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearFilters}
                    title="Reset Filters"
                    className="flex h-9 items-center justify-center rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-4 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                  >
                    Reset Filters
                  </Button>
                ) : (
                  activeTab === "active" && officeStaff.filter(s => s.status !== "Archived").length === 0 && (
                    <Button
                      size="sm"
                      onClick={() => onSwitchView("create")}
                      className="flex h-9 px-4 cursor-pointer"
                    >
                      Register Staff
                    </Button>
                  )
                )}
              </EmptyContent>
            </Empty>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="w-full flex-[1_0_auto] flex flex-col border-t border-border dark:border-border">
            <div className="p-6 flex-[1_0_auto] bg-gray-50/30 dark:bg-zinc-900/20">
              <div className="space-y-6">
                {groupedStaff.map((group) => (
                  <div key={group.key} className="space-y-3">
                    {group.label && (
                      <div className="flex items-center gap-2 px-1 text-xs font-semibold text-gray-700 dark:text-zinc-200">
                        <span>{group.label}</span>
                        <span className="font-sans font-normal tabular-nums text-gray-400 dark:text-zinc-500 text-[11px]">
                          ({group.members.length})
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 content-start">
                      {group.members.map((s) => (
                        <StaffGridCard
                          key={s.id}
                          s={s}
                          offices={offices}
                          isCurrentUser={s.id === currentUserId}
                          isSelected={selectedIds.has(s.id)}
                          active={formatRelativeTime(s.last_active)}
                          toggleSelect={toggleSelect}
                          onEditUser={onEditUser}
                          onRestoreUser={onRestoreUser}
                          onDeleteUser={onDeleteUser}
                          onInspectUser={setInspectMember}
                        />
                      ))}

                      {activeTab === "active" && displayPage === totalPages && groupBy === "none" && (
                        <button
                          type="button"
                          onClick={() => onSwitchView("create")}
                          disabled={isLoading}
                          className="group flex min-h-[196px] w-full cursor-pointer select-none flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-black/[0.14] dark:border-white/15 bg-white/60 dark:bg-zinc-900/30 p-4 text-gray-500 transition-[transform,background-color,border-color] duration-150 ease-out hover:border-black/[0.28] hover:bg-white hover:text-gray-950 dark:hover:border-white/30 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100 enabled:motion-safe:active:scale-[0.985] disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Register Staff"
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.06] dark:border-white/10 bg-gray-100/90 dark:bg-zinc-800 text-lg shadow-2xs transition-transform duration-150 ease-out motion-safe:group-hover:scale-105">
                            <Add01Icon size={16} aria-hidden="true" className="text-gray-500 transition-colors duration-150 group-hover:text-gray-950 dark:group-hover:text-zinc-100" />
                          </span>
                          <span className="text-center">
                            <span className="block text-[12.5px] font-semibold tracking-[-0.01em] text-gray-800 dark:text-zinc-200">Register Staff</span>
                            <span className="mt-0.5 block text-[11px] text-gray-500 dark:text-zinc-400">Add a new personnel account to this office.</span>
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {activeTab === "active" && displayPage === totalPages && groupBy !== "none" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 content-start pt-2">
                    <button
                      type="button"
                      onClick={() => onSwitchView("create")}
                      disabled={isLoading}
                      className="group flex min-h-[196px] w-full cursor-pointer select-none flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-black/[0.14] dark:border-white/15 bg-white/60 dark:bg-zinc-900/30 p-4 text-gray-500 transition-[transform,background-color,border-color] duration-150 ease-out hover:border-black/[0.28] hover:bg-white hover:text-gray-950 dark:hover:border-white/30 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100 enabled:motion-safe:active:scale-[0.985] disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Register Staff"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.06] dark:border-white/10 bg-gray-100/90 dark:bg-zinc-800 text-lg shadow-2xs transition-transform duration-150 ease-out motion-safe:group-hover:scale-105">
                        <Add01Icon size={16} aria-hidden="true" className="text-gray-500 transition-colors duration-150 group-hover:text-gray-950 dark:group-hover:text-zinc-100" />
                      </span>
                      <span className="text-center">
                        <span className="block text-[12.5px] font-semibold tracking-[-0.01em] text-gray-800 dark:text-zinc-200">Register Staff</span>
                        <span className="mt-0.5 block text-[11px] text-gray-500 dark:text-zinc-400">Add a new personnel account to this office.</span>
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <TablePagination
              label="Staff directory pages"
              page={currentPage}
              pageSize={itemsPerPage}
              totalCount={filteredStaff.length}
              displayedCount={paginatedStaff.length}
              onPageChange={handlePageChange}
              onPageSizeChange={setItemsPerPage}
            />
          </div>
        ) : (
          /* Table View */
          <div className="w-full flex-[1_0_auto] flex flex-col border-t border-border dark:border-border">
            <div
              ref={tableContainerRef}
              className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2"
            >
              <Table columns={staffTableColumns} className={tableWidth}>
                <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                  <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400">
                    <th className="w-12 p-4 text-center sticky left-0 z-20 bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs">
                      <input
                        type="checkbox"
                        aria-label="Select all staff on this page"
                        className="h-4 w-4 m-0 align-middle shrink-0 cursor-pointer rounded border border-border dark:border-border"
                        checked={
                          paginatedStaff.some(
                            (s) => s.id !== currentUserId
                          ) &&
                          paginatedStaff
                             .filter((s) => s.id !== currentUserId)
                             .every((s) => selectedIds.has(s.id))
                        }
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        disabled={
                          paginatedStaff.length === 0 ||
                          paginatedStaff.every(
                            (s) => s.id === currentUserId
                          )
                        }
                      />
                    </th>
                    {visibleColumns.includes("id") && <th className={cn(
                      "p-4 w-[16%] min-w-[150px] sticky left-12 z-20 bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs transition-shadow duration-200",
                      isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                    )}>
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => handleSort("id")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                            sortBy === "id" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Staff ID{" "}
                          <SortIndicator
                            column="id"
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                          />
                        </button>
                      </div>
                    </th>}
                    {visibleColumns.includes("name") && (
                      <th className="p-4 w-[33%]">
                        <button
                          onClick={() => handleSort("fname")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                            sortBy === "fname" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Staff Name{" "}
                          <SortIndicator
                            column="fname"
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                          />
                        </button>
                      </th>
                    )}
                    {visibleColumns.includes("role") && (
                      <th className="p-4 w-[15%]">
                        <button
                          onClick={() => handleSort("role")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                            sortBy === "role" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Role{" "}
                          <SortIndicator
                            column="role"
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                          />
                        </button>
                      </th>
                    )}
                    {visibleColumns.includes("section") && (
                      <th className="p-4 w-[13%]">
                        <button
                          onClick={() => handleSort("section")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                            sortBy === "section" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Section{" "}
                          <SortIndicator
                            column="section"
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                          />
                        </button>
                      </th>
                    )}
                    {visibleColumns.includes("totp_enabled") && (
                      <th className="p-4 w-[9%] min-w-[100px]">
                        <button
                          onClick={() => handleSort("totp_enabled")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                            sortBy === "totp_enabled" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          2FA Status{" "}
                          <SortIndicator
                            column="totp_enabled"
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                          />
                        </button>
                      </th>
                    )}
                    {visibleColumns.includes("last_active") && (
                      <th className="p-4 w-[17%]">
                        <button
                          onClick={() => handleSort("last_active")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                            sortBy === "last_active" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Last Login{" "}
                          <SortIndicator
                            column="last_active"
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                          />
                        </button>
                      </th>
                    )}
                    {visibleColumns.includes("email") && (
                      <th className="p-4 w-[18%]">
                        <button
                          onClick={() => handleSort("email")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                            sortBy === "email" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Email Address{" "}
                          <SortIndicator
                            column="email"
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                          />
                        </button>
                      </th>
                    )}
                    {visibleColumns.includes("created_at") && (
                      <th className="p-4 w-[14%]">
                        <button
                          onClick={() => handleSort("created_at")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                            sortBy === "created_at" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Date Added{" "}
                          <SortIndicator
                            column="created_at"
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                          />
                        </button>
                      </th>
                    )}
                    <th className="w-12 p-4 text-center text-xs font-semibold text-gray-500 dark:text-zinc-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-transparent divide-y divide-border dark:divide-border">
                  {groupedStaff.map((group) => (
                    <React.Fragment key={group.key}>
                      {group.label && (
                        <tr className="bg-gray-50/90 dark:bg-zinc-900/80">
                          <td
                            colSpan={staffTableColumns.length}
                            className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-zinc-200"
                          >
                            {group.label}
                            <span className="ml-2 font-sans font-normal tabular-nums text-gray-400 dark:text-zinc-500">
                              {group.members.length}
                            </span>
                          </td>
                        </tr>
                      )}
                      {group.members.map((s) => (
                        <StaffTableRow
                          key={s.id}
                          s={s}
                          offices={offices}
                          visibleColumns={visibleColumns}
                          isCurrentUser={s.id === currentUserId}
                          isSelected={selectedIds.has(s.id)}
                          active={formatRelativeTime(s.last_active)}
                          toggleSelect={toggleSelect}
                          onEditUser={onEditUser}
                          onRestoreUser={onRestoreUser}
                          onDeleteUser={onDeleteUser}
                          onInspectUser={setInspectMember}
                          isScrolledX={isScrolledX}
                        />
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </Table>
            </div>

            <TablePagination
              label="Staff directory pages"
              page={currentPage}
              pageSize={itemsPerPage}
              totalCount={filteredStaff.length}
              displayedCount={paginatedStaff.length}
              onPageChange={handlePageChange}
              onPageSizeChange={setItemsPerPage}
            />
          </div>
        )}
      </Card>

      {/* Floating Bulk Action Bar */}
      <FloatingActionBar
        selectedCount={selectedIds.size}
        entityName="personnel"
        onCancel={() => onSelectionChange(new Set())}
        primaryAction={{
          label: activeTab === "active" ? "Archive Staff" : "Restore Staff",
          variant: activeTab === "active" ? "danger" : "success",
          onClick: () => {
            if (activeTab === "active") {
              onBulkArchive(Array.from(selectedIds))
            } else {
              onBulkRestore(Array.from(selectedIds))
            }
          },
        }}
        secondaryActions={[
          {
            label: "Copy Emails",
            copiedLabel: "Emails Copied!",
            onClick: handleCopyEmails,
          },
          {
            label: "Copy Employee IDs",
            copiedLabel: "IDs Copied!",
            onClick: handleCopyIds,
          },
        ]}
      />

      {/* Slide-over Staff Details Sheet */}
      <Sheet open={Boolean(inspectMember)} onOpenChange={(open) => !open && setInspectMember(null)}>
        <SheetContent
          side="right"
          size="default"
          showCloseButton={false}
          className="w-full sm:max-w-md md:max-w-lg flex flex-col h-full p-0 overflow-hidden font-jakarta"
        >
          {inspectMember && (() => {
            const office = (Array.isArray(offices) ? offices : []).find((o) => o.id === inspectMember.office_id)
            const isSelf = inspectMember.id === currentUserId
            const initials = `${inspectMember.fname?.charAt(0) || ""}${inspectMember.lname?.charAt(0) || ""}`.toUpperCase() || "ST"
            const currentMemberIndex = filteredStaff.findIndex((m) => m.id === inspectMember.id)
            const hasPrevMember = currentMemberIndex > 0
            const hasNextMember = currentMemberIndex >= 0 && currentMemberIndex < filteredStaff.length - 1
            const activeInfo = formatRelativeTime(inspectMember.last_active)

            return (
              <>
                <SheetHeader className="shrink-0 p-0">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                    <div>
                      <SheetTitle>Staff Details</SheetTitle>
                      <SheetDescription className="sr-only">
                        Detailed account profile and security metadata for {getStaffCleanName(inspectMember)}
                      </SheetDescription>
                    </div>

                    <div className="ml-auto flex items-center gap-3">
                      {filteredStaff.length > 1 && currentMemberIndex !== -1 && (
                        <SheetPagination
                          compact
                          label="Record navigation"
                          page={currentMemberIndex + 1}
                          totalPages={filteredStaff.length}
                          totalCount={filteredStaff.length}
                          displayCount={filteredStaff.length}
                          onPrevious={() => hasPrevMember && setInspectMember(filteredStaff[currentMemberIndex - 1])}
                          onNext={() => hasNextMember && setInspectMember(filteredStaff[currentMemberIndex + 1])}
                          previousDisabled={!hasPrevMember}
                          nextDisabled={!hasNextMember}
                          previousLabel="Previous Staff"
                          nextLabel="Next Staff"
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => setInspectMember(null)}
                        className="size-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/[0.04] dark:border-white/[0.08] shadow-2xs"
                        aria-label="Close Staff Details"
                        title="Close"
                      >
                        <Cancel01Icon size="1em" className="text-sm" />
                      </button>
                    </div>
                  </div>
                </SheetHeader>

                {/* Status Banner */}
                <div
                  className={cn(
                    "flex items-center gap-2.5 px-6 py-2.5 text-xs border-b transition-colors shrink-0",
                    inspectMember.status !== "Archived"
                      ? "border-emerald-200/90 bg-emerald-50/90 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200"
                      : "border-amber-200/90 bg-amber-50/90 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200"
                  )}
                >
                  <AppIcon
                    className={cn(
                      " text-[15px] shrink-0",
                      inspectMember.status !== "Archived"
                        ? "Shield01Icon text-emerald-600 dark:text-emerald-400"
                        : "Alert01Icon text-amber-600 dark:text-amber-400"
                    )}
                  />
                  <span className="font-medium text-[11.5px] sm:text-xs leading-normal">
                    <strong className="font-semibold">
                      {inspectMember.status !== "Archived"
                        ? "Active Staff Account:"
                        : "Archived Staff Account:"}
                    </strong>{" "}
                    {inspectMember.status !== "Archived"
                      ? "Operational access granted to office archives and workstation."
                      : "Account access deactivated. Historical audit logs and records preserved."}
                  </span>
                </div>

                {/* Identity Summary Strip */}
                <div className="px-6 pt-4 flex items-center justify-between gap-3 pb-4 border-b border-border/80 dark:border-border shrink-0">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <ProfileAvatar
                      staffId={inspectMember.id}
                      name={getStaffCleanName(inspectMember)}
                      initials={initials}
                      className="size-12 rounded-full border shadow-2xs shrink-0"
                      fallbackClassName="text-base font-bold"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-900 dark:text-zinc-100 truncate block">
                          {getStaffCleanName(inspectMember)}
                        </span>
                        {isSelf && (
                          <span className={cn(COMPACT_BADGE_BASE, "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300")}>
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 font-sans tabular-nums truncate mt-0.5">
                        {inspectMember.id} • <span className="font-sans font-medium text-gray-600 dark:text-zinc-300">{inspectMember.section || "Administration"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span className={cn(COMPACT_BADGE_BASE, "bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200")}>
                      {office?.name || officeShortName || officePrefix}
                    </span>
                  </div>
                </div>

                {/* Scrollable Metadata Details */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-border/80 dark:border-border">
                      <AppIcon className=" Contact01Icon text-pup-maroon dark:text-red-400 text-sm" />
                      <h3 className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                        Identity & Access Metadata
                      </h3>
                    </div>
                    <div>
                      <InfoRow icon="Contact01Icon" label="Employee ID">
                        <div className="flex items-center gap-2">
                          <span className="font-sans tabular-nums text-xs font-bold text-gray-900 dark:text-zinc-100">
                            {inspectMember.id}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyField(inspectMember.id, "id", "Employee ID")}
                            className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Copy Employee ID"
                          >
                            {copiedField === "id" ? (
                              <Tick01Icon size="1em" className="text-[11px] text-gray-700 dark:text-zinc-200" />
                            ) : (
                              <Copy01Icon size="1em" className="text-[11px]" />
                            )}
                          </button>
                        </div>
                      </InfoRow>

                      <InfoRow icon="Mail01Icon" label="Official Email">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-sans tabular-nums text-gray-800 dark:text-zinc-200 truncate text-xs font-medium" title={inspectMember.email}>
                            {getStaffCleanEmail(inspectMember)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyField(getStaffCleanEmail(inspectMember), "email", "Official email")}
                            className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                            title="Copy Email"
                          >
                            {copiedField === "email" ? (
                              <Tick01Icon size="1em" className="text-[11px] text-gray-700 dark:text-zinc-200" />
                            ) : (
                              <Copy01Icon size="1em" className="text-[11px]" />
                            )}
                          </button>
                        </div>
                      </InfoRow>

                      <InfoRow icon="Shield01Icon" label="Role Authorization">
                        <span
                          className={cn(
                            BADGE_BASE,
                            "select-none",
                            inspectMember.role === "Admin"
                              ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                          )}
                        >
                          {getOfficeRoleLabel(inspectMember.role, inspectMember, offices)}
                        </span>
                      </InfoRow>

                      <InfoRow icon="Shield01Icon" label="Two-step Verification">
                        <span
                          className={cn(
                            BADGE_BASE,
                            "select-none",
                            inspectMember.totp_enabled
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400"
                          )}
                        >
                          {inspectMember.totp_enabled ? "Enabled" : "Not enabled"}
                        </span>
                      </InfoRow>

                      <InfoRow icon="Building01Icon" label="Assigned Section">
                        <span className="font-medium text-gray-800 dark:text-zinc-200">
                          {inspectMember.section || "General Administration"}
                        </span>
                      </InfoRow>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-border/80 dark:border-border">
                      <Clock01Icon size="1em" className="text-pup-maroon dark:text-red-400 text-sm" />
                      <h3 className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                        Activity & Lifecycle
                      </h3>
                    </div>
                    <div>
                      <InfoRow icon="Clock01Icon" label="Last Active Session">
                        <span className="font-sans tabular-nums text-xs font-medium text-gray-800 dark:text-zinc-200">
                          {activeInfo.relative || formatLastLoginDate(activeInfo.date) || "Never active"}
                        </span>
                      </InfoRow>

                      {inspectMember.created_at && (
                        <InfoRow icon="Calendar01Icon" label="Registered On">
                          <span className="font-sans tabular-nums text-xs font-medium text-gray-800 dark:text-zinc-200">
                            {formatPHDateTime(inspectMember.created_at)}
                          </span>
                        </InfoRow>
                      )}
                    </div>
                  </div>
                </div>

                <SheetFooter className="p-4 px-6 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setInspectMember(null)}
                      className="h-9 px-4"
                    >
                      Close
                    </Button>
                    <CopyButton
                      iconOnly
                      textToCopy={() => JSON.stringify(inspectMember, null, 2)}
                      entityName="Staff Data"
                      idleLabel="Copy Staff Data"
                      copiedLabel="Data Copied!"
                    />
                  </div>

                  {isSelf ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInspectMember(null)
                        window.dispatchEvent(
                          new CustomEvent("switch-view", { detail: { view: "settings" } })
                        )
                      }}
                      className="h-9 px-4"
                    >
                      My Account Settings
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      {inspectMember.status !== "Archived" ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const m = inspectMember
                              setInspectMember(null)
                              onDeleteUser(m.id)
                            }}
                            className="h-9 px-4"
                          >
                            Archive Staff
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              const m = inspectMember
                              setInspectMember(null)
                              onEditUser(m.id)
                            }}
                            className="h-9 px-4"
                          >
                            Edit Profile
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="success"
                          size="sm"
                          onClick={() => {
                            const m = inspectMember
                            setInspectMember(null)
                            onRestoreUser(m.id)
                          }}
                          className="h-9 px-4"
                        >
                          Restore Staff
                        </Button>
                      )}
                    </div>
                  )}
                </SheetFooter>
              </>
            )
          })()}
        </SheetContent>
      </Sheet>
    </div>
    </TooltipProvider>
  )
}
