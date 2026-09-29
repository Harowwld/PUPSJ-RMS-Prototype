"use client";

import React, { useState, useRef, useEffect } from "react";
import { Reorder } from "framer-motion";
import HugeIcon from "@/components/shared/HugeIcon";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "pupsj_student_compliance_kpi_order";
const DEFAULT_ORDER = ["rate", "submitted", "missing"];

export default function StudentComplianceKpiCards({ summary }) {
  const [selectedKpi, setSelectedKpi] = useState(null);
  const containerRef = useRef(null);

  const [kpiOrder, setKpiOrder] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (
            Array.isArray(parsed) &&
            parsed.length === 3 &&
            parsed.every((k) => DEFAULT_ORDER.includes(k))
          ) {
            return parsed;
          }
        }
      } catch {
        // Fallback to default order if localStorage is disabled
      }
    }
    return DEFAULT_ORDER;
  });

  const handleReorder = (newOrder) => {
    setKpiOrder(newOrder);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
    } catch {
      // Ignore storage errors
    }
  };

  // Close dropdown details when clicking outside
  useEffect(() => {
    if (!selectedKpi) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setSelectedKpi(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [selectedKpi]);

  const cardsData = {
    rate: {
      key: "rate",
      label: "Compliance Rate",
      badge: summary.overallStatus,
      badgeClass: summary.isCompliant
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
        : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
      value: `${summary.complianceRate}%`,
      sublabel: `(${summary.submittedCount || summary.approvedCount} of ${summary.totalRequired} submitted)`,
      sublabelClass: "text-gray-500 dark:text-zinc-400",
      iconClass: "ph-chart-pie-slice",
      iconBg: "bg-pup-maroon dark:bg-red-700",
      activeRing: "border-red-500/50 ring-1 ring-red-500/20",
    },
    submitted: {
      key: "submitted",
      label: "Submitted Documents",
      badge: "Archived",
      badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
      value: (summary.submittedCount || summary.approvedCount).toLocaleString(),
      sublabel: "Archived in records",
      sublabelClass: "text-emerald-600 dark:text-emerald-400",
      iconClass: "ph-file-check",
      iconBg: "bg-[#22c55e]",
      activeRing: "border-emerald-500/50 ring-1 ring-emerald-500/20",
    },
    missing: {
      key: "missing",
      label: "Not Submitted",
      badge: summary.missingCount === 0 ? "Complete" : "Pending",
      badgeClass: summary.missingCount === 0
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
        : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
      value: summary.missingCount.toLocaleString(),
      sublabel: summary.missingCount === 0 ? "All verified" : "Pending submission",
      sublabelClass: summary.missingCount === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400",
      iconClass: "ph-clock-countdown",
      iconBg: "bg-[#f59e0b]",
      activeRing: "border-amber-500/50 ring-1 ring-amber-500/20",
    },
  };

  return (
    <Reorder.Group
      as="div"
      axis="x"
      values={kpiOrder}
      onReorder={handleReorder}
      ref={containerRef}
      className="grid grid-cols-1 gap-4 md:grid-cols-3 items-stretch relative z-20 w-full"
    >
      {kpiOrder.map((key) => {
        const card = cardsData[key];
        if (!card) return null;
        const isSelected = selectedKpi === key;

        return (
          <Reorder.Item
            as="div"
            value={card.key}
            key={card.key}
            className={cn(
              "relative group rounded-xl w-full cursor-grab active:cursor-grabbing",
              isSelected ? "z-30" : "z-10"
            )}
          >
            {/* Main Interactive Card */}
            <div
              onClick={() => setSelectedKpi(isSelected ? null : card.key)}
              className={cn(
                "relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-none flex flex-col justify-between min-h-[110px] bg-gray-50/70 dark:bg-zinc-900/60 hover:bg-gray-100/70 dark:hover:bg-zinc-800/60",
                isSelected
                  ? card.activeRing
                  : "border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10"
              )}
            >
              {/* Card Header: Label, Pill Badge & Squircle Icon */}
              <div className="flex justify-between items-start p-4 pb-0">
                <div className="flex flex-col gap-1 min-w-0 pr-2">
                  <span className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 truncate capitalize">
                    {card.label}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold w-fit",
                      card.badgeClass
                    )}
                  >
                    {card.badge}
                  </span>
                </div>

                <div
                  className={cn(
                    "w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0",
                    card.iconBg
                  )}
                >
                  <HugeIcon className={cn("ph-bold text-[15px]", card.iconClass)} />
                </div>
              </div>

              {/* Card Footer: Big Stat, Sublabel & Reorder Grip Handle */}
              <div className="flex justify-between items-end p-4 pt-1">
                <div className="flex items-baseline gap-2 min-w-0 pr-2">
                  <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                    {card.value}
                  </span>
                  <span className={cn("text-xs font-medium mb-1 truncate", card.sublabelClass)}>
                    {card.sublabel}
                  </span>
                </div>

                <HugeIcon
                  className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-gray-400 dark:hover:text-zinc-500 text-gray-300 dark:text-zinc-700 text-lg mb-0.5 shrink-0"
                  title="Drag to rearrange"
                />
              </div>
            </div>

            {/* Expandable Details Dropdown Popover */}
            <div
              className={cn(
                "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                isSelected
                  ? "scale-y-100 opacity-100 translate-y-0"
                  : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-3">
                {card.key === "rate" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">
                        <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                          Required Total
                        </span>
                        <span className="text-lg font-black text-gray-900 dark:text-zinc-50">
                          {summary.totalRequired}
                        </span>
                      </div>
                      <div className="bg-red-50/60 dark:bg-red-950/30 p-2.5 rounded-lg border border-red-100 dark:border-red-900/30">
                        <span className="block text-[9px] font-bold text-pup-maroon dark:text-red-400 uppercase tracking-wider">
                          Completion Rate
                        </span>
                        <span className="text-lg font-black text-pup-maroon dark:text-red-400">
                          {summary.complianceRate}%
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                        <span>Fulfillment Progress</span>
                        <span>{summary.submittedCount || summary.approvedCount} / {summary.totalRequired}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-pup-maroon dark:bg-red-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, summary.complianceRate)}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                      Official records compliance standing. Maintain 100% submission rate to avoid semester registration holds.
                    </p>
                  </>
                )}

                {card.key === "submitted" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">
                        <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                          Archived Files
                        </span>
                        <span className="text-lg font-black text-gray-900 dark:text-zinc-50">
                          {summary.submittedCount || summary.approvedCount}
                        </span>
                      </div>
                      <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                        <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                          Vault Status
                        </span>
                        <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                          Verified
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                      All submitted documents are cataloged in physical storage cabinets and digitally indexed in repository vaults.
                    </p>
                  </>
                )}

                {card.key === "missing" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">
                        <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                          Missing Files
                        </span>
                        <span className="text-lg font-black text-gray-900 dark:text-zinc-50">
                          {summary.missingCount}
                        </span>
                      </div>
                      <div className={cn(
                        "p-2.5 rounded-lg border",
                        summary.missingCount === 0
                          ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/30"
                          : "bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/30"
                      )}>
                        <span className={cn(
                          "block text-[9px] font-bold uppercase tracking-wider",
                          summary.missingCount === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                        )}>
                          Action Required
                        </span>
                        <span className={cn(
                          "text-lg font-black",
                          summary.missingCount === 0 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
                        )}>
                          {summary.missingCount === 0 ? "None" : "Submit"}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                      {summary.missingCount === 0
                        ? "Congratulations! All mandatory document credentials have been verified by the Registrar."
                        : "Please bring original documents to the Registrar Office window during active office hours."}
                    </p>
                  </>
                )}
              </div>
            </div>
          </Reorder.Item>
        );
      })}
    </Reorder.Group>
  );
}
