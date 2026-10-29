"use client";
import HugeIcon from "@/components/shared/HugeIcon";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import MultiCriteriaFilter from "@/components/shared/MultiCriteriaFilter";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import { formatPHDateTime } from "@/lib/timeFormat";
import { generateExportFilename } from "@/lib/exportHelpers";
import { toast } from "sonner";
import { formatErrorMessage } from "@/lib/errorUtils";
import { cn } from "@/lib/utils";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
  EmptyContent,
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
import StudentComplianceKpiCards from "./StudentComplianceKpiCards";
import { Skeleton } from "@/components/ui/skeleton";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import PermanentAdmissionRecordSheet from "./PermanentAdmissionRecordSheet";
import {
  getInstitutionalBranding,
  DEFAULT_BRANDING_LOGO,
  OFFICIAL_FALLBACK_LOGO,
  generateStudentComplianceSlipPdf,
} from "@/lib/pdfGenerator";
import useTableScroll from "@/hooks/useTableScroll";
import TableScrollControls from "@/components/shared/TableScrollControls";



// Icon categorization helper for document requirements
function getRequirementCategoryIcon(category, isSubmitted) {
  const cat = String(category || "").toLowerCase();
  if (cat.includes("admission") || cat.includes("identity") || cat.includes("birth")) {
    return "ph-identification-card";
  }
  if (cat.includes("academic") || cat.includes("record") || cat.includes("137") || cat.includes("grade")) {
    return "ph-graduation-cap";
  }
  if (cat.includes("graduation") || cat.includes("exit") || cat.includes("diploma") || cat.includes("transcript")) {
    return "ph-certificate";
  }
  if (cat.includes("certificate") || cat.includes("clearance") || cat.includes("moral")) {
    return "ph-shield-check";
  }
  return isSubmitted ? "ph-file-check" : "ph-file-arrow-up";
}

