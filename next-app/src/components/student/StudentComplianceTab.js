"use client";

import { useEffect, useState } from "react";
import { AlertCircleIcon, ArrowDown01Icon, ArrowRight02Icon, CheckListIcon, Search01Icon, ViewIcon } from "hugeicons-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import AppIcon from "@/components/ui/app-icon";
import { SegmentedControl } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import DataContentSkeleton from "@/components/shared/DataContentSkeleton";
import DataViewToolbar from "@/components/shared/DataViewToolbar";
import NarrativeText from "@/components/shared/NarrativeText";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import DashboardSearch from "@/components/shared/DashboardSearch";
import ViewModeIcon from "@/components/shared/ViewModeIcon";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import { FilterPopover, SortPopover, GroupPopover } from "@/components/systemadmin/OfficeTableControls";
import { BADGE_BASE, BADGE_PALETTES } from "@/lib/badgeStyles";
import { cn } from "@/lib/utils";
import useWorkspaceViewPreference from "@/hooks/useWorkspaceViewPreference";
import { useTablePreferences } from "@/components/shared/TablePreferences";
import { getListDensityClasses } from "@/lib/tablePresentation";
import EditChecklistStudentNumberDialog from "./EditChecklistStudentNumberDialog";
import PermanentAdmissionRecordSheet, { CHECKLIST_HIGHLIGHTED_PHRASES } from "./PermanentAdmissionRecordSheet";
import StudentComplianceKpiCards from "./StudentComplianceKpiCards";
import ChecklistStatusBadge from "./ChecklistStatusBadge";
import { StudentChecklistVerificationSkeleton, StudentComplianceListSkeleton } from "./skeletons/StudentComplianceSkeleton";

const sortOptions = [
  { value: "docType", label: "Requirement Name" },
  { value: "status", label: "Status" },
  { value: "category", label: "Category" },
];
const groupOptions = [
  { value: "category", label: "Category" },
  { value: "status", label: "Status" },
  { value: "none", label: "No grouping" },
];

function getRequirementCategoryIcon(category) {
  const cat = String(category || "").toLowerCase();
  if (cat.includes("admission") || cat.includes("identity") || cat.includes("birth")) {
    return "Contact01Icon";
  }
  if (cat.includes("academic") || cat.includes("record") || cat.includes("137") || cat.includes("grade")) {
    return "GraduationScrollIcon";
  }
  if (cat.includes("graduation") || cat.includes("exit") || cat.includes("diploma") || cat.includes("transcript")) {
    return "GraduationScrollIcon";
  }
  return "File02Icon";
}

function RequirementStatus({ status }) {
  if (!status) return null;
  return (
    <ChecklistStatusBadge complete={status === "Submitted"}>{status}</ChecklistStatusBadge>
  );
}

