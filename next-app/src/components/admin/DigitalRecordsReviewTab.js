"use client";

import { Button } from "@/components/ui/button";

export default function DigitalRecordsReviewTab({
  records,
  isLoading,
  statusFilter,
  setStatusFilter,
  onRefresh,
  onApprove,
  onDecline,
}) {
  return (
    <div className="h-full flex flex-col gap-6 p-6 overflow-y-auto animate-fade-in font-inter">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h2 className="text-2xl font-black text-pup-maroon tracking-tight">
            Digital Records Review
          </h2>
          <p className="text-sm font-medium text-gray-500 mt-1 max-w-2xl">
            Review staff-uploaded records and approve or decline based on
            institutional verification standards before they are finalized in
            the archives.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="flex h-9 rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon font-bold text-gray-700"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="Pending">Pending Review</option>
            <option value="Approved">Approved Records</option>
            <option value="Declined">Declined Records</option>
            <option value="All">All Submissions</option>
          </select>
          <Button
            variant="outline"
            onClick={onRefresh}
            className="h-9 font-bold border-gray-300"
          >
            <i className="ph-bold ph-arrows-clockwise mr-2"></i> Refresh
          </Button>
        </div>
      </div>
      <div className="bg-white rounded-brand border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                <th className="p-3 font-bold">Student No</th>
                <th className="p-3 font-bold">Name</th>
                <th className="p-3 font-bold">Type</th>
                <th className="p-3 font-bold">File</th>
                <th className="p-3 font-bold">Status</th>
                <th className="p-3 font-bold">Created</th>
                <th className="p-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-sm text-gray-500"
                  >
                    Loading records for review...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-sm text-gray-500"
                  >
                    No records found for this status.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="p-3 font-mono text-xs text-gray-700">
                      {r.student_no}
                    </td>
                    <td className="p-3 text-gray-800">
                      {r.student_name || "—"}
                    </td>
                    <td className="p-3">{r.doc_type}</td>
                    <td className="p-3 text-gray-600">{r.original_filename}</td>
                    <td className="p-3">
                      <span className="inline-flex px-2 py-1 rounded-full border text-xs font-bold bg-gray-50">
                        {r.approval_status || "Pending"}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-gray-600">
                      {r.created_at}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        {r.approval_status === "Declined" ? (
                          <span className="px-3 h-8 inline-flex items-center rounded-brand border border-gray-200 text-gray-400 font-bold text-xs bg-gray-50">
                            File Removed
                          </span>
                        ) : (
                          <a
                            href={`/api/documents/${r.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 h-8 inline-flex items-center rounded-brand border border-gray-300 text-gray-700 font-bold text-xs hover:border-pup-maroon"
                          >
                            Open
                          </a>
                        )}
                        {r.approval_status !== "Declined" ? (
                          <Button
                            size="sm"
                            className="h-8 bg-green-700 hover:bg-green-800"
                            onClick={() => onApprove(r.id)}
                            disabled={r.approval_status === "Approved"}
                          >
                            Approve
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8"
                          onClick={() => onDecline(r.id)}
                          disabled={r.approval_status === "Declined"}
                        >
                          Decline
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
