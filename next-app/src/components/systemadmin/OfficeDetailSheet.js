"use client";

import NoticeBanner from "@/components/shared/NoticeBanner";
import SheetSectionHeading from "@/components/shared/SheetSectionHeading";
import SheetPagination from "@/components/shared/SheetPagination";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import { useEffect, useState, useMemo, useCallback } from "react";

import { Button } from "@/components/ui/button";
import CopyButton from "@/components/shared/CopyButton";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { COMPACT_BADGE_BASE, SUPERADMIN_BADGE_BASE as BADGE_PALETTES } from "@/lib/badgeStyles";
import { formatPHDateTime } from "@/lib/timeFormat";
import { EmptyState } from "@/components/ui/empty";
import { UserGroupIcon, LayoutGridIcon, Building01Icon, Cancel01Icon, CheckmarkCircle01Icon, ComputerIcon, Tick01Icon, UserSearch01Icon } from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
/**
 * Middle-truncates long filesystem paths so root and leaf directories remain visible.
 */
function formatMiddleTruncate(str, maxLength = 26) {
  if (!str || typeof str !== "string") return "";
  if (str.length <= maxLength) return str;
  const lead = Math.ceil((maxLength - 3) / 2);
  const tail = Math.floor((maxLength - 3) / 2);
  return `${str.slice(0, lead)}...${str.slice(-tail)}`;
}

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
        {children ?? (value || <span className="text-gray-400 font-normal italic">None</span>)}
      </div>
    </div>
  );
}

