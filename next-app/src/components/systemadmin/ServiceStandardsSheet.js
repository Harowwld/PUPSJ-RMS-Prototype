"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import HugeIcon from "@/components/shared/HugeIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import ConfirmModal from "@/components/shared/ConfirmModal";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { calculateDeadline, formatCharterDeadline } from "@/lib/citizenCharter";

const PRESETS = [
  {
    id: "ARTA",
    name: "ARTA (3-7-20)",
    fullName: "Philippine ARTA Standard (3-7-20)",
    frameworkName: "Citizen's Charter (ARTA RA 11032)",
    simpleDays: 3,
    complexDays: 7,
    highlyTechnicalDays: 20,
    workingDaysOnly: true,
    description: "Statutory 3-7-20 working day turnaround mandated by Republic Act No. 11032 for Philippine government agencies and SUCs.",
    badge: "Official ARTA",
  },
  {
    id: "FAST_TRACK",
    name: "Fast-Track (1-3-5)",
    fullName: "Fast-Track Digital Processing Time (1-3-5)",
    frameworkName: "Fast-Track Digital Processing Time",
    simpleDays: 1,
    complexDays: 3,
    highlyTechnicalDays: 5,
    workingDaysOnly: true,
    description: "Shorter processing times for digital records and organized archives.",
    badge: "Fast-Track",
  },
  {
    id: "STANDARD_UNIV",
    name: "Standard University (2-5-10)",
    fullName: "Standard University Processing Time (2-5-10)",
    frameworkName: "University Academic Records Processing Time",
    simpleDays: 2,
    complexDays: 5,
    highlyTechnicalDays: 10,
    workingDaysOnly: true,
    description: "Operational standard widely used by private colleges and autonomous universities.",
    badge: "University",
  },
  {
    id: "CUSTOM",
    name: "Custom Standards",
    fullName: "Custom Institutional Standards",
    frameworkName: "Institutional Service Standards",
    simpleDays: 3,
    complexDays: 7,
    highlyTechnicalDays: 15,
    workingDaysOnly: true,
    description: "Custom day thresholds and calendar policies tailored to institutional requirements.",
    badge: "Custom",
  },
];

/**
 * Authentic Apple-style stepper control with tactile feedback and bounds enforcement
 */
function DayStepper({ value, min = 1, max = 120, onAdjust, label }) {
  const current = Number(value) || min;
  const canDecrease = current > min;
  const canIncrease = current < max;

  return (
    <div className="flex items-center gap-1.5 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-border/80 dark:border-border shrink-0 ml-4 select-none">
      <button
        type="button"
        disabled={!canDecrease}
        onClick={() => onAdjust(-1)}
        aria-label={`Decrease ${label} turnaround days`}
        className={cn(
          "w-7 h-7 flex items-center justify-center rounded-lg bg-white dark:bg-zinc-700 text-gray-700 dark:text-zinc-200 shadow-2xs transition-all",
          canDecrease
            ? "hover:bg-gray-50 dark:hover:bg-zinc-600 cursor-pointer active:scale-90"
            : "opacity-40 cursor-not-allowed pointer-events-none"
        )}
      >
        <HugeIcon className="ph-bold ph-minus text-xs" />
      </button>
      <span className="min-w-[40px] text-center font-bold text-xs text-gray-900 dark:text-zinc-50 font-mono">
        {current}d
      </span>
      <button
        type="button"
        disabled={!canIncrease}
        onClick={() => onAdjust(1)}
        aria-label={`Increase ${label} turnaround days`}
        className={cn(
          "w-7 h-7 flex items-center justify-center rounded-lg bg-white dark:bg-zinc-700 text-gray-700 dark:text-zinc-200 shadow-2xs transition-all",
          canIncrease
            ? "hover:bg-gray-50 dark:hover:bg-zinc-600 cursor-pointer active:scale-90"
            : "opacity-40 cursor-not-allowed pointer-events-none"
        )}
      >
        <HugeIcon className="ph-bold ph-plus text-xs" />
      </button>
    </div>
  );
}

