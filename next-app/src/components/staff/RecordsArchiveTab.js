"use client"

import { useState, useEffect, useMemo } from "react"

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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Toggle } from "@/components/ui/toggle"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty"

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
import { cn } from "@/lib/utils"

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
}) {
  const [listType, setListType] = useState("card")
  const [showArchived, setShowArchived] = useState(false)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9) // 9 fits nicely in 3-column card grid, 10 or more in table

  const [folderColors, setFolderColors] = useState({})

  useEffect(() => {
    const saved = localStorage.getItem("pup-folder-colors")
    if (saved) {
      try {
        setFolderColors(JSON.parse(saved))
      } catch (e) {
        console.error("Failed to parse folder colors", e)
      }
    }
  }, [])

  const updateFolderColor = (key, colorId) => {
    const next = { ...folderColors, [key]: colorId }
    setFolderColors(next)
    localStorage.setItem("pup-folder-colors", JSON.stringify(next))
  }

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

  const handleLocateStudentClick = (student) => {
    onLocateStudent(student)
  }



  // Derived filtered results
  const filteredQuickResults = useMemo(() => {
    if (showArchived) {
      const q = quickQuery.toLowerCase()
      return archivedStudents
        .filter(
          (s) =>
            s.studentNo.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q)
        )
        .slice(0, 10)
    }
    return quickResults
  }, [showArchived, quickResults, archivedStudents, quickQuery])

  const filteredExplorerItems = useMemo(() => {
    if (currentLevel !== "students") {
      return explorerItems.map((item) => {
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
          subtitle: showArchived ? `${archCount} archived` : `${activeCount} active`
        }
      })
    }

    if (showArchived) {
      const year = breadcrumbs
        .find((b) => b.level === "students")
        ?.label.split(" ")[1]
      if (!year) return []
      const yearNum = Number(year)
      return archivedStudents
        .filter((s) => {
          return getStudentFolderYear(s) === yearNum
        })
        .map((s) => ({ key: s.studentNo, student: s }))
    }
    return explorerItems
  }, [showArchived, explorerItems, archivedStudents, students, currentLevel, breadcrumbs])

  const paginatedExplorerItems = useMemo(() => {
    if (currentLevel !== "students") return filteredExplorerItems
    const start = (page - 1) * itemsPerPage
    return filteredExplorerItems.slice(start, start + itemsPerPage)
  }, [filteredExplorerItems, currentLevel, page, itemsPerPage])

  const totalItems = currentLevel === "students" ? filteredExplorerItems.length : 0
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))

  const activeTabCount = useMemo(() => {
    if (currentLevel === "students") {
      const yearItem = breadcrumbs.find((b) => b.level === "students")
      if (yearItem) {
        const yearNum = Number(yearItem.label.split(" ")[1])
        if (Number.isFinite(yearNum)) {
          return students.filter((s) => getStudentFolderYear(s) === yearNum).length
        }
      }
    }
    return students.length
  }, [currentLevel, breadcrumbs, students])

  const archivedTabCount = useMemo(() => {
    if (currentLevel === "students") {
      const yearItem = breadcrumbs.find((b) => b.level === "students")
      if (yearItem) {
        const yearNum = Number(yearItem.label.split(" ")[1])
        if (Number.isFinite(yearNum)) {
          return archivedStudents.filter((s) => getStudentFolderYear(s) === yearNum).length
        }
      }
    }
    return archivedStudents.length
  }, [currentLevel, breadcrumbs, archivedStudents])



  return (
    <div
      id="view-search"
      className="animate-fade-up font-inter flex h-auto w-full flex-col gap-6"
    >
      <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none overflow-visible flex flex-col">
        <PageHeader
          icon="ph-archive"
          title="Records & Archive"
          description="Browse, search, and locate student records and physical archives."
          showBorder={false}
          titleClassName="text-[15px] font-bold text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[14px] font-normal text-[#8E8E93] dark:text-zinc-400 mt-[2px]"
          actions={
            <Button
              variant="ghost"
              onClick={() => onSwitchView("storage")}
              className="h-10 px-3 font-semibold text-sm text-gray-600 hover:text-gray-900 hover:bg-transparent dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors flex items-center gap-2 rounded-brand shadow-none! border-0!"
            >
              Storage Explorer
              <i className="ph-bold ph-arrow-right"></i>
            </Button>
          }
        />
        <div className="bg-white px-6 pb-[16px] dark:bg-card flex flex-col md:flex-row md:items-center justify-between gap-4 select-none pt-3">
          {/* Left: Active / Archived Tabs */}
          <div className="flex gap-[24px] select-none items-center">
            <button
              type="button"
              onClick={() => setShowArchived(false)}
              className={cn(
                "relative pb-[16px] -mb-[16px] text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer",
                !showArchived
                  ? "text-black after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-black dark:text-zinc-50 dark:after:bg-zinc-50"
                  : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
              )}
            >
              Active ({activeTabCount})
            </button>
            <button
              type="button"
              onClick={() => setShowArchived(true)}
              className={cn(
                "relative pb-[16px] -mb-[16px] text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer",
                showArchived
                  ? "text-black after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-black dark:text-zinc-50 dark:after:bg-zinc-50"
                  : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
              )}
            >
              Archived ({archivedTabCount})
            </button>
          </div>

          {/* Right: Search Toolbar */}
          <div className="flex-1 md:max-w-md relative group">
            <div className="relative">
              <i className="ph-bold ph-magnifying-glass absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 transition-colors group-focus-within:text-pup-maroon dark:text-zinc-500 text-sm"></i>
              <Input
                type="text"
                placeholder="Search Student"
                className="h-[36px] w-full rounded-[8px] border-[0.5px] border-black/15 bg-white pl-9 pr-10 text-[13px] font-normal placeholder:text-[#8E8E93] dark:border-white/15 dark:bg-card"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
              />
              {quickQuery !== "" && (
                <button
                  type="button"
                  onClick={() => setQuickQuery("")}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 transition-colors hover:text-pup-maroon dark:hover:text-red-500 dark:text-zinc-500"
                >
                  <i className="ph-bold ph-x-circle text-[15px]"></i>
                </button>
              )}
            </div>

            {/* Quick Search Results Dropdown Overlay */}
            {quickQuery.trim().length >= 2 && (
              <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 rounded-xl border border-gray-200 bg-white shadow-lg p-2 dark:border-white/10 dark:bg-zinc-900 max-h-[250px] overflow-y-auto">
                {isQuickSearching ? (
                  <div className="p-2 space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-10 w-full rounded-lg" />
                    ))}
                  </div>
                ) : filteredQuickResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-500 dark:text-zinc-400">
                    {showArchived ? "No archived records found." : "No records found."}
                  </div>
                ) : (
                  filteredQuickResults.map((s) => (
                    <div
                      key={s.studentNo}
                      className="group flex cursor-pointer items-center justify-between rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
                      onClick={() => {
                        handleLocateStudentClick(s)
                        setQuickQuery("")
                      }}
                    >
                      <div>
                        <div className="text-sm font-semibold text-gray-800 group-hover:text-pup-maroon dark:group-hover:text-red-500 dark:text-zinc-100">
                          {s.name}
                        </div>
                        <div className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                          {s.studentNo}
                        </div>
                      </div>
                      <i className="ph-bold ph-caret-right text-sm text-gray-400 group-hover:text-pup-maroon dark:group-hover:text-red-500 dark:text-zinc-500"></i>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
      <div className="flex flex-col gap-6">
        <section className="flex h-auto w-full flex-col gap-6">
          <div className="relative flex min-h-[250px] shrink-0 flex-col rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none mb-4">
            <div className="flex h-[52px] items-center justify-between gap-2 border-b border-gray-200 bg-white px-6 text-sm dark:border-white/10 dark:bg-card">
              <div className="flex items-center gap-3">
                {currentLevel === "students" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onBreadcrumbClick({ level: "years" })}
                    className="h-10 px-2 font-semibold text-sm text-gray-600 hover:text-gray-900 hover:bg-transparent dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors flex items-center gap-1.5 rounded-brand shadow-none! border-0!"
                  >
                    <i className="ph-bold ph-arrow-left text-sm"></i>
                    Back
                  </Button>
                )}
                <Breadcrumb>
                  <BreadcrumbList className="flex items-center font-medium text-[14px] text-[#8E8E93] gap-0 dark:text-zinc-400">
                    {breadcrumbs.map((b, idx) => (
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
                              currentLevel === b.level
                                ? "text-pup-maroon font-semibold dark:text-red-400"
                                : "text-[#8E8E93] font-medium hover:text-[#1C1C1E] dark:text-zinc-400 dark:hover:text-zinc-200"
                            )}
                            onClick={() => onBreadcrumbClick(b)}
                          >
                            {b.label}
                          </BreadcrumbLink>
                        </BreadcrumbItem>
                      </div>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
                {showArchived && (
                  <>
                    <div className="h-4 w-[1px] bg-[#E5E5EA] dark:bg-zinc-800 mx-3.5" />
                    <div className="py-[5px] px-[10px] bg-pup-maroon/10 dark:bg-red-400/10 text-pup-maroon dark:text-red-400 rounded-[6px] text-[12.5px] font-medium select-none">
                      Archive View
                    </div>
                  </>
                )}
              </div>

              {currentLevel === "students" && (
                <div className="flex gap-[24px] select-none items-center h-full">
                  {listType === "card" && paginatedExplorerItems.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSelectAll(paginatedExplorerItems)}
                      className="h-7 px-2.5 text-[12px] font-medium text-[#8E8E93] hover:text-[#0A84FF] hover:bg-[#F5F5F7] dark:text-zinc-400 dark:hover:text-red-400 dark:hover:bg-zinc-800 rounded-[6px] border border-[#E5E5EA] dark:border-white/10 cursor-pointer"
                    >
                      {paginatedExplorerItems.every(it => selectedIds.has(it.student.studentNo)) ? "Deselect All" : "Select All"}
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => setListType("card")}
                    className={cn(
                      "relative pb-[16px] -mb-[16px] text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer flex items-center justify-center",
                      listType === "card"
                        ? "text-black after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-black dark:text-zinc-50 dark:after:bg-zinc-50"
                        : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
                    )}
                  >
                    Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setListType("table")}
                    className={cn(
                      "relative pb-[16px] -mb-[16px] text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer flex items-center justify-center",
                      listType === "table"
                        ? "text-black after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-black dark:text-zinc-50 dark:after:bg-zinc-50"
                        : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
                    )}
                  >
                    Table
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 bg-white p-6 dark:bg-card">
              {students.length === 0 && !showArchived ? (
                <Empty className="flex h-full flex-col items-center justify-center border-0 text-center text-gray-500 dark:text-zinc-400">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                      <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                        <i className="ph-duotone ph-users-three text-xl text-gray-300 dark:text-zinc-600"></i>
                      </EmptyMedia>
                    </div>
                    <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                      No Student Records Yet
                    </EmptyTitle>
                    <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                      Register your first student record in the Upload tab.
                      After that, you can browse, search, and locate drawers
                      here.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button
                      type="button"
                      onClick={() => onSwitchView("upload")}
                      className="mt-4 flex h-10 items-center gap-2 rounded-brand btn-brand-red active:scale-95 transition-all dark:shadow-none"
                    >
                      <i className="ph-bold ph-upload-simple"></i> Go To Register / Upload
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : archivedStudents.length === 0 && showArchived ? (
                <Empty className="flex h-full flex-col items-center justify-center border-0 text-center text-gray-500 dark:text-zinc-400">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                      <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                        <i className="ph-duotone ph-archive text-xl text-gray-300 dark:text-zinc-600"></i>
                      </EmptyMedia>
                    </div>
                    <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                      No Archived Students
                    </EmptyTitle>
                    <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                      There are currently no archived records found in the system.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : currentLevel !== "students" ? (
                <div 
                  key={`folders-${showArchived}`}
                  className="animate-fade-up grid p-1"
                  style={{
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "24px",
                    justifyItems: "center"
                  }}
                >
                  {filteredExplorerItems.map((it, index) => {
                    const theme = FOLDER_COLORS[folderColors[it.key]] || FOLDER_COLORS["yellow"]
                    return (
                      <div
                        key={index}
                        onClick={it.disabled ? undefined : it.onClick}
                        className={`group relative h-48 w-full min-w-[180px] max-w-[300px] transition-all duration-normal ${ it.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer" }`}
                        style={{ perspective: "1000px" }}
                      >
                        {/* Paint Palette Color Picker Button */}
                        <div 
                          className="absolute bottom-2 right-2 z-40 opacity-0 group-hover:opacity-100 transition-opacity duration-fast" 
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "w-6 h-6 rounded-full bg-white/20 hover:bg-white/40 border border-black/10 shadow-xs transition-colors",
                                  theme.isLight ? "text-amber-950/80" : "text-white/80"
                                )}
                                title="Change Folder Color"
                              >
                                <i className="ph-bold ph-palette text-xs" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-36 p-2 rounded-xl bg-white/95 backdrop-blur-md border border-gray-200 shadow-xl" side="top" align="end">
                              <div className="text-[9px] font-bold text-gray-400 uppercase mb-1.5 px-1 tracking-wider">Folder Color</div>
                              <div className="grid grid-cols-4 gap-1.5">
                                {Object.entries(FOLDER_COLORS).map(([colorKey, colorVal]) => (
                                  <button
                                    key={colorKey}
                                    type="button"
                                    onClick={() => updateFolderColor(it.key, colorKey)}
                                    className="w-5 h-5 rounded-full border border-black/10 hover:scale-110 active:scale-95 transition-transform cursor-pointer flex items-center justify-center"
                                    style={{ backgroundColor: colorVal.frontStart }}
                                    title={colorVal.name}
                                  >
                                    {(folderColors[it.key] === colorKey || (!folderColors[it.key] && colorKey === "yellow")) ? (
                                      <div className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                                    ) : null}
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* macOS Folder Back Flap (CSS panel matching front dimensions/alignment) */}
                        <div 
                          className="absolute top-[18px] left-0 right-0 bottom-0 rounded-2xl transition-all duration-normal"
                          style={{
                            background: `linear-gradient(180deg, ${theme.backStart} 0%, ${theme.backEnd} 100%)`
                          }}
                        >
                          {/* Folder Tab (Attached to top-left of the back flap) */}
                          <div 
                            className="absolute bottom-[calc(100%-1px)] left-[16px] w-20 h-4 rounded-t-[8px] z-0"
                            style={{
                              backgroundColor: theme.backStart
                            }}
                          />
                        </div>

                        {/* Solid Paper Peek Sheets (Apple-like stacking) */}
                        <div className="absolute top-[2px] left-[5%] right-[5%] bottom-[20px] z-10 flex flex-col justify-end transition-all duration-normal group-hover:translate-y-[-12px] group-hover:scale-[1.02]">
                          {/* Back sheet */}
                          <div className="absolute bottom-0 left-[6%] right-[6%] h-[56px] bg-white/70 rounded-t-md shadow-[0_-1px_3px_rgba(0,0,0,0.05)] border-t border-x border-gray-200/20 transform -rotate-3 origin-bottom transition-all duration-normal group-hover:rotate-[-6deg]" />
                          
                          {/* Middle sheet */}
                          <div className="absolute bottom-0 left-[3%] right-[3%] h-[60px] bg-white/85 rounded-t-md shadow-[0_-1px_4px_rgba(0,0,0,0.05)] border-t border-x border-gray-200/30 transform rotate-2 origin-bottom transition-all duration-normal group-hover:rotate-[4deg]" />
                          
                          {/* Front sheet with mock content lines */}
                          <div className="absolute bottom-0 left-0 right-0 h-[64px] bg-white rounded-t-md shadow-[0_-2px_6px_rgba(0,0,0,0.08)] border-t border-x border-gray-200 p-3 flex flex-col gap-1.5 transition-all duration-normal">
                            {/* Mock lines */}
                            <div className="h-1.5 w-1/3 bg-gray-300/60 rounded-full" />
                            <div className="h-1 w-full bg-gray-200/50 rounded-full" />
                            <div className="h-1 w-5/6 bg-gray-200/50 rounded-full" />
                          </div>
                        </div>

                        {/* macOS Folder Front Body with 3D Opening Tilt */}
                        <div 
                          className="absolute top-[28px] right-0 bottom-0 left-0 z-20 flex flex-col items-center justify-center rounded-2xl p-4 transition-all duration-normal origin-bottom [transform-style:preserve-3d] group-hover:[transform:rotateX(-14deg)_translateY(2px)]"
                          style={{
                            background: `linear-gradient(180deg, ${theme.frontStart} 0%, ${theme.frontEnd} 100%)`
                          }}
                        >
                          {/* Glossy highlight/gradient overlay */}
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/5 to-white/15 pointer-events-none z-25" />
                          
                          <h3 className={cn(
                            "w-full truncate px-1 text-center text-3xl font-black sm:text-4xl z-30 tracking-tight",
                            theme.title
                          )}>
                            {it.title}
                          </h3>
                          <span className={cn(
                            "mt-1 text-xs font-bold tracking-widest z-30 uppercase opacity-90",
                            theme.subtitle
                          )}>
                            {it.subtitle}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : filteredExplorerItems.length === 0 ? (
                <Empty className="flex h-full flex-col items-center justify-center border-0 text-center text-gray-500 dark:text-zinc-400">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                      <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                        <i className={cn(
                          "ph-duotone text-xl text-gray-300 dark:text-zinc-600",
                          showArchived ? "ph-archive" : "ph-users"
                        )}></i>
                      </EmptyMedia>
                    </div>
                    <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                      {showArchived
                        ? "No Archived Students"
                        : "No Students In This Year"}
                    </EmptyTitle>
                    <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                      {showArchived
                        ? "There are currently no archived records found for this academic period."
                        : "There are no student records filed under this year yet."}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : listType === "card" ? (
                <div 
                  key={`cards-${currentLevel}-${showArchived}`}
                  className="animate-fade-up grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
                >
                  {paginatedExplorerItems.map((row, index) => {
                    const isSelected = selectedIds.has(row.student.studentNo)
                    const studentYear = getStudentFolderYear(row.student)
                    const theme = FOLDER_COLORS[folderColors[studentYear]] || FOLDER_COLORS["yellow"]
                    const cardStyle = {
                      background: `linear-gradient(135deg, ${theme.frontStart} 0%, ${theme.frontEnd} 100%)`,
                    }
                    return (
                      <div
                        key={index}
                        className={cn(
                          "group relative flex cursor-pointer flex-col rounded-[14px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)] select-none text-white border-0",
                          isSelected 
                            ? "ring-2 ring-[#0A84FF]" 
                            : "",
                          showArchived && "opacity-95"
                        )}
                        style={cardStyle}
                        onClick={() => handleLocateStudentClick(row.student)}
                      >
                        <div className="absolute top-4 right-4 z-20" onClick={(e) => { e.stopPropagation(); toggleSelect(row.student.studentNo); }}>
                           <div className={cn(
                             "h-5 w-5 rounded-[6px] border flex items-center justify-center transition-all duration-fast cursor-pointer",
                             isSelected 
                               ? "bg-white border-white text-[#0A84FF]" 
                               : "border-white/40 bg-white/10 hover:border-white/80"
                           )}>
                             {isSelected && <i className="ph-bold ph-check text-[10px]" />}
                           </div>
                        </div>
                        <div className="flex items-start w-full">
                          <div className="min-w-0 flex-1 flex flex-col justify-center">
                            <div className="flex items-center min-w-0 mb-1">
                              <h4 className="truncate text-[19px] font-bold text-white transition-colors">
                                {row.student.name}
                              </h4>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <div className="rounded-[6px] border border-white/20 bg-white/10 px-2 py-0.5 font-sans text-[12px] font-medium text-white/90">
                                {row.student.studentNo}
                              </div>
                              {showArchived && (
                                <Badge className="h-4 border-white/30 bg-white/20 px-1.5 text-[9px] font-semibold text-white">
                                  Archived
                                </Badge>
                              )}
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-white/80">
                                <i className="ph-bold ph-map-pin text-[14px]"></i>
                                <span className="text-[13px] font-medium text-white/80 select-none whitespace-nowrap">
                                  Room {row.student.room} • Cabinet {row.student.cabinet} • Drawer {row.student.drawer}
                                </span>
                              </div>
                              {showArchived && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setRestoreTarget(row.student)
                                    setRestoreStudentOpen(true)
                                  }}
                                  className="h-8 rounded-brand border-white/30 bg-white/10 px-2.5 text-[9px] font-semibold text-white shadow-xs hover:bg-white/20"
                                >
                                  <i className="ph-bold ph-archive-restore mr-1"></i>
                                  Restore
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div 
                  key={`table-${currentLevel}-${showArchived}`}
                  className="flex-1 overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm animate-fade-up dark:border-white/10 dark:bg-card"
                >
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 z-10 border-b-[0.5px] border-black/10 dark:border-white/10 bg-white dark:bg-card">
                      <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                        <th className="w-16 p-4 text-center font-medium">
                           <input
                             type="checkbox"
                             className="h-4 w-4 cursor-pointer rounded border border-gray-300 dark:border-white/10"
                             checked={paginatedExplorerItems.length > 0 && paginatedExplorerItems.every(it => selectedIds.has(it.student.studentNo))}
                             onChange={() => toggleSelectAll(paginatedExplorerItems)}
                           />
                        </th>
                        <th className="w-48 p-4 font-medium">Student No.</th>
                        <th className="p-4 font-medium">Full Name</th>
                        <th className="w-56 p-4 font-medium">Physical Location</th>
                        <th className="w-32 p-4 text-right font-medium">Locate</th>
                      </tr>
                    </thead>
                    <tbody className="bg-transparent">
                      {paginatedExplorerItems.map((row) => {
                        const isSelected = selectedIds.has(row.student.studentNo)
                        return (
                          <tr
                            key={row.key}
                            className={cn(
                              "group h-[52px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0 transition-all duration-fast hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 select-none",
                              isSelected && "bg-blue-50/60 dark:bg-blue-950/20"
                            )}
                            onClick={() => handleLocateStudentClick(row.student)}
                          >
                            <td className="py-0 px-4 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                               <input
                                 type="checkbox"
                                 className={cn(
                                   "h-4 w-4 cursor-pointer rounded border border-gray-300 dark:border-white/10 transition-opacity",
                                   isSelected ? "opacity-100" : "opacity-50 group-hover:opacity-80"
                                 )}
                                 checked={isSelected}
                                 onChange={() => toggleSelect(row.student.studentNo)}
                               />
                            </td>
                            <td className="py-0 px-4 align-middle text-[13px] font-normal text-[#111111] dark:text-zinc-300">
                              {row.student.studentNo}
                            </td>
                            <td className="py-0 px-4 align-middle">
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2 text-[14px] font-medium text-[#111111] dark:text-zinc-50">
                                  <span className="truncate">
                                    {row.student.name}
                                  </span>
                                </div>
                                {showArchived && (
                                  <div className="truncate text-[12px] font-normal text-red-650 dark:text-red-400 mt-[2px]">
                                    Archived Record
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-0 px-4 align-middle">
                               <div className="inline-flex w-fit items-center justify-center rounded-[4px] bg-[#E5E5EA]/50 dark:bg-zinc-800 px-[8px] py-[3px] text-[11px] font-medium tracking-[0.04em] text-[#111111] dark:text-zinc-300 whitespace-nowrap">
                                 Room {row.student.room} • Cabinet {row.student.cabinet} • Drawer {row.student.drawer}
                               </div>
                            </td>
                            <td className="py-0 px-4 align-middle text-right">
                              <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                 <button
                                   onClick={() => handleLocateStudentClick(row.student)}
                                   title="Locate"
                                   className="w-7 h-7 rounded-[6px] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/10 text-[#C7C7CC] dark:text-zinc-650 transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center"
                                 >
                                   <i className="ph-bold ph-map-pin text-[16px]"></i>
                                 </button>
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

            {currentLevel === "students" && totalItems > 0 && (
              <div className="flex items-center justify-between border-t border-gray-100 bg-white p-6 px-8 dark:border-white/10 dark:bg-card mt-auto rounded-b-brand">
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-6 text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                    <span>
                      Showing {paginatedExplorerItems.length} of {totalItems}
                    </span>
                    <div className="flex items-center gap-1.5 border-l border-gray-200 pl-6 dark:border-white/10">
                      <span className="text-[12px] text-gray-400 dark:text-zinc-500">Rows:</span>
                      <div className="flex items-center gap-1">
                        {[9, 12, 24, 48].map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => {
                              setItemsPerPage(size)
                              setPage(1)
                            }}
                            className={`px-2 py-0.5 rounded-[4px] text-[12px] font-normal cursor-pointer transition-colors border-0 ${
                              itemsPerPage === size
                                ? "bg-gray-100 text-[#111111] font-medium dark:bg-white/10 dark:text-zinc-50"
                                : "bg-transparent text-[#8E8E93] dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 bg-transparent text-[12px] font-normal text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
                  >
                    Prev
                  </button>

                  <div className="flex h-8 min-w-[32px] items-center justify-center rounded-[6px] border border-gray-200/80 bg-white px-2.5 text-[12px] font-medium text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-100">
                    {page}
                  </div>

                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 bg-transparent text-[12px] font-normal text-[#8E8E93] hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>


        </section>
      </div>

      <ConfirmModal
        open={restoreStudentOpen}
        onCancel={() => {
          setRestoreStudentOpen(false)
          setRestoreTarget(null)
        }}
        title="Restore Student Record"
        message={`Restore record for ${restoreTarget?.name} (${restoreTarget?.studentNo})? This will make the student active and visible in all modules again.`}
        confirmLabel="Restore Record"
        variant="success"
        isRestoreModal={true}
        onConfirm={async () => {
          if (restoreTarget) {
            await onRestoreStudent(restoreTarget.studentNo)
          }
          setRestoreStudentOpen(false)
          setRestoreTarget(null)
        }}
      />

      {selectedIds.size > 0 && (
        <FloatingActionBar
          selectedCount={selectedIds.size}
          selectionStatus="Students Selected"
          showOnSingle={true}
          onCancel={() => onSelectionChange(new Set())}
          customContent={
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectionChange(new Set())
                }}
                className="h-auto text-[13px] font-normal text-[#8E8E93] hover:text-[#111111] dark:hover:text-white bg-transparent hover:bg-transparent border-0 p-0 shadow-none cursor-pointer"
              >
                Deselect All
              </button>
              {showArchived ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onBulkRestore()
                  }}
                  className="flex h-[36px] px-5 items-center justify-center rounded-[8px] btn-brand-green text-[13px] font-medium text-white active:scale-95 transition-all dark:shadow-none cursor-pointer"
                >
                  Restore
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onBulkArchive()
                  }}
                  className="flex h-[36px] px-5 items-center justify-center rounded-[8px] btn-brand-red text-[13px] font-medium text-white active:scale-95 transition-all dark:shadow-none cursor-pointer"
                >
                  Archive
                </Button>
              )}
            </div>
          }
        />
      )}
    </div>
  )
}
