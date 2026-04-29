"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPHDateTimeParts } from "@/lib/timeFormat";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";

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
        {/* Reverted Header with filters */}
        <div className="p-4 bg-gray-50/50 flex-none border-b border-gray-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
            <div className="lg:col-span-1">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700 uppercase">
                  Search Records
                </label>
                {(searchQuery !== "" || statusFilter !== "All") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("All");
                    }}
                    className="h-5 px-1.5 text-[9px] font-bold text-pup-maroon hover:bg-red-50 hover:text-pup-darkMaroon rounded-brand"
                  >
                    CLEAR ALL
                  </Button>
                )}
              </div>
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

        {/* Table content - Modern Notification Style kept */}
        <CardContent className="p-6 flex-1 flex flex-col min-h-0 bg-white">
          {isLoading ? (
            <div className="flex-1 flex flex-col space-y-4">
              <div className="flex-1 border border-gray-200 rounded-brand overflow-hidden flex flex-col bg-white">
                <Skeleton className="h-12 w-full rounded-none" />
                <div className="divide-y divide-gray-100 flex-1">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="p-4 flex items-center justify-between">
                      <div className="flex-1 grid grid-cols-5 gap-4">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : error ? (
            <Empty className="h-[320px] flex flex-col items-center justify-center text-center text-gray-500 border-0">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                  <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon" />
                </EmptyMedia>
                <EmptyTitle className="text-lg font-bold text-gray-900">Could not load report</EmptyTitle>
                <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                  {error}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto overflow-x-auto border border-gray-200 rounded-brand bg-white shadow-xs">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                      <th className="p-3 font-bold">Student Identity</th>
                      <th className="p-3 font-bold">Document Type</th>
                      <th className="p-3 font-bold">Original File</th>
                      <th className="p-3 font-bold">Review Status</th>
                      <th className="p-3 font-bold">Date Uploaded</th>
                      <th className="p-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredRecords.length === 0 ? (
                      <tr className="border-0 hover:bg-transparent">
                        <td colSpan={6} className="p-0 border-0">
                          <Empty className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500 border-0">
                            <EmptyHeader className="flex flex-col items-center gap-0">
                              <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                                <i className="ph-duotone ph-stack text-3xl text-pup-maroon"></i>
                              </EmptyMedia>
                              <EmptyTitle className="text-lg font-bold text-gray-900">No records found</EmptyTitle>
                              <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                                {searchQuery
                                  ? "No records match your search criteria. Try adjusting your filters."
                                  : "We couldn't find any digital records matching your current filter criteria."}
                              </EmptyDescription>
                            </EmptyHeader>
                          </Empty>
                        </td>
                      </tr>
                    ) : (
                      paginatedRecords.map((r) => {
                        const uploaded = formatPHDateTimeParts(r.created_at);
                        return (
                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3">
                            <div className="flex flex-col py-1">
                              <span className="font-bold text-gray-900 text-sm">
                                {r.student_name || "Unknown Student"}
                              </span>
                              <span className="font-mono text-[11px] text-gray-500 mt-0.5">
                                {r.student_no}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-50 text-pup-maroon border border-red-100 text-[11px] font-bold">
                              {r.doc_type}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="text-xs font-medium text-gray-600 font-mono truncate max-w-[180px] block" title={r.original_filename}>
                              {r.original_filename}
                            </span>
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={`${getStatusBadge(r.approval_status)} font-black uppercase text-[10px] px-2.5 py-1 rounded-full border shadow-xs flex w-max items-center gap-1.5`}
                            >
                              <i className={`ph-fill ${getStatusIcon(r.approval_status)}`}></i>
                              {r.approval_status || "Pending"}
                            </Badge>
                          </td>
                          <td className="p-3 text-gray-600 font-medium">
                            <div className="font-mono text-[11px]">
                              {uploaded.date}
                            </div>
                            <div className="text-[10px] opacity-70">
                              {uploaded.time}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {r.approval_status === "Declined" ? (
                                <span className="px-3 h-9 inline-flex items-center rounded-brand border border-gray-200 text-gray-400 font-bold text-[10px] uppercase tracking-wide bg-gray-50">
                                  <i className="ph-bold ph-file-x mr-1.5"></i>
                                  File Removed
                                </span>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePreview(r)}
                                  className="h-9 px-3 font-bold text-xs border-gray-300 text-gray-700 hover:text-pup-maroon hover:bg-red-50 hover:border-pup-maroon rounded-brand transition-all shadow-sm"
                                >
                                  <i className="ph-bold ph-eye mr-1.5"></i>
                                  VIEW
                                </Button>
                              )}
                              {r.approval_status === "Pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => onApprove(r.id)}
                                    className="h-9 px-3 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-brand shadow-sm"
                                  >
                                    <i className="ph-bold ph-check mr-1.5"></i>
                                    APPROVE
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => onDecline(r.id)}
                                    className="h-9 px-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-brand shadow-sm"
                                  >
                                    <i className="ph-bold ph-x mr-1.5"></i>
                                    DECLINE
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      })
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
                      className="h-8 text-xs font-bold text-gray-600 h-8 rounded-brand"
                    >
                      <i className="ph-bold ph-caret-left mr-1"></i> PREVIOUS
                    </Button>
                    <div className="px-3 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-brand h-8 flex items-center justify-center min-w-12 shadow-sm">
                      {displayPage} / {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={displayPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="h-8 text-xs font-bold text-gray-600 h-8 rounded-brand"
                    >
                      NEXT <i className="ph-bold ph-caret-right ml-1"></i>
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
