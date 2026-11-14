"use client";

import DataGroupHeader from "@/components/shared/DataGroupHeader";
import { Fragment, useEffect, useState } from "react";
import { Mail01Icon, Search01Icon, UserGroupIcon, UserStatusIcon } from "hugeicons-react";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import ConfirmModal from "@/components/shared/ConfirmModal";
import { TableActions } from "@/components/shared/TableActions";
import DashboardSearch from "@/components/shared/DashboardSearch";
import DataContentSkeleton from "@/components/shared/DataContentSkeleton";
import DataViewToolbar from "@/components/shared/DataViewToolbar";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import TablePagination from "@/components/shared/TablePagination";
import TableScrollControls from "@/components/shared/TableScrollControls";
import { ColumnsPopover, FilterPopover, GroupPopover, SortPopover } from "@/components/systemadmin/OfficeTableControls";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableText } from "@/components/ui/table";
import useTableScroll from "@/hooks/useTableScroll";
import useViewPreference from "@/hooks/useViewPreference";
import { BADGE_BASE, BADGE_PALETTES } from "@/lib/badgeStyles";
import { STUDENT_AFFILIATIONS } from "@/lib/studentAffiliation";
import { formatPHDateTime } from "@/lib/timeFormat";
import { cn, formatTitleCase } from "@/lib/utils";

const COLUMNS = [
  {
    key: "name",
    label: "Name",
    schema: { kind: "text", maxWidth: 340 },
    render: ({ id, name, avatarFilename }) => {
      const displayName = formatTitleCase(name);
      return (
        <div className="flex min-w-0 items-center gap-2.5">
          <ProfileAvatar
            accountId={id}
            avatarFilename={avatarFilename || null}
            name={displayName}
            className="size-7 shrink-0"
            fallbackClassName="text-[11px]"
          />
          <TableText constrained>{displayName || "—"}</TableText>
        </div>
      );
    },
  },
  { key: "email", label: "Email", schema: { kind: "text", maxWidth: 340 }, render: ({ email }) => <TableText constrained>{email || "—"}</TableText> },
  { key: "affiliation", label: "Affiliation", schema: "category", render: ({ affiliation }) => affiliationLabel(affiliation) || "—" },
  { key: "status", label: "Status", schema: "status", render: ({ status }) => (
    <span className={cn(BADGE_BASE, status === "Active" ? BADGE_PALETTES.emerald : BADGE_PALETTES.gray)}>{status}</span>
  ) },
  { key: "studentNo", label: "Linked Student No.", schema: "identifier", render: ({ studentNo }) => studentNo || "—" },
  { key: "createdAt", label: "Created", schema: "date", render: ({ createdAt }) => formatPHDateTime(createdAt) },
];
const DEFAULT_COLUMNS = COLUMNS.map(({ key }) => key);
const textCollator = new Intl.Collator("en-PH", { sensitivity: "base", numeric: true });
const STATUS_OPTIONS = ["Active", "Inactive", "Archived"].map((value) => ({ value, label: value }));
const FILTER_FIELDS = [
  { key: "affiliation", label: "Affiliation", options: STUDENT_AFFILIATIONS },
  { key: "status", label: "Status", options: STATUS_OPTIONS },
];
const GROUP_OPTIONS = [...FILTER_FIELDS, { key: "none", label: "No grouping" }];

function affiliationLabel(value) {
  return STUDENT_AFFILIATIONS.find((option) => option.value === value)?.label || value;
}

function sortValue(account, key) {
  if (key === "createdAt") return Date.parse(account.createdAt);
  if (key === "affiliation") return affiliationLabel(account.affiliation);
  return account[key];
}

const ACCOUNT_ACTIONS = {
  deactivate: { label: "Deactivate Account", message: "This account will be signed out and unable to sign in until it is reactivated.", success: "Portal Account Deactivated" },
  reactivate: { label: "Reactivate Account", message: "This restores portal account access. Existing student record restrictions still apply.", success: "Portal Account Reactivated" },
  "send-reset": { label: "Send Password Reset", message: "Email a password reset link to the account’s verified address. The link expires in 15 minutes.", success: "Password Reset Email Sent" },
};

