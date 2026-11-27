"use client"
import { BADGE_BASE } from "@/lib/badgeStyles";

import TablePagination from "@/components/shared/TablePagination";


import useUrlPage from "@/hooks/useUrlPage"
import useOsasViewPreference from "@/hooks/useOsasViewPreference";
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";
import { useState, useEffect, useMemo } from "react"
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import FloatingActionBar from "@/components/shared/FloatingActionBar"
import PageHeader from "@/components/shared/PageHeader"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import DataContentSkeleton from "@/components/shared/DataContentSkeleton"
import RecordsArchiveSkeleton from "@/components/staff/skeletons/RecordsArchiveSkeleton"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { SortPopover } from "@/components/systemadmin/OfficeTableControls"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import DataViewToolbar from "@/components/shared/DataViewToolbar"
import { SegmentedControl } from "@/components/ui/tabs"
import StudentProfileSheet from "./StudentProfileSheet"
import StudentDriveFilesView from "./StudentDriveFilesView"
import EditStudentModal from "./EditStudentModal"
import EditOrganizationModal from "./EditOrganizationModal"

import { FOLDER_COLORS } from "@/lib/constants"
function getStudentNoYear(studentNo) {
  const raw = String(studentNo || "").trim();
  const yearPart = raw.split("-")[0];
  const year = Number(yearPart);
  if (!Number.isInteger(year) || year < 1900 || year > 2200) return null;
  return year;
}

function getStudentFolderYear(s) {
  if (!s) return null;
  const derived = getStudentNoYear(s.studentNo || s.student_no);
  if (derived != null) return derived;
  const fromDb = Number(s.yearLevel ?? s.year_level);
  return Number.isFinite(fromDb) ? fromDb : null;
}

function organizationRecord(org) {
  return {
    studentNo: org.id,
    acronym: org.acronym || org.id,
    name: org.name,
    room: org.storage_room || 1,
    cabinet: org.storage_cabinet || (org.category === "Academic" ? "ACADEMIC ORGANIZATIONS" : "NON-ACADEMIC ORGANIZATIONS"),
    drawer: org.storage_drawer || "1",
    status: org.status,
    category: org.category || "Academic",
    adviser: org.adviser_name,
    activeOfficerCount: org.active_officer_count,
    proposalCount: org.proposal_count,
    hasCbl: Boolean(org.bylaws_storage_filename),
    bylawsStorageFilename: org.bylaws_storage_filename,
    rawOrg: org,
  }
}

import ConfirmModal from "@/components/shared/ConfirmModal"
import OfficeDocumentsTable from "@/components/staff/OfficeDocumentsTable"
import { fetchAllPages } from "@/lib/fetchAllPages"
import { cn, formatTitleCase } from "@/lib/utils"
import {
  Archive01Icon as EmptyArchive01Icon,
  Building03Icon as EmptyBuilding03Icon,
  UserGroupIcon as EmptyUserGroupIcon,
  ArrowRight01Icon,
  Calendar01Icon,
  File02Icon,
  Files01Icon,
  FolderOpenIcon,
  LayoutGridIcon,
  Location01Icon,
  Menu01Icon,
  PaintBoardIcon,
  Search01Icon,
  Tick01Icon,
  UserIcon,
  UserSearch01Icon,
} from "hugeicons-react";

const FOLDER_SORT_OPTIONS_REGISTRAR = [
  { key: "year", label: "School Year" },
  { key: "count", label: "Record Count" },
  { key: "name", label: "Folder Name" },
];

const FOLDER_SORT_OPTIONS_OSAS = [
  { key: "name", label: "Category Name" },
  { key: "count", label: "Record Count" },
];

const RECORD_SORT_OPTIONS_REGISTRAR = [
  { key: "name", label: "Student Name" },
  { key: "studentNo", label: "Student Number" },
  { key: "courseCode", label: "Degree Program" },
  { key: "section", label: "Section" },
  { key: "room", label: "Physical Archive" },
  { key: "documents", label: "Document Count" },
];

const RECORD_SORT_OPTIONS_OSAS = [
  { key: "name", label: "Organization Name" },
  { key: "studentNo", label: "Acronym" },
];

