"use client";

import { useEffect, useState } from "react";
import { Search01Icon, UserGroupIcon } from "hugeicons-react";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import DashboardSearch from "@/components/shared/DashboardSearch";
import DataContentSkeleton from "@/components/shared/DataContentSkeleton";
import DataViewToolbar from "@/components/shared/DataViewToolbar";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import TablePagination from "@/components/shared/TablePagination";
import TableScrollControls from "@/components/shared/TableScrollControls";
import { FilterPopover } from "@/components/systemadmin/OfficeTableControls";
import { EmptyState } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableText } from "@/components/ui/table";
import useTableScroll from "@/hooks/useTableScroll";
import { BADGE_BASE, BADGE_PALETTES } from "@/lib/badgeStyles";
import { STUDENT_AFFILIATIONS } from "@/lib/studentAffiliation";
import { formatPHDateTime } from "@/lib/timeFormat";
import { cn } from "@/lib/utils";

const COLUMNS = [{ kind: "text", maxWidth: 340 }, { kind: "text", maxWidth: 340 }, "category", "status", "identifier", "date"];
const TABLE_WIDTH = "min-w-[850px]";
const STATUS_OPTIONS = ["Active", "Inactive", "Archived"].map((value) => ({ value, label: value }));
const FILTER_FIELDS = [
  { key: "affiliation", label: "Affiliation", options: STUDENT_AFFILIATIONS },
  { key: "status", label: "Status", options: STATUS_OPTIONS },
];

export default function OdrsPortalAccountsTab() {
  const [accounts, setAccounts] = useState(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/admin/odrs-portal-accounts", { cache: "no-store", signal: controller.signal });
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.error || "Unable to load portal accounts.");
        if (!controller.signal.aborted) setAccounts(payload.data);
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [refreshVersion]);

  const term = search.trim().toLowerCase();
  const results = (accounts || []).filter((account) =>
    [account.name, account.email, account.studentNo].some((value) => (value || "").toLowerCase().includes(term)) &&
    filters.every(({ fieldKey, operator, value }) =>
      operator === "is_not" ? account[fieldKey] !== value : account[fieldKey] === value
    )
  );
  const currentPage = Math.min(page, Math.max(1, Math.ceil(results.length / pageSize)));
  const visibleAccounts = results.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const { containerRef, canScroll, canScrollLeft, canScrollRight, isScrolled, scrollLeft, scrollRight, resetScroll } =
    useTableScroll([visibleAccounts.length, loading]);

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-white dark:bg-card">
      <PageHeader
        title="ODRS Portal Accounts"
        description="View accounts used to submit and track online document requests."
        actions={<RefreshButton title="Refresh Portal Accounts" isLoading={loading} onRefresh={() => {
          setLoading(true);
          setError("");
          setRefreshVersion((version) => version + 1);
        }} />}
      />
      <DataViewToolbar label="Portal account search and filters" className="gap-2 border-b border-border px-5 py-3">
        <DashboardSearch
          label="Search portal accounts"
          placeholder="Search name, email or student number"
          value={search}
          count={results.length}
          loading={loading}
          onChange={(value) => { setSearch(value); setPage(1); }}
        />
        <div className="ml-auto flex items-center gap-2">
          <FilterPopover fields={FILTER_FIELDS} filters={filters} maxRulesPerField={1} entityLabel="accounts"
            onFiltersChange={(rules) => { setFilters(rules); setPage(1); }} />
          {visibleAccounts.length > 0 && canScroll && <TableScrollControls scrollContainerRef={containerRef}
            canScrollLeft={canScrollLeft} canScrollRight={canScrollRight} isScrolled={isScrolled}
            onScrollLeft={scrollLeft} onScrollRight={scrollRight} onResetScroll={resetScroll} />}
        </div>
      </DataViewToolbar>
      <ActiveFilterChips
        chips={filters.map((rule) => {
          const field = FILTER_FIELDS.find(({ key }) => key === rule.fieldKey);
          const option = field?.options.find(({ value }) => value === rule.value);
          return {
            id: rule.id,
            groupLabel: field?.label,
            label: `${rule.operator === "is_not" ? "Not " : ""}${option?.label || rule.value}`,
            onRemove: () => { setFilters((current) => current.filter(({ id }) => id !== rule.id)); setPage(1); },
          };
        })}
        onClearAll={() => { setFilters([]); setPage(1); }}
      />
      {error && <p role="alert" className="px-5 py-3 text-sm text-destructive">{error}</p>}
      {loading && !accounts ? (
        <DataContentSkeleton columns={COLUMNS} className={TABLE_WIDTH} />
      ) : visibleAccounts.length ? (
        <div ref={containerRef} className="min-w-0 overflow-x-auto">
          <Table columns={COLUMNS} className={TABLE_WIDTH}>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Affiliation</TableHead>
                <TableHead>Status</TableHead><TableHead>Linked Student No.</TableHead><TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell><TableText constrained>{account.name || "—"}</TableText></TableCell>
                  <TableCell><TableText constrained>{account.email || "—"}</TableText></TableCell>
                  <TableCell>{STUDENT_AFFILIATIONS.find(({ value }) => value === account.affiliation)?.label || account.affiliation || "—"}</TableCell>
                  <TableCell><span className={cn(BADGE_BASE, account.status === "Active" ? BADGE_PALETTES.emerald : BADGE_PALETTES.gray)}>{account.status}</span></TableCell>
                  <TableCell>{account.studentNo || "Unlinked"}</TableCell>
                  <TableCell>{formatPHDateTime(account.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : !error && (
        <EmptyState icon={term || filters.length ? Search01Icon : UserGroupIcon}
          title={term || filters.length ? "No Matching Portal Accounts" : "No Portal Accounts"}
          description={term || filters.length ? "Change the search or filters to find an account." : "Completed portal signups will appear here."} />
      )}
      <TablePagination label="Portal account pages" page={currentPage} pageSize={pageSize} totalCount={results.length}
        displayedCount={visibleAccounts.length} loading={loading} onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
    </section>
  );
}