export default function OdrsPortalAccountsTab({ showToast }) {
  const [accounts, setAccounts] = useState(null);
  const [search, setSearch] = useViewPreference("portal-accounts", "search", "");
  const [filters, setFilters] = useViewPreference("portal-accounts", "filterRules", []);
  const [sortBy, setSortBy] = useViewPreference("portal-accounts", "sortBy", "createdAt");
  const [sortOrder, setSortOrder] = useViewPreference("portal-accounts", "sortOrder", "DESC");
  const [groupBy, setGroupBy] = useViewPreference("portal-accounts", "groupBy", "none");
  const [visibleColumns, setVisibleColumns] = useViewPreference("portal-accounts", "visibleColumns", DEFAULT_COLUMNS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useViewPreference("portal-accounts", "pageSize", 10);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const actionDetails = pendingAction && ACCOUNT_ACTIONS[pendingAction.action];
  const displayedColumns = COLUMNS.filter(({ key }) => visibleColumns.includes(key));
  const tableSchema = [...displayedColumns.map(({ schema }) => schema), "actions"];
  const tableWidth = displayedColumns.length === COLUMNS.length ? "min-w-[850px]" : undefined;

  function refreshAccounts() {
    setLoading(true);
    setError("");
    setRefreshVersion((version) => version + 1);
  }

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

  function selectAction(account, action) {
    setActionError("");
    setPendingAction({ account, action });
  }

  async function confirmAction() {
    if (!pendingAction || saving) return;
    const { account, action } = pendingAction;
    setSaving(true);
    setActionError("");
    try {
      const response = await fetch("/api/admin/odrs-portal-accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: account.id, action }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "Could not complete the account action.");
      setPendingAction(null);
      showToast?.({ title: ACCOUNT_ACTIONS[action].success });
      refreshAccounts();
    } catch (error) {
      setActionError(error.message);
    } finally {
      setSaving(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setFilters([]);
    setPage(1);
  }

  const term = search.trim().toLowerCase();
  const hasActiveFilters = Boolean(term || filters.length);
  const results = (accounts || []).filter((account) =>
    [account.name, account.email, account.studentNo].some((value) => (value || "").toLowerCase().includes(term)) &&
    filters.every(({ fieldKey, operator, value }) =>
      operator === "is_not" ? account[fieldKey] !== value : account[fieldKey] === value
    )
  );
  const direction = sortOrder === "ASC" ? 1 : -1;
  results.sort((a, b) => {
    const left = sortValue(a, sortBy);
    const right = sortValue(b, sortBy);
    if (sortBy === "createdAt") return direction * ((left || 0) - (right || 0));
    return direction * textCollator.compare(left || "", right || "");
  });
  const currentPage = Math.min(page, Math.max(1, Math.ceil(results.length / pageSize)));
  const groups = new Map();
  for (const account of results) {
    const label = groupBy === "affiliation" ? affiliationLabel(account.affiliation) || "Unspecified affiliation"
      : groupBy === "status" ? account.status || "Unspecified status" : "";
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push({ account, label });
  }
  const visibleAccounts = [...groups.values()].flat().slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const { containerRef, canScroll, canScrollLeft, canScrollRight, isScrolled, scrollLeft, scrollRight, resetScroll } =
    useTableScroll([visibleAccounts.length, visibleColumns.join(","), loading]);

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-white dark:bg-card">
      <PageHeader
        title="ODRS Portal Accounts"
        description="Manage accounts used to submit and track online document requests."
        actions={<RefreshButton title="Refresh Portal Accounts" isLoading={loading} onRefresh={refreshAccounts} />}
      />
      <DataViewToolbar label="Portal account search and table controls" className="gap-2 border-b border-border px-5 py-3">
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
          <SortPopover options={COLUMNS} sortBy={sortBy} sortOrder={sortOrder}
            onSortByChange={(key) => { setSortBy(key); setSortOrder("ASC"); setPage(1); }}
            onSortOrderChange={(order) => { setSortOrder(order); setPage(1); }} />
          <GroupPopover options={GROUP_OPTIONS} groupBy={groupBy}
            onGroupByChange={(value) => { setGroupBy(value); setPage(1); }} />
          <ColumnsPopover columns={COLUMNS} visibleColumns={visibleColumns} minVisible={2}
            onVisibleColumnsChange={setVisibleColumns} />
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
        onClearAll={clearFilters}
      />
      {error && <p role="alert" className="px-5 py-3 text-sm text-destructive">{error}</p>}
      {loading && !accounts ? (
        <DataContentSkeleton columns={tableSchema} className={tableWidth} />
      ) : visibleAccounts.length ? (
        <div ref={containerRef} className="min-w-0 overflow-x-auto">
          <Table columns={tableSchema} className={tableWidth}>
            <TableHeader>
              <TableRow>
                {displayedColumns.map(({ key, label }) => (
                  <TableHead key={key} aria-sort={sortBy === key ? (sortOrder === "ASC" ? "ascending" : "descending") : undefined}>{label}</TableHead>
                ))}
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleAccounts.map(({ account, label }, index) => (
                <Fragment key={account.id}>
                  {label && label !== visibleAccounts[index - 1]?.label && (
                    <DataGroupHeader label={label} count={visibleAccounts.filter((item) => item.label === label).length} colSpan={tableSchema.length} />
                  )}
                  <TableRow>
                    {displayedColumns.map(({ key, render }) => <TableCell key={key}>{render(account)}</TableCell>)}
                    <TableCell>
                      <TableActions label={`Actions for ${formatTitleCase(account.name) || account.email || "portal account"}`} actions={[
                        account.status === "Active" && { label: "Deactivate Account", icon: UserStatusIcon, onClick: () => selectAction(account, "deactivate") },
                        account.status === "Inactive" && { label: "Reactivate Account", icon: UserStatusIcon, onClick: () => selectAction(account, "reactivate") },
                        account.canSendReset && { label: "Send Password Reset", icon: Mail01Icon, onClick: () => selectAction(account, "send-reset") },
                      ]} />
                    </TableCell>
                  </TableRow>
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : !error && (
        <EmptyState
          icon={hasActiveFilters ? Search01Icon : UserGroupIcon}
          title={hasActiveFilters ? "No Matching Portal Accounts" : "No Portal Accounts"}
          description={hasActiveFilters ? "Adjust your search or reset your filters." : "Completed portal signups will appear here."}
        >
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>Reset Filters</Button>
          )}
        </EmptyState>
      )}
      <TablePagination label="Portal account pages" page={currentPage} pageSize={pageSize} totalCount={results.length}
        displayedCount={visibleAccounts.length} loading={loading} onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
      {pendingAction && (
        <ConfirmModal
          open
          title={actionDetails.label}
          message={actionDetails.message}
          selectedItems={[formatTitleCase(pendingAction.account.name) || pendingAction.account.email || "Portal account"]}
          selectedItemsLabel="Portal account"
          note={actionError || undefined}
          confirmLabel={actionDetails.label}
          variant={pendingAction.action === "deactivate" ? "warning" : "brand"}
          isLoading={saving}
          onConfirm={confirmAction}
          onCancel={() => { if (!saving) setPendingAction(null); }}
          onOpenChange={(open) => { if (!open && !saving) setPendingAction(null); }}
        />
      )}
    </section>
  );
}