function InteractiveMacFolder({ it, theme, updateFolderColor, folderColors }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [12, -12]), { stiffness: 280, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-12, 12]), { stiffness: 280, damping: 20 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(nx);
    mouseY.set(ny);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const currentColorKey = folderColors[it.key] || "yellow";
  const currentColorVal = FOLDER_COLORS[currentColorKey] || FOLDER_COLORS["yellow"];

  return (
    <motion.div
      onClick={it.disabled ? undefined : it.onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`group relative h-44 sm:h-48 w-full min-w-[220px] max-w-[340px] ${ it.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer" }`}
      style={{ 
        perspective: "1200px",
        rotateX,
        rotateY,
        transformStyle: "preserve-3d"
      }}
    >
      {/* Paint Palette Color Picker Button */}
      <div 
        className="absolute bottom-2.5 right-2.5 z-40 opacity-0 group-hover:opacity-100 transition-opacity duration-fast" 
        onClick={(e) => e.stopPropagation()}
        style={{ transform: "translateZ(30px)" }}
      >
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "w-7 h-7 rounded-full bg-black/15 hover:bg-black/25 dark:bg-white/15 dark:hover:bg-white/25 backdrop-blur-md border border-white/20 shadow-sm transition-all cursor-pointer",
                theme.isLight ? "text-amber-950/90" : "text-white"
              )}
              title={`Change Folder Color (${currentColorVal.name})`}
            >
              <PaintBoardIcon size="1em" className="text-sm" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-60 p-0 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-[0.5px] border-border dark:border-white/10 shadow-2xl overflow-hidden select-none" 
            side="top" 
            align="end"
            sideOffset={8}
          >
            {/* 1. Header Zone */}
            <div className="flex items-center justify-between px-4.5 py-2.5 border-b border-black/[0.06] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
              <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                Folder Color
              </span>
              <div className="flex items-center gap-2">
                {currentColorKey !== "yellow" && (
                  <button
                    type="button"
                    onClick={() => updateFolderColor(it.key, "yellow")}
                    className="text-[11px] font-semibold text-pup-maroon dark:text-red-400 hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-700/60 text-gray-700 dark:text-zinc-300">
                  {currentColorVal.name}
                </span>
              </div>
            </div>

            {/* 2. Body Zone */}
            <div className="p-3">
              <div className="grid grid-cols-4 gap-1.5">
                {Object.entries(FOLDER_COLORS).map(([colorKey, colorVal]) => {
                  const isSelected = currentColorKey === colorKey;
                  return (
                    <button
                      key={colorKey}
                      type="button"
                      onClick={() => updateFolderColor(it.key, colorKey)}
                      className={cn(
                        "group/swatch relative h-8 w-full rounded-lg border transition-all cursor-pointer flex items-center justify-center shadow-2xs hover:scale-105 active:scale-95",
                        isSelected 
                          ? "ring-2 ring-pup-maroon dark:ring-white ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 border-black/10" 
                          : "border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30"
                      )}
                      style={{
                        background: `linear-gradient(135deg, ${colorVal.frontStart} 0%, ${colorVal.frontEnd} 100%)`
                      }}
                      title={colorVal.name}
                    >
                      {isSelected && (
                        <Tick01Icon size="1em" className="text-xs text-white drop-shadow-xs" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* macOS Folder Back Flap */}
      <div 
        className="absolute top-[18px] left-0 right-0 bottom-0 rounded-2xl transition-all duration-normal"
        style={{
          background: `linear-gradient(180deg, ${theme.backStart} 0%, ${theme.backEnd} 100%)`,
          transform: "translateZ(-10px)"
        }}
      >
        {/* Folder Tab */}
        <div 
          className="absolute bottom-[calc(100%-1px)] left-[16px] w-20 h-4 rounded-t-[8px] z-0"
          style={{
            backgroundColor: theme.backStart
          }}
        />
      </div>

      {/* Solid Paper Peek Sheets */}
      <div 
        className="absolute top-[2px] left-[5%] right-[5%] bottom-[20px] z-10 flex flex-col justify-end transition-all duration-normal group-hover:translate-y-[-12px] group-hover:scale-[1.02]"
        style={{ transform: "translateZ(0px)" }}
      >
        {/* Back sheet */}
        <div className="absolute bottom-0 left-[6%] right-[6%] h-[56px] bg-white/70 rounded-t-md shadow-[0_-1px_3px_rgba(0,0,0,0.05)] border-t border-x border-border/20 transform -rotate-3 origin-bottom transition-all duration-normal group-hover:rotate-[-6deg]" />
        
        {/* Middle sheet */}
        <div className="absolute bottom-0 left-[3%] right-[3%] h-[60px] bg-white/85 rounded-t-md shadow-[0_-1px_4px_rgba(0,0,0,0.05)] border-t border-x border-border/30 transform origin-bottom transition-all duration-normal group-hover:rotate-[4deg]" />
        
        {/* Front sheet with mock content lines */}
        <div className="absolute bottom-0 left-0 right-0 h-[64px] bg-white rounded-t-md shadow-[0_-2px_6px_rgba(0,0,0,0.08)] border-t border-x border-border p-3 flex flex-col gap-1.5 transition-all duration-normal">
          <div className="h-1.5 w-1/3 bg-gray-300/60 rounded-full" />
          <div className="h-1 w-full bg-gray-200/50 rounded-full" />
          <div className="h-1 w-5/6 bg-gray-200/50 rounded-full" />
        </div>
      </div>

      {/* macOS Folder Front Body */}
      <div 
        className="absolute top-[28px] right-0 bottom-0 left-0 z-20 flex flex-col items-center justify-center rounded-2xl p-4 transition-all duration-normal origin-bottom group-hover:[transform:rotateX(-14deg)_translateY(2px)]"
        style={{
          background: `linear-gradient(180deg, ${theme.frontStart} 0%, ${theme.frontEnd} 100%)`,
          transformStyle: "preserve-3d",
          transform: "translateZ(10px)"
        }}
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/5 to-white/15 pointer-events-none z-25" />
        
        <h3 
          className={cn(
            "w-full truncate px-1 text-center text-3xl font-black sm:text-4xl z-30 tracking-tight",
            theme.title
          )}
          style={{ transform: "translateZ(20px)" }}
        >
          {it.title}
        </h3>
        <span 
          className={cn(
            "mt-1 text-xs font-bold tracking-widest z-30 uppercase opacity-90",
            theme.subtitle
          )}
          style={{ transform: "translateZ(20px)" }}
        >
          {it.subtitle}
        </span>
      </div>
    </motion.div>
  );
}

export default function RecordsArchiveTab({
  quickQuery,
  setQuickQuery,
  onLocateStudent,
  breadcrumbs,
  currentLevel,
  onBreadcrumbClick,
  onSwitchView,
  onPreviewDocument,
  onRescan,
  onRestoreStudent,
  selectedIds,
  onSelectionChange,
  onBulkArchive,
  onBulkRestore,
  officeLabel,
  courses = [],
  sections = [],
  storageLayout = null,
  onStudentUpdated,
  showToast,
  authUser = null,
  onSelectYear,
  onSelectCategory,
  refreshVersion = 0,
}) {
  const isOsas = officeLabel === "OSAS"
  const [showArchived, setShowArchived] = useOsasViewPreference("records_archive", "showArchived", false)
  const [page, setPage] = useUrlPage()
  const [itemsPerPage, setItemsPerPage] = useOsasViewPreference("records_archive", "pageSize", 20)
  const [folderSortBy, setFolderSortBy] = useOsasViewPreference("records_archive", "folderSortBy", isOsas ? "name" : "year")
  const [folderSortOrder, setFolderSortOrder] = useOsasViewPreference("records_archive", "folderSortOrder", isOsas ? "ASC" : "DESC")
  const [recordSortBy, setRecordSortBy] = useOsasViewPreference("records_archive", "recordSortBy", "name")
  const [recordSortOrder, setRecordSortOrder] = useOsasViewPreference("records_archive", "recordSortOrder", "ASC")
  const [browseSummary, setBrowseSummary] = useState(null)
  const [browsePage, setBrowsePage] = useState({ rows: [], total: 0 })
  const [browseResults, setBrowseResults] = useState({ rows: [], total: 0 })
  const [browseLoading, setBrowseLoading] = useState(false)
  const [browseSortPending, setBrowseSortPending] = useState(false)
  const [quickSearchLoading, setQuickSearchLoading] = useState(false)
  const [browseVersion, setBrowseVersion] = useState(0)
  const [selectedDocs, setSelectedDocs] = useState({ studentNo: null, rows: [] })
  const selectedYear = Number(breadcrumbs?.find((b) => b.level === "students")?.label.match(/\d{4}/)?.[0]) || null
  const archiveCategory = breadcrumbs?.find((b) => b.level === "organizations")?.label.replace(/ Organizations$/, "") || null
  const browseFolder = JSON.stringify([isOsas ? archiveCategory : selectedYear, showArchived])


  useEffect(() => {
    const controller = new AbortController()
    const url = isOsas ? "/api/osas/organizations?mode=archive-summary" : "/api/students/browse?mode=summary"
    fetch(url, { cache: "no-store", signal: controller.signal })
      .then((res) => res.json())
      .then((json) => { if (json?.ok) setBrowseSummary(json.data); else throw new Error(json?.error || "Archive unavailable") })
      .catch((error) => {
        if (controller.signal.aborted) return
        setBrowseSummary((summary) => summary ?? { error: true })
        showToast?.({ title: "Archive Load Failed", description: error.message }, true)
      })
    return () => controller.abort()
  }, [isOsas, browseVersion, refreshVersion, showToast])

  useEffect(() => {
    if ((!isOsas && !selectedYear) || (isOsas && !archiveCategory)) {
      setBrowseSortPending(false)
      return
    }
    const controller = new AbortController()
    const params = isOsas
      ? new URLSearchParams({
          status: showArchived ? "Archived" : "Active,Inactive",
          category: archiveCategory,
          limit: String(itemsPerPage),
          offset: String((page - 1) * itemsPerPage),
          sortBy: recordSortBy,
          sortOrder: recordSortOrder,
        })
      : new URLSearchParams({
          archived: String(showArchived),
          folderYear: String(selectedYear),
          page: String(page),
          pageSize: String(itemsPerPage),
          sortBy: recordSortBy,
          sortOrder: recordSortOrder,
        })
    const url = isOsas ? `/api/osas/organizations?${params}` : `/api/students/browse?${params}`
    const loadingTimer = setTimeout(() => setBrowseLoading(true), 0)
    fetch(url, { cache: "no-store", signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        if (!json?.ok) throw new Error(json?.error || "Archive unavailable")
        if (controller.signal.aborted) return
        const result = isOsas ? { rows: json.data.map(organizationRecord), total: json.total } : json.data
        setBrowsePage({ ...result, folder: browseFolder })
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setBrowsePage((previous) => previous.folder === browseFolder ? previous : { rows: [], total: 0, folder: browseFolder, error: error.message })
      })
      .finally(() => {
        if (controller.signal.aborted) return
        setBrowseLoading(false)
        setBrowseSortPending(false)
      })
    return () => { clearTimeout(loadingTimer); controller.abort() }
  }, [isOsas, selectedYear, archiveCategory, showArchived, browseFolder, page, itemsPerPage, recordSortBy, recordSortOrder, browseVersion, refreshVersion])

  useEffect(() => {
    if (!quickQuery.trim()) {
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setQuickSearchLoading(true)
      const params = isOsas
        ? new URLSearchParams({ search: quickQuery.trim(), status: showArchived ? "Archived" : "Active,Inactive", limit: "10" })
        : new URLSearchParams({ q: quickQuery.trim(), archived: String(showArchived), pageSize: "10" })
      const url = isOsas ? `/api/osas/organizations?${params}` : `/api/students/browse?${params}`
      fetch(url, { cache: "no-store", signal: controller.signal })
        .then((res) => res.json())
        .then((json) => { if (json?.ok) setBrowseResults(isOsas ? { rows: json.data.map(organizationRecord), total: json.total } : json.data) })
        .catch(() => {})
        .finally(() => { if (!controller.signal.aborted) setQuickSearchLoading(false) })
    }, 300)
    return () => { clearTimeout(timer); controller.abort() }
  }, [isOsas, quickQuery, showArchived, browseVersion, refreshVersion])


  const [folderColors, setFolderColors] = useState({})

  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = localStorage.getItem("pup-folder-colors")
      if (saved) {
        try {
          setFolderColors(JSON.parse(saved))
        } catch (e) {
          console.error("Failed to parse folder colors", e)
        }
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  const updateFolderColor = (key, colorId) => {
    const next = { ...folderColors, [key]: colorId }
    setFolderColors(next)
    localStorage.setItem("pup-folder-colors", JSON.stringify(next))
  }

  // Clear selection when toggling archived view
  useEffect(() => {
    onSelectionChange(new Set())
  }, [showArchived, onSelectionChange])

  const [prevFilters, setPrevFilters] = useState({
    currentLevel,
    showArchived,
    quickQuery,
  })

  const toggleSelect = (id) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectionChange(next)
  }

  const toggleSelectAll = (items) => {
    const allIds = items.map(it => it.student.studentNo)
    const allSelected = allIds.every(id => selectedIds.has(id))
    const next = new Set(selectedIds)
    if (allSelected) {
      allIds.forEach(id => next.delete(id))
    } else {
      allIds.forEach(id => next.add(id))
    }
    onSelectionChange(next)
  }

  if (
    prevFilters.currentLevel !== currentLevel ||
    prevFilters.showArchived !== showArchived ||
    prevFilters.quickQuery !== quickQuery
  ) {
    setPrevFilters({ currentLevel, showArchived, quickQuery })
    setPage(1)
  }
  // View Mode: "folders" (3D Mac folders) or "master-list" (flat all documents table)
  const [archiveViewMode, setArchiveViewMode] = useOsasViewPreference("records_archive", "viewMode", "folders")

  // Restore Modal State
  const [restoreStudentOpen, setRestoreStudentOpen] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState(null)

  // Single Archive Modal State
  const [archiveStudentOpen, setArchiveStudentOpen] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState(null)

  const handleArchiveRecord = (sn) => {
    const target = browsePage.rows.find((s) => (s.studentNo || s.id) === sn) || activeStudent
    if (!target) return
    setArchiveTarget(target)
    setArchiveStudentOpen(true)
  }

  // Student Profile / Details Sheet State
  const [profileOpen, setProfileOpen] = useState(false)
  const [activeStudent, setActiveStudent] = useState(null)

  // Edit Record Modal States
  const [editStudentOpen, setEditStudentOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [editOrgOpen, setEditOrgOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState(null)

  const handleEditRecord = (st) => {
    const target = st || activeStudent || selectedStudent
    if (!target) return
    if (isOsas) {
      setEditingOrg(target.rawOrg || target)
      setEditOrgOpen(true)
    } else {
      setEditingStudent(target)
      setEditStudentOpen(true)
    }
  }

  // Student Drilldown Level State (Google Drive Files Explorer)
  const [selectedStudent, setSelectedStudent] = useState(null)

  useEffect(() => {
    if (!selectedStudent?.studentNo && !activeStudent?.studentNo) return
    const studentNo = profileOpen ? activeStudent?.studentNo : selectedStudent?.studentNo || activeStudent?.studentNo
    if (!studentNo) return
    let active = true
    const request = isOsas
      ? fetch(`/api/documents/browse?mode=organization&organizationId=${encodeURIComponent(studentNo)}`, { cache: "no-store" })
          .then((res) => res.json()).then((json) => json?.data?.rows || [])
      : fetchAllPages(`/api/documents?studentNo=${encodeURIComponent(studentNo)}&excludeDeclined=1`, 200)
    request
      .then((docs) => { if (active) setSelectedDocs({ studentNo, rows: docs }) })
      .catch(() => { if (active) setSelectedDocs({ studentNo, rows: [] }) })
    return () => { active = false }
  }, [isOsas, profileOpen, selectedStudent?.studentNo, activeStudent?.studentNo, browseVersion, refreshVersion])

  // Clear selected student whenever folder navigation level or archived mode changes
  useEffect(() => {
    const timer = setTimeout(() => setSelectedStudent(null), 0)
    return () => clearTimeout(timer)
  }, [currentLevel, showArchived])

  const effectiveBreadcrumbs = (() => {
    const list = [...(breadcrumbs || [])]
    if (selectedStudent) {
      list.push({
        level: "student-files",
        label: formatTitleCase(selectedStudent.name || selectedStudent.acronym || selectedStudent.studentNo || "Student Files"),
      })
    }
    return list
  })()

  const currentEffectiveLevel = selectedStudent ? "student-files" : currentLevel

  const handleBreadcrumbClick = (b) => {
    if (b.level === "student-files") return
    setSelectedStudent(null)
    onBreadcrumbClick?.(b)
  }

  const handleLocateStudentClick = (student) => {
    onLocateStudent(student)
  }

  const handleStudentSelect = (student) => {
    setSelectedStudent(student)
  }

  const handleOpenStudentProfile = (student) => {
    setActiveStudent(student)
    setProfileOpen(true)
  }



  const isLeafLevel = isOsas
    ? currentLevel === "organizations" || currentLevel === "students"
    : currentLevel === "students"

  const sortOptions = useMemo(() => {
    if (!isLeafLevel) {
      return isOsas ? FOLDER_SORT_OPTIONS_OSAS : FOLDER_SORT_OPTIONS_REGISTRAR
    }
    return isOsas ? RECORD_SORT_OPTIONS_OSAS : RECORD_SORT_OPTIONS_REGISTRAR
  }, [isLeafLevel, isOsas])

  const currentSortBy = isLeafLevel ? recordSortBy : folderSortBy
  const currentSortOrder = isLeafLevel ? recordSortOrder : folderSortOrder

  const handleSortByChange = (key) => {
    if (isLeafLevel) {
      setBrowseSortPending(recordSortBy !== key || page !== 1)
      setRecordSortBy(key)
      setPage(1)
    } else {
      setFolderSortBy(key)
    }
  }

  const handleSortOrderChange = (order) => {
    if (isLeafLevel) {
      setBrowseSortPending(recordSortOrder !== order || page !== 1)
      setRecordSortOrder(order)
      setPage(1)
    } else {
      setFolderSortOrder(order)
    }
  }

  // Derived filtered results
  const filteredQuickResults = useMemo(() => {
    return quickQuery.trim().length >= 2 ? browseResults.rows : []
  }, [browseResults, quickQuery])

  const filteredExplorerItems = (() => {
    let items = []

    if (!isLeafLevel) {
      if (isOsas) {
        items = [...new Set((browseSummary?.categories || []).map((entry) => entry.category))].map((category) => ({
          key: category,
          title: category,
          icon: "Building01Icon",
          onClick: () => onSelectCategory?.(category),
        })).map((item) => {
          const cat = item.key
          const activeCount = (browseSummary?.categories || []).filter((entry) => entry.category === cat && entry.status !== "Archived").reduce((sum, entry) => sum + entry.count, 0)
          const archCount = (browseSummary?.categories || []).filter((entry) => entry.category === cat && entry.status === "Archived").reduce((sum, entry) => sum + entry.count, 0)

          return {
            ...item,
            title: item.title || cat,
            subtitle: showArchived ? `${archCount} archived` : `${activeCount} active`,
            _count: showArchived ? archCount : activeCount,
            _name: item.title || cat,
          }
        })
      } else {
        items = (browseSummary?.years || []).filter((entry) => Number(entry.year) >= 2000 && Number(entry.year) <= 2100).reduce((list, entry) => {
          if (!list.some((item) => item.key === String(entry.year))) {
            list.push({ key: String(entry.year), title: `Year ${entry.year}`, icon: "Calendar01Icon", onClick: () => onSelectYear?.(Number(entry.year)) })
          }
          return list
        }, []).map((item) => {
          const yearStr = item.key
          const yearNum = Number(yearStr)
          const activeCount = (browseSummary?.years || []).filter((entry) => Number(entry.year) === yearNum && entry.status === "Active").reduce((sum, entry) => sum + entry.count, 0)
          const archCount = (browseSummary?.years || []).filter((entry) => Number(entry.year) === yearNum && entry.status !== "Active").reduce((sum, entry) => sum + entry.count, 0)

          return {
            ...item,
            title: yearStr,
            subtitle: showArchived ? `${archCount} archived` : `${activeCount} active`,
            _year: yearNum,
            _count: showArchived ? archCount : activeCount,
            _name: yearStr,
          }
        })
      }

      // Sort folders based on folderSortBy and folderSortOrder
      const sorted = [...items]
      if (folderSortBy === "year") {
        if (folderSortOrder === "ASC") {
          sorted.sort((a, b) => (a._year ?? 0) - (b._year ?? 0))
        } else {
          sorted.sort((a, b) => (b._year ?? 0) - (a._year ?? 0))
        }
      } else if (folderSortBy === "name") {
        if (folderSortOrder === "DESC") {
          sorted.sort((a, b) => String(b._name || "").localeCompare(String(a._name || ""), undefined, { numeric: true }))
        } else {
          sorted.sort((a, b) => String(a._name || "").localeCompare(String(b._name || ""), undefined, { numeric: true }))
        }
      } else if (folderSortBy === "count") {
        if (folderSortOrder === "ASC") {
          sorted.sort((a, b) => (a._count ?? 0) - (b._count ?? 0))
        } else {
          sorted.sort((a, b) => (b._count ?? 0) - (a._count ?? 0))
        }
      } else {
        // default: years newest first, or category alphabetical
        if (!isOsas) {
          sorted.sort((a, b) => (b._year ?? 0) - (a._year ?? 0))
        } else {
          sorted.sort((a, b) => String(a._name || "").localeCompare(String(b._name || "")))
        }
      }
      return sorted
    }

    return browsePage.rows.map((student) => ({ key: student.studentNo, student }))
  })()

  const paginatedExplorerItems = useMemo(() => {
    return filteredExplorerItems
  }, [filteredExplorerItems])

  const leafPending = isLeafLevel && browsePage.folder !== browseFolder
  const totalItems = isLeafLevel && !leafPending ? browsePage.total : 0
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))

  const activeTabCount = (() => {
    if (!isOsas) return isLeafLevel
      ? (browseSummary?.years || []).filter((entry) => Number(entry.year) === selectedYear && entry.status === "Active").reduce((sum, entry) => sum + entry.count, 0)
      : browseSummary?.counts?.active || 0
    return isLeafLevel
      ? (browseSummary?.categories || []).filter((entry) => entry.category === archiveCategory && entry.status !== "Archived").reduce((sum, entry) => sum + entry.count, 0)
      : browseSummary?.active || 0
  })()

  const archivedTabCount = (() => {
    if (!isOsas) return isLeafLevel
      ? (browseSummary?.years || []).filter((entry) => Number(entry.year) === selectedYear && entry.status !== "Active").reduce((sum, entry) => sum + entry.count, 0)
      : browseSummary?.counts?.archived || 0
    return isLeafLevel
      ? (browseSummary?.categories || []).filter((entry) => entry.category === archiveCategory && entry.status === "Archived").reduce((sum, entry) => sum + entry.count, 0)
      : browseSummary?.archived || 0
  })()

  const quickMatchCount = useMemo(() => {
    return quickQuery.trim() ? browseResults.total : (showArchived ? archivedTabCount : activeTabCount)
  }, [browseResults, quickQuery, showArchived, archivedTabCount, activeTabCount])

  // Record Navigation for Profile Sheet (< > 01 of XX)
  const currentRecordList = useMemo(() => {
    return isLeafLevel ? browsePage.rows : selectedStudent ? [selectedStudent] : filteredQuickResults
  }, [browsePage, isLeafLevel, selectedStudent, filteredQuickResults])

  const currentRecordIndex = useMemo(() => {
    if (!activeStudent || currentRecordList.length === 0) return -1
    const activeKey = String(activeStudent.studentNo || activeStudent.id || "").toLowerCase()
    return currentRecordList.findIndex(
      (s) => String(s.studentNo || s.id || "").toLowerCase() === activeKey
    )
  }, [activeStudent, currentRecordList])

  const handleNavigatePrevRecord = () => {
    if (currentRecordIndex > 0) {
      const prevStudent = currentRecordList[currentRecordIndex - 1]
      setActiveStudent(prevStudent)
      if (selectedStudent) {
        setSelectedStudent(prevStudent)
      }
    }
  }

  const handleNavigateNextRecord = () => {
    if (currentRecordIndex >= 0 && currentRecordIndex < currentRecordList.length - 1) {
      const nextStudent = currentRecordList[currentRecordIndex + 1]
      setActiveStudent(nextStudent)
      if (selectedStudent) {
        setSelectedStudent(nextStudent)
      }
    }
  }

  return (
    <div
      id="view-search"
      className="flex flex-[1_0_auto] flex-col w-full h-auto focus:outline-none animate-fade-up font-jakarta"
      tabIndex={0}
    >
      {/* ONE Single Card Container encapsulating Header, Toolbar, Breadcrumbs, Content, Pagination & Office Documents */}
      <Card className="relative flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta" aria-busy={browseLoading}>
        <PageHeader
          icon="Archive01Icon"
          title={
            <span className="flex items-center gap-2">
              <span>Records & Archive</span>
              <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">
                {quickMatchCount > 0 ? `${quickMatchCount.toLocaleString()} ${quickMatchCount === 1 ? "record" : "records"}` : "No records"}
              </span>
            </span>
          }
          description={
            isOsas
              ? "Browse, search, and locate student organization records and physical archives."
              : "Browse, search, and locate student records and physical archives."
          }
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <SegmentedControl
              value={archiveViewMode}
              onValueChange={setArchiveViewMode}
              variant="capsule"
              className="inline-grid grid-flow-col auto-cols-fr shrink-0"
              items={[
                {
                  value: "folders",
                  label: "Browse Folders",
                  icon: <FolderOpenIcon size="1em" className="text-xs" />,
                },
                {
                  value: "master-list",
                  label: "All Documents",
                  icon: <Files01Icon size="1em" className="text-xs" />,
                },
              ]}
            />
          }
        />

        {archiveViewMode === "master-list" ? (
          <OfficeDocumentsTable
            serverPaged={true}
            officeLabel={officeLabel}
            breadcrumbs={null}
            onPreviewDocument={onPreviewDocument}
            onRescan={onRescan}
            embedded={true}
            borderTop={false}
          />
        ) : (
          <>
            {/* Filter Section: Tabs (Active/Archived), Controls (Sort, Select All, View Toggle), Search */}
            <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-card select-none">
          {/* Left: Active / Archived Tabs */}
          <SegmentedControl
            value={showArchived ? "archived" : "active"}
            onValueChange={(val) => setShowArchived(val === "archived")}
            variant="capsule"
            className="inline-grid grid-flow-col auto-cols-fr shrink-0"
            items={[
              {
                value: "active",
                label: "Active",
                badge: activeTabCount,
              },
              {
                value: "archived",
                label: "Archived",
                badge: archivedTabCount,
              },
            ]}
          />

          {/* Right: Filter Controls (Search FIRST, then Sort, Select All, Card/Table Toggle) */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 lg:justify-end">
            {/* 1. Search Input Box (First) */}
            <div className="w-full sm:w-64 md:w-72 relative group shrink-0">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center">
                  <Search01Icon size="1em" className="text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-sm" />
                </div>
                <Input
                  type="text"
                  placeholder={isOsas ? "Search Organization" : "Search Student"}
                  className="h-9 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 pl-8 pr-16 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                  value={quickQuery}
                  onChange={(e) => setQuickQuery(e.target.value)}
                />
                <div className="pointer-events-none absolute inset-y-0 right-3 z-10 flex items-center text-[11px] text-gray-400 dark:text-zinc-500 font-sans tabular-nums">
                  {quickMatchCount.toLocaleString()}
                </div>
              </div>

              {/* Quick Search Results Dropdown Overlay */}
              {quickQuery.trim().length >= 2 && (
                <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 rounded-xl border border-border bg-white shadow-lg p-2 dark:border-border dark:bg-zinc-900 max-h-[250px] overflow-y-auto">
                  {quickQuery.trim().length >= 2 && quickSearchLoading ? (
                    <div className="p-2 space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-10 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : filteredQuickResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-900 dark:text-zinc-300">
                      {showArchived
                        ? (isOsas ? "No archived organizations found." : "No archived records found.")
                        : (isOsas ? "No organizations found." : "No records found.")}
                    </div>
                  ) : (
                    filteredQuickResults.map((s) => (
                      <div
                        key={s.studentNo}
                        className="group flex cursor-pointer items-center justify-between rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
                        onClick={() => {
                          handleStudentSelect(s)
                          setQuickQuery("")
                        }}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-800 group-hover:text-pup-maroon dark:group-hover:text-red-500 dark:text-zinc-100 truncate">
                              {s.name}
                            </span>
                            {isOsas && s.category && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-zinc-400">
                                {s.category}
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-medium text-gray-900 dark:text-zinc-300">
                            {s.acronym || s.studentNo}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => {
                                  handleLocateStudentClick(s)
                                  setQuickQuery("")
                                }}
                                className="w-7 h-7 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-600 hover:text-gray-900 dark:text-zinc-300 dark:hover:text-zinc-100 flex items-center justify-center transition-colors border-0 bg-transparent cursor-pointer active:scale-95"
                                title="Locate in Storage"
                              >
                                <Location01Icon size="1em" className="text-[14px]" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Locate in Archive</TooltipContent>
                          </Tooltip>
                          <ArrowRight01Icon size="1em" className="text-sm text-gray-400 group-hover:text-pup-maroon dark:group-hover:text-red-500 dark:text-zinc-500"></ArrowRight01Icon>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 2. Sort Popover, Select All, View Mode (Hidden when viewing student files) */}
            {!selectedStudent && (
              <>
                <SortPopover
                  options={sortOptions}
                  sortBy={currentSortBy}
                  onSortByChange={handleSortByChange}
                  sortOrder={currentSortOrder}
                  onSortOrderChange={handleSortOrderChange}
                  align="end"
                />

                {/* 3. Select All / Deselect (When at record level) */}
                {isLeafLevel && paginatedExplorerItems.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toggleSelectAll(paginatedExplorerItems)}
                    title={paginatedExplorerItems.every(it => selectedIds.has(it.student.studentNo)) ? "Deselect All" : "Select All"}
                    className={cn(
                      "h-9 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-xs active:scale-95 shrink-0",
                      paginatedExplorerItems.every(it => selectedIds.has(it.student.studentNo))
                        ? "border-pup-maroon/30 text-pup-maroon bg-pup-maroon/5 dark:border-red-400/30 dark:text-red-400 dark:bg-red-950/20"
                        : "border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700"
                    )}
                  >
                    {paginatedExplorerItems.every(it => selectedIds.has(it.student.studentNo)) ? "Deselect All" : "Select All"}
                  </Button>
                )}
              </>
            )}
        </div>
      </div>

        {/* 3. Breadcrumb Sub-Header & Location Controls */}
        <DataViewToolbar label="Archive location and table controls" className="min-h-[46px] py-1.5 justify-between gap-4 border-t border-border bg-white px-6 text-sm dark:border-border dark:bg-card select-none">
          <div className="flex items-center gap-3 min-w-0">
            <Breadcrumb className="flex items-center select-none">
              <BreadcrumbList className="flex items-center font-medium text-[14px] text-[#8E8E93] gap-0 dark:text-zinc-400">
                {effectiveBreadcrumbs.map((b, idx) => (
                  <div
                    key={`${b.level}-${idx}`}
                    className="flex items-center gap-0"
                  >
                    {idx > 0 && (
                      <BreadcrumbSeparator className="flex items-center">
                        <span className="text-[#C7C7CC] text-[13px] mx-[7px] select-none font-normal">›</span>
                      </BreadcrumbSeparator>
                    )}
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        className={cn(
                          "cursor-pointer transition-colors hover:no-underline text-[14px]",
                          currentEffectiveLevel === b.level
                            ? "text-pup-maroon font-semibold dark:text-red-400"
                            : "text-[#8E8E93] font-medium hover:text-[#1C1C1E] dark:text-zinc-400 dark:hover:text-zinc-200"
                        )}
                        onClick={() => handleBreadcrumbClick(b)}
                      >
                        {b.label}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </DataViewToolbar>

            <div className={cn("w-full flex-[1_0_auto] flex flex-col bg-white dark:bg-card", selectedStudent?.rawOrg ? "p-0 rounded-none" : selectedStudent ? "p-6 rounded-b-2xl" : "p-6")}>
              {selectedStudent ? (
                <StudentDriveFilesView
                  student={selectedStudent}
                  allDocs={selectedDocs.studentNo === selectedStudent?.studentNo ? selectedDocs.rows : []}
                  courses={courses}
                  onLocateStudent={onLocateStudent}
                  onPreviewDocument={onPreviewDocument}
                  onRescan={onRescan}
                  onBack={() => setSelectedStudent(null)}
                  authUser={authUser}
                  onOpenDetails={(st) => {
                    setActiveStudent(st)
                    setProfileOpen(true)
                  }}
                  onOpenDossier={(st) => {
                    setActiveStudent(st)
                    setProfileOpen(true)
                  }}
                />
              ) : !browseSummary ? (
                <RecordsArchiveSkeleton />
              ) : browseSummary?.error ? (
                <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                  <Empty>
                    <EmptyHeader>
                      <EmptyTitle>Archive unavailable</EmptyTitle>
                      <EmptyDescription>Could not load archive folders. Please try again.</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent><Button size="sm" onClick={() => setBrowseVersion((version) => version + 1)}>Refresh Archive</Button></EmptyContent>
                  </Empty>
                </div>
              ) : activeTabCount === 0 && !showArchived ? (
                <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia>{isOsas ? <EmptyBuilding03Icon size="1em" /> : <EmptyUserGroupIcon size="1em" />}</EmptyMedia>
                      <EmptyTitle>
                        {isOsas ? "No Student Organization Records Yet" : "No Student Records Yet"}
                      </EmptyTitle>
                      <EmptyDescription>
                        {isOsas
                          ? "Register recognized student organizations in the Student Organizations tab to view and manage their Constitution & By-Laws and physical archives here."
                          : "Register your first student record in the Upload tab. After that, you can browse, search, and locate drawers here."}
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onSwitchView(isOsas ? "organizations" : "upload")}
                        title={isOsas ? "Go to Student Organizations" : "Go to Upload"}
                        className="mt-4 h-9 px-4 cursor-pointer"
                      >
                        {isOsas ? "Register Organization" : "Upload Records"}
                      </Button>
                    </EmptyContent>
                  </Empty>
                </div>
              ) : archivedTabCount === 0 && showArchived ? (
                <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia><EmptyArchive01Icon size="1em" /></EmptyMedia>
                      <EmptyTitle>
                        {isOsas ? "No Archived Organizations" : "No Archived Students"}
                      </EmptyTitle>
                      <EmptyDescription>
                        {isOsas
                          ? "There are currently no archived organization records found in the system."
                          : "There are currently no archived records found in the system."}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </div>
              ) : !isLeafLevel ? (
                <div 
                  key={`folders-${showArchived}`}
                  className="animate-fade-up grid p-1"
                  style={{
                    gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
                    gap: "24px",
                    justifyItems: "center"
                  }}
                >
                  {filteredExplorerItems.map((it, index) => {
                    const theme = FOLDER_COLORS[folderColors[it.key]] || FOLDER_COLORS["yellow"]
                    return (
                      <InteractiveMacFolder 
                        key={index} 
                        it={it} 
                        theme={theme} 
                        updateFolderColor={updateFolderColor}
                        folderColors={folderColors}
                      />
                    )
                  })}
                </div>
              ) : leafPending ? (
                <DataContentSkeleton viewMode="cards" />
              ) : browsePage.error ? (
                <div className="flex min-h-[420px] flex-col items-center justify-center gap-3">
                  <p role="status" className="text-sm text-muted-foreground">{browsePage.error}</p>
                  <Button size="sm" onClick={() => setBrowseVersion((version) => version + 1)}>Refresh Archive</Button>
                </div>
              ) : filteredExplorerItems.length === 0 ? (
                <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia>{showArchived ? <EmptyArchive01Icon size="1em" /> : isOsas ? <EmptyBuilding03Icon size="1em" /> : <EmptyUserGroupIcon size="1em" />}</EmptyMedia>
                      <EmptyTitle>
                        {showArchived
                          ? (isOsas ? "No Archived Organizations" : "No Archived Students")
                          : (isOsas ? "No Organizations In This Category" : "No Students In This Year")}
                      </EmptyTitle>
                      <EmptyDescription>
                        {showArchived
                          ? (isOsas
                              ? "There are currently no archived organizations found for this category."
                              : "There are currently no archived records found for this academic period.")
                          : (isOsas
                              ? "There are no student organizations filed under this category yet."
                              : "There are no student records filed under this year yet.")}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </div>
              ) : (
                <div 
                  key={`cards-${currentLevel}-${showArchived}`}
                  className="animate-fade-up grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
                >
                  {paginatedExplorerItems.map((row, index) => {
                    const isSelected = selectedIds.has(row.student.studentNo)
                    const studentYear = getStudentFolderYear(row.student)
                    const cardColorKey = isOsas ? (row.student.category || "Academic") : studentYear
                    const theme = FOLDER_COLORS[folderColors[cardColorKey]] || FOLDER_COLORS["yellow"]
                    const cardStyle = {
                      background: `linear-gradient(135deg, ${theme.frontStart} 0%, ${theme.frontEnd} 100%)`,
                    }
                    return (
                      <div
                        key={row.key || index}
                        className={cn(
                          "group relative flex cursor-pointer flex-col rounded-[14px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)] select-none text-white border-0 transition-all",
                          isSelected 
                            ? "ring-2 ring-[#0A84FF]" 
                            : "",
                          showArchived && "opacity-95"
                        )}
                        style={cardStyle}
                        onClick={() => handleStudentSelect(row.student)}
                      >
                        <div className="absolute top-4 right-4 z-20" onClick={(e) => { e.stopPropagation(); toggleSelect(row.student.studentNo); }}>
                           <div className={cn(
                             "h-5 w-5 rounded-[6px] border flex items-center justify-center transition-all duration-fast cursor-pointer",
                             isSelected 
                               ? "bg-white border-white text-[#0A84FF]" 
                               : "border-white/40 bg-white/10 hover:border-white/80"
                           )}>
                             {isSelected && <Tick01Icon size="1em"  className="text-[10px]" />}
                           </div>
                        </div>

                        {isOsas ? (
                          <div className="flex flex-col justify-between h-full min-h-[160px]">
                            <div>
                              <div className="flex items-center gap-2 pr-7 flex-wrap">
                                <span className={cn("rounded-full border border-white/20 bg-white/15 px-2.5 py-0.5 font-sans tabular-nums text-[11px] font-bold text-white tracking-wider", BADGE_BASE)}>
                                  {row.student.acronym || row.student.studentNo}
                                </span>
                                <span className={cn("rounded-full border border-white/20 bg-black/10 px-2 py-0.5 text-[10px] font-semibold text-white/90", BADGE_BASE)}>
                                  {row.student.category || "Academic"}
                                </span>
                                {showArchived && (
                                  <Badge className={cn("rounded-full border-white/30 bg-white/20 px-2 py-0.5 text-[9px] font-semibold text-white", BADGE_BASE)}>
                                    Archived
                                  </Badge>
                                )}
                              </div>

                              <h4 className="mt-2 text-[17px] font-bold text-white transition-colors line-clamp-2 leading-snug" title={formatTitleCase(row.student.name)}>
                                {formatTitleCase(row.student.name)}
                              </h4>

                              {row.student.adviser && (
                                <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-white/85 font-medium">
                                  <UserIcon size="1em" className="text-[13px] opacity-80" />
                                  <span className="truncate">Adviser: {row.student.adviser}</span>
                                </div>
                              )}

                              <div className="mt-2.5 flex items-center gap-2 text-[11px] text-white/80">
                                <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md">
                                  <UserSearch01Icon size="1em" className="text-[12px]" />
                                  {row.student.activeOfficerCount ?? 0} Officers
                                </span>
                                <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md">
                                  <File02Icon size="1em" className="text-[12px]" />
                                  {row.student.proposalCount ?? 0} Proposals
                                </span>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/15 pt-3">
                              <div className="flex min-w-0 items-center gap-1.5 text-white/80">
                                <Location01Icon size="1em" className="text-[13px]" />
                                <span className="text-[12px] font-medium text-white/85 select-none">
                                  Room {row.student.room} • {row.student.cabinet} • Drawer {row.student.drawer}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                                {showArchived && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRestoreTarget(row.student);
                                      setRestoreStudentOpen(true);
                                    }}
                                    className="h-7 rounded-lg border-white/30 bg-white/15 px-2 text-[10px] font-semibold text-white shadow-xs hover:bg-white/25 active:scale-95 transition-all cursor-pointer"
                                  >
                                    Restore Student
                                  </Button>
                                )}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleLocateStudentClick(row.student);
                                      }}
                                      className="h-7 px-3"
                                      title="Locate Archive Drawer"
                                    >
                                      Locate Drawer
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Locate Drawer</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start w-full">
                            <div className="min-w-0 flex-1 flex flex-col justify-center">
                              <div className="flex items-center min-w-0 mb-1">
                                <h4 className="truncate text-[19px] font-bold text-white transition-colors" title={formatTitleCase(row.student.name)}>
                                  {formatTitleCase(row.student.name)}
                                </h4>
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <div className={cn("bg-white/10 text-white/90 tabular-nums", BADGE_BASE)}>
                                  {row.student.studentNo}
                                </div>
                                {showArchived && (
                                  <Badge className={cn("rounded-full border-white/30 bg-white/20 px-2 py-0.5 text-[9px] font-semibold text-white", BADGE_BASE)}>
                                    Archived
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-2.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 text-white/80">
                                  <Location01Icon size="1em"  className="text-[14px]"></Location01Icon>
                                  <span className="text-[13px] font-medium text-white/80 select-none whitespace-nowrap">
                                    Room {row.student.room} • Cabinet {row.student.cabinet} • Drawer {row.student.drawer}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {showArchived && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setRestoreTarget(row.student)
                                        setRestoreStudentOpen(true)
                                      }}
                                      className="h-8 rounded-xl border-white/30 bg-white/10 px-2.5 text-[9px] font-semibold text-white shadow-xs hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
                                    >
                                      Restore Student
                                    </Button>
                                  )}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleLocateStudentClick(row.student)
                                        }}
                                        className="h-8 px-3"
                                        title="Locate in Storage Map"
                                      >
                                        Locate Drawer
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Locate Drawer</TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {isLeafLevel && !selectedStudent && totalItems > 0 && <TablePagination label="Archive record pages" page={page} pageSize={itemsPerPage} totalCount={totalItems} displayedCount={paginatedExplorerItems.length} onPageChange={setPage} onPageSizeChange={setItemsPerPage} />}

            {!selectedStudent && (
              <OfficeDocumentsTable
                serverPaged={true}
                officeLabel={officeLabel}
                breadcrumbs={breadcrumbs}
                onPreviewDocument={onPreviewDocument}
                onRescan={onRescan}
                embedded={true}
              />
            )}
          </>
        )}
        {browseLoading && !browseSortPending && browseSummary && !selectedStudent && !leafPending && (
          <div role="status" className="px-6 py-2 text-xs text-muted-foreground">
            Loading archive…
          </div>
        )}
      </Card>

      <ConfirmModal
        open={restoreStudentOpen}
        onCancel={() => {
          setRestoreStudentOpen(false)
          setRestoreTarget(null)
        }}
        title={isOsas ? "Restore Organization Record" : "Restore Student Record"}
        message={
          isOsas
            ? `Restore record for ${restoreTarget?.name} (${restoreTarget?.acronym || restoreTarget?.studentNo})? This will make the organization active and visible in all modules again.`
            : `Restore record for ${restoreTarget?.name} (${restoreTarget?.studentNo})? This will make the student active and visible in all modules again.`
        }
        confirmLabel={isOsas ? "Restore Organization" : "Restore Student Record"}
        variant="success"
        isRestoreModal={true}
        onConfirm={async () => {
          if (restoreTarget) {
            const sn = restoreTarget.studentNo
            if (selectedIds.has(sn)) {
              const next = new Set(selectedIds)
              next.delete(sn)
              onSelectionChange(next)
            }
            await onRestoreStudent(sn)
            if (!isOsas) setBrowseVersion((version) => version + 1)
          }
          setRestoreStudentOpen(false)
          setRestoreTarget(null)
        }}
      />

      {/* Single Archive Confirm Modal */}
      <ConfirmModal
        open={archiveStudentOpen}
        onCancel={() => {
          setArchiveStudentOpen(false)
          setArchiveTarget(null)
        }}
        title={isOsas ? "Archive Organization Record" : "Archive Student Record"}
        message={
          isOsas
            ? `Archive record for ${archiveTarget?.name} (${archiveTarget?.acronym || archiveTarget?.studentNo})? This organization record will be moved to archives.`
            : `Archive record for ${archiveTarget?.name} (${archiveTarget?.studentNo})? This student record will be moved to archives.`
        }
        confirmLabel={isOsas ? "Archive Organization" : "Archive Student Record"}
        variant="warning"
        onConfirm={async () => {
          if (archiveTarget) {
            const sn = archiveTarget.studentNo || archiveTarget.id
            try {
              const url = isOsas
                ? `/api/osas/organizations/${encodeURIComponent(sn)}`
                : `/api/students/${encodeURIComponent(sn)}`
              const res = await fetch(url, { method: "DELETE" })
              const json = await res.json().catch(() => null)
              if (!res.ok || !json?.ok) {
                throw new Error(json?.error || `Failed to archive ${isOsas ? "organization" : "student"} record`)
              }
              showToast?.({
                title: "Record Archived",
                description: isOsas
                  ? "Organization record moved to archive."
                  : `Student ${sn} moved to archive.`,
              })
              if (selectedIds.has(sn)) {
                const next = new Set(selectedIds)
                next.delete(sn)
                onSelectionChange(next)
              }
              if (onStudentUpdated) {
                await onStudentUpdated()
              }
              if (!isOsas) setBrowseVersion((version) => version + 1)
              if (selectedStudent && (selectedStudent.studentNo === sn || selectedStudent.id === sn)) {
                setSelectedStudent(null)
              }
            } catch (err) {
              showToast?.({
                title: "Archive Failed",
                description: err?.message || "Failed to archive record",
              }, true)
            }
          }
          setArchiveStudentOpen(false)
          setArchiveTarget(null)
        }}
      />

      {/* Student Profile / Details Sheet (Preview All Documents & Compliance) */}
      <StudentProfileSheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
        student={activeStudent}
        courses={courses}
        allDocs={selectedDocs.studentNo === activeStudent?.studentNo ? selectedDocs.rows : []}
        onLocateStudent={onLocateStudent}
        onPreviewDocument={onPreviewDocument}
        onRescan={onRescan}
        onEditStudent={handleEditRecord}
        onOdrsEmailSaved={(studentNo, odrsEmail) => {
          setActiveStudent((current) => current?.studentNo === studentNo ? { ...current, odrsEmail } : current)
          setSelectedStudent((current) => current?.studentNo === studentNo ? { ...current, odrsEmail } : current)
          setBrowseVersion((version) => version + 1)
        }}
        onArchiveStudent={handleArchiveRecord}
        onRestoreStudent={async (sn) => {
          const target = browsePage.rows.find((s) => (s.studentNo || s.id) === sn) || activeStudent
          setRestoreTarget(target)
          setRestoreStudentOpen(true)
        }}
        authUser={authUser}
        currentIndex={currentRecordIndex}
        totalCount={currentRecordList.length}
        onNavigatePrev={handleNavigatePrevRecord}
        onNavigateNext={handleNavigateNextRecord}
      />

      {/* Edit Student Modal */}
      <EditStudentModal
        open={editStudentOpen}
        onOpenChange={setEditStudentOpen}
        student={editingStudent || activeStudent}
        courses={courses}
        sections={sections}
        storageLayout={storageLayout}
        onSuccess={async () => {
          if (onStudentUpdated) {
            await onStudentUpdated();
          }
          if (!isOsas) setBrowseVersion((version) => version + 1)
          const targetStudentNo = editingStudent?.studentNo || activeStudent?.studentNo;
          if (targetStudentNo) {
            try {
              const res = await fetch(`/api/students/${encodeURIComponent(targetStudentNo)}`);
              const json = await res.json();
              if (json?.ok && json?.data) {
                const updated = json.data;
                const formatted = {
                  studentNo: updated.student_no,
                  name: updated.name,
                  odrsEmail: updated.odrsEmail,
                  courseCode: updated.course_code,
                  yearLevel: updated.year_level,
                  section: updated.section,
                  room: updated.room,
                  cabinet: updated.cabinet,
                  drawer: updated.drawer,
                  status: updated.status,
                };
                setActiveStudent((prev) => (prev?.studentNo === targetStudentNo ? { ...prev, ...formatted } : prev));
                setSelectedStudent((prev) => (prev?.studentNo === targetStudentNo ? { ...prev, ...formatted } : prev));
              }
            } catch {}
          }
        }}
        showToast={showToast}
        collectOdrsEmail={(authUser?.office_id || authUser?.officeId) === "registrar"}
      />

      {/* Edit Organization Modal (OSAS) */}
      <EditOrganizationModal
        open={editOrgOpen}
        onOpenChange={setEditOrgOpen}
        organization={editingOrg || activeStudent?.rawOrg || activeStudent}
        storageLayout={storageLayout}
        onSuccess={async () => {
          if (onStudentUpdated) {
            await onStudentUpdated();
          }
          if (!isOsas) setBrowseVersion((version) => version + 1)
          const orgId = editingOrg?.id || activeStudent?.rawOrg?.id || activeStudent?.studentNo;
          if (orgId) {
            try {
              const res = await fetch(`/api/osas/organizations/${encodeURIComponent(orgId)}`);
              const json = await res.json();
              if (json?.ok && json?.data) {
                const updated = json.data;
                const formatted = {
                  studentNo: updated.id,
                  acronym: updated.acronym || updated.id,
                  name: updated.name,
                  room: updated.storage_room || 1,
                  cabinet: updated.storage_cabinet || (updated.category === "Academic" ? "ACADEMIC ORGANIZATIONS" : "NON-ACADEMIC ORGANIZATIONS"),
                  drawer: updated.storage_drawer || "1",
                  category: updated.category,
                  adviser: updated.adviser_name,
                  rawOrg: updated,
                };
                setActiveStudent((prev) => (prev?.studentNo === orgId ? { ...prev, ...formatted } : prev));
                setSelectedStudent((prev) => (prev?.studentNo === orgId ? { ...prev, ...formatted } : prev));
              }
            } catch {}
          }
        }}
        showToast={showToast}
      />

      {!selectedStudent && (
        <FloatingActionBar
          selectedCount={selectedIds.size}
          onCancel={() => onSelectionChange(new Set())}
          onAction={showArchived ? onBulkRestore : onBulkArchive}
          actionLabel={showArchived ? "Restore Records" : "Archive Records"}
          actionVariant={showArchived ? "success" : "danger"}
        />
      )}
    </div>
  )
}