export default function StudentComplianceTab({ authUser }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState([]); // Array of strings: "missing", "submitted"
  const [categoryFilters, setCategoryFilters] = useState([]); // Array of category names e.g. ["Admission", "Identity"]
  const [viewMode, setViewMode] = useState("table"); // "table" | "cards"
  const [sortConfig, setSortConfig] = useState({ column: "priority", direction: "asc" }); // column: "priority" | "docType" | "category" | "status"
  const [selectedRequirement, setSelectedRequirement] = useState(null);

  // Modals & Print Branding
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [branding, setBranding] = useState({
    institutionName: "Polytechnic University of the Philippines",
    campusName: "San Juan City Campus",
    tagline: "OFFICE OF THE CAMPUS REGISTRAR",
    brandColor: "#800000",
    logoUrl: DEFAULT_BRANDING_LOGO,
    fallbackLogoUrl: OFFICIAL_FALLBACK_LOGO,
    logoBase64: null,
  });

  // Fetch compliance data
  const loadComplianceData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    }

    try {
      const [res, brandData] = await Promise.all([
        fetch("/api/student/compliance", { cache: "no-store" }),
        getInstitutionalBranding().catch(() => null),
      ]);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to load document compliance records.");
      }
      setData(json.data);
      if (brandData) {
        setBranding((prev) => ({
          ...prev,
          ...brandData,
          tagline: brandData.tagline || prev.tagline,
          brandColor: brandData.brandColor || prev.brandColor,
        }));
      }
    } catch (err) {
      const normalized = formatErrorMessage(err, {
        title: "Checklist Unavailable",
        description: "Could not retrieve your graduation requirements checklist. Pull to refresh or try again shortly.",
      });
      toast.error(normalized.title, {
        description: normalized.description,
        action: normalized.action,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadComplianceData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadComplianceData]);

  const requirements = data?.requirements;

  const rawSummary = data?.summary || {};
  const safeSubmittedCount = Number(rawSummary.submittedCount ?? rawSummary.approvedCount ?? 0);
  const safeTotalRequired = Number(rawSummary.totalRequired ?? (Array.isArray(requirements) ? requirements.length : 0));
  const safeMissingCount = Number(rawSummary.missingCount ?? Math.max(0, safeTotalRequired - safeSubmittedCount));
  const safeComplianceRate = Number(
    rawSummary.complianceRate ??
      (safeTotalRequired > 0 ? Math.round((safeSubmittedCount / safeTotalRequired) * 100) : 0)
  );

  const summary = useMemo(() => ({
    totalRequired: safeTotalRequired,
    submittedCount: safeSubmittedCount,
    approvedCount: Number(rawSummary.approvedCount ?? safeSubmittedCount),
    missingCount: safeMissingCount,
    complianceRate: safeComplianceRate,
    overallStatus: rawSummary.overallStatus || (safeComplianceRate === 100 ? "Complete" : "Incomplete"),
    isCompliant: rawSummary.isCompliant ?? (safeComplianceRate === 100),
  }), [safeTotalRequired, safeSubmittedCount, rawSummary.approvedCount, safeMissingCount, safeComplianceRate, rawSummary.overallStatus, rawSummary.isCompliant]);

  // Category counts and list
  const availableCategories = useMemo(() => {
    if (!requirements) return [];
    const set = new Set(requirements.map((r) => r.category).filter(Boolean));
    return Array.from(set);
  }, [requirements]);

  const categoryCounts = useMemo(() => {
    if (!requirements) return {};
    const counts = {};
    requirements.forEach((r) => {
      if (r.category) {
        counts[r.category] = (counts[r.category] || 0) + 1;
      }
    });
    return counts;
  }, [requirements]);

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

  const complianceFilterGroups = useMemo(() => {
    const groups = [
      {
        id: "status",
        label: "Status Criteria",
        options: [
          {
            value: "missing",
            label: "Pending Submission",
            count: summary.missingCount,
            dotColor: "bg-amber-500",
          },
          {
            value: "submitted",
            label: "Completed / Archived",
            count: summary.submittedCount || summary.approvedCount,
            dotColor: "bg-emerald-500",
          },
        ],
      },
    ];
    if (availableCategories.length > 0) {
      groups.push({
        id: "category",
        label: "Categories",
        options: availableCategories.map((cat) => ({
          value: cat,
          label: cat,
          count: categoryCounts[cat] || 0,
        })),
      });
    }
    return groups;
  }, [availableCategories, summary, categoryCounts]);

  // Filtered Requirements (Combined Criteria)
  const filteredRequirements = useMemo(() => {
    if (!requirements) return [];
    const q = searchQuery.trim().toLowerCase();

    return requirements.filter((item) => {
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
  }, [requirements, searchQuery, statusFilters, categoryFilters]);

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

  const {
    tableContainerRef,
    canScrollLeft,
    canScrollRight,
    isScrolledX,
    scrollTable,
    resetScroll,
  } = useTableScroll([sortedRequirements?.length]);

  useEffect(() => {
    resetScroll();
  }, [searchQuery, statusFilters, categoryFilters, viewMode, resetScroll]);

  if (loading && !data) {
    return <StudentComplianceSkeleton />;
  }

  const student = data?.student || {
    studentNo: authUser?.student_no || "Unassigned",
    name: authUser?.name || "Student",
    courseCode: "BSIT",
    courseName: "Bachelor of Science in Information Technology",
    section: "1-1",
  };

  // Download PDF Handler (Direct Vector PDF Download)
  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const blob = await generateStudentComplianceSlipPdf(
        student,
        sortedRequirements,
        summary,
        { branding }
      );
      const safeStudentNo = student.studentNo
        ? String(student.studentNo).replace(/[^0-9A-Za-z-]/g, "")
        : "SUMMARY";
      const fileName = generateExportFilename("STUDENT-COMPLIANCE", safeStudentNo, "pdf");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Checklist PDF Downloaded", {
        description: `Saved as ${fileName}`,
      });
    } catch (err) {
      console.error("PDF download failed:", err);
      const normalized = formatErrorMessage(err, {
        title: "Download Interrupted",
        description: "Unable to generate the checklist PDF preview. Please try printing the slip directly instead.",
      });
      toast.error(normalized.title, {
        description: normalized.description,
        action: normalized.action,
      });
    } finally {
      setDownloadingPdf(false);
    }
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

    const safeStudentNo = student.studentNo
      ? String(student.studentNo).replace(/[^0-9A-Za-z-]/g, "")
      : "SUMMARY";
    const printDocTitle = generateExportFilename("STUDENT-COMPLIANCE", safeStudentNo, "pdf").replace(/\.pdf$/, "");
    const docId = `RKS-CMP-${student.studentNo ? String(student.studentNo).replace(/[^0-9A-Za-z]/g, "") : "STD"}-${new Date().getFullYear()}`;
    const campusTitle = branding.campusName
      ? `${branding.institutionName} · ${branding.campusName}`
      : branding.institutionName;
    const brandColor = branding.brandColor || "#800000";
    const logoSrc = branding.logoBase64 || branding.logoUrl || DEFAULT_BRANDING_LOGO;
    const fallbackLogoSrc = branding.fallbackLogoUrl || OFFICIAL_FALLBACK_LOGO;

    const rowsHtml = sortedRequirements
      .map((r, idx) => {
        const isSubmitted = r.status === "Submitted";

        return `
          <tr>
            <td style="padding: 7px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; color: #6b7280; text-align: center; width: 34px;">${idx + 1}</td>
            <td style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; font-weight: 600; color: #111827;">${escapeHtml(r?.docType || r?.name || "N/A")}</td>
            <td style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb; font-size: 10px; color: #6b7280; white-space: nowrap;">${escapeHtml(r?.category || "N/A")}</td>
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
          <title>${escapeHtml(printDocTitle)}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 14mm 16mm 14mm 16mm;
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
            .report-header {
              text-align: center;
              margin-bottom: 10px;
            }
            .logo-wrap {
              display: flex;
              justify-content: center;
              margin-bottom: 8px;
            }
            .logo-wrap img {
              width: 52px;
              height: 52px;
              object-fit: contain;
            }
            .institution-title {
              font-size: 14.5px;
              font-weight: 800;
              color: ${brandColor};
              letter-spacing: -0.01em;
              line-height: 1.25;
            }
            .office-subtitle {
              font-size: 8.5px;
              font-weight: 700;
              color: #6b7280;
              letter-spacing: 2px;
              text-transform: uppercase;
              margin-top: 3px;
            }
            .report-title {
              font-size: 13.5px;
              font-weight: 800;
              color: #111827;
              letter-spacing: -0.01em;
              margin-top: 9px;
              margin-bottom: 2px;
            }
            .doc-id {
              font-size: 8.5px;
              font-style: italic;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              color: #6b7280;
              margin-bottom: 10px;
            }
            .master-divider {
              width: 100%;
              height: 2px;
              background-color: ${brandColor};
              margin-bottom: 14px;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 10px 14px;
              margin-bottom: 14px;
            }
            .meta-item {
              display: flex;
              flex-direction: column;
              gap: 2px;
            }
            .meta-label {
              font-size: 8px;
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
              color: ${brandColor};
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
              font-size: 9px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              padding: 8px 10px;
              text-align: left;
              border-bottom: 1.5px solid #e5e7eb;
            }
            .badge-approved {
              display: inline-block;
              padding: 2px 7px;
              border-radius: 9999px;
              font-size: 9.5px;
              font-weight: 700;
              color: #065f46;
              background: #ecfdf5;
              border: 1px solid #a7f3d0;
            }
            .badge-missing {
              display: inline-block;
              padding: 2px 7px;
              border-radius: 9999px;
              font-size: 9.5px;
              font-weight: 700;
              color: #92400e;
              background: #fffbeb;
              border: 1px solid #fde68a;
            }
            .footer-note {
              text-align: center;
              font-size: 8.5px;
              color: #9ca3af;
              font-style: italic;
              margin-top: 18px;
              border-top: 1px dashed #e5e7eb;
              padding-top: 10px;
              page-break-inside: avoid;
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <div class="logo-wrap">
              <img src="${escapeHtml(logoSrc)}" onerror="this.src='${escapeHtml(fallbackLogoSrc)}'" alt="PUP Logo" />
            </div>
            <h1 class="institution-title">${escapeHtml(campusTitle)}</h1>
            <p class="office-subtitle">${escapeHtml(branding.tagline || "OFFICE OF THE CAMPUS REGISTRAR")}</p>
            <h2 class="report-title">STUDENT REQUIREMENTS COMPLIANCE SUMMARY</h2>
            <p class="doc-id">Document ID: ${escapeHtml(docId)} &bull; Issued on ${escapeHtml(printDate)}</p>
            <div class="master-divider"></div>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Student Name</span>
              <span class="meta-val">${escapeHtml(student.name || "N/A")}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Student Number</span>
              <span class="meta-val-maroon">${escapeHtml(student.studentNo || "N/A")}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Compliance Status</span>
              <span class="meta-val">${summary.complianceRate}% (${summary.submittedCount}/${summary.totalRequired} Submitted)</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 34px; text-align: center;">#</th>
                <th>Requirement / Credential</th>
                <th>Category</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer-note">
            Note: This is an official system-generated student compliance summary from the PUPSJ Records Keeping System for institutional verification. Alteration or unauthorized reproduction is strictly prohibited.
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
    <div className="flex flex-col w-full flex-[1_0_auto]">
      {/* 1. Main Unified Container Card */}
      <Card
        className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta focus:outline-none"
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
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            <div className="flex items-center gap-2">
              <span className="hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-border dark:bg-zinc-800 dark:border-border dark:text-zinc-300">
                Viewer Only
              </span>
              {student.studentNo && (
                <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-pup-maroon border border-red-100 dark:bg-red-950/30 dark:border-red-900/30">
                  {student.studentNo}
                </span>
              )}

              <RefreshButton
                onRefresh={() => loadComplianceData(true)}
                isLoading={refreshing}
                title="Refresh Checklist"
              />

              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf || loading}
                className="h-10 px-5 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50"
              >
                {downloadingPdf ? (
                  <span className="flex items-center gap-1.5">
                    <HugeIcon className="ph-bold ph-spinner animate-spin text-sm"></HugeIcon>
                    Downloading...
                  </span>
                ) : (
                  "Download PDF Slip"
                )}
              </Button>

              <Button
                type="button"
                onClick={() => setPrintModalOpen(true)}
                className="h-10 px-5 text-xs font-semibold rounded-xl btn-brand-red text-white! border-0 shadow-xs cursor-pointer active:scale-95 transition-all"
                style={{ color: "#ffffff" }}
              >
                Print Slip
              </Button>
            </div>
          }
        />

        {/* B. KPI Stat Cards Row (Standard 3-Card Reorderable Grid) */}
        <div className="px-6 pb-6">
          <StudentComplianceKpiCards summary={summary} />
        </div>

        {/* C. Toolbar & Section Header */}
        <div className="border-t border-border dark:border-border p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
          {/* Left: Table Header & Total Count */}
          <div className="flex items-center gap-3 shrink-0">
            <div>
              <h3 className="text-[15px] font-semibold text-gray-900 dark:text-zinc-50">
                Document Requirements
              </h3>
              <p className="mt-0.5 text-xs text-gray-900 dark:text-zinc-300">
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
              <HugeIcon className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-xs pointer-events-none" />
              <Input
                type="text"
                placeholder="Search requirements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 pr-16 w-full rounded-xl text-xs font-normal border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[11px] text-gray-400 dark:text-zinc-500">
                {loading ? (
                  <Skeleton className="h-3.5 w-10 rounded dark:bg-muted" />
                ) : (
                  filteredRequirements.length
                )}
              </div>
            </div>

            {/* Multi-Criteria Checkbox Filter Dropdown */}
            <MultiCriteriaFilter
              title="Filter Requirements"
              groups={complianceFilterGroups}
              selectedValues={{
                status: statusFilters,
                category: categoryFilters,
              }}
              onChange={(groupId, updatedList) => {
                if (groupId === "status") setStatusFilters(updatedList);
                if (groupId === "category") setCategoryFilters(updatedList);
              }}
              onClearAll={() => {
                setStatusFilters([]);
                setCategoryFilters([]);
              }}
            />

            {/* Standardized Arrange Requirements Dropdown matching Records Archive */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 transition-all shrink-0"
                  title="Arrange Requirements"
                >
                  <span>
                    {sortConfig.column === "priority" && "Sort: Default"}
                    {sortConfig.column === "docType" && sortConfig.direction === "asc" && "Sort: Name (A-Z)"}
                    {sortConfig.column === "docType" && sortConfig.direction === "desc" && "Sort: Name (Z-A)"}
                    {sortConfig.column === "status" && sortConfig.direction === "asc" && "Sort: Completed First"}
                    {sortConfig.column === "status" && sortConfig.direction === "desc" && "Sort: Pending First"}
                    {sortConfig.column === "category" && sortConfig.direction === "asc" && "Sort: Category (A-Z)"}
                    {sortConfig.column === "category" && sortConfig.direction === "desc" && "Sort: Category (Z-A)"}
                  </span>
                  <HugeIcon className="ph-bold ph-caret-down text-[10px] text-gray-400 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={6}
                className="w-60 rounded-2xl border-[0.5px] border-border dark:border-white/10 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 select-none font-jakarta"
              >
                {/* Zone 1: Header */}
                <div className="px-4 py-2.5 border-b-[0.5px] border-border dark:border-white/10 bg-gray-50/60 dark:bg-zinc-800/40 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                    Arrange Requirements
                  </span>
                  {sortConfig.column !== "priority" && (
                    <button
                      type="button"
                      onClick={() => setSortConfig({ column: "priority", direction: "asc" })}
                      className="text-[11px] font-semibold text-pup-maroon dark:text-red-400 hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Zone 2: Body */}
                <div className="p-1.5 space-y-0.5">
                  <DropdownMenuItem
                    onClick={() => setSortConfig({ column: "docType", direction: "asc" })}
                    className="cursor-pointer text-xs font-medium rounded-lg flex items-center justify-between py-1.5 px-2 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  >
                    <div className="flex items-center gap-2">
                      <HugeIcon className="ph-bold ph-sort-ascending text-sm text-pup-maroon dark:text-red-400" />
                      <span>Name (A to Z)</span>
                    </div>
                    {sortConfig.column === "docType" && sortConfig.direction === "asc" && (
                      <HugeIcon className="ph-bold ph-check text-xs text-pup-maroon dark:text-red-400" />
                    )}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setSortConfig({ column: "docType", direction: "desc" })}
                    className="cursor-pointer text-xs font-medium rounded-lg flex items-center justify-between py-1.5 px-2 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  >
                    <div className="flex items-center gap-2">
                      <HugeIcon className="ph-bold ph-sort-descending text-sm text-pup-maroon dark:text-red-400" />
                      <span>Name (Z to A)</span>
                    </div>
                    {sortConfig.column === "docType" && sortConfig.direction === "desc" && (
                      <HugeIcon className="ph-bold ph-check text-xs text-pup-maroon dark:text-red-400" />
                    )}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setSortConfig({ column: "status", direction: "asc" })}
                    className="cursor-pointer text-xs font-medium rounded-lg flex items-center justify-between py-1.5 px-2 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  >
                    <div className="flex items-center gap-2">
                      <HugeIcon className="ph-bold ph-check-circle text-sm text-pup-maroon dark:text-red-400" />
                      <span>Completed First</span>
                    </div>
                    {sortConfig.column === "status" && sortConfig.direction === "asc" && (
                      <HugeIcon className="ph-bold ph-check text-xs text-pup-maroon dark:text-red-400" />
                    )}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setSortConfig({ column: "status", direction: "desc" })}
                    className="cursor-pointer text-xs font-medium rounded-lg flex items-center justify-between py-1.5 px-2 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  >
                    <div className="flex items-center gap-2">
                      <HugeIcon className="ph-bold ph-clock text-sm text-pup-maroon dark:text-red-400" />
                      <span>Pending First</span>
                    </div>
                    {sortConfig.column === "status" && sortConfig.direction === "desc" && (
                      <HugeIcon className="ph-bold ph-check text-xs text-pup-maroon dark:text-red-400" />
                    )}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setSortConfig({ column: "category", direction: "asc" })}
                    className="cursor-pointer text-xs font-medium rounded-lg flex items-center justify-between py-1.5 px-2 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  >
                    <div className="flex items-center gap-2">
                      <HugeIcon className="ph-bold ph-folders text-sm text-pup-maroon dark:text-red-400" />
                      <span>Category (A to Z)</span>
                    </div>
                    {sortConfig.column === "category" && sortConfig.direction === "asc" && (
                      <HugeIcon className="ph-bold ph-check text-xs text-pup-maroon dark:text-red-400" />
                    )}
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View Mode Toggle: Table vs Cards */}
            <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-border/60 dark:border-border shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title="Show requirements in table format"
                aria-label="Show requirements in table format"
                aria-pressed={viewMode === "table"}
                className={cn(
                  "h-7 px-2.5 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  viewMode === "table"
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                )}
              >
                <HugeIcon className="ph-bold ph-table text-sm" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                title="Show each requirement as a card"
                aria-label="Show each requirement as a card"
                aria-pressed={viewMode === "cards"}
                className={cn(
                  "h-7 px-2.5 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  viewMode === "cards"
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                )}
              >
                <HugeIcon className="ph-bold ph-squares-four text-sm" />
                <span>Cards</span>
              </button>
            </div>

            {viewMode === "table" && (
              <TableScrollControls
                canScrollLeft={canScrollLeft}
                canScrollRight={canScrollRight}
                onScrollLeft={() => scrollTable("left")}
                onScrollRight={() => scrollTable("right")}
              />
            )}
          </div>
        </div>

        {/* D. Active Filter Chips Bar */}
        <ActiveFilterChips
          groups={complianceFilterGroups}
          selected={{ status: statusFilters, category: categoryFilters }}
          onRemove={(groupId, val) => {
            if (groupId === "status") toggleStatusFilter(val);
            if (groupId === "category") toggleCategoryFilter(val);
          }}
          searchQuery={searchQuery}
          onClearSearch={() => setSearchQuery("")}
          onClearAll={clearAllFilters}
          className="border-t border-border dark:border-border bg-white dark:bg-card px-6 py-2.5"
        />

        {/* E. Requirements Content (Cards or Table) */}
        <div
          className={cn(
            "flex flex-[1_0_auto] flex-col border-t border-border dark:border-border",
            sortedRequirements.length > 0 && viewMode === "table" ? "min-w-0" : "p-6"
          )}
        >
          {sortedRequirements.length === 0 ? (
            <div className="py-16 rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
              <Empty className="flex h-full flex-col items-center justify-center border-0 bg-transparent text-center">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                    <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-border bg-white shadow-xl dark:border-border dark:bg-card dark:shadow-none">
                      <HugeIcon
                        className={cn(
                          "ph-duotone text-3xl text-gray-400 dark:text-zinc-500",
                          searchQuery || statusFilters.length > 0 || categoryFilters.length > 0
                            ? "ph-magnifying-glass"
                            : "ph-clipboard-check"
                        )}
                      />
                    </EmptyMedia>
                  </div>
                  <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                    {searchQuery || statusFilters.length > 0 || categoryFilters.length > 0
                      ? "No Matches Found"
                      : "No Document Requirements Assigned"}
                  </EmptyTitle>
                  <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400 mt-1">
                    {searchQuery || statusFilters.length > 0 || categoryFilters.length > 0
                      ? "Try adjusting your search query or clearing some of the combined filters."
                      : "There are currently no document requirements assigned for your degree program."}
                  </EmptyDescription>
                </EmptyHeader>
                {(searchQuery || statusFilters.length > 0 || categoryFilters.length > 0) && (
                  <EmptyContent>
                    <Button
                      variant="outline"
                      onClick={clearAllFilters}
                      title="Reset Filters"
                      className="mt-6 flex h-10 items-center justify-center gap-2 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-5 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                    >
                      Reset Filters
                    </Button>
                  </EmptyContent>
                )}
              </Empty>
            </div>
          ) : viewMode === "table" ? (
            /* Table View */
            <div
              ref={tableContainerRef}
              className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2 motion-safe:animate-in motion-safe:fade-in-50 duration-200 ease-out select-none"
            >
              <table className="w-full text-sm border-collapse table-fixed min-w-[750px]">
                <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                  <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none">
                    <th
                      className="p-4 pl-6 w-[44%]"
                      aria-sort={sortConfig.column === "docType" ? (sortConfig.direction === "asc" ? "ascending" : "descending") : "none"}
                    >
                      <button type="button" onClick={() => handleSort("docType")} className={cn("group flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-semibold", sortConfig.column === "docType" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white")}>
                        Requirement
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
                      </button>
                    </th>
                    <th
                      className="p-4 w-[22%] whitespace-nowrap"
                      aria-sort={sortConfig.column === "category" ? (sortConfig.direction === "asc" ? "ascending" : "descending") : "none"}
                    >
                      <button type="button" onClick={() => handleSort("category")} className={cn("group flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-semibold", sortConfig.column === "category" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white")}>
                        Category
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
                      </button>
                    </th>
                    <th
                      className="p-4 w-[22%] whitespace-nowrap"
                      aria-sort={sortConfig.column === "status" ? (sortConfig.direction === "asc" ? "ascending" : "descending") : "none"}
                    >
                      <button type="button" onClick={() => handleSort("status")} className={cn("group flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-semibold", sortConfig.column === "status" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white")}>
                        Status
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
                      </button>
                    </th>
                    <th className="p-4 pr-6 w-[12%] text-right whitespace-nowrap text-xs font-semibold text-gray-500 dark:text-zinc-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border">
                  {sortedRequirements.map((item) => {
                    const isSubmitted = item.status === "Submitted";

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedRequirement(item)}
                        className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer select-none group"
                      >
                        <td className="p-4 pl-6 overflow-hidden">
                          <div className="font-semibold text-gray-900 dark:text-zinc-100 text-xs truncate group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors" title={item.docType}>
                            {item.docType}
                          </div>
                          <div className="text-[11px] text-gray-400 dark:text-zinc-500 truncate mt-0.5" title={item.description}>
                            {item.description}
                          </div>
                        </td>
                        <td className="p-4 text-xs font-medium text-gray-900 dark:text-zinc-300 whitespace-nowrap">
                          {item.category}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          {isSubmitted ? (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300">
                                Completed
                              </span>
                              {item.document?.createdAt && (
                                <span className="text-[10.5px] font-mono text-gray-400 dark:text-zinc-500">
                                  {formatPHDateTime(item.document.createdAt, { dateOnly: true })}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300">
                              Pending Submission
                            </span>
                          )}
                        </td>
                        <td className="p-4 pr-6 text-right whitespace-nowrap">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRequirement(item);
                            }}
                            className="h-8 px-3 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Cards View */
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 text-xs text-gray-500 px-1 select-none">
                <span className="text-xs text-gray-900 dark:text-zinc-300">
                  Showing <strong className="text-gray-900 dark:text-zinc-200">{sortedRequirements.length}</strong> {sortedRequirements.length === 1 ? "requirement" : "requirements"}
                </span>
              </div>

              {/* 3-Column Responsive Grid matching Document Catalog Aesthetics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
                {sortedRequirements.map((item) => {
                  const isSubmitted = item.status === "Submitted";

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedRequirement(item)}
                      className="group flex flex-col justify-between rounded-3xl bg-[#f5f5f7] dark:bg-zinc-850/60 p-6 sm:p-7 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xs border border-transparent dark:border-white/5 cursor-pointer"
                    >
                      <div className="flex flex-col flex-grow">
                        {/* 1. Top Metadata Row: Category Pill & Dot Status (No Colored Backgrounds) */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono font-medium text-gray-600 dark:text-zinc-400 bg-white dark:bg-zinc-800 px-3 py-1 rounded-full border border-gray-200/80 dark:border-white/10 shadow-2xs truncate max-w-[180px]">
                            {item.category}
                          </span>

                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 dark:text-zinc-300 shrink-0">
                            <span
                              className={cn(
                                "w-2 h-2 rounded-full",
                                isSubmitted ? "bg-emerald-500 shadow-2xs" : "bg-amber-500 shadow-2xs"
                              )}
                            />
                            <span>{isSubmitted ? "Completed" : "Pending Submission"}</span>
                          </div>
                        </div>

                        {/* 2. Bold Title matching Document Catalog on Landing */}
                        <h3
                          className="text-lg font-bold text-gray-950 dark:text-zinc-50 tracking-tight leading-snug mt-5 mb-2 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors"
                          title={item.docType}
                        >
                          {item.docType}
                        </h3>

                        {/* 3. Description Body */}
                        <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed font-normal flex-grow line-clamp-3 mb-6">
                          {item.description}
                        </p>
                      </div>

                      {/* 4. Bottom Divider Section matching Catalog "Filing Requirements" */}
                      <div className="pt-4 border-t border-black/5 dark:border-white/10 mt-auto">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-mono mb-2.5 flex items-center gap-1.5">
                          <HugeIcon className="ph-bold ph-shield-check text-xs" />
                          <span>{isSubmitted ? "Archival Verification" : "Submission Guideline"}</span>
                        </div>

                        {isSubmitted ? (
                          <div className="space-y-1.5 text-xs text-gray-600 dark:text-zinc-300">
                            <div className="flex items-center gap-2">
                              <span className="w-4 h-4 rounded-full bg-black/5 dark:bg-white/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[9px] shrink-0">
                                <HugeIcon className="ph-bold ph-check" />
                              </span>
                              <span className="font-medium text-[11.5px] truncate">
                                {item.document?.originalFilename || "Physical archive registered"}
                              </span>
                            </div>
                            {item.document?.createdAt && (
                              <div className="text-[10.5px] text-gray-400 dark:text-zinc-500 font-mono pl-6">
                                Archived {formatPHDateTime(item.document.createdAt, { dateOnly: true })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-zinc-400">
                            <span className="w-4 h-4 rounded-full bg-black/5 dark:bg-white/10 text-gray-500 dark:text-zinc-400 flex items-center justify-center text-[9px] shrink-0 mt-0.5">
                              <HugeIcon className="ph-bold ph-arrow-right" />
                            </span>
                            <span className="text-[11.5px] leading-relaxed line-clamp-2">
                              {item.instructions || "Submit original physical copy directly to Room 102."}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-zinc-500 pt-3 mt-3 border-t border-black/5 dark:border-white/10 font-mono">
                          <div className="flex items-center gap-1.5">
                            <HugeIcon className="ph-bold ph-map-pin text-xs text-gray-400 dark:text-zinc-500" />
                            <span>{isSubmitted ? "Registrar Vault (Rm 102)" : "Window Counter (Rm 102)"}</span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRequirement(item);
                            }}
                            className="h-7 px-2.5 text-[11px] font-semibold rounded-lg border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 transition-all cursor-pointer shadow-2xs"
                          >
                            View Details
                          </Button>
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

      {/* 1. Standardized Permanent Admission Record Details Sheet */}
      <PermanentAdmissionRecordSheet
        open={Boolean(selectedRequirement)}
        onOpenChange={(open) => !open && setSelectedRequirement(null)}
        item={selectedRequirement}
        items={sortedRequirements}
        currentIndex={
          selectedRequirement
            ? sortedRequirements.findIndex((r) => r.id === selectedRequirement.id)
            : -1
        }
        onNavigatePrev={() => {
          const idx = sortedRequirements.findIndex((r) => r.id === selectedRequirement?.id);
          if (idx > 0) {
            setSelectedRequirement(sortedRequirements[idx - 1]);
          }
        }}
        onNavigateNext={() => {
          const idx = sortedRequirements.findIndex((r) => r.id === selectedRequirement?.id);
          if (idx >= 0 && idx < sortedRequirements.length - 1) {
            setSelectedRequirement(sortedRequirements[idx + 1]);
          }
        }}
        student={student}
      />

      {/* 2. Official Compliance Slip Print Modal */}
      <Dialog open={printModalOpen} onOpenChange={setPrintModalOpen}>
        <DialogContent className="w-full max-w-4xl sm:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-white dark:bg-card border border-border dark:border-border shadow-2xl font-jakarta print:border-0 print:shadow-none print:max-h-none print:overflow-visible print:w-full print:max-w-none print:bg-white">
          <DialogHeader className="p-6 pb-4 border-b border-border dark:border-border shrink-0 print:hidden">
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-zinc-50">
              Student Document Compliance Slip
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-900 dark:text-zinc-300">
              Official institutional summary generated from PUPSJ Records Keeping System.
            </DialogDescription>
          </DialogHeader>

          {/* Printable Content Area with Scroll Containment */}
          <div
            className="p-8 py-6 space-y-6 text-xs text-gray-800 dark:text-zinc-200 flex-1 overflow-y-auto print:overflow-visible print:p-0 print:m-0 print:space-y-4"
            id="compliance-printable-slip"
          >
            {/* Institution Header matching Admin Reports */}
            <div className="text-center pb-2 print:pb-2">
              {/* Centered Logo */}
              <div className="flex justify-center mb-2">
                <div className="w-14 h-14 flex items-center justify-center p-0.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={branding.logoBase64 || branding.logoUrl || DEFAULT_BRANDING_LOGO}
                    onError={(e) => {
                      e.currentTarget.src = branding.fallbackLogoUrl || OFFICIAL_FALLBACK_LOGO;
                    }}
                    alt="PUP Logo"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>

              {/* School & Campus Name */}
              <h2
                className="font-bold text-[15px] sm:text-[16px] tracking-tight transition-colors text-center"
                style={{ color: branding.brandColor || "#800000" }}
              >
                {branding.campusName
                  ? `${branding.institutionName} · ${branding.campusName}`
                  : branding.institutionName}
              </h2>

              {/* Tagline / Subtitle */}
              <p className="text-[9px] uppercase tracking-[0.2em] font-semibold text-gray-900 dark:text-zinc-300 text-center mt-1">
                {branding.tagline || "OFFICE OF THE CAMPUS REGISTRAR"}
              </p>

              {/* Report Title */}
              <h3 className="text-[13px] sm:text-[14px] font-bold text-gray-900 dark:text-zinc-100 text-center mt-2.5">
                Student Requirements Compliance Summary
              </h3>

              {/* Document ID & Timestamp */}
              <p className="text-[9px] italic text-gray-900 dark:text-zinc-300 text-center font-mono mt-0.5">
                Document ID: RKS-CMP-{student.studentNo ? String(student.studentNo).replace(/[^0-9A-Za-z]/g, "") : "STD"}-{new Date().getFullYear()} · Issued on {new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
              </p>

              {/* Master Divider Line */}
              <div
                className="w-full h-[2px] mt-3 mb-5 transition-colors"
                style={{ backgroundColor: branding.brandColor || "#800000" }}
              />
            </div>

            {/* Student Meta Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-2xl bg-gray-50/80 dark:bg-zinc-900/50 border border-border/80 dark:border-border print:bg-gray-50 print:border-border">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-400 block">Student Name</span>
                <span className="text-xs font-bold text-gray-900 dark:text-zinc-100 block truncate" title={student.name}>{student.name}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-400 block">Student Number</span>
                <span className="font-mono text-xs font-bold text-pup-maroon dark:text-red-400 block">{student.studentNo}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-400 block">Compliance Status</span>
                <span className="text-xs font-bold text-gray-900 dark:text-zinc-100 block">
                  {summary.complianceRate}% ({summary.submittedCount}/${summary.totalRequired} Submitted)
                </span>
              </div>
            </div>

            {/* Requirements Checklist Table */}
            <div className="rounded-2xl border border-border dark:border-border overflow-hidden shadow-xs print:border-border">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs font-semibold text-xs text-gray-500 dark:text-zinc-400 border-b border-border select-none print:bg-gray-100">
                  <tr>
                    <th className="py-3 px-3 text-center w-9">#</th>
                    <th className="py-3 px-4">Requirement / Credential</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border print:divide-border">
                  {sortedRequirements.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors select-none print:border-b print:border-border">
                      <td className="py-3 px-3 text-center text-gray-400 dark:text-zinc-500 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-3 px-4 font-semibold text-gray-900 dark:text-zinc-100 leading-normal">{r?.docType || r?.name || "N/A"}</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-zinc-300 text-xs whitespace-nowrap">{r?.category || "N/A"}</td>
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

            <div className="text-[10px] text-gray-400 dark:text-zinc-400 text-center italic pt-2">
              Note: This is an official system-generated student compliance summary from the PUPSJ Records Keeping System for institutional verification. Alteration or unauthorized reproduction is strictly prohibited.
            </div>
          </div>

          <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5 shrink-0 print:hidden">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPrintModalOpen(false)}
              className="h-10 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Close
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="h-10 px-5 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50"
            >
              {downloadingPdf ? (
                <span className="flex items-center gap-1.5">
                  <HugeIcon className="ph-bold ph-spinner animate-spin text-sm"></HugeIcon>
                  Generating...
                </span>
              ) : (
                "Download PDF Slip"
              )}
            </Button>
            <Button
              type="button"
              onClick={handlePrintSlip}
              className="h-10 px-5 text-xs font-semibold rounded-xl btn-brand-red text-white! border-0 cursor-pointer active:scale-95 shadow-xs transition-all"
              style={{ color: "#ffffff" }}
            >
              Print Slip
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
