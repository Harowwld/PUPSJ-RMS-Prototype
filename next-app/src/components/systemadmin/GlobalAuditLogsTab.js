"use client"
import useViewPreference from "@/hooks/useViewPreference"
import { Table, TableStatus } from "@/components/ui/table";
import TablePagination from "@/components/shared/TablePagination";


import React, { useState, useEffect, useCallback, useRef, useMemo } from "react"
import usePdfPreviewSession from "@/hooks/usePdfPreviewSession";
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import AuditLogsTableSkeleton from "@/components/systemadmin/skeletons/AuditLogsTableSkeleton"
import { getCachedData, setCachedData } from "@/lib/dataCache"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
  EmptyContent,
} from "@/components/ui/empty"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import PageHeader from "@/components/shared/PageHeader"
import { RefreshButton } from "@/components/shared/RefreshButton"
import { formatPHDateTime } from "@/lib/timeFormat"
import { format } from "date-fns"
import { cn, formatTitleCase, formatLogDetails } from "@/lib/utils"
import ActiveFilterChips from "@/components/shared/ActiveFilterChips"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { generateAuditLogsPdf } from "@/lib/pdfGenerator"
import { generateExportFilename } from "@/lib/exportHelpers"
import AuditActorAvatar from "@/components/shared/AuditActorAvatar"

import { FilterPopover, SortPopover, ColumnsPopover } from "@/components/systemadmin/OfficeTableControls"
import { Skeleton } from "@/components/ui/skeleton"
import LogDetailSheet from "../admin/audit-logs/LogDetailSheet"
import LogExpandedRow from "../admin/audit-logs/LogExpandedRow"
import PDFPreviewModal from "@/components/shared/PDFPreviewModal"
import useTableScroll from "@/hooks/useTableScroll"
import TableScrollControls from "@/components/shared/TableScrollControls"
import DataViewToolbar from "@/components/shared/DataViewToolbar"
import { AlertCircleIcon as EmptyAlertCircleIcon, Search01Icon as EmptySearch01Icon, ArrowDown01Icon, ArrowUp01Icon, ArrowUpDownIcon, Building01Icon, Cancel01Icon, Loading01Icon, ViewIcon, Search01Icon } from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return <ArrowUpDownIcon size="1em" className="ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"></ArrowUpDownIcon>
  }
  return sortOrder === "ASC" ? (
    <ArrowUp01Icon size="1em" className="ml-1 text-[12px] text-gray-400"></ArrowUp01Icon>
  ) : (
    <ArrowDown01Icon size="1em" className="ml-1 text-[12px] text-gray-400"></ArrowDown01Icon>
  )
}

function getSeverityInfo(sev) {
  const s = String(sev || "").toUpperCase()
  if (s === "CRITICAL") {
    return {
      label: "Critical",
      classes: "bg-[#FEE2E2] text-[#991B1B] dark:bg-red-950/40 dark:text-red-400",
    }
  }
  if (s === "WARNING") {
    return {
      label: "Warning",
      classes: "bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/40 dark:text-amber-400",
    }
  }
  return {
    label: "Info",
    classes: "bg-[#D1FAE5] text-[#065F46] dark:bg-emerald-950/40 dark:text-emerald-400",
  }
}

function parseDateLocal(str) {
  if (!str) return undefined
  const [y, m, d] = str.split("-").map(Number)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return undefined
  return new Date(y, m - 1, d)
}

function formatActionLabel(actionStr) {
  if (!actionStr) return "N/A";
  if (actionStr === "Rotate Password") return "Password Rotated";
  if (actionStr.startsWith("[SECURITY]")) {
    if (actionStr.includes("UNAUTHORIZED_ACCESS")) return "Unauthorized Access Attempt";
    if (actionStr.includes("FORBIDDEN_ACCESS")) return "Forbidden Access Attempt";
    if (actionStr.includes("INVALID_SESSION")) return "Invalid Session Detected";
    if (actionStr.includes("RATE_LIMIT_EXCEEDED")) return "Rate Limit Exceeded";
    if (actionStr.includes("PRIVILEGE_ESCALATION")) return "Privilege Escalation Attempt";
    if (actionStr.includes("BRUTE_FORCE_ATTEMPT")) return "Brute Force Attempt Detected";
    return actionStr.split(" - ")[0].replace("[SECURITY] ", "");
  }
  return actionStr;
}

const OPTIONAL_COLUMNS = [
  { key: "severity", label: "Level", kind: "status", maxWidth: 120 },
  { key: "actor", label: "Actor", kind: "text", maxWidth: 240 },
  { key: "office_id", label: "Scope", kind: "status", maxWidth: 180 },
  { key: "details", label: "Description", kind: "text", maxWidth: 340 },
  { key: "ip", label: "IP Address", kind: "text", maxWidth: 200 },
]
const SORT_OPTIONS = [
  { key: "created_at", label: "Timestamp" },
  { key: "severity", label: "Level" },
  { key: "actor", label: "Actor" },
  { key: "office_id", label: "Scope" },
  { key: "action", label: "Action" },
]