export default function ServiceStandardsSheet({
  open,
  onOpenChange,
  showToast,
  onStandardsUpdated,
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [standards, setStandards] = useState({
    frameworkName: "Citizen's Charter (ARTA RA 11032)",
    frameworkType: "ARTA",
    simpleDays: 3,
    complexDays: 7,
    highlyTechnicalDays: 20,
    workingDaysOnly: true,
  });

  const [originalStandards, setOriginalStandards] = useState(null);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const loadStandards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/system/sla-settings", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok && json.data) {
        setStandards(json.data);
        setOriginalStandards(json.data);
      } else {
        showToast?.({
          title: "Failed to load standards",
          description: json?.error || "Could not retrieve processing time settings.",
        }, true);
      }
    } catch {
      showToast?.({
        title: "Network Error",
        description: "Could not connect to service standards API.",
      }, true);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => loadStandards(), 0);
      return () => clearTimeout(timer);
    }
  }, [open, loadStandards]);

  const handleApplyPreset = (preset) => {
    setStandards((prev) => ({
      ...prev,
      frameworkName: preset.frameworkName,
      frameworkType: preset.id,
      simpleDays: preset.simpleDays,
      complexDays: preset.complexDays,
      highlyTechnicalDays: preset.highlyTechnicalDays,
      workingDaysOnly: preset.workingDaysOnly,
    }));
  };

  const isModified = useMemo(() => {
    if (!originalStandards) return false;
    return (
      standards.frameworkName !== originalStandards.frameworkName ||
      standards.frameworkType !== originalStandards.frameworkType ||
      Number(standards.simpleDays) !== Number(originalStandards.simpleDays) ||
      Number(standards.complexDays) !== Number(originalStandards.complexDays) ||
      Number(standards.highlyTechnicalDays) !== Number(originalStandards.highlyTechnicalDays) ||
      standards.workingDaysOnly !== originalStandards.workingDaysOnly
    );
  }, [standards, originalStandards]);

  const activePreset = useMemo(() => {
    return (
      PRESETS.find(
        (p) =>
          p.id !== "CUSTOM" &&
          Number(standards.simpleDays) === p.simpleDays &&
          Number(standards.complexDays) === p.complexDays &&
          Number(standards.highlyTechnicalDays) === p.highlyTechnicalDays &&
          standards.workingDaysOnly === p.workingDaysOnly
      ) || PRESETS.find((p) => p.id === "CUSTOM")
    );
  }, [standards]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/system/sla-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(standards),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        setOriginalStandards(json.data);
        setStandards(json.data);
        setConfirmSaveOpen(false);
        showToast?.({
          title: "Standards Saved",
          description: `Updated to ${json.data.frameworkName} (${json.data.simpleDays}-${json.data.complexDays}-${json.data.highlyTechnicalDays} ${json.data.workingDaysOnly ? "working" : "calendar"} days).`,
        });
        onStandardsUpdated?.(json.data);
        onOpenChange?.(false);
      } else {
        showToast?.({ title: "Failed", description: json?.error || "Could not save standards." }, true);
      }
    } catch {
      showToast?.({ title: "Error", description: "Failed to save service standards." }, true);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/system/sla-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        setOriginalStandards(json.data);
        setStandards(json.data);
        setConfirmResetOpen(false);
        showToast?.({
          title: "Defaults Restored",
          description: "Service turnaround standards reset to ARTA RA 11032 statutory defaults (3-7-20).",
        });
        onStandardsUpdated?.(json.data);
        onOpenChange?.(false);
      } else {
        showToast?.({ title: "Failed", description: json?.error || "Could not reset standards." }, true);
      }
    } catch {
      showToast?.({ title: "Error", description: "Failed to reset service standards." }, true);
    } finally {
      setSaving(false);
    }
  };

  const adjustDays = (key, delta, min = 1, max = 120) => {
    setStandards((prev) => {
      const current = Number(prev[key]) || min;
      const next = Math.max(min, Math.min(max, current + delta));
      return { ...prev, [key]: next, frameworkType: "CUSTOM" };
    });
  };

  const sampleNow = new Date();
  const simpleDeadline = calculateDeadline(sampleNow, standards.simpleDays, standards.workingDaysOnly);
  const complexDeadline = calculateDeadline(sampleNow, standards.complexDays, standards.workingDaysOnly);
  const technicalDeadline = calculateDeadline(sampleNow, standards.highlyTechnicalDays, standards.workingDaysOnly);
  const unitSuffix = standards.workingDaysOnly ? "working days" : "calendar days";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          size="default"
          showCloseButton={false}
          className="w-full sm:max-w-lg md:max-w-xl flex flex-col h-full bg-white dark:bg-card border-l border-border dark:border-border p-0 shadow-2xl overflow-hidden"
        >
          {/* Header strictly typographic per COMPONENT_STANDARDS.md */}
          <SheetHeader className="shrink-0 p-0 border-b border-border dark:border-border bg-white dark:bg-card">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <SheetTitle className="text-base font-bold text-gray-900 dark:text-zinc-50 tracking-tight">
                  Turnaround Standards
                </SheetTitle>
                <SheetDescription className="text-xs text-gray-500 dark:text-zinc-400 font-normal mt-0.5">
                  Configure turnaround presets, SLA thresholds, and calendar rules for document processing.
                </SheetDescription>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange?.(false)}
                className="w-8 h-8 rounded-xl bg-gray-100/90 hover:bg-gray-200/90 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/5 dark:border-white/10 shadow-2xs"
                aria-label="Close"
                title="Close"
              >
                <HugeIcon className="ph-bold ph-x text-sm" />
              </button>
            </div>
          </SheetHeader>

          {/* Line-Attached Edge-to-Edge Policy Notice */}
          <div className="flex items-center gap-2.5 px-6 py-2.5 text-xs border-b transition-colors shrink-0 border-blue-200/90 bg-blue-50/90 text-blue-950 dark:border-blue-900/40 dark:bg-blue-950/25 dark:text-blue-200">
            <HugeIcon className="ph-bold ph-hourglass-high text-blue-600 dark:text-blue-400 text-[15px] shrink-0" />
            <span className="font-medium text-[11.5px] sm:text-xs leading-normal">
              <strong className="font-semibold">Turnaround Policy:</strong>{" "}
              SLA thresholds enforce automated compliance scoring and queue prioritization across campus partitions.
            </span>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 select-none">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-44 w-full rounded-xl" />
                <Skeleton className="h-40 w-full rounded-xl" />
              </div>
            ) : (
              <>
                {/* Standard Summary Strip (Unboxed) */}
                <div className="flex items-center justify-between gap-3 pb-4 border-b border-border/80 dark:border-border">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="size-11 rounded-2xl flex items-center justify-center text-xl shrink-0 font-bold border shadow-2xs bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 border-red-200/60 dark:border-red-900/40">
                      <HugeIcon className="ph-bold ph-timer" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-gray-900 dark:text-zinc-100 truncate block">
                        {standards.frameworkName || "Institutional Service Standards"}
                      </span>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate mt-0.5">
                        {standards.workingDaysOnly ? "Business Days (Mon–Fri)" : "Consecutive Calendar Days"} • {standards.simpleDays}-{standards.complexDays}-{standards.highlyTechnicalDays} Day SLA
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200/80 dark:border-zinc-700/60 shadow-2xs">
                      {activePreset?.badge || "Custom"}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border shadow-2xs",
                        isModified
                          ? "bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40"
                          : "bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40"
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isModified ? "bg-amber-500" : "bg-emerald-500")} />
                      {isModified ? "Unsaved Changes" : "Active Standard"}
                    </span>
                  </div>
                </div>

                {/* 1. Presets Segmented Selector */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-border/80 dark:border-border">
                    <HugeIcon className="ph-bold ph-squares-four text-pup-maroon dark:text-red-400 text-sm" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                      Turnaround Framework Presets
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESETS.map((p) => {
                      const isSelected = activePreset?.id === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleApplyPreset(p)}
                          className={cn(
                            "flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer select-none active:scale-[0.98]",
                            isSelected
                              ? "border-pup-maroon/80 dark:border-red-500/80 bg-red-50/20 dark:bg-red-950/20 ring-1 ring-pup-maroon/20 dark:ring-red-500/20"
                              : "border-border/80 hover:border-gray-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/50"
                          )}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={cn(
                              "text-xs font-semibold",
                              isSelected ? "text-pup-maroon dark:text-red-400" : "text-gray-900 dark:text-zinc-100"
                            )}>
                              {p.name}
                            </span>
                            <span className="text-[10px] font-mono font-medium text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">
                              {p.simpleDays}-{p.complexDays}-{p.highlyTechnicalDays}d
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                            {p.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Policy & Calendar Configuration */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-border/80 dark:border-border">
                    <HugeIcon className="ph-bold ph-sliders text-pup-maroon dark:text-red-400 text-sm" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                      Policy & Calendar Configuration
                    </h3>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                      Name of Standard
                    </label>
                    <Input
                      value={standards.frameworkName}
                      onChange={(e) =>
                        setStandards((prev) => ({
                          ...prev,
                          frameworkName: e.target.value,
                          frameworkType: "CUSTOM",
                        }))
                      }
                      placeholder="e.g. Citizen's Charter (ARTA RA 11032)"
                      className="h-10 text-xs rounded-xl border-border dark:border-border focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon"
                    />
                    <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                      Displayed on official reports, document queue headers, and client receipts.
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-border dark:border-border bg-white dark:bg-card">
                    <div className="flex flex-col gap-0.5 max-w-[80%]">
                      <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                        Business Days (Monday – Friday) Only
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-zinc-400 leading-normal">
                        Excludes weekends from deadline calculations. Disable to count consecutive calendar days.
                      </span>
                    </div>
                    <Switch
                      checked={standards.workingDaysOnly}
                      onCheckedChange={(checked) =>
                        setStandards((prev) => ({
                          ...prev,
                          workingDaysOnly: checked,
                          frameworkType: "CUSTOM",
                        }))
                      }
                    />
                  </div>
                </div>

                {/* 3. Tier Steppers */}
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-border/80 dark:border-border">
                    <HugeIcon className="ph-bold ph-clock-countdown text-pup-maroon dark:text-red-400 text-sm" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                      Turnaround Rules & Tier Thresholds
                    </h3>
                  </div>
                  <div className="rounded-xl border border-border/80 dark:border-border bg-white dark:bg-card divide-y divide-border/60 overflow-hidden shadow-2xs">
                    {/* Simple */}
                    <div className="flex items-center justify-between p-3.5">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                            Simple Transaction
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.2 rounded-full border border-emerald-200/50">
                            Clerical
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                          Certificates, Good Moral, Enrollment Verification
                        </span>
                      </div>

                      <DayStepper
                        value={standards.simpleDays}
                        min={1}
                        max={standards.complexDays}
                        onAdjust={(delta) => adjustDays("simpleDays", delta, 1, standards.complexDays)}
                        label="Simple"
                      />
                    </div>

                    {/* Complex */}
                    <div className="flex items-center justify-between p-3.5">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                            Complex Transaction
                          </span>
                          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.2 rounded-full border border-amber-200/50">
                            Vault Search
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                          Transcript of Records (TOR), Course Descriptions
                        </span>
                      </div>

                      <DayStepper
                        value={standards.complexDays}
                        min={standards.simpleDays}
                        max={standards.highlyTechnicalDays}
                        onAdjust={(delta) => adjustDays("complexDays", delta, standards.simpleDays, standards.highlyTechnicalDays)}
                        label="Complex"
                      />
                    </div>

                    {/* Highly Technical */}
                    <div className="flex items-center justify-between p-3.5">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-purple-500" />
                          <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                            Technical Transaction
                          </span>
                          <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.2 rounded-full border border-purple-200/50">
                            Multi-Agency
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                          Diplomas, CAV, Archival Reconstruction
                        </span>
                      </div>

                      <DayStepper
                        value={standards.highlyTechnicalDays}
                        min={standards.complexDays}
                        max={180}
                        onAdjust={(delta) => adjustDays("highlyTechnicalDays", delta, standards.complexDays, 180)}
                        label="Technical"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Live Simulator */}
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-border/80 dark:border-border">
                    <HugeIcon className="ph-bold ph-calendar-check text-pup-maroon dark:text-red-400 text-sm" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                      Fulfillment Schedule Simulation
                    </h3>
                  </div>

                  <div className="rounded-xl border border-border dark:border-border bg-gray-50/50 dark:bg-zinc-900/20 p-4 flex flex-col gap-3 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 border-b border-border/80 dark:border-border">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                          Projected Deadlines
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">
                        If filed {formatCharterDeadline(sampleNow)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-card border border-border/70 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span className="font-medium text-gray-900 dark:text-zinc-100">Simple Tier</span>
                          <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                            ({standards.simpleDays} {unitSuffix})
                          </span>
                        </div>
                        <span className="font-mono font-semibold text-gray-900 dark:text-zinc-100">
                          {formatCharterDeadline(simpleDeadline)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-card border border-border/70 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          <span className="font-medium text-gray-900 dark:text-zinc-100">Complex Tier</span>
                          <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400">
                            ({standards.complexDays} {unitSuffix})
                          </span>
                        </div>
                        <span className="font-mono font-semibold text-gray-900 dark:text-zinc-100">
                          {formatCharterDeadline(complexDeadline)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-card border border-border/70 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                          <span className="font-medium text-gray-900 dark:text-zinc-100">Technical Tier</span>
                          <span className="text-[10px] font-mono text-purple-700 dark:text-purple-400">
                            ({standards.highlyTechnicalDays} {unitSuffix})
                          </span>
                        </div>
                        <span className="font-mono font-semibold text-gray-900 dark:text-zinc-100">
                          {formatCharterDeadline(technicalDeadline)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sticky Sheet Footer */}
          <SheetFooter className="shrink-0 p-4 px-6 border-t border-border dark:border-border bg-gray-50/70 dark:bg-zinc-900/40 flex flex-row items-center justify-between shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmResetOpen(true)}
              disabled={saving || loading}
              className="h-10 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Restore Defaults
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange?.(false)}
                disabled={saving}
                className="h-10 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => setConfirmSaveOpen(true)}
                disabled={!isModified || saving || loading}
                className="h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white! shadow-xs cursor-pointer active:scale-95 disabled:opacity-50 transition-all border-0"
              >
                {saving ? "Saving..." : "Save Standards"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Confirmation Modals strictly compliant with COMPONENT_STANDARDS.md */}
      <ConfirmModal
        open={confirmSaveOpen}
        onCancel={() => setConfirmSaveOpen(false)}
        isAppleStyled={true}
        title="Apply Service Standards"
        message={`Save "${standards.frameworkName}" (${standards.simpleDays}-${standards.complexDays}-${standards.highlyTechnicalDays} ${standards.workingDaysOnly ? "working" : "calendar"} days) as the active institutional turnaround standard for student document processing?`}
        confirmLabel="Save Standards"
        cancelLabel="Cancel"
        variant="brand"
        isLoading={saving}
        onConfirm={handleSave}
      />

      <ConfirmModal
        open={confirmResetOpen}
        onCancel={() => setConfirmResetOpen(false)}
        isAppleStyled={true}
        isRestoreModal={true}
        title="Restore Default Standards"
        message="Are you sure you want to restore the turnaround limits to Philippine Republic Act No. 11032 (ARTA) statutory defaults (3-7-20 working days)? Any custom rules will be replaced."
        confirmLabel="Restore Defaults"
        cancelLabel="Cancel"
        variant="warning"
        buttonIcon="ph-bold ph-arrow-counter-clockwise"
        isLoading={saving}
        onConfirm={handleReset}
      />
    </>
  );
}
