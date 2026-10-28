"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import HugeIcon from "@/components/shared/HugeIcon";
import { Button } from "@/components/ui/button";
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
import { formatPHDateTime } from "@/lib/timeFormat";

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
            <HugeIcon className={cn("text-gray-400 dark:text-zinc-500 text-sm shrink-0", icon)} />
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
  const inboundPath = displayOffice.inbound_path || `.local/hot-folder/${displayOffice.id}`;
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
        className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full bg-white dark:bg-card border-l border-border dark:border-border p-0 shadow-2xl overflow-hidden"
      >
        {/* Top Header matching reference standard: Department Details < > 01 of XX X */}
        <SheetHeader className="shrink-0 p-0 border-b border-border dark:border-border bg-white dark:bg-card">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <SheetTitle className="text-base font-bold text-gray-900 dark:text-zinc-50 tracking-tight">
                Department Details
              </SheetTitle>
              <SheetDescription className="sr-only">
                Detailed profile, scanning station hardware, staff roster, and enabled modules for {displayOffice.name}
              </SheetDescription>
            </div>

            <div className="flex items-center gap-3">
              {/* Record Browsing Navigation Controls (< > 01 of XX) */}
              {typeof totalCount === "number" && totalCount > 1 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400">
                  <button
                    type="button"
                    disabled={currentIndex <= 0}
                    onClick={onNavigatePrev}
                    aria-label="Previous Department"
                    title="Previous Department"
                    className="w-7 h-7 rounded-lg border border-border dark:border-border flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  >
                    <HugeIcon className="ph-bold ph-caret-left text-xs" />
                  </button>
                  <button
                    type="button"
                    disabled={currentIndex >= totalCount - 1}
                    onClick={onNavigateNext}
                    aria-label="Next Department"
                    title="Next Department"
                    className="w-7 h-7 rounded-lg border border-border dark:border-border flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  >
                    <HugeIcon className="ph-bold ph-caret-right text-xs" />
                  </button>
                  <span className="font-mono text-[11px] font-semibold text-gray-700 dark:text-zinc-300 ml-0.5">
                    {String(Math.max(1, (currentIndex ?? 0) + 1)).padStart(2, "0")} of {String(totalCount).padStart(2, "0")}
                  </span>
                </div>
              )}

              {/* Accessible Squircle Close Button */}
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                title="Close"
                className="w-8 h-8 rounded-xl bg-gray-100/90 hover:bg-gray-200/90 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/5 dark:border-white/10 shadow-2xs"
              >
                <HugeIcon className="ph-bold ph-x text-sm" />
              </button>
            </div>
          </div>
        </SheetHeader>

        {/* Edge-to-Edge Line-Attached Status Notice */}
        <div
          className={cn(
            "flex items-center gap-2.5 px-6 py-2.5 text-xs border-b transition-colors shrink-0",
            isActive
              ? "border-emerald-200/90 bg-emerald-50/90 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200"
              : "border-amber-200/90 bg-amber-50/90 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200"
          )}
        >
          <HugeIcon
            className={cn(
              "ph-bold text-[15px] shrink-0",
              isActive ? "ph-shield-check text-emerald-600 dark:text-emerald-400" : "ph-warning-circle text-amber-600 dark:text-amber-400"
            )}
          />
          <span className="font-medium text-[11.5px] sm:text-xs leading-normal">
            <strong className="font-semibold">
              {isActive ? "Active Department Workspace:" : "Deactivated Department Workspace:"}
            </strong>{" "}
            {isActive
              ? "Workstations, hot-folder ingest, and archival routing are operational."
              : "Scanning station link and student request routing are suspended."}
          </span>
        </div>

        {/* Scrollable Single-Column Body with smooth entrance animation */}
        <div
          key={displayOffice.id}
          className="flex-1 overflow-y-auto p-6 space-y-6 motion-safe:animate-in motion-safe:fade-in-50 motion-safe:slide-in-from-bottom-1 duration-200 ease-out"
        >
          {/* Summary Strip (Unboxed) */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-border/80 dark:border-border">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Brand Accent Squircle Tile */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center border text-xl shadow-xs shrink-0 transition-transform"
                style={{
                  color: accent,
                  backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
                  borderColor: `color-mix(in srgb, ${accent} 28%, transparent)`,
                }}
              >
                <HugeIcon className={displayOffice.icon || "ph-bold ph-buildings"} />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-gray-900 dark:text-zinc-100 truncate">
                    {displayOffice.short_name}
                  </span>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200/80 dark:border-zinc-700/60 shadow-2xs">
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
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border shadow-2xs select-none",
                  isActive
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40"
                    : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isActive ? "bg-emerald-500" : "bg-gray-400"
                  )}
                />
                {isActive ? "Active" : "Archived"}
              </span>
            </div>
          </div>

          {/* Section 1: Department Overview & Identity */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-1.5 border-b border-border dark:border-border">
              <HugeIcon className="ph-bold ph-buildings text-pup-maroon dark:text-red-400 text-sm" />
              <h3 className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                Department Identity & Scope
              </h3>
            </div>
            <div className="divide-y-0">
              <InfoRow
                icon="ph-bold ph-identification-badge"
                label="Department Code"
                value={
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-gray-900 dark:text-zinc-100">
                      {displayOffice.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(displayOffice.id, "Department Code", "code")}
                      title="Copy Department Code"
                      className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <HugeIcon className={cn("text-[11px] ph-bold", copiedField === "code" ? "ph-check text-emerald-600 dark:text-emerald-400" : "ph-copy")} />
                    </button>
                  </div>
                }
              />
              <InfoRow
                icon="ph-bold ph-text-align-left"
                label="Full Designation"
                value={<span className="font-medium text-gray-800 dark:text-zinc-200 leading-relaxed">{displayOffice.name}</span>}
              />
              <InfoRow
                icon="ph-bold ph-palette"
                label="Brand Accent"
                value={
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/15 dark:border-white/20 shadow-2xs shrink-0"
                      style={{ backgroundColor: accent }}
                    />
                    <span className="font-mono text-xs text-gray-700 dark:text-zinc-300 uppercase">
                      {accent}
                    </span>
                  </div>
                }
              />
              <InfoRow
                icon="ph-bold ph-shield-check"
                label="Default Admin"
                value={
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-gray-900 dark:text-zinc-100">
                      {defaultAdminId}
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-zinc-400 font-mono">
                      ({defaultAdminEmail})
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(defaultAdminEmail, "Admin Email", "email")}
                      title="Copy Default Admin Email"
                      className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <HugeIcon className={cn("text-[11px] ph-bold", copiedField === "email" ? "ph-check text-emerald-600 dark:text-emerald-400" : "ph-copy")} />
                    </button>
                  </div>
                }
              />
              <InfoRow
                icon="ph-bold ph-calendar-blank"
                label="Provisioned"
                value={<span className="font-medium text-gray-800 dark:text-zinc-200">{formatPHDateTime(displayOffice.created_at)}</span>}
              />
            </div>
          </div>

          {/* Section 2: Scanning Workstation & Hardware */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-1.5 border-b border-border dark:border-border">
              <HugeIcon className="ph-bold ph-desktop text-pup-maroon dark:text-red-400 text-sm" />
              <h3 className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                Scanning Station & Ingestion Hardware
              </h3>
            </div>
            <div className="divide-y-0">
              <InfoRow
                icon="ph-bold ph-device-tablet-speaker"
                label="Host Workstation"
                value={
                  displayOffice.station_name ? (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-zinc-100">
                        {displayOffice.station_name}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Paired
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
                icon="ph-bold ph-printer"
                label="Scanner Hardware"
                value={
                  <span className="font-medium text-gray-800 dark:text-zinc-200">
                    {displayOffice.scanner_model || "Standard High-Speed ADF Scanner"}
                  </span>
                }
              />
              <InfoRow
                icon="ph-bold ph-folder-notch-open"
                label="Inbound Hot-Folder"
                value={
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="font-mono text-xs text-gray-700 dark:text-zinc-300"
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
                      <HugeIcon className={cn("text-[11px] ph-bold", copiedField === "inbound" ? "ph-check text-emerald-600 dark:text-emerald-400" : "ph-copy")} />
                    </button>
                  </div>
                }
              />
              <InfoRow
                icon="ph-bold ph-hard-drives"
                label="Storage Partition"
                value={
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="font-mono text-xs text-gray-700 dark:text-zinc-300"
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
                      <HugeIcon className={cn("text-[11px] ph-bold", copiedField === "storage" ? "ph-check text-emerald-600 dark:text-emerald-400" : "ph-copy")} />
                    </button>
                  </div>
                }
              />
              <InfoRow
                icon="ph-bold ph-key"
                label="Ingest API Token"
                value={
                  displayOffice.ingest_token ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-600 dark:text-zinc-400">
                        ••••••••••••{displayOffice.ingest_token.slice(-6)}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(displayOffice.ingest_token, "Station Ingest Token", "token")}
                        title="Copy Station Bearer Token"
                        className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        <HugeIcon className={cn("text-[11px] ph-bold", copiedField === "token" ? "ph-check text-emerald-600 dark:text-emerald-400" : "ph-copy")} />
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
                icon="ph-bold ph-broadcast"
                label="Heartbeat Status"
                value={
                  displayOffice.last_station_ping ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <HugeIcon className="ph-bold ph-check-circle text-xs" />
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
              <div className="flex items-center gap-2">
                <HugeIcon className="ph-bold ph-users text-pup-maroon dark:text-red-400 text-sm" />
                <h3 className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                  Assigned Personnel Roster
                </h3>
              </div>
              <Badge variant="outline" className="text-[11px] font-mono px-2 py-0.5 rounded-full border-border dark:border-border text-gray-600 dark:text-zinc-300">
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
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/30 hover:bg-gray-100/60 dark:hover:bg-zinc-800/60 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center font-bold text-xs text-gray-700 dark:text-zinc-200 shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate">
                              {staff.fname} {staff.lname}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] px-1.5 py-0.2 rounded font-medium",
                                staff.role === "Admin"
                                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40"
                                    : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40"
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
                        <span className="font-mono text-[10px] text-gray-500 dark:text-zinc-400 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded border border-gray-200/60 dark:border-white/10">
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
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("switch-view", { detail: { view: "staff", officeId: displayOffice.id } })
                    );
                    handleClose();
                  }}
                  className="w-full h-9 rounded-xl text-xs font-semibold mt-2 border border-border dark:border-border hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer active:scale-95 transition-all"
                >
                  Manage All Staff in Global Directory
                </Button>
              </div>
            ) : (
              <div className="p-6 text-center rounded-2xl border border-dashed border-border dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-800/20 mt-1">
                <HugeIcon className="ph-duotone ph-users text-2xl text-gray-400 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-gray-700 dark:text-zinc-300">
                  No Personnel Assigned
                </p>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                  Assign administrative officers or staff accounts to activate this department workspace.
                </p>
              </div>
            )}
          </div>

          {/* Section 4: Enabled Workspace Modules */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-border dark:border-border">
              <div className="flex items-center gap-2">
                <HugeIcon className="ph-bold ph-squares-four text-pup-maroon dark:text-red-400 text-sm" />
                <h3 className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                  Department Workspace Modules
                </h3>
              </div>
              <Badge variant="outline" className="text-[11px] font-mono px-2 py-0.5 rounded-full border-border dark:border-border text-gray-600 dark:text-zinc-300">
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
                      className="p-2.5 rounded-xl border border-border dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/30 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-pup-maroon/10 dark:bg-white/10 text-pup-maroon dark:text-zinc-200 flex items-center justify-center shrink-0">
                          <HugeIcon className={mod.icon || "ph-bold ph-check"} />
                        </div>
                        <span className="text-xs font-medium text-gray-900 dark:text-zinc-100 truncate">
                          {mod.name || mod.id}
                        </span>
                      </div>
                      {mod.is_system && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300 uppercase shrink-0">
                          Core
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("switch-view", { detail: { view: "modules", officeId: displayOffice.id } })
                    );
                    handleClose();
                  }}
                  className="w-full h-9 rounded-xl text-xs font-semibold mt-2 border border-border dark:border-border hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer active:scale-95 transition-all"
                >
                  Configure Feature Matrix
                </Button>
              </div>
            ) : (
              <div className="p-6 text-center rounded-2xl border border-dashed border-border dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-800/20 mt-1">
                <HugeIcon className="ph-duotone ph-squares-four text-2xl text-gray-400 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-gray-700 dark:text-zinc-300">
                  No Custom Modules Configured
                </p>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                  This department operates with standard institutional defaults.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Executive Action Bar Footer */}
        <SheetFooter className="shrink-0 p-4 px-6 border-t border-border dark:border-border bg-gray-50/70 dark:bg-zinc-900/40 flex flex-row items-center justify-between">
          <div>
            {isActive ? (
              onConfigure && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    handleClose();
                    onConfigure?.(displayOffice);
                  }}
                  className="h-10 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Configure Department
                </Button>
              )
            ) : (
              onRestore && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    handleClose();
                    onRestore?.(displayOffice);
                  }}
                  className="h-10 px-4 text-xs font-semibold rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Restore Department
                </Button>
              )
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="h-10 px-5 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
