"use client"
import { BADGE_BASE } from "@/lib/badgeStyles";

import { Table } from "@/components/ui/table";
import TablePagination from "@/components/shared/TablePagination";

import useUrlPage from "@/hooks/useUrlPage";
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia, EmptyContent } from "@/components/ui/empty";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import TableScrollControls from "@/components/shared/TableScrollControls";
import DataViewToolbar from "@/components/shared/DataViewToolbar";
import DashboardSearch from "@/components/shared/DashboardSearch";
import {
  FilterPopover,
  SortPopover,
  GroupPopover,
  ColumnsPopover,
  ActiveFilterChips,
} from "@/components/systemadmin/OfficeTableControls";
import { DateRangeFilterButton } from "@/components/shared/DateRangePickerModal";
import useTableScroll from "@/hooks/useTableScroll";
import { cn, formatTitleCase } from "@/lib/utils";
import { matchesSearchQuery } from "@/lib/searchUtils";
import { Files01Icon as EmptyFiles01Icon, ReloadIcon, ViewIcon } from "hugeicons-react";

function getYear(document) {
  const year = Number(String(document?.student_no || "").split("-")[0]);
  return Number.isInteger(year) && year >= 1900 && year <= 2200 ? year : null;
}

function getSelectedYear(breadcrumbs) {
  const label = breadcrumbs?.find((item) => item.level === "students")?.label || "";
  const match = String(label).match(/\b(\d{4})\b/);
  return match ? Number(match[1]) : null;
}

function formatChipDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function OfficeDocumentsTable({
  documents = [],
  officeLabel = "Office",
  breadcrumbs,
  onPreviewDocument,
  onRescan,
  embedded = true,
  serverPaged = false,
  borderTop = true,
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useUrlPage();
  const [pageSize, setPageSize] = useState(20);
  const [serverPage, setServerPage] = useState({ rows: [], total: 0 });
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filterRules, setFilterRules] = useState([]);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [groupBy, setGroupBy] = useState("none");
  const [visibleColumns, setVisibleColumns] = useState([
    "identifier",
    "name",
    "doc_type",
    "year",
    "status",
    "actions",
  ]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const selectedYear = getSelectedYear(breadcrumbs);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!serverPaged) return;
    const controller = new AbortController();
    setIsLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (selectedYear) params.set("year", String(selectedYear));
    if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
    fetch(`/api/documents/browse?${params}`, { cache: "no-store", signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        if (json?.ok) setServerPage(json.data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [serverPaged, page, pageSize, debouncedQuery, selectedYear]);

  const rawRows = serverPaged ? serverPage.rows : documents;

  // Filter fields config
  const filterFields = useMemo(() => [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Approved", value: "Approved" },
        { label: "Pending", value: "Pending" },
        { label: "Declined", value: "Declined" },
      ],
    },
    {
      key: "doc_type",
      label: "Document Type",
      type: "text",
    },
  ], []);

  // Sort options config
  const sortOptions = useMemo(() => [
    { value: "created_at", label: "Date Added" },
    { value: "identifier", label: officeLabel === "OSAS" ? "Organization" : "Student No." },
    { value: "name", label: officeLabel === "OSAS" ? "Officer / Submitter" : "Full Name" },
    { value: "doc_type", label: "Document Type" },
    { value: "status", label: "Status" },
  ], [officeLabel]);

  // Group options config
  const groupOptions = useMemo(() => [
    { value: "none", label: "No grouping" },
    { value: "status", label: "Status" },
    { value: "doc_type", label: "Document Type" },
    { value: "year", label: "Year" },
  ], []);

  // Table columns config
  const tableColumns = useMemo(() => [
    { key: "identifier", label: officeLabel === "OSAS" ? "Organization" : "Student No." },
    { key: "name", label: officeLabel === "OSAS" ? "Officer / Submitter" : "Full Name" },
    { key: "doc_type", label: "Document" },
    { key: "year", label: "Year" },
    { key: "status", label: "Status" },
    { key: "actions", label: "Actions" },
  ], [officeLabel]);

  // Client filtering
  const filteredRows = useMemo(() => {
    return rawRows
      .filter((document) => selectedYear == null || getYear(document) === selectedYear)
      .filter((document) => {
        if (serverPaged) return true; // server already searched query
        return matchesSearchQuery(
          [document.student_no, document.student_name, document.doc_type, document.original_filename],
          query
        );
      })
      .filter((document) => {
        for (const rule of filterRules) {
          if (rule.fieldKey === "status") {
            const match = String(document.approval_status || "Pending").toLowerCase() === String(rule.value || "").toLowerCase();
            if (rule.operator === "is_not" ? match : !match) return false;
          } else if (rule.fieldKey === "doc_type") {
            const match = String(document.doc_type || "").toLowerCase().includes(String(rule.value || "").toLowerCase());
            if (rule.operator === "is_not" ? match : !match) return false;
          }
        }
        if (startDate) {
          const s = new Date(startDate).getTime();
          if (!isNaN(s)) {
            const rowDate = new Date(document.created_at).getTime();
            if (!isNaN(rowDate) && rowDate < s) return false;
          }
        }
        if (endDate) {
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          const rowDate = new Date(document.created_at).getTime();
          if (!isNaN(rowDate) && rowDate > e.getTime()) return false;
        }
        return true;
      });
  }, [rawRows, selectedYear, query, serverPaged, filterRules, startDate, endDate]);

  // Client sorting
  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      let valA = "";
      let valB = "";
      if (sortBy === "created_at") {
        valA = a.created_at || "";
        valB = b.created_at || "";
      } else if (sortBy === "identifier") {
        valA = a.organization_name || a.student_no || "";
        valB = b.organization_name || b.student_no || "";
      } else if (sortBy === "name") {
        valA = a.student_name || "";
        valB = b.student_name || "";
      } else if (sortBy === "doc_type") {
        valA = a.doc_type || "";
        valB = b.doc_type || "";
      } else if (sortBy === "status") {
        valA = a.approval_status || "Pending";
        valB = b.approval_status || "Pending";
      }
      const comp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: "base" });
      return sortOrder === "desc" ? -comp : comp;
    });
  }, [filteredRows, sortBy, sortOrder]);

  const totalCount = serverPaged ? serverPage.total : sortedRows.length;
  const visibleRows = serverPaged ? sortedRows : sortedRows.slice((page - 1) * pageSize, page * pageSize);

  // Grouped rows for display
  const groupedDisplayRows = useMemo(() => {
    if (groupBy === "none") return [{ groupKey: null, label: null, rows: visibleRows }];
    const map = new Map();
    for (const doc of visibleRows) {
      let key = "Other";
      if (groupBy === "status") key = doc.approval_status || "Pending";
      else if (groupBy === "doc_type") key = doc.doc_type || "Unknown";
      else if (groupBy === "year") key = String(getYear(doc) || "N/A");

      if (!map.has(key)) map.set(key, []);
      map.get(key).push(doc);
    }
    return Array.from(map.entries()).map(([label, rows]) => ({
      groupKey: label,
      label,
      rows,
    }));
  }, [visibleRows, groupBy]);

  // Active filter chips
  const activeChips = useMemo(() => {
    const chips = [];
    filterRules.forEach((rule) => {
      const field = filterFields.find((f) => f.key === rule.fieldKey);
      const fieldLabel = field?.label || rule.fieldKey;
      const optionLabel = field?.options?.find((o) => String(o.value) === String(rule.value))?.label || rule.value;
      chips.push({
        id: rule.id,
        label: `${fieldLabel} ${rule.operator === "is_not" ? "is not" : "is"} ${optionLabel}`,
        onRemove: () => setFilterRules((prev) => prev.filter((r) => r.id !== rule.id)),
      });
    });
    if (startDate || endDate) {
      chips.push({
        id: "dateRange",
        label: `Date: ${formatChipDate(startDate)} – ${formatChipDate(endDate)}`,
        onRemove: () => {
          setStartDate("");
          setEndDate("");
        },
      });
    }
    return chips;
  }, [filterRules, filterFields, startDate, endDate]);

  const {
    containerRef: tableContainerRef,
    isScrolledX,
    scrollLeft,
    scrollRight,
    resetScroll,
  } = useTableScroll([visibleRows.length]);

  const containerClasses = embedded
    ? cn(
        borderTop && "border-t border-border dark:border-border",
        "w-full bg-white dark:bg-card flex flex-[1_0_auto] flex-col rounded-b-2xl overflow-hidden"
      )
    : "rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none flex flex-[1_0_auto] flex-col overflow-hidden";

  return (
    <div className={containerClasses}>
      {/* Canonical 2-Zone DataViewToolbar */}
      <DataViewToolbar
        label={`${officeLabel} document search and controls`}
        className={cn(
          borderTop && "border-t border-border dark:border-border",
          "p-4 sm:px-5 sm:py-3 gap-2 bg-white dark:bg-card flex flex-wrap items-center justify-between select-none"
        )}
      >
        {/* Left Zone: DashboardSearch + TableScrollControls */}
        <div className="flex min-w-0 items-center gap-2">
          <DashboardSearch
            value={query}
            onChange={(val) => {
              setQuery(val);
              setPage(1);
              resetScroll();
            }}
            count={totalCount}
            loading={isLoading}
            placeholder={`Search ${officeLabel.toLowerCase()} documents...`}
            label={`Search ${officeLabel} documents`}
          />
          {visibleRows.length > 0 && (
            <TableScrollControls
              scrollContainerRef={tableContainerRef}
              isScrolledX={isScrolledX}
              onResetScroll={resetScroll}
              onScrollLeft={() => scrollLeft(400)}
              onScrollRight={() => scrollRight(400)}
            />
          )}
        </div>

        {/* Right Zone: Filter -> Sort -> Group -> Columns -> DateRange */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <FilterPopover
            fields={filterFields}
            filters={filterRules}
            onFiltersChange={(newRules) => {
              setFilterRules(newRules);
              setPage(1);
            }}
            entityLabel="documents"
          />
          <SortPopover
            options={sortOptions}
            sortBy={sortBy}
            onSortByChange={(val) => {
              setSortBy(val);
              setPage(1);
            }}
            sortOrder={sortOrder}
            onSortOrderChange={(val) => {
              setSortOrder(val);
              setPage(1);
            }}
          />
          <GroupPopover
            options={groupOptions}
            groupBy={groupBy}
            onGroupByChange={(val) => {
              setGroupBy(val);
              setPage(1);
            }}
          />
          <ColumnsPopover
            columns={tableColumns}
            visibleColumns={visibleColumns}
            onVisibleColumnsChange={setVisibleColumns}
            minVisible={2}
          />
          <DateRangeFilterButton
            startDate={startDate}
            endDate={endDate}
            onApply={({ startDate: s, endDate: e }) => {
              setStartDate(s);
              setEndDate(e);
              setPage(1);
            }}
            onClear={() => {
              setStartDate("");
              setEndDate("");
              setPage(1);
            }}
            disableFutureDates={true}
          />
        </div>
      </DataViewToolbar>

      {/* Active Filter Chips */}
      {activeChips.length > 0 && (
        <ActiveFilterChips
          chips={activeChips}
          onClearAll={() => {
            setFilterRules([]);
            setStartDate("");
            setEndDate("");
            setPage(1);
          }}
          className="border-t border-border dark:border-border px-6 py-2.5"
        />
      )}

      {visibleRows.length === 0 ? (
        <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[360px] w-full">
          <Empty>
            <EmptyHeader>
              <EmptyMedia><EmptyFiles01Icon size="1em" /></EmptyMedia>
              <EmptyTitle>
                No {officeLabel} Documents
              </EmptyTitle>
              <EmptyDescription>
                {query.trim() || filterRules.length > 0 || startDate || endDate
                  ? "No documents match your active search terms or filters. Try clearing your filters."
                  : "Documents from other offices are intentionally excluded from this table."}
              </EmptyDescription>
            </EmptyHeader>
            {(query.trim() || filterRules.length > 0 || startDate || endDate) && (
              <EmptyContent>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setFilterRules([]);
                    setStartDate("");
                    setEndDate("");
                    setPage(1);
                  }}
                  title="Clear All Filters"
                  className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer active:scale-95 transition-all shadow-xs"
                >
                  Clear All Filters
                </Button>
              </EmptyContent>
            )}
          </Empty>
        </div>
      ) : (
        <>
          <div
            ref={tableContainerRef}
            className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2"
          >
            <Table
              columns={visibleColumns.map((colKey) => {
                if (colKey === "identifier") return officeLabel === "OSAS" ? "text" : "identifier";
                if (colKey === "name") return "text";
                if (colKey === "doc_type") return { kind: "text", maxWidth: 340 };
                if (colKey === "year") return "year";
                if (colKey === "status") return "status";
                return "actions";
              })}
              className="min-w-[960px]"
            >
              <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400">
                  {visibleColumns.includes("identifier") && (
                    <th className="w-[16%] min-w-[150px] p-4">{officeLabel === "OSAS" ? "Organization" : "Student No."}</th>
                  )}
                  {visibleColumns.includes("name") && (
                    <th className="w-[26%] min-w-[200px] p-4">{officeLabel === "OSAS" ? "Officer / Submitter" : "Full Name"}</th>
                  )}
                  {visibleColumns.includes("doc_type") && (
                    <th className="w-[28%] min-w-[220px] p-4">Document</th>
                  )}
                  {visibleColumns.includes("year") && (
                    <th className="w-[10%] min-w-[100px] p-4">Year</th>
                  )}
                  {visibleColumns.includes("status") && (
                    <th className="w-[12%] min-w-[120px] p-4">Status</th>
                  )}
                  {visibleColumns.includes("actions") && (
                    <th className="w-24 min-w-[96px] p-4 pr-6 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
                {groupedDisplayRows.map((group) => (
                  <Fragment key={group.groupKey || "root"}>
                    {group.label && (
                      <tr className="bg-gray-50/70 dark:bg-zinc-800/60 border-y border-border">
                        <td colSpan={visibleColumns.length} className="px-6 py-2 text-xs font-semibold text-gray-700 dark:text-zinc-300">
                          <span className="font-bold">{group.label}</span>
                          <span className="ml-2 font-normal text-muted-foreground">({group.rows.length})</span>
                        </td>
                      </tr>
                    )}
                    {group.rows.map((document) => (
                      <tr key={document.id} className="group transition-colors hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 select-none">
                        {visibleColumns.includes("identifier") && (
                          <td className="p-4 align-middle overflow-hidden whitespace-nowrap border-r border-border/70 dark:border-border/70">
                            {officeLabel === "OSAS" ? (
                              <span
                                className={cn("font-sans tabular-nums text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 truncate inline-block max-w-full", BADGE_BASE)}
                                title={document.organization_name || document.verified_org_name || document.org_acronym || document.student_no || "N/A"}
                              >
                                {document.organization_name || document.verified_org_name || document.org_acronym || document.student_no || "N/A"}
                              </span>
                            ) : (
                              <span className={cn("font-sans tabular-nums text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200", BADGE_BASE)}>
                                {document.student_no || "N/A"}
                              </span>
                            )}
                          </td>
                        )}
                        {visibleColumns.includes("name") && (
                          <td className="p-4 align-middle overflow-hidden border-r border-border/70 dark:border-border/70">
                            <div className="font-semibold text-gray-900 dark:text-zinc-100 truncate" title={formatTitleCase(document.student_name)}>
                              {formatTitleCase(document.student_name) || "N/A"}
                            </div>
                          </td>
                        )}
                        {visibleColumns.includes("doc_type") && (
                          <td className="p-4 align-middle overflow-hidden border-r border-border/70 dark:border-border/70">
                            <div className="font-semibold text-xs text-gray-900 dark:text-zinc-100 truncate" title={document.doc_type}>{document.doc_type}</div>
                            <div className="truncate text-xs text-gray-500 dark:text-zinc-400 mt-0.5" title={document.original_filename}>{document.original_filename}</div>
                          </td>
                        )}
                        {visibleColumns.includes("year") && (
                          <td className="p-4 align-middle text-xs font-normal text-gray-700 dark:text-zinc-300 whitespace-nowrap border-r border-border/70 dark:border-border/70">
                            {getYear(document) || "N/A"}
                          </td>
                        )}
                        {visibleColumns.includes("status") && (
                          <td className="p-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
                            <Badge variant="outline" className={cn("rounded-full text-[10px] font-medium px-2.5 py-0.5", document.approval_status === "Approved"
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400", BADGE_BASE)}>{document.approval_status || "Pending"}</Badge>
                          </td>
                        )}
                        {visibleColumns.includes("actions") && (
                          <td className="p-4 pr-6 align-middle text-right">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              {onRescan && !document.source_type && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onRescan?.(
                                          document.organization_id || document.student_no,
                                          document.doc_type,
                                          document.id,
                                          document.original_filename,
                                          document.mime_type
                                        )
                                      }
                                      aria-label="Re-scan Document"
                                      className="table-action-button rounded-lg text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 active:scale-95 cursor-pointer"
                                    >
                                      <ReloadIcon size="1em" className="text-[15px]" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>Re-scan Document</TooltipContent>
                                </Tooltip>
                              )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => onPreviewDocument?.(document.doc_type, document.student_name, document.student_no, document.id)}
                                    aria-label={PDF_ACTION_LABELS.preview}
                                    className="table-action-button rounded-lg active:scale-95 cursor-pointer"
                                  >
                                    <ViewIcon size="1em" className="text-[16px]" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>{PDF_ACTION_LABELS.preview}</TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </Table>
          </div>
          <TablePagination
            label="Office document pages"
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            displayedCount={visibleRows.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}
    </div>
  );
}
