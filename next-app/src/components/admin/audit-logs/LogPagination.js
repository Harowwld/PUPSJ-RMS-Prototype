"use client";

import TablePagination from "@/components/shared/TablePagination";

export default function LogPagination({ logTotal = 0, logPage, setLogPage, itemsPerPage, logsPerPage, handleItemsPerPageChange, displayCount, loading = false }) {
  return <TablePagination label="Audit log pages" page={logPage} pageSize={itemsPerPage || logsPerPage || 10} totalCount={logTotal} displayedCount={displayCount} onPageChange={setLogPage} onPageSizeChange={handleItemsPerPageChange} loading={loading} />;
}
