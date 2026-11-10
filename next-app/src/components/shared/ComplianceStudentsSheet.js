"use client";

import { useEffect, useRef, useState } from "react";
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";
import { toast } from "sonner";
import { Search01Icon, AlertCircleIcon } from "hugeicons-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import PDFPreviewModal from "@/components/shared/PDFPreviewModal";
import { generateComplianceRosterPdf } from "@/lib/complianceRosterPdf";
import { generateExportFilename } from "@/lib/exportHelpers";
import { formatPHDateTime } from "@/lib/timeFormat";
import ComplianceStudentsList from "@/components/shared/ComplianceStudentsList";
import { BADGE_BASE, BADGE_PALETTES } from "@/lib/badgeStyles";
import { cn } from "@/lib/utils";

const endpoint = "/api/analytics/digitization-compliance/missing-students";

function download(blob, extension) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = generateExportFilename("COMPLIANCE", "INCOMPLETE", extension);
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ComplianceStudentsSheet({
  open,
  onClose,
  documentType,
  filters = {},
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value))
      value.forEach((entry) => params.append(key, entry));
    else if (value !== undefined && value !== null)
      params.set(key, String(value));
  }
  if (documentType?.documentTypeId)
    params.set("documentTypeId", documentType.documentTypeId);
  params.set("complianceStatus", "incomplete");
  const query = params.toString();
  return (
    <ComplianceStudentsSheetContent
      key={query}
      {...{ open, onClose, documentType, query }}
    />
  );
}

