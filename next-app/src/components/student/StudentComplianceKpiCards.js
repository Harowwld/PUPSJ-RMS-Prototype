"use client";

import React from "react";
import {
  CheckmarkCircle01Icon,
  Clock01Icon,
  PieChartIcon,
  Tick01Icon,
} from "hugeicons-react";
import { cn } from "@/lib/utils";
import { BADGE_BASE, BADGE_PALETTES } from "@/lib/badgeStyles";

export default function StudentComplianceKpiCards({ summary }) {
  const submittedCount = Number(summary?.submittedCount ?? summary?.approvedCount ?? 0);
  const totalRequired = Number(summary?.totalRequired ?? 0);
  const missingCount = Number(summary?.missingCount ?? 0);
  const complianceRate = Number(summary?.complianceRate ?? 0);

  return (
    <div className="p-3 sm:p-3.5 rounded-[22px] bg-[#f4f5f7] dark:bg-zinc-900/60 border border-black/[0.05] dark:border-white/[0.08]">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {/* Card 1: Compliance Rate */}
        <div className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between select-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-5 rounded-full bg-red-500/15 text-pup-maroon dark:text-red-400 flex items-center justify-center shrink-0">
                <PieChartIcon size="0.75em" />
              </div>
              <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 tracking-tight">
                Compliance Rate
              </span>
            </div>
            <span className={cn(BADGE_BASE, summary?.isCompliant ? BADGE_PALETTES.emerald : BADGE_PALETTES.amber)}>
              <PieChartIcon size={12} className="shrink-0" />
              <span>
                {summary?.overallStatus || (summary?.isCompliant ? "Compliant" : "Incomplete")}
              </span>
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 font-jakarta mt-2 tabular-nums">
            {complianceRate}%
          </div>
          <div className="text-[11.5px] text-gray-400 dark:text-zinc-500 mt-2 font-medium truncate">
            {submittedCount.toLocaleString()} of {totalRequired.toLocaleString()} requirements submitted
          </div>
        </div>

        {/* Card 2: Submitted Documents */}
        <div className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between select-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckmarkCircle01Icon size="0.75em" />
              </div>
              <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 tracking-tight">
                Submitted Documents
              </span>
            </div>
            <span className={cn(BADGE_BASE, BADGE_PALETTES.emerald)}>
              <Tick01Icon size={12} className="shrink-0 stroke-[2.5]" />
              <span>Archived</span>
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-jakarta mt-2 tabular-nums">
            {submittedCount.toLocaleString()}
          </div>
          <div className="text-[11.5px] text-gray-400 dark:text-zinc-500 mt-2 font-medium truncate">
            Archived in university records
          </div>
        </div>

        {/* Card 3: Not Submitted */}
        <div className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between select-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock01Icon size="0.75em" />
              </div>
              <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 tracking-tight">
                Not Submitted
              </span>
            </div>
            <span className={cn(BADGE_BASE, missingCount === 0 ? BADGE_PALETTES.emerald : BADGE_PALETTES.amber)}>
              <Clock01Icon size={12} className="shrink-0" />
              <span>
                {missingCount === 0 ? "Complete" : "Pending"}
              </span>
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-jakarta mt-2 tabular-nums">
            {missingCount.toLocaleString()}
          </div>
          <div className="text-[11.5px] text-gray-400 dark:text-zinc-500 mt-2 font-medium truncate">
            {missingCount === 0 ? "All requirements verified" : "Pending submission"}
          </div>
        </div>
      </div>
    </div>
  );
}
