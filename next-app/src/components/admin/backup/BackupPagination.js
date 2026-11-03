"use client";

import TablePagination from "@/components/shared/TablePagination";

export default function BackupPagination({ page, setPage, startItem, endItem, totalCount = 0, itemsPerPage, handleItemsPerPageChange }) {
  return <TablePagination label="Backup pages" page={page} pageSize={itemsPerPage} totalCount={totalCount} displayedCount={totalCount > 0 ? Math.max(0, endItem - startItem + 1) : 0} onPageChange={setPage} onPageSizeChange={handleItemsPerPageChange ? (size) => handleItemsPerPageChange({ target: { value: size } }) : undefined} />;
}
