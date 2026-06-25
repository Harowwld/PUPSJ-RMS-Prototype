"use client"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import PageHeader from "@/components/shared/PageHeader"
import { formatPHDateTime } from "@/lib/timeFormat"
import { cn } from "@/lib/utils"

export default function GlobalAuditLogsTab({ showToast }) {
  const [logs, setLogs] = useState([])
  const [offices, setOffices] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  
  // Pagination & Filtering
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [search, setSearch] = useState("")
  const [officeFilter, setOfficeFilter] = useState("All")
  const [severityFilter, setSeverityFilter] = useState("All")

  const fetchOffices = useCallback(async () => {
    try {
      const res = await fetch("/api/offices")
      const json = await res.json()
      if (res.ok && json.ok) {
        setOffices(json.data)
      }
    } catch {}
  }, [])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const offset = (page - 1) * limit
      const officeQuery = officeFilter !== "All" ? `&officeId=${encodeURIComponent(officeFilter)}` : ""
      const severityQuery = severityFilter !== "All" ? `&severity=${encodeURIComponent(severityFilter)}` : ""
      const searchQuery = search ? `&search=${encodeURIComponent(search)}` : ""
      
      const res = await fetch(`/api/audit-logs/global?limit=${limit}&offset=${offset}${officeQuery}${severityQuery}${searchQuery}`)
      const json = await res.json()
      
      if (res.ok && json.ok) {
        setLogs(json.data)
        setTotal(json.total)
      } else {
        showToast(json.error || "Failed to fetch audit logs", true)
      }
    } catch (err) {
      showToast("Network error fetching audit logs", true)
    } finally {
      setLoading(false)
    }
  }, [page, limit, officeFilter, severityFilter, search, showToast])

  useEffect(() => {
    fetchOffices()
  }, [fetchOffices])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleSearchChange = (e) => {
    setSearch(e.target.value)
    setPage(1) // Reset to first page
  }

  const handleOfficeChange = (e) => {
    setOfficeFilter(e.target.value)
    setPage(1)
  }

  const handleSeverityChange = (e) => {
    setSeverityFilter(e.target.value)
    setPage(1)
  }

  const totalPages = Math.ceil(total / limit) || 1

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      <PageHeader
        title="Platform Audit Trail"
        description="Inspect administrative actions, tenant configuration updates, and security logs across all database environments."
      />

      {/* Filters Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/40 dark:bg-zinc-900/30 p-3 rounded-2xl border border-gray-200/50 dark:border-white/5 backdrop-blur-xs">
        <div className="relative">
          <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500"></i>
          <Input
            value={search}
            onChange={handleSearchChange}
            placeholder="Search logs by actor, action or IP..."
            className="pl-9 h-9 w-full bg-white/70 dark:bg-zinc-900/40 border border-gray-200 dark:border-white/5 rounded-xl text-xs"
          />
        </div>

        {/* Office filter */}
        <select
          value={officeFilter}
          onChange={handleOfficeChange}
          className="h-9 w-full px-3 text-xs bg-white/70 dark:bg-zinc-900/40 border border-gray-200 dark:border-white/5 rounded-xl outline-none focus:border-slate-900 dark:text-white cursor-pointer"
        >
          <option value="All">All Scopes</option>
          <option value="global">Global (Platform Level)</option>
          {offices.map(o => (
            <option key={o.id} value={o.id}>{o.short_name}</option>
          ))}
        </select>

        {/* Severity filter */}
        <select
          value={severityFilter}
          onChange={handleSeverityChange}
          className="h-9 w-full px-3 text-xs bg-white/70 dark:bg-zinc-900/40 border border-gray-200 dark:border-white/5 rounded-xl outline-none focus:border-slate-900 dark:text-white cursor-pointer"
        >
          <option value="All">All Severities</option>
          <option value="INFO">INFO</option>
          <option value="WARNING">WARNING</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>
      </div>

      {/* Audit Logs Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <Card className="border border-dashed border-gray-200 dark:border-white/5 bg-white/10 rounded-2xl">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-900 border border-gray-100 flex items-center justify-center mb-3 shadow-xs">
              <i className="ti ti-history text-xl text-gray-400"></i>
            </div>
            <span className="font-semibold text-gray-800 dark:text-zinc-200">No matching log entries</span>
            <span className="text-xs text-gray-500 mt-1">Try relaxing the search filters or choosing another category.</span>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-2xl border border-gray-200/60 dark:border-white/5 bg-white/60 dark:bg-zinc-900/40 shadow-[0_4px_16px_rgba(0,0,0,0.02)] backdrop-blur-xs">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200/80 dark:border-white/5 bg-gray-50/55 dark:bg-zinc-950/20 text-gray-500 dark:text-zinc-400 font-bold uppercase tracking-wider h-[46px]">
                  <th className="p-4 min-w-[150px]">Timestamp</th>
                  <th className="p-4">Actor</th>
                  <th className="p-4">Scope</th>
                  <th className="p-4">Action</th>
                  <th className="p-4 min-w-[250px]">Details</th>
                  <th className="p-4">Severity</th>
                  <th className="p-4 text-right">IP Address</th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-medium text-gray-900 dark:text-zinc-100">
                {logs.map((log) => {
                  const office = offices.find(o => o.id === log.office_id)
                  
                  return (
                    <tr 
                      key={log.id}
                      className={cn(
                        "hover:bg-gray-50/30 dark:hover:bg-white/2 transition-colors duration-150 h-[52px]",
                        log.severity === "CRITICAL" && "bg-red-500/5 hover:bg-red-500/10 dark:bg-red-950/10 dark:hover:bg-red-950/20",
                        log.severity === "WARNING" && "bg-amber-500/5 hover:bg-amber-500/10 dark:bg-amber-950/10 dark:hover:bg-amber-950/20"
                      )}
                    >
                      <td className="p-4 font-mono font-normal text-gray-400 dark:text-zinc-500">
                        {formatPHDateTime(log.created_at)}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-950 dark:text-zinc-50">{log.actor}</span>
                          <span className="text-[10px] text-gray-400 font-normal">{log.role}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {office ? (
                          <span className="font-semibold text-gray-800 dark:text-zinc-300">{office.short_name}</span>
                        ) : (
                          <span className="text-blue-600 dark:text-blue-400 font-semibold uppercase text-[10px]">Global</span>
                        )}
                      </td>
                      <td className="p-4 font-semibold text-slate-800 dark:text-zinc-200">
                        {log.action}
                      </td>
                      <td className="p-4 text-gray-500 dark:text-zinc-400 font-normal leading-relaxed text-[11px] max-w-sm whitespace-pre-line">
                        {log.details}
                      </td>
                      <td className="p-4">
                        <Badge
                          className={cn(
                            "rounded-md shadow-2xs font-semibold px-2 py-0.5 border text-[10px] tracking-wide",
                            log.severity === "CRITICAL"
                              ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                              : log.severity === "WARNING"
                                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                                : "bg-gray-50 text-gray-700 border-gray-200 dark:bg-white/5 dark:text-zinc-400 dark:border-white/5"
                          )}
                        >
                          {log.severity}
                        </Badge>
                      </td>
                      <td className="p-4 text-right font-mono font-normal text-gray-400 dark:text-zinc-500">
                        {log.ip}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Toolbar */}
          <div className="flex items-center justify-between mt-2 px-2">
            <span className="text-xs text-gray-500 dark:text-zinc-400">
              Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total.toLocaleString()} total entries)
            </span>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="h-8 border-gray-200 dark:border-white/10 text-xs font-semibold rounded-lg cursor-pointer"
              >
                <i className="ti ti-chevron-left mr-1"></i> Previous
              </Button>
              <Button
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="h-8 border-gray-200 dark:border-white/10 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Next <i className="ti ti-chevron-right ml-1"></i>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