export default function StudentComplianceTab({ authUser, onChecklistChange, onStudentNumberSaved }) {
  const [studentNumberDialogOpen, setStudentNumberDialogOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedRequirementId, setSelectedRequirementId] = useState(null);
  const [viewMode, setViewMode] = useWorkspaceViewPreference("student_compliance", "viewMode", "list", { user: authUser });
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [filters, setFilters] = useWorkspaceViewPreference("student_compliance", "filterRules", [], { user: authUser });
  const [sortBy, setSortBy] = useWorkspaceViewPreference("student_compliance", "sortBy", "docType", { user: authUser });
  const [sortOrder, setSortOrder] = useWorkspaceViewPreference("student_compliance", "sortOrder", "asc", { user: authUser });
  const [groupBy, setGroupBy] = useWorkspaceViewPreference("student_compliance", "groupBy", "none", { user: authUser });
  const { density } = useTablePreferences();
  const densityClasses = getListDensityClasses(density);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/student/compliance", { cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "Could not load the checklist.");
        if (controller.signal.aborted) return;
        setError("");
        setData(result.data);
        onChecklistChange?.(result.data.student ? result.data : null);
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [version, onChecklistChange, authUser?.checklist_student_no]);

  function refresh() {
    setError("");
    setLoading(true);
    setVersion((value) => value + 1);
  }

  const initialLoading = loading && !data;
  const verified = Boolean(data?.student);
  const canVerify = authUser?.client_type === "Student";
  const requirements = data?.requirements || [];
  const categories = [...new Set(requirements.map(({ category }) => category))];
  const fields = [
    { key: "status", label: "Status", options: [{ label: "Submitted", value: "submitted" }, { label: "Missing", value: "missing" }] },
    { key: "category", label: "Category", options: categories.map((value) => ({ label: value, value })) },
  ];
  const applicableFilters = verified ? filters : [];
  const term = search.trim().toLowerCase();
  const filtered = requirements.filter((item) => {
    if (![item.name, item.category].some((value) => value.toLowerCase().includes(term))) return false;
    return applicableFilters.every(({ fieldKey, operator, value }) => {
      const current = fieldKey === "status" ? item.status.toLowerCase() : item.category;
      return operator === "is_not" ? current !== value : current === value;
    });
  });
  filtered.sort((a, b) => {
    const key = verified ? sortBy : "docType";
    const order = verified && sortOrder.toLowerCase() === "desc" ? -1 : 1;
    return order * (a[key] || a.name).localeCompare(b[key] || b.name);
  });
  const groups = new Map();
  for (const item of filtered) {
    const label = verified ? (groupBy === "none" ? "" : item[groupBy]) : item.category;
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(item);
  }

  const selectedIndex = filtered.findIndex(({ id }) => id === selectedRequirementId);
  const groupedRequirements = [...groups].map(([label, items]) => ({ key: label, label, items }));

  function clearFilters() {
    setSearch("");
    setFilters([]);
  }

  function toggleGroup(key) {
    setCollapsedGroups((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <Card className="flex flex-[1_0_auto] h-auto w-full min-w-0 flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
      <PageHeader
        icon={verified ? "CheckListIcon" : undefined}
        title={verified ? (
          <div className="flex flex-wrap items-baseline gap-2">
            <span>Document Checklist &amp; Compliance</span>
            <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">
              {requirements.length} {requirements.length === 1 ? "requirement" : "requirements"} · {data.student.studentNo}
            </span>
          </div>
        ) : "Document Checklist"}
        description={verified ? "Track your submitted credentials and monitor required documents for university records compliance." : "Find out which documents to prepare for enrollment and how to submit them."}
        className="p-6"
        titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
        descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
        actions={<RefreshButton onRefresh={refresh} isLoading={loading} title="Refresh Checklist" />}
      />
      {data && !canVerify && (
        <div className="w-full border-b border-blue-200 bg-blue-50 px-6 py-4 text-sm text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-100">
          <p className="font-semibold">For current students</p>
          <p className="mt-1 text-blue-800 dark:text-blue-200">
            This checklist covers documents students submit for enrollment. Personal submission status is available after verification.
          </p>
        </div>
      )}
      {error && filtered.length > 0 && (
        <p role="alert" className="border-b border-border px-6 py-3 text-sm text-destructive">{error}</p>
      )}
      {canVerify && !verified && (data || initialLoading) && (
        <div className={cn(
          "flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3",
          initialLoading
            ? "bg-muted/30"
            : data.needsEnrollmentMatch || data.unavailable
              ? "bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100"
              : "bg-blue-50 text-blue-950 dark:bg-blue-950/30 dark:text-blue-100"
        )}>
          {initialLoading ? (
            <StudentChecklistVerificationSkeleton />
          ) : data.verificationUnavailable ? (
            <p role="status" className="text-sm">Personal checklist status is temporarily unavailable while the records system is being updated.</p>
          ) : data.unavailable ? (
            <p className="text-sm">Your Registrar record is unavailable. Contact the Registrar to check its status.</p>
          ) : (
            <>
              <p className="min-w-0 grow basis-64 text-sm">
                {data.needsEnrollmentMatch
                  ? "Your student number and verified email didn’t match a Registrar record. Check your number or ask the Registrar to confirm your enrollment email."
                  : "Add your student number to see your personal checklist status."}
              </p>
              <Button type="button" size="sm" className="h-11 sm:h-9" onClick={() => setStudentNumberDialogOpen(true)}>
                {data.needsEnrollmentMatch ? "Edit Student Number" : "Add Student Number"}
              </Button>
            </>
          )}
        </div>
      )}
      {verified && (
        <div className="px-6 pt-4 pb-6">
          <StudentComplianceKpiCards summary={data.summary} />
        </div>
      )}
      {(data || initialLoading || error) && (
        <>
          <DataViewToolbar
            label="Compliance search, views, and filters"
            className="border-t border-border dark:border-border p-4 sm:px-5 sm:py-3 gap-2 bg-white dark:bg-card justify-between select-none"
          >
            <div className="flex min-w-0 items-center gap-2">
              <DashboardSearch label="Search requirements" placeholder="Search requirements..." value={search}
                onChange={setSearch} count={filtered.length} loading={loading} />
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {verified && (
                <>
                  <FilterPopover fields={fields} filters={filters} onFiltersChange={setFilters} entityLabel="requirements" />
                  <SortPopover options={sortOptions} sortBy={sortBy} sortOrder={sortOrder}
                    onSortByChange={(value) => { setSortBy(value); setSortOrder("asc"); }} onSortOrderChange={setSortOrder} />
                  <GroupPopover options={groupOptions} groupBy={groupBy} onGroupByChange={setGroupBy} />
                </>
              )}
              <SegmentedControl value={viewMode} onValueChange={setViewMode} variant="capsule"
                className="inline-grid grid-flow-col auto-cols-fr shrink-0" items={[
                  { value: "grid", title: "Grid View", ariaLabel: "Grid View", disabled: initialLoading, icon: <ViewModeIcon mode="grid" className="text-sm" /> },
                  { value: "list", title: "List View", ariaLabel: "List View", disabled: initialLoading, icon: <ViewModeIcon mode="list" className="text-sm" /> },
                ]} />
            </div>
          </DataViewToolbar>
          <ActiveFilterChips chips={applicableFilters.map((rule) => ({
            id: rule.id,
            groupLabel: fields.find(({ key }) => key === rule.fieldKey)?.label,
            label: `${rule.operator === "is_not" ? "Not " : ""}${fields.find(({ key }) => key === rule.fieldKey)?.options.find(({ value }) => value === rule.value)?.label || rule.value}`,
            onRemove: () => setFilters((current) => current.filter(({ id }) => id !== rule.id)),
          }))} onClearAll={clearFilters} className="border-t border-border dark:border-border bg-white dark:bg-card px-6 py-2.5" />
          <div className={cn(
            "flex min-w-0 flex-[1_0_auto] flex-col border-t border-border dark:border-border",
            !initialLoading && filtered.length > 0 && viewMode === "grid" && "p-6"
          )}>
            {initialLoading ? (
              viewMode === "grid" ? (
                <DataContentSkeleton viewMode="grid" />
              ) : (
                <StudentComplianceListSkeleton density={density} />
              )
            ) : error && filtered.length === 0 ? (
              <EmptyState
                icon={AlertCircleIcon}
                title="Could Not Load Document Checklist"
                description="Try loading the checklist again."
              >
                <Button variant="outline" size="sm" onClick={refresh}>Try Again</Button>
              </EmptyState>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={requirements.length ? Search01Icon : CheckListIcon}
                title={requirements.length ? "No Matches Found" : "No Requirements Available"}
                description={requirements.length
                  ? "Adjust your search or reset your filters."
                  : "Registrar enrollment requirements will appear here when available."}
              >
                {requirements.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>Reset Filters</Button>
                )}
              </EmptyState>
            ) : viewMode === "list" ? (
              <div className="flex flex-col flex-1 divide-y divide-border dark:divide-border bg-white dark:bg-card font-jakarta">
                {groupedRequirements.map((group) => {
                  const isCollapsed = Boolean(collapsedGroups[group.key]);
                  const isGrouped = Boolean(group.label);

                  return (
                    <div key={group.key} className="flex flex-col">
                      {/* Collapsible Group Header (if grouped) */}
                      {isGrouped && (
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.key)}
                          className="w-full flex items-center justify-between border-b border-border text-left hover:bg-gray-100/60 dark:hover:bg-zinc-800/40 transition-colors select-none cursor-pointer px-5 py-2.5 bg-gray-50/80 dark:bg-zinc-900/60 sticky top-0 z-10 backdrop-blur-xs"
                          aria-expanded={!isCollapsed}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <ArrowDown01Icon
                              size="1em"
                              className={cn(
                                "text-gray-400 dark:text-zinc-500 text-sm transition-transform duration-200 shrink-0",
                                isCollapsed && "-rotate-90"
                              )}
                            />
                            <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate">
                              {group.label}
                            </span>
                            <span className={cn(BADGE_BASE, BADGE_PALETTES.slate)}>
                              {group.items.length}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-medium">
                            {isCollapsed ? "Expand" : "Collapse"}
                          </span>
                        </button>
                      )}

                      {/* Group Items */}
                      {!isCollapsed && (
                        <div className="divide-y divide-gray-100 dark:divide-zinc-800/60">
                          {group.items.map((item) => {
                            const description = item.description;
                            const highlightedPhrases = [item.docType, ...CHECKLIST_HIGHLIGHTED_PHRASES];
                            const isSubmitted = item.status === "Submitted";

                            return (
                              <div
                                key={item.id}
                                className={cn(
                                  "group relative flex items-center justify-between hover:bg-gray-50/80 dark:hover:bg-zinc-800/40 transition-colors border-b border-gray-100 dark:border-zinc-800/60 last:border-b-0",
                                  densityClasses.paddingX,
                                  densityClasses.paddingY,
                                  densityClasses.gap,
                                  densityClasses.minHeight
                                )}
                              >
                                {/* Left: Category Icon, Title, and Formatted Description Context */}
                                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 mr-2">
                                  <div
                                    className={cn(
                                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs",
                                      isSubmitted
                                        ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                                        : item.status === "Missing"
                                          ? "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                                          : "bg-muted text-muted-foreground"
                                    )}
                                  >
                                    <AppIcon className="text-base" icon={getRequirementCategoryIcon(item.category)} />
                                  </div>

                                  <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors truncate">
                                      {item.docType}
                                    </span>

                                    {description && (
                                      <span className="mt-0.5 block max-w-xl truncate text-[11px] font-normal text-gray-500 sm:text-xs dark:text-zinc-400">
                                        <NarrativeText text={description} mode="compact" highlightedPhrases={highlightedPhrases} />
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Category and submission status */}
                                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                                  <span className={cn(BADGE_BASE, BADGE_PALETTES.gray, "hidden sm:inline-flex")}>
                                    {item.category}
                                  </span>

                                  <RequirementStatus status={item.status} />
                                  <div className="flex items-center justify-end ml-1">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button type="button" onClick={() => setSelectedRequirementId(item.id)}
                                          aria-label={`View details for ${item.name}`}
                                          className="table-action-button rounded-lg cursor-pointer after:absolute after:inset-0 focus-visible:after:ring-1 focus-visible:after:ring-inset focus-visible:after:ring-ring">
                                          <ViewIcon size="1em" className="text-[14px]" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>View Details</TooltipContent>
                                    </Tooltip>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-6">
                {groupedRequirements.map((group) => (
                  <div key={group.key} className="space-y-4">
                    {group.label && (
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                          {group.label}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-zinc-500">
                          {group.items.length} {group.items.length === 1 ? "requirement" : "requirements"}
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
                      {group.items.map((item) => {
                        const isSubmitted = item.status === "Submitted";

                        return (
                          <div
                            key={item.id}
                            className="group relative flex flex-col justify-between rounded-3xl bg-[#f5f5f7] dark:bg-zinc-850/60 p-6 sm:p-7 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xs border border-transparent dark:border-white/5"
                          >
                            <div className="flex flex-col flex-grow">
                              <div className="flex items-start justify-between gap-4 mb-4">
                                <div
                                  className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                                    isSubmitted
                                      ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                                      : item.status === "Missing"
                                          ? "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                                          : "bg-muted text-muted-foreground"
                                  )}
                                >
                                  <AppIcon className={cn("text-xl", getRequirementCategoryIcon(item.category))} />
                                </div>

                                <div>
                                  <RequirementStatus status={item.status} />
                                </div>
                              </div>

                              <div className="mb-2">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                                  {item.category}
                                </span>
                                <h4 className="text-[15px] font-bold text-gray-900 dark:text-zinc-50 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors mt-0.5 break-words">
                                  {item.docType}
                                </h4>
                              </div>

                              {item.description && (
                                <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-gray-600 dark:text-zinc-300">
                                  <NarrativeText
                                    text={item.description}
                                    mode="compact"
                                    highlightedPhrases={[item.docType, ...CHECKLIST_HIGHLIGHTED_PHRASES]}
                                  />
                                </p>
                              )}
                            </div>

                            <div className="flex justify-end border-t border-black/[0.04] pt-3 dark:border-white/[0.06]">
                              <button
                                type="button"
                                onClick={() => setSelectedRequirementId(item.id)}
                                aria-label={`View details for ${item.name}`}
                                className="flex cursor-pointer items-center gap-1 rounded-lg text-xs font-semibold text-pup-maroon after:absolute after:inset-0 after:rounded-3xl focus-visible:after:ring-1 focus-visible:after:ring-inset focus-visible:after:ring-ring dark:text-red-400"
                              >
                                View Details <ArrowRight02Icon size="1em" aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      {studentNumberDialogOpen && (
        <EditChecklistStudentNumberDialog
          user={authUser}
          onClose={() => setStudentNumberDialogOpen(false)}
          onSaved={(number) => {
            setStudentNumberDialogOpen(false);
            onStudentNumberSaved(number);
            refresh();
          }}
        />
      )}
      {selectedIndex >= 0 && (
        <PermanentAdmissionRecordSheet
          open
          statusOnly
          onOpenChange={(open) => { if (!open) setSelectedRequirementId(null); }}
          item={filtered[selectedIndex]}
          items={filtered}
          currentIndex={selectedIndex}
          onNavigatePrev={() => setSelectedRequirementId(filtered[selectedIndex - 1]?.id)}
          onNavigateNext={() => setSelectedRequirementId(filtered[selectedIndex + 1]?.id)}
        />
      )}
    </Card>
  );
}