function ComplianceStudentsSheetContent({
  open,
  onClose,
  documentType,
  query,
}) {
  const [students, setStudents] = useState([]);
  const [meta, setMeta] = useState(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const actionController = useRef(null);
  const limit = 20;

  // Initial fetch
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");

    fetch(`${endpoint}?${query}&offset=0&limit=${limit}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok || !json.ok)
          throw new Error(json.error || "Unable to load incomplete records");
        if (!controller.signal.aborted) {
          setStudents(json.data.students || []);
          setTotal(Number(json.data.total) || 0);
          setMeta(json.data.meta);
        }
      })
      .catch((failure) => {
        if (!controller.signal.aborted) {
          setStudents([]);
          setTotal(0);
          setError(failure.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [open, query, retry]);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url);
    },
    [preview]
  );
  useEffect(() => () => actionController.current?.abort(), []);

  const close = () => {
    actionController.current?.abort();
    setBusy(false);
    setPreview(null);
    setStudents([]);
    setTotal(0);
    setError("");
    onClose();
  };

  // Progressive load more
  const handleLoadMore = async () => {
    if (loadingMore || students.length >= total) return;
    setLoadingMore(true);
    try {
      const nextOffset = students.length;
      const res = await fetch(`${endpoint}?${query}&offset=${nextOffset}&limit=${limit}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (json?.ok && Array.isArray(json.data?.students)) {
        setStudents((prev) => [...prev, ...json.data.students]);
        setTotal(Number(json.data.total) || 0);
      }
    } catch (err) {
      toast.error("Failed to load more records", { description: err.message });
    } finally {
      setLoadingMore(false);
    }
  };

  const exportRoster = async (format) => {
    const controller = new AbortController();
    actionController.current = controller;
    setBusy(true);
    try {
      const response = await fetch(
        `${endpoint}?${query}&${format === "csv" ? "format=csv" : "export=1"}`,
        {
          cache: "no-store",
          signal: controller.signal,
        }
      );
      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || "Unable to export incomplete records");
      }
      if (format === "csv") download(await response.blob(), "csv");
      else {
        const json = await response.json();
        const blob = await generateComplianceRosterPdf(json.data);
        if (controller.signal.aborted) return;
        setPreview({
          url: URL.createObjectURL(blob),
          total: json.data.total,
          generatedAt: json.data.meta.generatedAt,
        });
      }
    } catch (failure) {
      if (!controller.signal.aborted)
        toast.error("Report Export Failed", { description: failure.message });
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  const hasMore = students.length < total;
  const disabled = busy || loading || total === 0 || Boolean(error);

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(value) => {
          if (!value) close();
        }}
      >
        <SheetContent
          side="right"
          size="default"
          className="overflow-hidden p-0 flex flex-col bg-white dark:bg-zinc-900 border-l border-black/[0.06] dark:border-white/[0.08] shadow-2xl"
        >
          {/* Standard Sheet Header */}
          <SheetHeader className="shrink-0 p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div>
                <SheetTitle className="text-[17px] font-bold text-gray-900 dark:text-zinc-100">
                  Incomplete Records
                </SheetTitle>
                <SheetDescription className="sr-only">
                  {documentType?.documentType || "Incomplete student records roster"}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Sheet Body */}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {loading ? (
              <div
                className="space-y-3"
                aria-label="Loading incomplete records"
                role="status"
              >
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-border/80 dark:border-border p-4 space-y-3 bg-white dark:bg-zinc-900/40"
                    aria-hidden="true"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-9 rounded-full dark:bg-muted shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-4 w-40 dark:bg-muted" />
                        <Skeleton className="h-3 w-28 dark:bg-muted" />
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full dark:bg-muted shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <EmptyState
                variant="compact"
                icon={AlertCircleIcon}
                title="Could Not Load Incomplete Records"
                description={error}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRetry((value) => value + 1)}
                  className="mt-3 h-9 px-4 text-xs font-semibold rounded-xl"
                >
                  Retry Loading
                </Button>
              </EmptyState>
            ) : !meta?.configured ? (
              <EmptyState
                variant="compact"
                icon={Search01Icon}
                title="No Requirements Configured"
                description="Configure compliance document types before generating a report."
              />
            ) : total === 0 ? (
              <EmptyState
                variant="compact"
                icon={Search01Icon}
                title="No Incomplete Records"
                description="No outstanding requirements match these filters."
              />
            ) : (
              <>
                {/* Summary Spec Strip Card */}
                <div className="rounded-xl bg-gray-50/70 dark:bg-zinc-850/50 border border-black/[0.04] dark:border-white/[0.06] p-4 flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[20px] font-bold tracking-tight text-gray-900 dark:text-zinc-50 tabular-nums">
                        {total.toLocaleString()}
                      </span>
                      <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                        {total === 1 ? "student with incomplete records" : "students with incomplete records"}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                      {meta?.requireApproved
                        ? "Approved evidence required"
                        : "Pending uploads count as submitted"}
                    </p>
                  </div>
                  <span className={cn(BADGE_BASE, BADGE_PALETTES.amber)}>
                    Action Needed
                  </span>
                </div>

                {/* Card-aligned Students List */}
                <ComplianceStudentsList
                  students={students}
                  singleDocument={Boolean(documentType?.documentTypeId)}
                />

                {/* Progressive View More / Load More Section (matching Global Directory) */}
                {hasMore ? (
                  <div className="pt-3 pb-1 text-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="w-full h-9 text-xs font-semibold rounded-xl cursor-pointer"
                    >
                      {loadingMore
                        ? "Loading more records..."
                        : `View More (${students.length} of ${total.toLocaleString()})`}
                    </Button>
                  </div>
                ) : total > limit ? (
                  <p className="text-[11px] text-center text-gray-400 dark:text-zinc-500 pt-3 pb-1 font-sans tabular-nums">
                    All {total.toLocaleString()} incomplete {total === 1 ? "record" : "records"} displayed
                  </p>
                ) : null}
              </>
            )}
          </div>

          {/* Standard Space-Between Sheet Footer */}
          <SheetFooter className="shrink-0 p-4 px-6 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-row items-center justify-between bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
            <Button
              size="sm"
              variant="outline"
              className="h-9 px-4 text-xs font-semibold rounded-xl"
              onClick={close}
            >
              Close
            </Button>
            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
              <Button
                size="sm"
                variant="outline"
                className="h-9 px-4 text-xs font-semibold rounded-xl"
                disabled={disabled}
                onClick={() => exportRoster("csv")}
              >
                Export CSV
              </Button>
              <Button
                size="sm"
                className="h-9 px-4 text-xs font-semibold rounded-xl"
                disabled={disabled}
                onClick={() => exportRoster("pdf")}
              >
                {busy ? "Preparing PDF…" : PDF_ACTION_LABELS.preview}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <PDFPreviewModal
        open={open && Boolean(preview)}
        onClose={() => setPreview(null)}
        title="Incomplete Records Report Preview"
        description={preview ? `${preview.total} students · ${formatPHDateTime(preview.generatedAt)}` : ""}
        pdfUrl={preview?.url}
        downloadFilename={generateExportFilename("COMPLIANCE", "INCOMPLETE", "pdf")}
      />
    </>
  );
}
