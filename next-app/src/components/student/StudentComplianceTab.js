"use client";
import HugeIcon from "@/components/shared/HugeIcon";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import { formatPHDateTime } from "@/lib/timeFormat";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import StudentComplianceSkeleton from "./skeletons/StudentComplianceSkeleton";
import { Skeleton } from "@/components/ui/skeleton";



export default function StudentComplianceTab({ authUser }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState([]); // Array of strings: "missing", "submitted"
  const [categoryFilters, setCategoryFilters] = useState([]); // Array of category names e.g. ["Admission", "Identity"]
  const [viewMode, setViewMode] = useState("table"); // "table" | "cards"
  const [sortConfig, setSortConfig] = useState({ column: "priority", direction: "asc" }); // column: "priority" | "docType" | "category" | "status"

  // Modals
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Fetch compliance data
  const loadComplianceData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/student/compliance", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to load document compliance records.");
      }
      setData(json.data);
    } catch (err) {
      toast.error("Error Loading Compliance", {
        description: err.message || "Could not retrieve document checklist.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadComplianceData();
  }, [loadComplianceData]);

  // Category counts and list
  const availableCategories = useMemo(() => {
    if (!data?.requirements) return [];
    const set = new Set(data.requirements.map((r) => r.category).filter(Boolean));
    return Array.from(set);
  }, [data?.requirements]);

  const categoryCounts = useMemo(() => {
    if (!data?.requirements) return {};
    const counts = {};
    data.requirements.forEach((r) => {
      if (r.category) {
        counts[r.category] = (counts[r.category] || 0) + 1;
      }
    });
    return counts;
  }, [data?.requirements]);

  // Toggle filter helpers
  const toggleStatusFilter = (statusKey) => {
    setStatusFilters((prev) =>
      prev.includes(statusKey) ? prev.filter((s) => s !== statusKey) : [...prev, statusKey]
    );
  };

  const toggleCategoryFilter = (cat) => {
    setCategoryFilters((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const clearAllFilters = () => {
    setStatusFilters([]);
    setCategoryFilters([]);
    setSearchQuery("");
    setSortConfig({ column: "priority", direction: "asc" });
  };

  const activeFilterCount = statusFilters.length + categoryFilters.length;

  const activeFilterSummary = useMemo(() => {
    if (activeFilterCount === 0) return "Filter Requirements";
    if (statusFilters.length > 0 && categoryFilters.length === 0) {
      if (statusFilters.length === 2) return "Pending & Completed";
      return statusFilters[0] === "missing" ? "Pending Only" : "Completed Only";
    }
    if (categoryFilters.length > 0 && statusFilters.length === 0) {
      if (categoryFilters.length === 1) return categoryFilters[0];
      return `${categoryFilters.length} Categories`;
    }
    if (statusFilters.length === 1) {
      const statusLabel = statusFilters[0] === "missing" ? "Pending" : "Completed";
      return `${statusLabel} + ${categoryFilters.length} ${categoryFilters.length === 1 ? "Cat" : "Cats"}`;
    }
    return `Filters (${activeFilterCount})`;
  }, [activeFilterCount, statusFilters, categoryFilters]);

  // Filtered Requirements (Combined Criteria)
  const filteredRequirements = useMemo(() => {
    if (!data?.requirements) return [];
    const q = searchQuery.trim().toLowerCase();

    return data.requirements.filter((item) => {
      const matchesSearch =
        !q ||
        item.docType.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.document?.originalFilename && item.document.originalFilename.toLowerCase().includes(q));

      // Status criteria (if any checked, must match one of checked statuses)
      let matchesStatus = true;
      if (statusFilters.length > 0) {
        const itemKey = item.status === "Submitted" ? "submitted" : "missing";
        matchesStatus = statusFilters.includes(itemKey);
      }

      // Category criteria (if any checked, must match one of checked categories)
      let matchesCategory = true;
      if (categoryFilters.length > 0) {
        matchesCategory = categoryFilters.includes(item.category);
      }

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [data?.requirements, searchQuery, statusFilters, categoryFilters]);

  // Sorted Requirements
  const sortedRequirements = useMemo(() => {
    return [...filteredRequirements].sort((a, b) => {
      if (sortConfig.column === "docType") {
        const comp = a.docType.localeCompare(b.docType);
        return sortConfig.direction === "asc" ? comp : -comp;
      }
      if (sortConfig.column === "category") {
        const comp = a.category.localeCompare(b.category);
        return sortConfig.direction === "asc" ? comp : -comp;
      }
      if (sortConfig.column === "status") {
        const order = { "Not Submitted": 0, Submitted: 1 };
        const comp = (order[a.status] ?? 2) - (order[b.status] ?? 2);
        return sortConfig.direction === "asc" ? comp : -comp;
      }
      // Default: "priority" (Not Submitted first, then Submitted, then alphabetical by docType)
      const order = { "Not Submitted": 0, Submitted: 1 };
      const diff = (order[a.status] ?? 2) - (order[b.status] ?? 2);
      if (diff !== 0) {
        return sortConfig.direction === "asc" ? diff : -diff;
      }
      return a.docType.localeCompare(b.docType);
    });
  }, [filteredRequirements, sortConfig]);

  const handleSort = (column) => {
    setSortConfig((prev) => {
      if (prev.column !== column) {
        return { column, direction: "asc" };
      }
      if (prev.direction === "asc") {
        return { column, direction: "desc" };
      }
      return { column: "priority", direction: "asc" };
    });
  };

  if (loading && !data) {
    return <StudentComplianceSkeleton />;
  }

  const summary = data?.summary || {
    totalRequired: 0,
    submittedCount: 0,
    approvedCount: 0,
    missingCount: 0,
    complianceRate: 0,
    overallStatus: "Incomplete",
    isCompliant: false,
  };

  const student = data?.student || {
    studentNo: authUser?.student_no || "Unassigned",
    name: authUser?.name || "Student",
    courseCode: "BSIT",
    courseName: "Bachelor of Science in Information Technology",
    section: "1-1",
  };

  // Dedicated Print Handler (Uses isolated iframe to guarantee top-of-paper placement)
  const handlePrintSlip = () => {
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    printFrame.title = "Print Compliance Slip";
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow.document;
    const printDate = new Date().toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const escapeHtml = (str) =>
      String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const rowsHtml = sortedRequirements
      .map((r) => {
        const isSubmitted = r.status === "Submitted";

        return `
          <tr>
            <td style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; font-weight: 600; color: #111827;">${escapeHtml(r.docType)}</td>
            <td style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb; font-size: 10px; color: #6b7280; white-space: nowrap;">${escapeHtml(r.category)}</td>
            <td style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb; white-space: nowrap;">
              <span class="badge ${isSubmitted ? "badge-approved" : "badge-missing"}">
                ${isSubmitted ? "Submitted" : "Not Submitted"}
              </span>
            </td>
          </tr>
        `;
      })
      .join("");

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Student Document Compliance Slip - ${escapeHtml(student.studentNo)}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm 12mm 15mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #111827;
              background: #ffffff;
              font-size: 11px;
              line-height: 1.4;
              padding: 0;
              margin: 0;
            }
            .header {
              text-align: center;
              padding-bottom: 12px;
              border-bottom: 2px solid #800000;
              margin-bottom: 14px;
            }
            .header h1 {
              font-size: 13.5px;
              font-weight: 800;
              color: #800000;
              letter-spacing: 0.2px;
              margin-bottom: 2px;
            }
            .header h2 {
              font-size: 10px;
              font-weight: 700;
              color: #4b5563;
              letter-spacing: 0.6px;
              margin-bottom: 3px;
            }
            .header p {
              font-size: 9px;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              color: #6b7280;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 10px 12px;
              margin-bottom: 14px;
            }
            .meta-item {
              display: flex;
              flex-direction: column;
              gap: 2px;
            }
            .meta-label {
              font-size: 8.5px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #6b7280;
            }
            .meta-val {
              font-size: 11px;
              font-weight: 700;
              color: #111827;
              word-break: break-word;
            }
            .meta-val-maroon {
              font-size: 11px;
              font-weight: 700;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              color: #800000;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              overflow: hidden;
              margin-bottom: 12px;
            }
            th {
              background-color: #f3f4f6;
              color: #374151;
              font-size: 9.5px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              padding: 7px 10px;
              text-align: left;
              border-bottom: 1.5px solid #e5e7eb;
            }
            .footer-note {
              text-align: center;
              font-size: 9px;
              color: #9ca3af;
              font-style: italic;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>POLYTECHNIC UNIVERSITY OF THE PHILIPPINES</h1>
            <h2>SAN JUAN CAMPUS &nbsp;|&nbsp; OFFICE OF THE CAMPUS REGISTRAR</h2>
            <p>STUDENT REQUIREMENTS COMPLIANCE SUMMARY &bull; ${escapeHtml(printDate)}</p>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Student Name</span>
              <span class="meta-val">${escapeHtml(student.name || "—")}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Student Number</span>
              <span class="meta-val-maroon">${escapeHtml(student.studentNo || "—")}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Degree Program</span>
              <span class="meta-val">${escapeHtml(student.courseCode || "")} — ${escapeHtml(student.courseName || "")}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Compliance Status</span>
              <span class="meta-val">${summary.complianceRate}% (${summary.submittedCount || summary.approvedCount}/${summary.totalRequired} Submitted)</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Requirement</th>
                <th>Category</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer-note">
            Note: This is an official system-generated student compliance summary for institutional records verification.
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
      } catch (err) {
        console.error("Print execution failed:", err);
      } finally {
        setTimeout(() => {
          if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame);
          }
        }, 1500);
      }
    }, 250);
  };

  return (
    <div className="flex flex-col w-full flex-1 min-h-0 space-y-4">
      {/* 1. Main Unified Container Card */}
      <Card
        className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none isolate font-jakarta mb-4 min-h-0 flex-1 focus:outline-none"
        tabIndex={0}
      >
        {/* A. Header */}
        <PageHeader
          icon="ph-clipboard-check"
          title="Document Checklist & Compliance"
          description="Track your submitted credentials and monitor required documents for university records compliance."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex items-center gap-2.5 sm:gap-3">
              <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 dark:bg-zinc-800 dark:border-white/10 dark:text-zinc-300">
                <HugeIcon  className="ph-bold ph-eye text-[12px]"></HugeIcon>
                Viewer Only
              </span>
              {student.studentNo && (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-pup-maroon border border-red-100 dark:bg-red-950/30 dark:border-red-900/30">
                  <HugeIcon  className="ph-fill ph-student text-[13px]"></HugeIcon>
                  {student.studentNo}
                </span>
              )}

              <RefreshButton
                onRefresh={() => loadComplianceData(true)}
                isLoading={refreshing}
                title="Refresh Checklist"
              />

              <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />

              <Button
                type="button"
                onClick={() => setPrintModalOpen(true)}
                className="h-10 px-5 text-xs font-semibold rounded-xl btn-brand-red text-white! border-0 shadow-xs cursor-pointer active:scale-95 transition-all"
                style={{ color: "#ffffff" }}
              >
                Print
              </Button>
            </div>
          }
        />

        {/* B. KPI Stat Cards Row (Standard 3-Card Grid) */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-20">
            {/* Card 1: Overall Compliance Rate */}
            <div className="relative overflow-hidden rounded-xl border p-4 select-none transition-all border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-900/30 hover:border-gray-200 dark:hover:border-white/10">
              <div className="relative z-10">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                    Compliance Rate
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                      summary.isCompliant
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300"
                        : "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300"
                    )}
                  >
                    {summary.overallStatus}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-gray-900 dark:text-zinc-50 tracking-tight">
                    {summary.complianceRate}%
                  </span>
                  <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                    ({summary.submittedCount || summary.approvedCount} of {summary.totalRequired} submitted)
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Submitted Documents */}
            <div className="relative overflow-hidden rounded-xl border p-4 select-none transition-all border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-900/30 hover:border-gray-200 dark:hover:border-white/10">
              <div className="relative z-10">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                    Submitted Documents
                  </span>
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Archived
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-gray-900 dark:text-zinc-50 tracking-tight">
                    {summary.submittedCount || summary.approvedCount}
                  </span>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Archived in records
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Not Submitted */}
            <div className="relative overflow-hidden rounded-xl border p-4 select-none transition-all border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-900/30 hover:border-gray-200 dark:hover:border-white/10">
              <div className="relative z-10">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                    Not Submitted
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-medium uppercase tracking-wider",
                      summary.missingCount === 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {summary.missingCount === 0 ? "Complete" : "Pending"}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-gray-900 dark:text-zinc-50 tracking-tight">
                    {summary.missingCount}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      summary.missingCount === 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {summary.missingCount === 0
                      ? "All requirements submitted"
                      : "Pending submission"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* C. Toolbar & Section Header */}
        <div className="border-t border-gray-100 dark:border-white/10 p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
          {/* Left: Table Header & Total Count */}
          <div className="flex items-center gap-3 shrink-0">
            <div>
              <h3 className="text-[15px] font-semibold text-gray-900 dark:text-zinc-50">
                Document Requirements
              </h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
                Official checklist of required admission credentials and institutional records.
              </p>
            </div>
            {loading ? (
              <Skeleton className="h-6 w-16 rounded-full dark:bg-muted" />
            ) : (
              <span className="self-center rounded-full bg-gray-100 dark:bg-zinc-800 px-3 py-1 text-xs font-bold text-gray-600 dark:text-zinc-300">
                {data?.requirements?.length || 0} total
              </span>
            )}
          </div>

          {/* Right: Search & Filter Controls Group */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 lg:justify-end">
            {/* Search Input */}
            <div className="relative w-full sm:w-60 lg:w-64 group">
              <HugeIcon  className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-xs pointer-events-none" />
              <Input
                type="text"
                placeholder="Search requirements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 pr-16 w-full rounded-xl text-xs font-normal border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[11px] text-gray-400 dark:text-zinc-500">
                {loading ? (
                  <Skeleton className="h-3.5 w-10 rounded dark:bg-muted" />
                ) : (
                  `${filteredRequirements.length} results`
                )}
              </div>
            </div>

            {/* Multi-Criteria Checkbox Filter Dropdown */}
            <div className="w-full sm:w-auto">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    className={cn(
                      "h-9 px-3 text-xs rounded-xl border flex items-center justify-between gap-2 shadow-none cursor-pointer transition-all active:scale-95 w-full sm:w-auto min-w-[180px]",
                      activeFilterCount > 0
                        ? "border-pup-maroon/40 bg-pup-maroon/5 text-pup-maroon font-medium hover:bg-pup-maroon/10 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                        : "border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <HugeIcon
                        className={cn(
                          "ph-bold text-xs shrink-0",
                          activeFilterCount > 0 ? "ph-funnel-simple text-pup-maroon dark:text-red-400" : "ph-funnel text-gray-400 dark:text-zinc-500"
                        )}
                      />
                      <span className="truncate">
                        {activeFilterCount === 0
                          ? "Filter Requirements"
                          : activeFilterCount === 1
                          ? activeFilterSummary
                          : `Filters (${activeFilterCount})`}
                      </span>
                      {activeFilterCount > 0 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-pup-maroon px-1 text-[10px] font-bold text-white dark:bg-red-500">
                          {activeFilterCount}
                        </span>
                      )}
                    </div>
                    <HugeIcon className="ph-bold ph-caret-down text-[10px] text-gray-400 dark:text-zinc-500 shrink-0 ml-1" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  sideOffset={6}
                  className="w-72 sm:w-80 rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-zinc-900 overflow-hidden font-jakarta"
                >
                  {/* Popover Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10 bg-gray-50/60 dark:bg-zinc-800/40">
                    <div className="flex items-center gap-2">
                      <HugeIcon className="ph-bold ph-faders text-xs text-gray-500 dark:text-zinc-400" />
                      <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                        Combine Filter Criteria
                      </span>
                    </div>
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="text-[11px] font-semibold text-pup-maroon dark:text-red-400 hover:underline cursor-pointer"
                      >
                        Reset all
                      </button>
                    )}
                  </div>

                  {/* Quick Presets Bar */}
                  <div className="p-3 pb-0">
                    <div className="flex items-center gap-1 p-1 bg-gray-100/80 dark:bg-zinc-800/60 rounded-xl border border-gray-200/50 dark:border-white/5">
                      <button
                        type="button"
                        onClick={() => setStatusFilters([])}
                        className={cn(
                          "flex-1 py-1 px-2 text-[11px] font-medium rounded-lg transition-all cursor-pointer text-center",
                          statusFilters.length === 0
                            ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs font-semibold"
                            : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                        )}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilters(["missing"])}
                        className={cn(
                          "flex-1 py-1 px-2 text-[11px] font-medium rounded-lg transition-all cursor-pointer text-center",
                          statusFilters.length === 1 && statusFilters.includes("missing")
                            ? "bg-white dark:bg-zinc-700 text-amber-700 dark:text-amber-300 shadow-xs font-semibold"
                            : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                        )}
                      >
                        Pending ({summary.missingCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilters(["submitted"])}
                        className={cn(
                          "flex-1 py-1 px-2 text-[11px] font-medium rounded-lg transition-all cursor-pointer text-center",
                          statusFilters.length === 1 && statusFilters.includes("submitted")
                            ? "bg-white dark:bg-zinc-700 text-emerald-700 dark:text-emerald-300 shadow-xs font-semibold"
                            : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                        )}
                      >
                        Completed ({summary.submittedCount || summary.approvedCount})
                      </button>
                    </div>
                  </div>

                  {/* Filter Options List */}
                  <div className="max-h-72 overflow-y-auto p-3 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-800">
                    {/* Status Group */}
                    <div>
                      <div className="flex items-center justify-between px-1 mb-1.5">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                          Status Criteria
                        </span>
                        {statusFilters.length > 0 && (
                          <span className="text-[10px] font-semibold text-pup-maroon dark:text-red-400">
                            {statusFilters.length} selected
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {/* Option: Pending Submission */}
                        <div
                          onClick={() => toggleStatusFilter("missing")}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-100/70 dark:hover:bg-white/5 cursor-pointer select-none transition-colors group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                "w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all shrink-0",
                                statusFilters.includes("missing")
                                  ? "bg-pup-maroon border-pup-maroon text-white dark:bg-red-600 dark:border-red-600"
                                  : "border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 group-hover:border-gray-400"
                              )}
                            >
                              {statusFilters.includes("missing") && (
                                <HugeIcon className="ph-bold ph-check text-[10px]" />
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              <span className="text-xs font-medium text-gray-800 dark:text-zinc-200">
                                Pending Submission
                              </span>
                            </div>
                          </div>
                          <span className="text-[11px] font-semibold text-gray-400 dark:text-zinc-500 tabular-nums">
                            {summary.missingCount}
                          </span>
                        </div>

                        {/* Option: Completed */}
                        <div
                          onClick={() => toggleStatusFilter("submitted")}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-100/70 dark:hover:bg-white/5 cursor-pointer select-none transition-colors group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                "w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all shrink-0",
                                statusFilters.includes("submitted")
                                  ? "bg-pup-maroon border-pup-maroon text-white dark:bg-red-600 dark:border-red-600"
                                  : "border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 group-hover:border-gray-400"
                              )}
                            >
                              {statusFilters.includes("submitted") && (
                                <HugeIcon className="ph-bold ph-check text-[10px]" />
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span className="text-xs font-medium text-gray-800 dark:text-zinc-200">
                                Completed / Archived
                              </span>
                            </div>
                          </div>
                          <span className="text-[11px] font-semibold text-gray-400 dark:text-zinc-500 tabular-nums">
                            {summary.submittedCount || summary.approvedCount}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Category Group */}
                    {availableCategories.length > 0 && (
                      <div className="pt-2 border-t border-gray-100 dark:border-white/5">
                        <div className="flex items-center justify-between px-1 mb-1.5">
                          <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                            Categories
                          </span>
                          {categoryFilters.length > 0 && (
                            <span className="text-[10px] font-semibold text-pup-maroon dark:text-red-400">
                              {categoryFilters.length} selected
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          {availableCategories.map((cat) => {
                            const isChecked = categoryFilters.includes(cat);
                            const count = categoryCounts[cat] || 0;
                            return (
                              <div
                                key={cat}
                                onClick={() => toggleCategoryFilter(cat)}
                                className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-100/70 dark:hover:bg-white/5 cursor-pointer select-none transition-colors group"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={cn(
                                      "w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all shrink-0",
                                      isChecked
                                        ? "bg-pup-maroon border-pup-maroon text-white dark:bg-red-600 dark:border-red-600"
                                        : "border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 group-hover:border-gray-400"
                                    )}
                                  >
                                    {isChecked && (
                                      <HugeIcon className="ph-bold ph-check text-[10px]" />
                                    )}
                                  </div>
                                  <span className="text-xs font-medium text-gray-800 dark:text-zinc-200 truncate">
                                    {cat}
                                  </span>
                                </div>
                                <span className="text-[11px] font-semibold text-gray-400 dark:text-zinc-500 tabular-nums shrink-0 ml-2">
                                  {count}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Popover Footer */}
                  <div className="px-4 py-2.5 border-t border-gray-100 dark:border-white/10 bg-gray-50/60 dark:bg-zinc-800/40 flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-zinc-400 text-[11px]">
                      Matching: <strong className="text-gray-900 dark:text-zinc-100">{filteredRequirements.length}</strong> of {data?.requirements?.length || 0}
                    </span>
                    {activeFilterCount > 0 && (
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        Combined active
                      </span>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-gray-200/60 dark:border-white/5 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title="Table View"
                className={cn(
                  "p-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  viewMode === "table"
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                )}
              >
                <HugeIcon  className="ph-bold ph-table text-sm block" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                title="Card View"
                className={cn(
                  "p-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  viewMode === "cards"
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                )}
              >
                <HugeIcon  className="ph-bold ph-squares-four text-sm block" />
              </button>
            </div>
          </div>
        </div>

        {/* D. Active Filter Chips Bar */}
        {(statusFilters.length > 0 || categoryFilters.length > 0 || sortConfig.column !== "priority" || searchQuery) && (
          <div className="flex-none border-t border-gray-100 bg-white px-6 py-2.5 animate-in fade-in slide-in-from-top-1 duration-normal dark:border-white/10 dark:bg-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500">
                Active filters:
              </span>
              {statusFilters.map((s) => (
                <div
                  key={s}
                  className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50"
                >
                  Status: {s === "missing" ? "PENDING" : "COMPLETED"}
                  <button
                    type="button"
                    onClick={() => toggleStatusFilter(s)}
                    className="hover:text-red-500 cursor-pointer"
                  >
                    <HugeIcon  className="ph-bold ph-x text-[10px]" />
                  </button>
                </div>
              ))}
              {categoryFilters.map((cat) => (
                <div
                  key={cat}
                  className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50"
                >
                  Category: {cat}
                  <button
                    type="button"
                    onClick={() => toggleCategoryFilter(cat)}
                    className="hover:text-red-500 cursor-pointer"
                  >
                    <HugeIcon  className="ph-bold ph-x text-[10px]" />
                  </button>
                </div>
              ))}
              {sortConfig.column !== "priority" && (
                <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                  Sort: {sortConfig.column === "docType" ? "Requirement" : sortConfig.column === "category" ? "Category" : "Status"} ({sortConfig.direction === "asc" ? "Asc" : "Desc"})
                  <button
                    type="button"
                    onClick={() => setSortConfig({ column: "priority", direction: "asc" })}
                    className="hover:text-red-500 cursor-pointer"
                    title="Reset to priority sort"
                  >
                    <HugeIcon  className="ph-bold ph-x text-[10px]" />
                  </button>
                </div>
              )}
              {searchQuery && (
                <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                  Query: &ldquo;{searchQuery}&rdquo;
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="hover:text-red-500 cursor-pointer"
                  >
                    <HugeIcon  className="ph-bold ph-x text-[10px]" />
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-[11px] font-semibold text-pup-maroon dark:text-red-400 hover:underline cursor-pointer ml-1"
              >
                Clear all
              </button>
            </div>
          </div>
        )}

        {/* E. Requirements Content (Cards or Table) */}
        <div className="p-6 pt-2">
          {sortedRequirements.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
              <Empty>
                <EmptyMedia>
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-500 mx-auto">
                    <HugeIcon  className="ph-duotone ph-files text-3xl" />
                  </div>
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle className="text-base font-bold text-gray-900 dark:text-zinc-100 mt-2">
                    No Matching Requirements Found
                  </EmptyTitle>
                  <EmptyDescription className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
                    {searchQuery || statusFilters.length > 0 || categoryFilters.length > 0
                      ? "Try adjusting your search query or clearing some of the combined filters."
                      : "There are currently no document requirements assigned for your degree program."}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : viewMode === "table" ? (
            /* Table View */
            <div className="w-full overflow-x-auto border border-gray-100 dark:border-white/10 rounded-xl overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-card">
                  <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500 select-none">
                    <th
                      className="p-4 min-w-[260px] cursor-pointer hover:text-gray-900 dark:hover:text-zinc-200 transition-colors"
                      onClick={() => handleSort("docType")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Requirement</span>
                        {sortConfig.column === "docType" ? (
                          <HugeIcon
                            className={cn(
                              "text-xs text-pup-maroon dark:text-red-400 ph-bold",
                              sortConfig.direction === "asc" ? "ph-caret-up" : "ph-caret-down"
                            )}
                          />
                        ) : (
                          <HugeIcon className="ph-bold ph-caret-up-down text-[10px] text-gray-300 dark:text-zinc-600 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th
                      className="p-4 min-w-[160px] cursor-pointer hover:text-gray-900 dark:hover:text-zinc-200 transition-colors"
                      onClick={() => handleSort("category")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Category</span>
                        {sortConfig.column === "category" ? (
                          <HugeIcon
                            className={cn(
                              "text-xs text-pup-maroon dark:text-red-400 ph-bold",
                              sortConfig.direction === "asc" ? "ph-caret-up" : "ph-caret-down"
                            )}
                          />
                        ) : (
                          <HugeIcon className="ph-bold ph-caret-up-down text-[10px] text-gray-300 dark:text-zinc-600 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th
                      className="p-4 min-w-[140px] cursor-pointer hover:text-gray-900 dark:hover:text-zinc-200 transition-colors"
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Status</span>
                        {sortConfig.column === "status" ? (
                          <HugeIcon
                            className={cn(
                              "text-xs text-pup-maroon dark:text-red-400 ph-bold",
                              sortConfig.direction === "asc" ? "ph-caret-up" : "ph-caret-down"
                            )}
                          />
                        ) : (
                          <HugeIcon className="ph-bold ph-caret-up-down text-[10px] text-gray-300 dark:text-zinc-600 opacity-60" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {sortedRequirements.map((item) => {
                    const isSubmitted = item.status === "Submitted";

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50/60 dark:hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="p-4">
                          <div className="font-semibold text-gray-900 dark:text-zinc-100 text-xs">
                            {item.docType}
                          </div>
                          <div className="text-[11px] text-gray-400 dark:text-zinc-500 max-w-sm truncate mt-0.5">
                            {item.description}
                          </div>
                        </td>
                        <td className="p-4 text-xs font-medium text-gray-500 dark:text-zinc-400 whitespace-nowrap">
                          {item.category}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          {isSubmitted ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300">
                              <HugeIcon  className="ph-bold ph-check text-xs" /> Completed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300">
                              <HugeIcon  className="ph-bold ph-clock text-xs" /> Pending Submission
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Cards View */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500 px-1 select-none">
                <span className="text-xs text-gray-500 dark:text-zinc-400">
                  Showing <strong className="text-gray-900 dark:text-zinc-200">{sortedRequirements.length}</strong> requirements
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-gray-400 dark:text-zinc-500">Sort:</span>
                  <button
                    type="button"
                    onClick={() => handleSort("docType")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors border",
                      sortConfig.column === "docType"
                        ? "bg-pup-maroon/10 text-pup-maroon border-pup-maroon/30 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30 font-semibold"
                        : "bg-gray-50 dark:bg-zinc-800/80 border-gray-200 dark:border-white/5 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    Name {sortConfig.column === "docType" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSort("status")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors border",
                      sortConfig.column === "status"
                        ? "bg-pup-maroon/10 text-pup-maroon border-pup-maroon/30 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30 font-semibold"
                        : "bg-gray-50 dark:bg-zinc-800/80 border-gray-200 dark:border-white/5 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    Status {sortConfig.column === "status" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedRequirements.map((item) => {
                const isSubmitted = item.status === "Submitted";

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-2xl border p-5 flex flex-col justify-between transition-all duration-200",
                      isSubmitted
                        ? "border-emerald-200/60 bg-emerald-50/20 hover:border-emerald-300 dark:border-emerald-900/30 dark:bg-emerald-950/10"
                        : "border-amber-200/80 bg-white hover:border-amber-300 dark:border-amber-900/30 dark:bg-zinc-900/40"
                    )}
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs",
                              isSubmitted
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                            )}
                          >
                            <HugeIcon 
                              className={cn(
                                "text-xl",
                                isSubmitted ? "ph-bold ph-seal-check" : "ph-bold ph-warning"
                              )}
                            />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 block">
                              {item.category}
                            </span>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 tracking-tight leading-snug mt-0.5">
                              {item.docType}
                            </h3>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold shrink-0",
                            isSubmitted
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300"
                              : "bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300"
                          )}
                        >
                          <HugeIcon  className={cn("text-xs ph-bold", isSubmitted ? "ph-check" : "ph-clock")} />
                          {isSubmitted ? "Completed" : "Pending Submission"}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="mt-3 text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    {/* Bottom Status Bar */}
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-2">
                      <div className="text-[11px]">
                        {isSubmitted ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                            <HugeIcon  className="ph-bold ph-check-circle" /> Archived in university records
                          </span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                            <HugeIcon  className="ph-bold ph-clock" /> Pending face-to-face submission
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 2. Official Compliance Slip Print Modal */}
      <Dialog open={printModalOpen} onOpenChange={setPrintModalOpen}>
        <DialogContent className="w-full max-w-4xl sm:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-white dark:bg-card border border-gray-200 dark:border-white/10 shadow-2xl font-jakarta print:border-0 print:shadow-none print:max-h-none print:overflow-visible print:w-full print:max-w-none print:bg-white">
          <DialogHeader className="p-6 pb-4 border-b border-gray-100 dark:border-white/10 shrink-0 print:hidden">
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-zinc-50">
              Student Document Compliance Slip
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 dark:text-zinc-400">
              Official institutional summary generated from PUPSJ Records Keeping System.
            </DialogDescription>
          </DialogHeader>

          {/* Printable Content Area with Scroll Containment */}
          <div
            className="p-8 py-6 space-y-6 text-xs text-gray-800 dark:text-zinc-200 flex-1 overflow-y-auto print:overflow-visible print:p-0 print:m-0 print:space-y-4"
            id="compliance-printable-slip"
          >
            {/* Institution Header */}
            <div className="text-center pb-5 border-b border-gray-200 dark:border-white/10 space-y-1 print:pb-4">
              <h2 className="font-bold text-base text-pup-maroon tracking-tight">
                POLYTECHNIC UNIVERSITY OF THE PHILIPPINES
              </h2>
              <h3 className="font-semibold text-xs text-gray-600 dark:text-zinc-400 tracking-wider">
                SAN JUAN CAMPUS  |  OFFICE OF THE CAMPUS REGISTRAR
              </h3>
              <p className="text-[11px] text-gray-400 font-mono pt-0.5">
                STUDENT REQUIREMENTS COMPLIANCE SUMMARY • {new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>

            {/* Student Meta Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-2xl bg-gray-50/80 dark:bg-zinc-900/50 border border-gray-200/80 dark:border-white/10 print:bg-gray-50 print:border-gray-200">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-400 block">Student Name</span>
                <span className="text-xs font-bold text-gray-900 dark:text-zinc-100 block truncate" title={student.name}>{student.name}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-400 block">Student Number</span>
                <span className="font-mono text-xs font-bold text-pup-maroon dark:text-red-400 block">{student.studentNo}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-400 block">Degree Program</span>
                <span className="text-xs text-gray-700 dark:text-zinc-300 block truncate" title={`${student.courseCode} — ${student.courseName}`}>{student.courseCode} — {student.courseName}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-400 block">Compliance Status</span>
                <span className="text-xs font-bold text-gray-900 dark:text-zinc-100 block">
                  {summary.complianceRate}% ({summary.submittedCount || summary.approvedCount}/{summary.totalRequired} Submitted)
                </span>
              </div>
            </div>

            {/* Requirements Checklist Table */}
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-xs print:border-gray-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100/80 dark:bg-zinc-800/70 font-bold text-[11px] uppercase tracking-wider text-gray-600 dark:text-zinc-400 border-b border-gray-200 dark:border-white/10 print:bg-gray-100">
                  <tr>
                    <th className="py-3 px-4">Requirement</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5 print:divide-gray-200">
                  {sortedRequirements.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors print:border-b print:border-gray-100">
                      <td className="py-3 px-4 font-semibold text-gray-900 dark:text-zinc-100 leading-normal">{r.docType}</td>
                      <td className="py-3 px-4 text-gray-500 dark:text-zinc-400 text-xs whitespace-nowrap">{r.category}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center",
                            r.status === "Submitted"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300 print:bg-transparent print:border-emerald-700 print:text-emerald-900"
                              : "bg-amber-100 text-amber-800 border border-amber-300 print:bg-transparent print:border-amber-700 print:text-amber-900"
                          )}
                        >
                          {r.status === "Submitted" ? "Submitted" : "Not Submitted"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-xs text-gray-400 dark:text-zinc-400 text-center italic pt-2">
              Note: This is an official system-generated student compliance summary for institutional records verification.
            </div>
          </div>

          <DialogFooter className="p-5 px-8 border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-3 shrink-0 bg-white dark:bg-card print:hidden">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPrintModalOpen(false)}
              className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handlePrintSlip}
              className="h-10 px-5 text-xs font-semibold rounded-xl btn-brand-red text-white! border-0 cursor-pointer active:scale-95 shadow-xs transition-all"
              style={{ color: "#ffffff" }}
            >
              Print
            </Button>
          </DialogFooter>

          {/* Scoped Print Media Styles for Native / Ctrl+P Printing */}
          <style jsx global>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 12mm 15mm 12mm 15mm;
              }
              html,
              body {
                height: auto !important;
                min-height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
                background: #ffffff !important;
                color: #111827 !important;
              }
              body > *:not([data-slot="dialog-portal"]) {
                display: none !important;
              }
              [data-slot="dialog-overlay"],
              [data-slot="dialog-portal"] > div:first-child {
                display: none !important;
              }
              [data-slot="dialog-portal"] > div {
                position: static !important;
                display: block !important;
                padding: 0 !important;
                margin: 0 !important;
                height: auto !important;
              }
              [data-slot="dialog-content"] {
                position: static !important;
                display: block !important;
                width: 100% !important;
                max-width: none !important;
                max-height: none !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow: visible !important;
              }
              #compliance-printable-slip {
                position: static !important;
                display: block !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
              }
            }
          `}</style>
        </DialogContent>
      </Dialog>
    </div>
  );
}
