"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPHDateTimeParts } from "@/lib/timeFormat";

export default function DigitalRecordsReviewTab({
  records,
  isLoading,
  error = null,
  statusFilter,
  setStatusFilter,
  onRefresh,
  onApprove,
  onDecline,
  onPreviewDocument,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredRecords = records.filter((r) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      r.student_no?.toLowerCase().includes(query) ||
      r.student_name?.toLowerCase().includes(query) ||
      r.doc_type?.toLowerCase().includes(query) ||
      r.original_filename?.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const displayPage = Math.min(currentPage, totalPages);

  const paginatedRecords = useMemo(() => {
    const start = (displayPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, displayPage, itemsPerPage]);

  const getStatusBadge = (status) => {
    const styles = {
      Pending: "bg-amber-50 text-amber-700 border-amber-200",
      Approved: "bg-green-50 text-green-700 border-green-200",
      Declined: "bg-red-50 text-red-700 border-red-200",
    };
    return styles[status] || styles.Pending;
  };

  const getStatusIcon = (status) => {
    const icons = {
      Pending: "ph-clock",
      Approved: "ph-check-circle",
      Declined: "ph-x-circle",
    };
    return icons[status] || "ph-clock";
  };

  const handlePreview = (record) => {
    if (onPreviewDocument) {
      onPreviewDocument({
        docId: record.id,
        docType: record.doc_type,
        studentName: record.student_name || "Unknown",
        studentNo: record.student_no,
        refId: record.id,
      });
    }
  };


  return (
    <div className="flex flex-col w-full h-full gap-4 animate-fade-in font-inter">
      <Card className="flex-1 bg-white rounded-brand border border-gray-300 shadow-sm overflow-hidden flex flex-col">
        {/* Header with filters - integrated like DocumentsTab */}
        <div className="p-4 bg-gray-50/50 flex-none border-b border-gray-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
            <div className="lg:col-span-1">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                Search Records
              </label>
              <div className="relative">
                <i className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <Input
                  type="text"
                  placeholder="Student, doc type, filename..."
                  className="pl-10 h-10 w-full bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="lg:col-span-1">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                Status Filter
              </label>
              <select
                className="h-10 w-full rounded-brand border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Declined">Declined</option>
              </select>
            </div>

            <div className="lg:col-span-1">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                Items Per Page
              </label>
              <select
                className="h-10 w-full rounded-brand border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table content */}
        <CardContent className="p-6 flex-1 flex flex-col min-h-0">
          {isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-brand" />
                ))}
              </div>
              <Skeleton className="h-4 w-full max-w-md rounded-brand" />
              <Skeleton className="h-32 rounded-brand" />
            </div>
          ) : error ? (
            <div className="h-[320px] flex flex-col items-center justify-center text-center text-gray-500">
              <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon" />
              </div>
              <p className="text-lg font-bold text-gray-900">Could not load report</p>
              <p className="text-sm font-medium text-gray-600 mt-1 max-w-md">{error}</p>
            </div>
          ) : (
            <>
              <div className={`flex-1 overflow-auto rounded-brand ${filteredRecords.length === 0 ? '' : 'border border-gray-200'}`}>
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                      <th className="p-3 font-bold">Student Info</th>
                      <th className="p-3 font-bold">Document Type</th>
                      <th className="p-3 font-bold">Filename</th>
                      <th className="p-3 font-bold">Status</th>
                      <th className="p-3 font-bold">Uploaded</th>
                      <th className="p-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredRecords.length === 0 ? (
                      <tr className="border-0 hover:bg-transparent">
                        <td colSpan={6} className="p-0 border-0">
                          <div className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500">
                            <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                              <i className="ph-duotone ph-stack text-3xl text-pup-maroon"></i>
                            </div>
                            <div className="text-lg font-bold text-gray-900">
                              No records found
                            </div>
                            <div className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                              {searchQuery
                                ? "No records match your search criteria. Try adjusting your filters."
                                : "We couldn't find any digital records matching your current filter criteria."}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-900">
                                {r.student_name || "Unknown Student"}
                              </span>
                              <span className="font-mono text-xs text-gray-500">
                                {r.student_no}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="text-sm font-medium text-gray-700">
                              {r.doc_type}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="text-sm text-gray-600 font-mono truncate max-w-[200px] block">
                              {r.original_filename}
                            </span>
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={`${getStatusBadge(r.approval_status)} font-bold text-xs px-3 py-1 rounded-full border`}
                            >
                              <i className={`ph-fill ${getStatusIcon(r.approval_status)} mr-1.5`}></i>
                              {r.approval_status || "Pending"}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {(() => {
                              const t = formatPHDateTimeParts(r.created_at);
                              return (
                                <div className="font-mono text-[11px] text-gray-500 whitespace-nowrap">
                                  <div>{t.date}</div>
                                  {t.time ? <div>{t.time}</div> : null}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="p-3">
                            <div className="flex justify-end gap-2">
                              {r.approval_status === "Declined" ? (
                                <span className="px-3 h-9 inline-flex items-center rounded-brand border border-gray-200 text-gray-400 font-bold text-xs bg-gray-50">
                                  <i className="ph-bold ph-file-x mr-1.5"></i>
                                  File Removed
                                </span>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePreview(r)}
                                  className="h-9 px-3 font-bold text-xs border-gray-300 text-gray-700 hover:text-pup-maroon hover:bg-red-50 hover:border-pup-maroon rounded-brand"
                                >
                                  <i className="ph-bold ph-eye mr-1.5"></i>
                                  View
                                </Button>
                              )}
                              {r.approval_status !== "Declined" && r.approval_status !== "Approved" && (
                                <Button
                                  size="sm"
                                  onClick={() => onApprove(r.id)}
                                  className="h-9 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-brand"
                                >
                                  <i className="ph-bold ph-check mr-1.5"></i>
                                  Approve
                                </Button>
                              )}
                              {r.approval_status !== "Declined" && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => onDecline(r.id)}
                                  className="h-9 font-bold text-xs rounded-brand bg-red-600 hover:bg-red-700 text-white"
                                >
                                  <i className="ph-bold ph-x mr-1.5"></i>
                                  Decline
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs font-medium text-gray-500">
                  {filteredRecords.length > 0 ? (
                    <>
                      Showing {(displayPage - 1) * itemsPerPage + 1}-
                      {Math.min(displayPage * itemsPerPage, filteredRecords.length)} of{" "}
                      <strong className="text-gray-900">{filteredRecords.length}</strong>{" "}
                      digital records
                    </>
                  ) : null}
                </div>

                {filteredRecords.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={displayPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="h-8 text-xs font-bold text-gray-600"
                    >
                      <i className="ph-bold ph-caret-left"></i> Previous
                    </Button>
                    <div className="px-3 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-md h-8 flex items-center justify-center min-w-12 shadow-sm">
                      {displayPage} / {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={displayPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="h-8 text-xs font-bold text-gray-600"
                    >
                      Next <i className="ph-bold ph-caret-right"></i>
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
