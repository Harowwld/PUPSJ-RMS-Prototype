"use client";


import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AuditLogsTab({
  displayLogs,
  isLoading = false,
  logPage,
  setLogPage,
  logTotal,
  logsPerPage,
  setLogsPerPage,
  logSearch,
  setLogSearch,
}) {
  return (
    <div className="bg-white rounded-brand border border-gray-200 shadow-sm h-full flex flex-col font-inter animate-fade-in overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-gray-50/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
            <i className="ph-duotone ph-scroll text-lg"></i>
          </div>
          <h2 className="font-bold text-gray-900 text-lg">
            System Audit Logs
          </h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 pl-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest shrink-0">
              Page Limit:
            </label>
            <select
              className="flex h-8 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon"
              value={logsPerPage}
              onChange={(e) => {
                setLogsPerPage(parseInt(e.target.value));
                setLogPage(1);
              }}
            >
              <option value={10}>10 records</option>
              <option value={20}>20 records</option>
              <option value={50}>50 records</option>
              <option value={100}>100 records</option>
            </select>
          </div>
          
          <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>
          
          <div className="relative">
            <i className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pup-maroon transition-colors"></i>
            <Input
              type="text"
              placeholder="Query events..."
              className="pl-9 h-8 text-xs border-gray-200 bg-white w-[180px] sm:w-[220px]"
              value={logSearch}
              onChange={(e) => {
                setLogSearch(e.target.value);
                setLogPage(1);
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                <th className="p-3 font-bold w-44">Date & Time</th>
                <th className="p-3 font-bold w-48">User</th>
                <th className="p-3 font-bold w-32">Role</th>
                <th className="p-3 font-bold">Action</th>
                <th className="p-3 font-bold text-right w-40">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading && displayLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-gray-500">
                    Loading audit logs...
                  </td>
                </tr>
              ) : displayLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-0">
                    <div className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500">
                        <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                        <i className="ph-duotone ph-list-magnifying-glass text-3xl text-pup-maroon"></i>
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        No audit logs yet
                      </div>
                      <div className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                        We couldn't find any audit logs matching your search criteria.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                displayLogs.map((log, idx) => {
                // Determine badge type based on action severity (mock logic)
                const isDestructive = log.action.toLowerCase().includes("delete") || log.action.toLowerCase().includes("remove");
                const isAuth = log.action.toLowerCase().includes("login") || log.action.toLowerCase().includes("logout");
                
                return (
                  <tr key={idx} className="hover:bg-gray-50 group cursor-default transition-colors">
                    <td className="p-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                      {log.time}
                    </td>
                    <td className="p-3 font-bold text-gray-900 text-sm whitespace-nowrap">
                      {log.user}
                    </td>
                    <td className="p-3">
                      {log.role === "System" ? (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-bold uppercase text-[9px] tracking-wider px-2 py-0.5">
                          {log.role}
                        </Badge>
                      ) : log.role === "Admin" || log.role === "SuperAdmin" ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold uppercase text-[9px] tracking-wider px-2 py-0.5">
                          {log.role}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold uppercase text-[9px] tracking-wider px-2 py-0.5">
                          {log.role}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-xs font-medium text-gray-700">
                      {isDestructive ? (
                        <span className="text-red-600 font-bold">{log.action}</span>
                      ) : isAuth ? (
                        <span className="text-blue-600 font-semibold">{log.action}</span>
                      ) : (
                        <span>{log.action}</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono text-[11px] text-gray-400">
                      {log.ip}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between px-6 shrink-0">
        <div className="text-xs font-medium text-gray-500">
          Showing <strong className="text-gray-900">{logTotal.toLocaleString()}</strong> captured system telemetry events
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={logPage <= 1}
            onClick={() => setLogPage((p) => p - 1)}
            className="h-8 text-xs font-bold text-gray-600"
          >
            <i className="ph-bold ph-caret-left"></i> Previous
          </Button>
          <div className="px-3 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-md h-8 flex items-center justify-center min-w-12 shadow-sm">
            {logPage} / {Math.max(1, Math.ceil(logTotal / logsPerPage))}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={logPage >= Math.ceil(logTotal / logsPerPage)}
            onClick={() => setLogPage((p) => p + 1)}
            className="h-8 text-xs font-bold text-gray-600"
          >
            Next <i className="ph-bold ph-caret-right"></i>
          </Button>
        </div>
      </div>
    </div>
  );
}
