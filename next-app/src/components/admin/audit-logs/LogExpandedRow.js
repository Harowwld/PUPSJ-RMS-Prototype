"use client";

import { useState } from "react";
import NarrativeText from "@/components/shared/NarrativeText";
import { cn, formatLogDetails } from "@/lib/utils";
import { formatPHDateTime } from "@/lib/timeFormat";
import {
  AlignBoxBottomCenterIcon,
  Clock01Icon,
  ComputerIcon,
  Copy01Icon,
  File02Icon,
  Tick01Icon,
  UserIcon,
  WifiFullSignalIcon,
} from "hugeicons-react";

/**
 * Intelligent User Agent parser for clean client attribution.
 */
function parseUserAgent(uaString) {
  if (!uaString || typeof uaString !== "string" || uaString.trim() === "") {
    return {
      browser: "System Process",
      os: "Automated Execution",
      summary: "System Process",
      raw: null,
    };
  }

  const s = uaString.toLowerCase();

  // Operating System
  let os = "Unknown OS";
  if (s.includes("macintosh") || s.includes("mac os x")) os = "macOS";
  else if (s.includes("windows nt 10.0") || s.includes("windows nt 11.0")) os = "Windows 10/11";
  else if (s.includes("windows")) os = "Windows";
  else if (s.includes("iphone")) os = "iOS";
  else if (s.includes("ipad")) os = "iPadOS";
  else if (s.includes("android")) os = "Android";
  else if (s.includes("linux")) os = "Linux";
  else if (s.includes("cros")) os = "ChromeOS";

  // Browser / Engine
  let browser = "Web Client";
  if (s.includes("edg/")) browser = "Microsoft Edge";
  else if (s.includes("opr/") || s.includes("opera")) browser = "Opera";
  else if (s.includes("chrome") && !s.includes("edg/")) browser = "Google Chrome";
  else if (s.includes("safari") && !s.includes("chrome")) browser = "Safari";
  else if (s.includes("firefox")) browser = "Mozilla Firefox";
  else if (s.includes("scanner") || s.includes("ingest") || s.includes("daemon")) browser = "Archival Daemon";
  else if (s.includes("curl") || s.includes("postman") || s.includes("node-fetch")) browser = "API Client";

  return {
    browser,
    os,
    summary: `${browser} • ${os}`,
    raw: uaString,
  };
}

/**
 * Dotless semantic severity badges following Apple HIG and institutional guidelines.
 */
function getSeverityBadge(severity) {
  const s = String(severity || "").toUpperCase();
  if (s === "CRITICAL" || s === "SECURITY") {
    return {
      label: "Critical",
      className:
        "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40",
    };
  }
  if (s === "WARNING") {
    return {
      label: "Warning",
      className:
        "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40",
    };
  }
  return {
    label: "Info",
    className:
      "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200/60 dark:border-sky-900/40",
  };
}

