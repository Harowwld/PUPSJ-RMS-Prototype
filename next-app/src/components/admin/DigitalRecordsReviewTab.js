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
    <div className="bg-white rounded-brand border border-gray-200 shadow-sm h-full flex flex-col font-inter animate-fade-in overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-gray-50/30">
        <div>
          <h2 className="font-bold text-gray-900 text-lg">Digital Records Review</h2>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Review staff-uploaded records and approve or decline.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="flex h-9 rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Declined">Declined</option>
            <option value="All">All</option>
          </select>
          <Button variant="outline" onClick={onRefresh} className="h-9">
            Refresh
          </Button>
        </div>
      </div>

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
                <td colSpan={7} className="p-8 text-center text-sm text-gray-500">
                  Loading records for review...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-sm text-gray-500">
                  No records found for this status.
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs text-gray-700">{r.student_no}</td>
                  <td className="p-3 text-gray-800">{r.student_name || "—"}</td>
                  <td className="p-3">{r.doc_type}</td>
                  <td className="p-3 text-gray-600">{r.original_filename}</td>
                  <td className="p-3">
                    <span className="inline-flex px-2 py-1 rounded-full border text-xs font-bold bg-gray-50">
                      {r.approval_status || "Pending"}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-gray-600">{r.created_at}</td>
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
  );
}
