"use client"

import { useState, useEffect, useMemo } from "react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Toggle } from "@/components/ui/toggle"
import RoomMap2D from "@/components/staff/RoomMap2D"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty"
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
  locatorModel,
  selectedRoom,
  setSelectedRoom,
  setSelectedCabinet,
  setCurrentLocatorLevel,
  selectedCabinet,
  currentLocatorLevel,
  activeStudent,
  activeStudentDocs,
  onPreviewDocument,
  onRestoreStudent,
  onUnfocusStudent,
}) {
  const [listType, setListType] = useState("card")
  const [showArchived, setShowArchived] = useState(false)
  const [scrollTrigger, setScrollTrigger] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(9) // 9 fits nicely in 3-column card grid, 10 or more in table

  useEffect(() => {
    setPage(1)
  }, [currentLevel, showArchived, quickQuery, listType])

  // Restore Modal State
  const [restoreStudentOpen, setRestoreStudentOpen] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState(null)

  const handleLocateStudentClick = (student) => {
    onLocateStudent(student)
    setScrollTrigger((prev) => prev + 1)
  }

  // Scroll to storage layout when a student is located
  useEffect(() => {
    if (activeStudent) {
      const timer = setTimeout(() => {
        const el = document.getElementById("storage-layout-section")
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [activeStudent, scrollTrigger])



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
    if (currentLevel !== "students") return explorerItems

    if (showArchived) {
      const year = breadcrumbs
        .find((b) => b.level === "students")
        ?.label.split(" ")[1]
      if (!year) return []
      return archivedStudents
        .filter((s) => {
          const snYear = String(s.studentNo || "").split("-")[0]
          return snYear === year
        })
        .map((s) => ({ key: s.studentNo, student: s }))
    }
    return explorerItems
  }, [showArchived, explorerItems, archivedStudents, currentLevel, breadcrumbs])

  const paginatedExplorerItems = useMemo(() => {
    if (currentLevel !== "students") return filteredExplorerItems
    const start = (page - 1) * itemsPerPage
    return filteredExplorerItems.slice(start, start + itemsPerPage)
  }, [filteredExplorerItems, currentLevel, page, itemsPerPage])

  const totalItems = currentLevel === "students" ? filteredExplorerItems.length : 0
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))

  function renderStorageBody(isFullscreen) {
    const mapWrap = isFullscreen
      ? "min-h-[min(70vh,800px)] flex-1 w-full aspect-[16/10] mx-auto max-w-6xl overflow-hidden rounded-xl shadow-2xl"
      : "w-full aspect-[16/10] max-h-[600px] mx-auto max-w-4xl overflow-hidden rounded-xl shadow-lg border border-gray-200 dark:border-white/10"
    const rowClass = isFullscreen
      ? "flex flex-1 flex-col overflow-hidden min-h-0"
      : "flex flex-col w-full"
    const leftClass = isFullscreen
      ? "bg-white dark:bg-zinc-950 p-8 min-h-0 overflow-y-auto flex flex-1 flex-col w-full"
      : "bg-white dark:bg-zinc-950 p-8 flex flex-col w-full"
    const innerLeftClass = "flex w-full flex-col min-h-0 flex-1 mx-auto max-w-6xl"

    return (
      <div className={rowClass}>
        <div className={leftClass}>
          <div className={innerLeftClass}>
            {/* Storage Explorer Unified Header with Browser-style Back & Forward Buttons */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-6">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase dark:text-zinc-500">Storage Explorer</span>
                
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Back Navigation Button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full border border-gray-300 dark:border-white/10 dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                    disabled={currentLocatorLevel === "rooms"}
                    onClick={() => {
                      if (currentLocatorLevel === "drawers") {
                        setCurrentLocatorLevel("cabinets");
                      } else if (currentLocatorLevel === "cabinets") {
                        setCurrentLocatorLevel("rooms");
                        setSelectedRoom(null);
                        setSelectedCabinet(null);
                      }
                    }}
                  >
                    <i className="ph-bold ph-caret-left text-sm" />
                  </Button>

                  {/* Forward Navigation Button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full border border-gray-300 dark:border-white/10 dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                    disabled={
                      (currentLocatorLevel === "rooms" && !selectedRoom) ||
                      (currentLocatorLevel === "cabinets" && !selectedCabinet) ||
                      currentLocatorLevel === "drawers"
                    }
                    onClick={() => {
                      if (currentLocatorLevel === "rooms" && selectedRoom) {
                        setCurrentLocatorLevel("cabinets");
                      } else if (currentLocatorLevel === "cabinets" && selectedCabinet) {
                        setCurrentLocatorLevel("drawers");
                      }
                    }}
                  >
                    <i className="ph-bold ph-caret-right text-sm" />
                  </Button>
                  
                  {/* Location Path Text */}
                  <h4 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-zinc-50 uppercase flex items-center select-none ml-1.5 leading-none">
                    {currentLocatorLevel === "rooms" && "Storage Rooms"}
                    {currentLocatorLevel === "cabinets" && (
                      <>
                        ROOM {selectedRoom} <span className="text-gray-300 dark:text-zinc-700 mx-2">/</span> LAYOUT
                      </>
                    )}
                    {currentLocatorLevel === "drawers" && (
                      <>
                        ROOM {selectedRoom} <span className="text-gray-300 dark:text-zinc-700 mx-2">/</span> {String(selectedCabinet).startsWith("CAB") ? selectedCabinet : `CAB ${selectedCabinet}`}
                      </>
                    )}
                  </h4>
                </div>
              </div>

              {activeStudent && (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col text-right hidden sm:flex">
                    <span className="text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest leading-none">Locating Target</span>
                    <span className="text-xs font-bold text-pup-maroon dark:text-red-400 leading-tight mt-0.5">{activeStudent.name}</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onUnfocusStudent?.();
                    }}
                    className="h-8 rounded-brand border-red-200 text-[10px] font-black tracking-widest text-red-600 shadow-xs hover:bg-red-50 dark:border-red-950 dark:hover:bg-red-950/30 cursor-pointer uppercase"
                  >
                    <i className="ph-bold ph-eye-slash mr-1.5 text-xs" />
                    Unfocus
                  </Button>
                </div>
              )}
            </div>

            {/* Level Inner Content */}
            {locatorModel.kind === "rooms" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-8">
                {locatorModel.rooms.map((r) => (
                  <div
                    key={r.room}
                    className={cn(
                      "group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 dark:border-white/10 dark:bg-card",
                      r.isTarget && "ring-2 ring-pup-maroon border-pup-maroon dark:ring-primary dark:border-primary"
                    )}
                    onClick={() => {
                      setSelectedRoom(r.room)
                      setSelectedCabinet(null)
                      setCurrentLocatorLevel("cabinets")
                    }}
                  >
                    <div className={cn(
                      "flex h-48 items-center justify-center transition-colors",
                      r.isTarget ? "bg-pup-maroon/5 dark:bg-primary/5" : "bg-gray-50 dark:bg-muted"
                    )}>
                      <div className={cn(
                        "flex h-24 w-24 items-center justify-center rounded-3xl shadow-lg transition-transform group-hover:scale-110",
                        r.isTarget ? "bg-pup-maroon text-white dark:bg-primary" : "bg-white text-gray-400 dark:bg-zinc-800 dark:text-zinc-500"
                      )}>
                        <i className="ph-fill ph-warehouse text-5xl"></i>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-xl font-black text-gray-900 dark:text-zinc-50 tracking-tighter uppercase">
                          ROOM {r.room}
                        </h5>
                        {r.isTarget && (
                          <Badge className="bg-pup-maroon text-white animate-pulse dark:bg-primary">
                            LOCATED
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-8 bg-pup-maroon/20 rounded-full dark:bg-primary/20"></div>
                        <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase dark:text-zinc-500">
                          {r.occupiedCount} ARCHIVED RECORDS
                        </span>
                      </div>
                    </div>
                    {r.isTarget && (
                      <div className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-pup-maroon text-white shadow-lg dark:bg-primary">
                        <i className="ph-bold ph-map-pin"></i>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : locatorModel.kind === "cabinets" ? (
              <div className={mapWrap}>
                <RoomMap2D
                  kind="cabinets"
                  activeStudent={activeStudent}
                  cabinets={locatorModel.cabinets}
                  roomDoor={locatorModel.roomDoor}
                  selectedCabinetId={selectedCabinet}
                   onCabinetClick={(cabId) => {
                    setSelectedCabinet(cabId)
                    if (cabId) {
                      setCurrentLocatorLevel("drawers")
                    } else {
                      setCurrentLocatorLevel("cabinets")
                    }
                  }}
                  onDrawerClick={(drawerId) => {
                    // Optional: Highlight drawer students in the future
                  }}
                  onPreviewDocument={onPreviewDocument}
                />
              </div>
            ) : (
              <div className={mapWrap}>
                <RoomMap2D
                  kind="drawers"
                  activeStudent={activeStudent}
                  cabinets={locatorModel.cabinets || []}
                  roomDoor={locatorModel.roomDoor}
                  selectedCabinetId={selectedCabinet}
                  drawerSlots={locatorModel.drawers}
                  onCabinetClick={(cabId) => {
                    setSelectedCabinet(cabId)
                    if (cabId) {
                      setCurrentLocatorLevel("drawers")
                    } else {
                      setCurrentLocatorLevel("cabinets")
                    }
                  }}
                  onPreviewDocument={onPreviewDocument}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      id="view-search"
      className="animate-fade-up font-inter flex h-auto w-full flex-col gap-6 lg:flex-row"
    >
      <div className="flex flex-1 flex-col items-stretch gap-6 lg:flex-row">
        <div className="flex w-full flex-shrink-0 flex-col gap-6 lg:w-1/4 h-auto">
          {/* Pill Tabs Container (Standalone) */}
          <div className="flex w-full cursor-default items-center overflow-hidden rounded-brand border border-gray-200 bg-gray-100 p-0.5 shadow-xs backdrop-blur-sm dark:border-white/10 dark:bg-muted/50 dark:shadow-none">
            <button
              type="button"
              onClick={() => setShowArchived(false)}
              className={cn(
                "group flex h-12 flex-1 cursor-pointer items-center justify-center gap-3 px-4 text-sm font-bold transition-all duration-200 active:scale-[0.98]",
                !showArchived
                  ? "rounded-l-[calc(var(--radius)-2px)] rounded-r-none bg-white text-pup-maroon shadow-sm ring-1 ring-inset ring-black/5 dark:bg-zinc-900 dark:text-primary dark:ring-white/10"
                  : "text-gray-500 ring-transparent hover:bg-white/50 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-200"
              )}
            >
              <i className={cn("ph-bold ph-users-three text-lg", !showArchived ? "text-pup-maroon dark:text-primary" : "text-gray-400 dark:text-zinc-500")} />
              <span className="whitespace-nowrap tracking-wide text-xs font-black">ACTIVE</span>
              <span
                className={cn(
                  "flex h-6 min-w-[30px] items-center justify-center rounded-full px-2 text-[11px] font-black transition-all duration-300",
                  !showArchived
                    ? "bg-pup-maroon text-white shadow-sm dark:bg-[#352021] dark:text-primary"
                    : "bg-gray-200 text-gray-500 dark:bg-zinc-800 dark:text-zinc-500"
                )}
              >
                {students.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowArchived(true)}
              className={cn(
                "group flex h-12 flex-1 cursor-pointer items-center justify-center gap-3 px-4 text-sm font-bold transition-all duration-200 active:scale-[0.98]",
                showArchived
                  ? "rounded-r-[calc(var(--radius)-2px)] rounded-l-none bg-white text-pup-maroon shadow-sm ring-1 ring-inset ring-black/5 dark:bg-zinc-900 dark:text-primary dark:ring-white/10"
                  : "text-gray-500 ring-transparent hover:bg-white/50 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-200"
              )}
            >
              <i className={cn("ph-bold ph-archive text-lg", showArchived ? "text-pup-maroon dark:text-primary" : "text-gray-400 dark:text-zinc-500")} />
              <span className="whitespace-nowrap tracking-wide text-xs font-black">ARCHIVED</span>
              <span
                className={cn(
                  "flex h-6 min-w-[30px] items-center justify-center rounded-full px-2 text-[11px] font-black transition-all duration-300",
                  showArchived
                    ? "bg-pup-maroon text-white shadow-sm dark:bg-[#352021] dark:text-primary"
                    : "bg-gray-200 text-gray-500 dark:bg-zinc-800 dark:text-zinc-500"
                )}
              >
                {archivedStudents.length}
              </span>
            </button>
          </div>

          {/* Global Search Card */}
          <section className="flex flex-1 min-h-[580px] flex-col overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-sm dark:bg-card dark:shadow-none dark:border-white/10">
            <div className="space-y-3 border-b border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-card">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase dark:text-zinc-500">
                  Global Search
                </span>
              </div>
              <div className="group relative">
                <i className="ph-bold ph-magnifying-glass absolute top-3 left-3 text-gray-500 group-focus-within:text-pup-maroon dark:text-zinc-400"></i>
                <Input
                  type="text"
                  placeholder={
                    showArchived
                      ? "Search Archived ID..."
                      : "Search ID or Name..."
                  }
                  className="h-10 w-full rounded-brand border border-gray-300 bg-white pr-10 pl-10 text-sm font-medium text-gray-900 placeholder-gray-500 transition-all focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none dark:bg-card dark:text-zinc-50 dark:border-white/10"
                  value={quickQuery}
                  onChange={(e) => setQuickQuery(e.target.value)}
                />
                {quickQuery !== "" && (
                  <button
                    type="button"
                    onClick={() => setQuickQuery("")}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 transition-colors hover:text-pup-maroon dark:hover:text-red-500 dark:text-zinc-500"
                  >
                    <i className="ph-bold ph-x-circle text-lg"></i>
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-y-auto p-2">
              {quickQuery.trim().length < 2 && !showArchived ? (
                <Empty className="m-auto flex flex-col items-center border-0 py-6 text-center">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                      <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                        <i className="ph-duotone ph-magnifying-glass text-5xl text-gray-300 dark:text-zinc-600"></i>
                      </EmptyMedia>
                    </div>
                    <EmptyTitle className="text-xl font-black text-gray-900 dark:text-zinc-50">
                      Search Records
                    </EmptyTitle>
                    <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                      Enter a student name or ID to quickly locate their records.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : isQuickSearching ? (
                <div className="p-4">
                  <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 border-b border-gray-200 p-3 dark:border-white/10"
                      >
                        <div className="flex-1 space-y-2">
                           <Skeleton className="h-4 w-40 dark:bg-muted" />
                           <Skeleton className="h-3 w-28 dark:bg-muted" />
                        </div>
                        <Skeleton className="h-4 w-4 dark:bg-muted" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : filteredQuickResults.length === 0 ? (
                <Empty className="m-auto flex flex-col items-center justify-center border-0 py-6 text-center text-gray-500 dark:text-zinc-400">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                      <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                        <i
                          className={`ph-duotone ${showArchived ? "ph-archive" : "ph-list-magnifying-glass"} text-5xl text-gray-300 dark:text-zinc-600`}
                        ></i>
                      </EmptyMedia>
                    </div>
                    <EmptyTitle className="text-xl font-black text-gray-900 dark:text-zinc-50">
                      {showArchived ? "No archived records" : "No records found"}
                    </EmptyTitle>
                    <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                      {showArchived
                        ? "There are no archived students matching your search."
                        : "We couldn't find any students matching your search query."}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                filteredQuickResults.map((s) => (
                  <div
                    key={s.studentNo}
                    className="group flex cursor-pointer items-center justify-between border-b border-gray-200 p-3 transition-colors hover:bg-gray-100 dark:border-white/10 dark:bg-muted dark:hover:bg-white/10"
                    onClick={() => handleLocateStudentClick(s)}
                  >
                    <div>
                      <div className="text-sm font-bold text-gray-800 group-hover:text-pup-maroon dark:group-hover:text-red-500 dark:hover:text-red-500 dark:text-zinc-100">
                        {s.name}
                      </div>
                      <div className="font-mono text-xs font-medium text-gray-500 dark:text-zinc-400">
                        {s.studentNo}
                      </div>
                    </div>
                    <i className="ph-bold ph-caret-right text-sm text-gray-400 group-hover:text-pup-maroon dark:group-hover:text-red-500 dark:hover:text-red-500 dark:text-zinc-500"></i>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="flex h-auto w-full flex-1 flex-col gap-6 lg:w-3/4">
          <div className="relative flex min-h-[250px] shrink-0 flex-col rounded-2xl overflow-hidden border border-gray-300 bg-white shadow-sm dark:bg-[#202020] dark:shadow-none dark:border-white/10">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-gray-200 bg-white p-4 text-sm dark:border-white/10 dark:bg-[#202020]">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onBreadcrumbClick({ level: "years" })}
                  className="w-8 text-gray-500 transition-colors hover:bg-transparent hover:text-pup-maroon dark:hover:text-red-500 dark:text-zinc-400"
                  title="Home"
                >
                  <i className="ph-bold ph-house text-lg"></i>
                </Button>
                <span className="font-bold text-gray-400 dark:text-zinc-500">/</span>
                <Breadcrumb>
                  <BreadcrumbList className="font-semibold text-gray-700 sm:gap-2 dark:text-zinc-200">
                    {breadcrumbs.map((b, idx) => (
                      <div
                        key={`${b.level}-${idx}`}
                        className="flex items-center gap-2"
                      >
                        {idx > 0 && (
                          <BreadcrumbSeparator>
                            <i className="ph-bold ph-caret-right text-sm text-gray-400 dark:text-zinc-500"></i>
                          </BreadcrumbSeparator>
                        )}
                        <BreadcrumbItem>
                          <BreadcrumbLink
                            className={`cursor-pointer transition-colors hover:text-pup-maroon dark:hover:text-red-500 hover:no-underline ${ currentLevel === b.level ? "font-bold text-pup-maroon dark:text-primary" : "" } dark:text-primary`}
                            onClick={() => onBreadcrumbClick(b)}
                          >
                            {b.label}
                          </BreadcrumbLink>
                        </BreadcrumbItem>
                      </div>
                    ))}
                    {showArchived && (
                      <div className="flex items-center gap-2">
                        <BreadcrumbSeparator>
                          <i className="ph-bold ph-caret-right text-sm text-gray-400 dark:text-zinc-500"></i>
                        </BreadcrumbSeparator>
                        <BreadcrumbItem>
                          <Badge className="border-red-100 bg-red-50 text-[10px] font-black text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-400">
                            ARCHIVE VIEW
                          </Badge>
                        </BreadcrumbItem>
                      </div>
                    )}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              {currentLevel === "students" && (
                <div className="flex items-center gap-1 rounded-brand bg-gray-100 p-1 dark:bg-muted">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`px-2 text-xs font-bold ${listType === "card" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"} dark:bg-card dark:text-zinc-50 dark:shadow-none dark:hover:text-zinc-50`}
                    onClick={() => setListType("card")}
                  >
                    <i className="ph-bold ph-squares-four" /> CARD
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`px-2 text-xs font-bold ${listType === "table" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"} dark:bg-card dark:text-zinc-50 dark:shadow-none dark:hover:text-zinc-50`}
                    onClick={() => setListType("table")}
                  >
                    <i className="ph-bold ph-list-dashes" /> TABLE
                  </Button>
                </div>
              )}
            </div>

            <div className="flex-1 bg-gray-50 p-6 dark:bg-[#202020]">
              {students.length === 0 && !showArchived ? (
                <Empty className="flex h-full flex-col items-center justify-center border-0 text-center text-gray-500 dark:text-zinc-400">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                      <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                        <i className="ph-duotone ph-users-three text-5xl text-gray-300 dark:text-zinc-600"></i>
                      </EmptyMedia>
                    </div>
                    <EmptyTitle className="text-xl font-black text-gray-900 dark:text-zinc-50">
                      No student records yet
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
                      <i className="ph-bold ph-upload-simple"></i> GO TO
                      REGISTER / UPLOAD
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : currentLevel !== "students" ? (
                <div 
                  key={`folders-${showArchived}`}
                  className="animate-fade-up grid grid-cols-1 gap-4 p-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-5"
                >
                  {filteredExplorerItems.map((it, index) => (
                    <div
                      key={index}
                      onClick={it.disabled ? undefined : it.onClick}
                      className={`group relative h-36 w-full transition-all duration-300 ${ it.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:-translate-y-1.5" }`}
                    >
                      {/* Realistic Folder Tab (Backside) */}
                      <div className="absolute top-0 left-0 z-0 h-8 w-[38%] rounded-t-lg bg-[#dca11e] dark:bg-[#c28d17] transition-all duration-300 group-hover:scale-y-105"></div>

                      {/* Realistic Folder Body (Frontside) */}
                      <div className="absolute top-3 right-0 bottom-0 left-0 z-10 flex flex-col items-center justify-center rounded-lg rounded-tl-none bg-[#f1b82d] dark:bg-[#d69f21] border border-[#d69f21] p-4 transition-all duration-300 shadow-[0_2.5px_5px_rgba(0,0,0,0.15)] group-hover:shadow-[0_6px_12px_rgba(0,0,0,0.25)]">
                        
                        <i
                          className={`ph-fill ${it.icon} mb-1 text-5xl text-[#5c3e03] dark:text-[#452c02] transition-transform duration-300 group-hover:scale-105`}
                        ></i>
                        <h3 className="w-full truncate px-1 text-center text-sm leading-tight font-black text-[#3e2702] sm:text-base">
                          {it.title}
                        </h3>
                        <span className="mt-0.5 text-[9px] font-black tracking-widest text-[#785002] uppercase">
                          {it.subtitle}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredExplorerItems.length === 0 ? (
                <Empty className="flex h-full flex-col items-center justify-center border-0 text-center text-gray-500 dark:text-zinc-400">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                      <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                        <i className={cn(
                          "ph-duotone text-5xl text-gray-300 dark:text-zinc-600",
                          showArchived ? "ph-archive" : "ph-users"
                        )}></i>
                      </EmptyMedia>
                    </div>
                    <EmptyTitle className="text-xl font-black text-gray-900 dark:text-zinc-50">
                      {showArchived
                        ? "No archived students"
                        : "No students in this year"}
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
                  {paginatedExplorerItems.map((row, index) => (
                    <div
                      key={index}
                      className={`group relative flex cursor-pointer flex-col rounded-brand border border-gray-300 bg-white p-5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md ${showArchived ? "opacity-90" : ""} dark:border-white/10 dark:bg-card dark:shadow-none dark:hover:border-zinc-700`}
                      onClick={() => handleLocateStudentClick(row.student)}
                    >
                      <div className="mb-4 flex items-start gap-4">
                        <Avatar className="h-12 w-12 shrink-0 border border-gray-100 shadow-sm dark:border-white/10 dark:shadow-none">
                          <AvatarFallback
                            className={`bg-gray-50 font-bold text-gray-400 transition-colors group-hover:text-pup-maroon dark:group-hover:text-red-500 dark:hover:text-red-500 ${showArchived ? "text-red-400" : ""} dark:bg-card dark:text-zinc-500`}
                          >
                            <i className="ph-bold ph-user text-2xl"></i>
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-base leading-tight font-bold text-gray-900 transition-colors group-hover:text-pup-maroon dark:group-hover:text-red-500 dark:hover:text-red-500 dark:text-zinc-50">
                            {row.student.name}
                          </h4>
                          <div className="mt-1.5 flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="rounded border-gray-200 px-1.5 py-0 font-mono text-[10px] font-bold text-gray-600 dark:border-white/10 dark:text-zinc-300"
                            >
                              {row.student.studentNo}
                            </Badge>
                            {showArchived && (
                              <Badge className="h-4 border-red-100 bg-red-50 px-1 text-[9px] font-black text-red-700 dark:bg-red-950/30">
                                ARCHIVED
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-4 dark:border-white/10">
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-6 w-6 items-center justify-center rounded bg-gray-50 text-gray-400 transition-colors group-hover:bg-red-50 group-hover:text-pup-maroon dark:group-hover:text-red-500 dark:hover:text-red-500 dark:bg-card dark:text-zinc-500">
                            <i className="ph-duotone ph-map-pin text-sm"></i>
                          </div>
                          <span className="text-[10px] font-black tracking-widest text-gray-500 uppercase dark:text-zinc-400">
                            R-{row.student.room} • C-{row.student.cabinet}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {showArchived ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                setRestoreTarget(row.student)
                                setRestoreStudentOpen(true)
                              }}
                              className="h-8 rounded-brand border-green-200 px-2.5 text-[9px] font-bold text-green-700 shadow-xs hover:bg-green-50"
                            >
                              <i className="ph-bold ph-arrow-counter-clockwise mr-1"></i>
                              Restore
                            </Button>
                          ) : (
                            <>
                              <Badge
                                variant="secondary"
                                className="border-transparent bg-gray-100 px-2 text-[10px] font-black tracking-tighter text-gray-700 uppercase dark:text-zinc-200 dark:bg-muted"
                              >
                                D-{row.student.drawer}
                              </Badge>
                              <i className="ph-bold ph-caret-right text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-pup-maroon dark:group-hover:text-red-500 dark:hover:text-red-500 dark:text-zinc-600"></i>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div 
                  key={`table-${currentLevel}-${showArchived}`}
                  className="flex-1 overflow-hidden overflow-auto rounded-brand border border-gray-200 bg-white shadow-sm animate-fade-up dark:border-white/10 dark:bg-card"
                >
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 backdrop-blur-sm select-none dark:border-white/10 dark:bg-muted">
                      <tr className="text-left text-[10px] font-black tracking-widest text-gray-600 uppercase dark:text-zinc-300 dark:border-white/10">
                        <th className="w-[80px] p-4 text-center">
                          <i className="ph-bold ph-user-circle text-[11px]"></i>
                        </th>
                        <th className="w-48 p-4">Student No.</th>
                        <th className="p-4">Full Name</th>
                        <th className="w-56 p-4">Physical Location</th>
                        <th className="w-40 p-4 text-right">
                           <i className="ph-bold ph-dots-three-outline text-[11px]"></i>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                      {paginatedExplorerItems.map((row) => (
                        <tr
                          key={row.key}
                          className="group cursor-pointer transition-all duration-200 hover:bg-gray-50 dark:hover:bg-white/5 dark:bg-card"
                          onClick={() => handleLocateStudentClick(row.student)}
                        >
                          <td className="p-4">
                            <Avatar className="mx-auto h-9 w-9 border border-gray-100 shadow-xs transition-transform group-hover:scale-110 dark:border-white/10 dark:bg-muted">
                              <AvatarFallback className="bg-gray-50 text-gray-400 dark:bg-zinc-800 dark:text-zinc-500">
                                <i className="ph-bold ph-user text-base"></i>
                              </AvatarFallback>
                            </Avatar>
                          </td>
                          <td className="p-4 font-mono text-xs font-bold text-gray-600 dark:text-zinc-300">
                            {row.student.studentNo}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-gray-900 transition-colors group-hover:text-pup-maroon dark:group-hover:text-primary dark:text-zinc-50">
                                {row.student.name}
                              </span>
                              {showArchived && (
                                <Badge className="mt-1 w-fit border-red-100 bg-red-50 px-1.5 text-[8px] font-black text-red-700 dark:bg-red-950/30">
                                  ARCHIVED RECORD
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-400 group-hover:bg-red-50 group-hover:text-pup-maroon dark:bg-zinc-800 dark:group-hover:bg-primary/10 dark:group-hover:text-primary">
                                <i className="ph-fill ph-archive-box text-base"></i>
                              </div>
                              <span className="text-[10px] font-black tracking-widest text-gray-500 uppercase dark:text-zinc-400">
                                Cabinet {row.student.cabinet} • Drawer {row.student.drawer}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                             {showArchived ? (
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={(e) => {
                                   e.stopPropagation()
                                   setRestoreTarget(row.student)
                                   setRestoreStudentOpen(true)
                                 }}
                                 className="h-9 rounded-brand border-green-200 bg-green-50/50 px-4 text-[10px] font-black text-green-700 shadow-xs hover:bg-green-100"
                               >
                                 <i className="ph-bold ph-arrow-counter-clockwise mr-2"></i>
                                 Restore
                               </Button>
                             ) : (
                               <Button
                                 variant="outline"
                                 size="sm"
                                 className="h-9 rounded-brand border-gray-200 bg-white px-4 text-[10px] font-black tracking-widest text-gray-600 shadow-xs transition-all hover:border-pup-maroon hover:bg-red-50 hover:text-pup-maroon dark:hover:text-primary dark:text-zinc-300 dark:bg-zinc-800 dark:border-white/10"
                               >
                                 <i className="ph-bold ph-magnifying-glass-plus mr-2 text-sm"></i>
                                 Locate
                               </Button>
                             )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {currentLevel === "students" && totalItems > 0 && (
              <div className="flex items-center justify-between border-t border-gray-200 bg-white p-6 px-8 rounded-b-brand dark:border-white/10 dark:bg-card">
                <div className="flex items-center gap-8 select-none cursor-default">
                  <div className="flex items-center gap-6 text-[11px] font-black text-gray-400 uppercase tracking-widest dark:text-zinc-500">
                    <span>
                      SHOWING <strong className="text-gray-900 dark:text-zinc-50">{(page - 1) * itemsPerPage + 1}-{Math.min(page * itemsPerPage, totalItems)}</strong> OUT OF <strong className="text-gray-900 dark:text-zinc-50">{totalItems.toLocaleString()}</strong> ENTRIES
                    </span>

                    <div className="flex items-center gap-3 border-l border-gray-200 pl-6 dark:border-white/10">
                      <span className="text-[10px] opacity-60">ROWS:</span>
                      <select
                        className="h-8 w-16 cursor-pointer rounded-brand border border-gray-300 bg-white px-2 text-[10px] font-bold text-gray-700 focus:ring-1 focus:ring-pup-maroon focus:outline-none transition-all hover:bg-gray-50 dark:bg-card dark:text-zinc-200 dark:hover:bg-white/10 dark:border-white/10"
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value))
                          setPage(1)
                        }}
                      >
                        <option value={9}>9</option>
                        <option value={12}>12</option>
                        <option value={24}>24</option>
                        <option value={48}>48</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3 select-none">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-10 rounded-brand border border-gray-300 bg-white px-5 text-[10px] font-black tracking-widest text-gray-600 uppercase shadow-sm transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-30 dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                  >
                    <i className="ph-bold ph-caret-left mr-2 text-base"></i>
                    PREV
                  </Button>
                  
                  <div className="flex h-9 min-w-[48px] cursor-default items-center justify-center rounded-brand border border-gray-200 bg-white px-3 text-[11px] font-black text-gray-900 shadow-sm dark:border-white/10 dark:bg-card dark:text-zinc-50 dark:shadow-none">
                    {page}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-10 rounded-brand border border-gray-300 bg-white px-5 text-[10px] font-black tracking-widest text-gray-500 uppercase shadow-sm transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-30 dark:bg-card dark:text-zinc-400 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                  >
                    NEXT
                    <i className="ph-bold ph-caret-right ml-2 text-base"></i>
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div
            id="storage-layout-section"
            className="relative flex flex-col rounded-2xl overflow-hidden bg-white shadow-sm scroll-mt-6 shrink-0 dark:bg-card dark:shadow-none dark:border-white/10"
          >
            {renderStorageBody(false)}
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
        confirmLabel="Restore record"
        variant="success"
        onConfirm={async () => {
          if (restoreTarget) {
            await onRestoreStudent(restoreTarget.studentNo)
          }
          setRestoreStudentOpen(false)
          setRestoreTarget(null)
        }}
      />
    </div>
  )
}