export default function LogExpandedRow({ log, handleCopy }) {
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopyField = (text, label, key) => {
    if (!text) return;
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(String(text));
    }
    handleCopy?.(String(text), label);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 2000);
  };

  const severityBadge = getSeverityBadge(log?.severity);
  const uaParsed = parseUserAgent(log?.userAgent || log?.user_agent);
  const ipAddress = log?.ip || "::1";
  const isLoopback = ipAddress === "::1" || ipAddress === "127.0.0.1" || ipAddress === "localhost";
  const entityIdText = log?.entityId || log?.entity_id || "None";
  const entityTypeText = log?.entityType || log?.entity_type || "General";
  const scopeText = log?.officeName || log?.office_name || log?.scope || "Institutional Platform";

  const timestampText = (() => {
    const raw = log?.created_at || log?.time;
    if (!raw) return null;
    return formatPHDateTime(raw);
  })();

  const actorName = log?.actor || log?.user || "System Process";
  const actorRole = log?.role || (log?.actor ? "Personnel" : "Automated");

  return (
    <div className="animate-in fade-in slide-in-from-top-1 duration-200 bg-gray-50/70 dark:bg-zinc-950/40 backdrop-blur-md px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6 border-t border-black/[0.05] dark:border-white/[0.07] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 items-stretch">
        {/* Card 1: Activity Narrative & Event Context */}
        <div className="flex flex-col rounded-2xl bg-white dark:bg-zinc-900/90 border border-black/[0.06] dark:border-white/[0.08] shadow-2xs overflow-hidden">
          {/* Card Header */}
          <div className="px-4 py-3 bg-gray-50/50 dark:bg-zinc-800/25 border-b border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-pup-maroon/10 dark:bg-pup-maroon/20 text-pup-maroon dark:text-red-400 flex items-center justify-center shrink-0">
                <File02Icon size="1em" className="text-xs" />
              </div>
              <h5 className="text-xs font-semibold text-gray-800 dark:text-zinc-200 tracking-tight truncate">
                Activity Narrative
              </h5>
            </div>
            <span
              className={cn(
                "px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide shrink-0",
                severityBadge.className
              )}
            >
              {severityBadge.label}
            </span>
          </div>

          {/* Card Body */}
          <div className="p-4 flex flex-col justify-between flex-1 gap-3.5">
            <p className="text-xs sm:text-[13px] font-normal text-gray-700 dark:text-zinc-300 leading-relaxed break-words">
              <NarrativeText text={log?.details} mode="full" />
            </p>

            {/* Bottom Context Strip */}
            <div className="pt-3 border-t border-black/[0.04] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {log?.action && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100/80 dark:bg-zinc-800/80 text-[11px] font-medium text-gray-700 dark:text-zinc-300 border border-black/[0.04] dark:border-white/[0.06] truncate">
                    {log.action}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-zinc-400 truncate">
                  <UserIcon size="1em" className="text-gray-400 dark:text-zinc-500 text-xs shrink-0" />
                  <span className="truncate">{actorName}</span>
                  <span className="text-gray-400 dark:text-zinc-600 font-normal">({actorRole})</span>
                </span>
              </div>

              {timestampText && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-zinc-400 font-sans tabular-nums shrink-0">
                  <Clock01Icon size="1em" className="text-gray-400 dark:text-zinc-500 text-xs shrink-0" />
                  {timestampText}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Security & Client Fingerprint */}
        <div className="flex flex-col rounded-2xl bg-white dark:bg-zinc-900/90 border border-black/[0.06] dark:border-white/[0.08] shadow-2xs overflow-hidden">
          {/* Card Header */}
          <div className="px-4 py-3 bg-gray-50/50 dark:bg-zinc-800/25 border-b border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0">
                <WifiFullSignalIcon size="1em" className="text-xs" />
              </div>
              <h5 className="text-xs font-semibold text-gray-800 dark:text-zinc-200 tracking-tight truncate">
                Security & Network
              </h5>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border border-black/[0.04] dark:border-white/[0.06] shrink-0">
              {isLoopback ? "Loopback" : "Direct Client"}
            </span>
          </div>

          {/* Card Body - Inset Grouped Rows */}
          <div className="p-4 flex flex-col justify-between flex-1">
            <div className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
              {/* Row 1: IP Address */}
              <div className="pb-3 flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  IP Address
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-sans tabular-nums text-xs font-semibold text-gray-900 dark:text-zinc-100">
                    {ipAddress}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyField(ipAddress, "IP Address", "ip")}
                    aria-label="Copy IP Address"
                    title="Copy IP Address"
                    className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                  >
                    {copiedKey === "ip" ? (
                      <Tick01Icon size="1em" className="text-xs text-gray-800 dark:text-zinc-200" />
                    ) : (
                      <Copy01Icon size="1em" className="text-xs" />
                    )}
                  </button>
                </div>
              </div>

              {/* Row 2: Client Environment */}
              <div className="py-3 flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Client Platform
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gray-100/80 dark:bg-zinc-800/80 text-[11.5px] font-medium text-gray-800 dark:text-zinc-200 border border-black/[0.04] dark:border-white/[0.06] truncate max-w-[170px]">
                    <ComputerIcon size="1em" className="text-gray-500 dark:text-zinc-400 text-xs shrink-0" />
                    <span className="truncate">{uaParsed.summary}</span>
                  </span>
                  {uaParsed.raw && (
                    <button
                      type="button"
                      onClick={() => handleCopyField(uaParsed.raw, "User Agent", "ua")}
                      aria-label="Copy raw User Agent"
                      title="Copy raw User Agent"
                      className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent shrink-0"
                    >
                      {copiedKey === "ua" ? (
                        <Tick01Icon size="1em" className="text-xs text-gray-800 dark:text-zinc-200" />
                      ) : (
                        <Copy01Icon size="1em" className="text-xs" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Row 3: Log Sequence ID */}
              <div className="pt-3 flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Sequence ID
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-sans tabular-nums text-xs font-semibold text-gray-900 dark:text-zinc-100">
                    #{log?.rawId ?? log?.id ?? "N/A"}
                  </span>
                  {(log?.rawId || log?.id) && (
                    <button
                      type="button"
                      onClick={() => handleCopyField(String(log.rawId ?? log.id), "Sequence ID", "seq_id")}
                      aria-label="Copy Sequence ID"
                      title="Copy Sequence ID"
                      className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                    >
                      {copiedKey === "seq_id" ? (
                        <Tick01Icon size="1em" className="text-xs text-gray-800 dark:text-zinc-200" />
                      ) : (
                        <Copy01Icon size="1em" className="text-xs" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Target Resource & Governance Scope */}
        <div className="flex flex-col rounded-2xl bg-white dark:bg-zinc-900/90 border border-black/[0.06] dark:border-white/[0.08] shadow-2xs overflow-hidden">
          {/* Card Header */}
          <div className="px-4 py-3 bg-gray-50/50 dark:bg-zinc-800/25 border-b border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <AlignBoxBottomCenterIcon size="1em" className="text-xs" />
              </div>
              <h5 className="text-xs font-semibold text-gray-800 dark:text-zinc-200 tracking-tight truncate">
                Resource & Scope
              </h5>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/50 dark:border-sky-800/40 shrink-0">
              {entityTypeText}
            </span>
          </div>

          {/* Card Body - Inset Grouped Rows */}
          <div className="p-4 flex flex-col justify-between flex-1 gap-3.5">
            <div className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
              {/* Row 1: Resource ID */}
              <div className="pb-3 flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Resource ID
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-sans tabular-nums text-xs font-semibold text-gray-900 dark:text-zinc-100">
                    {entityIdText}
                  </span>
                  {entityIdText !== "None" && (
                    <button
                      type="button"
                      onClick={() => handleCopyField(entityIdText, "Resource ID", "ref_id")}
                      aria-label="Copy Resource ID"
                      title="Copy Resource ID"
                      className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                    >
                      {copiedKey === "ref_id" ? (
                        <Tick01Icon size="1em" className="text-xs text-gray-800 dark:text-zinc-200" />
                      ) : (
                        <Copy01Icon size="1em" className="text-xs" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Row 2: Governance Scope */}
              <div className="pt-3 flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Scope
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100/80 dark:bg-zinc-800/80 text-[11.5px] font-medium text-gray-800 dark:text-zinc-200 border border-black/[0.04] dark:border-white/[0.06] truncate max-w-[190px]">
                  {scopeText}
                </span>
              </div>
            </div>

            {/* Apple HIG Quick Action: Copy Full Record JSON */}
            <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => handleCopyField(JSON.stringify(log, null, 2), "Record JSON", "json")}
                className="w-full h-8 px-3 text-xs font-semibold rounded-xl border border-gray-200 dark:border-zinc-700/70 bg-white dark:bg-zinc-800/60 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800 shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center justify-center"
              >
                {copiedKey === "json" ? "Record Data Copied!" : "Copy Record (JSON)"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