export default function GlobalAuditLogsTab({ showToast }) {
  const [logs, setLogs] = useState([])
  const [offices, setOffices] = useState([])
  const officesRef = useRef(offices)
  useEffect(() => {
    officesRef.current = offices
  }, [offices])

  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const logsRequest = useRef(0)
  const [error, setError] = useState(null)
  const [isManualLoading, setIsManualLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)
  const [expandedRows, setExpandedRows] = useState({})
  const [visibleColumns, setVisibleColumns] = useViewPreference("logs", "visibleColumns", OPTIONAL_COLUMNS.filter(({ key }) => key !== "ip").map(({ key }) => key))
  const showColumn = (key) => visibleColumns.includes(key)
  const tableColumns = [
    { kind: "selection" },
    { kind: "date", maxWidth: 205 },
    ...OPTIONAL_COLUMNS.filter(({ key }) => !["details", "ip"].includes(key) && showColumn(key)).map(({ kind, maxWidth }) => ({ kind, maxWidth })),
    { kind: "text", maxWidth: 300 },
    ...(showColumn("details") ? [{ kind: "text", maxWidth: 340 }] : []),
    ...(showColumn("ip") ? [{ kind: "text", maxWidth: 200 }] : []),
    { kind: "actions" },
  ]

  const router = useRouter()
  const searchParams = useSearchParams()

  // Pagination & Filtering
  const initialPageFromUrl = parseInt(searchParams?.get("page") || "1", 10)
  const initialSearchFromUrl = searchParams?.get("search") || ""
  const [page, setPage] = useState(!isNaN(initialPageFromUrl) && initialPageFromUrl >= 1 ? initialPageFromUrl : 1)
  const [limit, setLimit] = useViewPreference("logs", "limit", 20)
  const [search, setSearch] = useState(initialSearchFromUrl)
  const [localSearch, setLocalSearch] = useViewPreference("logs", "localSearch", initialSearchFromUrl)
  useEffect(() => {
    if (initialSearchFromUrl) setLocalSearch(initialSearchFromUrl)
  }, [initialSearchFromUrl, setLocalSearch])
  const [logFilters, setLogFilters] = useViewPreference("logs", "logFilters", {
    severity: [],
    office: [],
  })
  const [startDate, setStartDate] = useViewPreference("logs", "startDate", "")
  const [endDate, setEndDate] = useViewPreference("logs", "endDate", "")

  // Horizontal table scrolling hook
  const {
    tableContainerRef,
    canScrollLeft,
    canScrollRight,
    isScrolled,
    scrollLeft,
    scrollRight,
    resetScroll: resetTableScroll,
  } = useTableScroll([logs?.length]);

  // Auto-reset scroll to start when page, limit, search, or filters change
  useEffect(() => {
    resetTableScroll();
  }, [page, limit, search, logFilters, startDate, endDate, resetTableScroll]);

  const lastUrlStateRef = useRef({
    page: !isNaN(initialPageFromUrl) && initialPageFromUrl >= 1 ? initialPageFromUrl : 1,
    search: initialSearchFromUrl,
  })

  const updateUrl = useCallback((newPage, newSearch, historyMethod = "replace") => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)

    const cleanSearch = typeof newSearch === "string" ? newSearch.trim() : ""
    if (cleanSearch) {
      params.set("search", cleanSearch)
    } else {
      params.delete("search")
    }

    const cleanPage = Number(newPage) || 1
    if (cleanPage > 1) {
      params.set("page", String(cleanPage))
    } else {
      params.delete("page")
    }

    lastUrlStateRef.current = {
      page: cleanPage,
      search: cleanSearch,
    }

    const queryString = params.toString()
    const nextUrl = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname

    router[historyMethod](nextUrl, { scroll: false })
  }, [router])

  useEffect(() => {
    const pageFromUrl = parseInt(searchParams?.get("page") || "1", 10)
    const validPage = !isNaN(pageFromUrl) && pageFromUrl >= 1 ? pageFromUrl : 1
    const searchFromUrl = searchParams?.get("search") || ""

    if (
      lastUrlStateRef.current.page !== validPage ||
      lastUrlStateRef.current.search !== searchFromUrl
    ) {
      lastUrlStateRef.current = { page: validPage, search: searchFromUrl }
      setPage(validPage)
      setSearch(searchFromUrl)
      setLocalSearch(searchFromUrl)
    }
  }, [searchParams, setLocalSearch])

  // Sorting
  const [sortBy, setSortBy] = useViewPreference("logs", "sortBy", "created_at")
  const [sortOrder, setSortOrder] = useViewPreference("logs", "sortOrder", "DESC")

  // Export & Preview States
  const [isExporting, setIsExporting] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
  const [pdfBlobUrl, setPdfPreviewUrl] = useState(null)
  const previewSession = usePdfPreviewSession();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        setSearch(localSearch)
        setPage(1)
        updateUrl(1, localSearch)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearch, search, updateUrl])

  const fetchOffices = useCallback(async () => {
    const cached = getCachedData("systemadmin_offices")
    if (Array.isArray(cached)) {
      setOffices(cached)
      officesRef.current = cached
      return cached
    }
    try {
      const res = await fetch("/api/offices")
      const json = await res.json()
      if (res.ok && json.ok && Array.isArray(json.data)) {
        setOffices(json.data)
        officesRef.current = json.data
        setCachedData("systemadmin_offices", json.data, 120000)
        return json.data
      }
    } catch { }
    setOffices([])
    officesRef.current = []
    return []
  }, [])

  const logFilterGroups = useMemo(() => {
    const officeOptions = [
      { value: "global", label: "Global (Platform)" },
      ...(Array.isArray(offices) ? offices : []).map((o) => ({
        value: o.id,
        label: o.short_name || o.name,
      })),
    ]

    return [{ id: "office", label: "Scope / Partition", options: officeOptions }]
  }, [offices])

  const auditFilterFields = useMemo(() => [{
    key: "office",
    label: "Scope",
    icon: Building01Icon,
    type: "multi",
    operators: [{ value: "is_any", label: "is any of" }],
    options: logFilterGroups[0]?.options || [],
  }], [logFilterGroups])


  const fetchLogs = useCallback(
    async (isManual = false, currentOffices = null) => {
      const request = ++logsRequest.current
      const officeStr = (logFilters.office || []).join(",")
      const sevStr = (logFilters.severity || []).join(",")
      const logsKey = `audit_logs_${page}_${limit}_${officeStr}_${sevStr}_${search}_${startDate}_${endDate}_${sortBy}_${sortOrder}`
      if (!isManual) {
        const cached = getCachedData(logsKey)
        if (cached) {
          setLogs(cached.logs)
          setTotal(cached.total)
          setLoading(false)
        }
      }

      if (isManual) setIsManualLoading(true)
      if (!getCachedData(logsKey)) {
        setLoading(true)
      }
      setError(null)
      try {
        const offset = (page - 1) * limit
        const officeQuery = officeStr ? `&officeId=${encodeURIComponent(officeStr)}` : ""
        const severityQuery = sevStr ? `&severity=${encodeURIComponent(sevStr)}` : ""
        const searchQuery = search ? `&search=${encodeURIComponent(search)}` : ""
        const startQuery = startDate ? `&startDate=${encodeURIComponent(startDate)}` : ""
        const endQuery = endDate ? `&endDate=${encodeURIComponent(endDate)}` : ""
        const sortQuery = `&sortBy=${sortBy}&sortOrder=${sortOrder}`

        const res = await fetch(
          `/api/audit-logs/global?limit=${limit}&offset=${offset}${officeQuery}${severityQuery}${searchQuery}${startQuery}${endQuery}${sortQuery}`
        )
        const json = await res.json()
        if (request !== logsRequest.current) return

        const officeList = currentOffices || officesRef.current || []

        if (res.ok && json.ok) {
          setError(null)
          const formatted = (json.data || []).map((r) => {
            const off = officeList.find((o) => o.id === r.office_id)
            const scopeLabel = off ? off.short_name : "Global"
            const officeName = off ? off.short_name : "Global (Platform)"
            return {
              id: `${r.log_source || "global"}-${r.office_id || "global"}-${r.id}`,
              rawId: r.id,
              time: formatPHDateTime(r.created_at),
              user: r.actor,
              actor: r.actor,
              actor_id: r.actor_id,
              role: r.role,
              office_id: r.office_id,
              officeName,
              scope: scopeLabel,
              action: r.action,
              details: formatLogDetails(r.details) || "N/A",
              severity: r.severity || "INFO",
              userAgent: r.user_agent || "N/A",
              user_agent: r.user_agent || "N/A",
              entityType: r.entity_type || "",
              entity_type: r.entity_type || "",
              entityId: r.entity_id || "",
              entity_id: r.entity_id || "",
              ip: r.ip || "N/A",
              created_at: r.created_at,
            }
          })
          setLogs(formatted)
          const fetchedTotal = json.total || 0
          setTotal(fetchedTotal)
          setCachedData(logsKey, { logs: formatted, total: fetchedTotal }, 30000)

          const maxPages = Math.max(1, Math.ceil(fetchedTotal / limit))
          if (page > maxPages && fetchedTotal > 0) {
            setPage(1)
            updateUrl(1, search)
            return
          }
        } else {
          setError(json.error || "Unable to load activity history.")
          showToast?.(json.error || "Unable to load activity history.", true)
        }
      } catch {
        if (request !== logsRequest.current) return
        setError("A network problem prevented the activity history from loading.")
        showToast?.("A network problem prevented the activity history from loading.", true)
      } finally {
        if (request === logsRequest.current) {
          setLoading(false)
          setIsManualLoading(false)
        }
      }
    },
    [page, limit, logFilters, search, startDate, endDate, sortBy, sortOrder, showToast, updateUrl]
  )

  useEffect(() => {
    queueMicrotask(() => {
      fetchOffices()
    })
  }, [fetchOffices])

  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (active) fetchLogs()
    })
    return () => { active = false; logsRequest.current += 1; }
  }, [fetchLogs])

  const toggleRow = useCallback((id) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }, [])

  const handleSort = (column) => {
    if (sortBy === column) {
      if (sortOrder === "ASC") {
        setSortOrder("DESC")
      } else if (column !== "created_at") {
        setSortBy("created_at")
        setSortOrder("DESC")
      } else {
        setSortOrder("ASC")
      }
    } else {
      setSortBy(column)
      setSortOrder("ASC")
    }
    setPage(1)
    updateUrl(1, search)
  }

  const handleQuickRange = (range) => {
    if (activeShortcut === range) {
      setStartDate("")
      setEndDate("")
      setPage(1)
      updateUrl(1, search)
      return
    }

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
        start.setDate(start.getDate() - 6)
        start.setHours(0, 0, 0, 0)
        break
      case "last30":
        start.setDate(start.getDate() - 29)
        start.setHours(0, 0, 0, 0)
        break
    }

    setStartDate(format(start, "yyyy-MM-dd"))
    setEndDate(format(end, "yyyy-MM-dd"))
    setPage(1)
    updateUrl(1, search)
  }

  const activeShortcut = (() => {
    if (!startDate || !endDate) return null
    const todayStr = format(new Date(), "yyyy-MM-dd")

    if (startDate === todayStr && endDate === todayStr) return "today"

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yestStr = format(yesterday, "yyyy-MM-dd")
    if (startDate === yestStr && endDate === yestStr) return "yesterday"

    const last7 = new Date()
    last7.setDate(last7.getDate() - 6)
    if (startDate === format(last7, "yyyy-MM-dd") && endDate === todayStr) return "last7"

    const last30 = new Date()
    last30.setDate(last30.getDate() - 29)
    if (startDate === format(last30, "yyyy-MM-dd") && endDate === todayStr) return "last30"

    return null
  })()

  const fetchAllForExport = async () => {
    const officeStr = (logFilters.office || []).join(",")
    const sevStr = (logFilters.severity || []).join(",")
    const officeQuery = officeStr ? `&officeId=${encodeURIComponent(officeStr)}` : ""
    const sevQuery = sevStr ? `&severity=${encodeURIComponent(sevStr)}` : ""
    const startQuery = startDate ? `&startDate=${encodeURIComponent(startDate)}` : ""
    const endQuery = endDate ? `&endDate=${encodeURIComponent(endDate)}` : ""
    const res = await fetch(
      `/api/audit-logs/global?limit=50000&search=${encodeURIComponent(search)}${officeQuery}${sevQuery}${startQuery}${endQuery}&sortBy=${sortBy}&sortOrder=${sortOrder}`
    )
    const json = await res.json()
    if (!res.ok || !json.ok) throw new Error(json.error || "Export failed")
    return (json.data || []).map((r) => {
      const off = (Array.isArray(offices) ? offices : []).find((o) => o.id === r.office_id)
      return {
        ...r,
        officeName: off ? off.short_name : "Global (Platform)",
        scope: off ? off.short_name : "Global",
      }
    })
  }

  const handleDownloadCSV = async () => {
    if (total === 0 || isExporting) return
    setIsExporting(true)
    try {
      const allLogs = await fetchAllForExport()
      const headers = [
        "Date & Time",
        "Severity",
        "Actor",
        "Role",
        "Scope",
        "Action",
        "Details",
        "IP Address",
        "User Agent",
        "Entity Type",
        "Entity ID",
      ]
      const rows = allLogs.map((log) => [
        log?.created_at ? formatPHDateTime(log.created_at) : "N/A",
        log?.severity || "INFO",
        log?.actor || "System",
        log?.role || "N/A",
        log?.scope || "Global",
        log?.action || "N/A",
        formatLogDetails(log?.details) || "No known description",
        log?.ip || "N/A",
        log?.user_agent || "N/A",
        log?.entity_type || "N/A",
        log?.entity_id || "N/A",
      ])
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")),
      ].join("\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const fileName = generateExportFilename("PLATFORM-ACTIVITY-HISTORY", "DATA", "csv")
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      showToast?.({
        title: "Export Success",
        description: "Platform activity history has been exported to CSV successfully.",
      })
    } catch (err) {
      console.error("[Export Error]", err)
      showToast?.({ title: "Export Failed", description: err.message || "Unable to export activity history to CSV." }, true)
    } finally {
      setIsExporting(false)
    }
  }

  const handlePreviewPDF = async () => {
    if (total === 0 || isGeneratingPdf) return
    setIsGeneratingPdf(true)
    const request = previewSession.begin();
    try {
      const allLogs = await fetchAllForExport()
      const selectedOffices = logFilters.office || []
      const selectedSeverities = logFilters.severity || []

      const offList = Array.isArray(offices) ? offices : []
      const scopeLabel =
        selectedOffices.length === 0
          ? "All Scopes"
          : selectedOffices
            .map((off) => {
              if (off === "global") return "Global (Platform)"
              const offObj = offList.find((o) => o.id === off)
              return offObj ? offObj.short_name || offObj.name : off
            })
            .join(", ")

      const severityLabel =
        selectedSeverities.length === 0 ? "All Severities" : selectedSeverities.join(", ")

      const blob = await generateAuditLogsPdf(allLogs, {
        scope: scopeLabel,
        severity: severityLabel,
        startDate,
        endDate,
        search,
      })
      const url = previewSession.createUrl(blob, request)
      if (!url) return;
      setPdfPreviewUrl(url)
      setPdfPreviewOpen(true)
    } catch (err) {
      if (!previewSession.isCurrent(request)) return;
      console.error("[PDF Preview Error]", err)
      showToast?.({ title: "Preview Failed", description: err.message || "Unable to generate PDF preview." }, true)
    } finally {
      if (previewSession.isCurrent(request)) setIsGeneratingPdf(false);
    }
  }

  const handleDownloadFromPreview = () => {
    if (!pdfBlobUrl) return
    try {
      const fileName = generateExportFilename("PLATFORM-ACTIVITY-HISTORY", "REPORT", "pdf")
      const link = document.createElement("a")
      link.href = pdfBlobUrl
      link.setAttribute("download", fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      showToast?.({
        title: "Download Success",
        description: "Platform activity history report has been downloaded successfully.",
      })
    } catch (err) {
      console.error("[PDF Download Error]", err)
      showToast?.({ title: "Download Failed", description: "Unable to download the PDF report." }, true)
    }
  }

  const handleCopy = (text, label) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    showToast?.({
      title: "Copied to Clipboard",
      description: `${label} has been successfully copied to your clipboard.`,
    })
  }

  const handleNextLog = () => {
    if (!selectedLog) return
    const currentIndex = logs.findIndex((log) => log.id === selectedLog.id)
    if (currentIndex < logs.length - 1) {
      setSelectedLog(logs[currentIndex + 1])
    }
  }

  const handlePrevLog = () => {
    if (!selectedLog) return
    const currentIndex = logs.findIndex((log) => log.id === selectedLog.id)
    if (currentIndex > 0) {
      setSelectedLog(logs[currentIndex - 1])
    }
  }

  const handleClearSearch = useCallback(() => {
    setLocalSearch("")
    setSearch("")
    setPage(1)
    updateUrl(1, "")
  }, [setLocalSearch, updateUrl])

  const handleClearFilters = useCallback(() => {
    setLocalSearch("")
    setSearch("")
    setLogFilters((current) => ({ ...current, office: [] }))
    setStartDate("")
    setEndDate("")
    setPage(1)
    updateUrl(1, "")
  }, [setEndDate, setLocalSearch, setLogFilters, setStartDate, updateUrl])

  const totalPages = Math.ceil(total / limit) || 1
  const displayPage = Math.min(page, totalPages)

  const updatePage = useCallback((newPage) => {
    const validPage = Math.max(1, Math.min(totalPages, newPage))
    setPage(validPage)
    updateUrl(validPage, search, "push")
  }, [totalPages, search, updateUrl])
  const hasActiveFilters =
    localSearch !== "" ||
    (logFilters.office?.length > 0) ||
    startDate !== "" ||
    endDate !== ""

  return (
    <TooltipProvider delay={200}>
      <div className="animate-fade-up font-jakarta flex flex-[1_0_auto] flex-col w-full min-w-0 gap-6">
        {/* ONE Single Card Container encapsulating Header, Metrics, Toolbar, Table & Pagination */}
        <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
          <PageHeader
            icon="Shield01Icon"
            title="Platform Activity History"
            description={
              loading && total === 0
                ? <Skeleton className="mt-1 h-4 w-52" />
                : (
                    <span className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                      <span>Track every institutional action, approval, and system event across the platform.</span>
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-gray-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {total.toLocaleString()} matching recorded actions
                      </span>
                    </span>
                  )
            }
            showBorder={false}
            className="px-6 py-5"
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          />

          <div role="group" aria-label="Activity severity" className="flex items-end gap-5 border-b border-border px-6 dark:border-border">
            {[["", "All Levels"], ["INFO", "Information"], ["WARNING", "Warning"], ["CRITICAL", "Critical"]].map(([value, label]) => (
              <button
                key={value || "all"}
                type="button"
                aria-pressed={(logFilters.severity[0] || "") === value}
                onClick={() => {
                  setLogFilters((current) => ({ ...current, severity: value ? [value] : [] }))
                  setPage(1)
                  updateUrl(1, search)
                }}
                className={cn("relative flex h-9 items-center px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon", (logFilters.severity[0] || "") === value ? "text-pup-maroon dark:text-red-400 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-current" : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white")}
              >
                {label}
              </button>
            ))}
          </div>

          <DataViewToolbar label="Platform activity search, filters, sorting, columns, and dates" className="gap-2 bg-gray-50/40 p-4 dark:bg-zinc-900/30 sm:px-5 sm:py-3">
            {/* Search Input with Pure Number Count (Left side) */}
            <div className="relative flex-1 sm:w-64 min-w-[200px] max-w-sm group">
              <Search01Icon size="1em" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-xs pointer-events-none" />
              <Input
                type="text"
                placeholder="Search logs by actor, action, details..."
                aria-label="Search platform activity history"
                className="h-9 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 pl-8 pr-16 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && localSearch) {
                    handleClearSearch()
                  }
                }}
              />
              <div className="absolute inset-y-0 right-3 flex items-center gap-1.5">
                {localSearch && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    aria-label="Clear search"
                    title="Clear search"
                    className="flex h-5 w-5 items-center justify-center rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    <Cancel01Icon size="1em" className="text-[11px]" />
                  </button>
                )}
                <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-sans tabular-nums pointer-events-none">
                  {loading && total === 0 ? <Skeleton className="h-3 w-6" /> : total.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Filter controls (Right side) */}
            <div className="flex shrink-0 items-center gap-2">
              <FilterPopover
                fields={auditFilterFields}
                filters={logFilters.office.length ? [{ id: "audit-offices", fieldKey: "office", operator: "is_any", value: logFilters.office }] : []}
                onFiltersChange={(rules) => {
                  setLogFilters((current) => ({ ...current, office: rules.flatMap((rule) => Array.isArray(rule.value) ? rule.value : [rule.value]) }))
                  setPage(1)
                  updateUrl(1, search)
                }}
                maxRulesPerField={1}
                entityLabel="activity"
              />
              <SortPopover options={SORT_OPTIONS} sortBy={sortBy} onSortByChange={(key) => { setSortBy(key); setSortOrder("ASC"); setPage(1); updateUrl(1, search) }} sortOrder={sortOrder} onSortOrderChange={(order) => { setSortOrder(order); setPage(1); updateUrl(1, search) }} />
              <ColumnsPopover columns={OPTIONAL_COLUMNS} visibleColumns={visibleColumns} onVisibleColumnsChange={setVisibleColumns} />

              {/* Time Shortcuts */}
              <div className="flex h-9 items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-border dark:border-border shrink-0">
                {[
                  { key: "today", label: "Today" },
                  { key: "yesterday", label: "Yest." },
                  { key: "last7", label: "7d" },
                  { key: "last30", label: "30d" },
                ].map((range) => {
                  const isActive = activeShortcut === range.key
                  return (
                    <button
                      key={range.key}
                      type="button"
                      onClick={() => handleQuickRange(range.key)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap",
                        isActive
                          ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                          : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                      )}
                    >
                      {range.label}
                    </button>
                  )
                })}
              </div>

              {/* Date pickers */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-[105px]">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-9 w-full justify-start rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-left text-xs font-normal shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-white/10 px-2.5",
                          !startDate ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                        )}
                      >
                        {startDate ? format(parseDateLocal(startDate), "MMM d") : "Start"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto rounded-2xl border-[0.5px] border-border bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-card" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate ? parseDateLocal(startDate) : undefined}
                        onSelect={(date) => {
                          setStartDate(date ? format(date, "yyyy-MM-dd") : "")
                          setPage(1)
                          updateUrl(1, search)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <span className="text-[11px] text-gray-400 dark:text-zinc-500">→</span>
                <div className="w-[105px]">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-9 w-full justify-start rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-left text-xs font-normal shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-white/10 px-2.5",
                          !endDate ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                        )}
                      >
                        {endDate ? format(parseDateLocal(endDate), "MMM d") : "End"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto rounded-2xl border-[0.5px] border-border bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-card" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate ? parseDateLocal(endDate) : undefined}
                        onSelect={(date) => {
                          setEndDate(date ? format(date, "yyyy-MM-dd") : "")
                          setPage(1)
                          updateUrl(1, search)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <TableScrollControls scrollContainerRef={tableContainerRef}
                canScrollLeft={canScrollLeft}
                canScrollRight={canScrollRight}
                isScrolled={isScrolled}
                onScrollLeft={scrollLeft}
                onScrollRight={scrollRight}
                onResetScroll={resetTableScroll}
                controlSize="md"
              />
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <RefreshButton onRefresh={() => fetchLogs(true)} isLoading={isManualLoading} title="Refresh Activity History" className="h-9 w-9" />
              <Button type="button" variant="outline" onClick={handleDownloadCSV} disabled={total === 0 || isExporting || isGeneratingPdf} className="h-9 shrink-0 px-3 text-xs">
                {isExporting ? <><Loading01Icon size={14} aria-hidden="true" className="mr-1.5 animate-spin" />Exporting...</> : "Export CSV"}
              </Button>
              <Button type="button" onClick={handlePreviewPDF} disabled={total === 0 || isExporting || isGeneratingPdf} className="h-9 shrink-0 px-3 text-xs">
                {isGeneratingPdf ? <><Loading01Icon size={14} aria-hidden="true" className="mr-1.5 animate-spin" />Generating...</> : PDF_ACTION_LABELS.preview}
              </Button>
            </div>
          </DataViewToolbar>

          {/* Active Filter Chips Row */}
          <ActiveFilterChips
            groups={logFilterGroups}
            selected={logFilters}
            onRemove={(groupId, val) => {
              setLogFilters((prev) => ({
                ...prev,
                [groupId]: (prev[groupId] || []).filter((v) => v !== val),
              }))
              setPage(1)
              updateUrl(1, search)
            }}
            searchQuery={localSearch}
            onClearSearch={handleClearSearch}
            extraChips={[
              ...(startDate || endDate
                ? [
                  {
                    groupLabel: "Date Range",
                    label: `${startDate ? format(parseDateLocal(startDate), "MMM d, yyyy") : "Start"} → ${endDate ? format(parseDateLocal(endDate), "MMM d, yyyy") : "End"}`,
                    onClear: () => {
                      setStartDate("")
                      setEndDate("")
                      setPage(1)
                      updateUrl(1, search)
                    },
                  },
                ]
                : []),
            ]}
            onClearAll={handleClearFilters}
            className="border-t border-border dark:border-border bg-white dark:bg-card px-6 py-2.5"
          />

          {/* Content Area inside Single Card */}
          {loading && (!logs || logs.length === 0) ? (
            <AuditLogsTableSkeleton rowCount={limit} embedded={true} showScope={true} visibleColumns={visibleColumns} />
          ) : error ? (
            <div className="flex flex-[1_0_auto] min-h-[420px] flex-col items-center justify-center border-t border-border dark:border-border bg-transparent text-center p-6 rounded-b-2xl">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia className="text-red-600 dark:text-red-400"><EmptyAlertCircleIcon size="1em" /></EmptyMedia>
                  <EmptyTitle>
                    Load failed
                  </EmptyTitle>
                  <EmptyDescription>
                    {error}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    variant="outline"
                    onClick={() => fetchLogs(true)}
                    title="Retry Loading"
                    className="flex h-10 items-center justify-center gap-2 px-5"
                  >
                    Retry Loading
                  </Button>
                </EmptyContent>
              </Empty>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-[1_0_auto] min-h-[420px] flex-col items-center justify-center border-t border-border dark:border-border bg-transparent text-center p-6 rounded-b-2xl">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia><EmptySearch01Icon size="1em" /></EmptyMedia>
                  <EmptyTitle>
                    No Activity Found
                  </EmptyTitle>
                  <EmptyDescription>
                    Try adjusting your search filters to find what you&apos;re looking for.
                  </EmptyDescription>
                </EmptyHeader>
                {hasActiveFilters && (
                  <EmptyContent>
                    <Button
                      variant="outline"
                      onClick={handleClearFilters}
                      title="Reset Filters"
                      className="flex h-10 items-center justify-center gap-2 px-5"
                    >
                      Reset Filters
                    </Button>
                  </EmptyContent>
                )}
              </Empty>
            </div>
          ) : (
            <div className="flex-[1_0_auto] min-w-0 overflow-hidden rounded-b-2xl bg-white dark:bg-card flex flex-col">
              <div
                ref={tableContainerRef}
                className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2 select-none"
              >
                <Table columns={tableColumns} className="min-w-[900px]">
                  <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                    <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none">
                      <th
                        className="w-12 min-w-12 max-w-12 px-2.5 py-4 text-center"
                      >
                      </th>
                      <th className="p-4 w-[14%]" aria-sort={sortBy === "created_at" ? (sortOrder === "ASC" ? "ascending" : "descending") : undefined}>
                        <button
                          onClick={() => handleSort("created_at")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                            sortBy === "created_at" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Timestamp{" "}
                          <SortIndicator column="created_at" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>
                      {showColumn("severity") && <th className="p-4 w-[9%]" aria-sort={sortBy === "severity" ? (sortOrder === "ASC" ? "ascending" : "descending") : undefined}>
                        <button
                          onClick={() => handleSort("severity")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                            sortBy === "severity" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Level{" "}
                          <SortIndicator column="severity" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>}
                      {showColumn("actor") && <th className="p-4 w-[14%]" aria-sort={sortBy === "actor" ? (sortOrder === "ASC" ? "ascending" : "descending") : undefined}>
                        <button
                          onClick={() => handleSort("actor")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                            sortBy === "actor" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Actor{" "}
                          <SortIndicator column="actor" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>}
                      {showColumn("office_id") && <th className="p-4 w-[10%]" aria-sort={sortBy === "office_id" ? (sortOrder === "ASC" ? "ascending" : "descending") : undefined}>
                        <button
                          onClick={() => handleSort("office_id")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                            sortBy === "office_id" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Scope{" "}
                          <SortIndicator column="office_id" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>}
                      <th className="p-4 w-[16%]" aria-sort={sortBy === "action" ? (sortOrder === "ASC" ? "ascending" : "descending") : undefined}>
                        <button
                          onClick={() => handleSort("action")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                            sortBy === "action" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Action{" "}
                          <SortIndicator column="action" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>
                      {showColumn("details") && <th className="p-4 text-xs font-semibold text-gray-500 dark:text-zinc-400">
                        Description
                      </th>}
                      {showColumn("ip") && <th>IP Address</th>}
                      <th className="w-12 text-center text-xs font-semibold text-gray-500 dark:text-zinc-400">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-transparent divide-y divide-border dark:divide-border bg-white dark:bg-card">
                    {logs.map((log) => {
                      const severityInfo = getSeverityInfo(log.severity)
                      const isExpanded = !!expandedRows[log.id]
                      const isSelected = selectedLog && selectedLog.id === log.id

                      const formattedTimestamp = (() => {
                        try {
                          const d = new Date(log.created_at || log.time)
                          if (isNaN(d.getTime())) return log.created_at || log.time
                          return d.toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })
                        } catch {
                          return log.created_at || log.time
                        }
                      })()

                      return (
                        <React.Fragment key={log.id}>
                          <tr
                            selected={Boolean(isSelected)}
                            onClick={() => toggleRow(log.id)}
                            className={cn(
                              "group border-b-[0.5px] border-border dark:border-border last:border-b-0 transition-colors hover:bg-gray-50/70 dark:bg-card dark:hover:bg-zinc-800/40 select-none cursor-pointer",
                              isSelected && "bg-blue-50/60 dark:bg-blue-950/20",
                              isExpanded && "bg-gray-50 dark:bg-white/8"
                            )}
                          >
                            {/* Accordion Chevron */}
                            <td
                              className="w-12 min-w-12 max-w-12 px-2.5 py-4 align-middle text-center border-r border-border/70 dark:border-border/70"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => toggleRow(log.id)}
                                title={isExpanded ? "Collapse Details" : "Expand Details"}
                                className="mx-auto flex h-7 w-7 rounded-lg items-center justify-center bg-transparent border-none text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 cursor-pointer active:scale-95 transition-colors"
                              >
                                <AppIcon className={cn(" text-[14px]", isExpanded ? "MinusSignIcon" : "Add01Icon")}></AppIcon>
                              </button>
                            </td>

                            {/* Timestamp */}
                            <td className="p-4 align-middle text-xs font-medium text-gray-500 dark:text-zinc-400 whitespace-nowrap border-r border-border/70 dark:border-border/70">
                              {formattedTimestamp}
                            </td>

                            {/* Level / Severity */}
                            {showColumn("severity") && <td className="p-4 align-middle border-r border-border/70 dark:border-border/70">
                              <span
                                className={cn(
                                  "inline-flex w-fit items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide shadow-none transition-all",
                                  severityInfo.classes
                                )}
                              >
                                {severityInfo.label}
                              </span>
                            </td>}

                            {/* Actor */}
                            {showColumn("actor") && <td className="p-4 align-middle overflow-hidden border-r border-border/70 dark:border-border/70">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <AuditActorAvatar
                                  log={log}
                                  className="size-8 border border-border"
                                  fallbackClassName="text-[10px] font-semibold"
                                />
                                <div className="flex flex-col overflow-hidden min-w-0">
                                  <span className="truncate text-[13px] font-semibold text-gray-900 dark:text-zinc-100" title={formatTitleCase(log.actor)}>
                                    {formatTitleCase(log.actor)}
                                  </span>
                                  <span className="truncate text-xs font-normal text-gray-500 dark:text-zinc-400 mt-0.5" title={log.role}>
                                    {log.role}
                                  </span>
                                </div>
                              </div>
                            </td>}

                            {/* Scope */}
                            {showColumn("office_id") && <td className="p-4 align-middle whitespace-nowrap overflow-hidden text-xs font-medium text-gray-900 dark:text-zinc-100 border-r border-border/70 dark:border-border/70">
                              <TableStatus value={log.scope} tone={log.office_id ? "neutral" : "info"} className="text-[10px]" title={log.officeName} />
                            </td>}

                            {/* Action */}
                            <td className="p-4 align-middle text-[13px] font-medium text-gray-900 dark:text-zinc-100 border-r border-border/70 dark:border-border/70">
                              <span className="block w-full min-w-0 truncate" title={formatActionLabel(log.action)}>{formatActionLabel(log.action)}</span>
                            </td>

                            {/* Description Tooltip */}
                            {showColumn("details") && <td className="p-4 align-middle overflow-hidden border-r border-border/70 dark:border-border/70">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="block w-full min-w-0 truncate text-xs font-normal text-gray-500 dark:text-zinc-400" title={formatLogDetails(log.details) || "N/A"}>
                                    {formatLogDetails(log.details) || "N/A"}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="max-w-[400px] rounded-xl border-border bg-white p-3 text-xs font-medium text-gray-700 shadow-2xl backdrop-blur-sm dark:border-border dark:bg-card/95 dark:text-zinc-200"
                                >
                                  {formatLogDetails(log.details) || "N/A"}
                                </TooltipContent>
                              </Tooltip>
                            </td>}

                            {/* Actions: View Details in Sheet */}
                            {showColumn("ip") && <td className="p-4 tabular-nums">{log.ip || "N/A"}</td>}
                            <td className="w-12 px-2 align-middle text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => setSelectedLog(log)}
                                      aria-label="View Details"
                                      className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                                    >
                                      <ViewIcon size="1em" className="text-[16px]"></ViewIcon>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>View Details</TooltipContent>
                                </Tooltip>
                              </div>
                            </td>
                          </tr>

                          {/* Accordion Expanded Details */}
                          {isExpanded && (
                            <tr className="border-0 bg-gray-50 dark:bg-muted/30">
                              <td colSpan={tableColumns.length} className="p-0">
                                <LogExpandedRow log={log} handleCopy={handleCopy} />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </Table>
              </div>

              {/* Pagination Toolbar */}
              <TablePagination label="Global audit log pages" page={page} pageSize={limit} totalCount={total} displayedCount={logs.length} onPageChange={updatePage} onPageSizeChange={(size) => { setLimit(size); setPage(1); updateUrl(1, search); }} loading={loading} />
            </div>
          )}
        </Card>

        {/* Log Detail Side Sheet */}
        <LogDetailSheet
          selectedLog={selectedLog}
          setSelectedLog={setSelectedLog}
          handleCopy={handleCopy}
          onSearchSimilar={(term) => {
            const cleanTerm = term || ""
            setLocalSearch(cleanTerm)
            setSearch(cleanTerm)
            setPage(1)
            updateUrl(1, cleanTerm)
          }}
          onNext={handleNextLog}
          onPrev={handlePrevLog}
          hasNext={logs.length > 0 && selectedLog && logs.findIndex((l) => l.id === selectedLog.id) < logs.length - 1}
          hasPrev={logs.length > 0 && selectedLog && logs.findIndex((l) => l.id === selectedLog.id) > 0}
          currentIndex={selectedLog ? logs.findIndex((l) => l.id === selectedLog.id) : -1}
          totalCount={logs.length}
        />

        {/* PDF Export Preview Dialog */}
        <PDFPreviewModal
          open={pdfPreviewOpen}
          onClose={() => {
            previewSession.cancel();
            setIsGeneratingPdf(false);
            setPdfPreviewUrl(null)
            setPdfPreviewOpen(false)
          }}
          title="Activity History Report Preview"
          description="Review the recorded actions and details before printing or downloading."
          pdfUrl={pdfBlobUrl}
          onDownload={handleDownloadFromPreview}
        />
      </div>
    </TooltipProvider>
  )
}
