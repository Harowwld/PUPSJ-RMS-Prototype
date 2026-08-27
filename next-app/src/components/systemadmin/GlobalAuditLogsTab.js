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
import { Select } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { format } from "date-fns"
import { RefreshButton } from "@/components/shared/RefreshButton"
import LogDetailSheet from "../admin/audit-logs/LogDetailSheet"

export default function GlobalAuditLogsTab({ showToast }) {
  const [logs, setLogs] = useState([])
  const [offices, setOffices] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isManualLoading, setIsManualLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)
  
  // Pagination & Filtering
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState("")
  const [localSearch, setLocalSearch] = useState("")
  const [officeFilter, setOfficeFilter] = useState("All")
  const [severityFilter, setSeverityFilter] = useState("All")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        setSearch(localSearch)
        setPage(1)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearch, search])

  const fetchOffices = useCallback(async () => {
    try {
      const res = await fetch("/api/offices")
      const json = await res.json()
      if (res.ok && json.ok) {
        setOffices(json.data)
      }
    } catch {}
  }, [])

  const fetchLogs = useCallback(async (isManual = false) => {
    if (isManual) setIsManualLoading(true)
    setLoading(true)
    try {
      const offset = (page - 1) * limit
      const officeQuery = officeFilter !== "All" ? `&officeId=${encodeURIComponent(officeFilter)}` : ""
      const severityQuery = severityFilter !== "All" ? `&severity=${encodeURIComponent(severityFilter)}` : ""
      const searchQuery = search ? `&search=${encodeURIComponent(search)}` : ""
      const startQuery = startDate ? `&startDate=${encodeURIComponent(startDate)}` : ""
      const endQuery = endDate ? `&endDate=${encodeURIComponent(endDate)}` : ""
      
      const res = await fetch(`/api/audit-logs/global?limit=${limit}&offset=${offset}${officeQuery}${severityQuery}${searchQuery}${startQuery}${endQuery}`)
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
      setIsManualLoading(false)
    }
  }, [page, limit, officeFilter, severityFilter, search, startDate, endDate, showToast])

  useEffect(() => {
    fetchOffices()
  }, [fetchOffices])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleRoleChange = (e) => {
    setOfficeFilter(e.target.value)
    setPage(1)
  }

  const handleSeverityChange = (e) => {
    setSeverityFilter(e.target.value)
    setPage(1)
  }

  const handleQuickRange = (range) => {
    const end = new Date()
    let start = new Date()

    switch (range) {
      case "today":
        start.setHours(0, 0, 0, 0)
        break
      case "yesterday":
        start.setDate(start.getDate() - 1)
        start.setHours(0, 0, 0, 0)
        end.setDate(end.getDate() - 1)
        end.setHours(23, 59, 59, 999)
        break
      case "last7":
        start.setDate(start.getDate() - 7)
        start.setHours(0, 0, 0, 0)
        break
      case "last30":
        start.setDate(start.getDate() - 30)
        start.setHours(0, 0, 0, 0)
        break
    }

    setStartDate(format(start, "yyyy-MM-dd"))
    setEndDate(format(end, "yyyy-MM-dd"))
    setPage(1)
  }

  const activeShortcut = (() => {
    if (!startDate || !endDate) return null
    const todayStr = format(new Date(), "yyyy-MM-dd")
    
    if (startDate === todayStr && endDate === todayStr) return "today"
    
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = format(yesterday, "yyyy-MM-dd")
    if (startDate === yesterdayStr && endDate === yesterdayStr) return "yesterday"
    
    const last7 = new Date()
    last7.setDate(last7.getDate() - 7)
    const last7Str = format(last7, "yyyy-MM-dd")
    if (startDate === last7Str && endDate === todayStr) return "last7"
    
    const last30 = new Date()
    last30.setDate(last30.getDate() - 30)
    const last30Str = format(last30, "yyyy-MM-dd")
    if (startDate === last30Str && endDate === todayStr) return "last30"
    
    return null
  })()

  const totalPages = Math.ceil(total / limit) || 1
  const startEntry = (page - 1) * limit + 1
  const endEntry = Math.min(page * limit, total)

  const handleCopy = (text, label) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    showToast({ title: "Copied to Clipboard", description: `${label} has been successfully copied to your clipboard.` })
  }

  return (
    <TooltipProvider delay={200}>
      <div className="animate-fade-up font-inter flex w-full flex-col gap-6 max-w-6xl mx-auto">
        <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-xl border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
          <PageHeader
            icon="ph-shield-check"
            title="Platform Audit Trail"
            description="Inspect administrative actions, tenant configuration updates, and security logs across all database environments."
            showBorder={false}
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
            actions={
              <div className="flex items-center gap-6">
                <RefreshButton 
                  onRefresh={() => fetchLogs(true)} 
                  isLoading={isManualLoading} 
                  title="Refresh Audit Logs"
                />
              </div>
            }
          />

          {/* Filters Toolbar */}
          <div className="bg-white border-t border-gray-100 p-4 backdrop-blur-md dark:bg-card/50 dark:border-white/10">
            <div className="flex w-full flex-wrap items-center gap-5">
              {/* Search */}
              <div className="flex-[2] min-w-[280px] group relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <i className="ph-bold ph-magnifying-glass text-gray-400 transition-colors group-focus-within:text-pup-maroon dark:text-zinc-500 text-sm"></i>
                </div>
                <Input
                  type="text"
                  placeholder="Search logs by actor, action or IP..."
                  className="h-[36px] w-full rounded-[8px] border-[0.5px] border-gray-200 bg-white pl-9 pr-20 text-[13px] font-normal transition-all focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 placeholder:text-gray-400 dark:border-white/10 dark:bg-card dark:text-zinc-300 dark:focus:border-primary"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                />
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                  {total > 0 ? `${total.toLocaleString()} results` : "0 results"}
                </div>
              </div>

              {/* Office / Scope Select */}
              <div className="min-w-[140px] flex-1">
                <Select
                  value={officeFilter}
                  onChange={handleRoleChange}
                  className="h-[36px] rounded-[8px] border-[0.5px] border-gray-200 text-[13px] font-normal"
                >
                  <option value="All">All Scopes</option>
                  <option value="global">Global (Platform)</option>
                  {offices.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.short_name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Severity Select */}
              <div className="min-w-[130px] flex-1">
                <Select
                  value={severityFilter}
                  onChange={handleSeverityChange}
                  className="h-[36px] rounded-[8px] border-[0.5px] border-gray-200 text-[13px] font-normal"
                >
                  <option value="All">Severity</option>
                  <option value="INFO">Information</option>
                  <option value="WARNING">Warning</option>
                  <option value="CRITICAL">Critical</option>
                </Select>
              </div>

              {/* Time shortcuts */}
              <div className="flex items-center gap-[12px] h-[36px] flex-none">
                {[
                  { key: "today", label: "Today" },
                  { key: "yesterday", label: "Yesterday" },
                  { key: "last7", label: "7 days" },
                  { key: "last30", label: "30 days" },
                ].map((range) => {
                  const isActive = activeShortcut === range.key
                  return (
                    <button
                      key={range.key}
                      type="button"
                      onClick={() => handleQuickRange(range.key)}
                      className={cn(
                        "text-[12px] font-normal transition-all bg-transparent border-0 cursor-pointer shadow-none focus:outline-none focus:ring-0 pb-1",
                        isActive 
                          ? "text-[#03a10e] dark:text-[#03a10e] border-b-[2px] border-[#03a10e] dark:border-[#03a10e] font-medium" 
                          : "text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300"
                      )}
                    >
                      {range.label}
                    </button>
                  )
                })}
              </div>

              {/* Date pickers */}
              <div className="flex items-center gap-2 flex-none">
                <div className="w-[120px]">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-[36px] w-full justify-start rounded-[8px] border-[0.5px] border-gray-200 dark:border-white/10 bg-white dark:bg-card text-left text-[13px] font-normal shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-white/10",
                          !startDate ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                        )}
                      >
                        {startDate ? format(new Date(startDate), "MMM d, yyyy") : "Start Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-card" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate ? new Date(startDate) : undefined}
                        onSelect={(date) => {
                          setStartDate(date ? format(date, "yyyy-MM-dd") : "")
                          setPage(1)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="text-[12px] text-gray-400 dark:text-zinc-500 shrink-0">
                  →
                </div>
                <div className="w-[120px]">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-[36px] w-full justify-start rounded-[8px] border-[0.5px] border-gray-200 dark:border-white/10 bg-white dark:bg-card text-left text-[13px] font-normal shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-white/10",
                          !endDate ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                        )}
                      >
                        {endDate ? format(new Date(endDate), "MMM d, yyyy") : "End Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-card" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate ? new Date(endDate) : undefined}
                        onSelect={(date) => {
                          setEndDate(date ? format(date, "yyyy-MM-dd") : "")
                          setPage(1)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </div>

          {/* Table content */}
          <div className="relative w-full overflow-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b-[0.5px] border-gray-150 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500 h-[40px] dark:border-white/10 dark:bg-zinc-950/20 select-none">
                  <th className="py-0 px-4 align-middle font-bold text-gray-500 dark:text-zinc-400">Timestamp</th>
                  <th className="py-0 px-4 align-middle font-bold text-gray-500 dark:text-zinc-400">Actor</th>
                  <th className="py-0 px-4 align-middle font-bold text-gray-500 dark:text-zinc-400">Scope</th>
                  <th className="py-0 px-4 align-middle font-bold text-gray-500 dark:text-zinc-400">Action</th>
                  <th className="py-0 px-4 align-middle font-bold text-gray-500 dark:text-zinc-400 min-w-[250px]">Details</th>
                  <th className="py-0 px-4 align-middle font-bold text-gray-500 dark:text-zinc-400">Severity</th>
                  <th className="py-0 px-4 align-middle font-bold text-gray-500 dark:text-zinc-400 text-right">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-medium text-gray-900 dark:text-zinc-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="h-[52px]">
                      <td className="p-4"><Skeleton className="h-4 w-28" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-full max-w-sm" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-12" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr className="border-0 hover:bg-transparent">
                    <td colSpan={7} className="p-0 border-0">
                      <div className="h-[400px] flex flex-col items-center justify-center text-gray-500">
                        <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-xs">
                          <i className="ph-duotone ph-history text-3xl text-pup-maroon"></i>
                        </div>
                        <div className="text-lg font-bold text-gray-900">No matching log entries</div>
                        <div className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                          Try relaxing the search filters or choosing another category.
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const office = offices.find((o) => o.id === log.office_id)
                    const isCritical = log.severity === "CRITICAL"
                    const isWarning = log.severity === "WARNING"
                    
                    const severityClasses = isCritical
                      ? "bg-[#FEE2E2] text-[#991B1B] dark:bg-red-950/40 dark:text-red-400"
                      : isWarning
                        ? "bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/40 dark:text-amber-400"
                        : "bg-[#D1FAE5] text-[#065F46] dark:bg-emerald-950/40 dark:text-emerald-400";
                    const severityLabel = isCritical ? "Critical" : isWarning ? "Warning" : "Info";

                    const formattedTimestamp = (() => {
                      try {
                        let normalized = String(log.created_at);
                        if (!normalized.includes("T") && !normalized.includes("Z")) {
                          normalized = normalized.replace(" ", "T") + "Z";
                        }
                        const d = new Date(normalized);
                        if (isNaN(d.getTime())) return log.created_at;
                        return d.toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true
                        });
                      } catch (e) {
                        return log.created_at;
                      }
                    })();

                    const isSelected = selectedLog && selectedLog.id === log.id;

                    return (
                      <tr 
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className={cn(
                          "group h-[52px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0 transition-all duration-200 hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 cursor-pointer select-none",
                          isSelected && "bg-blue-50/60 dark:bg-blue-950/20"
                        )}
                      >
                        <td className="py-0 px-4 align-middle text-[13px] font-normal text-[#111111] dark:text-zinc-55">
                          {formattedTimestamp}
                        </td>
                        <td className="py-0 px-4 align-middle">
                          <div className="flex flex-col overflow-hidden">
                            <span className="truncate text-[13px] font-medium text-[#111111] dark:text-zinc-50">{log.actor}</span>
                            <span className="truncate text-[12px] font-normal text-[#8E8E93] mt-[2px]">{log.role}</span>
                          </div>
                        </td>
                        <td className="py-0 px-4 align-middle text-[13px] font-normal text-[#111111] dark:text-zinc-50">
                          {office ? (
                            <span className="font-medium text-gray-800 dark:text-zinc-300">{office.short_name}</span>
                          ) : (
                            <span className="text-blue-600 dark:text-blue-400 font-semibold uppercase text-[10px] tracking-wider">Global</span>
                          )}
                        </td>
                        <td className="py-0 px-4 align-middle text-[13px] font-medium text-[#111111] dark:text-zinc-50">
                          {log.action}
                        </td>
                        <td className="py-0 px-4 align-middle text-[13px] font-normal text-[#8E8E93] max-w-sm truncate">
                          {log.details || "—"}
                        </td>
                        <td className="py-0 px-4 align-middle">
                          <Badge
                            className={cn(
                              "inline-flex w-fit items-center justify-center rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium tracking-[0.04em] shadow-none transition-all border-0",
                              severityClasses
                            )}
                          >
                            {severityLabel}
                          </Badge>
                        </td>
                        <td className="py-0 px-4 align-middle text-right text-[13px] font-normal text-gray-400 dark:text-zinc-500">
                          {log.ip || "—"}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Toolbar */}
          <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between mt-0 dark:border-white/10 dark:bg-card">
            <div className="text-xs font-medium text-gray-500">
              Showing {startEntry}-{endEntry} of <strong>{total.toLocaleString()}</strong> entries
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-8 border-gray-200 dark:border-white/10 text-xs font-semibold rounded-lg cursor-pointer"
              >
                <i className="ph-bold ph-caret-left mr-1"></i> Previous
              </Button>
              <Button
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 border-gray-200 dark:border-white/10 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Next <i className="ph-bold ph-caret-right ml-1"></i>
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <LogDetailSheet
        isOpen={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
        log={selectedLog}
        onCopy={handleCopy}
      />
    </TooltipProvider>
  )
}
