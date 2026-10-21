"use client"

import HugeIcon from "@/components/shared/HugeIcon";
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
import RecordsArchiveSkeleton from "@/components/staff/skeletons/RecordsArchiveSkeleton"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
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

import ConfirmModal from "@/components/shared/ConfirmModal"
import OfficeDocumentsTable from "@/components/staff/OfficeDocumentsTable"
import { cn, formatTitleCase } from "@/lib/utils"


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
              <HugeIcon className="ph-bold ph-palette text-sm" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-60 p-0 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-border/80 shadow-2xl overflow-hidden select-none" 
            side="top" 
            align="end"
            sideOffset={8}
          >
            {/* 1. Header Zone */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border dark:border-border bg-gray-50/60 dark:bg-zinc-800/40">
              <div className="flex items-center gap-1.5">
                <HugeIcon className="ph-bold ph-palette text-xs text-pup-maroon dark:text-red-400" />
                <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                  Folder Color
                </span>
              </div>
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
                        <HugeIcon className="ph-bold ph-check text-xs text-white drop-shadow-xs" />
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
  loading,
  quickQuery,
  setQuickQuery,
  isQuickSearching,
  quickResults,
  onLocateStudent,
  breadcrumbs,
  currentLevel,
  onBreadcrumbClick,
  students,
  archivedStudents,
  explorerItems,
  onSwitchView,
  onPreviewDocument,
  onRestoreStudent,
  selectedIds,
  onSelectionChange,
  onBulkArchive,
  onBulkRestore,
  staffDocs,
  officeLabel,
  courses = [],
  sections = [],
  storageLayout = null,
  onStudentUpdated,
  showToast,
  allDocs = [],
  authUser = null,
}) {
  const [listType, setListType] = useState("card")
  const [showArchived, setShowArchived] = useState(false)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9) // 9 fits nicely in 3-column card grid, 10 or more in table
  const [folderSortBy, setFolderSortBy] = useState("default") // "default", "year-desc", "year-asc", "name-asc", "name-desc", "count-desc"

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
    listType
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
    prevFilters.quickQuery !== quickQuery ||
    prevFilters.listType !== listType
  ) {
    setPrevFilters({ currentLevel, showArchived, quickQuery, listType })
    setPage(1)
  }
  // Restore Modal State
  const [restoreStudentOpen, setRestoreStudentOpen] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState(null)

  // Single Archive Modal State
  const [archiveStudentOpen, setArchiveStudentOpen] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState(null)

  const handleArchiveRecord = (sn) => {
    const pool = showArchived ? archivedStudents : students
    const target = (pool || []).find((s) => (s.studentNo || s.id) === sn) || activeStudent
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

  // Clear selected student whenever folder navigation level or archived mode changes
  useEffect(() => {
    setSelectedStudent(null)
  }, [currentLevel, showArchived])

  const effectiveBreadcrumbs = useMemo(() => {
    const list = [...(breadcrumbs || [])]
    if (selectedStudent) {
      list.push({
        level: "student-files",
        label: formatTitleCase(selectedStudent.name || selectedStudent.acronym || selectedStudent.studentNo || "Student Files"),
      })
    }
    return list
  }, [breadcrumbs, selectedStudent])

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



  const isOsas = officeLabel === "OSAS"
  const isLeafLevel = isOsas
    ? currentLevel === "organizations" || currentLevel === "students"
    : currentLevel === "students"

  const selectedCategory = useMemo(() => {
    if (!isOsas) return null
    const catBreadcrumb = breadcrumbs.find((b) => b.level === "organizations")
    return catBreadcrumb?.label.replace(/ Organizations$/, "") || null
  }, [isOsas, breadcrumbs])

  // Derived filtered results
  const filteredQuickResults = useMemo(() => {
    if (showArchived) {
      const q = quickQuery.toLowerCase()
      return archivedStudents
        .filter(
          (s) =>
            (s.studentNo || "").toLowerCase().includes(q) ||
            (s.acronym || "").toLowerCase().includes(q) ||
            (s.name || "").toLowerCase().includes(q) ||
            (s.category || "").toLowerCase().includes(q)
        )
        .slice(0, 10)
    }
    return quickResults
  }, [showArchived, quickResults, archivedStudents, quickQuery])

  const filteredExplorerItems = useMemo(() => {
    let items = []

    if (!isLeafLevel) {
      if (isOsas) {
        items = explorerItems.map((item) => {
          const cat = item.key
          const activeCount = students.filter(
            (s) => (s.category || s.rawOrg?.category) === cat
          ).length
          const archCount = archivedStudents.filter(
            (s) => (s.category || s.rawOrg?.category) === cat
          ).length

          return {
            ...item,
            title: item.title || cat,
            subtitle: showArchived ? `${archCount} archived` : `${activeCount} active`,
            _count: showArchived ? archCount : activeCount,
            _name: item.title || cat,
          }
        })
      } else {
        items = explorerItems.map((item) => {
          const yearStr = item.key
          const yearNum = Number(yearStr)
          const activeCount = students.filter((s) => {
            return getStudentFolderYear(s) === yearNum
          }).length
          const archCount = archivedStudents.filter((s) => {
            return getStudentFolderYear(s) === yearNum
          }).length

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

      // Sort folders based on folderSortBy
      const sorted = [...items]
      if (folderSortBy === "year-desc") {
        sorted.sort((a, b) => (b._year ?? 0) - (a._year ?? 0))
      } else if (folderSortBy === "year-asc") {
        sorted.sort((a, b) => (a._year ?? 0) - (b._year ?? 0))
      } else if (folderSortBy === "name-asc") {
        sorted.sort((a, b) => String(a._name || "").localeCompare(String(b._name || ""), undefined, { numeric: true }))
      } else if (folderSortBy === "name-desc") {
        sorted.sort((a, b) => String(b._name || "").localeCompare(String(a._name || ""), undefined, { numeric: true }))
      } else if (folderSortBy === "count-desc") {
        sorted.sort((a, b) => (b._count ?? 0) - (a._count ?? 0))
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

    if (showArchived) {
      if (isOsas) {
        if (!selectedCategory) return []
        items = archivedStudents
          .filter((s) => (s.category || s.rawOrg?.category) === selectedCategory)
          .map((s) => ({ key: s.rawOrg?.id || s.studentNo, student: s }))
      } else {
        const year = breadcrumbs
          .find((b) => b.level === "students")
          ?.label.split(" ")[1]
        if (!year) return []
        const yearNum = Number(year)
        items = archivedStudents
          .filter((s) => {
            return getStudentFolderYear(s) === yearNum
          })
          .map((s) => ({ key: s.studentNo, student: s }))
      }
    } else {
      items = [...explorerItems]
    }

    // Sort leaf records
    const sortedLeaf = [...items]
    if (folderSortBy === "name-asc") {
      sortedLeaf.sort((a, b) => {
        const nameA = String(a.student?.name || a.student?.acronym || "").toLowerCase()
        const nameB = String(b.student?.name || b.student?.acronym || "").toLowerCase()
        return nameA.localeCompare(nameB)
      })
    } else if (folderSortBy === "name-desc") {
      sortedLeaf.sort((a, b) => {
        const nameA = String(a.student?.name || a.student?.acronym || "").toLowerCase()
        const nameB = String(b.student?.name || b.student?.acronym || "").toLowerCase()
        return nameB.localeCompare(nameA)
      })
    } else if (folderSortBy === "year-desc" || folderSortBy === "year-asc") {
      sortedLeaf.sort((a, b) => {
        const noA = String(a.student?.studentNo || "")
        const noB = String(b.student?.studentNo || "")
        return folderSortBy === "year-desc" ? noB.localeCompare(noA) : noA.localeCompare(noB)
      })
    }

    return sortedLeaf
  }, [showArchived, explorerItems, archivedStudents, students, isLeafLevel, isOsas, selectedCategory, breadcrumbs, folderSortBy])

  const paginatedExplorerItems = useMemo(() => {
    if (!isLeafLevel) return filteredExplorerItems
    const start = (page - 1) * itemsPerPage
    return filteredExplorerItems.slice(start, start + itemsPerPage)
  }, [filteredExplorerItems, isLeafLevel, page, itemsPerPage])

  const totalItems = isLeafLevel ? filteredExplorerItems.length : 0
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))

  const activeTabCount = useMemo(() => {
    if (isLeafLevel) {
      if (isOsas) {
        if (selectedCategory) {
          return students.filter((s) => (s.category || s.rawOrg?.category) === selectedCategory).length
        }
      } else {
        const yearItem = breadcrumbs.find((b) => b.level === "students")
        if (yearItem) {
          const yearNum = Number(yearItem.label.split(" ")[1])
          if (Number.isFinite(yearNum)) {
            return students.filter((s) => getStudentFolderYear(s) === yearNum).length
          }
        }
      }
    }
    return students.length
  }, [isLeafLevel, isOsas, selectedCategory, breadcrumbs, students])

  const archivedTabCount = useMemo(() => {
    if (isLeafLevel) {
      if (isOsas) {
        if (selectedCategory) {
          return archivedStudents.filter((s) => (s.category || s.rawOrg?.category) === selectedCategory).length
        }
      } else {
        const yearItem = breadcrumbs.find((b) => b.level === "students")
        if (yearItem) {
          const yearNum = Number(yearItem.label.split(" ")[1])
          if (Number.isFinite(yearNum)) {
            return archivedStudents.filter((s) => getStudentFolderYear(s) === yearNum).length
          }
        }
      }
    }
    return archivedStudents.length
  }, [isLeafLevel, isOsas, selectedCategory, breadcrumbs, archivedStudents])

  const quickMatchCount = useMemo(() => {
    if (!quickQuery.trim()) {
      return showArchived ? archivedTabCount : activeTabCount
    }
    const q = quickQuery.toLowerCase()
    const pool = showArchived ? archivedStudents : students
    return pool.filter(
      (s) =>
        (s.studentNo || "").toLowerCase().includes(q) ||
        (s.acronym || "").toLowerCase().includes(q) ||
        (s.name || "").toLowerCase().includes(q) ||
        (s.category || "").toLowerCase().includes(q)
    ).length
  }, [quickQuery, showArchived, archivedStudents, students, archivedTabCount, activeTabCount])

  // Record Navigation for Profile Sheet (< > 01 of XX)
  const currentRecordList = useMemo(() => {
    if (isLeafLevel && filteredExplorerItems.length > 0) {
      return filteredExplorerItems.map((it) => it.student).filter(Boolean)
    }
    if (showArchived) {
      return archivedStudents || []
    }
    return students || []
  }, [isLeafLevel, filteredExplorerItems, showArchived, archivedStudents, students])

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
      className="flex flex-col w-full h-auto focus:outline-none animate-fade-up font-jakarta"
      tabIndex={0}
    >
      {/* ONE Single Card Container encapsulating Header, Toolbar, Breadcrumbs, Content, Pagination & Office Documents */}
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta mb-4">
        <PageHeader
          icon="ph-archive"
          title="Records & Archive"
          description={
            isOsas
              ? "Browse, search, and locate student organization records and physical archives."
              : "Browse, search, and locate student records and physical archives."
          }
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
        />
        {/* Filter Section: Tabs (Active/Archived), Controls (Sort, Select All, View Toggle), Search */}
        <div className="border-t border-border dark:border-border p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30 select-none">
          {/* Left: Active / Archived Tabs */}
          <div className="flex items-center gap-6 select-none shrink-0">
            <button
              type="button"
              onClick={() => setShowArchived(false)}
              className={cn(
                "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
                !showArchived
                  ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                  : "text-gray-500 dark:text-zinc-400 font-normal hover:text-gray-700 dark:hover:text-zinc-200"
              )}
            >
              Active ({activeTabCount})
            </button>
            <button
              type="button"
              onClick={() => setShowArchived(true)}
              className={cn(
                "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
                showArchived
                  ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                  : "text-gray-500 dark:text-zinc-400 font-normal hover:text-gray-700 dark:hover:text-zinc-200"
              )}
            >
              Archived ({archivedTabCount})
            </button>
          </div>

          {/* Right: Filter Controls (Search FIRST, then Sort, Select All, Card/Table Toggle) */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 lg:justify-end">
            {/* 1. Search Input Box (First) */}
            <div className="w-full sm:w-64 md:w-72 relative group shrink-0">
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <HugeIcon className="ph-bold ph-magnifying-glass text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-sm" />
                </div>
                <Input
                  type="text"
                  placeholder={isOsas ? "Search Organization" : "Search Student"}
                  className="h-9 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 pl-8 pr-16 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                  value={quickQuery}
                  onChange={(e) => setQuickQuery(e.target.value)}
                />
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[11px] text-gray-400 dark:text-zinc-500 font-mono">
                  {quickMatchCount.toLocaleString()}
                </div>
              </div>

              {/* Quick Search Results Dropdown Overlay */}
              {quickQuery.trim().length >= 2 && (
                <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 rounded-xl border border-border bg-white shadow-lg p-2 dark:border-border dark:bg-zinc-900 max-h-[250px] overflow-y-auto">
                  {isQuickSearching ? (
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
                                className="w-7 h-7 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-500 hover:text-pup-maroon dark:text-zinc-400 dark:hover:text-red-400 flex items-center justify-center transition-colors border-0 bg-transparent cursor-pointer active:scale-95"
                                title="Locate in Storage"
                              >
                                <HugeIcon className="ph-bold ph-map-pin text-[14px]" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Locate in Archive</TooltipContent>
                          </Tooltip>
                          <HugeIcon className="ph-bold ph-caret-right text-sm text-gray-400 group-hover:text-pup-maroon dark:group-hover:text-red-500 dark:text-zinc-500"></HugeIcon>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 2. Sort Dropdown, Select All, View Mode (Hidden when viewing student files) */}
            {!selectedStudent && (
              <>
                <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 transition-all shrink-0"
                  title="Arrange Folders and Records"
                >
                  <span>
                    {folderSortBy === "default" && "Sort: Default"}
                    {folderSortBy === "year-desc" && "Sort: Newest First"}
                    {folderSortBy === "year-asc" && "Sort: Oldest First"}
                    {folderSortBy === "name-asc" && "Sort: Name (A-Z)"}
                    {folderSortBy === "name-desc" && "Sort: Name (Z-A)"}
                    {folderSortBy === "count-desc" && "Sort: Most Records"}
                  </span>
                  <HugeIcon className="ph-bold ph-caret-down text-[10px] text-gray-400 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={6}
                className="w-60 rounded-2xl border border-border dark:border-white/10 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 select-none"
              >
                {/* Zone 1: Header */}
                <div className="px-4 py-2.5 border-b border-border dark:border-white/10 bg-gray-50/60 dark:bg-zinc-800/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HugeIcon className="ph-bold ph-arrows-down-up text-xs text-pup-maroon dark:text-red-400" />
                    <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                      Arrange Records
                    </span>
                  </div>
                  {folderSortBy !== "default" && (
                    <button
                      type="button"
                      onClick={() => setFolderSortBy("default")}
                      className="text-[11px] font-semibold text-pup-maroon dark:text-red-400 hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Zone 2: Body */}
                <div className="p-1.5 space-y-0.5">
                  {!isOsas && (
                    <>
                      <DropdownMenuItem
                        onClick={() => setFolderSortBy("year-desc")}
                        className="cursor-pointer text-xs font-medium rounded-lg flex items-center justify-between py-1.5 px-2 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      >
                        <div className="flex items-center gap-2">
                          <HugeIcon className="ph-bold ph-calendar text-sm text-pup-maroon dark:text-red-400" />
                          <span>Newest Year First</span>
                        </div>
                        {folderSortBy === "year-desc" && (
                          <HugeIcon className="ph-bold ph-check text-xs text-pup-maroon dark:text-red-400" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setFolderSortBy("year-asc")}
                        className="cursor-pointer text-xs font-medium rounded-lg flex items-center justify-between py-1.5 px-2 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      >
                        <div className="flex items-center gap-2">
                          <HugeIcon className="ph-bold ph-calendar-blank text-sm text-pup-maroon dark:text-red-400" />
                          <span>Oldest Year First</span>
                        </div>
                        {folderSortBy === "year-asc" && (
                          <HugeIcon className="ph-bold ph-check text-xs text-pup-maroon dark:text-red-400" />
                        )}
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={() => setFolderSortBy("name-asc")}
                    className="cursor-pointer text-xs font-medium rounded-lg flex items-center justify-between py-1.5 px-2 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  >
                    <div className="flex items-center gap-2">
                      <HugeIcon className="ph-bold ph-sort-ascending text-sm text-pup-maroon dark:text-red-400" />
                      <span>Alphabetical (A to Z)</span>
                    </div>
                    {folderSortBy === "name-asc" && (
                      <HugeIcon className="ph-bold ph-check text-xs text-pup-maroon dark:text-red-400" />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFolderSortBy("name-desc")}
                    className="cursor-pointer text-xs font-medium rounded-lg flex items-center justify-between py-1.5 px-2 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  >
                    <div className="flex items-center gap-2">
                      <HugeIcon className="ph-bold ph-sort-descending text-sm text-pup-maroon dark:text-red-400" />
                      <span>Alphabetical (Z to A)</span>
                    </div>
                    {folderSortBy === "name-desc" && (
                      <HugeIcon className="ph-bold ph-check text-xs text-pup-maroon dark:text-red-400" />
                    )}
                  </DropdownMenuItem>
                  {!isLeafLevel && (
                    <DropdownMenuItem
                      onClick={() => setFolderSortBy("count-desc")}
                      className="cursor-pointer text-xs font-medium rounded-lg flex items-center justify-between py-1.5 px-2 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                    >
                      <div className="flex items-center gap-2">
                        <HugeIcon className="ph-bold ph-files text-sm text-pup-maroon dark:text-red-400" />
                        <span>Most Records First</span>
                      </div>
                      {folderSortBy === "count-desc" && (
                        <HugeIcon className="ph-bold ph-check text-xs text-pup-maroon dark:text-red-400" />
                      )}
                    </DropdownMenuItem>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

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

            {/* 4. View Mode Segmented Control: Card vs Table */}
            {isLeafLevel && (
              <div className="flex items-center bg-gray-100/90 dark:bg-zinc-800/80 p-0.5 rounded-xl border border-border/60 dark:border-border shrink-0">
                <button
                  type="button"
                  onClick={() => setListType("card")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                    listType === "card"
                      ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                  )}
                  title="Card View"
                >
                  <HugeIcon className="ph-bold ph-squares-four text-xs" />
                  <span>Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setListType("table")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                    listType === "table"
                      ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                  )}
                  title="Table View"
                >
                  <HugeIcon className="ph-bold ph-list-dashes text-xs" />
                  <span>Table</span>
                </button>
              </div>
            )}
            </>
          )}
        </div>
      </div>

        {/* 3. Breadcrumb Sub-Header */}
        <div className="flex h-[46px] items-center justify-between gap-2 border-t border-border dark:border-border bg-white px-6 text-sm dark:bg-card select-none">
          <div className="flex items-center gap-3">
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
        </div>

            <div className={cn("w-full bg-white dark:bg-card", isLeafLevel && !selectedStudent && listType === "table" && paginatedExplorerItems.length > 0 ? "p-0" : "p-6", selectedStudent && "rounded-b-2xl")}>
              {selectedStudent ? (
                <StudentDriveFilesView
                  student={selectedStudent}
                  allDocs={allDocs}
                  courses={courses}
                  onLocateStudent={onLocateStudent}
                  onPreviewDocument={onPreviewDocument}
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
              ) : loading ? (
                <RecordsArchiveSkeleton />
              ) : students.length === 0 && !showArchived ? (
                <div className="py-16 rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                  <Empty className="flex h-full flex-col items-center justify-center border-0 text-center text-gray-900 dark:text-zinc-300">
                    <EmptyHeader className="flex flex-col items-center gap-0">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                        <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-border bg-white shadow-xl dark:border-border dark:bg-card dark:shadow-none">
                          <HugeIcon className={cn(
                            "ph-duotone text-3xl text-gray-400 dark:text-zinc-500",
                            isOsas ? "ph-buildings" : "ph-users-three"
                          )}></HugeIcon>
                        </EmptyMedia>
                      </div>
                      <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                        {isOsas ? "No Student Organization Records Yet" : "No Student Records Yet"}
                      </EmptyTitle>
                      <EmptyDescription className="max-w-xs text-sm font-medium text-gray-900 dark:text-zinc-300">
                        {isOsas
                          ? "Register recognized student organizations in the Student Organizations tab to view and manage their Constitution & By-Laws and physical archives here."
                          : "Register your first student record in the Upload tab. After that, you can browse, search, and locate drawers here."}
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button
                        type="button"
                        onClick={() => onSwitchView(isOsas ? "organizations" : "upload")}
                        title={isOsas ? "Go to Student Organizations" : "Go to Upload"}
                        className="mt-4 h-10 px-5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs cursor-pointer active:scale-95 transition-all"
                      >
                        {isOsas ? "Register Organization" : "Upload Records"}
                      </Button>
                    </EmptyContent>
                  </Empty>
                </div>
              ) : archivedStudents.length === 0 && showArchived ? (
                <div className="py-16 rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                  <Empty className="flex h-full flex-col items-center justify-center border-0 text-center text-gray-900 dark:text-zinc-300">
                    <EmptyHeader className="flex flex-col items-center gap-0">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                        <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-border bg-white shadow-xl dark:border-border dark:bg-card dark:shadow-none">
                          <HugeIcon className="ph-duotone ph-archive text-3xl text-gray-400 dark:text-zinc-500"></HugeIcon>
                        </EmptyMedia>
                      </div>
                      <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                        {isOsas ? "No Archived Organizations" : "No Archived Students"}
                      </EmptyTitle>
                      <EmptyDescription className="max-w-xs text-sm font-medium text-gray-900 dark:text-zinc-300">
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
              ) : filteredExplorerItems.length === 0 ? (
                <div className="py-16 rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                  <Empty className="flex h-full flex-col items-center justify-center border-0 text-center text-gray-900 dark:text-zinc-300">
                    <EmptyHeader className="flex flex-col items-center gap-0">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                        <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-2xl border border-border bg-white shadow-xl dark:border-border dark:bg-card dark:shadow-none">
                          <HugeIcon className={cn(
                            "ph-duotone text-3xl text-gray-400 dark:text-zinc-500",
                            showArchived ? "ph-archive" : (isOsas ? "ph-buildings" : "ph-users")
                          )}></HugeIcon>
                        </EmptyMedia>
                      </div>
                      <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                        {showArchived
                          ? (isOsas ? "No Archived Organizations" : "No Archived Students")
                          : (isOsas ? "No Organizations In This Category" : "No Students In This Year")}
                      </EmptyTitle>
                      <EmptyDescription className="max-w-xs text-sm font-medium text-gray-900 dark:text-zinc-300">
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
              ) : listType === "card" ? (
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
                             {isSelected && <HugeIcon  className="ph-bold ph-check text-[10px]" />}
                           </div>
                        </div>

                        {isOsas ? (
                          <div className="flex flex-col justify-between h-full min-h-[160px]">
                            <div>
                              <div className="flex items-center gap-2 pr-7 flex-wrap">
                                <span className="rounded-full border border-white/20 bg-white/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-white tracking-wider">
                                  {row.student.acronym || row.student.studentNo}
                                </span>
                                <span className="rounded-full border border-white/20 bg-black/10 px-2 py-0.5 text-[10px] font-semibold text-white/90">
                                  {row.student.category || "Academic"}
                                </span>
                                {showArchived && (
                                  <Badge className="rounded-full border-white/30 bg-white/20 px-2 py-0.5 text-[9px] font-semibold text-white">
                                    Archived
                                  </Badge>
                                )}
                              </div>

                              <h4 className="mt-2 text-[17px] font-bold text-white transition-colors line-clamp-2 leading-snug" title={formatTitleCase(row.student.name)}>
                                {formatTitleCase(row.student.name)}
                              </h4>

                              {row.student.adviser && (
                                <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-white/85 font-medium">
                                  <HugeIcon className="ph-bold ph-user text-[13px] opacity-80" />
                                  <span className="truncate">Adviser: {row.student.adviser}</span>
                                </div>
                              )}

                              <div className="mt-2.5 flex items-center gap-2 text-[11px] text-white/80">
                                <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md">
                                  <HugeIcon className="ph-bold ph-users text-[12px]" />
                                  {row.student.activeOfficerCount ?? 0} Officers
                                </span>
                                <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md">
                                  <HugeIcon className="ph-bold ph-file-text text-[12px]" />
                                  {row.student.proposalCount ?? 0} Proposals
                                </span>
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-white/15 flex flex-col gap-2">
                              <div className="flex items-center justify-between gap-2">
                                {row.student.hasCbl ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onPreviewDocument(
                                        "Constitution and By-Laws",
                                        row.student.name,
                                        row.student.acronym || row.student.studentNo,
                                        row.student.rawOrg?.bylaws_storage_filename || row.student.bylawsStorageFilename || ""
                                      );
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                                    title="Click to preview Constitution and By-Laws"
                                  >
                                    <HugeIcon className="ph-bold ph-file-pdf text-[13px]" />
                                    <span>CBL On File</span>
                                    <HugeIcon className="ph-bold ph-eye text-[11px] opacity-75 ml-0.5" />
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/60">
                                    <HugeIcon className="ph-bold ph-warning-circle text-[13px]" />
                                    <span>No CBL Filed</span>
                                  </span>
                                )}

                                <div className="flex items-center gap-1.5 ml-auto">
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
                                      Restore
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
                                        className="h-7 px-2.5 rounded-lg border-white/30 bg-white/15 text-[10px] font-semibold text-white shadow-xs hover:bg-white/25 active:scale-95 transition-all cursor-pointer"
                                        title="Locate Archive Drawer"
                                      >
                                        Locate
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Locate Drawer</TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 text-white/80">
                                <HugeIcon className="ph-bold ph-map-pin text-[13px]" />
                                <span className="text-[12px] font-medium text-white/85 select-none truncate">
                                  Room {row.student.room} • {row.student.cabinet} • Drawer {row.student.drawer}
                                </span>
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
                                <div className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 font-sans text-[12px] font-medium text-white/90">
                                  {row.student.studentNo}
                                </div>
                                {showArchived && (
                                  <Badge className="rounded-full border-white/30 bg-white/20 px-2 py-0.5 text-[9px] font-semibold text-white">
                                    Archived
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-2.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 text-white/80">
                                  <HugeIcon  className="ph-bold ph-map-pin text-[14px]"></HugeIcon>
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
                                      Restore
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
                                        className="h-8 rounded-xl border-white/30 bg-white/15 px-3 text-[11px] font-semibold text-white shadow-xs hover:bg-white/25 active:scale-95 transition-all cursor-pointer"
                                        title="Locate in Storage Map"
                                      >
                                        Locate
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
              ) : (
                <div 
                  key={`table-${currentLevel}-${showArchived}`}
                  className="w-full overflow-x-auto animate-fade-up"
                >
                  <table className="w-full text-sm table-fixed min-w-[850px]">
                    <thead className="sticky top-0 z-10 border-b border-border dark:border-border bg-white dark:bg-card">
                      <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-gray-500 dark:text-zinc-400">
                        <th className="w-12 p-4 text-center font-medium">
                           <input
                             type="checkbox"
                             className="h-4 w-4 m-0 align-middle shrink-0 cursor-pointer rounded border border-border dark:border-border"
                             checked={paginatedExplorerItems.length > 0 && paginatedExplorerItems.every(it => selectedIds.has(it.student.studentNo))}
                             onChange={() => toggleSelectAll(paginatedExplorerItems)}
                           />
                        </th>
                        <th className={cn("p-4 font-medium", isOsas ? "w-[18%]" : "w-[22%]")}>{isOsas ? "Acronym" : "Student No."}</th>
                        <th className={cn("p-4 font-medium", isOsas ? "w-[32%]" : "w-[42%]")}>{isOsas ? "Organization Name" : "Full Name"}</th>
                        {isOsas && <th className="w-[16%] p-4 font-medium">Category</th>}
                        <th className={cn("p-4 font-medium", isOsas ? "w-[24%]" : "w-[28%]")}>Physical Location</th>
                        <th className="w-24 p-4 pr-6 text-right font-medium">{isOsas ? "Actions" : "Actions"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border dark:divide-border bg-transparent">
                      {paginatedExplorerItems.map((row) => {
                        const isSelected = selectedIds.has(row.student.studentNo)
                        return (
                          <tr
                            key={row.key}
                            className={cn(
                              "group cursor-pointer transition-colors hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 select-none",
                              isSelected && "bg-blue-50/60 dark:bg-blue-950/20"
                            )}
                            onClick={() => handleStudentSelect(row.student)}
                          >
                            <td className="w-12 p-4 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                               <input
                                 type="checkbox"
                                 className={cn(
                                   "h-4 w-4 m-0 align-middle shrink-0 cursor-pointer rounded border border-border dark:border-border transition-opacity",
                                   isSelected ? "opacity-100" : "opacity-50 group-hover:opacity-80"
                                 )}
                                 checked={isSelected}
                                 onChange={() => toggleSelect(row.student.studentNo)}
                               />
                            </td>
                            <td className="p-4 align-middle whitespace-nowrap">
                              <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200">
                                {row.student.acronym || row.student.studentNo}
                              </span>
                            </td>
                            <td className="p-4 align-middle overflow-hidden">
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2 min-w-0 text-sm font-semibold text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors">
                                  <span className="truncate" title={formatTitleCase(row.student.name)}>
                                    {formatTitleCase(row.student.name)}
                                  </span>
                                  {isOsas && row.student.hasCbl && (
                                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                                      CBL
                                    </span>
                                  )}
                                </div>
                                {isOsas && row.student.adviser && (
                                  <div className="truncate text-xs font-normal text-gray-500 dark:text-zinc-400 mt-0.5" title={`Adviser: ${row.student.adviser} · ${row.student.activeOfficerCount ?? 0} Officers · ${row.student.proposalCount ?? 0} Proposals`}>
                                    Adviser: {row.student.adviser} · {row.student.activeOfficerCount ?? 0} Officers · {row.student.proposalCount ?? 0} Proposals
                                  </div>
                                )}
                                {showArchived && (
                                  <div className="truncate text-xs font-normal text-red-650 dark:text-red-400 mt-0.5">
                                    Archived Record
                                  </div>
                                )}
                              </div>
                            </td>
                            {isOsas && (
                              <td className="p-4 align-middle whitespace-nowrap">
                                <span className="inline-flex items-center rounded-md bg-gray-100 dark:bg-zinc-800 px-2 py-1 text-[11px] font-medium text-gray-700 dark:text-zinc-300">
                                  {row.student.category || "Academic"}
                                </span>
                              </td>
                            )}
                            <td className="p-4 align-middle whitespace-nowrap">
                               <div className="inline-flex w-fit items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-medium text-gray-800 dark:text-zinc-200 whitespace-nowrap">
                                 Room {row.student.room} • {row.student.cabinet} • Drawer {row.student.drawer}
                               </div>
                            </td>
                            <td className="p-4 pr-6 align-middle text-right">
                              <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                 {isOsas && row.student.hasCbl && (
                                   <button
                                     type="button"
                                     onClick={() => {
                                       onPreviewDocument(
                                         "Constitution and By-Laws",
                                         row.student.name,
                                         row.student.acronym || row.student.studentNo,
                                         row.student.rawOrg?.bylaws_storage_filename || row.student.bylawsStorageFilename || ""
                                       );
                                     }}
                                     title="Preview Constitution and By-Laws"
                                     className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center border-0 bg-transparent"
                                   >
                                     <HugeIcon className="ph-bold ph-file-pdf text-[15px]"></HugeIcon>
                                   </button>
                                 )}
                                 <Tooltip>
                                   <TooltipTrigger asChild>
                                     <button
                                       type="button"
                                       onClick={() => handleOpenStudentProfile(row.student)}
                                       title={isOsas ? "View Organization Details" : "View Student Details"}
                                       className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center border-0 bg-transparent"
                                     >
                                       <HugeIcon className="ph-bold ph-eye text-[15px]"></HugeIcon>
                                     </button>
                                   </TooltipTrigger>
                                   <TooltipContent>{isOsas ? "View Organization Details" : "View Student Details"}</TooltipContent>
                                 </Tooltip>
                                 <Tooltip>
                                   <TooltipTrigger asChild>
                                     <button
                                       type="button"
                                       onClick={() => handleLocateStudentClick(row.student)}
                                       title="Locate Archive Drawer"
                                       className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-pup-maroon dark:text-zinc-400 dark:hover:text-red-400 transition-colors focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center border-0 bg-transparent"
                                     >
                                       <HugeIcon className="ph-bold ph-map-pin text-[15px]"></HugeIcon>
                                     </button>
                                   </TooltipTrigger>
                                   <TooltipContent>Locate Drawer</TooltipContent>
                                 </Tooltip>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {isLeafLevel && !selectedStudent && totalItems > 0 && (
              <div className="flex items-center justify-between border-t border-border bg-white p-4 px-6 dark:border-border dark:bg-card mt-auto select-none">
                <div className="flex items-center gap-6 text-xs text-gray-900 dark:text-zinc-300">
                  <span>
                    Showing {paginatedExplorerItems.length} of {totalItems.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>Rows:</span>
                    <div className="flex items-center gap-1">
                      {[9, 12, 24, 48].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            setItemsPerPage(size)
                            setPage(1)
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                            itemsPerPage === size
                              ? "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
                              : "text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
                          )}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="text-xs text-gray-900 dark:text-zinc-300 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
                  >
                    Prev
                  </Button>

                  <div className="h-8 w-8 rounded-xl border border-[#e5e5ea] dark:border-border flex items-center justify-center text-xs font-bold text-gray-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                    {page}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="text-xs text-gray-900 dark:text-zinc-300 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {!selectedStudent && (
              <OfficeDocumentsTable
                documents={staffDocs}
                officeLabel={officeLabel}
                breadcrumbs={breadcrumbs}
                onPreviewDocument={onPreviewDocument}
                embedded={true}
              />
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
        confirmLabel="Restore"
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
        confirmLabel="Archive"
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
        allDocs={allDocs}
        onLocateStudent={onLocateStudent}
        onPreviewDocument={onPreviewDocument}
        onEditStudent={handleEditRecord}
        onArchiveStudent={handleArchiveRecord}
        onRestoreStudent={async (sn) => {
          const pool = showArchived ? archivedStudents : students
          const target = (pool || []).find((s) => (s.studentNo || s.id) === sn) || activeStudent
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
        authUser={authUser}
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
