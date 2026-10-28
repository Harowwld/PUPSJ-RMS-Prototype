"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import HugeIcon from "@/components/shared/HugeIcon";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import ConfirmModal from "@/components/shared/ConfirmModal";
import ServiceStandardsSkeleton from "./skeletons/ServiceStandardsSkeleton";
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

export default function ServiceStandardsTab({ showToast }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  const loadStandards = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/system/sla-settings", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok && json.data) {
        setStandards(json.data);
        setOriginalStandards(json.data);
      } else {
        showToast?.({ title: "Failed to load standards", description: json?.error || "Could not retrieve processing time settings." }, true);
      }
    } catch {
      showToast?.({ title: "Network Error", description: "Could not connect to service standards API." }, true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    const timer = setTimeout(() => loadStandards(), 0);
    return () => clearTimeout(timer);
  }, [loadStandards]);

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
      } else {
        showToast?.({ title: "Failed", description: json?.error || "Could not reset standards." }, true);
      }
    } catch {
      showToast?.({ title: "Error", description: "Failed to reset service standards." }, true);
    } finally {
      setSaving(false);
    }
  };

  // Stepper helper
  const adjustDays = (key, delta, min = 1, max = 120) => {
    setStandards((prev) => {
      const current = Number(prev[key]) || min;
      const next = Math.max(min, Math.min(max, current + delta));
      return { ...prev, [key]: next, frameworkType: "CUSTOM" };
    });
  };

  // Live simulation deadlines
  const sampleNow = new Date();
  const simpleDeadline = calculateDeadline(sampleNow, standards.simpleDays, standards.workingDaysOnly);
  const complexDeadline = calculateDeadline(sampleNow, standards.complexDays, standards.workingDaysOnly);
  const technicalDeadline = calculateDeadline(sampleNow, standards.highlyTechnicalDays, standards.workingDaysOnly);

  const unitSuffix = standards.workingDaysOnly ? "working days" : "calendar days";

  if (loading) {
    return <ServiceStandardsSkeleton />;
  }

  return (
    <div className="animate-fade-up font-jakarta flex flex-[1_0_auto] flex-col w-full gap-6 select-none">
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        <PageHeader
          icon="ph-clock-countdown"
          title="Processing Time Standards"
          description="Configure turnaround time standards and compliance rules for document processing."
          showBorder={true}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            <div className="flex items-center gap-2">
              <RefreshButton
                onRefresh={() => loadStandards(true)}
                isLoading={refreshing}
                title="Refresh Standards"
              />

              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmResetOpen(true)}
                disabled={saving}
                className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Restore Defaults
              </Button>

              <Button
                type="button"
                onClick={() => setConfirmSaveOpen(true)}
                disabled={!isModified || saving}
                className="h-10 px-5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {saving ? "Saving Changes..." : "Save Standards"}
              </Button>
            </div>
          }
        />

        <CardContent className="p-6 flex flex-[1_0_auto] flex-col gap-6">
          {/* Preset Segmented Control */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
              Turnaround Framework Presets
            </span>
            <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-border/60 overflow-x-auto">
              {PRESETS.map((p) => {
                const isSelected = activePreset?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className={cn(
                      "flex-1 min-w-[130px] px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap text-center select-none active:scale-[0.98]",
                      isSelected
                        ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-50 shadow-xs ring-1 ring-black/5 dark:ring-white/10"
                        : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                    )}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>

            {/* Active Preset Context Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gray-50/70 dark:bg-zinc-900/40 border border-border/70 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="h-6 w-6 rounded-lg bg-pup-maroon/10 text-pup-maroon dark:bg-white/10 dark:text-zinc-100 flex items-center justify-center text-xs shrink-0 mt-0.5">
                  <HugeIcon className="ph-bold ph-info text-xs" />
                </div>
                <span className="text-gray-600 dark:text-zinc-400 text-xs leading-relaxed">
                  {activePreset?.description}
                </span>
              </div>
              <span className="text-xs font-mono font-semibold text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 px-3 py-1 rounded-lg border border-border/70 shrink-0 self-start sm:self-auto shadow-2xs">
                {standards.simpleDays}d · {standards.complexDays}d · {standards.highlyTechnicalDays}d
              </span>
            </div>
          </div>

          {/* Two-Column Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            {/* Left Column: Form & Steppers (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                Turnaround Rules & Tier Limits
              </span>

              {/* Framework Title */}
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
                  placeholder="Citizen's Charter (ARTA RA 11032) or University processing-time standard"
                  className="h-10 text-xs rounded-xl border-border dark:border-border focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon"
                />
                <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                  Displayed on official reports, document queue headers, and client request receipts.
                </span>
              </div>

              {/* Working Days Toggle Row */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border dark:border-border bg-white dark:bg-card">
                <div className="flex flex-col gap-0.5 max-w-[80%]">
                  <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                    Business Days (Monday – Friday) Only
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 leading-normal">
                    Excludes Saturdays and Sundays from deadline calculations. Disable to count consecutive calendar days.
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

              {/* Tier Stepper Rows */}
              <div className="rounded-xl border border-border/80 dark:border-border bg-white dark:bg-card divide-y divide-border/60 overflow-hidden shadow-2xs">
                {/* Simple */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                        Simple Transaction
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/50">
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
                <div className="flex items-center justify-between p-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                        Complex Transaction
                      </span>
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/50">
                        Vault Search
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                      Transcript of Records (TOR), Course Descriptions, Clearance
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
                <div className="flex items-center justify-between p-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-purple-500" />
                      <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                        Technical Transaction
                      </span>
                      <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full border border-purple-200/50">
                        Multi-Agency
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                      Diplomas, CAV, Red Ribbon, Archival Reconstruction
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

            {/* Right Column: Live Simulator (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                Fulfillment Schedule Simulation
              </span>

              <div className="rounded-2xl border border-border dark:border-border bg-gray-50/50 dark:bg-zinc-900/20 p-5 flex flex-col gap-4 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-border dark:border-border">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                      Live Delivery Simulator
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">
                    Filed {formatCharterDeadline(sampleNow)}
                  </span>
                </div>

                {/* Milestone 1: Simple */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-card border border-border/80 dark:border-border shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center text-sm shrink-0 border border-emerald-100 dark:border-emerald-900/30">
                      <HugeIcon className="ph-duotone ph-file-text text-base" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                          Simple Tier
                        </span>
                        <span className="text-[10px] font-mono font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.2 rounded-full border border-emerald-200/50">
                          {standards.simpleDays} {unitSuffix}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                        Estimated Completion
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 font-mono text-right">
                    {formatCharterDeadline(simpleDeadline)}
                  </span>
                </div>

                {/* Milestone 2: Complex */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-card border border-border/80 dark:border-border shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center text-sm shrink-0 border border-amber-100 dark:border-amber-900/30">
                      <HugeIcon className="ph-duotone ph-archive text-base" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                          Complex Tier
                        </span>
                        <span className="text-[10px] font-mono font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.2 rounded-full border border-amber-200/50">
                          {standards.complexDays} {unitSuffix}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                        Estimated Completion
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 font-mono text-right">
                    {formatCharterDeadline(complexDeadline)}
                  </span>
                </div>

                {/* Milestone 3: Technical */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-card border border-border/80 dark:border-border shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 flex items-center justify-center text-sm shrink-0 border border-purple-100 dark:border-purple-900/30">
                      <HugeIcon className="ph-duotone ph-certificate text-base" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                          Technical Tier
                        </span>
                        <span className="text-[10px] font-mono font-medium text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 px-1.5 py-0.2 rounded-full border border-purple-200/50">
                          {standards.highlyTechnicalDays} {unitSuffix}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                        Estimated Completion
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 font-mono text-right">
                    {formatCharterDeadline(technicalDeadline)}
                  </span>
                </div>

                {/* Active Rule Summary Card */}
                <div className="p-4 rounded-xl bg-slate-900 text-white dark:bg-zinc-800/90 border border-slate-800 dark:border-zinc-700/60 shadow-xs flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HugeIcon className="ph-bold ph-shield-check text-sm text-emerald-400" />
                      <span className="font-semibold text-xs text-white">
                        {standards.frameworkName}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-300 dark:text-zinc-400 font-medium px-2 py-0.5 rounded-full bg-white/10 dark:bg-white/5 border border-white/10">
                      {standards.workingDaysOnly ? "Working Days" : "Calendar Days"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-300 dark:text-zinc-400 pt-1 border-t border-white/10">
                    <span>Simple: <strong className="text-white font-mono">{standards.simpleDays}d</strong></span>
                    <span>·</span>
                    <span>Complex: <strong className="text-white font-mono">{standards.complexDays}d</strong></span>
                    <span>·</span>
                    <span>Technical: <strong className="text-white font-mono">{standards.highlyTechnicalDays}d</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modals - Action Verb + Specific Noun */}
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
    </div>
  );
}
