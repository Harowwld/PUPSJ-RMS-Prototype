"use client";

export default function AuditLogsTab({
  displayLogs,
  logPage,
  setLogPage,
  logTotal,
  logsPerPage,
  setLogsPerPage,
  logSearch,
  setLogSearch,
}) {
  return (
    <div className="bg-white rounded-brand border border-gray-300 shadow-sm h-full flex flex-col animate-fade-in">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h2 className="font-bold text-pup-maroon flex items-center gap-2">
          <i className="ph-duotone ph-scroll"></i> System Audit Logs
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase">
              Show:
            </label>
            <select
              className="text-[10px] border-gray-300 rounded border px-1.5 py-1 focus:outline-none focus:border-pup-maroon bg-white"
              value={logsPerPage}
              onChange={(e) => {
                setLogsPerPage(parseInt(e.target.value));
                setLogPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="relative">
            <i className="ph-bold ph-magnifying-glass absolute left-2.5 top-2 text-gray-400 text-xs"></i>
            <input
              type="text"
              placeholder="Search logs..."
              className="pl-7 pr-3 py-1.5 text-xs border border-gray-300 rounded-brand focus:outline-none focus:border-pup-maroon w-48"
              value={logSearch}
              onChange={(e) => {
                setLogSearch(e.target.value);
                setLogPage(1);
              }}
            />
          </div>
          <div className="text-[10px] text-gray-400 font-mono">
            Total Records: {logTotal.toLocaleString()}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-0">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10 text-[10px] uppercase text-gray-500 font-bold">
            <tr>
              <th className="p-3 border-b border-gray-200 w-32">Timestamp</th>
              <th className="p-3 border-b border-gray-200 w-40">User</th>
              <th className="p-3 border-b border-gray-200 w-32">Role</th>
              <th className="p-3 border-b border-gray-200">Activity</th>
              <th className="p-3 border-b border-gray-200 w-24 text-right">
                IP Address
              </th>
            </tr>
          </thead>
          <tbody className="text-xs text-gray-600 divide-y divide-gray-100">
            {displayLogs.map((log, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                <td className="p-3 border-b border-gray-100 font-mono text-gray-500">
                  {log.time}
                </td>
                <td className="p-3 border-b border-gray-100 font-bold text-gray-700">
                  {log.user}
                </td>
                <td className="p-3 border-b border-gray-100">
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold uppercase">
                    {log.role}
                  </span>
                </td>
                <td className="p-3 border-b border-gray-100 text-gray-600">
                  {log.action}
                </td>
                <td className="p-3 border-b border-gray-100 text-right font-mono text-gray-400">
                  {log.ip}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-2 border-t border-gray-200 bg-gray-50 text-[10px] text-gray-400 flex justify-center items-center gap-4">
        <button
          disabled={logPage <= 1}
          onClick={() => setLogPage((p) => p - 1)}
          className="hover:text-pup-maroon px-2 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
        >
          Previous
        </button>
        <span className="px-2 font-medium">
          Page {logPage} of {Math.max(1, Math.ceil(logTotal / logsPerPage))}
        </span>
        <button
          disabled={logPage >= Math.ceil(logTotal / logsPerPage)}
          onClick={() => setLogPage((p) => p + 1)}
          className="hover:text-pup-maroon px-2 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