export default function OfficeDetailSheet({
  open,
  onOpenChange,
  office,
  onClose,
  onConfigure,
  onRestore,
  onArchive,
  currentIndex = -1,
  totalCount = 0,
  onNavigatePrev,
  onNavigateNext,
  showToast,
}) {
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [modulesList, setModulesList] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // Preserve the last selected office during exit animation transition
  const [cachedOffice, setCachedOffice] = useState(office);
  const [prevOffice, setPrevOffice] = useState(office);

  if (office && office !== prevOffice) {
    setPrevOffice(office);
    setCachedOffice(office);
  }

  const displayOffice = office || cachedOffice;

  const officeId = displayOffice?.id;
  const isOpen = open !== undefined ? open : Boolean(office);

  const handleClose = useCallback(() => {
    onOpenChange?.(false);
    onClose?.();
  }, [onOpenChange, onClose]);

  // Fetch assigned staff & enabled modules for the selected office
  useEffect(() => {
    let isMounted = true;
    if (!officeId || !isOpen) {
      return;
    }

    const timer = setTimeout(() => {
      if (isMounted) {
        setStaffLoading(true);
        setModulesLoading(true);
      }
    }, 0);

    // 1. Fetch Staff Roster for this office
    fetch(`/api/staff?officeId=${encodeURIComponent(officeId)}&limit=100`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (isMounted) {
          if (json?.ok && Array.isArray(json.data)) {
            setStaffList(json.data);
          } else {
            setStaffList([]);
          }
        }
      })
      .catch(() => {
        if (isMounted) setStaffList([]);
      })
      .finally(() => {
        if (isMounted) setStaffLoading(false);
      });

    // 2. Fetch Modules for this office
    fetch(`/api/offices/${encodeURIComponent(officeId)}/modules`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (isMounted) {
          if (json?.ok && Array.isArray(json.data)) {
            setModulesList(json.data);
          } else {
            setModulesList([]);
          }
        }
      })
      .catch(() => {
        if (isMounted) setModulesList([]);
      })
      .finally(() => {
        if (isMounted) setModulesLoading(false);
      });

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [officeId, isOpen]);

  const enabledModules = useMemo(() => {
    return modulesList.filter((m) => m.enabled || m.is_system);
  }, [modulesList]);

  const copyToClipboard = useCallback(
    (text, label = "Value", fieldKey = null) => {
      if (!text) return;
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(text);
        if (fieldKey) {
          setCopiedField(fieldKey);
          setTimeout(() => setCopiedField(null), 1500);
        }
        showToast?.(`Copied ${label} to clipboard`, "success");
      }
    },
    [showToast]
  );

  // If no office has ever been opened yet, do not mount DOM contents
  if (!displayOffice) return null;

  const accent = displayOffice.accent_color || "#800000";
  const isActive = displayOffice.status === "Active";
  const defaultAdminId = `PUP${String(displayOffice.id || "").trim().toUpperCase()}-001`;
  const defaultAdminEmail = `admin.${String(displayOffice.id || "").trim().toLowerCase()}@pup.local`;
  const inboundPath = displayOffice.scanner_host_path || displayOffice.inbound_path || `.local/hot-folder/${displayOffice.id}/INBOUND`;
  const storagePath = displayOffice.storage_path || `.local/storage/${displayOffice.id}`;

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(openState) => {
        if (!openState) handleClose();
      }}
    >
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
                Department Details
              </SheetTitle>
              <SheetDescription className="sr-only">
                Detailed profile, scanning station hardware, staff roster, and enabled modules for {displayOffice.name}
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
                  previousLabel="Previous Department"
                  nextLabel="Next Department"
                />
              )}

              {/* Apple Circular Close Button */}
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                title="Close"
                className="size-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/[0.04] dark:border-white/[0.08] shadow-2xs"
              >
                <Cancel01Icon size="1em" className="text-sm" />
              </button>
            </div>
          </div>
        </SheetHeader>

        {/* Edge-to-Edge Line-Attached Status Notice */}
        <NoticeBanner tone={isActive ? "success" : "warning"} title={isActive ? "Active Department Workspace" : "Deactivated Department Workspace"}>
          {isActive
              ? "Workstations, hot-folder ingest, and archival routing are operational."
              : "Scanning station link and student request routing are suspended."}
        </NoticeBanner>

        {/* Scrollable Single-Column Body with smooth entrance animation */}
        <div
          key={displayOffice.id}
          className="flex-1 overflow-y-auto p-6 space-y-6 motion-safe:animate-in motion-safe:fade-in-50 motion-safe:slide-in-from-bottom-1 duration-200 ease-out"
        >
          {/* Summary Strip (Unboxed) */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-border/80 dark:border-border">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Brand Accent Circular Tile */}
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center border text-xl shadow-xs shrink-0 transition-transform"
                style={{
                  color: accent,
                  backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
                  borderColor: `color-mix(in srgb, ${accent} 28%, transparent)`,
                }}
              >
                <AppIcon className={cn(displayOffice.icon || "Building02Icon", "text-xl")} fallback="Building02Icon" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-gray-900 dark:text-zinc-100 truncate">
                    {displayOffice.short_name}
                  </span>
                  <span className={cn(COMPACT_BADGE_BASE, BADGE_PALETTES.gray, "font-sans tabular-nums")}>
                    #{displayOffice.id}
                  </span>
                </div>
                <p className="text-xs font-semibold text-gray-700 dark:text-zinc-300 truncate mt-0.5" title={displayOffice.name}>
                  {displayOffice.name}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 line-clamp-1 mt-0.5" title={displayOffice.description}>
                  {displayOffice.description || "Administrative campus unit and departmental workspace."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={cn(
                  COMPACT_BADGE_BASE,
                  isActive
                    ? BADGE_PALETTES.emerald
                    : BADGE_PALETTES.gray
                )}
              >
                {isActive ? "Active" : "Archived"}
              </span>
            </div>
          </div>

          {/* Section 1: Department Overview & Identity */}
          <div className="space-y-2">
            <SheetSectionHeading icon={Building01Icon} title="Department Identity & Scope" />
            <div className="divide-y-0">
              <InfoRow
                icon=" Contact01Icon"
                label="Department Code"
                value={
                  <div className="flex items-center gap-2">
                    <span className="font-sans tabular-nums text-xs font-bold text-gray-900 dark:text-zinc-100">
                      {displayOffice.id}
                    </span>
                    <CopyButton iconOnly textToCopy={displayOffice.id} entityName="Department Code" />
                  </div>
                }
              />
              <InfoRow
                icon=" PaintBoardIcon"
                label="Brand Accent"
                value={
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/15 dark:border-white/20 shadow-2xs shrink-0"
                      style={{ backgroundColor: accent }}
                    />
                    <span className="font-sans tabular-nums text-xs text-gray-700 dark:text-zinc-300 uppercase">
                      {accent}
                    </span>
                  </div>
                }
              />
              <InfoRow
                icon=" Shield01Icon"
                label="Default Admin"
                value={
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-sans tabular-nums text-xs font-semibold text-gray-900 dark:text-zinc-100">
                      {defaultAdminId}
                    </span>
                    {defaultAdminId && <CopyButton iconOnly textToCopy={defaultAdminId} entityName="Default Admin ID" />}
                    <span className="text-[11px] text-gray-500 dark:text-zinc-400 font-sans tabular-nums">
                      ({defaultAdminEmail})
                    </span>
                    <CopyButton iconOnly textToCopy={defaultAdminEmail} entityName="Default Admin Email" />
                  </div>
                }
              />
              <InfoRow
                icon=" Calendar01Icon"
                label="Provisioned"
                value={<span className="font-medium text-gray-800 dark:text-zinc-200">{formatPHDateTime(displayOffice.created_at)}</span>}
              />
            </div>
          </div>

          {/* Section 2: Scanning Workstation & Hardware */}
          <div className="space-y-2">
            <SheetSectionHeading icon={ComputerIcon} title="Scanning Station & Ingestion Hardware" />
            <div className="divide-y-0">
              <InfoRow
                icon=" Tablet01Icon"
                label="Host Workstation"
                value={
                  displayOffice.station_name ? (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-zinc-100">
                        {displayOffice.station_name}
                      </span>
                      <span className={cn(
                        COMPACT_BADGE_BASE,
                        displayOffice.scanner_watching
                          ? BADGE_PALETTES.emerald
                          : BADGE_PALETTES.gray
                      )}>
                        {displayOffice.scanner_watching ? "Watching" : "Not watching"}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 dark:text-zinc-500 font-normal italic">
                      Unassigned / Standalone
                    </span>
                  )
                }
              />
              <InfoRow
                icon=" PrinterIcon"
                label="Scanner Hardware"
                value={
                  <span className="font-medium text-gray-800 dark:text-zinc-200">
                    {displayOffice.scanner_model || "Standard High-Speed ADF Scanner"}
                  </span>
                }
              />
              <InfoRow
                icon=" FolderOpenIcon"
                label="Inbound Hot-Folder"
                value={
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="font-sans tabular-nums text-xs text-gray-700 dark:text-zinc-300"
                      title={inboundPath}
                    >
                      {formatMiddleTruncate(inboundPath, 30)}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(inboundPath, "Inbound Path", "inbound")}
                      title="Copy Inbound Folder Path"
                      className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                    >
                      <AppIcon className={cn("text-[11px] ", copiedField === "inbound" ? "Tick01Icon text-gray-700 dark:text-zinc-200" : "Copy01Icon")} />
                    </button>
                  </div>
                }
              />
              <InfoRow
                icon=" CloudServerIcon"
                label="Storage Partition"
                value={
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="font-sans tabular-nums text-xs text-gray-700 dark:text-zinc-300"
                      title={storagePath}
                    >
                      {formatMiddleTruncate(storagePath, 30)}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(storagePath, "Storage Path", "storage")}
                      title="Copy Storage Partition"
                      className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                    >
                      <AppIcon className={cn("text-[11px] ", copiedField === "storage" ? "Tick01Icon text-gray-700 dark:text-zinc-200" : "Copy01Icon")} />
                    </button>
                  </div>
                }
              />
              <InfoRow
                icon=" Key01Icon"
                label="Ingest API Token"
                value={
                  displayOffice.ingest_token ? (
                    <div className="flex items-center gap-2">
                      <span className="font-sans tabular-nums text-xs text-gray-600 dark:text-zinc-400">
                        ••••••••••••{displayOffice.ingest_token.slice(-6)}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(displayOffice.ingest_token, "Station Ingest Token", "token")}
                        title="Copy Station Bearer Token"
                        className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        <AppIcon className={cn("text-[11px] ", copiedField === "token" ? "Tick01Icon text-gray-700 dark:text-zinc-200" : "Copy01Icon")} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-400 dark:text-zinc-500 font-normal italic">
                      Auto-generated on station link
                    </span>
                  )
                }
              />
              <InfoRow
                icon=" RadioIcon"
                label="Heartbeat Status"
                value={
                  displayOffice.last_station_ping ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckmarkCircle01Icon size="1em" className="text-xs" />
                        Online
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                        (Last ping: {formatPHDateTime(displayOffice.last_station_ping)})
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 dark:text-zinc-500 font-normal italic">
                      No heartbeat communication recorded
                    </span>
                  )
                }
              />
            </div>
          </div>

          {/* Section 3: Assigned Personnel ({staffList.length}) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-border dark:border-border">
              <SheetSectionHeading icon={UserSearch01Icon} title="Assigned Personnel Roster" divider={false} />
              <Badge size="compact" variant="outline" className="font-sans tabular-nums text-gray-600 dark:text-zinc-300">
                {staffLoading ? "..." : `${staffList.length} Staff`}
              </Badge>
            </div>

            {staffLoading ? (
              <div className="space-y-2.5 pt-1">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : staffList.length > 0 ? (
              <div className="space-y-2 pt-1">
                {staffList.slice(0, 5).map((staff) => {
                  const initials = `${staff.fname?.[0] || ""}${staff.lname?.[0] || ""}`.toUpperCase() || "ST";
                  return (
                    <div
                      key={staff.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 dark:border-border/60 bg-gray-50/70 dark:bg-zinc-800/40 hover:bg-gray-100/60 dark:hover:bg-zinc-800/60 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ProfileAvatar
                          staffId={staff.id}
                          name={`${staff.fname} ${staff.lname}`}
                          initials={initials}
                          className="size-8 rounded-full border shadow-2xs shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate">
                              {staff.fname} {staff.lname}
                            </span>
                            <span
                              className={cn(
                                COMPACT_BADGE_BASE,
                                "text-[10px]",
                                staff.role === "Admin"
                                  ? BADGE_PALETTES.rose
                                  : BADGE_PALETTES.blue
                              )}
                            >
                              {staff.role}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-500 dark:text-zinc-400 truncate block">
                            {staff.email}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <span className={cn(COMPACT_BADGE_BASE, BADGE_PALETTES.gray, "font-sans tabular-nums")}>
                          {staff.id}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {staffList.length > 5 && (
                  <p className="text-[11px] text-center text-gray-500 dark:text-zinc-400 pt-1">
                    + {staffList.length - 5} more personnel assigned to this department
                  </p>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("switch-view", { detail: { view: "staff", officeId: displayOffice.id } })
                    );
                    handleClose();
                  }}
                  className="w-full h-9 mt-2 text-xs font-semibold rounded-xl"
                >
                  Manage All Staff in Global Directory
                </Button>
              </div>
            ) : (
              <EmptyState
                variant="compact"
                icon={UserGroupIcon}
                title="No Personnel Assigned"
                description="Assign administrative officers or staff accounts to activate this department workspace."
              />
            )}
          </div>

          {/* Section 4: Enabled Workspace Modules */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-border dark:border-border">
              <SheetSectionHeading icon={LayoutGridIcon} title="Department Workspace Modules" divider={false} />
              <Badge size="compact" variant="outline" className="font-sans tabular-nums text-gray-600 dark:text-zinc-300">
                {modulesLoading ? "..." : `${enabledModules.length} Active`}
              </Badge>
            </div>

            {modulesLoading ? (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Skeleton className="h-10 rounded-xl" />
                <Skeleton className="h-10 rounded-xl" />
                <Skeleton className="h-10 rounded-xl" />
                <Skeleton className="h-10 rounded-xl" />
              </div>
            ) : enabledModules.length > 0 ? (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {enabledModules.map((mod) => (
                    <div
                      key={mod.id}
                      className="p-2.5 rounded-xl border border-border/70 dark:border-border/60 bg-gray-50/70 dark:bg-zinc-800/40 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-pup-maroon/10 dark:bg-white/10 text-pup-maroon dark:text-zinc-200 flex items-center justify-center shrink-0">
                          <AppIcon className={cn(mod.icon || "Tick01Icon", "text-xs")} fallback="Tick01Icon" />
                        </div>
                        <span className="text-xs font-medium text-gray-900 dark:text-zinc-100 truncate">
                          {mod.name || mod.id}
                        </span>
                      </div>
                      {mod.is_system && (
                        <span className={cn(COMPACT_BADGE_BASE, "font-sans tabular-nums bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300")}>
                          Core
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("switch-view", { detail: { view: "modules", officeId: displayOffice.id } })
                    );
                    handleClose();
                  }}
                  className="w-full h-9 mt-2 text-xs font-semibold rounded-xl"
                >
                  Configure Feature Matrix
                </Button>
              </div>
            ) : (
              <EmptyState
                variant="compact"
                icon={LayoutGridIcon}
                title="No Custom Modules Configured"
                description="This department operates with standard institutional defaults."
              />
            )}
          </div>
        </div>

        {/* Executive Action Bar Footer */}
        <SheetFooter className="shrink-0 p-4 px-6 flex flex-row items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              className="h-9 px-4"
            >
              Close
            </Button>
            <CopyButton
              iconOnly
              textToCopy={() => JSON.stringify(displayOffice, null, 2)}
              entityName="Department Data"
              copiedLabel="Data Copied!"
            />
          </div>

          {isActive ? (
            onConfigure && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  handleClose()
                  onConfigure(displayOffice)
                }}
                className="h-9 px-4"
              >
                Configure Department
              </Button>
            )
          ) : (
            onRestore && (
              <Button
                type="button"
                variant="success"
                size="sm"
                onClick={() => {
                  handleClose()
                  onRestore(displayOffice)
                }}
                className="h-9 px-4"
              >
                Restore Department
              </Button>
            )
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
