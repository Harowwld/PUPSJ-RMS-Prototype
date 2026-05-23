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
}) {
  const [listType, setListType] = useState("card")
  const [storageFullscreen, setStorageFullscreen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  // Restore Modal State
  const [restoreStudentOpen, setRestoreStudentOpen] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState(null)

  // Scroll to storage layout when a student is located
  useEffect(() => {
    if (activeStudent) {
      const el = document.getElementById("storage-layout-section")
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }
  }, [activeStudent])

  useEffect(() => {
    if (!storageFullscreen) return
    const onKey = (e) => {
      if (e.key === "Escape") setStorageFullscreen(false)
    }
    window.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [storageFullscreen])

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

  const legend = (
    <div className="hidden gap-4 text-xs font-medium text-gray-600 sm:flex">
      <div className="flex items-center gap-1.5">
        <div className="h-3 w-3 rounded-[2px] border border-gray-400 bg-white"></div>
        Empty
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-3 w-3 rounded-[2px] border border-gray-400 bg-gray-300"></div>
        Occupied
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-3 w-3 rounded-[2px] border border-gray-300 bg-red-50"></div>
        Target
      </div>
    </div>
  )

  function renderStorageBody(isFullscreen) {
    const mapWrap = isFullscreen
      ? "min-h-[min(55vh,640px)] flex-1 w-full"
      : "h-[380px] w-full"
    const rowClass = isFullscreen
      ? "flex flex-1 flex-col overflow-hidden min-h-0 lg:flex-row"
      : "flex-1 flex overflow-hidden min-h-0"
    const leftClass = isFullscreen
      ? "bg-gray-100 p-4 min-h-0 overflow-y-auto flex flex-1 flex-col lg:w-[min(72%,calc(100%-22rem))]"
      : "w-2/3 bg-gray-100 p-4 h-full min-h-0 overflow-y-auto"
    const innerLeftClass = isFullscreen
      ? "flex w-full flex-col min-h-0 flex-1"
      : "w-full h-full"
    const rightClass = isFullscreen
      ? "border-gray-200 bg-white flex flex-col overflow-hidden min-h-0 border-l w-full max-h-[42vh] shrink-0 border-t lg:max-h-none lg:w-[min(28rem,100%)] lg:max-w-[40vw] lg:shrink-0"
      : "w-1/3 border-l border-gray-200 bg-white flex flex-col overflow-hidden min-h-0"
    const rightInnerClass = isFullscreen
      ? "flex h-full min-h-0 flex-col overflow-hidden p-4"
      : "p-4 h-full flex flex-col overflow-hidden min-h-0"
    const ulClass = isFullscreen
      ? "flex-1 space-y-2 overflow-y-auto pr-2 text-sm text-gray-700 min-h-0"
      : "flex-1 overflow-y-auto space-y-2 text-sm text-gray-700 pr-2"

    return (
      <div className={rowClass}>
        <div className={leftClass}>
          <div className={innerLeftClass}>
            {locatorModel.kind === "rooms" ? (
              <>
                <h4 className="mb-4 text-lg font-bold text-gray-700">
                  {locatorModel.title}
                </h4>
                <div className="grid grid-cols-2 gap-4 pb-6">
                  {locatorModel.rooms.map((r) => (
                    <div
                      key={r.room}
                      className={`locator-tile flex cursor-pointer flex-col items-center justify-center rounded-brand p-6 ${
                        r.isTarget ? "room-located" : ""
                      }`}
                      onClick={() => {
                        setSelectedRoom(r.room)
                        setSelectedCabinet(null)
                        setCurrentLocatorLevel("cabinets")
                      }}
                    >
                      <i className="ph-duotone ph-warehouse mb-2 text-4xl text-pup-maroon"></i>
                      <h5 className="text-xl leading-tight font-bold text-gray-900">
                        ROOM {r.room}
                      </h5>
                      <span className="mt-1 text-xs font-semibold text-gray-500">
                        {r.occupiedCount} Records Stored
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : locatorModel.kind === "cabinets" ? (
              <>
                <h4 className="mb-4 text-lg font-bold text-gray-700">
                  <span
                    className="cursor-pointer hover:text-pup-maroon"
                    onClick={() => {
                      setCurrentLocatorLevel("rooms")
                      setSelectedRoom(null)
                      setSelectedCabinet(null)
                    }}
                  >
                    ← Rooms
                  </span>{" "}
                  / Room {selectedRoom} Cabinets
                </h4>
                <div className={mapWrap}>
                  <RoomMap2D
                    kind="cabinets"
                    cabinets={locatorModel.cabinets}
                    roomDoor={locatorModel.roomDoor}
                    selectedCabinetId={selectedCabinet}
                    onCabinetClick={(cabId) => {
                      setSelectedCabinet(cabId)
                      setCurrentLocatorLevel("drawers")
                    }}
                    onDrawerClick={(drawerId) => {
                      // Optional: Highlight drawer students in the future
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <h4 className="mb-4 text-lg font-bold text-gray-700">
                  <span
                    className="cursor-pointer hover:text-pup-maroon"
                    onClick={() => setCurrentLocatorLevel("cabinets")}
                  >
                    ← Cabinets
                  </span>{" "}
                  / Room {selectedRoom} / Cabinet {selectedCabinet} Drawers
                </h4>
                <div className={mapWrap}>
                  <RoomMap2D
                    kind="drawers"
                    cabinets={locatorModel.cabinets || []}
                    roomDoor={locatorModel.roomDoor}
                    selectedCabinetId={selectedCabinet}
                    drawerSlots={locatorModel.drawers}
                    onCabinetClick={(cabId) => {
                      setSelectedCabinet(cabId)
                      setCurrentLocatorLevel("drawers")
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className={rightClass}>
          <div className={rightInnerClass}>
            {!activeStudent ? (
              <Empty className="flex h-full flex-col items-center justify-center border-0 text-center text-gray-500">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                    <i className="ph-duotone ph-mouse-left-click text-3xl text-pup-maroon"></i>
                  </EmptyMedia>
                  <EmptyTitle className="text-lg font-bold text-gray-900">
                    Select a student
                  </EmptyTitle>
                  <EmptyDescription className="mt-1 text-sm font-medium text-gray-600">
                    Select a student from the list to view their location and
                    documents.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex h-full min-h-0 flex-col">
                <div className="mb-4 flex-shrink-0">
                  <div className="mb-1 text-xs font-bold tracking-wide text-gray-500 uppercase">
                    Physical Location
                  </div>
                  <div className="text-2xl font-black text-pup-maroon">
                    ROOM-{activeStudent.room} • CAB-{activeStudent.cabinet} • D-
                    {activeStudent.drawer}
                  </div>
                  <div className="mt-1 truncate text-base font-bold text-gray-900">
                    {activeStudent.name}
                  </div>
                  <div className="flex items-center gap-2 font-mono text-sm font-medium text-gray-600">
                    {activeStudent.studentNo}
                    {activeStudent.status === "Archived" && (
                      <Badge className="h-4 border-red-200 bg-red-50 px-1 text-[9px] font-black text-red-700">
                        ARCHIVED
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="mb-2 shrink-0 border-b border-gray-200 pb-2 text-xs font-bold tracking-wide text-gray-500 uppercase">
                    Documents on File
                  </div>
                  <ul className={ulClass}>
                    {activeStudentDocs.length === 0 ? (
                      <li className="h-full py-8">
                        <Empty className="flex flex-col items-center justify-center border-0 text-center text-gray-500">
                          <EmptyHeader className="flex flex-col items-center gap-0">
                            <EmptyMedia className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                              <i className="ph-duotone ph-files text-2xl text-pup-maroon"></i>
                            </EmptyMedia>
                            <EmptyTitle className="text-sm font-bold text-gray-900">
                              No documents found
                            </EmptyTitle>
                            <EmptyDescription className="mt-1 max-w-[200px] text-xs font-medium text-gray-600">
                              This student has no scanned documents on file.
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      </li>
                    ) : (
                      activeStudentDocs.map((doc) => (
                        <li key={doc.id}>
                          <Button
                            variant="ghost"
                            onClick={() =>
                              onPreviewDocument(
                                doc.doc_type,
                                activeStudent.name,
                                activeStudent.studentNo,
                                doc.id
                              )
                            }
                            className="group flex h-auto w-full items-center justify-start gap-3 rounded-brand border border-transparent p-2 text-left font-normal transition-colors hover:border-gray-300 hover:bg-gray-100"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-red-50 text-pup-maroon transition-colors group-hover:bg-pup-maroon group-hover:text-white">
                              <i className="ph-fill ph-file-pdf text-lg"></i>
                            </div>
                            <span className="truncate font-bold text-gray-700 underline-offset-2 group-hover:text-pup-maroon group-hover:underline">
                              {doc.doc_type}
                            </span>
                            <i className="ph-bold ph-arrow-square-out ml-auto shrink-0 text-gray-400 transition-all group-hover:text-pup-maroon"></i>
                          </Button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
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
      className="animate-fade-in font-inter flex h-full w-full flex-col gap-4 lg:flex-row"
    >
      <div className="flex flex-1 flex-col items-stretch gap-4 overflow-hidden lg:flex-row">
        <section className="flex h-full w-full flex-shrink-0 flex-col overflow-hidden rounded-brand border border-gray-300 bg-white shadow-sm lg:w-1/4">
          <div className="space-y-3 border-b border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
                Global Search
              </span>
              <Toggle
                pressed={showArchived}
                onPressedChange={setShowArchived}
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 border-gray-300 px-2 text-[9px] font-black uppercase transition-all data-[state=on]:border-red-600 data-[state=on]:bg-red-600 data-[state=on]:text-white"
              >
                <i
                  className={`ph-bold text-xs ${showArchived ? "ph-archive" : "ph-archive-box"}`}
                ></i>
                {showArchived ? "ARCHIVED VIEW" : "ACTIVE VIEW"}
              </Toggle>
            </div>
            <div className="group relative">
              <i className="ph-bold ph-magnifying-glass absolute top-3 left-3 text-gray-500 group-focus-within:text-pup-maroon"></i>
              <Input
                type="text"
                placeholder={
                  showArchived
                    ? "Search Archived ID..."
                    : "Search ID or Name..."
                }
                className="h-10 w-full rounded-brand border border-gray-300 bg-white pr-10 pl-10 text-sm font-medium text-gray-900 placeholder-gray-500 transition-all focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
              />
              {quickQuery !== "" && (
                <button
                  type="button"
                  onClick={() => setQuickQuery("")}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 transition-colors hover:text-pup-maroon"
                >
                  <i className="ph-bold ph-x-circle text-lg"></i>
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {quickQuery.trim().length < 2 && !showArchived ? (
              <Empty className="mt-32 flex flex-col items-center border-0 py-10 text-center">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                    <i className="ph-duotone ph-magnifying-glass text-3xl text-pup-maroon"></i>
                  </EmptyMedia>
                  <EmptyTitle className="text-lg font-bold text-gray-900">
                    Search Records
                  </EmptyTitle>
                  <EmptyDescription className="mt-1 text-sm font-medium text-gray-600">
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
                      className="flex items-center gap-3 border-b border-gray-200 p-3"
                    >
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                      <Skeleton className="h-4 w-4" />
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredQuickResults.length === 0 ? (
              <Empty className="mt-32 flex flex-col items-center justify-center border-0 py-8 text-center text-gray-500">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                    <i
                      className={`ph-duotone ${showArchived ? "ph-archive" : "ph-list-magnifying-glass"} text-3xl text-pup-maroon`}
                    ></i>
                  </EmptyMedia>
                  <EmptyTitle className="text-lg font-bold text-gray-900">
                    {showArchived ? "No archived records" : "No records found"}
                  </EmptyTitle>
                  <EmptyDescription className="mt-1 max-w-[200px] text-sm font-medium text-gray-600">
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
                  className="group flex cursor-pointer items-center justify-between border-b border-gray-200 p-3 transition-colors hover:bg-gray-100"
                  onClick={() => onLocateStudent(s)}
                >
                  <div>
                    <div className="text-sm font-bold text-gray-800 group-hover:text-pup-maroon">
                      {s.name}
                    </div>
                    <div className="font-mono text-xs font-medium text-gray-500">
                      {s.studentNo}
                    </div>
                  </div>
                  <i className="ph-bold ph-caret-right text-sm text-gray-400 group-hover:text-pup-maroon"></i>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="flex min-h-0 w-full flex-col gap-4 overflow-y-auto lg:h-full lg:w-3/4">
          <div className="relative flex h-[60%] min-h-[250px] flex-col overflow-hidden rounded-brand border border-gray-300 bg-white shadow-sm">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-gray-200 bg-white p-4 text-sm">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onBreadcrumbClick({ level: "years" })}
                  className="w-8 text-gray-500 transition-colors hover:bg-transparent hover:text-pup-maroon"
                  title="Home"
                >
                  <i className="ph-bold ph-house text-lg"></i>
                </Button>
                <span className="font-bold text-gray-400">/</span>
                <Breadcrumb>
                  <BreadcrumbList className="font-semibold text-gray-700 sm:gap-2">
                    {breadcrumbs.map((b, idx) => (
                      <div
                        key={`${b.level}-${idx}`}
                        className="flex items-center gap-2"
                      >
                        {idx > 0 && (
                          <BreadcrumbSeparator>
                            <i className="ph-bold ph-caret-right text-sm text-gray-400"></i>
                          </BreadcrumbSeparator>
                        )}
                        <BreadcrumbItem>
                          <BreadcrumbLink
                            className={`cursor-pointer transition-colors hover:text-pup-maroon hover:no-underline ${
                              currentLevel === b.level
                                ? "font-bold text-pup-maroon"
                                : ""
                            }`}
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
                          <i className="ph-bold ph-caret-right text-sm text-gray-400"></i>
                        </BreadcrumbSeparator>
                        <BreadcrumbItem>
                          <Badge className="border-red-100 bg-red-50 text-[10px] font-black text-red-700">
                            ARCHIVE VIEW
                          </Badge>
                        </BreadcrumbItem>
                      </div>
                    )}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              {currentLevel === "students" && (
                <div className="flex items-center gap-1 rounded-brand bg-gray-100 p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`px-2 text-xs font-bold ${listType === "card" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                    onClick={() => setListType("card")}
                  >
                    <i className="ph-bold ph-squares-four" /> CARD
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`px-2 text-xs font-bold ${listType === "table" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                    onClick={() => setListType("table")}
                  >
                    <i className="ph-bold ph-list-dashes" /> TABLE
                  </Button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
              {students.length === 0 && !showArchived ? (
                <Empty className="flex h-full flex-col items-center justify-center border-0 text-center text-gray-500">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                      <i className="ph-duotone ph-users-three text-3xl text-pup-maroon"></i>
                    </EmptyMedia>
                    <EmptyTitle className="text-lg font-bold text-gray-900">
                      No student records yet
                    </EmptyTitle>
                    <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600">
                      Register your first student record in the Upload tab.
                      After that, you can browse, search, and locate drawers
                      here.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button
                      type="button"
                      onClick={() => onSwitchView("upload")}
                      className="mt-4 flex h-10 items-center gap-2 rounded-brand bg-linear-to-b from-red-800 to-pup-maroon border-4 border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md transition-all px-5 text-sm font-bold text-white shadow-sm transition-colors"
                    >
                      <i className="ph-bold ph-upload-simple"></i> GO TO
                      REGISTER / UPLOAD
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : currentLevel !== "students" ? (
                <div className="animate-fade-in grid grid-cols-1 gap-4 p-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-5">
                  {filteredExplorerItems.map((it, index) => (
                    <div
                      key={index}
                      onClick={it.disabled ? undefined : it.onClick}
                      className={`group relative h-36 w-full drop-shadow-sm transition-all duration-300 hover:drop-shadow-md ${
                        it.disabled
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer hover:-translate-y-1"
                      }`}
                    >
                      {/* Seamless Folder Tab */}
                      <div className="absolute top-0 left-0 z-0 h-8 w-[45%] rounded-tl-xl rounded-tr-lg bg-white transition-colors duration-300 group-hover:bg-red-50/50"></div>

                      {/* Seamless Folder Body */}
                      <div className="absolute top-4 right-0 bottom-0 left-0 z-10 flex flex-col items-center justify-center rounded-2xl rounded-tl-none bg-white p-4 transition-colors duration-300 group-hover:bg-red-50/50">
                        <i
                          className={`ph-fill ${it.icon} mb-2 text-5xl text-gray-400 transition-colors duration-300 group-hover:text-pup-maroon`}
                        ></i>
                        <h3 className="w-full truncate px-1 text-center text-sm leading-tight font-bold text-gray-800 transition-colors duration-300 group-hover:text-pup-maroon sm:text-base">
                          {it.title}
                        </h3>
                        <span className="mt-1 text-[10px] font-black tracking-widest text-gray-500 uppercase transition-colors duration-300 group-hover:text-red-400">
                          {it.subtitle}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredExplorerItems.length === 0 ? (
                <Empty className="flex h-full flex-col items-center justify-center border-0 text-center text-gray-500">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                      <i
                        className={`ph-duotone ${showArchived ? "ph-archive" : "ph-users"} text-3xl text-pup-maroon`}
                      ></i>
                    </EmptyMedia>
                    <EmptyTitle className="text-lg font-bold text-gray-900">
                      {showArchived
                        ? "No archived students"
                        : "No students in this year"}
                    </EmptyTitle>
                    <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600">
                      {showArchived
                        ? "There are currently no archived records found for this academic period."
                        : "There are no student records filed under this year yet."}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : listType === "card" ? (
                <div className="animate-fade-in grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredExplorerItems.map((row, index) => (
                    <div
                      key={index}
                      className={`group relative flex cursor-pointer flex-col rounded-brand border border-gray-300 bg-white p-5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md ${showArchived ? "opacity-90" : ""}`}
                      onClick={() => onLocateStudent(row.student)}
                    >
                      <div className="mb-4 flex items-start gap-4">
                        <Avatar className="h-12 w-12 shrink-0 border border-gray-100 shadow-sm">
                          <AvatarFallback
                            className={`bg-gray-50 font-bold text-gray-400 transition-colors group-hover:text-pup-maroon ${showArchived ? "text-red-400" : ""}`}
                          >
                            <i className="ph-bold ph-user text-2xl"></i>
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-base leading-tight font-bold text-gray-900 transition-colors group-hover:text-pup-maroon">
                            {row.student.name}
                          </h4>
                          <div className="mt-1.5 flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="rounded border-gray-200 px-1.5 py-0 font-mono text-[10px] font-bold text-gray-600"
                            >
                              {row.student.studentNo}
                            </Badge>
                            {showArchived && (
                              <Badge className="h-4 border-red-100 bg-red-50 px-1 text-[9px] font-black text-red-700">
                                ARCHIVED
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-4">
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-6 w-6 items-center justify-center rounded bg-gray-50 text-gray-400 transition-colors group-hover:bg-red-50 group-hover:text-pup-maroon">
                            <i className="ph-duotone ph-map-pin text-sm"></i>
                          </div>
                          <span className="text-[10px] font-black tracking-widest text-gray-500 uppercase">
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
                              RESTORE
                            </Button>
                          ) : (
                            <>
                              <Badge
                                variant="secondary"
                                className="border-transparent bg-gray-100 px-2 text-[10px] font-black tracking-tighter text-gray-700 uppercase"
                              >
                                D-{row.student.drawer}
                              </Badge>
                              <i className="ph-bold ph-caret-right text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-pup-maroon"></i>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 overflow-auto rounded-brand border border-gray-200 bg-white">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
                      <tr className="text-left text-xs tracking-wider text-gray-600 uppercase">
                        <th className="w-[80px] p-3 text-center font-bold">
                          Profile
                        </th>
                        <th className="w-48 p-3 font-bold">Student No.</th>
                        <th className="p-3 font-bold">Name</th>
                        <th className="w-56 p-3 font-bold">Location</th>
                        <th className="w-32 p-3 text-right font-bold">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredExplorerItems.map((row) => (
                        <tr
                          key={row.key}
                          className="group cursor-pointer transition-colors hover:bg-gray-50"
                          onClick={() => onLocateStudent(row.student)}
                        >
                          <td className="p-3">
                            <Avatar className="mx-auto h-8 w-8 border border-gray-200">
                              <AvatarFallback className="bg-gray-100 text-xs font-bold text-gray-500 transition-colors group-hover:text-pup-maroon">
                                <i className="ph-bold ph-user text-sm"></i>
                              </AvatarFallback>
                            </Avatar>
                          </td>
                          <td className="p-3 font-mono text-xs font-medium text-gray-600">
                            {row.student.studentNo}
                          </td>
                          <td className="p-3 font-bold text-gray-900 transition-colors group-hover:text-pup-maroon">
                            <div className="flex items-center gap-2">
                              {row.student.name}
                              {showArchived && (
                                <Badge className="h-3.5 border-red-100 bg-red-50 px-1 text-[8px] font-black text-red-700">
                                  ARCHIVED
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className="border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-gray-600 uppercase"
                            >
                              CAB-{row.student.cabinet} • D-{row.student.drawer}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            {showArchived ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setRestoreTarget(row.student)
                                  setRestoreStudentOpen(true)
                                }}
                                className="h-8 rounded-brand border-green-200 px-3 text-[9px] font-bold text-green-700 shadow-xs hover:bg-green-50"
                              >
                                <i className="ph-bold ph-arrow-counter-clockwise mr-1.5"></i>
                                RESTORE
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-brand border-gray-300 px-3 text-[10px] font-bold tracking-widest text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon"
                              >
                                <i className="ph-bold ph-magnifying-glass-plus mr-1.5 text-xs"></i>
                                LOCATE
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
          </div>

          {storageFullscreen ? (
            <div className="fixed inset-0 z-[100] flex min-h-0 flex-col rounded-none border-0 bg-white shadow-none">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white p-3">
                <h3 className="flex items-center gap-2 text-sm font-bold text-pup-maroon">
                  <i className="ph-fill ph-archive-box text-lg"></i> Storage
                  Layout
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-gray-300 text-xs font-bold"
                    onClick={() => setStorageFullscreen(false)}
                    title="Exit full screen (Esc)"
                  >
                    <i className="ph-bold ph-corners-in mr-1.5"></i>
                    EXIT FULL SCREEN
                  </Button>
                  {legend}
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {renderStorageBody(true)}
              </div>
            </div>
          ) : (
            <div
              id="storage-layout-section"
              className="relative flex h-[44%] min-h-0 min-h-[280px] scroll-mt-6 flex-col rounded-brand border border-gray-300 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between rounded-t-brand border-b border-gray-200 bg-white p-3">
                <h3 className="flex items-center gap-2 text-sm font-bold text-pup-maroon">
                  <i className="ph-fill ph-archive-box text-lg"></i> Storage
                  Layout
                </h3>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-gray-300 text-xs font-bold"
                    onClick={() => setStorageFullscreen(true)}
                    title="Full screen map & documents"
                  >
                    <i className="ph-bold ph-corners-out mr-1.5"></i>
                    FULL SCREEN
                  </Button>
                  {legend}
                </div>
              </div>
              {renderStorageBody(false)}
            </div>
          )}
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
        confirmLabel="RESTORE RECORD"
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
